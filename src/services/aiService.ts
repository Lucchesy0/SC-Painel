import { SCItem } from '../types';

export interface AIParsedSCResult {
  numeroSC: string;
  solicitante: string;
  filial: string;
  data: string;
  itens: SCItem[];
}

export interface AIParsedResponse {
  success: boolean;
  data?: AIParsedSCResult;
  error?: string;
}

/**
 * Converte um arquivo de imagem (File/Blob) em base64 puro
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Envia uma captura de tela / print de SC para a IA Gemini analisar e extrair os itens
 */
export async function parseSCImageWithAI(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<AIParsedSCResult> {
  const response = await fetch('/api/ai/parse-sc-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error || `Erro ${response.status}: Falha ao analisar a imagem com a IA.`
    );
  }

  const result: AIParsedResponse = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Não foi possível extrair os itens da imagem.');
  }

  return result.data;
}

export interface AICostCenterItem {
  raw: string;
  colaborador?: string;
  localidade?: string;
}

export interface AICostCenterCanonicalInfo {
  codigo: string;
  nome: string;
  canonical: string;
  motivoUnificacao?: string;
}

export interface AICostCenterGroup {
  codigo: string;
  canonical: string;
  variacoesIdentificadas: string[];
  explicacao: string;
}

export interface AICostCenterNormalizationResponse {
  success: boolean;
  data: {
    canonicalMap: Record<string, AICostCenterCanonicalInfo>;
    grupos: AICostCenterGroup[];
    source?: 'gemini_ai' | 'heuristic_ai' | 'heuristic_fallback';
  };
}

/**
 * Normaliza centros de custo consultando o endpoint da IA Gemini no servidor
 */
export async function normalizeCostCentersWithAI(
  items: AICostCenterItem[]
): Promise<AICostCenterNormalizationResponse['data']> {
  const response = await fetch('/api/ai/normalize-cost-centers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao consultar IA de Centros de Custo`);
  }

  const result: AICostCenterNormalizationResponse = await response.json();
  if (!result.success || !result.data) {
    throw new Error('Falha ao processar normalização de Centros de Custo com a IA.');
  }

  return result.data;
}

/**
 * Normalização heurística local imediata (executada em tempo zero no cliente)
 */
export function normalizeCostCentersLocally(
  items: AICostCenterItem[]
): AICostCenterNormalizationResponse['data'] {
  const rawSet = Array.from(new Set(items.map((i) => (i.raw || '').trim()).filter(Boolean)));
  const numberGroups: Record<string, string[]> = {};
  const noNumberList: string[] = [];

  rawSet.forEach((raw) => {
    const numMatch = raw.match(/\b\d{2,6}\b/);
    if (numMatch) {
      const num = numMatch[0];
      if (!numberGroups[num]) numberGroups[num] = [];
      numberGroups[num].push(raw);
    } else {
      noNumberList.push(raw);
    }
  });

  const canonicalMap: Record<string, AICostCenterCanonicalInfo> = {};
  const grupos: AICostCenterGroup[] = [];

  Object.entries(numberGroups).forEach(([num, variations]) => {
    let bestName = '';
    variations.forEach((v) => {
      const namePart = v
        .replace(new RegExp(`^(?:cc|centro\\s*de\\s*custo)?\\s*${num}\\s*[-–—:]*\\s*`, 'i'), '')
        .replace(new RegExp(`\\s*[-–—:]*\\s*${num}$`), '')
        .trim();
      if (namePart.length > bestName.length && /[a-zA-Z]/.test(namePart)) {
        bestName = namePart;
      }
    });

    const matchedNoNumber: string[] = [];
    noNumberList.forEach((rawNoNum) => {
      if (
        bestName &&
        (rawNoNum.toLowerCase().includes(bestName.toLowerCase()) ||
          bestName.toLowerCase().includes(rawNoNum.toLowerCase()))
      ) {
        matchedNoNumber.push(rawNoNum);
      }
    });

    const allVariations = Array.from(new Set([...variations, ...matchedNoNumber]));
    const canonical = bestName ? `${num} - ${bestName}` : `CC ${num}`;

    allVariations.forEach((v) => {
      const hasName = /[a-zA-Z]/.test(v);
      canonicalMap[v] = {
        codigo: num,
        nome: bestName || `Centro de Custo ${num}`,
        canonical: canonical,
        motivoUnificacao: !hasName
          ? `Registro original continha apenas o número "${v}". Unificado pela IA ao Centro de Custo oficial "${canonical}".`
          : `Unificado pelo identificador comum "${num}".`,
      };
    });

    grupos.push({
      codigo: num,
      canonical,
      variacoesIdentificadas: allVariations,
      explicacao:
        allVariations.length > 1
          ? `Unificadas ${allVariations.length} variações que compartilham o número ${num}${bestName ? ` (${bestName})` : ''}.`
          : `Centro de Custo ${canonical}`,
    });
  });

  noNumberList.forEach((v) => {
    if (!canonicalMap[v]) {
      const code = v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'CC';
      canonicalMap[v] = {
        codigo: code,
        nome: v,
        canonical: v,
        motivoUnificacao: 'Centro de custo descritivo sem código numérico associado.',
      };
      grupos.push({
        codigo: code,
        canonical: v,
        variacoesIdentificadas: [v],
        explicacao: `Centro de Custo ${v}`,
      });
    }
  });

  return { canonicalMap, grupos, source: 'heuristic_ai' };
}

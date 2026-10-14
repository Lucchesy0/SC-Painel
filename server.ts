import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SCS: any[] = [];
const DEFAULT_EQUIPMENTS: any[] = [];

interface DataStore {
  scs: any[];
  equipments: any[];
  lastModified: number;
}

function loadStore(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.scs)) return data;
    }
  } catch (err) {
    console.error('Error reading store file, falling back to defaults:', err);
  }
  const initial = {
    scs: DEFAULT_SCS,
    equipments: DEFAULT_EQUIPMENTS,
    lastModified: Date.now()
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: DataStore) {
  try {
    store.lastModified = Date.now();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

// Global data store reference
let store = loadStore();

// ================= API ROUTES FOR MULTI-DEVICE SYNC =================

// 1. Health & Sync Status Endpoint
app.get('/api/sync-status', (req, res) => {
  res.json({
    status: 'online',
    lastModified: store.lastModified,
    scCount: store.scs.length,
    equipmentCount: store.equipments.length,
    serverTime: new Date().toISOString()
  });
});

// 2. SC Endpoints
app.get('/api/scs', (req, res) => {
  res.json(store.scs);
});

app.post('/api/scs', (req, res) => {
  const newSC = req.body;
  if (!newSC.id) {
    newSC.id = 'sc-' + Math.random().toString(36).substring(2, 9);
  }
  store.scs.unshift(newSC);
  saveStore(store);
  res.status(201).json(newSC);
});

app.put('/api/scs/:id', (req, res) => {
  const id = req.params.id;
  const updatedSC = req.body;
  const idx = store.scs.findIndex((s) => s.id === id);
  if (idx !== -1) {
    store.scs[idx] = { ...updatedSC, id };
    saveStore(store);
    res.json(store.scs[idx]);
  } else {
    store.scs.unshift({ ...updatedSC, id });
    saveStore(store);
    res.json(updatedSC);
  }
});

app.delete('/api/scs/:id', (req, res) => {
  const id = req.params.id;
  store.scs = store.scs.filter((s) => s.id !== id);
  saveStore(store);
  res.json({ success: true });
});

app.post('/api/scs/bulk', (req, res) => {
  const list = req.body;
  if (Array.isArray(list)) {
    store.scs = list;
    saveStore(store);
    res.json({ success: true, count: store.scs.length });
  } else {
    res.status(400).json({ error: 'Array required' });
  }
});

// 3. Equipment Endpoints
app.get('/api/equipments', (req, res) => {
  res.json(store.equipments);
});

app.post('/api/equipments', (req, res) => {
  const eq = req.body;
  if (!eq.id) {
    eq.id = 'eq-' + Math.random().toString(36).substring(2, 9);
  }
  const idx = store.equipments.findIndex((e) => e.id === eq.id);
  if (idx !== -1) {
    store.equipments[idx] = eq;
  } else {
    store.equipments.unshift(eq);
  }
  saveStore(store);
  res.json(eq);
});

app.delete('/api/equipments/:id', (req, res) => {
  const id = req.params.id;
  store.equipments = store.equipments.filter((e) => e.id !== id);
  saveStore(store);
  res.json({ success: true });
});

app.post('/api/equipments/bulk', (req, res) => {
  const list = req.body;
  if (Array.isArray(list)) {
    store.equipments = list;
    saveStore(store);
    res.json({ success: true, count: store.equipments.length });
  } else {
    res.status(400).json({ error: 'Array required' });
  }
});

// 4. Reset & Clear Endpoints
app.post('/api/reset', (req, res) => {
  store = {
    scs: DEFAULT_SCS,
    equipments: DEFAULT_EQUIPMENTS,
    lastModified: Date.now()
  };
  saveStore(store);
  res.json({ success: true, scs: store.scs, equipments: store.equipments });
});

app.post('/api/clear', (req, res) => {
  store = {
    scs: [],
    equipments: [],
    lastModified: Date.now()
  };
  saveStore(store);
  res.json({ success: true });
});

// 5. Gemini AI Multimodal SC Image Parser (Free Tier)
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não está configurada no ambiente do servidor.');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

app.post('/api/ai/parse-sc-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Parâmetro imageBase64 é obrigatório.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();
    if (!cleanBase64) {
      return res.status(400).json({ error: 'Dados da imagem vazios ou inválidos.' });
    }

    const ai = getGenAI();
    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/png',
        data: cleanBase64,
      },
    };

    const promptText = `Você é um assistente especialista em ler e extrair itens e dados de tabelas de Solicitações de Compras (SC), ordens de compra e requisições de almoxarifado/TI da MCM Montagens a partir de capturas de tela (prints de telas como TOTVS RM, Excel, sistemas web, WhatsApp ou relatórios).

Analise atentamente a imagem e extraia todos os itens e informações visíveis:
1. "numeroSC": Se houver número de SC/Solicitação/Pedido (ex: "26088", "SC-1045", "1234"), extraia como string. Se não houver, deixe "".
2. "solicitante": Nome do solicitante se estiver visível, senão "".
3. "filial": Filial, centro de custo ou obra se visível, senão "".
4. "data": Data no formato YYYY-MM-DD se visível, senão "".
5. "itens": Lista de TODOS os itens/materiais encontrados na tabela com:
   - "descricao": Nome completo do material (ex: "Conector RJ45 macho (rede) CAT 6 UTP blindado", "Cabo de rede (UTP) CAT.:5e 4 pares caixa c/ 305m", "Bateria Estacionaria 12V 105A", "No-Break 1,4 KVA - (AF)").
   - "unidade": Sigla da unidade de medida padronizada (ex: "UN", "CX", "M", "PC", "KG", "L", "PAR", "JG"). Se não constar, use "UN".
   - "quantidade": Quantidade a solicitar (número positivo, ex: 3, 5, 2, 1).
   - "observacoes": Qualquer anotação ou observação adicional daquela linha, senão "".

Retorne SEMPRE exclusivamente um JSON válido com esta estrutura:
{
  "numeroSC": "",
  "solicitante": "",
  "filial": "",
  "data": "",
  "itens": [
    {
      "descricao": "Nome do item",
      "unidade": "UN",
      "quantidade": 1,
      "observacoes": ""
    }
  ]
}`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let responseText = '';

    for (const model of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              imagePart,
              { text: promptText },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        if (result && result.text) {
          responseText = result.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com modelo ${model} falhou:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastError || new Error('Não foi possível obter resposta dos modelos de visão da IA.');
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```(?:json)?/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    const sanitizedItens = Array.isArray(parsedData.itens)
      ? parsedData.itens.map((item: any, index: number) => ({
          id: `item_ai_${Date.now()}_${index}`,
          descricao: String(item.descricao || '').trim(),
          unidade: String(item.unidade || 'UN').trim().toUpperCase() || 'UN',
          quantidade: Math.max(1, Number(item.quantidade) || 1),
          quantidadeSolicitada: Math.max(1, Number(item.quantidade) || 1),
          destino: 'TI',
          observacoes: String(item.observacoes || '').trim(),
        })).filter((item: any) => item.descricao.length > 0)
      : [];

    res.json({
      success: true,
      data: {
        numeroSC: String(parsedData.numeroSC || '').trim(),
        solicitante: String(parsedData.solicitante || '').trim(),
        filial: String(parsedData.filial || '').trim(),
        data: String(parsedData.data || '').trim(),
        itens: sanitizedItens,
      },
    });
  } catch (error: any) {
    console.error('Erro na rota /api/ai/parse-sc-image:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao processar a imagem com a IA.',
    });
  }
});

// 6. Gemini AI Cost Center Unifier & Normalizer
interface CCNormalizationItem {
  raw: string;
  colaborador?: string;
  localidade?: string;
}

interface CCNormalizationResult {
  canonicalMap: Record<string, {
    codigo: string;
    nome: string;
    canonical: string;
    motivoUnificacao: string;
  }>;
  grupos: Array<{
    codigo: string;
    canonical: string;
    variacoesIdentificadas: string[];
    explicacao: string;
  }>;
}

function normalizeCostCentersHeuristic(items: CCNormalizationItem[]): CCNormalizationResult {
  const rawSet = Array.from(new Set(items.map(i => (i.raw || '').trim()).filter(Boolean)));
  const numberGroups: Record<string, string[]> = {};
  const noNumberList: string[] = [];

  rawSet.forEach(raw => {
    // Procura número identificador (ex: "8071", "988", "8052", "8010")
    const numMatch = raw.match(/\b\d{2,6}\b/);
    if (numMatch) {
      const num = numMatch[0];
      if (!numberGroups[num]) numberGroups[num] = [];
      numberGroups[num].push(raw);
    } else {
      noNumberList.push(raw);
    }
  });

  const canonicalMap: CCNormalizationResult['canonicalMap'] = {};
  const grupos: CCNormalizationResult['grupos'] = [];

  Object.entries(numberGroups).forEach(([num, variations]) => {
    let bestName = '';
    variations.forEach(v => {
      const namePart = v
        .replace(new RegExp(`^(?:cc|centro\\s*de\\s*custo)?\\s*${num}\\s*[-–—:]*\\s*`, 'i'), '')
        .replace(new RegExp(`\\s*[-–—:]*\\s*${num}$`), '')
        .trim();
      if (namePart.length > bestName.length && /[a-zA-Z]/.test(namePart)) {
        bestName = namePart;
      }
    });

    const matchedNoNumber: string[] = [];
    noNumberList.forEach(rawNoNum => {
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

    allVariations.forEach(v => {
      const hasName = /[a-zA-Z]/.test(v);
      canonicalMap[v] = {
        codigo: num,
        nome: bestName || `Centro de Custo ${num}`,
        canonical: canonical,
        motivoUnificacao: !hasName
          ? `Registro original continha apenas o número "${v}". Unificado pela IA ao Centro de Custo oficial "${canonical}".`
          : `Unificado pelo identificador comum "${num}".`
      };
    });

    grupos.push({
      codigo: num,
      canonical,
      variacoesIdentificadas: allVariations,
      explicacao: allVariations.length > 1
        ? `Unificadas ${allVariations.length} variações que compartilham o número ${num}${bestName ? ` (${bestName})` : ''}.`
        : `Centro de Custo ${canonical}`
    });
  });

  noNumberList.forEach(v => {
    if (!canonicalMap[v]) {
      const code = v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'CC';
      canonicalMap[v] = {
        codigo: code,
        nome: v,
        canonical: v,
        motivoUnificacao: 'Centro de custo descritivo sem código numérico associado.'
      };
      grupos.push({
        codigo: code,
        canonical: v,
        variacoesIdentificadas: [v],
        explicacao: `Centro de Custo ${v}`
      });
    }
  });

  return { canonicalMap, grupos };
}

app.post('/api/ai/normalize-cost-centers', async (req, res) => {
  try {
    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({
        success: true,
        data: {
          canonicalMap: {},
          grupos: []
        }
      });
    }

    let aiResponse: any = null;
    try {
      const ai = getGenAI();
      const promptText = `Você é um assistente especialista em ERP TOTVS RM e gestão de inventário e Centros de Custo da empresa MCM Montagens Industriais.
Na base de termos de responsabilidade e equipamentos, existem registros onde o Centro de Custo foi preenchido de formas diferentes para o MESMO centro de custo.
Por exemplo:
1. Registros que contêm apenas o número do centro de custo, sem o nome escrito (ex: "8071", "988", "8052", "8010").
2. Registros que contêm o número acompanhado do nome (ex: "8071 - CEQ (Central de Equipamentos)", "988 - Administração Central", "8052 - Manutenção Suape").
3. Registros que contêm apenas siglas ou nomes (ex: "CEQ", "Administração").

Regra fundamental da MCM: Centros de custo que compartilham o mesmo número (ou o mesmo nome/sigla de departamento/obra) FAZEM PARTE DO MESMO CENTRO DE CUSTO e devem ser agrupados e unificados sob a mesma nomenclatura canônica mais completa e descritiva possível (ex: "8071 - CEQ (Central de Equipamentos)").

Analise a seguinte lista de registros brutos de centros de custo da MCM:
${JSON.stringify(items)}

Retorne SEMPRE exclusivamente um JSON válido com esta estrutura:
{
  "canonicalMap": {
    "<string_bruta_exata>": {
      "codigo": "8071",
      "nome": "CEQ (Central de Equipamentos)",
      "canonical": "8071 - CEQ (Central de Equipamentos)",
      "motivoUnificacao": "Mesmo número 8071 unificado ao nome oficial CEQ"
    }
  },
  "grupos": [
    {
      "codigo": "8071",
      "canonical": "8071 - CEQ (Central de Equipamentos)",
      "variacoesIdentificadas": ["8071", "8071 - CEQ (Central de Equipamentos)"],
      "explicacao": "Unificados registros que tinham apenas o número 8071 com o nome oficial CEQ"
    }
  ]
}`;

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      for (const model of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timeout')), 7000)
          );
          const aiPromise = ai.models.generateContent({
            model,
            contents: promptText,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });

          const result: any = await Promise.race([aiPromise, timeoutPromise]);
          if (result && result.text) {
            let parsed: any = null;
            try {
              parsed = JSON.parse(result.text);
            } catch {
              const cleaned = result.text.replace(/```(?:json)?/g, '').trim();
              parsed = JSON.parse(cleaned);
            }
            if (parsed && parsed.canonicalMap) {
              // Converte caso o modelo retorne { "8071": "8071 - CEQ" } formato simplificado
              const normalizedMap: Record<string, any> = {};
              for (const [key, val] of Object.entries(parsed.canonicalMap)) {
                if (typeof val === 'string') {
                  const numMatch = val.match(/\b\d{2,6}\b/) || key.match(/\b\d{2,6}\b/);
                  normalizedMap[key] = {
                    codigo: numMatch ? numMatch[0] : 'CC',
                    nome: val,
                    canonical: val,
                    motivoUnificacao: `Unificado pela IA: compartilham o mesmo número e centro de custo`,
                  };
                } else if (val && typeof val === 'object') {
                  normalizedMap[key] = val;
                }
              }
              parsed.canonicalMap = normalizedMap;
              aiResponse = parsed;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`Tentativa Gemini CC com modelo ${model} falhou:`, err?.message || err);
        }
      }
    } catch (err) {
      console.warn('Gemini não disponível para normalização de CC, aplicando heurística inteligente:', err);
    }

    const heuristic = normalizeCostCentersHeuristic(items);
    const finalCanonicalMap: Record<string, any> = { ...heuristic.canonicalMap };
    if (aiResponse?.canonicalMap) {
      for (const [key, val] of Object.entries(aiResponse.canonicalMap)) {
        if (val && typeof val === 'object') {
          finalCanonicalMap[key] = val;
        }
      }
    }

    res.json({
      success: true,
      data: {
        canonicalMap: finalCanonicalMap,
        grupos: aiResponse?.grupos && aiResponse.grupos.length > 0 ? aiResponse.grupos : heuristic.grupos,
        source: aiResponse ? 'gemini_ai' : 'heuristic_ai'
      }
    });
  } catch (error: any) {
    console.error('Erro na rota /api/ai/normalize-cost-centers:', error);
    const heuristic = normalizeCostCentersHeuristic(req.body?.items || []);
    res.json({
      success: true,
      data: {
        canonicalMap: heuristic.canonicalMap,
        grupos: heuristic.grupos,
        source: 'heuristic_fallback'
      }
    });
  }
});

// ================= VITE MIDDLEWARE SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MCM Montagens server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

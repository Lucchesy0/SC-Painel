import { SC } from '../types';
import { clearIDB } from './indexedDB';

export const INITIAL_SCS: SC[] = [];

/**
 * Converte texto colado de tabela RM / TSV / CSV para o modelo SC
 * Aplicando as regras oficiais:
 * - Código/RM -> Número da Solicitação
 * - Data de Emissão -> Data
 * - Centro de Custo -> Solicitante / Setor
 * - Origem 'Estoque - Reposição' -> Tipo 'Item'
 * - Origem 'Manual - Consumo' -> Tipo 'Serviço / Assistência'
 * - Itens -> [] (vazio, sem invenção de dados)
 */
export function parseRMTableText(rawText: string): SC[] {
  const lines = rawText.trim().split(/\r?\n/);
  const parsedSCs: SC[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Ignora linha de cabeçalho
    if (
      trimmed.toLowerCase().includes('código da solicitação') ||
      trimmed.toLowerCase().includes('data de emissão') ||
      trimmed.toLowerCase().includes('número (rm)')
    ) {
      continue;
    }

    // Tenta separar por TAB, ponto e vírgula ou múltiplos espaços
    let cols = trimmed.split('\t');
    if (cols.length < 3) {
      cols = trimmed.split(';');
    }
    if (cols.length < 3) {
      cols = trimmed.split(/\s{2,}/);
    }

    if (cols.length === 0) continue;

    const rawCodigo = cols[0]?.trim();
    if (!rawCodigo) continue;

    // Colunas típicas:
    // 0: Código da Solicitação (ex: 26015)
    // 1: Filial (ex: 20)
    // 2: Data de Emissão (ex: 03/06/2026)
    // 3: Número RM (ex: 26015)
    // 4: Descrição Origem (ex: Estoque - Reposição)
    // 5: Código Localização Padrão
    // 6: Descrição Localização Padrão
    // 7: Código C.Custo Padrão (ex: 110)
    // 8: Descrição C.Custo Padrão (ex: 8004 - CEQ - Central de Equipamentos (MCM))
    // 9: Código Projeto Padrão (ex: 421)
    // 10: Descrição Projeto Padrão (ex: Estrutura de apoio - COE - MCM)
    const numero = (cols[3]?.trim() || rawCodigo).replace(/\D/g, '') || rawCodigo;
    const rawData = cols[2]?.trim() || '';

    // Converte data DD/MM/AAAA para YYYY-MM-DD
    let formattedDate = new Date().toISOString().split('T')[0];
    if (rawData) {
      const parts = rawData.split(/[/.-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          const [d, m, y] = parts;
          formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          // YYYY-MM-DD
          const [y, m, d] = parts;
          formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
    }

    const rawOrigem = cols[4]?.trim() || 'Estoque - Reposição';
    const isManualServico =
      rawOrigem.toLowerCase().includes('manual') ||
      rawOrigem.toLowerCase().includes('serviço') ||
      rawOrigem.toLowerCase().includes('assistência');

    const tipo: 'Item' | 'Serviço / Assistência' = isManualServico ? 'Serviço / Assistência' : 'Item';
    const origem = isManualServico ? 'Manual - Consumo' : 'Estoque - Reposição';

    const codCusto = cols[7]?.trim() || '110';
    const descCusto = cols[8]?.trim() || '8004 - CEQ - Central de Equipamentos (MCM)';
    const solicitante =
      codCusto && descCusto && !descCusto.startsWith(codCusto)
        ? `${codCusto} - ${descCusto}`
        : descCusto || `${codCusto} - Centro de Custo`;

    const filial = cols[1]?.trim() || '20';
    const codProj = cols[9]?.trim() || '421';
    const descProj = cols[10]?.trim() || 'Estrutura de apoio - COE - MCM';
    const projeto = `${codProj} - ${descProj}`;

    parsedSCs.push({
      id: `sc-${numero}-${Math.random().toString(36).substring(2, 6)}`,
      numero,
      data: formattedDate,
      solicitante,
      tipo,
      origem,
      filial,
      projeto,
      status: 'Em andamento',
      prioridade: 'Média',
      itens: [], // REGRA: SEMPRE VAZIO NA IMPORTAÇÃO
    });
  }

  return parsedSCs;
}

const STORAGE_KEY = 'mcm_sc_data_v2';

export function loadSCS(): SC[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SCS));
      return INITIAL_SCS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading SCs from storage', err);
    return INITIAL_SCS;
  }
}

export function saveSCS(scs: SC[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scs));
  } catch (err) {
    console.error('Error saving SCs to storage', err);
  }
}

export async function resetStorage(): Promise<SC[]> {
  try {
    localStorage.removeItem(STORAGE_KEY);
    await clearIDB();
  } catch (err) {
    console.error('Error resetting storage', err);
  }
  return INITIAL_SCS;
}

export function calcDays(dateString: string, status: string): number {
  if (!dateString) return 0;
  const start = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  if (isNaN(start.getTime())) return 0;
  
  if (status === 'Concluído') return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = Math.max(0, today.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDateBR(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateString;
}

export function isDelayed(dataString: string, status: string, thresholdDays = 7): boolean {
  if (status === 'Concluído') return false;
  return calcDays(dataString, status) > thresholdDays;
}

export function exportToCSV(scs: SC[]): void {
  if (!scs || scs.length === 0) return;

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  csvContent += 'SC;Data;Solicitante;Status;Prioridade;Qtd Itens;Dias Em Andamento;Lista de Itens;Links Imagens\n';

  scs.forEach((sc) => {
    const dias = calcDays(sc.data, sc.status);
    const dateFormatted = formatDateBR(sc.data);
    const itemList = sc.itens.map((i) => `${i.descricao} (${i.quantidade || 1}${i.unidade} -> ${i.destino})`).join(' | ');
    const imgLinks = sc.itens.map((i) => i.imageUrl).filter(Boolean).join(' | ');

    const line = [
      `"${sc.numero}"`,
      `"${dateFormatted}"`,
      `"${sc.solicitante}"`,
      `"${sc.status}"`,
      `"${sc.prioridade || 'Média'}"`,
      `"${sc.itens.length}"`,
      `"${sc.status === 'Concluído' ? '-' : dias}"`,
      `"${itemList.replace(/"/g, '""')}"`,
      `"${imgLinks.replace(/"/g, '""')}"`,
    ].join(';');

    csvContent += line + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `mcm_solicitacoes_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEquipmentsToCSV(equipments: any[]): void {
  if (!equipments || equipments.length === 0) return;

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  csvContent += 'Código Patrimônio (AF);Equipamento;Categoria;Marca/Modelo;Status;Localização;Valor Estimado (R$);Data Manutenção;Observações\n';

  equipments.forEach((eq) => {
    const line = [
      `"${eq.codigoPatrimonio || '-'}"`,
      `"${(eq.nome || '').replace(/"/g, '""')}"`,
      `"${eq.categoria || '-'}"`,
      `"${(eq.marcaModelo || '-').replace(/"/g, '""')}"`,
      `"${eq.status || 'Ativado'}"`,
      `"${(eq.localizacao || '-').replace(/"/g, '""')}"`,
      `"${eq.valorEstimado ? eq.valorEstimado.toFixed(2) : '0,00'}"`,
      `"${eq.dataManutencao ? formatDateBR(eq.dataManutencao) : '-'}"`,
      `"${(eq.observacoes || '').replace(/"/g, '""')}"`,
    ].join(';');

    csvContent += line + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `mcm_inventario_ti_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

import * as XLSX from 'xlsx';
import { SC, SCTipo, SCStatus } from '../types';

export interface RMParsedRow {
  numero: string;
  data: string;
  solicitante: string;
  tipo: SCTipo;
  origem: string;
  filial?: string;
  projeto?: string;
  status: SCStatus;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  rawRow: string;
  isValid: boolean;
  error?: string;
}

export interface RMParseResult {
  rows: RMParsedRow[];
  validCount: number;
  invalidCount: number;
  duplicatesCount: number;
  headersDetected: string[];
  isBinaryGarbled?: boolean;
}

export interface ExcelSheetInfo {
  name: string;
  rowCount: number;
}

export interface ExcelParseResult {
  text: string;
  sheets: ExcelSheetInfo[];
  selectedSheet: string;
}

/**
 * Detecta se o texto colado é lixo binário (ex: quando o usuário abre um arquivo .xls no Bloco de Notas e cola o conteúdo binário OLE2)
 */
export function isBinaryGarbledText(text: string): boolean {
  if (!text || text.length === 0) return false;
  if (text.includes('Root Entry') || text.includes('Workbook') || text.includes('\x00') || text.includes('\u0000')) {
    return true;
  }
  // Conta caracteres de controle ou caracteres de substituição unicode ()
  let nonPrintable = 0;
  const sample = text.slice(0, 1000);
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 0xfffd) {
      nonPrintable++;
    }
  }
  return nonPrintable > 5;
}

/**
 * Converte tabela HTML copiada do navegador ou Totvs RM Web para formato TSV limpo
 */
export function htmlTableToTsv(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    if (tables.length === 0) return '';

    const lines: string[] = [];
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll('th, td');
        const rowData: string[] = [];
        cells.forEach((cell) => {
          const text = (cell.textContent || '').replace(/[\t\r\n]+/g, ' ').trim();
          rowData.push(text);
        });
        if (rowData.some((c) => c.length > 0)) {
          lines.push(rowData.join('\t'));
        }
      });
    });

    return lines.join('\n');
  } catch (err) {
    console.warn('Falha ao processar tabela HTML:', err);
    return '';
  }
}

/**
 * Decodifica ArrayBuffer com fallback para Windows-1252 / ISO-8859-1 (comum em sistemas Totvs RM legados)
 */
export function decodeArrayBufferToText(buffer: ArrayBuffer): string {
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    try {
      const winDecoder = new TextDecoder('windows-1252');
      return winDecoder.decode(buffer);
    } catch {
      const isoDecoder = new TextDecoder('iso-8859-1');
      return isoDecoder.decode(buffer);
    }
  }
}

/**
 * Lê e converte um arquivo binário do Excel (.xls, .xlsx, .xlsm, .xlsb, .ods) ou texto em TSV limpo
 */
export function parseExcelBufferToTableText(
  buffer: ArrayBuffer,
  sheetName?: string
): ExcelParseResult {
  try {
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellText: true,
      raw: false,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      // Fallback para texto puro
      const decodedText = decodeArrayBufferToText(buffer);
      return { text: decodedText, sheets: [{ name: 'Dados', rowCount: 1 }], selectedSheet: 'Dados' };
    }

    const sheets: ExcelSheetInfo[] = workbook.SheetNames.map((name) => {
      const ws = workbook.Sheets[name];
      if (!ws || !ws['!ref']) return { name, rowCount: 0 };
      const range = XLSX.utils.decode_range(ws['!ref']);
      const rowCount = Math.max(0, range.e.r - range.s.r + 1);
      return { name, rowCount };
    });

    // Se nenhuma aba especificada, seleciona a que tiver mais linhas ou a primeira
    const targetSheetName =
      sheetName && workbook.SheetNames.includes(sheetName)
        ? sheetName
        : sheets.slice().sort((a, b) => b.rowCount - a.rowCount)[0]?.name || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return { text: '', sheets, selectedSheet: targetSheetName };
    }

    // Converte para TSV (Tab-Separated Values) preservando datas e valores limpos
    const tsvText = XLSX.utils.sheet_to_csv(worksheet, {
      FS: '\t',
      blankrows: false,
      dateNF: 'dd/mm/yyyy',
    });

    return {
      text: tsvText,
      sheets,
      selectedSheet: targetSheetName,
    };
  } catch (err) {
    console.warn('Tentando decodificar como texto puro após falha no XLSX.read:', err);
    const decodedText = decodeArrayBufferToText(buffer);
    if (!isBinaryGarbledText(decodedText)) {
      return { text: decodedText, sheets: [{ name: 'Arquivo', rowCount: 1 }], selectedSheet: 'Arquivo' };
    }
    throw new Error('Falha ao processar arquivo Excel (.xls / .xlsx). O arquivo pode estar corrompido ou protegido por senha.');
  }
}

/**
 * Normaliza datas nos formatos DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD ou serial Excel para YYYY-MM-DD
 */
export function normalizeDate(rawDate: string | number): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  // Caso seja número serial do Excel (ex: 45446)
  if (typeof rawDate === 'number' || (/^\d{5}$/.test(String(rawDate).trim()) && !String(rawDate).includes('/'))) {
    const serial = Number(rawDate);
    if (serial > 20000 && serial < 80000) {
      // Excel epoch: 1899-12-30 (leva em conta o bug do ano bissexto de 1900)
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  const cleaned = String(rawDate).trim();

  // Caso YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Caso DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Caso DD/MM/YY
  const ddmmyy = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (ddmmyy) {
    const day = ddmmyy[1].padStart(2, '0');
    const month = ddmmyy[2].padStart(2, '0');
    const year = `20${ddmmyy[3]}`;
    return `${year}-${month}-${day}`;
  }

  // Tenta parse nativo JS
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Identifica o tipo e origem conforme as regras de negócio RM:
 * - 'Estoque - Reposição' -> Tipo 'Item'
 * - 'Manual - Consumo' -> Tipo 'Serviço / Assistência'
 */
export function classifyTipoAndOrigem(rawText: string): { tipo: SCTipo; origem: string } {
  const normalized = (rawText || '').toLowerCase();

  if (
    normalized.includes('manual') ||
    normalized.includes('consumo') ||
    normalized.includes('serviço') ||
    normalized.includes('servico') ||
    normalized.includes('assistencia') ||
    normalized.includes('assistência')
  ) {
    return {
      tipo: 'Serviço / Assistência',
      origem: 'Manual - Consumo',
    };
  }

  // Padrão: Estoque - Reposição / Item
  return {
    tipo: 'Item',
    origem: 'Estoque - Reposição',
  };
}

/**
 * Analisador inteligente de dados do RM (colados do Excel, TSV, CSV, Pipe, ou texto livre)
 */
export function parseRMTableText(rawInput: string, existingNumbers: Set<string> = new Set()): RMParseResult {
  if (!rawInput || !rawInput.trim()) {
    return {
      rows: [],
      validCount: 0,
      invalidCount: 0,
      duplicatesCount: 0,
      headersDetected: [],
    };
  }

  // Verifica se o usuário colou bytes binários de um arquivo .xls aberto como texto
  if (isBinaryGarbledText(rawInput)) {
    return {
      rows: [],
      validCount: 0,
      invalidCount: 0,
      duplicatesCount: 0,
      headersDetected: [],
      isBinaryGarbled: true,
    };
  }

  const rawLines = rawInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      rows: [],
      validCount: 0,
      invalidCount: 0,
      duplicatesCount: 0,
      headersDetected: [],
    };
  }

  // Identificar delimitador predominante na primeira linha
  const firstLine = rawLines[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';
  else if (firstLine.includes(',')) delimiter = ',';

  // Verificar se primeira linha é cabeçalho
  const firstTokens = firstLine.split(delimiter).map((t) => t.trim().replace(/^["']|["']$/g, ''));
  const firstTokensLower = firstTokens.map((t) => t.toLowerCase());

  let hasHeader = false;
  let headerMap: { [key: string]: number } = {};

  const knownHeaderKeywords = [
    'solicitação', 'solicitacao', 'código', 'codigo', 'cod.solicitacao', 'codsolicitacao', 'sc', 'número', 'numero', 'numeromov', 'nº rm', 'n° rm',
    'emissão', 'emissao', 'data', 'dt. emissão', 'dt emissao', 'dataemissao', 'dt.',
    'custo', 'c.custo', 'solicitante', 'setor', 'departamento', 'codccusto',
    'origem', 'tipo', 'historicocurto',
    'filial', 'codfilial', 'projeto', 'obra'
  ];

  const headerMatches = firstTokensLower.filter((token) =>
    knownHeaderKeywords.some((kw) => token.includes(kw))
  );

  if (headerMatches.length >= 2 || firstTokensLower.some((t) => t.includes('solicita') || t.includes('c.custo') || t.includes('emiss') || t.includes('numeromov'))) {
    hasHeader = true;
    firstTokensLower.forEach((token, idx) => {
      if (
        token.includes('solicita') ||
        token.includes('número') ||
        token.includes('numero') ||
        token.includes('numeromov') ||
        token === 'código' ||
        token === 'codigo' ||
        token === 'sc' ||
        token.includes('código da solicitação') ||
        token.includes('codigo da solicitacao')
      ) {
        if (!('numero' in headerMap)) headerMap['numero'] = idx;
      }
      if (token.includes('emiss') || token.includes('data') || token.includes('dt.')) {
        if (!('data' in headerMap)) headerMap['data'] = idx;
      }
      if (
        token.includes('descrição c.custo') ||
        token.includes('descricao c.custo') ||
        token.includes('desc. c.custo') ||
        token.includes('desc ccusto') ||
        token.includes('descrição centro de custo') ||
        token.includes('descricao centro de custo')
      ) {
        headerMap['desc_ccusto'] = idx;
      } else if (
        token.includes('código c.custo') ||
        token.includes('codigo c.custo') ||
        token.includes('cod. c.custo') ||
        token.includes('codccusto') ||
        token === 'código cc' ||
        token === 'codigo cc'
      ) {
        headerMap['cod_ccusto'] = idx;
      } else if (
        token.includes('c.custo') ||
        token.includes('custo') ||
        token.includes('solicitante') ||
        token.includes('setor') ||
        token.includes('departamento')
      ) {
        if (!('desc_ccusto' in headerMap)) headerMap['desc_ccusto'] = idx;
      }
      if (token.includes('origem') || token.includes('tipo') || token.includes('historico')) {
        if (!('origem' in headerMap)) headerMap['origem'] = idx;
      }
      if (token.includes('filial')) {
        if (!('filial' in headerMap)) headerMap['filial'] = idx;
      }
      if (
        token.includes('descrição projeto') ||
        token.includes('descricao projeto') ||
        token.includes('desc. projeto')
      ) {
        headerMap['desc_projeto'] = idx;
      } else if (
        token.includes('código projeto') ||
        token.includes('codigo projeto') ||
        token.includes('cod. projeto')
      ) {
        headerMap['cod_projeto'] = idx;
      } else if (token.includes('projeto') || token.includes('obra')) {
        if (!('desc_projeto' in headerMap)) headerMap['desc_projeto'] = idx;
      }
      if (token.includes('emerg') || token.includes('urgên') || token.includes('urgen') || token.includes('prioridade')) {
        if (!('emergencial' in headerMap)) headerMap['emergencial'] = idx;
      }
    });
  }

  const linesToProcess = hasHeader ? rawLines.slice(1) : rawLines;
  const parsedRows: RMParsedRow[] = [];
  const encounteredNumbersInBatch = new Set<string>();

  for (const line of linesToProcess) {
    const tokens = line.split(delimiter).map((t) => t.trim().replace(/^["']|["']$/g, ''));
    if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === '')) continue;

    let numero = '';
    let rawDate = '';
    let solicitante = '';
    let rawOrigem = '';
    let filial = '20';
    let projeto = '';
    let prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente' = 'Média';

    if (hasHeader && Object.keys(headerMap).length > 0) {
      if (headerMap['numero'] !== undefined && tokens[headerMap['numero']]) {
        numero = tokens[headerMap['numero']];
      }
      if (headerMap['data'] !== undefined && tokens[headerMap['data']]) {
        rawDate = tokens[headerMap['data']];
      }

      // Prioriza Descrição C.Custo Padrão (ex: "8004 - CEQ - Central de Equipamentos (MCM)")
      const descCC = headerMap['desc_ccusto'] !== undefined ? tokens[headerMap['desc_ccusto']] : '';
      const codCC = headerMap['cod_ccusto'] !== undefined ? tokens[headerMap['cod_ccusto']] : '';

      if (descCC) {
        solicitante = descCC;
      } else if (codCC) {
        solicitante = codCC;
      }

      if (headerMap['origem'] !== undefined && tokens[headerMap['origem']]) {
        rawOrigem = tokens[headerMap['origem']];
      }
      if (headerMap['filial'] !== undefined && tokens[headerMap['filial']]) {
        filial = tokens[headerMap['filial']];
      }
      
      const descProj = headerMap['desc_projeto'] !== undefined ? tokens[headerMap['desc_projeto']] : '';
      const codProj = headerMap['cod_projeto'] !== undefined ? tokens[headerMap['cod_projeto']] : '';
      if (codProj && descProj && !descProj.startsWith(codProj)) {
        projeto = `${codProj} - ${descProj}`;
      } else if (descProj) {
        projeto = descProj;
      } else if (codProj) {
        projeto = codProj;
      }

      if (headerMap['emergencial'] !== undefined) {
        const val = (tokens[headerMap['emergencial']] || '').trim().toUpperCase();
        if (val === 'S' || val === 'SIM' || val === 'Y' || val === 'YES' || val === '1' || val === 'URGENTE') {
          prioridade = 'Urgente';
        }
      }
    } else {
      // Heurística posicional / baseada em conteúdo
      // Token 0 geralmente é o Código da Solicitação (ex: 26015 ou SC-26015)
      numero = tokens[0] || '';

      // Busca token que se parece com data
      const dateTokenIdx = tokens.findIndex((t) => /\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(t));
      if (dateTokenIdx !== -1) {
        rawDate = tokens[dateTokenIdx];
      }

      // Busca token com Centro de Custo / Solicitante (ex: 8004 - CEQ - Central de Equipamentos...)
      const ccTokenIdx = tokens.findIndex((t) => /8004|CEQ|Central de Equipamentos|C\.Custo/i.test(t));
      if (ccTokenIdx !== -1) {
        solicitante = tokens[ccTokenIdx];
      } else if (tokens.length > 2) {
        const possibleTokens = tokens.filter((t, i) => i !== 0 && i !== dateTokenIdx);
        if (possibleTokens.length > 0) {
          solicitante = possibleTokens[0];
        }
      }

      // Busca token de Origem / Tipo
      const origemToken = tokens.find((t) => /estoque|reposi|manual|consumo|serviço|servico|assist/i.test(t));
      if (origemToken) {
        rawOrigem = origemToken;
      }
    }

    // Se número não foi extraído, tenta achar qualquer número inicial
    if (!numero) {
      const numMatch = line.match(/\b\d{4,7}\b/);
      if (numMatch) numero = numMatch[0];
    }

    // Solicitante padrão caso vazio
    if (!solicitante) {
      solicitante = '8004 - CEQ - Central de Equipamentos (MCM)';
    }

    const { tipo, origem } = classifyTipoAndOrigem(rawOrigem);
    const data = normalizeDate(rawDate);

    // Validação
    let isValid = true;
    let error = '';

    if (!numero) {
      isValid = false;
      error = 'Código / Número da solicitação não detectado';
    } else if (encounteredNumbersInBatch.has(numero)) {
      isValid = false;
      error = `Número duplicado no lote (${numero})`;
    } else if (existingNumbers.has(numero)) {
      // Aviso de já existente no sistema
      error = `Já existe no sistema (${numero})`;
    }

    if (isValid && numero) {
      encounteredNumbersInBatch.add(numero);
    }

    parsedRows.push({
      numero,
      data,
      solicitante,
      tipo,
      origem,
      filial: filial || '20',
      projeto: projeto || '421 - Estrutura de apoio - COE - MCM',
      status: 'Em andamento',
      prioridade: prioridade || 'Média',
      rawRow: line,
      isValid,
      error: error || undefined,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const duplicatesCount = parsedRows.filter((r) => r.error && r.error.includes('Já existe')).length;

  return {
    rows: parsedRows,
    validCount,
    invalidCount,
    duplicatesCount,
    headersDetected: hasHeader ? firstTokens : [],
  };
}

/**
 * Converte linhas parseadas em objetos SC prontos para salvar no IndexedDB
 */
export function convertParsedRowsToSCs(rows: RMParsedRow[]): SC[] {
  const timestamp = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return rows
    .filter((r) => r.isValid && r.numero)
    .map((r) => {
      return {
        id: 'sc-' + r.numero.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(36).substring(2, 6),
        numero: r.numero,
        data: r.data,
        solicitante: r.solicitante,
        tipo: r.tipo,
        origem: r.origem,
        filial: r.filial || '20',
        projeto: r.projeto || '421 - Estrutura de apoio - COE - MCM',
        status: r.status || 'Em andamento',
        prioridade: r.prioridade || 'Média',
        itens: [], // Lista limpa conforme regra de negócio estrita
        ultimaAlteracao: {
          dataHora: timestamp,
          tipo: 'Importação RM',
          usuario: 'Sistema / Importador RM',
        },
        historicoAuditoria: [
          {
            id: 'aud-' + Math.random().toString(36).substring(2, 9),
            dataHora: timestamp,
            tipo: 'Criação',
            descricao: `Solicitação ${r.numero} importada da Tabela RM (${r.origem})`,
            usuario: 'Importador RM',
          },
        ],
      };
    });
}

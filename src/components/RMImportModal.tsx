import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Sparkles,
  Database,
  FileCheck,
  RotateCw,
} from 'lucide-react';
import { SC } from '../types';
import {
  parseRMTableText,
  convertParsedRowsToSCs,
  parseExcelBufferToTableText,
  htmlTableToTsv,
  isBinaryGarbledText,
  ExcelSheetInfo,
} from '../utils/rmParser';

interface RMImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSCs: SC[];
  onImportSuccess: (importedSCs: SC[], mode: 'append' | 'replace') => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SAMPLE_RM_TEMPLATE = `Código da Solicitação\tFilial\tData de Emissão\tNúmero (RM)\tDescrição Origem\tCódigo Localização Padrão\tDescrição Localização Padrão\tCódigo C.Custo Padrão\tDescrição C.Custo Padrão\tCódigo Projeto Padrão\tDescrição Projeto Padrão\tSérie de Produção\tSol. Emergencial\tMotivo da Emergência
26015\t20\t03/06/2026\t26015\tEstoque - Reposição\t\t\t110\t8004 - CEQ - Central de Equipamentos (MCM)\t421\tEstrutura de apoio - COE - MCM\t\tN\t
26020\t20\t03/06/2026\t26020\tEstoque - Reposição\t\t\t110\t8004 - CEQ - Central de Equipamentos (MCM)\t421\tEstrutura de apoio - COE - MCM\t\tN\t
26069\t20\t15/06/2026\t26069\tManual - Consumo\t\t\t110\t8004 - CEQ - Central de Equipamentos (MCM)\t421\tEstrutura de apoio - COE - MCM\t\tN\t
26076\t20\t16/06/2026\t26076\tManual - Consumo\t\t\t110\t8004 - CEQ - Central de Equipamentos (MCM)\t421\tEstrutura de apoio - COE - MCM\t\tN\t
26077\t20\t17/06/2026\t26077\tEstoque - Reposição\t\t\t110\t8004 - CEQ - Central de Equipamentos (MCM)\t421\tEstrutura de apoio - COE - MCM\t\tN\t`;

export const RMImportModal: React.FC<RMImportModalProps> = ({
  isOpen,
  onClose,
  existingSCs,
  onImportSuccess,
  onToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isDragging, setIsDragging] = useState(false);
  const [filterPreview, setFilterPreview] = useState<'all' | 'valid' | 'errors'>('all');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedFileType, setLoadedFileType] = useState<'excel' | 'text' | null>(null);
  const [excelSheets, setExcelSheets] = useState<ExcelSheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingNumbers = useMemo(() => {
    return new Set(existingSCs.map((s) => s.numero.trim()));
  }, [existingSCs]);

  const parseResult = useMemo(() => {
    return parseRMTableText(inputText, existingNumbers);
  }, [inputText, existingNumbers]);

  const previewRows = useMemo(() => {
    if (filterPreview === 'valid') return parseResult.rows.filter((r) => r.isValid);
    if (filterPreview === 'errors') return parseResult.rows.filter((r) => !r.isValid);
    return parseResult.rows;
  }, [parseResult.rows, filterPreview]);

  if (!isOpen) return null;

  const processExcelBuffer = (buffer: ArrayBuffer, fileName: string, sheetNameToSelect?: string) => {
    try {
      const result = parseExcelBufferToTableText(buffer, sheetNameToSelect);
      setExcelBuffer(buffer);
      setExcelSheets(result.sheets);
      setSelectedSheet(result.selectedSheet);
      setLoadedFileName(fileName);
      setLoadedFileType('excel');
      setInputText(result.text);
      onToast(
        `Planilha "${fileName}" lida com sucesso! (${result.sheets.length} aba(s) detectada(s)).`,
        'success'
      );
    } catch (err) {
      console.error(err);
      onToast('Erro ao processar a planilha. Verifique se o formato é válido.', 'error');
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        processExcelBuffer(buffer, file.name);
      }
    };
    reader.onerror = () => {
      onToast('Erro ao ler o arquivo selecionado.', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleFileUpload(e.clipboardData.files[0]);
      return;
    }

    const html = e.clipboardData.getData('text/html');
    if (html && (html.includes('<table') || html.includes('<TABLE'))) {
      const tsv = htmlTableToTsv(html);
      if (tsv && tsv.trim().length > 0) {
        e.preventDefault();
        setInputText(tsv);
        setLoadedFileName('Tabela Colada (HTML/Excel)');
        setLoadedFileType('text');
        onToast('Tabela formatada extraída da área de transferência!', 'success');
        return;
      }
    }

    const text = e.clipboardData.getData('text/plain');
    if (isBinaryGarbledText(text)) {
      e.preventDefault();
      onToast(
        'Atenção: Você tentou colar o código binário de um arquivo .xls! Por favor, use o botão "Selecionar Arquivo" ou arraste o arquivo diretamente.',
        'warning'
      );
    }
  };

  const handleSheetChange = (newSheetName: string) => {
    if (!excelBuffer) return;
    try {
      const result = parseExcelBufferToTableText(excelBuffer, newSheetName);
      setSelectedSheet(result.selectedSheet);
      setInputText(result.text);
      onToast(`Aba "${result.selectedSheet}" carregada com sucesso.`, 'info');
    } catch (err) {
      console.error(err);
      onToast('Erro ao carregar a aba selecionada da planilha.', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLoadSample = () => {
    setLoadedFileName(null);
    setLoadedFileType(null);
    setExcelBuffer(null);
    setExcelSheets([]);
    setSelectedSheet('');
    setInputText(SAMPLE_RM_TEMPLATE);
    onToast('Modelo de exemplo RM preenchido no campo.', 'info');
  };

  const handleClear = () => {
    setInputText('');
    setLoadedFileName(null);
    setLoadedFileType(null);
    setExcelBuffer(null);
    setExcelSheets([]);
    setSelectedSheet('');
  };

  const handleExecuteImport = () => {
    if (parseResult.validCount === 0) {
      onToast('Nenhuma solicitação válida encontrada para importar.', 'error');
      return;
    }

    const scsToImport = convertParsedRowsToSCs(parseResult.rows);
    onImportSuccess(scsToImport, importMode);
    onToast(
      `${scsToImport.length} solicitação(ões) importada(s) com sucesso ${
        importMode === 'replace' ? '(base substituída)' : '(adicionadas à base)'
      }!`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#202532] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600/70 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#191d27]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  Importador de Arquivo XLS / Totvs RM
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  Suporta .XLS e .XLSX
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Faça upload de planilhas <strong>.xls</strong>, <strong>.xlsx</strong>, <strong>.csv</strong> ou cole dados copiados do Totvs RM / Excel.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {/* Rules Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#171a23] border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Regras de Mapeamento Automático (.xls / Totvs RM):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-orange-600 dark:text-orange-400">• Número da SC:</span>
                <span>Código da Solicitação / Código RM único.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-orange-600 dark:text-orange-400">• Data de Emissão:</span>
                <span>Formatada automaticamente (DD/MM/AAAA ou seriais Excel).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-orange-600 dark:text-orange-400">• Centro de Custo:</span>
                <span>Descrição C.Custo Padrão (ex: 8004 - CEQ - Central de Equipamentos).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-orange-600 dark:text-orange-400">• Classificação Tipo:</span>
                <span>
                  <strong>Estoque - Reposição</strong> → Item | <strong>Manual - Consumo</strong> → Serviço.
                </span>
              </div>
            </div>
          </div>

          {/* Binary Garbled Text Alert */}
          {parseResult.isBinaryGarbled && (
            <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-950 dark:text-amber-100">
                    Arquivo .xls colado como texto binário!
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Arquivos binários do Excel (com caracteres como <code>Root Entry</code> ou <code>Workbook</code>) não devem ser abertos no Bloco de Notas para copiar. Carregue o arquivo diretamente usando o botão abaixo para leitura automática:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Selecionar Arquivo .XLS
              </button>
            </div>
          )}

          {/* Active File / Sheet Selection Banner */}
          {loadedFileName && !parseResult.isBinaryGarbled && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 dark:text-emerald-200">
                    {loadedFileName}
                  </span>
                  {loadedFileType === 'excel' && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase">
                      Planilha Excel
                    </span>
                  )}
                </div>
              </div>

              {excelSheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Aba da Planilha:
                  </span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#191d27] text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {excelSheets.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.rowCount} linhas)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Input Area (Textarea & Drag Drop) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-orange-500" />
                <span>Cole a Tabela ou Carregue o Arquivo (.xls, .xlsx, .csv, .txt)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Ver Exemplo de Modelo
                </button>
                {inputText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-500 cursor-pointer flex items-center gap-1 ml-2"
                  >
                    <Trash2 className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Drop Area & Text Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-xl border-2 transition-all overflow-hidden ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5 ring-4 ring-orange-500/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#171a23]'
              }`}
            >
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (loadedFileName) setLoadedFileName(null);
                }}
                onPaste={handlePaste}
                placeholder="Cole aqui as linhas da tabela copiadas do Excel / Totvs RM ou faça upload do seu arquivo .xls...&#10;&#10;Exemplo:&#10;Código da Solicitação	Data de Emissão	Código C.Custo Padrão	Descrição C.Custo Padrão	Descrição Origem&#10;26015	03/06/2026	110	8004 - CEQ - Central de Equipamentos (MCM)	Estoque - Reposição"
                rows={6}
                className="w-full p-3.5 text-xs font-mono bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden resize-y min-h-[140px]"
              />

              {/* Upload trigger bar inside box bottom */}
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#141820] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Upload className="w-3.5 h-3.5 text-orange-500" />
                  <span>Arraste e solte um arquivo <strong>.xls</strong>, <strong>.xlsx</strong>, <strong>.csv</strong> ou <strong>.txt</strong> aqui, ou</span>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx,.xlsm,.xlsb,.ods,.csv,.tsv,.txt,.tab,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Selecionar Arquivo (.xls, .xlsx)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {inputText.trim().length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-[#171a23] border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Total de Linhas: <strong className="text-slate-900 dark:text-white font-mono">{parseResult.rows.length}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {parseResult.validCount} Válidas
                </span>
                {parseResult.duplicatesCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> {parseResult.duplicatesCount} Já existentes
                  </span>
                )}
                {parseResult.invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> {parseResult.invalidCount} Inválidas
                  </span>
                )}
              </div>

              {/* Filter preview selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterPreview('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    filterPreview === 'all'
                      ? 'bg-orange-500 text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Todas ({parseResult.rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPreview('valid')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    filterPreview === 'valid'
                      ? 'bg-orange-500 text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Válidas ({parseResult.validCount})
                </button>
                {parseResult.invalidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterPreview('errors')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      filterPreview === 'errors'
                        ? 'bg-red-500 text-white font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Erros ({parseResult.invalidCount})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          {inputText.trim().length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                <span>Prévia das Solicitações Mapeadas ({previewRows.length})</span>
                <span className="text-[11px] font-normal text-slate-400">Verifique os dados antes de confirmar</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-[#191d27] max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-[#141820] border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-28">Número RM</th>
                      <th className="p-2.5 w-24">Data</th>
                      <th className="p-2.5">Solicitante / C.Custo</th>
                      <th className="p-2.5 w-36">Tipo / Origem</th>
                      <th className="p-2.5 w-24 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Nenhum registro correspondente ao filtro.
                        </td>
                      </tr>
                    ) : (
                      previewRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                            !row.isValid ? 'bg-red-500/5 dark:bg-red-500/10' : ''
                          }`}
                        >
                          <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                            {row.numero || <span className="text-red-500 font-sans text-[11px]">[Vazio]</span>}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono">
                            {row.data}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300">
                            {row.solicitante}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.tipo === 'Item'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              }`}
                            >
                              {row.tipo}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{row.origem}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            {row.isValid ? (
                              <span className="text-emerald-500 font-bold text-xs">Válido</span>
                            ) : (
                              <span className="text-red-500 font-bold text-[11px]" title={row.error}>
                                {row.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Mode Radio Cards */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171a23] border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Modo de Inserção no Banco de Dados
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Escolha se deseja mesclar com os dados atuais ou substituir toda a base.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span>Adicionar às existentes</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className="text-red-600 dark:text-red-400 font-bold">Substituir base (Limpar e importar)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#191d27] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parseResult.validCount === 0}
            onClick={handleExecuteImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              parseResult.validCount > 0
                ? 'bg-orange-600 text-white hover:bg-orange-700 ring-2 ring-orange-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>
              {importMode === 'replace' ? 'Substituir e Importar' : 'Importar'}{' '}
              {parseResult.validCount > 0 ? `(${parseResult.validCount} SCs)` : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

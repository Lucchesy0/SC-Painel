import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  ArrowRight,
  ClipboardPaste,
  Hash,
  User,
  Calendar,
  Layers,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { SC, SCItem, SCStatus, UserProfile } from '../types';
import { parseSCImageWithAI, fileToBase64, AIParsedSCResult } from '../services/aiService';

interface SCImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
  users?: UserProfile[];
  onSaveSC: (scData: Omit<SC, 'id'>) => void;
  onOpenFullFormWithData?: (data: Partial<SC>) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  preloadedImageFile?: File | Blob | null;
}

export const SCImageImportModal: React.FC<SCImageImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = [],
  onSaveSC,
  onOpenFullFormWithData,
  onToast,
  preloadedImageFile,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted and user-confirmed SC fields
  const [numeroSC, setNumeroSC] = useState('');
  const [numeroDetected, setNumeroDetected] = useState(false);
  const [solicitante, setSolicitante] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [filial, setFilial] = useState('20 - Sede MCM');
  const [itens, setItens] = useState<SCItem[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const numeroInputRef = useRef<HTMLInputElement>(null);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDataEmissao(today);
      setSolicitante(currentUser?.nome || 'Operador MCM');
      setFilial('20 - Sede MCM');
      setNumeroSC('');
      setNumeroDetected(false);
      setItens([]);
      setErrorMessage(null);
      setAnalysisDone(false);

      if (preloadedImageFile) {
        processImageFile(preloadedImageFile);
      } else {
        setImagePreview(null);
      }
    }
  }, [isOpen, currentUser, preloadedImageFile]);

  // Focus on SC Number input as soon as analysis finishes
  useEffect(() => {
    if (analysisDone && numeroInputRef.current) {
      setTimeout(() => {
        numeroInputRef.current?.focus();
        numeroInputRef.current?.select();
      }, 150);
    }
  }, [analysisDone]);

  // Handle Ctrl+V paste anywhere in modal
  const handlePasteEvent = useCallback(
    (e: ClipboardEvent) => {
      if (!isOpen || isAnalyzing) return;
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            onToast('Print colado da área de transferência!', 'info');
            break;
          }
        }
      }
    },
    [isOpen, isAnalyzing, onToast]
  );

  useEffect(() => {
    window.addEventListener('paste', handlePasteEvent);
    return () => {
      window.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePasteEvent]);

  if (!isOpen) return null;

  const processImageFile = async (file: File | Blob) => {
    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisDone(false);

      const mime = file.type || 'image/png';
      setImageMime(mime);

      // Convert to Base64
      const base64DataUrl = await fileToBase64(file);
      setImagePreview(base64DataUrl);

      // Call server Gemini Vision API
      const extracted: AIParsedSCResult = await parseSCImageWithAI(base64DataUrl, mime);

      // Fill in extracted fields
      if (extracted.numeroSC && extracted.numeroSC.trim()) {
        setNumeroSC(extracted.numeroSC.trim());
        setNumeroDetected(true);
      } else {
        setNumeroDetected(false);
      }

      if (extracted.solicitante && extracted.solicitante.trim()) {
        setSolicitante(extracted.solicitante.trim());
      }

      if (extracted.data && extracted.data.trim()) {
        setDataEmissao(extracted.data.trim());
      }

      if (extracted.filial && extracted.filial.trim()) {
        setFilial(extracted.filial.trim());
      }

      const formattedItens: SCItem[] = (extracted.itens || []).map((it, idx) => ({
        id: it.id || `item_ai_${Date.now()}_${idx}`,
        descricao: it.descricao || '',
        unidade: it.unidade || 'UN',
        quantidade: it.quantidade || 1,
        quantidadeSolicitada: it.quantidade || 1,
        destino: 'TI',
        observacoes: it.observacoes || '',
      }));

      setItens(formattedItens);
      setAnalysisDone(true);

      if (formattedItens.length > 0) {
        onToast(
          `IA identificou ${formattedItens.length} item(ns) com sucesso! Digite o número da SC.`,
          'success'
        );
      } else {
        onToast('A IA leu o print, mas não encontrou itens. Você pode adicioná-los manualmente.', 'warning');
      }
    } catch (err: any) {
      console.error('Erro ao analisar imagem de SC:', err);
      const msg = err?.message || 'Falha ao analisar a imagem. Tente novamente.';
      setErrorMessage(msg);
      onToast(msg, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        onToast('Por favor, solte um arquivo de imagem válido (PNG, JPG, etc).', 'warning');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };

  const handleItemChange = (index: number, field: keyof SCItem, value: any) => {
    setItens((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'quantidade') {
        next[index].quantidadeSolicitada = value;
      }
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const newItem: SCItem = {
      id: `item_manual_${Date.now()}`,
      descricao: '',
      unidade: 'UN',
      quantidade: 1,
      quantidadeSolicitada: 1,
      destino: 'TI',
    };
    setItens((prev) => [...prev, newItem]);
  };

  const handleConfirmCreate = () => {
    const cleanNum = numeroSC.trim();
    if (!cleanNum) {
      onToast('Por favor, informe o número da SC.', 'warning');
      numeroInputRef.current?.focus();
      return;
    }

    if (itens.length === 0) {
      onToast('A SC deve conter pelo menos 1 item.', 'warning');
      return;
    }

    const validItens = itens.filter((i) => i.descricao.trim().length > 0);
    if (validItens.length === 0) {
      onToast('Informe a descrição para os itens da SC.', 'warning');
      return;
    }

    const newSCData: Omit<SC, 'id'> = {
      numero: cleanNum,
      data: dataEmissao || new Date().toISOString().split('T')[0],
      solicitante: solicitante.trim() || currentUser?.nome || 'Operador MCM',
      filial: filial || '20 - Sede MCM',
      tipo: 'Item',
      status: 'Em andamento' as SCStatus,
      itens: validItens,
      origem: 'Importação IA (Print / Captura de Tela)',
      observacoes: 'SC criada automaticamente via leitura inteligente de print.',
    };

    onSaveSC(newSCData);
    onToast(`SC ${cleanNum} criada com sucesso com ${validItens.length} item(ns)!`, 'success');
    onClose();
  };

  const handleOpenFullForm = () => {
    if (onOpenFullFormWithData) {
      onOpenFullFormWithData({
        numero: numeroSC.trim(),
        data: dataEmissao,
        solicitante: solicitante.trim(),
        filial: filial,
        status: 'Em andamento',
        itens: itens,
      });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      id="scImageImportModalBackdrop"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#1a1f2c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        id="scImageImportModalContent"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#151924]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Adicionar SC por Print
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  IA Gratuita
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cole com <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono font-bold">Ctrl+V</kbd> ou envie a foto/print da tabela
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
            id="btnCloseSCImageModal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Upload / Paste / Preview Dropzone */}
          {!imagePreview ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-[#1e2330]/50'
              }`}
              id="scImageDropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="max-w-md mx-auto flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                  <ClipboardPaste className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Cole o print da SC aqui (<span className="text-blue-600 dark:text-blue-400 font-mono">Ctrl + V</span>)
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  ou arraste e solte o arquivo da imagem, ou clique para selecionar
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#282f40] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                  Procurar imagem no computador
                </span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
                  Compatível com capturas do Windows (<kbd className="font-mono">Win+Shift+S</kbd>), TOTVS RM, Excel, WhatsApp e relatórios em imagem
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview Strip */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-[#151924] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-black/20">
                    <img
                      src={imagePreview}
                      alt="Print carregado"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      Print da solicitação carregado
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAnalyzing
                        ? 'IA analisando tabela e materiais...'
                        : analysisDone
                        ? 'Leitura visual concluída pela IA'
                        : 'Pronto para análise'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => {
                      setImagePreview(null);
                      setAnalysisDone(false);
                      setItens([]);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Trocar print</span>
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Processando print com IA multimodal...
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Lendo colunas de Descrição, Unidade e Quantidades da imagem enviada
                  </p>
                </div>
              )}

              {/* Error Display */}
              {errorMessage && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <p className="font-bold">Ocorreu uma falha na leitura da imagem</p>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Form & Items Section after Analysis */}
              {analysisDone && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Highlighted Question: SC Number & General Data */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/25 dark:to-[#1a2233] border border-blue-200/80 dark:border-blue-900/60 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                        Dados da Solicitação
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Número da SC (Primary Highlight) */}
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                          Número da SC <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            ref={numeroInputRef}
                            type="text"
                            value={numeroSC}
                            onChange={(e) => setNumeroSC(e.target.value)}
                            placeholder="Ex: 26088 ou SC-1045"
                            className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border-2 border-blue-500 dark:border-blue-500 bg-white dark:bg-[#1a1f2c] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 shadow-xs"
                            id="inputSCNumberAI"
                          />
                          {numeroDetected && (
                            <span className="absolute right-2.5 top-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              Detectado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Identificador da solicitação
                        </p>
                      </div>

                      {/* Solicitante */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Solicitante
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={solicitante}
                            onChange={(e) => setSolicitante(e.target.value)}
                            placeholder="Nome do solicitante"
                            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Quem fez o pedido
                        </p>
                      </div>

                      {/* Data de Emissão */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Data de Emissão
                        </label>
                        <input
                          type="date"
                          value={dataEmissao}
                          onChange={(e) => setDataEmissao(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Data da requisição
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Extracted Items Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#171b26]">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-[#131722] border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Itens / Materiais Extraídos ({itens.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar item</span>
                      </button>
                    </div>

                    {itens.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                        Nenhum item identificado. Clique em "+ Adicionar item" para incluir manualmente.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/60 dark:bg-[#1a1f2c] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2 px-3 font-semibold w-12 text-center">#</th>
                              <th className="py-2 px-3 font-semibold">Descrição do Material</th>
                              <th className="py-2 px-3 font-semibold w-24">Unidade</th>
                              <th className="py-2 px-3 font-semibold w-28 text-center">Qtd. Solicitada</th>
                              <th className="py-2 px-3 font-semibold w-12 text-center">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {itens.map((it, idx) => (
                              <tr key={it.id ? `${it.id}-${idx}` : `it-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={it.descricao}
                                    onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                                    placeholder="Descrição do material"
                                    className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={it.unidade}
                                    onChange={(e) =>
                                      handleItemChange(idx, 'unidade', e.target.value.toUpperCase())
                                    }
                                    placeholder="UN"
                                    className="w-full px-2 py-1.5 text-xs font-mono text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 uppercase"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    value={it.quantidade || 1}
                                    onChange={(e) =>
                                      handleItemChange(idx, 'quantidade', Math.max(1, parseFloat(e.target.value) || 1))
                                    }
                                    className="w-full px-2 py-1.5 text-xs font-mono text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f2c] text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                                  />
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                    title="Remover linha"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#151924]">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Modelo de visão Gemini (Plano gratuito ativo)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            {analysisDone && onOpenFullFormWithData && (
              <button
                type="button"
                onClick={handleOpenFullForm}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#202532] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Editar em formulário completo com centro de custo, fornecedor e prazos"
              >
                <span>Editar no Completo</span>
              </button>
            )}

            {analysisDone && (
              <button
                type="button"
                onClick={handleConfirmCreate}
                id="btnConfirmCreateSCAI"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar SC Agora</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

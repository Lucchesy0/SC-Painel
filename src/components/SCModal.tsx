import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Image as ImageIcon,
  Save,
  FileText,
  RotateCcw,
  Clock,
  Sparkles,
  Upload,
  CheckCircle2,
  DollarSign,
  Truck,
  Building,
} from 'lucide-react';
import { SC, SCItem, SCStatus, SCTipo, ItemStatus } from '../types';
import { getDefaultSlaDays } from '../services/notificationService';
import { compressImage } from '../utils/imageCompressor';

interface SCModalProps {
  isOpen: boolean;
  editingSC: SC | null;
  onClose: () => void;
  onSave: (scData: Omit<SC, 'id'>, id?: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface SCDraft {
  numero: string;
  data: string;
  dataVencimento?: string;
  solicitante: string;
  tipo?: SCTipo;
  origem?: string;
  status: SCStatus;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  itens: SCItem[];
  savedAt: string;
}

const DRAFT_KEY = 'mcm_sc_draft';

export const SCModal: React.FC<SCModalProps> = ({
  isOpen,
  editingSC,
  onClose,
  onSave,
  onToast,
}) => {
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [tipo, setTipo] = useState<SCTipo>('Item');
  const [origem, setOrigem] = useState('Estoque - Reposição');
  const [status, setStatus] = useState<SCStatus>('Em andamento');
  const [prioridade, setPrioridade] = useState<'Baixa' | 'Média' | 'Alta' | 'Urgente'>('Média');
  const [itens, setItens] = useState<SCItem[]>([]);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);

  // Item form state
  const [itemDesc, setItemDesc] = useState('');
  const [itemQtd, setItemQtd] = useState<number>(1);
  const [itemQtdRecebida, setItemQtdRecebida] = useState<number>(0);
  const [itemUni, setItemUni] = useState('UN');
  const [itemDest, setItemDest] = useState('');
  const [itemFornecedor, setItemFornecedor] = useState('');
  const [itemValor, setItemValor] = useState<string>('');
  const [itemImg, setItemImg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingSC) {
        setNumero(editingSC.numero);
        setData(editingSC.data);
        setDataVencimento(editingSC.dataVencimento || '');
        setSolicitante(editingSC.solicitante);
        setTipo(editingSC.tipo || 'Item');
        setOrigem(
          editingSC.origem ||
            (editingSC.tipo === 'Serviço / Assistência'
              ? 'Manual - Consumo'
              : 'Estoque - Reposição')
        );
        setStatus(editingSC.status);
        setPrioridade(editingSC.prioridade || 'Média');
        setItens(
          editingSC.itens
            ? editingSC.itens.map((it) => ({
                ...it,
                quantidadeSolicitada: it.quantidadeSolicitada ?? it.quantidade ?? 1,
                quantidadeRecebida: it.quantidadeRecebida ?? 0,
                statusItem:
                  it.statusItem ||
                  ((it.quantidadeRecebida ?? 0) >= (it.quantidadeSolicitada ?? it.quantidade ?? 1)
                    ? 'Entregue'
                    : (it.quantidadeRecebida ?? 0) > 0
                    ? 'Parcial'
                    : 'Pendente'),
              }))
            : []
        );
        setHasRestoredDraft(false);
        setLastDraftSavedAt(null);
      } else {
        const savedDraftStr = localStorage.getItem(DRAFT_KEY);
        let loadedFromDraft = false;

        if (savedDraftStr) {
          try {
            const draft: SCDraft = JSON.parse(savedDraftStr);
            if (draft.solicitante || (draft.itens && draft.itens.length > 0) || draft.numero) {
              setNumero(draft.numero || '');
              setData(draft.data || new Date().toISOString().split('T')[0]);
              setDataVencimento(draft.dataVencimento || '');
              setSolicitante(draft.solicitante || '');
              setTipo(draft.tipo || 'Item');
              setOrigem(draft.origem || 'Estoque - Reposição');
              setStatus(draft.status || 'Em andamento');
              setPrioridade(draft.prioridade || 'Média');
              setItens(draft.itens || []);
              setHasRestoredDraft(true);
              setLastDraftSavedAt(
                draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : null
              );
              loadedFromDraft = true;
            }
          } catch {
            localStorage.removeItem(DRAFT_KEY);
          }
        }

        if (!loadedFromDraft) {
          const todayStr = new Date().toISOString().split('T')[0];
          setNumero('');
          setData(todayStr);
          setDataVencimento('');
          setSolicitante('110 - 8004 - CEQ - Central de Equipamentos (MCM)');
          setTipo('Item');
          setOrigem('Estoque - Reposição');
          setStatus('Em andamento');
          setPrioridade('Média');
          setItens([]);
          setHasRestoredDraft(false);
          setLastDraftSavedAt(null);
        }
      }
      // Reset item inputs
      setItemDesc('');
      setItemQtd(1);
      setItemQtdRecebida(0);
      setItemUni('UN');
      setItemDest('');
      setItemFornecedor('');
      setItemValor('');
      setItemImg('');
    }
  }, [isOpen, editingSC]);

  // Auto-save draft
  useEffect(() => {
    if (isOpen && !editingSC) {
      if (solicitante.trim() || itens.length > 0 || itemDesc.trim() || numero.trim()) {
        const nowIso = new Date().toISOString();
        const draftData: SCDraft = {
          numero,
          data,
          dataVencimento,
          solicitante,
          tipo,
          origem,
          status,
          prioridade,
          itens,
          savedAt: nowIso,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        setLastDraftSavedAt(new Date(nowIso).toLocaleTimeString());
      }
    }
  }, [
    isOpen,
    editingSC,
    numero,
    data,
    dataVencimento,
    solicitante,
    tipo,
    origem,
    status,
    prioridade,
    itens,
  ]);

  if (!isOpen) return null;

  const handleApplyAutoSLA = () => {
    if (!data) return;
    const startDate = new Date(data + 'T00:00:00');
    if (isNaN(startDate.getTime())) return;
    const slaDays = getDefaultSlaDays(prioridade);
    const dueDate = new Date(startDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
    const formatted = dueDate.toISOString().split('T')[0];
    setDataVencimento(formatted);
    onToast(
      `Prazo sugerido de ${slaDays} dias aplicado: ${formatted.split('-').reverse().join('/')}`,
      'info'
    );
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    const todayStr = new Date().toISOString().split('T')[0];
    setNumero('');
    setData(todayStr);
    setDataVencimento('');
    setSolicitante('110 - 8004 - CEQ - Central de Equipamentos (MCM)');
    setTipo('Item');
    setOrigem('Estoque - Reposição');
    setStatus('Em andamento');
    setPrioridade('Média');
    setItens([]);
    setHasRestoredDraft(false);
    setLastDraftSavedAt(null);
    onToast('Rascunho descartado com sucesso.', 'info');
  };

  const handleAddItem = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    if (!itemDesc.trim()) {
      onToast('Descrição do item é obrigatória.', 'error');
      return;
    }

    const qtdSol = itemQtd > 0 ? itemQtd : 1;
    const qtdRec = Math.max(0, Math.min(qtdSol, itemQtdRecebida));
    const statusIt: ItemStatus =
      qtdRec >= qtdSol ? 'Entregue' : qtdRec > 0 ? 'Parcial' : 'Pendente';
    const valUnit = itemValor ? parseFloat(itemValor.replace(',', '.')) : undefined;

    const newItem: SCItem = {
      id: 'itm-' + Math.random().toString(36).substring(2, 9),
      descricao: itemDesc.trim(),
      quantidade: qtdSol,
      quantidadeSolicitada: qtdSol,
      quantidadeRecebida: qtdRec,
      statusItem: statusIt,
      unidade: itemUni.trim().toUpperCase() || 'UN',
      destino: itemDest.trim() || 'CEQ / Almoxarifado',
      fornecedor: itemFornecedor.trim() || undefined,
      valorUnitario: valUnit && !isNaN(valUnit) ? valUnit : undefined,
      imageUrl: itemImg.trim() || undefined,
    };

    setItens((prev) => [...prev, newItem]);
    setItemDesc('');
    setItemQtd(1);
    setItemQtdRecebida(0);
    setItemUni('UN');
    setItemDest('');
    setItemFornecedor('');
    setItemValor('');
    setItemImg('');
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemReceived = (index: number, newReceived: number) => {
    setItens((prev) =>
      prev.map((it, idx) => {
        if (idx === index) {
          const requested = it.quantidadeSolicitada ?? it.quantidade ?? 1;
          const rec = Math.max(0, Math.min(requested, newReceived));
          const status = rec >= requested ? 'Entregue' : rec > 0 ? 'Parcial' : 'Pendente';
          return {
            ...it,
            quantidadeRecebida: rec,
            statusItem: status,
          };
        }
        return it;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!numero.trim()) {
      onToast('Número da Solicitação é obrigatório.', 'error');
      return;
    }
    if (!solicitante.trim()) {
      onToast('Solicitante / Setor é obrigatório.', 'error');
      return;
    }

    if (!editingSC) {
      localStorage.removeItem(DRAFT_KEY);
    }

    onSave(
      {
        numero: numero.trim(),
        data,
        dataVencimento: dataVencimento.trim() ? dataVencimento.trim() : undefined,
        solicitante: solicitante.trim(),
        tipo,
        origem,
        status,
        prioridade,
        itens,
      },
      editingSC?.id
    );
  };

  const totalEstimado = itens.reduce((acc, it) => {
    if (it.valorUnitario) {
      return acc + it.valorUnitario * (it.quantidadeSolicitada ?? it.quantidade ?? 1);
    }
    return acc;
  }, 0);

  const totalRecebidosCount = itens.filter(
    (it) => (it.quantidadeRecebida ?? 0) >= (it.quantidadeSolicitada ?? it.quantidade ?? 1)
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#202532] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[95vh] overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#181d28]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100" id="modalTitle">
                {editingSC ? `Editar Solicitação #${editingSC.numero}` : 'Nova Solicitação de Compra'}
              </h2>
              {!editingSC && lastDraftSavedAt && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Save className="w-3 h-3" /> Auto-salvo às {lastDraftSavedAt}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cadastre e gerencie a solicitação com controle de múltiplos produtos e entregas parciais
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Restored Draft Alert Banner */}
        {hasRestoredDraft && !editingSC && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Rascunho Restaurado:</strong> Recuperamos os dados da sua sessão anterior.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Descartar
            </button>
          </div>
        )}

        {/* Form Body */}
        <form id="form-sc" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {/* Main Fields: Número da Solicitação, Data, Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Número da Solicitação *
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 26015"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Código / RM único da solicitação</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Data de Emissão *
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Tipo da Solicitação
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  const newTipo = e.target.value as SCTipo;
                  setTipo(newTipo);
                  if (newTipo === 'Item') setOrigem('Estoque - Reposição');
                  else setOrigem('Manual - Consumo');
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-semibold"
              >
                <option value="Item">Item (Estoque / Reposição)</option>
                <option value="Serviço / Assistência">Serviço / Assistência (Manual)</option>
              </select>
            </div>
          </div>

          {/* Solicitante, Status, Prioridade, Data de Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Solicitante / Setor (Centro de Custo) *
              </label>
              <input
                type="text"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                placeholder="Ex: 110 - 8004 - CEQ - Central de Equipamentos (MCM)"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Status da SC *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SCStatus)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-bold"
              >
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Prioridade
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as 'Baixa' | 'Média' | 'Alta' | 'Urgente')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-semibold"
              >
                <option value="Baixa">Baixa (SLA 15 dias)</option>
                <option value="Média">Média (SLA 7 dias)</option>
                <option value="Alta">Alta (SLA 4 dias)</option>
                <option value="Urgente">Urgente (SLA 2 dias)</option>
              </select>
            </div>
          </div>

          {/* Vencimento / SLA Prazo Customizável */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#181d28] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Prazo Limite de Entrega (SLA)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleApplyAutoSLA}
                  className="px-2.5 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3 h-3" /> Auto-SLA
                </button>
              </div>
            </div>

            {itens.length > 0 && (
              <div className="text-right text-xs">
                <span className="text-slate-500 block">Progresso dos Itens</span>
                <span className="font-black text-slate-800 dark:text-slate-100">
                  {totalRecebidosCount} de {itens.length} entregues ({Math.round((totalRecebidosCount / itens.length) * 100)}%)
                </span>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/70 dark:bg-[#181d28]">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1c2230]">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  📦 Itens e Produtos da Solicitação ({itens.length})
                </h3>
              </div>
              {totalEstimado > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Total Estimado: R$ {totalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="p-4 flex flex-col gap-3.5">
              {/* Add Item Form */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#202532] border border-slate-200/90 dark:border-slate-700/80 flex flex-col gap-3 shadow-xs">
                <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>+ Adicionar Produto / Item na SC</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Descrição do Item *
                    </label>
                    <input
                      type="text"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      placeholder="Ex: Cabo de Rede Cat6, Rolamento 6204..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Qtd Solicitada *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={itemQtd}
                      onChange={(e) => setItemQtd(parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-bold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Qtd Recebida
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={itemQtdRecebida}
                      onChange={(e) => setItemQtdRecebida(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={itemUni}
                      onChange={(e) => setItemUni(e.target.value)}
                      placeholder="UN, CX, M, KG..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Valor Unit. (R$)
                    </label>
                    <input
                      type="text"
                      value={itemValor}
                      onChange={(e) => setItemValor(e.target.value)}
                      placeholder="Ex: 45,50"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                </div>

                {/* Fornecedor, Destino e Botão Adicionar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={itemFornecedor}
                      onChange={(e) => setItemFornecedor(e.target.value)}
                      placeholder="Fornecedor / Cotação (Opcional)"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={itemDest}
                      onChange={(e) => setItemDest(e.target.value)}
                      placeholder="Destino / Centro de Custo (Opcional)"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-end gap-2">
                    <label className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-orange-500" />
                      <span>Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImage(file, 800, 0.7);
                              setItemImg(compressed);
                              onToast('Foto anexada!', 'success');
                            } catch (err) {
                              onToast('Erro ao carregar foto.', 'error');
                            }
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Incluir Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 max-h-56 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Descrição do Produto</th>
                      <th className="p-2.5 text-center w-28">Qtd Sol. / Rec.</th>
                      <th className="p-2.5 text-center w-24">Status</th>
                      <th className="p-2.5">Fornecedor / Destino</th>
                      <th className="p-2.5 text-right w-20">Valor</th>
                      <th className="p-2.5 text-center w-12">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-5 text-center text-slate-400">
                          Nenhum item adicionado ainda.
                        </td>
                      </tr>
                    ) : (
                      itens.map((item, idx) => {
                        const requested = item.quantidadeSolicitada ?? item.quantidade ?? 1;
                        const received = item.quantidadeRecebida ?? 0;
                        const isDone = received >= requested;

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                {item.descricao}
                              </span>
                              {item.imageUrl && (
                                <span className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
                                  <ImageIcon className="w-3 h-3" /> Foto anexada
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <span className={isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}>
                                  {received}
                                </span>
                                <span className="text-slate-400">/</span>
                                <span>{requested} {item.unidade}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDone
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : received > 0
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {item.statusItem || (isDone ? 'Entregue' : received > 0 ? 'Parcial' : 'Pendente')}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">
                              <div>{item.fornecedor || '-'}</div>
                              <div className="text-[10px] text-slate-400">{item.destino}</div>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                              {item.valorUnitario
                                ? `R$ ${(item.valorUnitario * requested).toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#181d28] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            form="form-sc"
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-black rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors cursor-pointer shadow-md text-center"
          >
            Salvar Solicitação
          </button>
        </div>
      </div>
    </div>
  );
};

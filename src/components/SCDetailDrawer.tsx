import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Check,
  Tag,
  ShieldCheck,
  History,
  CheckCircle2,
  RotateCcw,
  Truck,
  Plus,
  Package,
  Building,
  DollarSign,
} from 'lucide-react';
import { SC, SCItem, AuditLogEntry, UserProfile, RolePermissions } from '../types';
import { formatDateBR, calcDays } from '../utils/storage';
import { calculateSCReminderInfo } from '../services/notificationService';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';

interface SCDetailDrawerProps {
  sc: SC | null;
  currentUser?: UserProfile;
  permissions?: RolePermissions;
  onClose: () => void;
  onEdit: (sc: SC) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (sc: SC) => void;
  onReceiveItem?: (scId: string, itemId: string, newReceivedQty: number) => void;
}

export const SCDetailDrawer: React.FC<SCDetailDrawerProps> = ({
  sc,
  currentUser,
  permissions,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onReceiveItem,
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isCompletingAnim, setIsCompletingAnim] = useState(false);

  if (!sc) return null;

  const days = calcDays(sc.data, sc.status);
  const reminder = calculateSCReminderInfo(sc);

  const canEdit = permissions?.canEditSC ?? true;
  const canDelete = permissions?.canDeleteSC ?? true;
  const canReceive = permissions?.canReceiveItems ?? true;

  const totalItems = sc.itens?.length || 0;
  const deliveredItems = sc.itens?.filter(
    (it) => (it.quantidadeRecebida ?? 0) >= (it.quantidadeSolicitada ?? it.quantidade ?? 1)
  ).length || 0;
  const progressPercent = totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0;

  const handleToggle = () => {
    if (!onToggleStatus) return;
    if (sc.status !== 'Concluído') {
      triggerCompletionFeedback();
      setIsCompletingAnim(true);
      setTimeout(() => setIsCompletingAnim(false), 700);
    } else {
      triggerHaptic('light');
    }
    onToggleStatus(sc);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleQuickReceive = (item: SCItem, full = false) => {
    if (!onReceiveItem) return;
    const requested = item.quantidadeSolicitada ?? item.quantidade ?? 1;
    const currentRec = item.quantidadeRecebida ?? 0;
    const target = full ? requested : Math.min(requested, currentRec + 1);
    onReceiveItem(sc.id, item.id, target);
    triggerHaptic('medium');
  };

  const auditHistory: AuditLogEntry[] = sc.historicoAuditoria || [
    {
      id: 'initial',
      dataHora: `${formatDateBR(sc.data)} (Data SC)`,
      tipo: 'Criação',
      descricao: `Solicitação registrada por ${sc.solicitante}`,
      usuario: sc.solicitante,
    },
  ];

  const lastChange = sc.ultimaAlteracao || {
    dataHora: auditHistory[0]?.dataHora || formatDateBR(sc.data),
    tipo: auditHistory[0]?.tipo || 'Criação da Solicitação',
    usuario: sc.solicitante,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 dark:bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200">
      <div className="bg-white dark:bg-[#1c2230] w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#151a26]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                SC #{sc.numero}
              </span>
              {sc.prioridade && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {sc.prioridade}
                </span>
              )}
              {onToggleStatus && canEdit && (
                <button
                  type="button"
                  onClick={handleToggle}
                  title="Alternar status"
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                    isCompletingAnim
                      ? 'bg-emerald-500 text-white shadow-md'
                      : sc.status === 'Concluído'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {sc.status === 'Concluído' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluído</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Em andamento</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Detalhes, controle de recebimento de itens e rastreabilidade na nuvem
            </p>
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
          {/* Item Reception Progress Overview */}
          {totalItems > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-orange-500" /> Recebimento de Produtos (Almoxarifado)
                </span>
                <span className="font-black text-slate-900 dark:text-slate-100 font-mono">
                  {deliveredItems} de {totalItems} itens ({progressPercent}%)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    progressPercent === 100 ? 'bg-emerald-500' : progressPercent > 0 ? 'bg-blue-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Info Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Emissão</span>
              <strong className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatDateBR(sc.data)}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Dias</span>
              <strong className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {days} dias
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Tipo</span>
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                {sc.tipo || 'Item'}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Prazo SLA</span>
              <strong className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5 truncate">
                {sc.dataVencimento ? formatDateBR(sc.dataVencimento) : 'Sem prazo'}
              </strong>
            </div>
          </div>

          {/* Solicitante Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5" /> Solicitante / Setor
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {sc.solicitante}
            </p>
          </div>

          {/* Products & Items Detailed List with Fast Receipt Controls */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-orange-500" /> Itens da SC ({sc.itens.length})
              </h3>
              {canReceive && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> Entrada habilitada
                </span>
              )}
            </div>

            <div className="space-y-2">
              {sc.itens.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                  Nenhum item cadastrado nesta solicitação.
                </div>
              ) : (
                sc.itens.map((item, idx) => {
                  const req = item.quantidadeSolicitada ?? item.quantidade ?? 1;
                  const rec = item.quantidadeRecebida ?? 0;
                  const isComplete = rec >= req;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181d28] shadow-xs flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.descricao}
                          </h4>
                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            {item.fornecedor && <span>{item.fornecedor}</span>}
                            {item.destino && <span>Destino: {item.destino}</span>}
                            {item.valorUnitario && (
                              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                                R$ {item.valorUnitario.toFixed(2)} / un
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isComplete
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : rec > 0
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.statusItem || (isComplete ? 'Entregue' : rec > 0 ? 'Parcial' : 'Pendente')}
                        </span>
                      </div>

                      {/* Quantity & Receipt Action Bar */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-slate-400 text-[11px]">Entregue:</span>
                          <span className={`font-black ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {rec}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {req} {item.unidade}
                          </span>
                        </div>

                        {canReceive && (
                          <div className="flex items-center gap-1.5">
                            {!isComplete && (
                              <button
                                type="button"
                                onClick={() => handleQuickReceive(item, false)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3 text-orange-500" /> +1 un
                              </button>
                            )}

                            {!isComplete ? (
                              <button
                                type="button"
                                onClick={() => handleQuickReceive(item, true)}
                                className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3" /> Entrada Total
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Recebido
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Audit Log Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Auditoria & Histórico de Alterações
              </h3>
              <button
                onClick={() => setShowFullHistory(!showFullHistory)}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                {showFullHistory ? 'Recolher' : `Ver histórico (${auditHistory.length})`}
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                Último registro: {lastChange.tipo}
              </span>
              <span className="text-slate-400 text-[11px] block mt-0.5">
                Por {lastChange.usuario || sc.solicitante} em {lastChange.dataHora}
              </span>
            </div>

            {showFullHistory && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-col gap-2 max-h-48 overflow-y-auto">
                {auditHistory.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-2 rounded-lg bg-white dark:bg-[#1c2230] text-xs border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <strong className="text-slate-800 dark:text-slate-200">{entry.tipo}</strong>
                      <span className="text-slate-400 font-mono text-[10px]">{entry.dataHora}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                      {entry.descricao} ({entry.usuario || 'Sistema'})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151a26] flex items-center justify-between gap-3">
          {canDelete ? (
            <button
              onClick={() => onDelete(sc.id)}
              className="px-3 py-2 text-xs font-bold rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Excluir SC
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(sc);
                }}
                className="px-4 py-2 text-xs font-black rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors cursor-pointer shadow-xs"
              >
                Editar SC
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

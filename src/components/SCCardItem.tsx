import React, { memo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  User,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Check,
  RotateCcw,
  Package,
} from 'lucide-react';
import { SC, RolePermissions } from '../types';
import { calcDays, formatDateBR } from '../utils/storage';
import { calculateSCReminderInfo } from '../services/notificationService';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';

interface SCCardItemProps {
  sc: SC;
  permissions?: RolePermissions;
  onSelectSC: (sc: SC) => void;
  onEditSC: (sc: SC) => void;
  onDeleteSC: (id: string) => void;
  onToggleStatus?: (sc: SC) => void;
}

export const SCCardItem: React.FC<SCCardItemProps> = memo(
  ({ sc, permissions, onSelectSC, onEditSC, onDeleteSC, onToggleStatus }) => {
    const [isCompletingAnim, setIsCompletingAnim] = useState(false);
    const dias = calcDays(sc.data, sc.status);
    const reminder = calculateSCReminderInfo(sc);
    const isAtrasada = sc.status !== 'Concluído' && (reminder.urgency === 'atrasada' || dias > 7);
    const isHoje = sc.status !== 'Concluído' && reminder.urgency === 'hoje';
    const isBreve =
      sc.status !== 'Concluído' && (reminder.urgency === 'breve' || (dias >= 5 && dias <= 7));

    const canEdit = permissions?.canEditSC ?? true;
    const canDelete = permissions?.canDeleteSC ?? true;

    // Delivery stats
    const totalItensCount = sc.itens.length;
    const deliveredCount = sc.itens.filter(
      (it) => (it.quantidadeRecebida ?? 0) >= (it.quantidadeSolicitada ?? it.quantidade ?? 1)
    ).length;
    const isAllDelivered = totalItensCount > 0 && deliveredCount === totalItensCount;
    const isPartialDelivered = deliveredCount > 0 && !isAllDelivered;

    const handleStatusToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onToggleStatus || !canEdit) return;

      if (sc.status !== 'Concluído') {
        triggerCompletionFeedback();
        setIsCompletingAnim(true);
        setTimeout(() => {
          setIsCompletingAnim(false);
        }, 700);
      } else {
        triggerHaptic('light');
      }

      onToggleStatus(sc);
    };

    return (
      <div
        className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 relative ${
          isCompletingAnim
            ? 'animate-completion-pulse bg-emerald-100/60 dark:bg-emerald-950/40 border-emerald-400'
            : isAtrasada
            ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 hover:border-red-400'
            : isHoje
            ? 'bg-amber-50/25 dark:bg-amber-950/15 border-amber-300 dark:border-amber-800 hover:border-amber-400'
            : isBreve
            ? 'bg-orange-50/20 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/50 hover:border-orange-400'
            : 'bg-white dark:bg-[#202532] border-slate-200 dark:border-slate-700/80 hover:border-orange-400'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => onSelectSC(sc)}
              className="font-black text-base text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              {sc.numero}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[140px]">{sc.solicitante}</span>
            </div>
          </div>

          {/* Interactive Badge with Haptic feedback */}
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={!canEdit}
            title={
              !canEdit
                ? 'Somente Comprador ou Almoxarifado podem alterar status'
                : sc.status === 'Concluído'
                ? 'Concluída! Toque para reabrir'
                : 'Toque para marcar como Concluída'
            }
            className={`group/card-status relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
              canEdit ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-85'
            } select-none min-h-[34px] focus:outline-hidden ${
              isCompletingAnim
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105'
                : sc.status === 'Concluído'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                : isAtrasada
                ? 'bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30 flex items-center gap-1 animate-pulse'
                : isHoje
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse'
                : isBreve
                ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 flex items-center gap-1'
                : 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/25'
            }`}
          >
            {isCompletingAnim ? (
              <>
                <Check className="w-3.5 h-3.5 text-white animate-checkmark-pop" />
                <span>Feito!</span>
              </>
            ) : sc.status === 'Concluído' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/card-status:hidden" />
                {canEdit && (
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 hidden group-hover/card-status:inline-block" />
                )}
                <span>Concluído</span>
              </>
            ) : isAtrasada ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Atrasada ({dias}d)</span>
              </>
            ) : isHoje ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Vence Hoje</span>
              </>
            ) : isBreve ? (
              <>
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>{reminder.diasRestantes}d rest.</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>{dias}d aberto</span>
              </>
            )}
          </button>
        </div>

        {/* Summary of items */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#2c3343] text-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Itens ({sc.itens.length})</span>
            <span>{formatDateBR(sc.data)}</span>
          </div>
          {sc.itens.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-200">
              <span className="truncate pr-2">{item.descricao}</span>
              <span className="font-mono text-slate-500">
                {item.quantidadeRecebida || 0}/{item.quantidadeSolicitada ?? item.quantidade ?? 1}{' '}
                {item.unidade || 'UN'}
              </span>
            </div>
          ))}
          {sc.itens.length > 2 && (
            <p className="text-[10px] text-slate-400">+{sc.itens.length - 2} outro(s) item(ns)...</p>
          )}

          {/* Delivery progress bar */}
          {totalItensCount > 0 && (
            <div className="pt-1.5">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span>Recebimento</span>
                <span>
                  {deliveredCount} de {totalItensCount} ({Math.round((deliveredCount / totalItensCount) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isAllDelivered ? 'bg-emerald-500' : isPartialDelivered ? 'bg-blue-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${(deliveredCount / totalItensCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">{dias} dias decorridos</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectSC(sc)}
              className="p-1.5 text-slate-500 hover:text-orange-600 rounded-md hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ver detalhes"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEditSC(sc)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Editar SC"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeleteSC(sc.id)}
                className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Excluir SC"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SCCardItem.displayName = 'SCCardItem';

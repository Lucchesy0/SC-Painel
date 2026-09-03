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
  MessageSquare,
} from 'lucide-react';
import { SC, RolePermissions } from '../types';
import { calcDays, formatDateBR } from '../utils/storage';
import { useSlaSettings, isSCDelayed, isSCDueSoon, calculateSCReminderInfo } from '../utils/sla';
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
    const slaSettings = useSlaSettings();
    const dias = calcDays(sc.data, sc.status);
    const reminder = calculateSCReminderInfo(sc, undefined, slaSettings);
    const isAtrasada = sc.status !== 'Concluído' && (reminder.urgency === 'atrasada' || isSCDelayed(sc, slaSettings));
    const isHoje = sc.status !== 'Concluído' && reminder.urgency === 'hoje';
    const isBreve =
      sc.status !== 'Concluído' && (reminder.urgency === 'breve' || isSCDueSoon(sc, slaSettings));

    const canEdit = permissions?.canEditSC ?? true;
    const canDelete = permissions?.canDeleteSC ?? true;

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
        className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col justify-between gap-2.5 sm:gap-3 relative ${
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
              className="font-black text-sm sm:text-base text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              {sc.numero}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[150px]">{sc.solicitante}</span>
            </div>
          </div>

          {/* Interactive Badge with Haptic feedback */}
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={!canEdit}
            title={
              !canEdit
                ? 'Somente Comprador ou Administrador podem alterar status'
                : sc.status === 'Concluído'
                ? 'Concluída! Toque para reabrir'
                : 'Toque para marcar como Concluída'
            }
            className={`group/card-status relative inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-150 ${
              canEdit ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-85'
            } select-none min-h-[28px] sm:min-h-[32px] focus:outline-hidden ${
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
                <Check className="w-3 h-3 text-white animate-checkmark-pop" />
                <span>Feito!</span>
              </>
            ) : sc.status === 'Concluído' ? (
              <>
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/card-status:hidden" />
                {canEdit && (
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700 dark:text-emerald-300 hidden group-hover/card-status:inline-block" />
                )}
                <span>Concluído</span>
              </>
            ) : isAtrasada ? (
              <>
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Atrasada ({dias}d)</span>
              </>
            ) : isHoje ? (
              <>
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                <span>Vence Hoje</span>
              </>
            ) : isBreve ? (
              <>
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600" />
                <span>{reminder.diasRestantes}d rest.</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-500" />
                <span>{dias}d aberto</span>
              </>
            )}
          </button>
        </div>

        {/* Summary of items */}
        <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-[#2c3343] text-xs space-y-1">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Itens ({sc.itens.length})</span>
            <span>{formatDateBR(sc.data)}</span>
          </div>
          {sc.itens.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs">
              <span className="truncate pr-2">{item.descricao}</span>
              <span className="font-mono text-slate-500 shrink-0 font-bold">
                {item.quantidadeSolicitada ?? item.quantidade ?? 1}{' '}
                {item.unidade || 'UN'}
              </span>
            </div>
          ))}
          {sc.itens.length > 2 && (
            <p className="text-[9px] sm:text-[10px] text-slate-400">+{sc.itens.length - 2} outro(s) item(ns)...</p>
          )}

          {/* Comment / Observações preview if present */}
          {(sc.observacoes || sc.comentarios) && (
            <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1 line-clamp-1 border-t border-slate-100 dark:border-slate-800/80">
              <MessageSquare className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
              <span className="truncate italic">{sc.observacoes || sc.comentarios}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">{dias} dias decorridos</span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onSelectSC(sc)}
              className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-slate-500 hover:text-orange-600 rounded-lg hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-90"
              title="Ver detalhes"
              aria-label={`Ver detalhes da SC ${sc.numero}`}
            >
              <Eye className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEditSC(sc)}
                className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-90"
                title="Editar SC"
                aria-label={`Editar SC ${sc.numero}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeleteSC(sc.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-90"
                title="Excluir SC"
                aria-label={`Excluir SC ${sc.numero}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SCCardItem.displayName = 'SCCardItem';

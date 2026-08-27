import React, { memo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  Eye,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Package,
} from 'lucide-react';
import { SC, GridConfig, RolePermissions } from '../types';
import { calcDays, formatDateBR } from '../utils/storage';
import { calculateSCReminderInfo } from '../services/notificationService';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';

interface SCRowItemProps {
  sc: SC;
  gridConfig: GridConfig;
  cellPadding: string;
  permissions?: RolePermissions;
  onSelectSC: (sc: SC) => void;
  onEditSC: (sc: SC) => void;
  onDeleteSC: (id: string) => void;
  onToggleStatus?: (sc: SC) => void;
  onMouseEnter?: (e: React.MouseEvent, sc: SC) => void;
  onMouseMove?: (e: React.MouseEvent, sc: SC) => void;
  onMouseLeave?: () => void;
}

export const SCRowItem: React.FC<SCRowItemProps> = memo(
  ({
    sc,
    gridConfig,
    cellPadding,
    permissions,
    onSelectSC,
    onEditSC,
    onDeleteSC,
    onToggleStatus,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
  }) => {
    const [isCompletingAnim, setIsCompletingAnim] = useState(false);
    const dias = calcDays(sc.data, sc.status);
    const reminder = calculateSCReminderInfo(sc);
    const isAtrasada = sc.status !== 'Concluído' && (reminder.urgency === 'atrasada' || dias > 7);
    const isHoje = sc.status !== 'Concluído' && reminder.urgency === 'hoje';
    const isBreve =
      sc.status !== 'Concluído' && (reminder.urgency === 'breve' || (dias >= 5 && dias <= 7));
    const hasImages = sc.itens.some((i) => !!i.imageUrl);

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
      <tr
        onMouseEnter={(e) => onMouseEnter?.(e, sc)}
        onMouseMove={(e) => onMouseMove?.(e, sc)}
        onMouseLeave={onMouseLeave}
        className={`animate-fade-in-row transition-all group cursor-default relative ${
          isCompletingAnim
            ? 'animate-completion-pulse bg-emerald-100/60 dark:bg-emerald-950/40'
            : isAtrasada
            ? 'bg-red-50/30 dark:bg-red-950/15 hover:bg-red-50/70 dark:hover:bg-red-950/30'
            : isHoje
            ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/40'
            : isBreve
            ? 'bg-orange-50/25 dark:bg-orange-950/15 hover:bg-orange-50/60 dark:hover:bg-orange-950/30'
            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
        }`}
      >
        {/* SC Number */}
        {gridConfig.visibleColumns.numero && (
          <td className={`${cellPadding} font-medium text-orange-600 dark:text-orange-400`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectSC(sc)}
                className="hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
              >
                {sc.numero}
                {hasImages && (
                  <ImageIcon
                    className="w-3.5 h-3.5 text-slate-400 hover:text-orange-500"
                    title="Contém fotos/links anexados"
                  />
                )}
              </button>

              {isAtrasada && (
                <span
                  title={reminder.mensagem}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/80 shadow-2xs shrink-0 animate-pulse"
                >
                  <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  ATRASADA
                </span>
              )}
              {isHoje && (
                <span
                  title="Solicitação com vencimento para hoje!"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 shadow-2xs shrink-0 animate-pulse"
                >
                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  VENCE HOJE
                </span>
              )}
              {isBreve && !isHoje && (
                <span
                  title={reminder.mensagem}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-700/80 shadow-2xs shrink-0"
                >
                  <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  VENCE {reminder.diasRestantes}D
                </span>
              )}
            </div>
          </td>
        )}

        {/* Date */}
        {gridConfig.visibleColumns.data && (
          <td className={`${cellPadding} text-slate-600 dark:text-slate-300 font-medium`}>
            <div className="flex flex-col">
              <span>{formatDateBR(sc.data)}</span>
              {sc.status !== 'Concluído' && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  Limite: {formatDateBR(reminder.dataVencimentoEfetiva)}
                </span>
              )}
            </div>
          </td>
        )}

        {/* Solicitante */}
        {gridConfig.visibleColumns.solicitante && (
          <td className={`${cellPadding} text-slate-700 dark:text-slate-200 font-medium`}>
            {sc.solicitante}
          </td>
        )}

        {/* Status Badge */}
        {gridConfig.visibleColumns.status && (
          <td className={cellPadding}>
            <button
              type="button"
              onClick={handleStatusToggle}
              disabled={!canEdit}
              title={
                !canEdit
                  ? 'Somente Comprador ou Almoxarifado podem alterar status'
                  : sc.status === 'Concluído'
                  ? 'Concluída! Clique para reabrir'
                  : 'Clique para concluir a solicitação'
              }
              className={`group/status relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                canEdit ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-85'
              } select-none focus:outline-hidden ${
                isCompletingAnim
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : sc.status === 'Concluído'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : isAtrasada
                  ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 hover:bg-red-500/25 dark:bg-red-950/60 shadow-2xs'
                  : isHoje
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 dark:bg-amber-950/60 shadow-2xs'
                  : isBreve
                  ? 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 dark:bg-orange-950/60 shadow-2xs'
                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 hover:bg-sky-500/20'
              }`}
            >
              {isCompletingAnim ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white animate-checkmark-pop" />
                  <span>Concluindo!</span>
                </>
              ) : sc.status === 'Concluído' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/status:hidden" />
                  {canEdit && (
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 hidden group-hover/status:inline-block" />
                  )}
                  <span>Concluído</span>
                </>
              ) : isAtrasada ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 animate-pulse group-hover/status:hidden" />
                  {canEdit && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden group-hover/status:inline-block" />
                  )}
                  <span>Atrasada ({dias}d)</span>
                </>
              ) : isHoje ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover/status:hidden" />
                  {canEdit && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden group-hover/status:inline-block" />
                  )}
                  <span>Vence Hoje</span>
                </>
              ) : isBreve ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 group-hover/status:hidden" />
                  {canEdit && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden group-hover/status:inline-block" />
                  )}
                  <span>{reminder.diasRestantes}d rest.</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-sky-500 group-hover/status:hidden" />
                  {canEdit && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden group-hover/status:inline-block" />
                  )}
                  <span>Em andamento</span>
                </>
              )}
            </button>
          </td>
        )}

        {/* Items count & delivery progress */}
        {gridConfig.visibleColumns.itens && (
          <td className={`${cellPadding} text-slate-600 dark:text-slate-400 font-medium`}>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {totalItensCount} item(ns)
              </span>
              {totalItensCount > 0 && (
                <span
                  title={`${deliveredCount} de ${totalItensCount} itens entregues no almoxarifado`}
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-sm ${
                    isAllDelivered
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : isPartialDelivered
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {deliveredCount}/{totalItensCount}
                </span>
              )}
            </div>
          </td>
        )}

        {/* Days */}
        {gridConfig.visibleColumns.dias && (
          <td className={`${cellPadding} font-medium`}>
            {sc.status === 'Concluído' ? (
              <span className="text-slate-400 dark:text-slate-500">-</span>
            ) : isAtrasada ? (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold">
                <span>{dias} dias</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
              </div>
            ) : isHoje || isBreve ? (
              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
                <span>{dias} dias</span>
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              </div>
            ) : (
              <span className="text-slate-600 dark:text-slate-400">{dias} dias</span>
            )}
          </td>
        )}

        {/* Prioridade */}
        {gridConfig.visibleColumns.prioridade && (
          <td className={cellPadding}>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                sc.prioridade === 'Urgente'
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                  : sc.prioridade === 'Alta'
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {sc.prioridade || 'Média'}
            </span>
          </td>
        )}

        {/* Actions */}
        <td className={`${cellPadding} text-right`}>
          <div className="flex items-center justify-end gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onSelectSC(sc)}
              className="p-1.5 rounded-md text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ver detalhes e dar entrada em itens"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEditSC(sc)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Editar SC"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeleteSC(sc.id)}
                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Excluir SC"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }
);

SCRowItem.displayName = 'SCRowItem';

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
import { useSlaSettings, isSCDelayed, isSCDueSoon, isSCCriticalOverdue, calculateSCReminderInfo } from '../utils/sla';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';

interface SCRowItemProps {
  sc: SC;
  gridConfig: GridConfig;
  cellPadding: string;
  permissions?: RolePermissions;
  isSelected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  onSelectSC: (sc: SC) => void;
  onEditSC: (sc: SC) => void;
  onDeleteSC: (id: string) => void;
  onToggleStatus?: (sc: SC) => void;
  onMouseEnter?: (e: React.MouseEvent, sc: SC) => void;
  onMouseMove?: (e: React.MouseEvent, sc: SC) => void;
  onMouseLeave?: () => void;
}

const areSCRowPropsEqual = (prev: SCRowItemProps, next: SCRowItemProps): boolean => {
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.sc !== next.sc) {
    if (
      prev.sc.id !== next.sc.id ||
      prev.sc.numero !== next.sc.numero ||
      prev.sc.status !== next.sc.status ||
      prev.sc.data !== next.sc.data ||
      prev.sc.solicitante !== next.sc.solicitante ||
      prev.sc.observacoes !== next.sc.observacoes ||
      prev.sc.prioridade !== next.sc.prioridade ||
      prev.sc.dataVencimento !== next.sc.dataVencimento ||
      prev.sc.itens !== next.sc.itens ||
      prev.sc.comentarios !== next.sc.comentarios
    ) {
      return false;
    }
  }

  if (prev.cellPadding !== next.cellPadding) return false;
  if (prev.permissions !== next.permissions) return false;

  if (prev.gridConfig !== next.gridConfig) {
    if (prev.gridConfig.density !== next.gridConfig.density) return false;
    const pCols = prev.gridConfig.visibleColumns;
    const nCols = next.gridConfig.visibleColumns;
    if (
      pCols.numero !== nCols.numero ||
      pCols.data !== nCols.data ||
      pCols.solicitante !== nCols.solicitante ||
      pCols.status !== nCols.status ||
      pCols.itens !== nCols.itens ||
      pCols.dias !== nCols.dias ||
      pCols.prioridade !== nCols.prioridade
    ) {
      return false;
    }
  }

  return (
    prev.onSelectSC === next.onSelectSC &&
    prev.onEditSC === next.onEditSC &&
    prev.onDeleteSC === next.onDeleteSC &&
    prev.onToggleStatus === next.onToggleStatus &&
    prev.onMouseMove === next.onMouseMove &&
    prev.onMouseLeave === next.onMouseLeave
  );
};

const SCRowItemComponent: React.FC<SCRowItemProps> = ({
  sc,
  gridConfig,
  cellPadding,
  permissions,
  isSelected = false,
  onToggleSelect,
  onSelectSC,
  onEditSC,
  onDeleteSC,
  onToggleStatus,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}) => {
    const [isCompletingAnim, setIsCompletingAnim] = useState(false);
    const slaSettings = useSlaSettings();
    const dias = calcDays(sc.data, sc.status);
    const reminder = calculateSCReminderInfo(sc, undefined, slaSettings);
    const isAtrasada = sc.status !== 'Concluído' && (reminder.urgency === 'atrasada' || isSCDelayed(sc, slaSettings));
    const isHoje = sc.status !== 'Concluído' && reminder.urgency === 'hoje';
    const isBreve =
      sc.status !== 'Concluído' && (reminder.urgency === 'breve' || isSCDueSoon(sc, slaSettings));
    const hasImages = sc.itens.some((i) => !!i.imageUrl);

    const canEdit = permissions?.canEditSC ?? true;
    const canDelete = permissions?.canDeleteSC ?? true;

    const totalItensCount = sc.itens.length;

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
          isSelected
            ? 'bg-orange-50/80 dark:bg-orange-950/35 ring-1 ring-inset ring-orange-400/40'
            : isCompletingAnim
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
        {/* Selection Checkbox */}
        <td className="w-10 px-3 py-2 text-center select-none" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect?.(sc.id, e as unknown as React.MouseEvent)}
            aria-label={`Selecionar SC ${sc.numero}`}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500/30 cursor-pointer accent-orange-600 transition-transform active:scale-90"
          />
        </td>

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
                  <span title="Contém fotos/links anexados">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400 hover:text-orange-500" />
                  </span>
                )}
              </button>
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
                  ? 'Sem permissão para alterar o status'
                  : sc.status === 'Concluído'
                  ? 'Concluída! Clique para reabrir'
                  : 'Clique para concluir a solicitação'
              }
              className={`group/status relative inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border transition-colors ${
                canEdit ? 'cursor-pointer' : 'cursor-default'
              } select-none focus:outline-hidden ${
                sc.status === 'Concluído'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                  : isAtrasada
                  ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 hover:bg-red-100'
                  : isHoje
                  ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
                  : isBreve
                  ? 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800 hover:bg-orange-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              {isCompletingAnim ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Concluído</span>
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
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 group-hover/status:hidden" />
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
                  <Clock className="w-3.5 h-3.5 text-slate-500 group-hover/status:hidden" />
                  {canEdit && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden group-hover/status:inline-block" />
                  )}
                  <span>Em andamento</span>
                </>
              )}
            </button>
          </td>
        )}

        {/* Items count */}
        {gridConfig.visibleColumns.itens && (
          <td className={`${cellPadding} text-slate-600 dark:text-slate-400 font-medium`}>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalItensCount} item(ns)
            </span>
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
              </div>
            ) : isHoje || isBreve ? (
              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
                <span>{dias} dias</span>
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
  };

export const SCRowItem = memo(SCRowItemComponent, areSCRowPropsEqual);

SCRowItem.displayName = 'SCRowItem';

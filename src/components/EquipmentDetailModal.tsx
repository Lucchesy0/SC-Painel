import React, { useState } from 'react';
import {
  X,
  MapPin,
  Edit,
  Trash2,
  CheckCircle2,
  Ban,
  Wrench,
  Boxes,
  Tag,
  CopyPlus,
} from 'lucide-react';
import { Equipment, EquipmentStatus } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { triggerHaptic } from '../utils/haptics';

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  onClose: () => void;
  onEdit: (eq: Equipment) => void;
  onDelete: (id: string) => void;
  onSaveUpdated?: (eq: Equipment) => void;
  onDuplicate?: (eq: Equipment) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  equipment,
  onClose,
  onEdit,
  onDelete,
  onSaveUpdated,
  onDuplicate,
  onToast,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!equipment) return null;

  const getStatusBadge = (status: EquipmentStatus) => {
    if (status === 'Ativado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" /> Ativado
        </span>
      );
    }
    if (status === 'Manutenção') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
          <Wrench className="w-3.5 h-3.5" /> Manutenção
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
        <Ban className="w-3.5 h-3.5" /> Desativado
      </span>
    );
  };

  const handleToggleStatus = () => {
    if (!onSaveUpdated) return;
    const nextStatus: EquipmentStatus =
      equipment.status === 'Ativado'
        ? 'Manutenção'
        : equipment.status === 'Manutenção'
        ? 'Desativado'
        : 'Ativado';

    const updated: Equipment = {
      ...equipment,
      status: nextStatus,
    };
    triggerHaptic('medium');
    onSaveUpdated(updated);
    if (onToast) onToast(`Status de ${equipment.codigoPatrimonio} alterado para ${nextStatus}!`, 'info');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-600 text-white font-mono font-black text-xs sm:text-sm shadow-md shrink-0">
                {equipment.codigoPatrimonio || 'AF'}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {equipment.nome}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleToggleStatus}
                    title="Clique para alternar o status do equipamento"
                    className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  >
                    {getStatusBadge(equipment.status)}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Details Body */}
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            {/* Grid of Key Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* AF */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-500" />
                  Código AF
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  {equipment.codigoPatrimonio || '-'}
                </span>
              </div>

              {/* Status */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Status Operacional
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {equipment.status}
                </span>
              </div>

              {/* Categoria */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  <Boxes className="w-3 h-3 text-indigo-500" />
                  Categoria
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {equipment.categoria || '-'}
                </span>
              </div>

              {/* Localização */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500" />
                  Localização
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {equipment.localizacao || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeleting(true)}
                className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[38px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>

              {onDuplicate && (
                <button
                  onClick={() => {
                    onDuplicate(equipment);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[38px]"
                  title="Duplicar este equipamento para cadastrar outro similar com AF em branco"
                >
                  <CopyPlus className="w-4 h-4 text-blue-500" />
                  <span>Duplicar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-xs font-semibold cursor-pointer transition-colors min-h-[38px]"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  onEdit(equipment);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all min-h-[38px]"
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isDeleting}
        title="Excluir Equipamento"
        message={`Tem certeza que deseja remover o equipamento "${equipment.nome}" (${equipment.codigoPatrimonio})? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          onDelete(equipment.id);
          setIsDeleting(false);
          onClose();
        }}
        onCancel={() => setIsDeleting(false)}
      />
    </>
  );
};

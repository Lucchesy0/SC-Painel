import React from 'react';
import { X, Users, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { UserManagementTab } from './UserManagementTab';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: UserProfile[];
  currentUser?: UserProfile;
  onRefreshUsers?: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users = [],
  currentUser = { id: 'usr-admin', nome: 'Admin', email: 'admin@mcm.com.br', role: 'admin', departamento: 'TI' },
  onRefreshUsers = () => {},
  onToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header Claro, Limpo e Específico para Usuários e Permissões */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                Usuários e Permissões
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle de colaboradores, cargos, senhas de acesso e permissões por módulo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
              <span>Sessão:</span>
              <strong className="text-slate-900 font-medium">{currentUser.nome}</strong>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar janela de usuários"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Modal - Conteúdo de Gestão de Usuários */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-slate-800">
          <UserManagementTab
            users={users}
            currentUser={currentUser}
            onRefreshUsers={onRefreshUsers}
            onToast={onToast}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
            <span>Total de {users.length} usuário(s) cadastrado(s)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

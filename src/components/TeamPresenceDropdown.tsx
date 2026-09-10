import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Users,
  ChevronDown,
  X,
  Search,
  Clock,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import {
  getUserCargo,
  getUserPermissions,
  isUserOnline,
  getUserActivityInfo,
} from '../services/authService';
import { triggerHaptic } from '../utils/haptics';

interface TeamPresenceDropdownProps {
  users?: UserProfile[];
  currentUser: UserProfile;
  onOpenAdminUsers?: () => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  className?: string;
}

export const TeamPresenceDropdown: React.FC<TeamPresenceDropdownProps> = ({
  users = [],
  currentUser,
  onOpenAdminUsers,
  className = 'hidden sm:block',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou com a tecla ESC, e escuta evento de abertura externa
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    function handleOpenEvent() {
      setIsOpen(true);
      setSearchTerm('');
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-team-dropdown', handleOpenEvent);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-team-dropdown', handleOpenEvent);
    };
  }, [isOpen]);

  // Contagem de usuários online e offline
  const { onlineCount, offlineCount } = useMemo(() => {
    let online = 0;
    users.forEach((u) => {
      if (isUserOnline(u, currentUser)) {
        online++;
      }
    });
    return {
      onlineCount: online,
      offlineCount: Math.max(0, users.length - online),
    };
  }, [users, currentUser]);

  // Filtro de usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isOnline = isUserOnline(u, currentUser);
      if (statusFilter === 'online' && !isOnline) return false;
      if (statusFilter === 'offline' && isOnline) return false;

      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      const cargo = getUserCargo(u).toLowerCase();
      const depto = (u.departamento || '').toLowerCase();
      const nome = u.nome.toLowerCase();
      const email = u.email.toLowerCase();

      return (
        nome.includes(term) ||
        email.includes(term) ||
        cargo.includes(term) ||
        depto.includes(term)
      );
    });
  }, [users, currentUser, statusFilter, searchTerm]);

  const perms = getUserPermissions(currentUser);

  const toggleDropdown = () => {
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative shrink-0 ${className}`} ref={dropdownRef}>
      {/* Botão Gatilho no Header */}
      <button
        type="button"
        id="btnHeaderEquipeDropdown"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Visualizar Equipe (${onlineCount} online)`}
        title={`Equipe MCM: ${onlineCount} online de ${users.length || 1} membros`}
        className={`flex items-center gap-1.5 h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg border transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group font-medium text-xs ${
          isOpen
            ? 'bg-orange-50 border-orange-300 text-orange-600 dark:bg-orange-950/40 dark:border-orange-700/80 dark:text-orange-400 ring-2 ring-orange-500/20'
            : 'border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1a202c] text-slate-700 dark:text-slate-300 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600'
        }`}
      >
        <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-500 transition-colors" />
        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-orange-600">
          Equipe
        </span>

        {/* Badge com indicador pulsante */}
        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{onlineCount}</span>
        </span>

        <ChevronDown
          className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-orange-600' : ''
          }`}
        />
      </button>

      {/* Popover Compacto Sofisticado que abre embaixo */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1.5 w-76 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-xl bg-white dark:bg-[#1a202c] border border-slate-200/90 dark:border-slate-700/80 shadow-xl z-50 overflow-hidden font-sans"
          >
            {/* Header Compacto */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Equipe MCM
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      {onlineCount} Online
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Status e última atividade
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Controles: Abas em pílula + Campo de busca */}
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              {/* Abas compactas */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span>Todos</span>
                  <span className="text-[9px] px-1 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                    {users.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('online')}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statusFilter === 'online'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Online</span>
                  <span
                    className={`text-[9px] px-1 rounded-full ${
                      statusFilter === 'online'
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {onlineCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('offline')}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    statusFilter === 'offline'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>Offline</span>
                  <span
                    className={`text-[9px] px-1 rounded-full ${
                      statusFilter === 'offline'
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {offlineCount}
                  </span>
                </button>
              </div>

              {/* Campo de busca compacto */}
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-6 py-1.2 text-[11px] bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista com scroll suave e itens elegantes */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <p>Nenhum colaborador encontrado</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isOnline = isUserOnline(user, currentUser);
                  const activity = getUserActivityInfo(user, currentUser);
                  const cargo = getUserCargo(user);
                  const isMe = currentUser.id === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg transition-colors ${
                        isMe
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                      title={activity.tooltipText}
                    >
                      {/* Avatar e Informações */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg ${
                            user.avatarColor || 'bg-slate-700'
                          } text-white flex items-center justify-center font-bold text-[11px] shrink-0 relative`}
                        >
                          {user.nome.charAt(0).toUpperCase()}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {user.nome}
                            </span>
                            {isMe && (
                              <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold shrink-0">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {cargo} {user.departamento ? `• ${user.departamento}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Status à direita */}
                      <div className="text-right shrink-0">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[9px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online</span>
                          </span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                              Offline
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>{activity.relativeTime}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé Compacto */}
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-500" />
                <span>Atualizado em tempo real</span>
              </div>

              {perms.canManageUsers && onOpenAdminUsers && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdminUsers();
                  }}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 font-semibold cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Gerenciar</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

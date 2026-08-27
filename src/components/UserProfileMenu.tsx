import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  ChevronDown,
  Check,
  Truck,
  ShoppingCart,
  BarChart2,
  Sparkles,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Lock,
  Unlock,
  KeyRound,
  UserPlus,
  Users,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserRole, CloudSyncStatus } from '../types';
import {
  DEFAULT_USERS,
  getRoleLabel,
  getRoleBadgeClass,
  getRolePermissions,
} from '../services/authService';

interface UserProfileMenuProps {
  currentUser: UserProfile;
  users?: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onOpenAdminUsers?: () => void;
  onLogout?: () => void;
  cloudStatus?: CloudSyncStatus;
  lastSyncTime?: string;
  onRefreshCloud?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  users = DEFAULT_USERS,
  onSelectUser,
  onOpenAdminUsers,
  onLogout,
  cloudStatus = 'connected',
  lastSyncTime,
  onRefreshCloud,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeStyle = getRoleBadgeClass(currentUser.role);
  const permissions = getRolePermissions(currentUser.role);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return ShieldCheck;
      case 'usuario':
        return Users;
      case 'comprador':
        return ShoppingCart;
      case 'almoxarifado':
        return Truck;
      case 'gestor':
        return BarChart2;
      default:
        return User;
    }
  };

  const activeUsers = users && users.length > 0 ? users : DEFAULT_USERS;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btnUserProfileTrigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Perfil de Usuário e Nível de Acesso"
        title={`Usuário: ${currentUser.nome} (${getRoleLabel(currentUser.role)})`}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100/90 dark:bg-[#1c2230]/90 border border-slate-200/90 dark:border-slate-700/80 hover:border-orange-500/50 hover:bg-slate-200/50 dark:hover:bg-[#252c3e] transition-all cursor-pointer shadow-2xs group active:scale-95"
      >
        {/* User Avatar Circle */}
        <div
          className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg ${
            currentUser.avatarColor || 'bg-orange-600'
          } text-white flex items-center justify-center font-bold text-xs shadow-xs relative`}
        >
          {currentUser.nome.charAt(0)}
          {/* Cloud Live Dot */}
          <span
            title={cloudStatus === 'connected' ? 'Nuvem Firebase Conectada' : 'Sincronizando'}
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1c2230] ${
              cloudStatus === 'connected'
                ? 'bg-emerald-500'
                : cloudStatus === 'syncing'
                ? 'bg-amber-500 animate-ping'
                : 'bg-red-500'
            }`}
          />
        </div>

        {/* User Info & Role (Desktop) */}
        <div className="hidden md:flex flex-col text-left leading-tight min-w-0 max-w-[120px]">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {currentUser.nome}
          </span>
          <span
            className={`text-[9px] font-extrabold uppercase tracking-wider ${
              currentUser.role === 'admin'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}
          >
            {currentUser.role === 'admin' ? 'ADMINISTRADOR' : getRoleLabel(currentUser.role)}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-[#181e2b] border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 overflow-hidden font-sans"
          >
            {/* Header: Active Profile */}
            <div className="p-4 bg-linear-to-b from-slate-50 to-white dark:from-[#1c2230] dark:to-[#181e2b] border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl ${
                      currentUser.avatarColor || 'bg-orange-600'
                    } text-white flex items-center justify-center font-black text-base shadow-sm shrink-0`}
                  >
                    {currentUser.nome.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {currentUser.nome}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase rounded-lg border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                      >
                        {currentUser.role === 'admin' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <Users className="w-3 h-3" />
                        )}
                        {getRoleLabel(currentUser.role)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {currentUser.departamento}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Health Mini Banner */}
              <div className="mt-3 p-2 rounded-xl bg-slate-100/80 dark:bg-[#131722]/80 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Cloud
                    className={`w-3.5 h-3.5 ${
                      cloudStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  />
                  <span className="font-semibold">Nuvem Firestore:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {cloudStatus === 'connected' ? 'Conectado' : 'Sincronizando'}
                  </span>
                </div>
                {lastSyncTime && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {lastSyncTime}
                  </span>
                )}
              </div>
            </div>

            {/* Role Capabilities Overview */}
            <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-[#151a26]/50 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                ⚡ Permissões do Perfil:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div
                  className={`flex items-center gap-1 ${
                    permissions.canCreateSC
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400 line-through'
                  }`}
                >
                  <span>{permissions.canCreateSC ? '✓' : '✕'}</span> Criar / Editar SCs
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    permissions.canReceiveItems
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400 line-through'
                  }`}
                >
                  <span>{permissions.canReceiveItems ? '✓' : '✕'}</span> Recebimento Almox
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    permissions.canManageEquipments
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400 line-through'
                  }`}
                >
                  <span>{permissions.canManageEquipments ? '✓' : '✕'}</span> Inventário TI
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    permissions.canAccessSettings
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400 line-through'
                  }`}
                >
                  <span>{permissions.canAccessSettings ? '✓' : '✕'}</span> Painel Admin
                </div>
              </div>
            </div>

            {/* Team Members List (If more than 1 user) */}
            {activeUsers.length > 1 && (
              <div className="p-2 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Alternar Usuário ({activeUsers.length})
                  </p>
                  {currentUser.role === 'admin' && onOpenAdminUsers && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAdminUsers();
                      }}
                      className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Users className="w-3 h-3" />
                      Gerenciar
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {activeUsers.map((user) => {
                    const isSelected = currentUser.id === user.id;
                    const UserIcon = getRoleIcon(user.role);
                    const userBadge = getRoleBadgeClass(user.role);
                    const hasPassword = Boolean(user.password && user.password.trim().length > 0);

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(user);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold border border-orange-500/30'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg ${
                              user.avatarColor || 'bg-slate-600'
                            } text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                          >
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{user.nome}</span>
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-bold rounded-sm border ${userBadge.bg} ${userBadge.text} ${userBadge.border}`}
                              >
                                {user.role === 'admin' ? 'ADMIN' : user.role}
                              </span>
                              {hasPassword && (
                                <span title="Protegido por senha" className="text-slate-400">
                                  <Lock className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {user.departamento}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Admin User Management Shortcut (Luchesy Admin Only) */}
            {currentUser.role === 'admin' && onOpenAdminUsers && (
              <div className="p-2 bg-slate-50 dark:bg-[#131722] border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdminUsers();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-orange-600/10 hover:bg-orange-600/20 text-orange-600 dark:text-orange-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-orange-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar & Gerenciar Usuários</span>
                </button>
              </div>
            )}

            {/* Logout / Exit button */}
            {onLogout && (
              <div className="p-2 bg-slate-50/80 dark:bg-[#11151f] border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Encerrar Sessão / Trocar Usuário</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

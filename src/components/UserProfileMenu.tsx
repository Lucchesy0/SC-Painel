import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  Users,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, CloudSyncStatus } from '../types';
import { getUserCargo, getUserPermissions } from '../services/authService';
import { triggerHaptic } from '../utils/haptics';

interface UserProfileMenuProps {
  currentUser: UserProfile;
  onOpenEditProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenAdminUsers?: () => void;
  onOpenAdminOverview?: () => void;
  onOpenTeamModal?: () => void;
  onLogout?: () => void;
  cloudStatus?: CloudSyncStatus;
  lastSyncTime?: string;
  onRefreshCloud?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  onOpenEditProfile,
  onOpenSettings,
  onOpenAdminUsers,
  onOpenAdminOverview,
  onOpenTeamModal,
  onLogout,
  cloudStatus = 'connected',
  lastSyncTime,
  onRefreshCloud,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const perms = getUserPermissions(currentUser);
  const userSetor = currentUser.departamento || (currentUser.role === 'admin' ? 'Administrador' : 'Colaborador');

  return (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btnUserProfileTrigger"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menu do perfil do usuário"
        title={`Perfil: ${currentUser.nome} (${userSetor})`}
        className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1a202c] hover:bg-slate-100 dark:hover:bg-[#222938] hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer text-left group shadow-xs active:scale-95 shrink-0"
      >
        <div className="relative shrink-0 flex items-center justify-center">
          <div
            className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg ${
              currentUser?.avatarColor || 'bg-slate-700'
            } text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
          >
            {(currentUser?.nome || 'U').charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 translate-x-1/4 translate-y-1/4 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              cloudStatus === 'connected'
                ? 'bg-emerald-500'
                : cloudStatus === 'syncing'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
            title={cloudStatus === 'offline' ? 'Offline' : 'Online'}
          />
        </div>

        <div className="hidden md:flex flex-col text-left leading-tight max-w-[130px]">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {currentUser?.nome || 'Usuário'}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {userSetor}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
          }`}
        />
      </button>

      {/* Mobile Backdrop when Dropdown is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-2xs z-40 sm:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="fixed sm:absolute top-[52px] sm:top-full right-2 sm:right-0 mt-1 sm:mt-1.5 w-72 max-w-[calc(100vw-1rem)] rounded-xl bg-white dark:bg-[#1a202c] border border-slate-200/90 dark:border-slate-700/80 shadow-2xl z-50 overflow-hidden font-sans ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Header Info */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0 flex items-center justify-center">
                  <div
                    className={`w-9 h-9 rounded-lg ${
                      currentUser?.avatarColor || 'bg-slate-700'
                    } text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs`}
                  >
                    {(currentUser?.nome || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 translate-x-1/4 translate-y-1/4 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                      cloudStatus === 'connected'
                        ? 'bg-emerald-500'
                        : cloudStatus === 'syncing'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-500'
                    }`}
                    title={cloudStatus === 'offline' ? 'Offline' : 'Online'}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser?.nome || 'Usuário'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser.email || 'Sem e-mail cadastrado'}
                  </p>
                </div>
              </div>

              {/* Badges & Sync Line */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {userSetor}
                  </span>
                  {currentUser.role === 'admin' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Admin
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{cloudStatus === 'connected' ? 'Online' : 'Sincronizando'}</span>
                  {onRefreshCloud && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        onRefreshCloud();
                      }}
                      title={lastSyncTime ? `Última sincronização: ${lastSyncTime}` : 'Sincronizar'}
                      className="p-0.5 hover:text-slate-700 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="p-1 space-y-0.5">
              {onOpenEditProfile && (
                <button
                  type="button"
                  id="btnMenuEditProfile"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsOpen(false);
                    onOpenEditProfile();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Meu Perfil</span>
                </button>
              )}

              {perms.canAccessAdmin && onOpenSettings && (
                <button
                  type="button"
                  id="btnMenuSettings"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-500" />
                  <span>Configurações</span>
                </button>
              )}

              {perms.canAccessAdmin && onOpenAdminOverview && (
                <button
                  type="button"
                  id="btnMenuAdminOverview"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsOpen(false);
                    onOpenAdminOverview();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>Painel Administrativo</span>
                </button>
              )}

              {perms.canManageUsers && onOpenAdminUsers && (
                <button
                  type="button"
                  id="btnMenuAdminUsers"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsOpen(false);
                    onOpenAdminUsers();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Usuários e Permissões</span>
                </button>
              )}

              {onOpenTeamModal && (
                <button
                  type="button"
                  id="btnMenuTeamModal"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsOpen(false);
                    onOpenTeamModal();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span>Equipe & Presença</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Ver</span>
                  </span>
                </button>
              )}
            </div>

            {/* Logout */}
            {onLogout && (
              <div className="p-1 border-t border-slate-100">
                <button
                  type="button"
                  id="btnMenuLogout"
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sair da conta</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

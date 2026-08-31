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

  const perms = getUserPermissions(currentUser);
  const userCargo = getUserCargo(currentUser);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btnUserProfileTrigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu do usuário"
        className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-9.5 px-2 sm:px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer text-left group shadow-xs active:scale-95 shrink-0"
      >
        <div
          className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg ${
            currentUser.avatarColor || 'bg-slate-700'
          } text-white flex items-center justify-center font-bold text-xs shrink-0 relative`}
        >
          {currentUser.nome.charAt(0).toUpperCase()}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${
              cloudStatus === 'connected'
                ? 'bg-emerald-500'
                : cloudStatus === 'syncing'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
        </div>

        <div className="hidden md:flex flex-col text-left leading-tight max-w-[130px]">
          <span className="text-xs font-semibold text-slate-800 truncate">
            {currentUser.nome}
          </span>
          <span className="text-[10px] text-slate-500 truncate">
            {userCargo}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden font-sans"
          >
            {/* Header Info */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg ${
                    currentUser.avatarColor || 'bg-slate-700'
                  } text-white flex items-center justify-center font-bold text-sm shrink-0`}
                >
                  {currentUser.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser.nome}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser.email || 'Sem e-mail cadastrado'}
                  </p>
                </div>
              </div>

              {/* Badges & Sync Line */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-700">
                    {userCargo}
                  </span>
                  {currentUser.departamento && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                      {currentUser.departamento}
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

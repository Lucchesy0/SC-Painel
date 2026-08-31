import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Boxes,
  Plus,
  FileSpreadsheet,
  Search,
  Keyboard,
  Bell,
  RotateCw,
  Shield,
  Download,
  Settings as SettingsIcon,
  Users,
  LogOut,
  User,
  AlertCircle,
} from 'lucide-react';
import { ActiveNavTab, ThemeMode, UserProfile } from '../types';
import { MCMLogo } from './MCMLogo';
import { triggerHaptic } from '../utils/haptics';
import { getUserCargo, getUserPermissions } from '../services/authService';

interface AppDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeNavTab: ActiveNavTab;
  onNavTabChange: (tab: ActiveNavTab) => void;
  scCount: number;
  delayedCount: number;
  equipmentCount: number;
  urgentNotificationsCount: number;
  theme?: ThemeMode;
  currentUser?: UserProfile;
  lastSyncTime?: string;
  isRefreshing?: boolean;
  onRefreshLive?: () => void;
  onOpenAddSC?: () => void;
  onOpenAddEquipment?: () => void;
  onOpenRMImport?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenEditProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin: () => void;
  onOpenAdminUsers?: () => void;
  onLogout?: () => void;
  onOpenShortcuts?: () => void;
  onFilterDelayed?: () => void;
  onFilterMaintenance?: () => void;
  onExportAllCSV?: () => void;
}

export const AppDrawerMenu: React.FC<AppDrawerMenuProps> = ({
  isOpen,
  onClose,
  activeNavTab,
  onNavTabChange,
  scCount,
  delayedCount,
  equipmentCount,
  urgentNotificationsCount,
  currentUser,
  lastSyncTime,
  isRefreshing = false,
  onRefreshLive,
  onOpenAddSC,
  onOpenAddEquipment,
  onOpenRMImport,
  onOpenGlobalSearch,
  onOpenNotifications,
  onOpenEditProfile,
  onOpenSettings,
  onOpenAdmin,
  onOpenAdminUsers,
  onLogout,
  onOpenShortcuts,
  onFilterDelayed,
  onExportAllCSV,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelectTab = (tab: ActiveNavTab) => {
    triggerHaptic('light');
    onNavTabChange(tab);
    onClose();
  };

  const perms = getUserPermissions(currentUser);
  const userCargo = getUserCargo(currentUser);

  const navItems = [
    {
      id: 'solicitacoes' as ActiveNavTab,
      label: 'Solicitações (SCs)',
      module: 'sc',
      icon: ShoppingCart,
      badge: scCount > 0 ? `${scCount}` : null,
      badgeType: 'neutral',
    },
    {
      id: 'indicadores' as ActiveNavTab,
      label: 'Indicadores & KPIs',
      module: 'sc',
      icon: LayoutDashboard,
      badge: delayedCount > 0 ? `${delayedCount} atrasada${delayedCount > 1 ? 's' : ''}` : 'Em dia',
      badgeType: delayedCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'graficos' as ActiveNavTab,
      label: 'Gráficos & Análises',
      module: 'sc',
      icon: BarChart3,
      badge: null,
      badgeType: 'neutral',
    },
    {
      id: 'inventario' as ActiveNavTab,
      label: 'Inventário de TI',
      module: 'inventario',
      icon: Boxes,
      badge: equipmentCount > 0 ? `${equipmentCount}` : null,
      badgeType: 'neutral',
    },
  ].filter((item) => {
    if (item.module === 'sc' && !perms.canAccessSC) return false;
    if (item.module === 'inventario' && !perms.canAccessInventario) return false;
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-[320px] bg-white border-r border-slate-200 shadow-xl flex flex-col h-full z-10 select-none overflow-hidden"
          >
            {/* Top Bar */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <MCMLogo className="h-6" variant="full" />
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar menu"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-slate-700 custom-scrollbar">
              {/* User Bar */}
              {currentUser && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg ${
                        currentUser.avatarColor || 'bg-slate-700'
                      } text-white flex items-center justify-center font-bold text-xs shrink-0`}
                    >
                      {currentUser.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 truncate">
                      <span className="text-xs font-bold text-slate-800 block truncate leading-snug">
                        {currentUser.nome}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block leading-none">
                        {userCargo}
                      </span>
                    </div>
                  </div>

                  {onRefreshLive && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onRefreshLive();
                      }}
                      disabled={isRefreshing}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title={lastSyncTime ? `Última sincronização: ${lastSyncTime}` : 'Sincronizar dados'}
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`}
                      />
                    </button>
                  )}
                </div>
              )}

              {/* Navigation Menu */}
              <div>
                <span className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Navegação
                </span>
                <nav className="space-y-0.5">
                  {navItems.map((item) => {
                    const isActive = activeNavTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between text-xs ${
                          isActive
                            ? 'bg-orange-50 text-orange-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 ${
                              isActive ? 'text-orange-600' : 'text-slate-500'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              item.badgeType === 'warning'
                                ? 'bg-rose-100 text-rose-700'
                                : item.badgeType === 'success'
                                ? 'bg-emerald-100 text-emerald-700'
                                : isActive
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Actions */}
              <div>
                <span className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Ações Rápidas
                </span>
                <div className="space-y-0.5">
                  {onOpenAddSC && perms.canCreateSC && (
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onOpenAddSC();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-orange-700 hover:bg-orange-50 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <Plus className="w-4 h-4 text-orange-600 stroke-[2.5]" />
                      <span>Nova Solicitação (SC)</span>
                    </button>
                  )}

                  {onOpenAddEquipment && perms.canManageEquipments && (
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onOpenAddEquipment();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <Plus className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                      <span>Novo Ativo de TI</span>
                    </button>
                  )}

                  {onOpenRMImport && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenRMImport();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                      <span>Importar Planilha RM</span>
                    </button>
                  )}

                  {onOpenGlobalSearch && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onClose();
                        setTimeout(() => {
                          onOpenGlobalSearch();
                        }, 120);
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Search className="w-4 h-4 text-slate-500" />
                        <span>Buscar no Sistema</span>
                      </div>
                      <span className="hidden md:inline-block text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Ctrl+K
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tools & Views */}
              <div>
                <span className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Ferramentas & Conta
                </span>
                <div className="space-y-0.5">
                  {onFilterDelayed && delayedCount > 0 && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onFilterDelayed();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Ver {delayedCount} SCs em Atraso</span>
                      </div>
                    </button>
                  )}

                  {onExportAllCSV && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onExportAllCSV();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Exportar Dados (CSV)</span>
                    </button>
                  )}

                  {onOpenNotifications && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenNotifications();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-slate-500" />
                        <span>Notificações</span>
                      </div>
                      {urgentNotificationsCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white">
                          {urgentNotificationsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenEditProfile && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenEditProfile();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>Editar Perfil</span>
                    </button>
                  )}

                  {perms.canAccessAdmin && onOpenSettings && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenSettings();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <SettingsIcon className="w-4 h-4 text-slate-500" />
                        <span>Configurações</span>
                      </div>
                      <span className="hidden md:inline-block text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Ctrl+,
                      </span>
                    </button>
                  )}

                  {onOpenShortcuts && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenShortcuts();
                        onClose();
                      }}
                      className="hidden md:flex w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Keyboard className="w-4 h-4 text-slate-500" />
                        <span>Atalhos de Teclado</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        ?
                      </span>
                    </button>
                  )}

                  {perms.canManageUsers && onOpenAdminUsers && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenAdminUsers();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Usuários & Permissões</span>
                    </button>
                  )}

                  {perms.canAccessAdmin && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenAdmin();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2.5"
                    >
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span>Painel Administrativo</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onLogout();
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-2.5 mt-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sair</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Version */}
            <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between bg-slate-50/50">
              <span>MCM Montagens</span>
              <span className="font-mono">v2.5</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

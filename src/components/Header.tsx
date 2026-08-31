import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Plus,
  Menu,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Boxes,
  Command,
  Settings as SettingsIcon,
  ChevronDown,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ActiveNavTab, ThemeMode, UserProfile, CloudSyncStatus, SC, Equipment } from '../types';
import { MCMLogo } from './MCMLogo';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfileMenu } from './UserProfileMenu';
import { HeaderSearchDropdown } from './HeaderSearchDropdown';
import { getUserPermissions } from '../services/authService';

interface HeaderProps {
  activeNavTab: ActiveNavTab;
  isDrawerOpen?: boolean;
  scCount?: number;
  delayedCount?: number;
  equipmentCount?: number;
  urgentNotificationsCount?: number;
  theme?: ThemeMode;
  currentUser: UserProfile;
  users?: UserProfile[];
  cloudStatus?: CloudSyncStatus;
  lastSyncTime?: string;
  scs?: SC[];
  equipments?: Equipment[];
  onSelectSC?: (sc: SC) => void;
  onSelectEquipment?: (eq: Equipment) => void;
  onApplyTableSearch?: (query: string, targetModule: 'solicitacoes' | 'inventario') => void;
  onSelectUser?: (user: UserProfile) => void;
  onOpenEditProfile?: () => void;
  onOpenAdminUsers?: () => void;
  onOpenAdminOverview?: () => void;
  onRefreshCloud?: () => void;
  onNavTabChange?: (tab: ActiveNavTab) => void;
  onOpenGlobalSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onOpenDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNavTab,
  isDrawerOpen = false,
  scCount = 0,
  delayedCount = 0,
  equipmentCount = 0,
  urgentNotificationsCount = 0,
  currentUser,
  cloudStatus = 'connected',
  lastSyncTime,
  scs = [],
  equipments = [],
  onSelectSC,
  onSelectEquipment,
  onApplyTableSearch,
  onOpenEditProfile,
  onOpenAdminUsers,
  onOpenAdminOverview,
  onRefreshCloud,
  onNavTabChange,
  onOpenGlobalSearch,
  onOpenNotifications,
  onOpenSettings,
  onLogout,
  onOpenDrawer,
}) => {
  const [isSCOptionsOpen, setIsSCOptionsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSCOptionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSCOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const perms = getUserPermissions(currentUser);
  const canAccessSC = perms.canAccessSC;
  const canAccessInventario = perms.canAccessInventario;

  const isSCActive = activeNavTab === 'solicitacoes' || activeNavTab === 'indicadores' || activeNavTab === 'graficos';

  const scSubItems = [
    {
      id: 'solicitacoes' as ActiveNavTab,
      label: 'Solicitações',
      description: 'Tabela e cartões de pedidos',
      icon: ShoppingCart,
      badge: scCount > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 text-orange-700">
          {scCount}
        </span>
      ) : null,
    },
    {
      id: 'indicadores' as ActiveNavTab,
      label: 'Indicadores',
      description: 'Métricas, KPIs e status de entrega',
      icon: LayoutDashboard,
      badge: delayedCount > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
          {delayedCount} atrasada{delayedCount > 1 ? 's' : ''}
        </span>
      ) : null,
    },
    {
      id: 'graficos' as ActiveNavTab,
      label: 'Gráficos',
      description: 'Análise visual e tendências',
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs py-1.5 sm:py-2 px-2.5 sm:px-4 lg:px-6 w-full max-w-full"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-1.5 sm:gap-3 lg:gap-4">
        {/* Left: Drawer Trigger, Brand Logo & Segmented Navbar Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
          {/* Hamburger Menu Trigger Button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            id="btnHamburgerMenu"
            aria-label="Abrir Menu Principal e Ações Rápidas"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            className="relative flex items-center gap-1.5 h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1a202c] hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group font-bold text-xs"
          >
            <div className="relative flex items-center justify-center">
              <Menu className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 group-hover:text-orange-500 transition-colors" />
              {urgentNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </div>
            <span className="hidden sm:inline font-bold">Menu</span>
          </button>

          {/* MCM Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <MCMLogo className="h-5.5 sm:h-7 shrink-0" variant="full" />
          </div>

          <div className="hidden xl:block h-4.5 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* Desktop Navigation with Solicitações Dropdown & Inventário TI */}
          {onNavTabChange && (
            <nav
              role="navigation"
              aria-label="Navegação Principal do Sistema"
              className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200 shadow-inner shrink-0 gap-1 relative"
            >
              {/* Solicitações Dropdown with Indicadores and Gráficos */}
              {canAccessSC && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="navTab-solicitacoes-dropdown"
                    onClick={() => setIsSCOptionsOpen((prev) => !prev)}
                    aria-expanded={isSCOptionsOpen}
                    aria-haspopup="menu"
                    className={`relative z-10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] font-bold focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden ${
                      isSCActive
                        ? 'text-orange-600 font-extrabold bg-white shadow-xs border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <ShoppingCart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSCActive ? 'text-orange-600' : 'text-slate-500'}`} />
                    <span>
                      {activeNavTab === 'indicadores'
                        ? 'Solicitações · Indicadores'
                        : activeNavTab === 'graficos'
                        ? 'Solicitações · Gráficos'
                        : 'Solicitações'}
                    </span>
                    {scCount > 0 && activeNavTab === 'solicitacoes' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500 text-white shadow-xs">
                        {scCount}
                      </span>
                    )}
                    {delayedCount > 0 && activeNavTab === 'indicadores' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                        {delayedCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isSCOptionsOpen ? 'rotate-180 text-orange-600' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isSCOptionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-1.5 overflow-hidden"
                        role="menu"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                          Módulo de Solicitações
                        </div>

                        <div className="flex flex-col gap-0.5">
                          {scSubItems.map((item) => {
                            const isItemActive = activeNavTab === item.id;
                            const ItemIcon = item.icon;

                            return (
                              <button
                                key={item.id}
                                role="menuitem"
                                onClick={() => {
                                  onNavTabChange(item.id);
                                  setIsSCOptionsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer group ${
                                  isItemActive
                                    ? 'bg-orange-50/90 text-orange-700 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                      isItemActive
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-600'
                                    }`}
                                  >
                                    <ItemIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold truncate block">{item.label}</span>
                                    <span className="text-[10px] text-slate-400 truncate block">
                                      {item.description}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                                  {item.badge}
                                  {isItemActive && (
                                    <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Inventário TI Tab */}
              {canAccessInventario && (
                <button
                  type="button"
                  id="navTab-inventario"
                  role="tab"
                  aria-selected={activeNavTab === 'inventario'}
                  onClick={() => {
                    onNavTabChange('inventario');
                    setIsSCOptionsOpen(false);
                  }}
                  className={`relative z-10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] font-bold focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                    activeNavTab === 'inventario'
                      ? 'text-blue-600 font-extrabold bg-white shadow-xs border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Boxes className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeNavTab === 'inventario' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>Inventário TI</span>
                  {equipmentCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
                        activeNavTab === 'inventario'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {equipmentCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          )}
        </div>

        {/* Center: Search Bar & Anchored Dropdown Module */}
        <div className="flex-1 flex items-center justify-center px-1.5 sm:px-3 min-w-0 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
          <HeaderSearchDropdown
            scs={scs}
            equipments={equipments}
            onSelectSC={(sc) => onSelectSC?.(sc)}
            onSelectEquipment={(eq) => onSelectEquipment?.(eq)}
            onApplyTableSearch={onApplyTableSearch}
          />
        </div>

        {/* Right Section: Sync Badge, Settings, Notifications, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Subtle Live Sync Status Pill */}
          <AnimatePresence mode="wait">
            {cloudStatus === 'syncing' ? (
              <motion.div
                key="syncing-indicator"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                id="header-sync-indicator"
                aria-live="polite"
                className="flex items-center gap-1.5 h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-2xs shrink-0 select-none"
                title="Sincronizando dados em tempo real com o banco Firestore..."
              >
                <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                <span className="hidden sm:inline text-[11px]">Sincronizando...</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Settings Button (Admin Only) */}
          {perms.canAccessAdmin && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              id="btnHeaderSettings"
              aria-label="Abrir Configurações do Sistema"
              title="Configurações do Sistema (Ctrl + ,)"
              className="hidden sm:flex h-8 sm:h-8.5 w-8 sm:w-8.5 items-center justify-center rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1a202c] text-slate-700 dark:text-slate-300 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-500 group-hover:rotate-45 transition-all duration-300" />
            </button>
          )}

          {/* Notifications Center Trigger Button */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              id="btnOpenNotifications"
              aria-label={`Central de Notificações ${
                urgentNotificationsCount > 0 ? `(${urgentNotificationsCount} lembretes)` : ''
              }`}
              title="Central de Notificações e Lembretes de Vencimento"
              className="relative h-8 sm:h-8.5 w-8 sm:w-8.5 flex items-center justify-center rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1a202c] text-slate-700 dark:text-slate-300 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group"
            >
              <Bell className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-500 transition-colors" />
              {urgentNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-2xs ring-2 ring-white animate-bounce">
                  {urgentNotificationsCount > 99 ? '99+' : urgentNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile Menu with Cloud Status & Actions */}
          <UserProfileMenu
            currentUser={currentUser}
            onOpenEditProfile={onOpenEditProfile}
            onOpenSettings={onOpenSettings}
            onOpenAdminUsers={onOpenAdminUsers}
            onOpenAdminOverview={onOpenAdminOverview}
            onLogout={onLogout}
            cloudStatus={cloudStatus}
            lastSyncTime={lastSyncTime}
            onRefreshCloud={onRefreshCloud}
          />
        </div>
      </div>

      {/* Subtle Real-Time Sync Progress Bar along header bottom edge */}
      <AnimatePresence>
        {cloudStatus === 'syncing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-orange-100/70 dark:bg-orange-950/40 overflow-hidden pointer-events-none z-40"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                repeat: Infinity,
                duration: 1.25,
                ease: 'easeInOut',
              }}
              className="h-full w-1/2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

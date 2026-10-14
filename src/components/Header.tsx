import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Plus,
  Menu,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Boxes,
  FileCheck,
  Command,
  Settings as SettingsIcon,
  ChevronDown,
  Check,
  RefreshCw,
  Users,
} from 'lucide-react';
import { ActiveNavTab, ThemeMode, UserProfile, CloudSyncStatus, SC, Equipment } from '../types';
import { MCMLogo } from './MCMLogo';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfileMenu } from './UserProfileMenu';
import { HeaderSearchDropdown } from './HeaderSearchDropdown';
import { TeamPresenceDropdown } from './TeamPresenceDropdown';
import { getUserPermissions, isUserOnline } from '../services/authService';

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
  onOpenTeamModal?: () => void;
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
  users = [],
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
  onOpenTeamModal,
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
  const [isInventarioOptionsOpen, setIsInventarioOptionsOpen] = useState(false);
  const inventarioDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSCOptionsOpen(false);
      }
      if (inventarioDropdownRef.current && !inventarioDropdownRef.current.contains(event.target as Node)) {
        setIsInventarioOptionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSCOptionsOpen(false);
        setIsInventarioOptionsOpen(false);
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
  const canAccessTermos = perms.canAccessTermos;

  const isSCActive = activeNavTab === 'solicitacoes' || activeNavTab === 'indicadores' || activeNavTab === 'graficos';
  const isInventarioActive = activeNavTab === 'inventario' || activeNavTab === 'termo-responsabilidade';

  const onlineUsersCount = React.useMemo(() => {
    if (!users || users.length === 0) return 1;
    return users.filter((u) => isUserOnline(u, currentUser)).length;
  }, [users, currentUser]);

  const scSubItems = useMemo(() => {
    const list = [
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
    ];

    if (perms.canAccessAnalytics) {
      list.push(
        {
          id: 'indicadores' as ActiveNavTab,
          label: 'Indicadores',
          description: 'Métricas, KPIs e status de entrega',
          icon: LayoutDashboard,
          badge: delayedCount > 0 ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white">
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
        }
      );
    }
    return list;
  }, [scCount, delayedCount, perms.canAccessAnalytics]);

  const inventarioSubItems = [
    {
      id: 'inventario' as ActiveNavTab,
      label: 'Inventário TI',
      description: 'Equipamentos, patrimônio e ativos',
      icon: Boxes,
      badge: equipmentCount > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
          {equipmentCount}
        </span>
      ) : null,
    },
    {
      id: 'termo-responsabilidade' as ActiveNavTab,
      label: 'Termo de Responsabilidade',
      description: 'Entrega, custódia e devolução de ativos',
      icon: FileCheck,
      badge: null,
    },
  ];

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs py-1.5 sm:py-2 px-3 sm:px-5 lg:px-7 xl:px-8 w-full max-w-full print:hidden"
    >
      <div className="w-full max-w-[2100px] mx-auto flex items-center justify-between gap-1.5 sm:gap-3 lg:gap-4">
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
              {/* Solicitações Navigation */}
              {canAccessSC && perms.canAccessAnalytics ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="navTab-solicitacoes-dropdown"
                    onClick={() => {
                      if (activeNavTab !== 'solicitacoes') {
                        onNavTabChange('solicitacoes');
                      } else {
                        setIsSCOptionsOpen((prev) => !prev);
                      }
                    }}
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
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white">
                        {delayedCount}
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Abrir opções de solicitações"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSCOptionsOpen((prev) => !prev);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setIsSCOptionsOpen((prev) => !prev);
                        }
                      }}
                      className="p-0.5 hover:bg-slate-200/60 rounded cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isSCOptionsOpen ? 'rotate-180 text-orange-600' : 'text-slate-400'
                        }`}
                      />
                    </span>
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
              ) : canAccessSC && !perms.canAccessAnalytics ? (
                /* Direto para Solicitações quando o usuário não possui permissão de Analytics */
                <button
                  type="button"
                  id="navTab-solicitacoes-btn"
                  onClick={() => onNavTabChange('solicitacoes')}
                  className={`relative z-10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] font-bold focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden ${
                    activeNavTab === 'solicitacoes'
                      ? 'text-orange-600 font-extrabold bg-white shadow-xs border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <ShoppingCart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeNavTab === 'solicitacoes' ? 'text-orange-600' : 'text-slate-500'}`} />
                  <span>Solicitações</span>
                  {scCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500 text-white shadow-xs">
                      {scCount}
                    </span>
                  )}
                </button>
              ) : null}

              {/* Inventário TI & Termos de Responsabilidade Navigation */}
              {canAccessInventario && canAccessTermos ? (
                /* Both permissions active: dropdown selector */
                <div className="relative" ref={inventarioDropdownRef}>
                  <button
                    type="button"
                    id="navTab-inventario-dropdown"
                    onClick={() => {
                      if (activeNavTab !== 'inventario') {
                        onNavTabChange('inventario');
                      } else {
                        setIsInventarioOptionsOpen((prev) => !prev);
                      }
                    }}
                    aria-expanded={isInventarioOptionsOpen}
                    aria-haspopup="menu"
                    className={`relative z-10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] font-bold focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                      isInventarioActive
                        ? 'text-blue-600 font-extrabold bg-white shadow-xs border border-slate-200/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {activeNavTab === 'termo-responsabilidade' ? (
                      <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    ) : (
                      <Boxes className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isInventarioActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    )}
                    <span>
                      {activeNavTab === 'termo-responsabilidade'
                        ? 'Termos TI'
                        : 'Inventário TI'}
                    </span>
                    {equipmentCount > 0 && activeNavTab === 'inventario' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white shadow-xs">
                        {equipmentCount}
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Abrir opções de inventário"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInventarioOptionsOpen((prev) => !prev);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setIsInventarioOptionsOpen((prev) => !prev);
                        }
                      }}
                      className="p-0.5 hover:bg-slate-200/60 rounded cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isInventarioOptionsOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                        }`}
                      />
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isInventarioOptionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-1.5 overflow-hidden"
                        role="menu"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                          Módulo de Ativos & TI
                        </div>

                        <div className="flex flex-col gap-0.5">
                          {inventarioSubItems.map((item) => {
                            const isItemActive = activeNavTab === item.id;
                            const ItemIcon = item.icon;

                            return (
                              <button
                                key={item.id}
                                role="menuitem"
                                onClick={() => {
                                  onNavTabChange(item.id);
                                  setIsInventarioOptionsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer group ${
                                  isItemActive
                                    ? 'bg-blue-50/90 text-blue-700 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                      isItemActive
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600'
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
                                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
              ) : canAccessInventario && !canAccessTermos ? (
                /* Only Inventário TI access */
                <button
                  type="button"
                  id="navTab-inventario-btn"
                  onClick={() => onNavTabChange('inventario')}
                  className={`relative z-10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] font-bold focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                    activeNavTab === 'inventario'
                      ? 'text-blue-600 font-extrabold bg-white shadow-xs border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Boxes className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeNavTab === 'inventario' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>Inventário TI</span>
                  {equipmentCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white shadow-xs">
                      {equipmentCount}
                    </span>
                  )}
                </button>
              ) : !canAccessInventario && canAccessTermos ? (
                /* Only Termos de Responsabilidade access */
                <button
                  type="button"
                  id="navTab-termos-btn"
                  onClick={() => onNavTabChange('termo-responsabilidade')}
                  className={`relative z-10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] font-bold focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                    activeNavTab === 'termo-responsabilidade'
                      ? 'text-blue-600 font-extrabold bg-white shadow-xs border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FileCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeNavTab === 'termo-responsabilidade' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>Termo de Responsabilidade</span>
                </button>
              ) : null}
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

          {/* Menu Dropdown de Equipe (Abre embaixo pequeno de forma sofisticada) */}
          <TeamPresenceDropdown
            users={users}
            currentUser={currentUser}
            onOpenAdminUsers={onOpenAdminUsers}
          />

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
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center bg-red-600 text-[9px] font-bold text-white">
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
            onOpenTeamModal={onOpenTeamModal}
            onLogout={onLogout}
            cloudStatus={cloudStatus}
            lastSyncTime={lastSyncTime}
            onRefreshCloud={onRefreshCloud}
          />
        </div>
      </div>

      {/* Real-Time Sync Progress Bar along header bottom edge */}
      <AnimatePresence>
        {cloudStatus === 'syncing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200 dark:bg-slate-700 overflow-hidden pointer-events-none z-40"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                repeat: Infinity,
                duration: 1.25,
                ease: 'easeInOut',
              }}
              className="h-full w-1/3 bg-orange-600"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

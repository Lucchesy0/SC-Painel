import React from 'react';
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
} from 'lucide-react';
import { ActiveNavTab, ThemeMode, UserProfile, CloudSyncStatus } from '../types';
import { MCMLogo } from './MCMLogo';
import { motion } from 'motion/react';
import { UserProfileMenu } from './UserProfileMenu';

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
  onOpenAdd?: () => void;
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
  onOpenEditProfile,
  onOpenAdminUsers,
  onOpenAdminOverview,
  onRefreshCloud,
  onNavTabChange,
  onOpenGlobalSearch,
  onOpenNotifications,
  onOpenSettings,
  onLogout,
  onOpenAdd,
  onOpenDrawer,
}) => {
  const navTabs = [
    {
      id: 'solicitacoes' as ActiveNavTab,
      label: 'Solicitações',
      shortLabel: 'SCs',
      icon: ShoppingCart,
      activeText: 'text-orange-600 font-bold',
      badge:
        scCount > 0 ? (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
              activeNavTab === 'solicitacoes'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {scCount}
          </span>
        ) : null,
    },
    {
      id: 'indicadores' as ActiveNavTab,
      label: 'Indicadores',
      shortLabel: 'KPIs',
      icon: LayoutDashboard,
      activeText: 'text-emerald-600 font-bold',
      badge:
        delayedCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
            {delayedCount}
          </span>
        ) : null,
    },
    {
      id: 'graficos' as ActiveNavTab,
      label: 'Gráficos',
      shortLabel: 'Gráficos',
      icon: BarChart3,
      activeText: 'text-indigo-600 font-bold',
      badge: null,
    },
    {
      id: 'inventario' as ActiveNavTab,
      label: 'Inventário TI',
      shortLabel: 'Ativos TI',
      icon: Boxes,
      activeText: 'text-blue-600 font-bold',
      badge:
        equipmentCount > 0 ? (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
              activeNavTab === 'inventario'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {equipmentCount}
          </span>
        ) : null,
    },
  ].filter((tab) => {
    if (currentUser.role === 'admin') return true;
    if (tab.id === 'inventario') {
      return currentUser.canAccessInventario !== false;
    }
    return currentUser.canAccessSC !== false;
  });

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs py-2 sm:py-2.5 px-3 sm:px-4 lg:px-6 w-full max-w-full"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
        {/* Left: Drawer Trigger, Brand Logo & Segmented Navbar Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
          {/* Hamburger Menu Trigger Button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            id="btnHamburgerMenu"
            aria-label="Abrir Menu Principal e Ações Rápidas"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 text-slate-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 group font-bold text-xs min-h-[38px]"
          >
            <div className="relative flex items-center justify-center">
              <Menu className="w-4.5 h-4.5 text-slate-600 group-hover:text-orange-500 transition-colors" />
              {urgentNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </div>
            <span className="hidden sm:inline font-bold">Menu</span>
          </button>

          {/* MCM Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <MCMLogo className="h-6 sm:h-7 shrink-0" variant="full" />
          </div>

          {/* Desktop Segmented Navigation Bar */}
          {onNavTabChange && (
            <nav
              role="navigation"
              aria-label="Navegação Principal do Sistema"
              className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200 shadow-inner shrink-0 gap-0.5"
            >
              {navTabs.map((tab) => {
                const isActive = activeNavTab === tab.id;
                const IconComponent = tab.icon;

                return (
                  <button
                    key={tab.id}
                    id={`navTab-${tab.id}`}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onNavTabChange(tab.id)}
                    className={`relative z-10 px-2.5 lg:px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden ${
                      isActive
                        ? tab.activeText
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <IconComponent
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${
                        isActive ? 'scale-105' : 'text-slate-500'
                      }`}
                    />
                    <span className="hidden xl:inline">{tab.label}</span>
                    <span className="hidden md:inline xl:hidden text-[11px]">{tab.shortLabel}</span>
                    {tab.badge}

                    {isActive && (
                      <motion.div
                        layoutId="headerActiveNavbarTab"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/90 -z-10"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Search, Settings, Notifications, Profile, Action CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search Button */}
          {onOpenGlobalSearch && (
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              id="btnHeaderSearch"
              aria-label="Busca Rápida e Comandos (Ctrl + K)"
              title="Busca rápida em todo o sistema (Ctrl + K)"
              className="inline-flex items-center justify-center sm:justify-between gap-2 h-9 sm:h-9.5 w-9 sm:w-auto px-0 sm:px-2.5 2xl:px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 group"
            >
              <div className="flex items-center gap-1.5">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                <span className="hidden 2xl:inline text-slate-500 group-hover:text-slate-800">
                  Buscar...
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-200 text-[10px] font-mono font-bold text-slate-600 border border-slate-300 shadow-2xs">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </button>
          )}

          {/* Settings Button (Admin Only) */}
          {currentUser.role === 'admin' && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              id="btnHeaderSettings"
              aria-label="Abrir Configurações do Sistema"
              title="Configurações do Sistema (Ctrl + ,)"
              className="hidden sm:flex h-9 sm:h-9.5 w-9 sm:w-9.5 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 group"
            >
              <SettingsIcon className="w-4 h-4 text-slate-500 group-hover:text-orange-500 group-hover:rotate-45 transition-all duration-300" />
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
              className="relative h-9 sm:h-9.5 w-9 sm:w-9.5 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 group"
            >
              <Bell className="w-4 h-4 text-slate-500 group-hover:text-orange-500 transition-colors" />
              {urgentNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-bounce">
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

          {/* Primary Action Button (+ Nova SC / + Novo Ativo) */}
          {onOpenAdd && (
            <button
              type="button"
              onClick={onOpenAdd}
              id="btnHeaderAddAction"
              aria-label={
                activeNavTab === 'inventario' ? 'Cadastrar Novo Ativo TI' : 'Adicionar Nova SC'
              }
              className={`relative inline-flex items-center justify-center gap-1.5 h-8.5 sm:h-9.5 px-3 sm:px-3.5 text-xs font-black rounded-xl text-white shadow-sm cursor-pointer transition-all shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden group overflow-hidden ${
                activeNavTab === 'inventario'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:rotate-90 stroke-[2.5]" />
              <span className="font-extrabold text-[11px] sm:text-xs tracking-tight">
                {activeNavTab === 'inventario' ? 'Novo Ativo' : 'Nova SC'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

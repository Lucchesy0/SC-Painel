import React, { useState } from 'react';
import {
  Search,
  Bell,
  Plus,
  Menu,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Boxes,
  Sun,
  Moon,
  Monitor,
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
  onSelectUser: (user: UserProfile) => void;
  onOpenAdminUsers?: () => void;
  onRefreshCloud?: () => void;
  onNavTabChange?: (tab: ActiveNavTab) => void;
  onToggleTheme?: () => void;
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
  theme = 'auto',
  currentUser,
  users,
  cloudStatus = 'connected',
  lastSyncTime,
  onSelectUser,
  onOpenAdminUsers,
  onRefreshCloud,
  onNavTabChange,
  onToggleTheme,
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
      color: 'orange',
      activeText: 'text-orange-600 dark:text-orange-400',
      activeBorder: 'border-orange-500/30',
      glow: 'rgba(249,115,22,0.2)',
      badge:
        scCount > 0 ? (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
              activeNavTab === 'solicitacoes'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
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
      color: 'emerald',
      activeText: 'text-emerald-600 dark:text-emerald-400',
      activeBorder: 'border-emerald-500/30',
      glow: 'rgba(16,185,129,0.2)',
      badge:
        delayedCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-xs animate-pulse">
            {delayedCount}
          </span>
        ) : null,
    },
    {
      id: 'graficos' as ActiveNavTab,
      label: 'Gráficos',
      shortLabel: 'Gráficos',
      icon: BarChart3,
      color: 'indigo',
      activeText: 'text-indigo-600 dark:text-indigo-400',
      activeBorder: 'border-indigo-500/30',
      glow: 'rgba(99,102,241,0.2)',
      badge: null,
    },
    {
      id: 'inventario' as ActiveNavTab,
      label: 'Inventário TI',
      shortLabel: 'Ativos TI',
      icon: Boxes,
      color: 'blue',
      activeText: 'text-blue-600 dark:text-blue-400',
      activeBorder: 'border-blue-500/30',
      glow: 'rgba(59,130,246,0.2)',
      badge:
        equipmentCount > 0 ? (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all ${
              activeNavTab === 'inventario'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
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
    // 'solicitacoes', 'indicadores', 'graficos' pertencem ao Painel de SC
    return currentUser.canAccessSC !== false;
  });

  const getThemeIcon = () => {
    if (theme === 'dark') {
      return (
        <div className="relative">
          <Moon className="w-4 h-4 text-amber-400" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
        </div>
      );
    }
    if (theme === 'light') {
      return <Sun className="w-4 h-4 text-orange-500" />;
    }
    return <Monitor className="w-4 h-4 text-slate-400" />;
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 bg-white/90 dark:bg-[#131722]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors duration-200 py-2 sm:py-2.5 px-3 sm:px-4 lg:px-6 w-full max-w-full"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
        {/* Left: Hamburger Drawer Trigger, Brand Logo & Segmented Navbar Tabs */}
        <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3.5 shrink-0">
          {/* Hamburger Menu Trigger Button with Dynamic Dot */}
          <button
            type="button"
            onClick={onOpenDrawer}
            id="btnHamburgerMenu"
            aria-label="Abrir Menu Principal e Ações Rápidas"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#1c2230]/80 text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group font-bold text-xs min-h-[38px]"
          >
            <div className="relative flex items-center justify-center">
              <Menu className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300 group-hover:text-orange-500 transition-colors" />
              {urgentNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1a1f2c]" />
              )}
            </div>
            <span className="hidden sm:inline font-bold">Menu</span>
          </button>

          {/* MCM Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <MCMLogo className="h-6 sm:h-7 shrink-0" variant="full" />
          </div>

          {/* Desktop & Tablet Segmented Navigation Bar */}
          {onNavTabChange && (
            <nav
              role="navigation"
              aria-label="Navegação Principal do Sistema"
              className="hidden md:flex items-center p-0.5 sm:p-1 rounded-2xl bg-slate-100/90 dark:bg-[#181e2b]/90 border border-slate-200/80 dark:border-slate-700/60 shadow-inner shrink-0 gap-0.5"
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
                    className={`relative z-10 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-xl flex items-center gap-1 sm:gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden ${
                      isActive
                        ? tab.activeText
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <IconComponent
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${
                        isActive ? 'scale-110' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span className="hidden xl:inline">{tab.label}</span>
                    <span className="hidden md:inline xl:hidden text-[11px]">{tab.shortLabel}</span>
                    {tab.badge}

                    {isActive && (
                      <motion.div
                        layoutId="headerActiveNavbarTab"
                        className="absolute inset-0 bg-white dark:bg-[#232a3b] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-600/70 -z-10"
                        style={{
                          boxShadow: `0 2px 10px -2px ${tab.glow}`,
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Command Search, User Profile Switcher, Notifications, Theme, Add CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search Button */}
          {onOpenGlobalSearch && (
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              id="btnHeaderSearch"
              aria-label="Busca Rápida e Comandos (Ctrl + K)"
              title="Busca rápida em todo o sistema (Ctrl + K)"
              className="inline-flex items-center justify-center sm:justify-between gap-1.5 sm:gap-2 h-9 sm:h-9.5 w-9 sm:w-auto px-0 sm:px-2.5 2xl:px-3 text-xs font-semibold rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1c2230]/90 text-slate-700 dark:text-slate-200 hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-orange-600 dark:hover:text-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group"
            >
              <div className="flex items-center gap-1.5">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                <span className="hidden 2xl:inline text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                  Buscar...
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-300/80 dark:border-slate-700 shadow-2xs">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </button>
          )}

          {/* Theme Quick Switcher */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              id="btnHeaderThemeToggle"
              aria-label="Alternar Tema Visual"
              title={`Alternar Tema (Atual: ${
                theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Automático'
              })`}
              className="hidden lg:flex h-9 sm:h-9.5 w-9 sm:w-9.5 items-center justify-center rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1c2230]/90 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            >
              {getThemeIcon()}
            </button>
          )}

          {/* Settings Button (Admin Only) */}
          {currentUser.role === 'admin' && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              id="btnHeaderSettings"
              aria-label="Abrir Configurações do Sistema"
              title="Configurações e Preferências do Sistema (Ctrl + ,)"
              className="hidden sm:flex h-9 sm:h-9.5 w-9 sm:w-9.5 items-center justify-center rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1c2230]/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-orange-600 dark:hover:text-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group"
            >
              <SettingsIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-orange-500 group-hover:rotate-45 transition-all duration-300" />
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
              className="relative h-9 sm:h-9.5 w-9 sm:w-9.5 flex items-center justify-center rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1c2230]/90 text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group"
            >
              <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-orange-500 transition-colors" />
              {urgentNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-[#131722] animate-bounce">
                  {urgentNotificationsCount > 99 ? '99+' : urgentNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile & Role Switcher with Cloud Status */}
          <UserProfileMenu
            currentUser={currentUser}
            users={users}
            onSelectUser={onSelectUser}
            onOpenAdminUsers={onOpenAdminUsers}
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
              className={`relative inline-flex items-center justify-center gap-1.5 h-9 sm:h-9.5 px-2.5 sm:px-3.5 text-xs font-black rounded-xl text-white shadow-md cursor-pointer transition-all shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-hidden group overflow-hidden ${
                activeNavTab === 'inventario'
                  ? 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
                  : 'bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-orange-500/25'
              }`}
            >
              <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
              <span className="hidden sm:inline font-bold">
                {activeNavTab === 'inventario' ? 'Novo Ativo' : 'Nova SC'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

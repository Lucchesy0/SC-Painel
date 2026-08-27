import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Menu,
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
  Sun,
  Moon,
  Monitor,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import { ActiveNavTab, ThemeMode, SC, Equipment, UserProfile } from '../types';
import { MCMLogo } from './MCMLogo';
import { triggerHaptic } from '../utils/haptics';
import { Users, LogOut } from 'lucide-react';

interface AppDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeNavTab: ActiveNavTab;
  onNavTabChange: (tab: ActiveNavTab) => void;
  scCount: number;
  delayedCount: number;
  equipmentCount: number;
  urgentNotificationsCount: number;
  theme: ThemeMode;
  currentUser?: UserProfile;
  onToggleTheme: () => void;
  onSetTheme?: (t: ThemeMode) => void;
  lastSyncTime?: string;
  isRefreshing?: boolean;
  onRefreshLive?: () => void;
  onOpenAddSC?: () => void;
  onOpenAddEquipment?: () => void;
  onOpenRMImport?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenNotifications?: () => void;
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
  theme,
  currentUser,
  onToggleTheme,
  onSetTheme,
  lastSyncTime,
  isRefreshing = false,
  onRefreshLive,
  onOpenAddSC,
  onOpenAddEquipment,
  onOpenRMImport,
  onOpenGlobalSearch,
  onOpenNotifications,
  onOpenSettings,
  onOpenAdmin,
  onOpenAdminUsers,
  onLogout,
  onOpenShortcuts,
  onFilterDelayed,
  onFilterMaintenance,
  onExportAllCSV,
}) => {
  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
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

  const navItems = [
    {
      id: 'solicitacoes' as ActiveNavTab,
      label: 'Solicitações de Compras (SC)',
      sub: 'Acompanhamento, filtros e prazos',
      icon: <ShoppingCart className="w-5 h-5 text-orange-500" />,
      badge: (
        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          {scCount}
        </span>
      ),
      color: 'hover:border-orange-500/40 bg-orange-500/5',
      activeColor: 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold',
    },
    {
      id: 'indicadores' as ActiveNavTab,
      label: 'Indicadores & KPIs',
      sub: 'Resumo executivo de desempenho',
      icon: <LayoutDashboard className="w-5 h-5 text-emerald-500" />,
      badge:
        delayedCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {delayedCount} atrasada{delayedCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            Em dia
          </span>
        ),
      color: 'hover:border-emerald-500/40 bg-emerald-500/5',
      activeColor: 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold',
    },
    {
      id: 'graficos' as ActiveNavTab,
      label: 'Gráficos & Dashboards',
      sub: 'Distribuição por status e solicitantes',
      icon: <BarChart3 className="w-5 h-5 text-indigo-500" />,
      badge: null,
      color: 'hover:border-indigo-500/40 bg-indigo-500/5',
      activeColor: 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold',
    },
    {
      id: 'inventario' as ActiveNavTab,
      label: 'Inventário de TI & Ativos',
      sub: 'Patrimônio, categorias e locais',
      icon: <Boxes className="w-5 h-5 text-blue-500" />,
      badge: (
        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          {equipmentCount}
        </span>
      ),
      color: 'hover:border-blue-500/40 bg-blue-500/5',
      activeColor: 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-bold',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Container (Slides from Left) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-[340px] sm:max-w-[380px] bg-white dark:bg-[#181d28] border-r border-slate-200 dark:border-slate-700/80 shadow-2xl flex flex-col h-full z-10 select-none overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#202534] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MCMLogo className="h-6 sm:h-7" variant="full" />
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                title="Fechar Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar touch-scroll">
              {/* Sincronização Status Pill */}
              <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                      Sistema Online
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Multi-dispositivos conectado
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
                    className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    title="Atualizar Agora"
                  >
                    <RotateCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                )}
              </div>

              {/* 1. Módulos e Navegação Principal */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Navegação Principal
                  </span>
                </div>
                <div className="space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = activeNavTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? item.activeColor
                            : `border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 ${item.color}`
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                              {item.label}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              {item.sub}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge}
                          <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Ações Rápidas do Sistema */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Ações Rápidas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Nova SC */}
                  {onOpenAddSC && (
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onOpenAddSC();
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 flex flex-col items-start gap-1 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Plus className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span>Nova SC</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Criar solicitação
                      </span>
                    </button>
                  )}

                  {/* Novo Ativo */}
                  {onOpenAddEquipment && (
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onOpenAddEquipment();
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex flex-col items-start gap-1 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Novo Ativo</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Cadastrar equipamento
                      </span>
                    </button>
                  )}

                  {/* Importar RM */}
                  {onOpenRMImport && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenRMImport();
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-emerald-500/50 text-slate-700 dark:text-slate-200 flex flex-col items-start gap-1 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Importar RM</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Importar CSV TOTVS
                      </span>
                    </button>
                  )}

                  {/* Busca Global */}
                  {onOpenGlobalSearch && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenGlobalSearch();
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-500/50 text-slate-700 dark:text-slate-200 flex flex-col items-start gap-1 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                        <Search className="w-3.5 h-3.5 text-blue-500" />
                        <span>Busca Rápida</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Ctrl + K
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Atalhos de Filtros Diretos */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Filtros de 1 Clique
                  </span>
                </div>
                <div className="space-y-1.5">
                  {onFilterDelayed && delayedCount > 0 && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onFilterDelayed();
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Ver {delayedCount} SCs Atrasadas</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onExportAllCSV && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onExportAllCSV();
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-500" />
                        <span>Exportar Relatório Geral (CSV)</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Notificações e Ferramentas */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Ferramentas & Central
                  </span>
                </div>
                <div className="space-y-1.5">
                  {/* Central de Notificações */}
                  {onOpenNotifications && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenNotifications();
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-orange-500" />
                        <span>Central de Notificações</span>
                      </div>
                      {urgentNotificationsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                          {urgentNotificationsCount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">0 alertas</span>
                      )}
                    </button>
                  )}

                  {/* Atalhos de Teclado */}
                  {onOpenShortcuts && (
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenShortcuts();
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Keyboard className="w-4 h-4 text-indigo-500" />
                        <span>Atalhos de Teclado</span>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                        ?
                      </span>
                    </button>
                  )}

                  {/* Admin-only: Gestão de Usuários e Configurações */}
                  {currentUser?.role === 'admin' && (
                    <>
                      {onOpenAdminUsers && (
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            onOpenAdminUsers();
                            onClose();
                          }}
                          className="w-full p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span>Gestão de Usuários & Acessos</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-orange-500" />
                        </button>
                      )}

                      {onOpenSettings && (
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            onOpenSettings();
                            onClose();
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <SettingsIcon className="w-4 h-4 text-orange-500" />
                            <span>Configurações do Sistema</span>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                            Ctrl ,
                          </span>
                        </button>
                      )}

                      {/* Painel Administrativo */}
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          onOpenAdmin();
                          onClose();
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-orange-500/10 hover:border-orange-500/40 text-slate-800 dark:text-slate-100 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span>Painel de Administração (Luchesy)</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </>
                  )}

                  {/* Sair / Logout */}
                  {onLogout && (
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onLogout();
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between text-xs font-bold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sair / Trocar Usuário</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Seletor de Tema Visual */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Aparência & Tema
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      if (onSetTheme) onSetTheme('light');
                      else onToggleTheme();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Claro</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      if (onSetTheme) onSetTheme('dark');
                      else onToggleTheme();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-slate-800 text-orange-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Escuro</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      if (onSetTheme) onSetTheme('auto');
                      else onToggleTheme();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'auto'
                        ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#202534] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[11px]">
                MCM Gestão de SC & TI
              </span>
              <span className="font-mono text-[10px] bg-slate-200/70 dark:bg-slate-700/70 px-1.5 py-0.5 rounded">
                v2.5
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

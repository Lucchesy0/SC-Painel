import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SC, ThemeMode, FilterOptions, ToastMessage, Equipment, ActiveNavTab, AuditLogEntry, UserProfile, CloudSyncStatus } from './types';
import { exportToCSV, isDelayed, calcDays } from './utils/storage';
import { calculateSCReminderInfo } from './services/notificationService';
import { dbService } from './services/dbService';
import { syncService } from './services/syncService';
import { authService, getRoleLabel } from './services/authService';
import {
  subscribeToFirestoreSCs,
  subscribeToFirestoreEquipments,
  subscribeToSyncStatus,
  testFirestoreConnection,
  fetchAllSCsFromFirestore,
  fetchAllEquipmentsFromFirestore,
} from './services/firebase';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { SCTable } from './components/SCTable';
import { SCModal } from './components/SCModal';
import { SCDetailDrawer } from './components/SCDetailDrawer';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/Toast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { StatusChart } from './components/StatusChart';
import { DepartmentChart } from './components/DepartmentChart';
import { AnalyticsView } from './components/AnalyticsView';
import { InventoryView } from './components/InventoryView';
import { AdminModal, AdminTab } from './components/AdminModal';
import { NotificationsModal } from './components/NotificationsModal';
import { EquipmentModal } from './components/EquipmentModal';
import { EquipmentDetailModal } from './components/EquipmentDetailModal';
import { RMImportModal } from './components/RMImportModal';
import { GlobalSearch } from './components/GlobalSearch';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { AppDrawerMenu } from './components/AppDrawerMenu';
import { SettingsModal } from './components/SettingsModal';
import { PasswordAuthModal } from './components/PasswordAuthModal';
import { LoginScreen } from './components/LoginScreen';

// Função utilitária para normalizar centros de custo em todo o site
const normalizeSCList = (list: SC[]): { list: SC[]; changed: number } => {
  let changed = 0;
  const updated = list.map((sc) => {
    let sol = sc.solicitante || '';
    let hasChange = false;
    if (/^110\s*-\s*8004/i.test(sol)) {
      sol = sol.replace(/^110\s*-\s*/i, '');
      hasChange = true;
    } else if (/^110\s*-\s*CEQ/i.test(sol)) {
      sol = sol.replace(/^110\s*-\s*/i, '8004 - ');
      hasChange = true;
    } else if (sol.trim() === '110') {
      sol = '8004 - CEQ - Central de Equipamentos (MCM)';
      hasChange = true;
    }
    if (hasChange) {
      changed++;
      return { ...sc, solicitante: sol };
    }
    return sc;
  });
  return { list: updated, changed };
};

export default function App() {
  // Navigation & Theme
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>('solicitacoes');
  const [theme, setTheme] = useState<ThemeMode>('auto');

  // User Profile & Roles (Comprador, Almoxarifado, Gestor, Admin, Usuario)
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(() => authService.getAuthenticatedUser());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>(() => authService.getAvailableUsers());
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAuthUser, setPendingAuthUser] = useState<UserProfile | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('overview');

  const permissions = useMemo(() => authService.getPermissions(currentUser.role), [currentUser.role]);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('connected');

  // Core Data
  const [scs, setScs] = useState<SC[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Equipment Modals State
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: '',
    prazo: 'todos',
    sort: 'data-desc',
  });

  // Modal / Drawer visibility states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRMImportOpen, setIsRMImportOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingSC, setEditingSC] = useState<SC | null>(null);
  const [selectedSC, setSelectedSC] = useState<SC | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Apply theme class
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const root = document.documentElement;
      const isDark =
        theme === 'dark' || (theme === 'auto' && mediaQuery.matches);

      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    };

    applyTheme();
    dbService.saveTheme(theme).catch((err) => {
      console.error('Erro ao salvar tema no IndexedDB:', err);
    });

    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener?.('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener?.('change', handleSystemThemeChange);
  }, [theme]);

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+N, Ctrl+F, Esc, Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + K / Cmd + K -> Open Global Search
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
        return;
      }

      // Ctrl + N / Cmd + N -> Open New SC or Equipment Modal
      if (modifier && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (activeNavTab !== 'inventario') {
          setEditingSC(null);
          setIsModalOpen(true);
        } else {
          setEditingEq(null);
          setIsEqModalOpen(true);
        }
        return;
      }

      // Ctrl + F / Cmd + F or '/' -> Focus Search input
      if ((modifier && e.key.toLowerCase() === 'f') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        const searchInput = document.getElementById('headerBuscaSC') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Ctrl + , / Cmd + , -> Open Settings
      if (modifier && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      // Ctrl + Shift + A -> Open Admin Modal
      if (modifier && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminOpen(true);
        return;
      }

      // Escape -> Close Modals / Drawers
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        else if (isGlobalSearchOpen) setIsGlobalSearchOpen(false);
        else if (isNotificationsOpen) setIsNotificationsOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isModalOpen) setIsModalOpen(false);
        else if (isEqModalOpen) setIsEqModalOpen(false);
        else if (selectedSC) setSelectedSC(null);
        else if (selectedEq) setSelectedEq(null);
        else if (isAdminOpen) setIsAdminOpen(false);
        else if (deleteConfirmId) setDeleteConfirmId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isGlobalSearchOpen, isNotificationsOpen, isSettingsOpen, isModalOpen, isEqModalOpen, selectedSC, selectedEq, isAdminOpen, deleteConfirmId, activeNavTab]);

  const handleToggleTheme = () => {
    const modes: ThemeMode[] = ['auto', 'light', 'dark'];
    const next = modes[(modes.indexOf(theme) + 1) % modes.length];
    setTheme(next);
  };

  // Background sync helper function
  const performBackgroundSync = async (notifyUser = false) => {
    try {
      const scData = await dbService.getSCs();
      const eqData = await dbService.getEquipments();
      const { list: normalized, changed } = normalizeSCList(scData);

      if (changed > 0) {
        await dbService.replaceAllSCs(normalized);
        setScs(normalized);
      } else {
        setScs(scData);
      }
      setEquipments(eqData);

      const timeFormatted = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncTime(timeFormatted);

      if (notifyUser) {
        showToast('Dados e painéis sincronizados ao vivo com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro na sincronização de dados:', err);
      if (notifyUser) {
        showToast('Erro ao sincronizar dados do sistema.', 'error');
      }
    }
  };

  // Load saved settings & connect to real-time Firestore synchronization
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        testFirestoreConnection().catch(() => {});

        const savedTheme = await dbService.getTheme();
        if (savedTheme) setTheme(savedTheme);

        const savedModule = await dbService.getActiveModule();
        if (savedModule === 'inventario') {
          setActiveNavTab('inventario');
        }

        // Initial fetch directly from Firestore
        await performBackgroundSync(false);
      } catch (err) {
        console.error('Erro no carregamento inicial do Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();

    // Sincronização em tempo real multiusuário via Firebase Firestore onSnapshot
    const unsubStatus = subscribeToSyncStatus((status) => {
      setCloudStatus(status);
    });

    const unsubSCs = subscribeToFirestoreSCs((cloudSCs) => {
      const { list: normalized } = normalizeSCList(cloudSCs);
      setScs(normalized);
      setLastSyncTime(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setLoading(false);
    });

    const unsubEqs = subscribeToFirestoreEquipments((cloudEqs) => {
      setEquipments(cloudEqs);
    });

    const unsubUsers = authService.subscribeUsers((cloudUsers) => {
      setTeamUsers(cloudUsers);
    });

    const unsubBroadcast = syncService.subscribe(() => {
      performBackgroundSync(false);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performBackgroundSync(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubStatus();
      unsubSCs();
      unsubEqs();
      unsubUsers();
      unsubBroadcast();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Live Refresh handler across the entire app (manual trigger via Firestore)
  const handleRefreshLive = async () => {
    setIsRefreshing(true);
    try {
      const cloudSCs = await fetchAllSCsFromFirestore();
      const cloudEqs = await fetchAllEquipmentsFromFirestore();
      if (cloudSCs.length > 0) {
        const { list: normalized } = normalizeSCList(cloudSCs);
        setScs(normalized);
      }
      if (cloudEqs.length > 0) {
        setEquipments(cloudEqs);
      }
      setLastSyncTime(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      showToast('Nuvem Firestore sincronizada em tempo real com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao atualizar dados do Firestore:', err);
      await performBackgroundSync(true);
    } finally {
      setTimeout(() => setIsRefreshing(false), 450);
    }
  };

  // Navigation tab change handler
  const handleNavTabChange = (tab: ActiveNavTab) => {
    setActiveNavTab(tab);
    if (tab === 'inventario') {
      dbService.saveActiveModule('inventario').catch(() => {});
    } else {
      dbService.saveActiveModule('sc').catch(() => {});
    }
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // SC Handlers
  const handleOpenAdd = () => {
    setEditingSC(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sc: SC) => {
    setEditingSC(sc);
    setIsModalOpen(true);
  };

  const handleSaveSC = async (scData: Omit<SC, 'id'>, id?: string) => {
    try {
      if (id) {
        const updated = await dbService.updateSC(id, scData);
        setScs((prev) => prev.map((s) => (s.id === id ? updated : s)));
        showToast('SC atualizada com sucesso!', 'success');
        if (selectedSC?.id === id) {
          setSelectedSC(updated);
        }
      } else {
        const created = await dbService.createSC(scData);
        setScs((prev) => [created, ...prev]);
        showToast('SC adicionada com sucesso!', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Erro ao salvar SC.', 'error');
    }
  };

  // Quick interactive toggle for SC status with sensory feedback
  const handleToggleSCStatus = async (sc: SC) => {
    try {
      const isCompleting = sc.status !== 'Concluído';
      const newStatus = isCompleting ? 'Concluído' : 'Em andamento';
      const nowStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const newAuditEntry: AuditLogEntry = {
        id: `audit_${Date.now()}`,
        dataHora: nowStr,
        tipo: isCompleting ? 'Conclusão de SC' : 'Reabertura de SC',
        descricao: isCompleting
          ? `Solicitação ${sc.numero} marcada como CONCLUÍDA na tabela.`
          : `Solicitação ${sc.numero} REABERTA (Em andamento).`,
        usuario: 'Operador (Ação Rápida)',
      };

      const updatedHistory = [newAuditEntry, ...(sc.historicoAuditoria || [])];

      const updatedSC: SC = {
        ...sc,
        status: newStatus,
        ultimaAlteracao: {
          dataHora: nowStr,
          tipo: isCompleting ? 'Conclusão de SC' : 'Reabertura de SC',
          usuario: 'Operador',
        },
        historicoAuditoria: updatedHistory,
      };

      await dbService.saveSC(updatedSC);
      setScs((prev) => prev.map((s) => (s.id === sc.id ? updatedSC : s)));

      if (selectedSC?.id === sc.id) {
        setSelectedSC(updatedSC);
      }

      if (isCompleting) {
        showToast(`✨ SC ${sc.numero} concluída com sucesso!`, 'success');
      } else {
        showToast(`SC ${sc.numero} reaberta para atendimento.`, 'info');
      }
    } catch (err) {
      console.error('Erro ao alternar status da SC:', err);
      showToast('Erro ao atualizar status da SC.', 'error');
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    authService.setCurrentUser(user);
    setCurrentUser(user);
    showToast(`Perfil ativo: ${user.nome} (${user.role})`, 'info');
  };

  const handleReceiveItem = async (scId: string, itemId: string, newReceivedQty: number) => {
    try {
      const updatedSC = await dbService.receiveItem(scId, itemId, newReceivedQty, currentUser.nome);
      setScs((prev) => prev.map((s) => (s.id === scId ? updatedSC : s)));
      if (selectedSC?.id === scId) {
        setSelectedSC(updatedSC);
      }
      showToast('Entrada do produto registrada no Almoxarifado!', 'success');
    } catch (err) {
      console.error('Erro ao dar entrada no item:', err);
      showToast('Erro ao registrar recebimento do produto.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await dbService.deleteSC(deleteConfirmId);
      setScs((prev) => prev.filter((s) => s.id !== deleteConfirmId));
      if (selectedSC?.id === deleteConfirmId) {
        setSelectedSC(null);
      }
      setDeleteConfirmId(null);
      showToast('SC removida com sucesso.', 'info');
    } catch (err) {
      showToast('Erro ao excluir SC.', 'error');
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      prazo: 'todos',
      sort: 'data-desc',
    });
    showToast('Filtros limpos.', 'info');
  };

  const handleRMImport = async (importedSCs: SC[], mode: 'append' | 'replace') => {
    try {
      if (mode === 'replace') {
        await dbService.replaceAllSCs(importedSCs);
        setScs(importedSCs);
      } else {
        await dbService.bulkCreateSCs(importedSCs);
        const fresh = await dbService.getSCs();
        setScs(fresh);
      }
      setSelectedSC(null);
    } catch (err) {
      console.error('Erro ao importar solicitações RM:', err);
      showToast('Erro ao gravar dados no banco.', 'error');
    }
  };

  // Equipment Handlers
  const handleSaveEquipment = async (eq: Equipment) => {
    try {
      const saved = await dbService.saveEquipment(eq);
      setEquipments((prev) => {
        const idx = prev.findIndex((item) => item.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
      if (selectedEq?.id === saved.id) {
        setSelectedEq(saved);
      }
    } catch (err) {
      console.error('Erro ao salvar equipamento:', err);
      showToast('Erro ao salvar equipamento no banco de dados.', 'error');
    }
  };

  const handleBulkAddEquipments = async (newEquipments: Equipment[]) => {
    try {
      await dbService.replaceAllEquipments(newEquipments);
      setEquipments(newEquipments);
      showToast(`${newEquipments.length} equipamentos carregados no acervo com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err);
      showToast('Erro ao carregar lista de equipamentos.', 'error');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await dbService.deleteEquipment(id);
      setEquipments((prev) => prev.filter((e) => e.id !== id));
      if (selectedEq?.id === id) {
        setSelectedEq(null);
      }
      showToast('Equipamento removido do acervo.', 'info');
    } catch (err) {
      showToast('Erro ao remover equipamento.', 'error');
    }
  };

  const handleImportData = async (importedScs: SC[], importedEquipments?: Equipment[]) => {
    await dbService.clearAll();
    for (const sc of importedScs) {
      await dbService.createSC(sc);
    }
    if (importedEquipments && importedEquipments.length > 0) {
      for (const eq of importedEquipments) {
        await dbService.saveEquipment(eq);
      }
    }
    const freshData = await dbService.getSCs();
    const freshEq = await dbService.getEquipments();
    setScs(freshData);
    setEquipments(freshEq);
    setSelectedSC(null);
    setSelectedEq(null);
  };

  const handleClearAll = async () => {
    await dbService.clearAll();
    setScs([]);
    setEquipments([]);
    setSelectedSC(null);
    setSelectedEq(null);
  };

  const delayedCount = scs.filter((s) => isDelayed(s.data, s.status, 7)).length;
  const concluidasCount = scs.filter((s) => s.status === 'Concluído').length;
  const emAndamentoCount = scs.length - concluidasCount;
  const completionRate = scs.length > 0 ? Math.round((concluidasCount / scs.length) * 100) : 0;
  const vencendoBreveCount = scs.filter((s) => {
    if (s.status === 'Concluído') return false;
    const d = calcDays(s.data, s.status);
    return d >= 4 && d <= 7;
  }).length;
  const openSCs = scs.filter((s) => s.status === 'Em andamento');
  const totalOpenDays = openSCs.reduce((acc, s) => acc + calcDays(s.data, s.status), 0);
  const avgDays = openSCs.length > 0 ? Math.round(totalOpenDays / openSCs.length) : 0;

  const reminders = useMemo(() => {
    return scs.map((sc) => calculateSCReminderInfo(sc));
  }, [scs]);

  const urgentNotificationsCount = useMemo(() => {
    return reminders.filter(
      (r) => r.urgency === 'atrasada' || r.urgency === 'hoje' || r.urgency === 'breve'
    ).length;
  }, [reminders]);

  // Auto-switch navigation tab based on user permissions
  useEffect(() => {
    if (currentUser.role === 'admin') return;
    if (currentUser.canAccessSC === false && (activeNavTab === 'solicitacoes' || activeNavTab === 'indicadores' || activeNavTab === 'graficos')) {
      if (currentUser.canAccessInventario !== false) {
        setActiveNavTab('inventario');
      }
    } else if (currentUser.canAccessInventario === false && activeNavTab === 'inventario') {
      if (currentUser.canAccessSC !== false) {
        setActiveNavTab('solicitacoes');
      }
    }
  }, [currentUser, activeNavTab]);

  const handleRequestSelectUser = (targetUser: UserProfile) => {
    if (targetUser.id === currentUser.id) return;
    if (targetUser.password && targetUser.password.trim() !== '' && !authService.isSessionUnlocked(targetUser.id)) {
      setPendingAuthUser(targetUser);
      setIsPasswordModalOpen(true);
    } else {
      setCurrentUser(targetUser);
      setAuthenticatedUser(targetUser);
      authService.setCurrentUser(targetUser);
      if (targetUser.role !== 'admin') {
        if (targetUser.canAccessSC === false && targetUser.canAccessInventario !== false) {
          setActiveNavTab('inventario');
        } else if (targetUser.canAccessSC !== false) {
          setActiveNavTab('solicitacoes');
        }
      }
      showToast(`Perfil alterado para ${targetUser.nome} (${getRoleLabel(targetUser.role)})`, 'info');
    }
  };

  const handlePasswordSuccess = (authdUser: UserProfile) => {
    setCurrentUser(authdUser);
    setAuthenticatedUser(authdUser);
    authService.setCurrentUser(authdUser);
    if (authdUser.role !== 'admin') {
      if (authdUser.canAccessSC === false && authdUser.canAccessInventario !== false) {
        setActiveNavTab('inventario');
      } else if (authdUser.canAccessSC !== false) {
        setActiveNavTab('solicitacoes');
      }
    }
    showToast(`Autenticado com sucesso como ${authdUser.nome}!`, 'success');
  };

  const handleLogout = () => {
    authService.logout();
    setAuthenticatedUser(null);
    showToast('Sessão encerrada com sucesso.', 'info');
  };

  // Se não houver usuário autenticado, exibe a tela de login inicial
  if (!authenticatedUser) {
    return (
      <LoginScreen
        users={teamUsers}
        onLoginSuccess={(user) => {
          setAuthenticatedUser(user);
          setCurrentUser(user);
          if (user.role !== 'admin') {
            if (user.canAccessSC === false && user.canAccessInventario !== false) {
              setActiveNavTab('inventario');
            } else if (user.canAccessSC !== false) {
              setActiveNavTab('solicitacoes');
            }
          }
          showToast(`Bem-vindo ao MCM, ${user.nome}!`, 'success');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#161a24] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      {/* Unified Top Navigation Bar */}
      <Header
        activeNavTab={activeNavTab}
        isDrawerOpen={isDrawerOpen}
        scCount={scs.length}
        delayedCount={delayedCount}
        equipmentCount={equipments.length}
        urgentNotificationsCount={urgentNotificationsCount}
        theme={theme}
        currentUser={currentUser}
        users={teamUsers}
        cloudStatus={cloudStatus}
        lastSyncTime={lastSyncTime}
        onSelectUser={handleRequestSelectUser}
        onOpenAdminUsers={() => {
          setAdminInitialTab('users');
          setIsAdminOpen(true);
        }}
        onLogout={handleLogout}
        onRefreshCloud={handleRefreshLive}
        onNavTabChange={handleNavTabChange}
        onToggleTheme={handleToggleTheme}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenAdd={
          permissions.canCreateSC
            ? activeNavTab === 'inventario'
              ? () => {
                  setEditingEq(null);
                  setIsEqModalOpen(true);
                }
              : handleOpenAdd
            : undefined
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-5 pb-20 md:pb-6 flex flex-col gap-4 min-w-0">
        {currentUser.role !== 'admin' && currentUser.canAccessSC === false && currentUser.canAccessInventario === false ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#202634] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto my-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acesso aos Módulos Bloqueado</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Seu usuário ainda não possui permissões liberadas para o <strong>Painel de SC</strong> ou <strong>Inventários</strong>. Entre em contato com o Administrador do sistema para liberar seu acesso.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Sair da Conta
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* SCREEN 1: SOLICITAÇÕES (SC) - FOCO TOTAL NA LISTA */}
          {activeNavTab === 'solicitacoes' && (
            <motion.div
              key="screen-solicitacoes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="w-full min-w-0"
            >
              <SCTable
                scs={scs}
                filters={filters}
                permissions={permissions}
                currentUser={currentUser}
                isRefreshing={isRefreshing}
                onRefreshLive={handleRefreshLive}
                onFilterChange={setFilters}
                onSelectSC={(sc) => setSelectedSC(sc)}
                onEditSC={handleOpenEdit}
                onDeleteSC={(id) => setDeleteConfirmId(id)}
                onToggleSCStatus={handleToggleSCStatus}
                onOpenImportRM={() => setIsRMImportOpen(true)}
                onExportCSV={() => exportToCSV(scs)}
                onOpenAddSC={permissions.canCreateSC ? handleOpenAdd : undefined}
              />
            </motion.div>
          )}

          {/* SCREEN 2: INDICADORES & KPIS EXECUTIVOS */}
          {activeNavTab === 'indicadores' && (
            <motion.div
              key="screen-indicadores"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="flex flex-col gap-5"
            >
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                    Indicadores Executivos & KPIs
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Métricas de atendimento, acompanhamento de metas operacionais e prazos críticos
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavTabChange('solicitacoes')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all shadow-xs cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Ver Lista de SC</span>
                  </button>
                </div>
              </header>

              {/* Top Executive KPI Cards */}
              <KPICards scs={scs} />

              {/* Progress & Deadlines Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Completion Progress */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#202634] border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Taxa de Conclusão Global
                      </span>
                      <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-3 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-xs">
                      <div>
                        <span className="text-slate-400 block">Concluídas com Sucesso</span>
                        <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">
                          {concluidasCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Em Aberto / Processamento</span>
                        <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">
                          {emAndamentoCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleNavTabChange('graficos')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 pt-2 border-t border-slate-100 dark:border-slate-700/50 cursor-pointer self-start"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Ver Gráficos Detalhados</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Overdue / Critical Alerts */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#202634] border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Prazos & Solicitações Críticas
                      </span>
                      {delayedCount > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          {delayedCount} Atrasadas
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          100% no Prazo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                      {delayedCount > 0
                        ? `Atenção: Existem ${delayedCount} solicitações em aberto há mais de 7 dias úteis sem conclusão.`
                        : 'Excelente! Todas as solicitações em andamento estão dentro do prazo estipulado de 7 dias.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-xs">
                      <div>
                        <span className="text-slate-400 block">Vencendo em Breve (4-7d)</span>
                        <span className="text-base font-mono font-bold text-amber-600 dark:text-amber-400">
                          {vencendoBreveCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tempo Médio em Aberto</span>
                        <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">
                          {avgDays} dias
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, status: 'Em andamento', prazo: 'delayed' }));
                      handleNavTabChange('solicitacoes');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 pt-2 border-t border-slate-100 dark:border-slate-700/50 cursor-pointer self-start"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtrar Apenas Solicitações Atrasadas na Tabela</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status & Department Distribution Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <StatusChart scs={scs} />
                <DepartmentChart scs={scs} />
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: GRÁFICOS & ANÁLISE VISUAL */}
          {activeNavTab === 'graficos' && (
            <motion.div
              key="screen-graficos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <AnalyticsView scs={scs} />
            </motion.div>
          )}

          {/* SCREEN 4: INVENTÁRIO DE TI */}
          {activeNavTab === 'inventario' && (
            <motion.div
              key="screen-inventario"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <InventoryView
                equipments={equipments}
                searchQuery={filters.search}
                isRefreshing={isRefreshing}
                lastSyncTime={lastSyncTime}
                onRefreshLive={handleRefreshLive}
                onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val }))}
                onOpenAddModal={() => {
                  setEditingEq(null);
                  setIsEqModalOpen(true);
                }}
                onOpenEditModal={(eq) => {
                  setEditingEq(eq);
                  setIsEqModalOpen(true);
                }}
                onOpenDetailModal={(eq) => setSelectedEq(eq)}
                onDeleteEquipment={handleDeleteEquipment}
                onSaveEquipment={handleSaveEquipment}
                onBulkAddEquipments={handleBulkAddEquipments}
                onToast={showToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      {/* Modals & Drawers for SC */}
      <SCModal
        isOpen={isModalOpen}
        editingSC={editingSC}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSC}
        onToast={showToast}
      />

      <SCDetailDrawer
        sc={selectedSC}
        currentUser={currentUser}
        permissions={permissions}
        onClose={() => setSelectedSC(null)}
        onEdit={(sc) => handleOpenEdit(sc)}
        onDelete={(id) => setDeleteConfirmId(id)}
        onToggleStatus={handleToggleSCStatus}
        onReceiveItem={handleReceiveItem}
      />

      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Confirmar exclusão"
        message="Tem certeza que deseja remover esta Solicitação de Compra? Esta ação não poderá ser desfeita."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Modals for Equipment Inventory */}
      {isEqModalOpen && (
        <EquipmentModal
          isOpen={isEqModalOpen}
          editingEquipment={editingEq}
          onClose={() => setIsEqModalOpen(false)}
          onSave={handleSaveEquipment}
          onToast={showToast}
        />
      )}

      {selectedEq && (
        <EquipmentDetailModal
          equipment={selectedEq}
          onClose={() => setSelectedEq(null)}
          onEdit={(eq) => {
            setEditingEq(eq);
            setIsEqModalOpen(true);
          }}
          onDelete={handleDeleteEquipment}
          onSaveUpdated={handleSaveEquipment}
          onDuplicate={(eq) => {
            setEditingEq({
              ...eq,
              id: 'eq-' + Math.random().toString(36).substring(2, 9),
              codigoPatrimonio: '',
              nome: `${eq.nome} (Cópia)`,
              numeroSerie: '',
            });
            setIsEqModalOpen(true);
          }}
          onToast={showToast}
        />
      )}

      {/* RM Totvs Importer Modal */}
      {isRMImportOpen && (
        <RMImportModal
          isOpen={isRMImportOpen}
          onClose={() => setIsRMImportOpen(false)}
          existingSCs={scs}
          onImportSuccess={handleRMImport}
          onToast={showToast}
        />
      )}

      {/* Global System Modals */}
      {isNotificationsOpen && (
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          scs={scs}
          onSelectSC={(sc) => {
            setIsNotificationsOpen(false);
            setSelectedSC(sc);
          }}
          onToast={showToast}
        />
      )}

      {isAdminOpen && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          scs={scs}
          equipments={equipments}
          users={teamUsers}
          currentUser={currentUser}
          initialTab={adminInitialTab}
          onRefreshUsers={() => authService.loadUsers().then(setTeamUsers)}
          onImportData={handleImportData}
          onClearAll={handleClearAll}
          onToast={showToast}
        />
      )}

      {/* Password Authentication Modal for Protected Users */}
      {isPasswordModalOpen && pendingAuthUser && (
        <PasswordAuthModal
          isOpen={isPasswordModalOpen}
          user={pendingAuthUser}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPendingAuthUser(null);
          }}
          onSuccess={handlePasswordSuccess}
          onVerify={(userId, pass) => authService.verifyPassword(userId, pass)}
        />
      )}

      {/* Centralized Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          scs={scs}
          equipments={equipments}
          theme={theme}
          onSetTheme={(t) => setTheme(t)}
          onImportData={handleImportData}
          onClearAll={handleClearAll}
          onToast={showToast}
        />
      )}

      {/* Global Quick Search Component */}
      {isGlobalSearchOpen && (
        <GlobalSearch
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          scs={scs}
          equipments={equipments}
          onSelectSC={(sc) => {
            handleNavTabChange('solicitacoes');
            setSelectedSC(sc);
          }}
          onSelectEquipment={(eq) => {
            handleNavTabChange('inventario');
            setSelectedEq(eq);
          }}
          onApplyTableSearch={(query, targetMod) => {
            handleNavTabChange(targetMod === 'inventario' ? 'inventario' : 'solicitacoes');
            setFilters((prev) => ({ ...prev, search: query }));
            showToast(`Filtro aplicado: "${query}"`, 'info');
          }}
        />
      )}

      <KeyboardShortcuts
        onOpenAdd={
          activeNavTab !== 'inventario'
            ? handleOpenAdd
            : () => {
                setEditingEq(null);
                setIsEqModalOpen(true);
              }
        }
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <MobileBottomNav
        activeNavTab={activeNavTab}
        onNavTabChange={handleNavTabChange}
        scCount={scs.length}
        delayedCount={delayedCount}
        equipmentCount={equipments.length}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* App Hamburger Drawer Menu */}
      <AppDrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeNavTab={activeNavTab}
        onNavTabChange={handleNavTabChange}
        scCount={scs.length}
        delayedCount={delayedCount}
        equipmentCount={equipments.length}
        urgentNotificationsCount={urgentNotificationsCount}
        theme={theme}
        currentUser={currentUser}
        onToggleTheme={handleToggleTheme}
        onSetTheme={(t) => setTheme(t)}
        lastSyncTime={lastSyncTime}
        isRefreshing={isRefreshing}
        onRefreshLive={handleRefreshLive}
        onOpenAddSC={handleOpenAdd}
        onOpenAddEquipment={() => {
          setEditingEq(null);
          setIsEqModalOpen(true);
        }}
        onOpenRMImport={() => setIsRMImportOpen(true)}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAdminUsers={() => {
          setAdminInitialTab('users');
          setIsAdminOpen(true);
        }}
        onLogout={handleLogout}
        onFilterDelayed={() => {
          handleNavTabChange('solicitacoes');
          setFilters((prev) => ({ ...prev, status: 'Em andamento', prazo: 'delayed' }));
          showToast('Exibindo solicitações atrasadas', 'info');
        }}
        onExportAllCSV={() => {
          exportToCSV(scs);
          showToast('Relatório exportado em CSV!', 'success');
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  ShoppingCart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Plus,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SC, ThemeMode, FilterOptions, ToastMessage, Equipment, ActiveNavTab, AuditLogEntry, UserProfile, CloudSyncStatus, ResponsibilityTerm, SCStatus } from './types';
import { exportToCSV, calcDays } from './utils/storage';
import { useSlaSettings, isSCDelayed, isSCDueSoon, calculateSCReminderInfo } from './utils/sla';
import { dbService } from './services/dbService';
import { syncService } from './services/syncService';
import { authService, getRoleLabel } from './services/authService';
import {
  subscribeToFirestoreSCs,
  subscribeToFirestoreEquipments,
  subscribeToFirestoreTerms,
  subscribeToSyncStatus,
  testFirestoreConnection,
  fetchAllSCsFromFirestore,
  fetchAllEquipmentsFromFirestore,
  updateUserPresenceInFirestore,
} from './services/firebase';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { SCTable } from './components/SCTable';
import { SCDetailDrawer } from './components/SCDetailDrawer';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/Toast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { StatusChart } from './components/StatusChart';
import { DepartmentChart } from './components/DepartmentChart';
import { InventoryView } from './components/InventoryView';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { AppDrawerMenu } from './components/AppDrawerMenu';
import { LoginScreen } from './components/LoginScreen';
import { CommandPalette } from './components/CommandPalette';
import { AdminTab } from './components/AdminModal';

// Divisão de Código sob Demanda (Code-Splitting com React.lazy) para acelerar o carregamento inicial
const AnalyticsView = React.lazy(() => import('./components/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const ResponsibilityTermsView = React.lazy(() => import('./components/ResponsibilityTermsView').then((m) => ({ default: m.ResponsibilityTermsView })));
const SCModal = React.lazy(() => import('./components/SCModal').then((m) => ({ default: m.SCModal })));
const AdminModal = React.lazy(() => import('./components/AdminModal').then((m) => ({ default: m.AdminModal })));
const UserManagementModal = React.lazy(() => import('./components/UserManagementModal').then((m) => ({ default: m.UserManagementModal })));
const NotificationsModal = React.lazy(() => import('./components/NotificationsModal').then((m) => ({ default: m.NotificationsModal })));
const EquipmentModal = React.lazy(() => import('./components/EquipmentModal').then((m) => ({ default: m.EquipmentModal })));
const EquipmentDetailModal = React.lazy(() => import('./components/EquipmentDetailModal').then((m) => ({ default: m.EquipmentDetailModal })));
const RMImportModal = React.lazy(() => import('./components/RMImportModal').then((m) => ({ default: m.RMImportModal })));
const SCImageImportModal = React.lazy(() => import('./components/SCImageImportModal').then((m) => ({ default: m.SCImageImportModal })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const PasswordAuthModal = React.lazy(() => import('./components/PasswordAuthModal').then((m) => ({ default: m.PasswordAuthModal })));
const EditProfileModal = React.lazy(() => import('./components/EditProfileModal').then((m) => ({ default: m.EditProfileModal })));
const KioskModeView = React.lazy(() => import('./components/KioskModeView').then((m) => ({ default: m.KioskModeView })));

// Loading spinner discreto para módulos assíncronos
const LazyFallback: React.FC = () => (
  <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Carregando módulo...</span>
  </div>
);

// Função utilitária para normalizar centros de custo em todo o site e eliminar duplicatas de ID
const normalizeSCList = (list: SC[]): { list: SC[]; changed: number } => {
  let changed = 0;
  const seenIds = new Set<string>();
  const deduplicated: SC[] = [];

  for (const sc of list) {
    if (!sc) continue;
    const scId = sc.id || `sc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    if (seenIds.has(scId)) {
      changed++;
      continue;
    }
    seenIds.add(scId);

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
    if (hasChange || sc.id !== scId) {
      changed++;
      deduplicated.push({ ...sc, id: scId, solicitante: sol });
    } else {
      deduplicated.push(sc);
    }
  }
  return { list: deduplicated, changed };
};

const VALID_NAV_TABS: ActiveNavTab[] = ['solicitacoes', 'indicadores', 'graficos', 'inventario', 'termo-responsabilidade'];
const STORAGE_KEY_ACTIVE_NAV_TAB = 'mcm_active_nav_tab';

function getInitialActiveNavTab(): ActiveNavTab {
  try {
    if (typeof window !== 'undefined') {
      // 1. Prioridade: hash da URL (ex: #inventario)
      const hash = window.location.hash.replace('#', '').trim() as ActiveNavTab;
      if (VALID_NAV_TABS.includes(hash)) {
        return hash;
      }
      // 2. Parâmetro de busca da URL (ex: ?tab=inventario)
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ActiveNavTab;
      if (VALID_NAV_TABS.includes(tabParam)) {
        return tabParam;
      }
      // 3. Persistência local no navegador (mantém a aba mesmo após F5 ou refresh)
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_NAV_TAB) as ActiveNavTab;
      if (VALID_NAV_TABS.includes(saved)) {
        return saved;
      }
    }
  } catch {
    // Fallback silencioso
  }
  return 'solicitacoes';
}

export default function App() {
  // Navigation & Theme
  // Sempre que abrir no mobile (largura < 768px), o padrão será o tema Claro ('light')
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>(getInitialActiveNavTab);
  // Theme is locked strictly to light mode
  const [theme] = useState<ThemeMode>('light');

  // User Profile & Roles (Comprador, Almoxarifado, Gestor, Admin, Usuario)
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(() => authService.getAuthenticatedUser());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>(() => authService.getAvailableUsers());
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAuthUser, setPendingAuthUser] = useState<UserProfile | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('overview');

  const permissions = useMemo(() => authService.getPermissions(currentUser), [currentUser]);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('connected');

  // Sincroniza a aba ativa no localStorage e no histórico da URL (hash) para manter a posição mesmo ao atualizar a página (F5)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_NAV_TAB, activeNavTab);
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#${activeNavTab}`);
      }
    } catch {}
  }, [activeNavTab]);

  // Listener para quando o usuário clicar em links com hash ou navegar no histórico
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace('#', '').trim() as ActiveNavTab;
        if (VALID_NAV_TABS.includes(hash)) {
          setActiveNavTab(hash);
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Ajusta a aba ativa automaticamente se o usuário não tiver permissão para a aba atual
  useEffect(() => {
    if (permissions.canAccessAdmin) return;
    if (!permissions.canAccessSC && (activeNavTab === 'solicitacoes' || activeNavTab === 'indicadores' || activeNavTab === 'graficos')) {
      if (permissions.canAccessInventario) {
        setActiveNavTab('inventario');
      } else if (permissions.canAccessTermos) {
        setActiveNavTab('termo-responsabilidade');
      }
    } else if (!permissions.canAccessInventario && activeNavTab === 'inventario') {
      if (permissions.canAccessTermos) {
        setActiveNavTab('termo-responsabilidade');
      } else if (permissions.canAccessSC) {
        setActiveNavTab('solicitacoes');
      }
    } else if (!permissions.canAccessTermos && activeNavTab === 'termo-responsabilidade') {
      if (permissions.canAccessInventario) {
        setActiveNavTab('inventario');
      } else if (permissions.canAccessSC) {
        setActiveNavTab('solicitacoes');
      }
    }
  }, [permissions, activeNavTab]);

  // Core Data
  const [scs, setScs] = useState<SC[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [terms, setTerms] = useState<ResponsibilityTerm[]>([]);
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
    sort: 'numero-desc',
    dataInicio: '',
    dataFim: '',
    tipoData: 'abertura',
  });

  // Modal / Drawer visibility states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIPrintModalOpen, setIsAIPrintModalOpen] = useState(false);
  const [aiInitialSCData, setAiInitialSCData] = useState<Partial<SC> | null>(null);
  const [aiPastedImageFile, setAiPastedImageFile] = useState<File | Blob | null>(null);
  const [isRMImportOpen, setIsRMImportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
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
    }, 2200);
  };

  // Apply light theme only
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    document.body.classList.remove('dark');
    dbService.saveTheme('light').catch(() => {});
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+N, Ctrl+F, Esc, Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + K / Cmd + K -> Open Command Palette
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
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

      // Ctrl + , / Cmd + , -> Open Settings (Admin only)
      if (modifier && e.key === ',') {
        e.preventDefault();
        if (permissions.canAccessAdmin) {
          setIsSettingsOpen((prev) => !prev);
        }
        return;
      }

      // Ctrl + Shift + A -> Open Admin Modal (Admin only)
      if (modifier && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (permissions.canAccessAdmin) {
          setIsAdminOpen(true);
        }
        return;
      }

      // Escape -> Close Modals / Drawers / Palettes
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        else if (isDrawerOpen) setIsDrawerOpen(false);
        else if (isGlobalSearchOpen) setIsGlobalSearchOpen(false);
        else if (isNotificationsOpen) setIsNotificationsOpen(false);
        else if (isEditProfileOpen) setIsEditProfileOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isAIPrintModalOpen) setIsAIPrintModalOpen(false);
        else if (isModalOpen) setIsModalOpen(false);
        else if (isEqModalOpen) setIsEqModalOpen(false);
        else if (selectedSC) setSelectedSC(null);
        else if (selectedEq) setSelectedEq(null);
        else if (isAdminOpen) setIsAdminOpen(false);
        else if (isUsersModalOpen) setIsUsersModalOpen(false);
        else if (deleteConfirmId) setDeleteConfirmId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isDrawerOpen, isGlobalSearchOpen, isNotificationsOpen, isEditProfileOpen, isSettingsOpen, isAIPrintModalOpen, isModalOpen, isEqModalOpen, selectedSC, selectedEq, isAdminOpen, isUsersModalOpen, deleteConfirmId, activeNavTab]);

  // Global paste handler to detect screenshots (Ctrl+V) anywhere when on SC tab
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Ignore if user is inside an open modal or drawer
      if (isAIPrintModalOpen || isModalOpen || isEqModalOpen || isRMImportOpen) return;
      // Also prioritize active tab 'solicitacoes'
      if (activeNavTab !== 'solicitacoes') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setAiPastedImageFile(file);
            setIsAIPrintModalOpen(true);
            showToast('Print detectado! Abrindo IA para leitura dos materiais...', 'info');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isAIPrintModalOpen, isModalOpen, isEqModalOpen, isRMImportOpen, activeNavTab]);

  // Função para abrir o dropdown de equipe sofisticado no header
  const handleOpenTeamDropdown = () => {
    window.dispatchEvent(new CustomEvent('open-team-dropdown'));
  };

  const handleRefreshUsers = useCallback(async (immediateUser?: UserProfile) => {
    if (immediateUser) {
      setTeamUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === immediateUser.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = immediateUser;
          return next;
        }
        return [...prev, immediateUser];
      });
      setCurrentUser((prev) => {
        if (prev.id === immediateUser.id) {
          authService.setAuthenticatedUser(immediateUser);
          return immediateUser;
        }
        return prev;
      });
      setAuthenticatedUser((prev) => (prev && prev.id === immediateUser.id ? immediateUser : prev));
    }
    try {
      const updatedUsers = await authService.loadUsers();
      setTeamUsers(updatedUsers);
      setCurrentUser((prev) => {
        const fresh = updatedUsers.find((u) => u.id === prev.id);
        if (fresh) {
          authService.setAuthenticatedUser(fresh);
          return fresh;
        }
        return prev;
      });
      setAuthenticatedUser((prev) => {
        if (!prev) return null;
        const fresh = updatedUsers.find((u) => u.id === prev.id);
        return fresh || prev;
      });
    } catch (e) {
      console.error('Erro ao atualizar lista de usuários:', e);
    }
  }, []);

  const performBackgroundSync = async (notifyUser = false) => {
    try {
      const scData = await dbService.getSCs();
      const eqData = await dbService.getEquipments();
      const termData = await dbService.getTerms();
      const { list: normalized, changed } = normalizeSCList(scData);

      if (changed > 0) {
        await dbService.replaceAllSCs(normalized);
      }
      setScs(normalized);
      setEquipments(eqData);
      setTerms(termData);

      // Sincroniza também a lista de usuários e permissões da sessão ativa
      const usersData = await authService.loadUsers();
      if (usersData && usersData.length > 0) {
        setTeamUsers(usersData);
        setCurrentUser((prev) => {
          const fresh = usersData.find((u) => u.id === prev.id);
          return fresh || prev;
        });
        setAuthenticatedUser((prev) => {
          if (!prev) return null;
          const fresh = usersData.find((u) => u.id === prev.id);
          return fresh || prev;
        });
      }

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

        // Se ainda não houver preferência local de aba salva, consulta módulo do dbService
        const localSavedTab = localStorage.getItem(STORAGE_KEY_ACTIVE_NAV_TAB);
        if (!localSavedTab) {
          const savedModule = await dbService.getActiveModule();
          if (savedModule === 'inventario') {
            setActiveNavTab('inventario');
          }
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

    const unsubTerms = subscribeToFirestoreTerms((cloudTerms) => {
      setTerms(cloudTerms);
    });

    const unsubUsers = authService.subscribeUsers((cloudUsers) => {
      setTeamUsers(cloudUsers);
      // Sincroniza em tempo real as permissões da sessão ativa quando o administrador as altera
      setCurrentUser((prev) => {
        const fresh = cloudUsers.find((u) => u.id === prev.id);
        if (fresh) {
          authService.setAuthenticatedUser(fresh);
          return fresh;
        }
        return prev;
      });
      setAuthenticatedUser((prev) => {
        if (!prev) return null;
        const fresh = cloudUsers.find((u) => u.id === prev.id);
        return fresh || prev;
      });
    });

    const unsubBroadcast = syncService.subscribe((payload) => {
      if (payload?.action === 'USER_UPDATED' && payload?.data) {
        const freshUser: UserProfile = payload.data;
        setTeamUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === freshUser.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = freshUser;
            return copy;
          }
          return [...prev, freshUser];
        });
        setCurrentUser((prev) => {
          if (prev.id === freshUser.id) {
            authService.setAuthenticatedUser(freshUser);
            return freshUser;
          }
          return prev;
        });
        setAuthenticatedUser((prev) => (prev && prev.id === freshUser.id ? freshUser : prev));
      } else {
        performBackgroundSync(false);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performBackgroundSync(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOnline = () => {
      setCloudStatus('connected');
      performBackgroundSync(false);
      showToast('Conexão restabelecida! Dados sincronizados com a nuvem.', 'success');
    };

    const handleOffline = () => {
      setCloudStatus('offline');
      showToast('Você está no modo offline. Os dados continuam salvos no aparelho.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubStatus();
      unsubSCs();
      unsubEqs();
      unsubTerms();
      unsubUsers();
      unsubBroadcast();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Heartbeat de Presença (Online / Offline) em tempo real do Usuário Ativo
  useEffect(() => {
    if (!currentUser || !currentUser.id || currentUser.id === 'usr-quiosque' || currentUser.isKiosk || currentUser.role === 'kiosk') return;

    let isSubscribed = true;

    const updatePresence = async (status: boolean) => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        // Atualiza apenas o status de presença e lastSeen sem sobrescrever os demais campos do usuário
        await updateUserPresenceInFirestore(currentUser.id, status);
      } catch {
        // Silencioso se conexão de rede oscilar
      }
    };

    // Marca imediatamente como online ao autenticar/iniciar sessão
    updatePresence(true);

    // Heartbeat periódico (a cada 60 segundos) para manter status ativo
    const heartbeatInterval = setInterval(() => {
      if (isSubscribed) {
        updatePresence(true);
      }
    }, 60000);

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isSubscribed = false;
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id]);

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
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_NAV_TAB, tab);
    } catch {}
    if (tab === 'inventario') {
      dbService.saveActiveModule('inventario').catch(() => {});
    } else {
      dbService.saveActiveModule('sc').catch(() => {});
    }
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // SC Handlers memoized with useCallback
  const handleSelectSC = useCallback((sc: SC) => {
    setSelectedSC(sc);
  }, []);

  const handleDeleteSCConfirm = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleOpenImportRM = useCallback(() => {
    setIsRMImportOpen(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    exportToCSV(scs);
  }, [scs]);

  const handleOpenKioskMode = useCallback(() => {
    setIsKioskOpen(true);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingSC(null);
    setAiInitialSCData(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenAIPrintImport = useCallback((file?: File | Blob) => {
    setAiPastedImageFile(file || null);
    setIsAIPrintModalOpen(true);
  }, []);

  const handleOpenFullFormWithAIData = useCallback((data: Partial<SC>) => {
    setEditingSC(null);
    setAiInitialSCData(data);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((sc: SC) => {
    setEditingSC(sc);
    setIsModalOpen(true);
  }, []);

  const handleSaveSC = async (scData: Omit<SC, 'id'>, id?: string) => {
    try {
      if (id) {
        const updated = await dbService.updateSC(id, scData, currentUser?.nome);
        setScs((prev) => prev.map((s) => (s.id === id ? updated : s)));
        showToast('SC atualizada com sucesso!', 'success');
        if (selectedSC?.id === id) {
          setSelectedSC(updated);
        }
      } else {
        const created = await dbService.createSC(scData, currentUser?.nome);
        setScs((prev) => {
          if (prev.some((s) => s.id === created.id)) {
            return prev.map((s) => (s.id === created.id ? created : s));
          }
          return [created, ...prev];
        });
        showToast('SC adicionada com sucesso!', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar SC:', err);
      showToast('Erro ao salvar SC: ' + (err instanceof Error ? err.message : 'Falha na gravação'), 'error');
    }
  };

  // Quick interactive toggle for SC status with sensory feedback
  const handleToggleSCStatus = useCallback(async (sc: SC) => {
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
        showToast(`SC ${sc.numero} concluída com sucesso!`, 'success');
      } else {
        showToast(`SC ${sc.numero} reaberta para atendimento.`, 'info');
      }
    } catch (err) {
      console.error('Erro ao alternar status da SC:', err);
      showToast('Erro ao atualizar status da SC.', 'error');
    }
  }, [currentUser?.nome, selectedSC?.id]);

  const handleSelectUser = (user: UserProfile) => {
    authService.setCurrentUser(user);
    setCurrentUser(user);
    showToast(`Perfil ativo: ${user.nome} (${user.role})`, 'info');
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

  // Batch Actions Handlers for SCs
  const [batchDeleteIds, setBatchDeleteIds] = useState<string[] | null>(null);

  const handleBatchUpdateStatus = useCallback(
    async (targetSCs: SC[], newStatus: SCStatus) => {
      if (!targetSCs || targetSCs.length === 0) return;
      try {
        const nowStr =
          new Date().toLocaleDateString('pt-BR') +
          ' ' +
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isCompleting = newStatus === 'Concluído';

        const updatedList: SC[] = targetSCs.map((sc) => {
          const newAuditEntry: AuditLogEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            dataHora: nowStr,
            tipo: isCompleting ? 'Conclusão em Lote' : 'Reabertura em Lote',
            descricao: `Status alterado em lote para "${newStatus}".`,
            usuario: currentUser?.nome || 'Operador',
          };
          return {
            ...sc,
            status: newStatus,
            ultimaAlteracao: {
              dataHora: nowStr,
              tipo: isCompleting ? 'Conclusão em Lote' : 'Reabertura em Lote',
              usuario: currentUser?.nome || 'Operador',
            },
            historicoAuditoria: [newAuditEntry, ...(sc.historicoAuditoria || [])],
          };
        });

        await Promise.all(updatedList.map((sc) => dbService.saveSC(sc)));

        const targetMap = new Map(updatedList.map((s) => [s.id, s]));
        setScs((prev) => prev.map((s) => targetMap.get(s.id) || s));

        showToast(
          `${updatedList.length} ${
            updatedList.length === 1 ? 'solicitação atualizada' : 'solicitações atualizadas'
          } para "${newStatus}" com sucesso!`,
          'success'
        );
      } catch (err) {
        console.error('Erro ao atualizar solicitações em lote:', err);
        showToast('Erro ao atualizar solicitações em lote.', 'error');
      }
    },
    [currentUser?.nome]
  );

  const handleBatchDeleteRequest = useCallback((ids: string[]) => {
    setBatchDeleteIds(ids);
  }, []);

  const handleConfirmBatchDelete = async () => {
    if (!batchDeleteIds || batchDeleteIds.length === 0) return;
    try {
      await Promise.all(batchDeleteIds.map((id) => dbService.deleteSC(id)));
      const idSet = new Set(batchDeleteIds);
      setScs((prev) => prev.filter((s) => !idSet.has(s.id)));
      if (selectedSC && idSet.has(selectedSC.id)) {
        setSelectedSC(null);
      }
      showToast(
        `${batchDeleteIds.length} ${
          batchDeleteIds.length === 1 ? 'solicitação removida' : 'solicitações removidas'
        } com sucesso!`,
        'info'
      );
    } catch (err) {
      console.error('Erro na exclusão em lote:', err);
      showToast('Erro ao excluir solicitações em lote.', 'error');
    } finally {
      setBatchDeleteIds(null);
    }
  };

  const handleBatchExport = useCallback((targetSCs: SC[]) => {
    if (!targetSCs || targetSCs.length === 0) return;
    exportToCSV(targetSCs);
    showToast(
      `${targetSCs.length} ${
        targetSCs.length === 1 ? 'solicitação exportada' : 'solicitações exportadas'
      } para CSV!`,
      'success'
    );
  }, []);

  // Command Palette global listeners
  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpenPalette);
    window.addEventListener('open-global-search', handleOpenPalette);
    return () => {
      window.removeEventListener('open-command-palette', handleOpenPalette);
      window.removeEventListener('open-global-search', handleOpenPalette);
    };
  }, []);

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      prazo: 'todos',
      sort: 'data-desc',
      dataInicio: '',
      dataFim: '',
      tipoData: 'abertura',
    });
    showToast('Filtros limpos.', 'info');
  };

  const handleRMImport = async (importedSCs: SC[], mode: 'append' | 'replace') => {
    try {
      if (mode === 'replace') {
        const { list: normalized } = normalizeSCList(importedSCs);
        await dbService.replaceAllSCs(normalized);
        setScs(normalized);
      } else {
        await dbService.bulkCreateSCs(importedSCs);
        const fresh = await dbService.getSCs();
        const { list: normalized } = normalizeSCList(fresh);
        setScs(normalized);
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

  // Responsibility Term Handlers (Gerador de Termos)
  const handleSaveTerm = async (termToSave: ResponsibilityTerm) => {
    try {
      const saved = await dbService.saveTerm(termToSave);
      setTerms((prev) => {
        const idx = prev.findIndex((t) => t.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      showToast('Termo de responsabilidade gerado e salvo com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar termo:', err);
      showToast('Erro ao salvar termo de responsabilidade.', 'error');
    }
  };

  const handleDeleteTerm = async (id: string) => {
    try {
      await dbService.deleteTerm(id);
      setTerms((prev) => prev.filter((t) => t.id !== id));
      showToast('Termo de responsabilidade excluído com sucesso.', 'info');
    } catch (err) {
      console.error('Erro ao excluir termo:', err);
      showToast('Erro ao excluir termo de responsabilidade.', 'error');
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

  const slaSettings = useSlaSettings();
  const dueSoonMin = Math.max(1, Math.round(slaSettings.slaDaysWarning * 0.6));

  const delayedCount = scs.filter((s) => s.status !== 'Concluído' && isSCDelayed(s, slaSettings)).length;
  const concluidasCount = scs.filter((s) => s.status === 'Concluído').length;
  const emAndamentoCount = scs.length - concluidasCount;
  const completionRate = scs.length > 0 ? Math.round((concluidasCount / scs.length) * 100) : 0;
  const vencendoBreveCount = scs.filter((s) => s.status !== 'Concluído' && isSCDueSoon(s, slaSettings)).length;
  const openSCs = scs.filter((s) => s.status === 'Em andamento');
  const totalOpenDays = openSCs.reduce((acc, s) => acc + calcDays(s.data, s.status), 0);
  const avgDays = openSCs.length > 0 ? Math.round(totalOpenDays / openSCs.length) : 0;

  const reminders = useMemo(() => {
    return scs.map((sc) => calculateSCReminderInfo(sc, undefined, slaSettings));
  }, [scs, slaSettings]);

  const urgentNotificationsCount = useMemo(() => {
    return reminders.filter(
      (r) => r.urgency === 'atrasada' || r.urgency === 'hoje' || r.urgency === 'breve'
    ).length;
  }, [reminders]);

  // Global event listener for Kiosk mode
  useEffect(() => {
    const handleOpenKiosk = () => setIsKioskOpen(true);
    window.addEventListener('open-kiosk-mode', handleOpenKiosk);
    return () => window.removeEventListener('open-kiosk-mode', handleOpenKiosk);
  }, []);

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
        const userPerms = authService.getPermissions(targetUser);
        if (!userPerms.canAccessSC && userPerms.canAccessInventario) {
          setActiveNavTab('inventario');
        } else if (userPerms.canAccessSC) {
          setActiveNavTab('solicitacoes');
        } else if (userPerms.canAccessTermos) {
          setActiveNavTab('termo-responsabilidade');
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
      const userPerms = authService.getPermissions(authdUser);
      if (!userPerms.canAccessSC && userPerms.canAccessInventario) {
        setActiveNavTab('inventario');
      } else if (userPerms.canAccessSC) {
        setActiveNavTab('solicitacoes');
      } else if (userPerms.canAccessTermos) {
        setActiveNavTab('termo-responsabilidade');
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
          if (user.role !== 'admin' && !user.isKiosk && user.role !== 'kiosk') {
            const userPerms = authService.getPermissions(user);
            if (!userPerms.canAccessSC && userPerms.canAccessInventario) {
              setActiveNavTab('inventario');
            } else if (userPerms.canAccessSC) {
              setActiveNavTab('solicitacoes');
            } else if (userPerms.canAccessTermos) {
              setActiveNavTab('termo-responsabilidade');
            }
          }
          showToast(`Bem-vindo ao MCM, ${user.nome}!`, 'success');
        }}
      />
    );
  }

  // Se o usuário logado for o perfil Quiosque / TV, renderiza diretamente o Modo Quiosque em tela cheia com tema branco
  if (authenticatedUser.role === 'kiosk' || authenticatedUser.isKiosk || authenticatedUser.id === 'usr-quiosque') {
    return (
      <KioskModeView
        scs={scs}
        currentUser={currentUser}
        onClose={handleLogout}
        onLogout={handleLogout}
        onRefresh={handleRefreshLive}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans transition-colors duration-150 overflow-x-hidden w-full max-w-full">
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
        cloudStatus={isRefreshing ? 'syncing' : cloudStatus}
        lastSyncTime={lastSyncTime}
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
        onSelectUser={handleRequestSelectUser}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenAdminOverview={() => {
          setAdminInitialTab('overview');
          setIsAdminOpen(true);
        }}
        onOpenAdminUsers={() => setIsUsersModalOpen(true)}
        onOpenTeamModal={handleOpenTeamDropdown}
        onLogout={handleLogout}
        onRefreshCloud={handleRefreshLive}
        onNavTabChange={handleNavTabChange}
        onOpenGlobalSearch={() => {
          window.dispatchEvent(new CustomEvent('open-global-search'));
        }}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[2100px] mx-auto p-3 sm:p-5 lg:p-6 xl:px-8 pb-20 md:pb-6 flex flex-col gap-4 min-w-0">
        {!permissions.canAccessAdmin && !permissions.canAccessSC && !permissions.canAccessInventario && !permissions.canAccessTermos ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#202634] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto my-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acesso aos Módulos Bloqueado</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Seu usuário ainda não possui permissões liberadas para os módulos do sistema (<strong>Solicitações</strong>, <strong>Inventário TI</strong> ou <strong>Termo de Responsabilidade</strong>). Entre em contato com o Administrador do sistema para liberar seu acesso.
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
                loading={loading}
                isRefreshing={isRefreshing}
                onRefreshLive={handleRefreshLive}
                onFilterChange={setFilters}
                onSelectSC={handleSelectSC}
                onEditSC={handleOpenEdit}
                onDeleteSC={handleDeleteSCConfirm}
                onToggleSCStatus={handleToggleSCStatus}
                onOpenImportRM={handleOpenImportRM}
                onExportCSV={handleExportCSV}
                onOpenKioskMode={handleOpenKioskMode}
                onOpenAIPrintImport={permissions.canCreateSC ? () => handleOpenAIPrintImport() : undefined}
                onOpenAddSC={permissions.canCreateSC ? handleOpenAdd : undefined}
                onBatchUpdateStatus={handleBatchUpdateStatus}
                onBatchDelete={permissions.canDeleteSC ? handleBatchDeleteRequest : undefined}
                onBatchExport={handleBatchExport}
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
                        ? `Atenção: Existem ${delayedCount} solicitações em aberto há mais de ${slaSettings.slaDaysWarning} dias úteis sem conclusão.`
                        : `Excelente! Todas as solicitações em andamento estão dentro do prazo estipulado de ${slaSettings.slaDaysWarning} dias.`}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-xs">
                      <div>
                        <span className="text-slate-400 block">Vencendo em Breve ({dueSoonMin}-{slaSettings.slaDaysWarning}d)</span>
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
                      setFilters((prev) => ({ ...prev, status: 'Em andamento', prazo: 'atrasadas' }));
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
              <Suspense fallback={<LazyFallback />}>
                <AnalyticsView scs={scs} />
              </Suspense>
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

          {/* SCREEN 5: TERMO DE RESPONSABILIDADE */}
          {activeNavTab === 'termo-responsabilidade' && (
            <motion.div
              key="screen-termo-responsabilidade"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              <Suspense fallback={<LazyFallback />}>
                <ResponsibilityTermsView
                  terms={terms}
                  equipments={equipments}
                  users={teamUsers}
                  currentUser={currentUser}
                  onSaveTerm={handleSaveTerm}
                  onDeleteTerm={handleDeleteTerm}
                  onToast={showToast}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      <Suspense fallback={null}>
        {/* Modals & Drawers for SC */}
        {isModalOpen && (
          <SCModal
            isOpen={isModalOpen}
            editingSC={editingSC}
            initialData={aiInitialSCData}
            users={teamUsers}
            currentUser={currentUser}
            onClose={() => {
              setIsModalOpen(false);
              setAiInitialSCData(null);
            }}
            onSave={handleSaveSC}
            onToast={showToast}
            onOpenAIPrintImport={() => {
              setIsModalOpen(false);
              handleOpenAIPrintImport();
            }}
          />
        )}

        {isAIPrintModalOpen && (
          <SCImageImportModal
            isOpen={isAIPrintModalOpen}
            onClose={() => {
              setIsAIPrintModalOpen(false);
              setAiPastedImageFile(null);
            }}
            currentUser={currentUser}
            users={teamUsers}
            preloadedImageFile={aiPastedImageFile}
            onSaveSC={(scData) => handleSaveSC(scData)}
            onOpenFullFormWithData={handleOpenFullFormWithAIData}
            onToast={showToast}
          />
        )}

        <SCDetailDrawer
          sc={selectedSC}
          currentUser={currentUser}
          permissions={permissions}
          onClose={() => setSelectedSC(null)}
          onEdit={(sc) => handleOpenEdit(sc)}
          onDelete={(id) => setDeleteConfirmId(id)}
          onToggleStatus={handleToggleSCStatus}
        />

        <ConfirmModal
          isOpen={Boolean(deleteConfirmId)}
          title="Confirmar exclusão"
          message="Tem certeza que deseja remover esta Solicitação de Compra? Esta ação não poderá ser desfeita."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />

        <ConfirmModal
          isOpen={Boolean(batchDeleteIds && batchDeleteIds.length > 0)}
          title="Confirmar exclusão em lote"
          message={`Tem certeza que deseja excluir permanentemente as ${batchDeleteIds?.length || 0} solicitações selecionadas? Esta ação não poderá ser desfeita.`}
          onConfirm={handleConfirmBatchDelete}
          onCancel={() => setBatchDeleteIds(null)}
        />

      {/* Modals for Equipment Inventory */}
      {isEqModalOpen && (
        <EquipmentModal
          isOpen={isEqModalOpen}
          editingEquipment={editingEq}
          users={teamUsers}
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
          onOpenUsersModal={() => {
            setIsAdminOpen(false);
            setIsUsersModalOpen(true);
          }}
          onRefreshUsers={handleRefreshUsers}
          onImportData={handleImportData}
          onClearAll={handleClearAll}
          onToast={showToast}
        />
      )}

      {/* Standalone User Management & Permissions Modal */}
      {isUsersModalOpen && (
        <UserManagementModal
          isOpen={isUsersModalOpen}
          onClose={() => setIsUsersModalOpen(false)}
          users={teamUsers}
          currentUser={currentUser}
          onRefreshUsers={handleRefreshUsers}
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

      {/* Centralized Settings Modal (Admin Only) */}
      {isSettingsOpen && permissions.canAccessAdmin && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          scs={scs}
          equipments={equipments}
          theme={theme}
          onImportData={handleImportData}
          onClearAll={handleClearAll}
          onToast={showToast}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          user={currentUser}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={(updated) => {
            setCurrentUser(updated);
            setAuthenticatedUser(updated);
            authService.setAuthenticatedUser(updated);
            setTeamUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          }}
          onToast={showToast}
        />
      )}

      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcuts
        onOpenAdd={
          activeNavTab !== 'inventario'
            ? handleOpenAdd
            : () => {
                setEditingEq(null);
                setIsEqModalOpen(true);
              }
        }
        onOpenGlobalSearch={() => {
          window.dispatchEvent(new CustomEvent('open-global-search'));
        }}
        onOpenSettings={permissions.canAccessAdmin ? () => setIsSettingsOpen(true) : undefined}
      />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <MobileBottomNav
        activeNavTab={activeNavTab}
        onNavTabChange={handleNavTabChange}
        scCount={scs.length}
        delayedCount={delayedCount}
        equipmentCount={equipments.length}
        onOpenAdmin={() => {
          setAdminInitialTab('overview');
          setIsAdminOpen(true);
        }}
        isAdmin={currentUser.role === 'admin'}
        currentUser={currentUser}
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
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={() => {
          setAdminInitialTab('overview');
          setIsAdminOpen(true);
        }}
        onOpenAdminUsers={() => setIsUsersModalOpen(true)}
        onOpenTeamModal={handleOpenTeamDropdown}
        onLogout={handleLogout}
        onFilterDelayed={() => {
          handleNavTabChange('solicitacoes');
          setFilters((prev) => ({ ...prev, status: 'Em andamento', prazo: 'atrasadas' }));
          showToast('Exibindo solicitações atrasadas', 'info');
        }}
        onExportAllCSV={() => {
          exportToCSV(scs);
          showToast('Relatório exportado em CSV!', 'success');
        }}
      />

      {/* Kiosk Mode Fullscreen Overlay */}
      <AnimatePresence>
        {isKioskOpen && (
          <KioskModeView
            scs={scs}
            onClose={() => setIsKioskOpen(false)}
            onRefresh={handleRefreshLive}
          />
        )}
      </AnimatePresence>
      </Suspense>

      {/* Global Command Palette (Ctrl + K / Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        scs={scs}
        equipments={equipments}
        terms={terms}
        theme={theme}
        onSelectSC={handleSelectSC}
        onSelectEquipment={(eq) => setSelectedEq(eq)}
        onNavigateTab={handleNavTabChange}
        onOpenAddSC={handleOpenAdd}
        onOpenImportRM={handleOpenImportRM}
        onOpenAIPrintImport={() => handleOpenAIPrintImport()}
        onOpenAddEquipment={() => {
          setEditingEq(null);
          setIsEqModalOpen(true);
        }}
        onOpenKioskMode={handleOpenKioskMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportCSV={handleExportCSV}
      />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

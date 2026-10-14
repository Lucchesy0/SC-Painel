import { UserProfile, UserRole, UserPermissions, RolePermissions } from '../types';
import {
  fetchAllUsersFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  seedInitialUsersToFirestore,
  subscribeToFirestoreUsers,
} from './firebase';
import { syncService } from './syncService';

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canAccessSC: true,
  canAccessInventario: false, // Por padrão colaboradores não iniciam com inventário a menos que explicitamente concedido
  canAccessTermos: false,     // Por padrão colaboradores não iniciam com termos a menos que explicitamente concedido
  canAccessAnalytics: false,
  canAccessAdmin: false,
  canManageUsers: false,
  canCreateSC: true,
  canEditSC: true,
  canDeleteSC: false,
  canManageEquipments: false,
  canManageTermos: false,
  canExportReports: true,
  canImportData: false,
};

export const ADMIN_USER_PERMISSIONS: UserPermissions = {
  canAccessSC: true,
  canAccessInventario: true,
  canAccessTermos: true,
  canAccessAnalytics: true,
  canAccessAdmin: true,
  canManageUsers: true,
  canCreateSC: true,
  canEditSC: true,
  canDeleteSC: true,
  canManageEquipments: true,
  canManageTermos: true,
  canExportReports: true,
  canImportData: true,
};

export const INITIAL_ADMIN_USER: UserProfile = {
  id: 'usr-admin',
  nome: 'Luchesy (Admin)',
  email: 'luchesyn@mcm.com.br',
  cargo: 'Administrador Geral',
  role: 'admin',
  departamento: 'Diretoria & Administração Geral',
  avatarColor: 'bg-indigo-600',
  password: '104145', // Senha solicitada pelo usuário Luchesy
  requiresPassword: true,
  permissions: ADMIN_USER_PERMISSIONS,
  canAccessSC: true,
  canAccessInventario: true,
  canAccessTermos: true,
  canAccessAnalytics: true,
  canAccessAdmin: true,
  canManageUsers: true,
  isBuiltIn: true,
  createdAt: '2026-01-01',
};

export const INITIAL_KIOSK_USER: UserProfile = {
  id: 'usr-quiosque',
  nome: 'Painel Quiosque (TV)',
  email: 'quiosque@mcm.com.br',
  cargo: 'Monitoramento Quiosque / TV',
  role: 'kiosk',
  isKiosk: true,
  departamento: 'Compras / Almoxarifado / Painel TV',
  avatarColor: 'bg-orange-600',
  password: '', // Acesso direto sem senha obrigatória
  requiresPassword: false,
  permissions: {
    canAccessSC: true,
    canAccessInventario: false,
    canAccessTermos: false,
    canAccessAnalytics: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canCreateSC: false,
    canEditSC: false,
    canDeleteSC: false,
    canManageEquipments: false,
    canManageTermos: false,
    canExportReports: false,
    canImportData: false,
  },
  canAccessSC: true,
  canAccessInventario: false,
  canAccessTermos: false,
  canAccessAnalytics: false,
  canAccessAdmin: false,
  canManageUsers: false,
  isBuiltIn: true,
  createdAt: '2026-01-01',
};

export const DEFAULT_USERS: UserProfile[] = [INITIAL_ADMIN_USER, INITIAL_KIOSK_USER];

/**
 * Retorna as permissões efetivas do usuário de forma individualizada e granular
 */
export function getUserPermissions(user?: UserProfile | null): UserPermissions {
  if (!user) return DEFAULT_USER_PERMISSIONS;

  const isBuiltinAdmin = user.id === 'usr-admin' || user.role === 'admin';
  const isKiosk = user.id === 'usr-quiosque' || user.isKiosk === true || user.role === 'kiosk';
  const base = isBuiltinAdmin ? ADMIN_USER_PERMISSIONS : (isKiosk ? INITIAL_KIOSK_USER.permissions! : DEFAULT_USER_PERMISSIONS);
  const p = user.permissions || {};

  return {
    canAccessSC: p.canAccessSC !== undefined ? Boolean(p.canAccessSC) : (user.canAccessSC !== undefined ? Boolean(user.canAccessSC) : base.canAccessSC),
    canAccessInventario: p.canAccessInventario !== undefined ? Boolean(p.canAccessInventario) : (user.canAccessInventario !== undefined ? Boolean(user.canAccessInventario) : (isBuiltinAdmin ? true : false)),
    canAccessTermos: p.canAccessTermos !== undefined ? Boolean(p.canAccessTermos) : (user.canAccessTermos !== undefined ? Boolean(user.canAccessTermos) : (isBuiltinAdmin ? true : false)),
    canAccessAnalytics: p.canAccessAnalytics !== undefined ? Boolean(p.canAccessAnalytics) : (user.canAccessAnalytics !== undefined ? Boolean(user.canAccessAnalytics) : (isBuiltinAdmin ? true : false)),
    canAccessAdmin: p.canAccessAdmin !== undefined ? Boolean(p.canAccessAdmin) : (user.canAccessAdmin !== undefined ? Boolean(user.canAccessAdmin) : (isBuiltinAdmin ? true : false)),
    canManageUsers: p.canManageUsers !== undefined ? Boolean(p.canManageUsers) : (user.canManageUsers !== undefined ? Boolean(user.canManageUsers) : (isBuiltinAdmin ? true : false)),
    canCreateSC: p.canCreateSC !== undefined ? Boolean(p.canCreateSC) : base.canCreateSC,
    canEditSC: p.canEditSC !== undefined ? Boolean(p.canEditSC) : base.canEditSC,
    canDeleteSC: p.canDeleteSC !== undefined ? Boolean(p.canDeleteSC) : base.canDeleteSC,
    canManageEquipments: p.canManageEquipments !== undefined ? Boolean(p.canManageEquipments) : base.canManageEquipments,
    canManageTermos: p.canManageTermos !== undefined ? Boolean(p.canManageTermos) : (user.canManageTermos !== undefined ? Boolean(user.canManageTermos) : base.canManageTermos),
    canExportReports: p.canExportReports !== undefined ? Boolean(p.canExportReports) : base.canExportReports,
    canImportData: p.canImportData !== undefined ? Boolean(p.canImportData) : base.canImportData,
  };
}

/**
 * Retorna o título descritivo do perfil do usuário (Setor ou Administrador)
 */
export function getUserCargo(user?: UserProfile | null): string {
  if (!user) return 'Colaborador';
  if (user.role === 'admin' || user.id === 'usr-admin') return 'Administrador';
  if (user.role === 'kiosk') return 'Painel Quiosque';
  if (user.departamento && user.departamento.trim().length > 0) return user.departamento.trim();
  return 'Colaborador';
}

/**
 * Compatibilidade legada para obter permissões
 */
export function getRolePermissions(roleOrUser: UserRole | UserProfile): RolePermissions {
  if (typeof roleOrUser === 'object' && roleOrUser !== null) {
    return getUserPermissions(roleOrUser);
  }
  if (roleOrUser === 'admin') {
    return ADMIN_USER_PERMISSIONS;
  }
  return DEFAULT_USER_PERMISSIONS;
}

export function getRoleLabel(role?: string): string {
  if (!role) return 'Colaborador';
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Administrador';
    case 'kiosk':
    case 'quiosque':
      return 'Painel Quiosque';
    default:
      return 'Colaborador';
  }
}

export function getRoleBadgeClass(roleOrCargo?: string): { bg: string; text: string; border: string } {
  const norm = (roleOrCargo || '').toLowerCase();
  if (norm.includes('kiosk') || norm.includes('quiosque') || norm.includes('painel')) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
    };
  }
  if (norm.includes('admin')) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-500/30',
    };
  }
  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  };
}

/**
 * Determina se um perfil de usuário está Online (verde) ou Offline (vermelho)
 */
export function isUserOnline(
  user?: Partial<UserProfile> | { id?: string; name?: string; nome?: string; isOnline?: boolean; lastSeen?: string | number } | null,
  currentUser?: UserProfile | null
): boolean {
  if (!user) return false;

  // Se o dispositivo/navegador estiver desconectado da rede
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const userId = user.id;
  const userName = (user as any).nome || (user as any).name;

  // O usuário ativo nesta sessão/dispositivo está sempre Online
  if (currentUser) {
    if (userId && currentUser.id && userId === currentUser.id) return true;
    if (
      userName &&
      currentUser.nome &&
      userName.trim().toLowerCase() === currentUser.nome.trim().toLowerCase()
    ) {
      return true;
    }
  }

  // Se estiver explicitamente desligado
  if (user.isOnline === false) {
    return false;
  }

  // Se possui heartbeat / atividade recente nos últimos 5 minutos
  if (user.lastSeen) {
    const lastSeenTime = new Date(user.lastSeen).getTime();
    if (!isNaN(lastSeenTime)) {
      const diffMinutes = (Date.now() - lastSeenTime) / (1000 * 60);
      return diffMinutes <= 5;
    }
  }

  // Se marcado com isOnline: true no banco
  if (user.isOnline === true) {
    return true;
  }

  // Perfis sem sessão ativa estão Offline
  return false;
}

export interface UserActivityInfo {
  isOnline: boolean;
  statusLabel: string;
  exactTime: string;
  relativeTime: string;
  tooltipText: string;
}

/**
 * Retorna dados detalhados de presença e horário formatado da última aparição (lastSeen)
 */
export function getUserActivityInfo(
  user?: Partial<UserProfile> | { id?: string; name?: string; nome?: string; isOnline?: boolean; lastSeen?: string | number } | null,
  currentUser?: UserProfile | null
): UserActivityInfo {
  if (!user) {
    return {
      isOnline: false,
      statusLabel: 'Offline',
      exactTime: 'Não informado',
      relativeTime: 'Sem registro',
      tooltipText: 'Status: Offline • Nenhuma atividade recente registrada',
    };
  }

  const online = isUserOnline(user, currentUser);

  if (online) {
    return {
      isOnline: true,
      statusLabel: 'Online',
      exactTime: 'Neste momento',
      relativeTime: 'Agora mesmo',
      tooltipText: '🟢 Online agora • Operando no painel neste momento',
    };
  }

  if (!user.lastSeen) {
    return {
      isOnline: false,
      statusLabel: 'Offline',
      exactTime: 'Sem registro recente',
      relativeTime: 'Sem registro',
      tooltipText: '🔴 Offline • Nenhuma sessão recente registrada',
    };
  }

  const d = new Date(user.lastSeen);
  if (isNaN(d.getTime())) {
    return {
      isOnline: false,
      statusLabel: 'Offline',
      exactTime: 'Horário indisponível',
      relativeTime: 'Offline',
      tooltipText: '🔴 Offline • Horário da última sessão indisponível',
    };
  }

  const dateStr = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const now = Date.now();
  const diffMs = Math.max(0, now - d.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = '';
  if (diffMinutes < 1) {
    relative = 'Há menos de 1 minuto';
  } else if (diffMinutes < 60) {
    relative = `Há ${diffMinutes} min`;
  } else if (diffHours < 24) {
    relative = `Há ${diffHours}h ${diffMinutes % 60}min`;
  } else {
    relative = `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  }

  return {
    isOnline: false,
    statusLabel: 'Offline',
    exactTime: `${dateStr} às ${timeStr}`,
    relativeTime: relative,
    tooltipText: `🔴 Offline • Última atividade: ${dateStr} às ${timeStr} (${relative})`,
  };
}

export const STORAGE_KEY_AUTH_USER = 'mcm_authenticated_user_session';
export const STORAGE_KEY_AUTH_SESSIONS = 'mcm_unlocked_sessions';
export const STORAGE_KEY_CACHED_USERS = 'mcm_cached_team_users';

// Chaves de cache de sessão de ultra-baixa latência (sessionStorage) para carregamento instantâneo
export const SESSION_STORAGE_KEY_USER = 'mcm_session_user_profile';
export const SESSION_STORAGE_KEY_PERMISSIONS = 'mcm_session_user_permissions';
export const SESSION_STORAGE_KEY_USER_ID = 'mcm_session_user_id';
export const SESSION_STORAGE_KEY_TIMESTAMP = 'mcm_session_last_sync_time';

export const authService = {
  /**
   * Grava imediatamente a sessão ativa e os privilégios calculados no sessionStorage e localStorage
   */
  saveSessionCache(user: UserProfile): void {
    try {
      if (!user) return;
      if (!user.nome || typeof user.nome !== 'string' || user.nome.trim() === '') {
        user.nome = (user as any).name || (user as any).displayName || (user.email ? user.email.split('@')[0] : '') || 'Colaborador';
      }

      // Calcula os privilégios completos e individuais de forma determinística
      const perms = getUserPermissions(user);
      const userWithPerms: UserProfile = {
        ...user,
        permissions: perms,
        canAccessSC: perms.canAccessSC,
        canAccessInventario: perms.canAccessInventario,
        canAccessTermos: perms.canAccessTermos,
        canAccessAnalytics: perms.canAccessAnalytics,
        canAccessAdmin: perms.canAccessAdmin,
      };

      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(SESSION_STORAGE_KEY_USER, JSON.stringify(userWithPerms));
        sessionStorage.setItem(SESSION_STORAGE_KEY_PERMISSIONS, JSON.stringify(perms));
        sessionStorage.setItem(SESSION_STORAGE_KEY_USER_ID, user.id);
        sessionStorage.setItem(SESSION_STORAGE_KEY_TIMESTAMP, Date.now().toString());
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(userWithPerms));
        localStorage.setItem(SESSION_STORAGE_KEY_PERMISSIONS, JSON.stringify(perms));
      }
    } catch (e) {
      console.warn('Erro ao salvar cache de sessão no sessionStorage:', e);
    }
  },

  /**
   * Limpa integralmente o cache de sessão e privilégios do sessionStorage e localStorage
   */
  clearSessionCache(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY_USER);
        sessionStorage.removeItem(SESSION_STORAGE_KEY_PERMISSIONS);
        sessionStorage.removeItem(SESSION_STORAGE_KEY_USER_ID);
        sessionStorage.removeItem(SESSION_STORAGE_KEY_TIMESTAMP);
        sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSIONS);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY_AUTH_USER);
        localStorage.removeItem(SESSION_STORAGE_KEY_PERMISSIONS);
      }
    } catch (e) {
      console.warn('Erro ao limpar cache de sessão:', e);
    }
  },

  /**
   * Carrega instantaneamente os privilégios do usuário diretamente do sessionStorage
   * antes de qualquer sincronização assíncrona do Firebase, prevenindo flickering de botões.
   */
  getInstantSessionPermissions(user?: UserProfile | null): UserPermissions {
    try {
      // 1. Prioridade máxima: privilégios cacheados no sessionStorage da aba
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sessionPermsRaw = sessionStorage.getItem(SESSION_STORAGE_KEY_PERMISSIONS);
        if (sessionPermsRaw) {
          const parsed = JSON.parse(sessionPermsRaw);
          if (parsed && typeof parsed === 'object' && typeof parsed.canAccessSC === 'boolean') {
            return parsed as UserPermissions;
          }
        }
      }

      // 2. Segunda prioridade: localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const localPermsRaw = localStorage.getItem(SESSION_STORAGE_KEY_PERMISSIONS);
        if (localPermsRaw) {
          const parsed = JSON.parse(localPermsRaw);
          if (parsed && typeof parsed === 'object' && typeof parsed.canAccessSC === 'boolean') {
            if (window.sessionStorage) {
              sessionStorage.setItem(SESSION_STORAGE_KEY_PERMISSIONS, localPermsRaw);
            }
            return parsed as UserPermissions;
          }
        }
      }

      // 3. Terceira prioridade: calcula com base no usuário passado ou na sessão ativa
      const targetUser = user || this.getInstantSessionUser();
      if (targetUser) {
        const computed = getUserPermissions(targetUser);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(SESSION_STORAGE_KEY_PERMISSIONS, JSON.stringify(computed));
        }
        return computed;
      }
    } catch (e) {
      console.warn('Erro ao ler permissões instantâneas do sessionStorage:', e);
    }

    return DEFAULT_USER_PERMISSIONS;
  },

  /**
   * Retorna o usuário logado com máxima rapidez via sessionStorage, com fallback transparente para localStorage
   */
  getInstantSessionUser(): UserProfile | null {
    try {
      if (typeof window === 'undefined') return null;

      // 1. Tenta recuperar do sessionStorage (específico da aba ativa, síncrono e instantâneo)
      if (window.sessionStorage) {
        const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY_USER);
        if (sessionRaw) {
          const u: UserProfile = JSON.parse(sessionRaw);
          if (u && typeof u === 'object' && u.id) {
            const permsRaw = sessionStorage.getItem(SESSION_STORAGE_KEY_PERMISSIONS);
            if (permsRaw) {
              try {
                u.permissions = JSON.parse(permsRaw);
              } catch {}
            }
            if (!u.permissions) {
              u.permissions = getUserPermissions(u);
            }
            return u;
          }
        }
      }

      // 2. Fallback para localStorage (persistência entre abas ou nova aba na mesma máquina)
      if (window.localStorage) {
        const localRaw = localStorage.getItem(STORAGE_KEY_AUTH_USER);
        if (localRaw) {
          const u: UserProfile = JSON.parse(localRaw);
          if (u && typeof u === 'object' && u.id) {
            if (!u.nome || typeof u.nome !== 'string' || u.nome.trim() === '') {
              u.nome = (u as any).name || (u as any).displayName || (u.email ? u.email.split('@')[0] : '') || 'Colaborador';
            }
            // Higienização de integridade
            if (u.id !== 'usr-quiosque' && (u.isKiosk || u.role === 'kiosk')) {
              u.isKiosk = false;
              u.role = (u.id === 'usr-admin' || (u.cargo && u.cargo.toLowerCase().includes('admin'))) ? 'admin' : 'colaborador';
            }

            // Calcula privilégios e sincroniza o sessionStorage imediatamente
            const perms = getUserPermissions(u);
            u.permissions = perms;
            this.saveSessionCache(u);
            return u;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao obter usuário de sessão instantânea:', e);
    }
    return null;
  },

  /**
   * Retorna o usuário logado na sessão atual
   */
  getAuthenticatedUser(): UserProfile | null {
    const u = this.getInstantSessionUser();
    if (!u) return null;

    try {
      // Reconciliação imediata com o cache de usuários da equipe se disponível
      const cachedStr = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      if (cachedStr) {
        try {
          const cachedList: UserProfile[] = JSON.parse(cachedStr);
          const freshInCache = cachedList.find((item) => item.id === u.id);
          if (freshInCache) {
            const merged: UserProfile = {
              ...u,
              ...freshInCache,
              permissions: freshInCache.permissions || u.permissions || getUserPermissions(freshInCache),
            };
            this.saveSessionCache(merged);
            return merged;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Erro na reconciliação do usuário autenticado:', e);
    }

    return u;
  },

  /**
   * Sincroniza ativamente uma sessão de usuário em memória e cache
   */
  syncUserSession(user: UserProfile): void {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      let list: UserProfile[] = [];
      if (cached) {
        list = JSON.parse(cached);
      }
      const idx = list.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        list[idx] = user;
      } else {
        list.push(user);
      }
      localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(list));

      const current = this.getInstantSessionUser();
      if (current && current.id === user.id) {
        this.setAuthenticatedUser(user);
      }
      syncService.broadcast('USER_UPDATED', user);
    } catch (err) {
      console.warn('Erro ao sincronizar sessão de usuário:', err);
    }
  },

  /**
   * Define o usuário autenticado na sessão
   */
  setAuthenticatedUser(user: UserProfile): void {
    try {
      if (user && (!user.nome || typeof user.nome !== 'string' || user.nome.trim() === '')) {
        user.nome = (user as any).name || (user as any).displayName || (user.email ? user.email.split('@')[0] : '') || 'Colaborador';
      }
      this.saveSessionCache(user);
      this.markSessionUnlocked(user.id);

      // Garante que o cache de equipe também contenha o perfil atualizado
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      if (cached) {
        try {
          const list: UserProfile[] = JSON.parse(cached);
          const idx = list.findIndex((u) => u.id === user.id);
          if (idx >= 0) {
            list[idx] = user;
          } else {
            list.push(user);
          }
          localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(list));
        } catch {}
      }
    } catch (e) {
      console.error('Erro ao salvar sessão autenticada:', e);
    }
  },

  /**
   * Realiza logout da aplicação
   */
  logout(): void {
    try {
      this.clearSessionCache();
    } catch (e) {
      console.error('Erro ao efetuar logout:', e);
    }
  },

  /**
   * Retorna o usuário ativo ou um perfil seguro não-privilegiado
   */
  getCurrentUser(): UserProfile {
    const auth = this.getAuthenticatedUser();
    if (auth && auth.nome) return auth;
    return {
      id: 'usr-guest',
      nome: 'Colaborador',
      email: '',
      role: 'colaborador',
      departamento: 'Geral',
      permissions: DEFAULT_USER_PERMISSIONS,
    };
  },

  /**
   * Salva o usuário ativo
   */
  setCurrentUser(user: UserProfile): void {
    this.setAuthenticatedUser(user);
  },

  /**
   * Carrega todos os usuários da equipe do Firestore e limpa usuários de teste legados
   */
  async loadUsers(): Promise<UserProfile[]> {
    try {
      let users = await fetchAllUsersFromFirestore();

      // Limpeza de usuários de teste mock legados (Lucas, Carlos, Mariana)
      const mockIdsToDelete = ['usr-comprador', 'usr-almoxarifado', 'usr-gestor'];
      for (const mockId of mockIdsToDelete) {
        if (users.some((u) => u.id === mockId)) {
          try {
            await deleteUserFromFirestore(mockId);
          } catch (e) {
            console.warn('Erro ao remover usuário legado:', mockId, e);
          }
        }
      }

      // Garante que o Administrador Luchesy existe com a senha solicitada (104145)
      const adminInDb = users.find((u) => u.id === 'usr-admin');
      if (!adminInDb || adminInDb.password !== '104145' || adminInDb.nome !== 'Luchesy (Admin)' || adminInDb.role !== 'admin' || adminInDb.isKiosk) {
        await saveUserToFirestore(INITIAL_ADMIN_USER);
        const idx = users.findIndex((u) => u.id === 'usr-admin');
        if (idx >= 0) users[idx] = INITIAL_ADMIN_USER;
        else users.push(INITIAL_ADMIN_USER);
      }

      // Higienização no Firestore: nenhum usuário além de 'usr-quiosque' pode ter isKiosk=true ou role='kiosk'
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        if (u.id !== 'usr-quiosque' && (u.isKiosk === true || u.role === 'kiosk')) {
          const restoredRole = (u.id === 'usr-admin' || (u.cargo && u.cargo.toLowerCase().includes('admin'))) ? 'admin' : 'colaborador';
          const cleaned: UserProfile = {
            ...u,
            isKiosk: false,
            role: restoredRole,
          };
          users[i] = cleaned;
          try {
            await saveUserToFirestore(cleaned);
          } catch (errClean) {
            console.warn('Erro ao restaurar usuário corrompido com perfil de quiosque:', u.id, errClean);
          }
        }
      }

      if (!users || users.length === 0) {
        users = await seedInitialUsersToFirestore(DEFAULT_USERS);
      }

      // Filtra qualquer item de mock que tenha sobrado
      users = users.filter((u) => !mockIdsToDelete.includes(u.id));

      localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(users));

      // Sincroniza a sessão ativa local caso o usuário atual esteja na lista atualizada do Firestore
      const currentAuth = this.getAuthenticatedUser();
      if (currentAuth) {
        const fresh = users.find((u) => u.id === currentAuth.id);
        if (fresh) {
          this.setAuthenticatedUser(fresh);
        }
      }

      return users;
    } catch (err) {
      console.warn('Erro ao buscar usuários do Firestore, utilizando fallback:', err);
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      return DEFAULT_USERS;
    }
  },

  /**
   * Retorna lista em cache de usuários
   */
  getAvailableUsers(): UserProfile[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mockIds = ['usr-comprador', 'usr-almoxarifado', 'usr-gestor'];
          return parsed.filter((u) => !mockIds.includes(u.id));
        }
      }
    } catch {}
    return DEFAULT_USERS;
  },

  /**
   * Real-time subscription para a lista de usuários da equipe
   */
  subscribeUsers(onData: (users: UserProfile[]) => void) {
    const mockIds = ['usr-comprador', 'usr-almoxarifado', 'usr-gestor'];
    return subscribeToFirestoreUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        const cleanList = cloudUsers.filter((u) => !mockIds.includes(u.id));
        localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(cleanList));

        // Sincroniza em tempo real a sessão ativa local caso o admin tenha alterado permissões no Firestore
        const currentAuth = this.getAuthenticatedUser();
        if (currentAuth) {
          const fresh = cleanList.find((u) => u.id === currentAuth.id);
          if (fresh) {
            this.setAuthenticatedUser(fresh);
          }
        }

        onData(cleanList.length > 0 ? cleanList : DEFAULT_USERS);
      } else {
        seedInitialUsersToFirestore(DEFAULT_USERS).then((seeded) => {
          localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(seeded));
          onData(seeded);
        });
      }
    });
  },

  /**
   * Autenticar usuário por Nome de Usuário / E-mail e Senha
   */
  async authenticateByCredentials(
    identifier: string,
    passwordAttempt: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const rawId = identifier.trim().toLowerCase();
    if (!rawId) {
      return { success: false, error: 'Por favor, informe seu usuário ou e-mail.' };
    }

    const users = await this.loadUsers();
    
    // Busca flexível: por e-mail, nome exato, primeiro nome, username (parte antes do @) ou id
    const matchedUser = users.find((u) => {
      const email = u.email.toLowerCase();
      const nome = u.nome.toLowerCase();
      const id = u.id.toLowerCase();
      const emailUsername = email.split('@')[0];

      return (
        email === rawId ||
        nome === rawId ||
        id === rawId ||
        emailUsername === rawId ||
        nome.startsWith(rawId)
      );
    });

    if (!matchedUser) {
      return { success: false, error: 'Usuário não encontrado. Verifique o login digitado.' };
    }

    // Se o usuário não exigir senha
    if (!matchedUser.password || matchedUser.password.trim() === '') {
      this.setAuthenticatedUser(matchedUser);
      return { success: true, user: matchedUser };
    }

    // Valida senha
    if (matchedUser.password.trim() === passwordAttempt.trim()) {
      this.setAuthenticatedUser(matchedUser);
      return { success: true, user: matchedUser };
    }

    return { success: false, error: 'Senha incorreta. Tente novamente.' };
  },

  /**
   * Autenticar usuário com senha
   */
  async verifyPassword(userId: string, passwordAttempt: string): Promise<boolean> {
    const users = await this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return false;

    // Se o usuário não tiver senha configurada, autoriza direto
    if (!user.password || user.password.trim() === '') {
      this.markSessionUnlocked(userId);
      return true;
    }

    if (user.password === passwordAttempt.trim()) {
      this.markSessionUnlocked(userId);
      return true;
    }

    return false;
  },

  /**
   * Verifica se a sessão do usuário já foi destravada neste navegador
   */
  isSessionUnlocked(userId: string): boolean {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSIONS);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        return list.includes(userId);
      }
    } catch {}
    return false;
  },

  markSessionUnlocked(userId: string): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSIONS);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(userId)) {
        list.push(userId);
        sessionStorage.setItem(STORAGE_KEY_AUTH_SESSIONS, JSON.stringify(list));
      }
    } catch {}
  },

  lockSession(userId: string): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSIONS);
      if (raw) {
        const list: string[] = JSON.parse(raw).filter((id: string) => id !== userId);
        sessionStorage.setItem(STORAGE_KEY_AUTH_SESSIONS, JSON.stringify(list));
      }
    } catch {}
  },

  /**
   * Criar novo usuário na equipe (Apenas Admin)
   */
  async createUser(userData: {
    nome: string;
    email: string;
    cargo?: string;
    role?: string;
    departamento: string;
    password?: string;
    avatarColor?: string;
    permissions?: Partial<UserPermissions>;
    canAccessSC?: boolean;
    canAccessInventario?: boolean;
    canAccessTermos?: boolean;
    canManageTermos?: boolean;
  }): Promise<UserProfile> {
    const id = 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const colors = [
      'bg-blue-600',
      'bg-emerald-600',
      'bg-purple-600',
      'bg-orange-600',
      'bg-pink-600',
      'bg-teal-600',
      'bg-indigo-600',
    ];
    const chosenColor = userData.avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const cleanCargo = (userData.cargo || userData.role || 'Colaborador').trim();
    const isSpecialAdmin = cleanCargo.toLowerCase().includes('admin') || userData.role === 'admin';
    const basePerms = isSpecialAdmin ? ADMIN_USER_PERMISSIONS : DEFAULT_USER_PERMISSIONS;

    const mergedPermissions: UserPermissions = {
      ...basePerms,
      ...(userData.permissions || {}),
    };
    if (userData.canAccessSC !== undefined) mergedPermissions.canAccessSC = userData.canAccessSC;
    if (userData.canAccessInventario !== undefined) mergedPermissions.canAccessInventario = userData.canAccessInventario;
    if (userData.canAccessTermos !== undefined) mergedPermissions.canAccessTermos = userData.canAccessTermos;
    if (userData.canManageTermos !== undefined) mergedPermissions.canManageTermos = userData.canManageTermos;

    const newUser: UserProfile = {
      id,
      nome: userData.nome.trim(),
      email: userData.email.trim().toLowerCase(),
      cargo: cleanCargo,
      role: isSpecialAdmin ? 'admin' : (userData.role || 'usuario'),
      departamento: (userData.departamento || 'Geral').trim(),
      avatarColor: chosenColor,
      password: userData.password?.trim() || undefined,
      requiresPassword: Boolean(userData.password && userData.password.trim().length > 0),
      permissions: mergedPermissions,
      canAccessSC: mergedPermissions.canAccessSC,
      canAccessInventario: mergedPermissions.canAccessInventario,
      canAccessTermos: mergedPermissions.canAccessTermos,
      canManageTermos: mergedPermissions.canManageTermos,
      canAccessAnalytics: mergedPermissions.canAccessAnalytics,
      canAccessAdmin: mergedPermissions.canAccessAdmin,
      canManageUsers: mergedPermissions.canManageUsers,
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    };

    await saveUserToFirestore(newUser);

    // Atualiza imediatamente o cache de usuários local e propaga
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      const list: UserProfile[] = cached ? JSON.parse(cached) : [];
      list.push(newUser);
      localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(list));
    } catch {}

    syncService.broadcast('USER_UPDATED', newUser);
    return newUser;
  },

  /**
   * Atualizar usuário existente (Apenas Admin)
   */
  async updateUser(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile | null> {
    const users = await this.loadUsers();
    const existing = users.find((u) => u.id === userId);
    if (!existing) return null;

    const existingPerms = getUserPermissions(existing);
    const updatedPerms: UserPermissions = {
      ...existingPerms,
      ...(updateData.permissions || {}),
    };

    if (updateData.canAccessSC !== undefined) updatedPerms.canAccessSC = updateData.canAccessSC;
    if (updateData.canAccessInventario !== undefined) updatedPerms.canAccessInventario = updateData.canAccessInventario;
    if (updateData.canAccessTermos !== undefined) updatedPerms.canAccessTermos = updateData.canAccessTermos;
    if (updateData.canManageTermos !== undefined) updatedPerms.canManageTermos = updateData.canManageTermos;
    if (updateData.canAccessAnalytics !== undefined) updatedPerms.canAccessAnalytics = updateData.canAccessAnalytics;
    if (updateData.canAccessAdmin !== undefined) updatedPerms.canAccessAdmin = updateData.canAccessAdmin;
    if (updateData.canManageUsers !== undefined) updatedPerms.canManageUsers = updateData.canManageUsers;

    const updated: UserProfile = {
      ...existing,
      ...updateData,
      cargo: updateData.cargo !== undefined ? updateData.cargo : existing.cargo,
      permissions: updatedPerms,
      canAccessSC: updatedPerms.canAccessSC,
      canAccessInventario: updatedPerms.canAccessInventario,
      canAccessTermos: updatedPerms.canAccessTermos,
      canManageTermos: updatedPerms.canManageTermos,
      canAccessAnalytics: updatedPerms.canAccessAnalytics,
      canAccessAdmin: updatedPerms.canAccessAdmin,
      canManageUsers: updatedPerms.canManageUsers,
      requiresPassword:
        updateData.password !== undefined
          ? Boolean(updateData.password && updateData.password.trim().length > 0)
          : existing.requiresPassword,
    };

    await saveUserToFirestore(updated);

    // Atualiza imediatamente o cache de usuários local
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
      let list: UserProfile[] = [];
      if (cached) {
        list = JSON.parse(cached);
      }
      const idx = list.findIndex((u) => u.id === userId);
      if (idx >= 0) {
        list[idx] = updated;
      } else {
        list.push(updated);
      }
      localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(list));
    } catch {}

    // Se atualizou o usuário autenticado na sessão ativa, reflete no estado
    const current = this.getAuthenticatedUser();
    if (current && current.id === userId) {
      this.setAuthenticatedUser(updated);
    }

    // Propaga via broadcast instantâneo para todas as abas / janelas
    syncService.broadcast('USER_UPDATED', updated);

    return updated;
  },

  /**
   * Excluir usuário da equipe (Apenas Admin)
   */
  async deleteUser(userId: string): Promise<boolean> {
    if (userId === 'usr-admin') {
      throw new Error('O usuário Administrador principal não pode ser excluído.');
    }
    await deleteUserFromFirestore(userId);
    return true;
  },

  getPermissions(userOrRole?: UserProfile | string): RolePermissions {
    if (typeof userOrRole === 'object' && userOrRole !== null) {
      const sessionUser = this.getInstantSessionUser();
      if (sessionUser && sessionUser.id === userOrRole.id) {
        return this.getInstantSessionPermissions(userOrRole);
      }
      return getUserPermissions(userOrRole);
    }
    if (typeof userOrRole === 'string') {
      return getRolePermissions(userOrRole);
    }
    return this.getInstantSessionPermissions();
  },
};

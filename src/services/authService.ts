import { UserProfile, UserRole, UserPermissions, RolePermissions } from '../types';
import {
  fetchAllUsersFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  seedInitialUsersToFirestore,
  subscribeToFirestoreUsers,
} from './firebase';

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canAccessSC: true,
  canAccessInventario: true,
  canAccessAnalytics: true,
  canAccessAdmin: false,
  canManageUsers: false,
  canCreateSC: true,
  canEditSC: true,
  canDeleteSC: false,
  canReceiveItems: true,
  canManageEquipments: false,
  canExportReports: true,
  canImportData: false,
};

export const ADMIN_USER_PERMISSIONS: UserPermissions = {
  canAccessSC: true,
  canAccessInventario: true,
  canAccessAnalytics: true,
  canAccessAdmin: true,
  canManageUsers: true,
  canCreateSC: true,
  canEditSC: true,
  canDeleteSC: true,
  canReceiveItems: true,
  canManageEquipments: true,
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
    canAccessAnalytics: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canCreateSC: false,
    canEditSC: false,
    canDeleteSC: false,
    canReceiveItems: false,
    canManageEquipments: false,
    canExportReports: false,
    canImportData: false,
  },
  canAccessSC: true,
  canAccessInventario: false,
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
  const base = isBuiltinAdmin ? ADMIN_USER_PERMISSIONS : DEFAULT_USER_PERMISSIONS;
  const p = user.permissions || {};

  return {
    canAccessSC: p.canAccessSC ?? user.canAccessSC ?? base.canAccessSC,
    canAccessInventario: p.canAccessInventario ?? user.canAccessInventario ?? base.canAccessInventario,
    canAccessAnalytics: p.canAccessAnalytics ?? user.canAccessAnalytics ?? base.canAccessAnalytics,
    canAccessAdmin: p.canAccessAdmin ?? user.canAccessAdmin ?? (isBuiltinAdmin ? true : base.canAccessAdmin),
    canManageUsers: p.canManageUsers ?? user.canManageUsers ?? (isBuiltinAdmin ? true : base.canManageUsers),
    canCreateSC: p.canCreateSC ?? base.canCreateSC,
    canEditSC: p.canEditSC ?? base.canEditSC,
    canDeleteSC: p.canDeleteSC ?? base.canDeleteSC,
    canReceiveItems: p.canReceiveItems ?? base.canReceiveItems,
    canManageEquipments: p.canManageEquipments ?? base.canManageEquipments,
    canExportReports: p.canExportReports ?? base.canExportReports,
    canImportData: p.canImportData ?? base.canImportData,
  };
}

/**
 * Retorna o título descritivo do Cargo / Função do usuário
 */
export function getUserCargo(user?: UserProfile | null): string {
  if (!user) return 'Colaborador';
  if (user.cargo && user.cargo.trim().length > 0) return user.cargo.trim();
  if (user.role === 'admin' || user.id === 'usr-admin') return 'Administrador Geral';
  if (user.role) return getRoleLabel(user.role);
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
      return 'Administrador Geral';
    case 'kiosk':
    case 'quiosque':
      return 'Painel Quiosque / TV';
    case 'usuario':
      return 'Colaborador';
    case 'comprador':
      return 'Comprador';
    case 'almoxarifado':
      return 'Almoxarifado';
    case 'gestor':
      return 'Gestor / Diretoria';
    default:
      return role;
  }
}

export function getRoleBadgeClass(roleOrCargo?: string): { bg: string; text: string; border: string } {
  const norm = (roleOrCargo || '').toLowerCase();
  if (norm.includes('kiosk') || norm.includes('quiosque') || norm.includes('painel tv')) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
    };
  }
  if (norm.includes('admin') || norm.includes('diretor') || norm.includes('gerente')) {
    return {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500/30',
    };
  }
  if (norm.includes('compra') || norm.includes('suprimento')) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
    };
  }
  if (norm.includes('almoxarif') || norm.includes('estoque') || norm.includes('logístic')) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
    };
  }
  if (norm.includes('ti') || norm.includes('sistemas') || norm.includes('técnic') || norm.includes('analista')) {
    return {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-500/30',
    };
  }
  return {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
  };
}

const STORAGE_KEY_AUTH_USER = 'mcm_authenticated_user_session';
const STORAGE_KEY_AUTH_SESSIONS = 'mcm_unlocked_sessions';
const STORAGE_KEY_CACHED_USERS = 'mcm_cached_team_users';

export const authService = {
  /**
   * Retorna o usuário logado na sessão atual
   */
  getAuthenticatedUser(): UserProfile | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao ler usuário autenticado:', e);
    }
    return null;
  },

  /**
   * Define o usuário autenticado na sessão
   */
  setAuthenticatedUser(user: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
      this.markSessionUnlocked(user.id);
    } catch (e) {
      console.error('Erro ao salvar sessão autenticada:', e);
    }
  },

  /**
   * Realiza logout da aplicação
   */
  logout(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
      sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSIONS);
    } catch (e) {
      console.error('Erro ao efetuar logout:', e);
    }
  },

  /**
   * Retorna o usuário ativo ou o Admin padrão
   */
  getCurrentUser(): UserProfile {
    const auth = this.getAuthenticatedUser();
    if (auth) return auth;
    return INITIAL_ADMIN_USER;
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
      const adminInDb = users.find((u) => u.id === 'usr-admin' || u.role === 'admin');
      if (!adminInDb || adminInDb.password !== '104145' || adminInDb.nome !== 'Luchesy (Admin)') {
        await saveUserToFirestore(INITIAL_ADMIN_USER);
      }

      // Recarrega do banco após higienização
      users = await fetchAllUsersFromFirestore();
      if (!users || users.length === 0) {
        users = await seedInitialUsersToFirestore(DEFAULT_USERS);
      }

      // Filtra qualquer item de mock que tenha sobrado
      users = users.filter((u) => !mockIdsToDelete.includes(u.id));

      localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(users));
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
      canAccessAnalytics: mergedPermissions.canAccessAnalytics,
      canAccessAdmin: mergedPermissions.canAccessAdmin,
      canManageUsers: mergedPermissions.canManageUsers,
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    };

    await saveUserToFirestore(newUser);
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
      canAccessAnalytics: updatedPerms.canAccessAnalytics,
      canAccessAdmin: updatedPerms.canAccessAdmin,
      canManageUsers: updatedPerms.canManageUsers,
      requiresPassword:
        updateData.password !== undefined
          ? Boolean(updateData.password && updateData.password.trim().length > 0)
          : existing.requiresPassword,
    };

    await saveUserToFirestore(updated);

    // Se atualizou o usuário autenticado na sessão ativa, reflete no estado
    const current = this.getAuthenticatedUser();
    if (current && current.id === userId) {
      this.setAuthenticatedUser(updated);
    }

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
      return getUserPermissions(userOrRole);
    }
    if (typeof userOrRole === 'string') {
      return getRolePermissions(userOrRole);
    }
    return getUserPermissions(this.getCurrentUser());
  },
};

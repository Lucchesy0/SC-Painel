import { UserProfile, UserRole, RolePermissions } from '../types';
import {
  fetchAllUsersFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  seedInitialUsersToFirestore,
  subscribeToFirestoreUsers,
} from './firebase';

export const INITIAL_ADMIN_USER: UserProfile = {
  id: 'usr-admin',
  nome: 'Luchesy (Admin)',
  email: 'luchesyn@mcm.com.br',
  role: 'admin',
  departamento: 'Diretoria & Administração Geral',
  avatarColor: 'bg-indigo-600',
  password: '104145', // Senha solicitada pelo usuário Luchesy
  requiresPassword: true,
  canAccessSC: true,
  canAccessInventario: true,
  isBuiltIn: true,
  createdAt: '2026-01-01',
};

export const DEFAULT_USERS: UserProfile[] = [INITIAL_ADMIN_USER];

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'admin':
      return {
        canCreateSC: true,
        canEditSC: true,
        canDeleteSC: true,
        canReceiveItems: true,
        canManageEquipments: true,
        canAccessSettings: true,
        canExportReports: true,
      };
    case 'usuario':
    case 'comprador':
    case 'almoxarifado':
    case 'gestor':
      return {
        canCreateSC: true, // Usuários comuns podem criar e adicionar SCs
        canEditSC: true,
        canDeleteSC: false,
        canReceiveItems: true,
        canManageEquipments: role === 'almoxarifado',
        canAccessSettings: false, // Apenas o Administrador acessa configurações e gestão de usuários
        canExportReports: true,
      };
    default:
      return {
        canCreateSC: true,
        canEditSC: true,
        canDeleteSC: false,
        canReceiveItems: false,
        canManageEquipments: false,
        canAccessSettings: false,
        canExportReports: true,
      };
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador Geral';
    case 'usuario':
      return 'Usuário Comum';
    case 'comprador':
      return 'Comprador (Suprimentos)';
    case 'almoxarifado':
      return 'Almoxarifado (Recebimento)';
    case 'gestor':
      return 'Gestor / Diretoria';
    default:
      return 'Colaborador';
  }
}

export function getRoleBadgeClass(role: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'admin':
      return {
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-500/30',
      };
    case 'usuario':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/30',
      };
    case 'comprador':
      return {
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-500/30',
      };
    case 'almoxarifado':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
      };
    case 'gestor':
      return {
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-500/30',
      };
    default:
      return {
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-500/30',
      };
  }
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
    role: UserRole;
    departamento: string;
    password?: string;
    avatarColor?: string;
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

    const newUser: UserProfile = {
      id,
      nome: userData.nome.trim(),
      email: userData.email.trim().toLowerCase(),
      role: userData.role,
      departamento: userData.departamento.trim(),
      avatarColor: chosenColor,
      password: userData.password?.trim() || undefined,
      requiresPassword: Boolean(userData.password && userData.password.trim().length > 0),
      canAccessSC: userData.canAccessSC ?? true,
      canAccessInventario: userData.canAccessInventario ?? true,
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

    const updated: UserProfile = {
      ...existing,
      ...updateData,
      canAccessSC: updateData.canAccessSC !== undefined ? updateData.canAccessSC : (existing.canAccessSC ?? true),
      canAccessInventario: updateData.canAccessInventario !== undefined ? updateData.canAccessInventario : (existing.canAccessInventario ?? true),
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

  getPermissions(role?: UserRole): RolePermissions {
    const r = role || this.getCurrentUser().role;
    return getRolePermissions(r);
  },
};

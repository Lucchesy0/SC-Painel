import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  KeyRound,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  X,
  Search,
  Building,
  Mail,
  Shield,
  ShoppingCart,
  Boxes,
  BarChart2,
  Check,
  FileSpreadsheet,
  Download,
  Settings,
  Sparkles,
  Sliders,
  CheckSquare,
  Square,
} from 'lucide-react';
import { UserProfile, UserPermissions } from '../types';
import {
  getUserPermissions,
  getUserCargo,
  getRoleBadgeClass,
  DEFAULT_USER_PERMISSIONS,
  ADMIN_USER_PERMISSIONS,
  authService,
} from '../services/authService';

interface UserManagementTabProps {
  users?: UserProfile[];
  currentUser: UserProfile;
  onRefreshUsers: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users = [],
  currentUser,
  onRefreshUsers,
  onToast,
}) => {
  const safeUsers = Array.isArray(users) && users.length > 0 ? users : authService.getAvailableUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    cargo: string;
    departamento: string;
    password: string;
    avatarColor: string;
    permissions: UserPermissions;
  }>({
    nome: '',
    email: '',
    cargo: 'Comprador',
    departamento: 'Suprimentos & Compras',
    password: '',
    avatarColor: 'bg-slate-700',
    permissions: { ...DEFAULT_USER_PERMISSIONS },
  });

  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    { label: 'Grafite', class: 'bg-slate-700' },
    { label: 'Laranja', class: 'bg-orange-600' },
    { label: 'Azul', class: 'bg-blue-600' },
    { label: 'Esmeralda', class: 'bg-emerald-600' },
    { label: 'Índigo', class: 'bg-indigo-600' },
    { label: 'Roxo', class: 'bg-purple-600' },
    { label: 'Ciano', class: 'bg-cyan-700' },
  ];

  // Sugestões rápidas de preenchimento de cargo para agilidade do usuário
  const cargoSuggestions = [
    'Comprador',
    'Almoxarifado / Recebimento',
    'Analista de Suprimentos',
    'Coordenador de TI',
    'Técnico de Campo',
    'Gestor / Diretoria',
    'Administrador Geral',
    'Assistente Administrativo',
    'Engenheiro de Obras',
  ];

  const handleOpenAdd = () => {
    setFormData({
      nome: '',
      email: '',
      cargo: 'Comprador',
      departamento: 'Suprimentos',
      password: '',
      avatarColor: 'bg-slate-700',
      permissions: { ...DEFAULT_USER_PERMISSIONS },
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    const userPerms = getUserPermissions(user);
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      cargo: getUserCargo(user),
      departamento: user.departamento || 'Geral',
      password: user.password || '',
      avatarColor: user.avatarColor || 'bg-slate-700',
      permissions: { ...userPerms },
    });
  };

  // Helper para atualizar uma permissão específica
  const handleTogglePermission = (key: keyof UserPermissions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  // Presets rápidos opcionais (para preencher checkboxes com 1 clique se o admin desejar)
  const applyPreset = (type: 'total' | 'compras' | 'almoxarife' | 'ti' | 'consulta') => {
    if (type === 'total') {
      setFormData((prev) => ({ ...prev, permissions: { ...ADMIN_USER_PERMISSIONS } }));
    } else if (type === 'compras') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...DEFAULT_USER_PERMISSIONS,
          canAccessSC: true,
          canCreateSC: true,
          canEditSC: true,
          canDeleteSC: false,
          canReceiveItems: true,
          canAccessAnalytics: true,
          canExportReports: true,
        },
      }));
    } else if (type === 'almoxarife') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...DEFAULT_USER_PERMISSIONS,
          canAccessSC: true,
          canCreateSC: false,
          canEditSC: false,
          canDeleteSC: false,
          canReceiveItems: true,
          canAccessInventario: true,
          canManageEquipments: true,
          canExportReports: true,
        },
      }));
    } else if (type === 'ti') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...DEFAULT_USER_PERMISSIONS,
          canAccessInventario: true,
          canManageEquipments: true,
          canAccessAnalytics: true,
          canExportReports: true,
          canImportData: true,
        },
      }));
    } else if (type === 'consulta') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          canAccessSC: true,
          canAccessInventario: true,
          canAccessAnalytics: true,
          canAccessAdmin: false,
          canManageUsers: false,
          canCreateSC: false,
          canEditSC: false,
          canDeleteSC: false,
          canReceiveItems: false,
          canManageEquipments: false,
          canExportReports: true,
          canImportData: false,
        },
      }));
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.email.trim()) {
      onToast('Preencha o nome e e-mail do usuário.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.createUser({
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        cargo: formData.cargo.trim() || 'Colaborador',
        departamento: formData.departamento.trim() || 'Geral',
        password: formData.password ? formData.password.trim() : undefined,
        avatarColor: formData.avatarColor,
        permissions: formData.permissions,
        canAccessSC: formData.permissions.canAccessSC,
        canAccessInventario: formData.permissions.canAccessInventario,
      });
      onToast(`Usuário ${formData.nome} cadastrado com sucesso.`, 'success');
      setIsAddModalOpen(false);
      onRefreshUsers();
    } catch (err) {
      console.error('Erro ao cadastrar usuário:', err);
      onToast('Erro ao cadastrar usuário.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.nome.trim() || !formData.email.trim()) {
      onToast('Preencha o nome e e-mail do usuário.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.updateUser(editingUser.id, {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        cargo: formData.cargo.trim() || 'Colaborador',
        departamento: formData.departamento.trim() || 'Geral',
        password: formData.password ? formData.password.trim() : undefined,
        avatarColor: formData.avatarColor,
        permissions: formData.permissions,
        canAccessSC: formData.permissions.canAccessSC,
        canAccessInventario: formData.permissions.canAccessInventario,
        canAccessAnalytics: formData.permissions.canAccessAnalytics,
        canAccessAdmin: formData.permissions.canAccessAdmin,
        canManageUsers: formData.permissions.canManageUsers,
      });
      onToast(`Usuário ${formData.nome} atualizado com sucesso.`, 'success');
      setEditingUser(null);
      onRefreshUsers();
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      onToast('Erro ao atualizar dados do usuário.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    setIsSubmitting(true);
    try {
      const trimmed = newPassword.trim();
      await authService.updateUser(passwordModalUser.id, {
        password: trimmed ? trimmed : undefined,
        requiresPassword: Boolean(trimmed.length > 0),
      });
      onToast(
        trimmed
          ? `Senha de ${passwordModalUser.nome} alterada com sucesso.`
          : `Senha de ${passwordModalUser.nome} removida com sucesso.`,
        'success'
      );
      setPasswordModalUser(null);
      setNewPassword('');
      onRefreshUsers();
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      onToast('Erro ao atualizar senha do usuário.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await authService.deleteUser(userToDelete.id);
      onToast(`Usuário ${userToDelete.nome} excluído.`, 'info');
      setUserToDelete(null);
      onRefreshUsers();
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      onToast((err as Error).message || 'Erro ao excluir usuário.', 'error');
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return safeUsers.filter((user) => {
      const term = searchTerm.trim().toLowerCase();
      const cargo = getUserCargo(user).toLowerCase();
      const depto = (user.departamento || '').toLowerCase();
      const nome = user.nome.toLowerCase();
      const email = user.email.toLowerCase();

      const matchesSearch =
        term === '' ||
        nome.includes(term) ||
        email.includes(term) ||
        cargo.includes(term) ||
        depto.includes(term);

      const perms = getUserPermissions(user);

      if (filterType === 'sc') return matchesSearch && perms.canAccessSC;
      if (filterType === 'inventario') return matchesSearch && perms.canAccessInventario;
      if (filterType === 'admin') return matchesSearch && (perms.canAccessAdmin || perms.canManageUsers);
      if (filterType === 'password') return matchesSearch && Boolean(user.password && user.password.trim().length > 0);

      return matchesSearch;
    });
  }, [safeUsers, searchTerm, filterType]);

  // Render do bloco de configuração de permissões
  const renderPermissionsConfig = () => (
    <div className="space-y-3 pt-2 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Sliders className="w-3.5 h-3.5 text-slate-700" />
          <span>Permissões Personalizadas do Usuário</span>
        </div>

        {/* Presets Rápidos */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-400 mr-1 hidden sm:inline">Modelos rápidos:</span>
          <button
            type="button"
            onClick={() => applyPreset('total')}
            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium cursor-pointer"
            title="Conceder todas as permissões"
          >
            Total
          </button>
          <button
            type="button"
            onClick={() => applyPreset('compras')}
            className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium cursor-pointer"
            title="Configurar foco em Solicitações de Compra"
          >
            Compras
          </button>
          <button
            type="button"
            onClick={() => applyPreset('almoxarife')}
            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium cursor-pointer"
            title="Configurar foco em Almoxarifado e Recebimento"
          >
            Almoxarifado
          </button>
          <button
            type="button"
            onClick={() => applyPreset('consulta')}
            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
            title="Somente visualização e consulta"
          >
            Consulta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Bloco 1: Módulos de Acesso */}
        <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            <Boxes className="w-3.5 h-3.5 text-slate-500" />
            <span>Módulos de Acesso</span>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canAccessSC}
                onChange={() => handleTogglePermission('canAccessSC')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Painel de Solicitações (SC)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canAccessInventario}
                onChange={() => handleTogglePermission('canAccessInventario')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Inventário de TI / Ativos</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canAccessAnalytics}
                onChange={() => handleTogglePermission('canAccessAnalytics')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Indicadores & Gráficos</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canAccessAdmin}
                onChange={() => handleTogglePermission('canAccessAdmin')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Painel Administrativo</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canManageUsers}
                onChange={() => handleTogglePermission('canManageUsers')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Gestão de Usuários</span>
            </label>
          </div>
        </div>

        {/* Bloco 2: Ações em Solicitações */}
        <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
            <span>Operações de Compras (SC)</span>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canCreateSC}
                onChange={() => handleTogglePermission('canCreateSC')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Criar Novas Solicitações</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canEditSC}
                onChange={() => handleTogglePermission('canEditSC')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Editar Dados de SCs</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canDeleteSC}
                onChange={() => handleTogglePermission('canDeleteSC')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span className="text-red-700 font-medium">Excluir Solicitações</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canReceiveItems}
                onChange={() => handleTogglePermission('canReceiveItems')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Recebimento / Almoxarifado</span>
            </label>
          </div>
        </div>

        {/* Bloco 3: TI e Dados */}
        <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>TI, Relatórios & Dados</span>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canManageEquipments}
                onChange={() => handleTogglePermission('canManageEquipments')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Gerenciar Equipamentos TI</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canExportReports}
                onChange={() => handleTogglePermission('canExportReports')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Exportar Dados (PDF / Excel / CSV)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canImportData}
                onChange={() => handleTogglePermission('canImportData')}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Importar Planilhas de Dados</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar colaborador, cargo, e-mail ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">Todos os Colaboradores ({safeUsers.length})</option>
            <option value="sc">Com Acesso a SCs</option>
            <option value="inventario">Com Acesso a TI</option>
            <option value="admin">Acesso Administrativo</option>
            <option value="password">Com Senha de Acesso</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-4 min-w-[220px]">Colaborador</th>
                <th className="py-3 px-4 min-w-[160px]">Cargo / Função</th>
                <th className="py-3 px-4 min-w-[130px]">Setor</th>
                <th className="py-3 px-4 min-w-[240px]">Permissões de Acesso</th>
                <th className="py-3 px-4 min-w-[120px]">Autenticação</th>
                <th className="py-3 px-4 text-right min-w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMe = currentUser.id === user.id;
                  const hasPassword = Boolean(user.password && user.password.trim().length > 0);
                  const cargo = getUserCargo(user);
                  const badge = getRoleBadgeClass(cargo);
                  const perms = getUserPermissions(user);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isMe ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-md ${
                              user.avatarColor || 'bg-slate-700'
                            } text-white flex items-center justify-center font-semibold text-xs shrink-0`}
                          >
                            {user.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                              <span className="truncate">{user.nome}</span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo / Função Badge */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {cargo}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap align-middle">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.departamento || 'Geral'}</span>
                        </span>
                      </td>

                      {/* Permissions Badges (Organizado em Linha Única) */}
                      <td className="py-3 px-4 align-middle">
                        {perms.canAccessAdmin && perms.canManageUsers ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">
                            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Acesso Total (Administrador)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5">
                            {perms.canAccessSC && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200/80 whitespace-nowrap shrink-0"
                                title="Acesso ao Painel de Solicitações de Compra"
                              >
                                <ShoppingCart className="w-3 h-3 text-orange-500 shrink-0" />
                                <span>SC</span>
                              </span>
                            )}
                            {perms.canAccessInventario && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/80 whitespace-nowrap shrink-0"
                                title="Acesso ao Inventário de TI e Ativos"
                              >
                                <Boxes className="w-3 h-3 text-cyan-600 shrink-0" />
                                <span>TI</span>
                              </span>
                            )}
                            {perms.canAccessAnalytics && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap shrink-0"
                                title="Acesso a Gráficos e Indicadores"
                              >
                                <BarChart2 className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>Gráficos</span>
                              </span>
                            )}
                            {perms.canReceiveItems && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shrink-0"
                                title="Permissão para registrar Recebimento de Itens no Almoxarifado"
                              >
                                <span>Recebimento</span>
                              </span>
                            )}
                            {perms.canDeleteSC && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shrink-0"
                                title="Permissão para Excluir Solicitações de Compra"
                              >
                                <span>Excluir SC</span>
                              </span>
                            )}
                            {perms.canManageEquipments && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200/80 whitespace-nowrap shrink-0"
                                title="Permissão para Gerenciar Equipamentos de TI"
                              >
                                <span>Ativos TI</span>
                              </span>
                            )}
                            {!perms.canAccessSC && !perms.canAccessInventario && !perms.canAccessAnalytics && (
                              <span className="text-slate-400 text-xs italic whitespace-nowrap">
                                Sem permissões ativas
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Password Status */}
                      <td className="py-3 px-4 whitespace-nowrap align-middle">
                        {hasPassword ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Com Senha</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Unlock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Sem Senha</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap align-middle">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordModalUser(user);
                              setNewPassword(user.password || '');
                            }}
                            title="Definir Senha de Acesso"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            title="Editar Cargo, Dados e Permissões"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              title="Excluir Usuário"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>{filteredUsers.length} colaborador{filteredUsers.length !== 1 ? 'es' : ''} listado{filteredUsers.length !== 1 ? 's' : ''}</span>
          <span>Sincronização em tempo real com Firestore</span>
        </div>
      </div>

      {/* Datalist com sugestões rápidas de cargo */}
      <datalist id="cargo-suggestions">
        {cargoSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Modal: Add User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Novo Colaborador</h3>
                <p className="text-xs text-slate-500 mt-0.5">Cadastre o usuário e configure suas respectivas permissões no sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@mcm.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cargo / Função na Empresa
                  </label>
                  <input
                    type="text"
                    list="cargo-suggestions"
                    placeholder="Ex: Comprador Sênior, Almoxarife, Analista de TI..."
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Departamento / Setor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Suprimentos, Logística, TI, Obras..."
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Senha Inicial de Acesso (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Sem senha se vazio"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Cor do Avatar
                  </label>
                  <div className="flex items-center gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.class}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarColor: c.class })}
                        className={`w-6 h-6 rounded-md ${c.class} text-white flex items-center justify-center cursor-pointer transition-transform ${
                          formData.avatarColor === c.class ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : 'opacity-80'
                        }`}
                      >
                        {formData.avatarColor === c.class && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloco de Permissões Granulares */}
              {renderPermissionsConfig()}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Editar Usuário & Permissões</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ajuste os dados e permissões individuais de {editingUser.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cargo / Função na Empresa
                  </label>
                  <input
                    type="text"
                    list="cargo-suggestions"
                    placeholder="Ex: Comprador, Almoxarife, Analista de TI..."
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Departamento / Setor
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Cor do Avatar
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.class}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatarColor: c.class })}
                      className={`w-6 h-6 rounded-md ${c.class} text-white flex items-center justify-center cursor-pointer transition-transform ${
                        formData.avatarColor === c.class ? 'ring-2 ring-offset-1 ring-slate-900 scale-105' : 'opacity-80'
                      }`}
                    >
                      {formData.avatarColor === c.class && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bloco de Permissões Granulares */}
              {renderPermissionsConfig()}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Set/Change Password */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <h3 className="text-sm font-semibold text-slate-900">
                Senha: {passwordModalUser.nome}
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nova Senha de Acesso
                </label>
                <input
                  type="text"
                  placeholder="Deixe em branco para remover a senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Caso permaneça vazia, o colaborador poderá alternar para seu perfil sem exigência de senha.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-semibold text-sm text-slate-900">Excluir Colaborador</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja remover o usuário <strong>{userToDelete.nome}</strong> ({userToDelete.email})?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer shadow-2xs"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

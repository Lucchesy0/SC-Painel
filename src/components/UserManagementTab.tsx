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
  Clock,
  Radio,
  FileCheck,
  LayoutGrid,
  List,
} from 'lucide-react';
import { UserProfile, UserPermissions } from '../types';
import {
  getUserPermissions,
  getUserCargo,
  getRoleBadgeClass,
  DEFAULT_USER_PERMISSIONS,
  ADMIN_USER_PERMISSIONS,
  authService,
  isUserOnline,
  getUserActivityInfo,
} from '../services/authService';
import { UserPresenceBadge } from './UserPresenceBadge';

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
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Contagem de usuários Online vs Offline
  const { onlineCount, offlineCount } = useMemo(() => {
    let online = 0;
    safeUsers.forEach((u) => {
      if (isUserOnline(u, currentUser)) {
        online++;
      }
    });
    return {
      onlineCount: online,
      offlineCount: safeUsers.length - online,
    };
  }, [safeUsers, currentUser]);

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
  const applyPreset = (type: 'total' | 'compras' | 'ti' | 'termos' | 'inventario' | 'consulta') => {
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
          canAccessAnalytics: true,
          canExportReports: true,
        },
      }));
    } else if (type === 'ti') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...DEFAULT_USER_PERMISSIONS,
          canAccessSC: false,
          canAccessInventario: true,
          canAccessTermos: true,
          canManageEquipments: true,
          canManageTermos: true,
          canAccessAnalytics: true,
          canExportReports: true,
          canImportData: true,
        },
      }));
    } else if (type === 'termos') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...DEFAULT_USER_PERMISSIONS,
          canAccessSC: false,
          canAccessInventario: false,
          canAccessTermos: true,
          canManageTermos: true,
          canAccessAnalytics: false,
          canAccessAdmin: false,
          canManageUsers: false,
          canCreateSC: false,
          canEditSC: false,
          canDeleteSC: false,
          canManageEquipments: false,
          canExportReports: true,
          canImportData: false,
        },
      }));
    } else if (type === 'inventario') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...DEFAULT_USER_PERMISSIONS,
          canAccessSC: false,
          canAccessInventario: true,
          canAccessTermos: false,
          canManageEquipments: true,
          canManageTermos: false,
          canAccessAnalytics: false,
          canAccessAdmin: false,
          canManageUsers: false,
          canCreateSC: false,
          canEditSC: false,
          canDeleteSC: false,
          canExportReports: true,
          canImportData: false,
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
        canAccessTermos: formData.permissions.canAccessTermos,
        canManageTermos: formData.permissions.canManageTermos,
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
        canAccessTermos: formData.permissions.canAccessTermos,
        canManageTermos: formData.permissions.canManageTermos,
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
      const isOnline = isUserOnline(user, currentUser);
      if (presenceFilter === 'online' && !isOnline) return false;
      if (presenceFilter === 'offline' && isOnline) return false;

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
      if (filterType === 'termos') return matchesSearch && perms.canAccessTermos;
      if (filterType === 'admin') return matchesSearch && (perms.canAccessAdmin || perms.canManageUsers);
      if (filterType === 'password') return matchesSearch && Boolean(user.password && user.password.trim().length > 0);

      return matchesSearch;
    });
  }, [safeUsers, searchTerm, filterType, presenceFilter, currentUser]);

  // Render do bloco de configuração de permissões
  const renderPermissionsConfig = () => (
    <div className="space-y-4 pt-3 border-t border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Configuração de Permissões de Acesso</span>
        </div>

        {/* Presets Rápidos com Botões Claros */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 font-medium mr-0.5">Modelos Rápidos:</span>
          <button
            type="button"
            onClick={() => applyPreset('termos')}
            className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 hover:bg-purple-200 font-bold border border-purple-200 cursor-pointer transition-colors shadow-2xs"
            title="Acesso exclusivo ao módulo de Termos de Responsabilidade"
          >
            Somente Termos
          </button>
          <button
            type="button"
            onClick={() => applyPreset('inventario')}
            className="px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-800 hover:bg-cyan-200 font-bold border border-cyan-200 cursor-pointer transition-colors shadow-2xs"
            title="Acesso exclusivo ao Inventário de TI"
          >
            Somente Inventário
          </button>
          <button
            type="button"
            onClick={() => applyPreset('ti')}
            className="px-2.5 py-1 rounded-md bg-teal-100 text-teal-800 hover:bg-teal-200 font-bold border border-teal-200 cursor-pointer transition-colors shadow-2xs"
            title="Inventário completo + Termos de Responsabilidade"
          >
            TI Geral (Ambos)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('compras')}
            className="px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold border border-orange-200 cursor-pointer transition-colors shadow-2xs"
            title="Solicitações de Compra (SC)"
          >
            Compras (SC)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('total')}
            className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-bold border border-indigo-200 cursor-pointer transition-colors shadow-2xs"
            title="Acesso total de Administrador"
          >
            Total Admin
          </button>
          <button
            type="button"
            onClick={() => applyPreset('consulta')}
            className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium border border-slate-200 cursor-pointer transition-colors"
            title="Somente leitura e visualização"
          >
            Consulta
          </button>
        </div>
      </div>

      {/* 1. Módulos Principais do Sistema (Grandes Caixas Interativas) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
          1. Módulos com Acesso Liberado no Menu
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Módulo SC */}
          <div
            onClick={() => handleTogglePermission('canAccessSC')}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
              formData.permissions.canAccessSC
                ? 'bg-orange-50/70 border-orange-400 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formData.permissions.canAccessSC ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Solicitações (SC)</h4>
                  <span className="text-[10px] text-slate-500">Compras e prazos</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.permissions.canAccessSC}
                onChange={() => {}}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 pointer-events-none mt-0.5"
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              Permite visualizar a lista e status das ordens de compra da empresa.
            </p>
          </div>

          {/* Módulo Inventário TI */}
          <div
            onClick={() => handleTogglePermission('canAccessInventario')}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
              formData.permissions.canAccessInventario
                ? 'bg-cyan-50/70 border-cyan-400 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formData.permissions.canAccessInventario ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Inventário TI</h4>
                  <span className="text-[10px] text-slate-500">Ativos e máquinas</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.permissions.canAccessInventario}
                onChange={() => {}}
                className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 pointer-events-none mt-0.5"
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              Permite acessar o catálogo geral de equipamentos e patrimônio de TI.
            </p>
          </div>

          {/* Módulo Termos TI */}
          <div
            onClick={() => handleTogglePermission('canAccessTermos')}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
              formData.permissions.canAccessTermos
                ? 'bg-purple-50/80 border-purple-400 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formData.permissions.canAccessTermos ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950 leading-tight">Termos TI</h4>
                  <span className="text-[10px] text-purple-700">Responsabilidade</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.permissions.canAccessTermos}
                onChange={() => {}}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 pointer-events-none mt-0.5"
              />
            </div>
            <p className="text-[11px] text-purple-900/80 mt-2 leading-relaxed">
              Permite gerenciar, emitir e imprimir termos de entrega de notebooks.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Permissões Detalhadas (Divididas em 2 colunas amplas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        
        {/* Bloco TI & Termos */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-1 border-b border-slate-200">
            <Shield className="w-3.5 h-3.5 text-cyan-600" />
            <span>Operações em TI & Termos</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canManageEquipments}
                onChange={() => handleTogglePermission('canManageEquipments')}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Cadastrar / Editar Equipamentos</span>
                <span className="text-[11px] text-slate-500">Permissão para adicionar, alterar ou remover máquinas no inventário</span>
              </div>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canManageTermos}
                onChange={() => handleTogglePermission('canManageTermos')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-purple-900 block">Emitir e Alterar Termos de Responsabilidade</span>
                <span className="text-[11px] text-slate-500">Pode gerar novos termos, alterar dados e registrar devoluções</span>
              </div>
            </label>
          </div>
        </div>

        {/* Bloco Operações de Compras (SC) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-1 border-b border-slate-200">
            <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
            <span>Operações em Compras (SC)</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canCreateSC}
                onChange={() => handleTogglePermission('canCreateSC')}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Criar Novas Solicitações</span>
                <span className="text-[11px] text-slate-500">Cadastrar novos pedidos de compra no painel</span>
              </div>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canEditSC}
                onChange={() => handleTogglePermission('canEditSC')}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Editar Dados e Prazos</span>
                <span className="text-[11px] text-slate-500">Atualizar status, fornecedor, prazos e observações</span>
              </div>
            </label>

            <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canDeleteSC}
                onChange={() => handleTogglePermission('canDeleteSC')}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-rose-700 block">Excluir Solicitações</span>
                <span className="text-[11px] text-slate-500">Permite apagar registros de solicitações de compra</span>
              </div>
            </label>
          </div>
        </div>

        {/* Bloco Administrativo & Relatórios */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-1 border-b border-slate-200">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Administração, Relatórios e Dados Globais</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canAccessAnalytics}
                onChange={() => handleTogglePermission('canAccessAnalytics')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Indicadores & Gráficos</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canAccessAdmin}
                onChange={() => handleTogglePermission('canAccessAdmin')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Painel Administrativo</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canManageUsers}
                onChange={() => handleTogglePermission('canManageUsers')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-indigo-900">Gestão de Usuários</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.permissions.canExportReports}
                onChange={() => handleTogglePermission('canExportReports')}
                className="w-4 h-4 rounded text-slate-700 focus:ring-slate-700"
              />
              <span>Exportar Dados</span>
            </label>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="space-y-3">
        {/* Quick Presence Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg w-fit border border-slate-200/80">
            <button
              type="button"
              onClick={() => setPresenceFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                presenceFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>Todos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                {safeUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPresenceFilter('online')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                presenceFilter === 'online'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white/60 animate-pulse" />
              <span>Online</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  presenceFilter === 'online'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {onlineCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPresenceFilter('offline')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                presenceFilter === 'offline'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-white/60" />
              <span>Offline</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  presenceFilter === 'offline'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {offlineCount}
              </span>
            </button>
          </div>

          {presenceFilter !== 'all' && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Filtrando por: <strong>{presenceFilter === 'online' ? 'Online' : 'Offline'}</strong></span>
              <button
                type="button"
                onClick={() => setPresenceFilter('all')}
                className="text-orange-600 hover:underline font-medium cursor-pointer text-[11px]"
              >
                (Mostrar todos)
              </button>
            </div>
          )}
        </div>

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
              <option value="all">Todos os Acessos ({safeUsers.length})</option>
              <option value="sc">Com Acesso a SCs</option>
              <option value="inventario">Com Acesso a Inventário TI</option>
              <option value="termos">Com Acesso a Termos de TI</option>
              <option value="admin">Acesso Administrativo</option>
              <option value="password">Com Senha de Acesso</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Alternador Cartões / Tabela */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar em formato de Cartões (ideal para editar diretamente sem rolar pro lado)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cartões</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar em formato de Tabela"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
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
        </div>
      </div>

      {/* Visualização em Cartões (Sem necessidade de rolar para o lado para editar) */}
      {viewMode === 'cards' ? (
        filteredUsers.length === 0 ? (
          <div className="border border-slate-200 rounded-xl bg-white p-10 text-center text-slate-400 text-xs shadow-2xs">
            Nenhum colaborador encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredUsers.map((user) => {
              const isMe = currentUser.id === user.id;
              const hasPassword = Boolean(user.password && user.password.trim().length > 0);
              const cargo = getUserCargo(user);
              const badge = getRoleBadgeClass(cargo);
              const perms = getUserPermissions(user);
              const activity = getUserActivityInfo(user, currentUser);
              const isOnline = isUserOnline(user, currentUser);

              return (
                <div
                  key={user.id}
                  className={`border rounded-xl bg-white transition-all shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                    isMe ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                  }`}
                >
                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl ${
                            user.avatarColor || 'bg-slate-700'
                          } text-white flex items-center justify-center font-bold text-sm shrink-0 relative shadow-2xs`}
                        >
                          {user.nome.charAt(0).toUpperCase()}
                          <UserPresenceBadge
                            user={user}
                            currentUser={currentUser}
                            size="sm"
                            className="absolute -bottom-0.5 -right-0.5"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                            <span className="truncate">{user.nome}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs flex items-center gap-1 truncate mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Online status indicator pill */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isOnline
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {/* Cargo e Setor */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {cargo}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[140px]">{user.departamento || 'Geral'}</span>
                      </span>
                    </div>

                    {/* Módulos & Acessos do Usuário */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Módulos com Acesso:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap min-h-[26px]">
                        {perms.canAccessAdmin && perms.canManageUsers ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Acesso Total (Administrador)</span>
                          </span>
                        ) : (
                          <>
                            {perms.canAccessSC && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200"
                                title="Acesso a Solicitações de Compra"
                              >
                                <ShoppingCart className="w-3 h-3 text-orange-500" />
                                <span>Compras (SC)</span>
                              </span>
                            )}
                            {perms.canAccessInventario && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200"
                                title="Acesso ao Inventário de TI"
                              >
                                <Boxes className="w-3 h-3 text-cyan-600" />
                                <span>Inventário TI</span>
                              </span>
                            )}
                            {perms.canAccessTermos && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                                title="Acesso aos Termos de Responsabilidade"
                              >
                                <FileCheck className="w-3 h-3 text-purple-600" />
                                <span>Termos TI</span>
                              </span>
                            )}
                            {perms.canAccessAnalytics && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                title="Acesso aos Gráficos"
                              >
                                <BarChart2 className="w-3 h-3 text-blue-500" />
                                <span>Gráficos</span>
                              </span>
                            )}
                            {!perms.canAccessSC && !perms.canAccessInventario && !perms.canAccessTermos && !perms.canAccessAnalytics && (
                              <span className="text-slate-400 text-xs italic">
                                Sem módulos liberados
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Senha e Última Atividade */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        {hasPassword ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            Com Senha
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            Sem Senha
                          </span>
                        )}
                      </span>
                      <span className="truncate" title={activity.tooltipText}>
                        {isOnline ? 'Ativo agora' : (user.lastSeen ? activity.relativeTime : 'Nunca logou')}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer - BOTÕES DIRETOS SEM ROLAR */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Permissões</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalUser(user);
                        setNewPassword(user.password || '');
                      }}
                      title="Definir Senha de Acesso"
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-200/70 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>

                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        title="Excluir Usuário"
                        className="p-1.5 text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Users Table */
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-3.5 min-w-[200px]">Colaborador</th>
                <th className="py-3 px-3 min-w-[150px]">Cargo / Setor</th>
                <th className="py-3 px-3 min-w-[220px]">Permissões de Acesso</th>
                <th className="py-3 px-3 min-w-[90px]">Autenticação</th>
                <th className="py-3 px-3 text-right min-w-[140px] sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_rgba(0,0,0,0.04)] border-l border-slate-200">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
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
                      onClick={() => handleOpenEdit(user)}
                      className={`group hover:bg-slate-50/90 transition-colors cursor-pointer ${
                        isMe ? 'bg-amber-50/20' : ''
                      }`}
                      title="Clique para editar este colaborador"
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-md ${
                              user.avatarColor || 'bg-slate-700'
                            } text-white flex items-center justify-center font-semibold text-xs shrink-0 relative`}
                          >
                            {user.nome.charAt(0).toUpperCase()}
                            <UserPresenceBadge
                              user={user}
                              currentUser={currentUser}
                              size="xs"
                              className="absolute -bottom-0.5 -right-0.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                              <span className="truncate">{user.nome}</span>
                              <UserPresenceBadge
                                user={user}
                                currentUser={currentUser}
                                showText={true}
                                size="xs"
                              />
                              {isMe && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5 truncate">
                              <span className="truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span
                                className="text-[10px] text-slate-400 flex items-center gap-1 cursor-help shrink-0"
                                title={getUserActivityInfo(user, currentUser).tooltipText}
                              >
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                {isUserOnline(user, currentUser) ? (
                                  <span className="text-emerald-600 font-medium">Ativo agora</span>
                                ) : (
                                  <span>
                                    {user.lastSeen
                                      ? `Última atividade: ${getUserActivityInfo(user, currentUser).relativeTime}`
                                      : 'Sem registro recente'}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo & Setor Unificados */}
                      <td className="py-3 px-3 whitespace-nowrap align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {cargo}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{user.departamento || 'Geral'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Permissions Badges */}
                      <td className="py-3 px-3 align-middle">
                        {perms.canAccessAdmin && perms.canManageUsers ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">
                            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Acesso Total (Administrador)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap py-0.5">
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
                                <span>Inventário</span>
                              </span>
                            )}
                            {perms.canAccessTermos && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap shrink-0"
                                title="Acesso aos Termos de Responsabilidade"
                              >
                                <FileCheck className="w-3 h-3 text-purple-600 shrink-0" />
                                <span>Termos</span>
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
                            {perms.canManageTermos && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap shrink-0"
                                title="Permissão para Emitir e Gerenciar Termos"
                              >
                                <span>Emitir Termos</span>
                              </span>
                            )}
                            {!perms.canAccessSC && !perms.canAccessInventario && !perms.canAccessTermos && !perms.canAccessAnalytics && (
                              <span className="text-slate-400 text-xs italic whitespace-nowrap">
                                Sem permissões ativas
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Password Status */}
                      <td className="py-3 px-3 whitespace-nowrap align-middle">
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

                      {/* Actions (Fixado à Direita, Sempre Visível sem Rolar) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap align-middle sticky right-0 bg-white/95 group-hover:bg-slate-50/95 z-10 shadow-[-6px_0_10px_rgba(0,0,0,0.04)] border-l border-slate-100">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(user);
                            }}
                            title="Editar Dados, Cargo e Permissões"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPasswordModalUser(user);
                              setNewPassword(user.password || '');
                            }}
                            title="Definir Senha de Acesso"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {!isMe && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserToDelete(user);
                              }}
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
      )}

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

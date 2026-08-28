import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  BarChart2,
  KeyRound,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserRole } from '../types';
import {
  getRoleLabel,
  getRoleBadgeClass,
  getRolePermissions,
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
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState<{
    nome: string;
    email: string;
    role: UserRole;
    departamento: string;
    password: string;
    avatarColor: string;
    canAccessSC: boolean;
    canAccessInventario: boolean;
  }>({
    nome: '',
    email: '',
    role: 'comprador',
    departamento: 'Suprimentos & Compras',
    password: '',
    avatarColor: 'bg-orange-600',
    canAccessSC: true,
    canAccessInventario: true,
  });

  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    { label: 'Laranja', class: 'bg-orange-600' },
    { label: 'Índigo', class: 'bg-indigo-600' },
    { label: 'Esmeralda', class: 'bg-emerald-600' },
    { label: 'Roxo', class: 'bg-purple-600' },
    { label: 'Azul', class: 'bg-blue-600' },
    { label: 'Rosa', class: 'bg-pink-600' },
    { label: 'Teal', class: 'bg-teal-600' },
  ];

  const handleOpenAdd = () => {
    setFormData({
      nome: '',
      email: '',
      role: 'comprador',
      departamento: 'Suprimentos & Compras',
      password: '',
      avatarColor: 'bg-orange-600',
      canAccessSC: true,
      canAccessInventario: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      role: user.role,
      departamento: user.departamento,
      password: user.password || '',
      avatarColor: user.avatarColor || 'bg-slate-600',
      canAccessSC: user.canAccessSC ?? true,
      canAccessInventario: user.canAccessInventario ?? true,
    });
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
        nome: formData.nome,
        email: formData.email,
        role: formData.role,
        departamento: formData.departamento,
        password: formData.password,
        avatarColor: formData.avatarColor,
        canAccessSC: formData.canAccessSC,
        canAccessInventario: formData.canAccessInventario,
      });
      onToast(`Usuário ${formData.nome} criado com sucesso no Firestore!`, 'success');
      setIsAddModalOpen(false);
      onRefreshUsers();
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
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
        nome: formData.nome,
        email: formData.email,
        role: formData.role,
        departamento: formData.departamento,
        password: formData.password ? formData.password.trim() : undefined,
        avatarColor: formData.avatarColor,
        canAccessSC: formData.canAccessSC,
        canAccessInventario: formData.canAccessInventario,
      });
      onToast(`Usuário ${formData.nome} atualizado no Firestore!`, 'success');
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
      await authService.updateUser(passwordModalUser.id, {
        password: newPassword.trim() ? newPassword.trim() : undefined,
        requiresPassword: Boolean(newPassword.trim().length > 0),
      });
      onToast(
        newPassword.trim()
          ? `Senha de ${passwordModalUser.nome} alterada com sucesso!`
          : `Senha de ${passwordModalUser.nome} removida com sucesso!`,
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
      onToast(`Usuário ${userToDelete.nome} excluído com sucesso!`, 'info');
      setUserToDelete(null);
      onRefreshUsers();
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      onToast((err as Error).message || 'Erro ao excluir usuário.', 'error');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return ShieldCheck;
      case 'usuario':
        return Users;
      case 'comprador':
        return ShoppingCart;
      case 'almoxarifado':
        return Truck;
      case 'gestor':
        return BarChart2;
      default:
        return Users;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-600 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Gestão de Usuários e Senhas da Equipe
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre membros da equipe, defina senhas de acesso e atribua permissões personalizadas
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-600/20 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Novo Usuário</span>
        </button>
      </div>

      {/* Role Counts Mini-Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['admin', 'usuario', 'comprador', 'almoxarifado', 'gestor'] as UserRole[]).map((r) => {
          const count = safeUsers.filter((u) => u.role === r).length;
          const badge = getRoleBadgeClass(r);
          const Icon = getRoleIcon(r);
          return (
            <div
              key={r}
              className="p-3 rounded-xl bg-white dark:bg-[#151a26] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${badge.bg} ${badge.text}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                  {r === 'usuario' ? 'Usuário' : r}
                </span>
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white">{count}</span>
            </div>
          );
        })}
      </div>

      {/* User Cards Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Membros Cadastrados na Nuvem Firestore ({safeUsers.length})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {safeUsers.map((user) => {
            const badge = getRoleBadgeClass(user.role);
            const Icon = getRoleIcon(user.role);
            const isMe = currentUser.id === user.id;
            const hasPassword = Boolean(user.password && user.password.trim().length > 0);

            return (
              <div
                key={user.id}
                className={`p-4 rounded-2xl bg-white dark:bg-[#151a26] border transition-all shadow-xs flex flex-col justify-between ${
                  isMe
                    ? 'border-orange-500/40 ring-1 ring-orange-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl ${
                          user.avatarColor || 'bg-slate-600'
                        } text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0`}
                      >
                        {user.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {user.nome}
                          </h5>
                          {isMe && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-orange-500/20 text-orange-600 dark:text-orange-400">
                              VOCÊ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </div>

                  {/* Access Modules Allowed */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Módulos:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        user.canAccessSC !== false
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                      }`}
                    >
                      Painel SC
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        user.canAccessInventario !== false
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                      }`}
                    >
                      Inventário TI
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <span className="truncate">{user.departamento || 'Geral'}</span>

                    <div className="flex items-center gap-1 shrink-0">
                      {hasPassword ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          <Lock className="w-3 h-3" />
                          Com Senha
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-[10px]">
                          <Unlock className="w-3 h-3" />
                          Sem Senha
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModalUser(user);
                      setNewPassword(user.password || '');
                    }}
                    title="Definir ou Alterar Senha"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                    <span>{hasPassword ? 'Alterar Senha' : 'Criar Senha'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(user)}
                    title="Editar Perfil"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {user.id !== 'usr-admin' && (
                    <button
                      type="button"
                      onClick={() => setUserToDelete(user)}
                      title="Excluir Usuário"
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add User */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-[#181e2b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 bg-linear-to-r from-orange-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-orange-600 text-white">
                    <UserPlus className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Cadastrar Novo Usuário na Equipe
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="joao@mcm.com.br"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Papel / Nível de Acesso *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as UserRole;
                        let defaultDept = 'Operacional & Suprimentos';
                        if (newRole === 'usuario') defaultDept = 'Operacional & Obras';
                        if (newRole === 'comprador') defaultDept = 'Suprimentos & Compras';
                        if (newRole === 'almoxarifado') defaultDept = 'Almoxarifado & Logística';
                        if (newRole === 'gestor') defaultDept = 'Diretoria & Gestão';
                        if (newRole === 'admin') defaultDept = 'Administração Geral';
                        setFormData({ ...formData, role: newRole, departamento: defaultDept });
                      }}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-orange-600 dark:text-orange-400"
                    >
                      <option value="usuario">Usuário Comum (Criação & Acompanhamento de SCs)</option>
                      <option value="comprador">Comprador (Criação & Edição de SCs)</option>
                      <option value="almoxarifado">Almoxarifado (Recebimento & TI)</option>
                      <option value="gestor">Gestor / Diretoria (Dashboards & Relatórios)</option>
                      <option value="admin">Administrador Geral (Acesso Total)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Departamento / Setor
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Suprimentos Obra SP"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Senha de Acesso</span>
                      <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Deixe em branco para sem senha"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* Module Permissions Checkboxes */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Acessos Liberados pelo Administrador
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-[#181e2b] border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.canAccessSC}
                        onChange={(e) => setFormData({ ...formData, canAccessSC: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">Painel de SC</span>
                        <span className="text-[10px] text-slate-400">Solicitações & Compras</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-[#181e2b] border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.canAccessInventario}
                        onChange={(e) => setFormData({ ...formData, canAccessInventario: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">Inventários</span>
                        <span className="text-[10px] text-slate-400">Ativos TI & Almoxarifado</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Avatar Color Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cor do Avatar
                  </label>
                  <div className="flex items-center gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.class}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarColor: c.class })}
                        className={`w-7 h-7 rounded-lg ${c.class} text-white flex items-center justify-center transition-all ${
                          formData.avatarColor === c.class
                            ? 'ring-2 ring-offset-2 ring-orange-500 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {formData.avatarColor === c.class && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-md shadow-orange-600/20"
                  >
                    {isSubmitting ? 'Salvando...' : 'Cadastrar Usuário'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Edit User */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-[#181e2b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 bg-linear-to-r from-orange-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-orange-600 text-white">
                    <Edit2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Editar Usuário: {editingUser.nome}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Papel / Nível de Acesso *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-orange-600 dark:text-orange-400"
                    >
                      <option value="usuario">Usuário Comum (Criação & Acompanhamento de SCs)</option>
                      <option value="comprador">Comprador (Criação & Edição de SCs)</option>
                      <option value="almoxarifado">Almoxarifado (Recebimento & TI)</option>
                      <option value="gestor">Gestor / Diretoria (Dashboards & Relatórios)</option>
                      <option value="admin">Administrador Geral (Acesso Total)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Departamento / Setor
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                {/* Module Permissions Checkboxes */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Acessos Liberados pelo Administrador
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-[#181e2b] border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.canAccessSC}
                        onChange={(e) => setFormData({ ...formData, canAccessSC: e.target.checked })}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">Painel de SC</span>
                        <span className="text-[10px] text-slate-400">Solicitações & Compras</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-[#181e2b] border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.canAccessInventario}
                        onChange={(e) => setFormData({ ...formData, canAccessInventario: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">Inventários</span>
                        <span className="text-[10px] text-slate-400">Ativos TI & Almoxarifado</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Avatar Color Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cor do Avatar
                  </label>
                  <div className="flex items-center gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.class}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarColor: c.class })}
                        className={`w-7 h-7 rounded-lg ${c.class} text-white flex items-center justify-center transition-all ${
                          formData.avatarColor === c.class
                            ? 'ring-2 ring-offset-2 ring-orange-500 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {formData.avatarColor === c.class && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-md shadow-orange-600/20"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Set/Change Password */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#181e2b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 bg-linear-to-r from-orange-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-orange-600 text-white">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Configurar Senha de Acesso
                    </h3>
                    <p className="text-xs text-slate-400">Usuário: {passwordModalUser.nome}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nova Senha de Acesso
                  </label>
                  <input
                    type="text"
                    placeholder="Digite a nova senha (ou deixe em branco para remover)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {passwordModalUser.role === 'admin'
                      ? 'Recomendamos manter uma senha segura para o perfil de Administrador.'
                      : 'Deixar em branco permitirá que o usuário acesse o perfil sem solicitar senha.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-md shadow-orange-600/20"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Senha'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Delete User */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#181e2b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <span className="p-2.5 rounded-xl bg-rose-500/10">
                  <AlertCircle className="w-6 h-6" />
                </span>
                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white">
                    Excluir Usuário?
                  </h4>
                  <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza que deseja remover o usuário <strong>{userToDelete.nome}</strong> (
                {userToDelete.email}) da equipe?
              </p>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

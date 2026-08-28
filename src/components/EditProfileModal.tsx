import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Building2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Palette,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { authService, getRoleLabel } from '../services/authService';

interface EditProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AVATAR_COLORS = [
  { name: 'Indigo', value: 'bg-indigo-600' },
  { name: 'Laranja', value: 'bg-orange-600' },
  { name: 'Azul', value: 'bg-blue-600' },
  { name: 'Esmeralda', value: 'bg-emerald-600' },
  { name: 'Roxo', value: 'bg-purple-600' },
  { name: 'Rosa', value: 'bg-pink-600' },
  { name: 'Teal', value: 'bg-teal-600' },
  { name: 'Cinza', value: 'bg-slate-700' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
  onToast,
}) => {
  const [nome, setNome] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [departamento, setDepartamento] = useState(user.departamento);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || 'bg-indigo-600');
  const [password, setPassword] = useState(user.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNome(user.nome);
      setEmail(user.email);
      setDepartamento(user.departamento);
      setAvatarColor(user.avatarColor || 'bg-indigo-600');
      setPassword(user.password || '');
      setShowPassword(false);
      setIsSaving(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      onToast('Por favor, informe seu nome.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await authService.updateUser(user.id, {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        departamento: departamento.trim(),
        avatarColor,
        password: password.trim() ? password.trim() : undefined,
      });

      if (updated) {
        onSave(updated);
        onToast('Perfil e dados atualizados com sucesso!', 'success');
        onClose();
      } else {
        onToast('Erro ao atualizar os dados do perfil.', 'error');
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      onToast('Erro ao gravar atualizações no banco.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#1a202c] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#151923]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${avatarColor} text-white flex items-center justify-center font-black text-base shadow-xs`}
              >
                {nome ? nome.charAt(0).toUpperCase() : user.nome.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Editar Meu Perfil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getRoleLabel(user.role)} • ID: {user.id}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome de Exibição <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo ou de exibição"
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@mcm.com.br"
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Departamento / Setor
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="Ex: Suprimentos, TI, Almoxarifado, Engenharia"
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" /> Cor do Avatar
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAvatarColor(c.value)}
                    className={`w-7 h-7 rounded-xl ${c.value} transition-all cursor-pointer flex items-center justify-center ${
                      avatarColor === c.value
                        ? 'ring-2 ring-offset-2 ring-orange-500 dark:ring-offset-[#1a202c] scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={c.name}
                  >
                    {avatarColor === c.value && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Senha de Acesso */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Senha de Acesso / PIN</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Usada para autenticação ao entrar
                </span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha ou mantenha a atual"
                  className="w-full h-10 pl-9 pr-10 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

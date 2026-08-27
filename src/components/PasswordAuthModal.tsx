import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, ShieldCheck, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { getRoleLabel, getRoleBadgeClass } from '../services/authService';

interface PasswordAuthModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  onVerify: (userId: string, passwordAttempt: string) => Promise<boolean>;
}

export const PasswordAuthModal: React.FC<PasswordAuthModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  onVerify,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const isValid = await onVerify(user.id, password);
      if (isValid) {
        onSuccess(user);
        onClose();
      } else {
        setErrorMsg('Senha incorreta. Tente novamente.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('Erro na validação de senha:', err);
      setErrorMsg('Erro ao validar senha. Verifique a conexão.');
    } finally {
      setIsVerifying(false);
    }
  };

  const badge = getRoleBadgeClass(user.role);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-[#181e2b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="relative p-6 bg-linear-to-br from-slate-50 to-slate-100/70 dark:from-[#131722] dark:to-[#1c2230] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Acesso Protegido por Senha
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confirme sua identidade para assumir este perfil
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Target Card */}
          <div className="p-6">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800 mb-5">
              <div
                className={`w-11 h-11 rounded-xl ${
                  user.avatarColor || 'bg-indigo-600'
                } text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0`}
              >
                {user.nome.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {user.nome}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {getRoleLabel(user.role).split(' ')[0]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {user.departamento}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Senha de Acesso</span>
                  {user.role === 'admin' && (
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-normal">
                      Padrão inicial: <strong>admin</strong>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha..."
                    className="w-full pl-9.5 pr-10 py-2.5 bg-white dark:bg-[#131722] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                    disabled={isVerifying}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !password}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-orange-600/20 cursor-pointer"
                >
                  {isVerifying ? (
                    'Verificando...'
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

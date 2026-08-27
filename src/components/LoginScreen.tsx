import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';

interface LoginScreenProps {
  users?: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Informe seu usuário ou e-mail para entrar.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await authService.authenticateByCredentials(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Credenciais inválidas. Verifique usuário e senha.');
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setError('Erro ao autenticar. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] dark:bg-[#18191a] flex flex-col justify-between select-none font-sans antialiased">
      {/* Central Clean Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#242526] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.04)] border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-8 space-y-6">
          
          {/* Official MCM Logo */}
          <div className="flex flex-col items-center justify-center text-center">
            <img
              src="/logo-mcm.png"
              alt="MCM Montagens Industriais"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-2xs"
            />
          </div>

          {/* Simple Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="loginUsernameInput"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Digite seu usuário ou e-mail"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-3 text-sm bg-white dark:bg-[#3a3b3c] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#ff5500]/40 focus:border-[#ff5500] transition shadow-2xs"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="loginPasswordInput"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 text-sm bg-white dark:bg-[#3a3b3c] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#ff5500]/40 focus:border-[#ff5500] transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="btnLoginSubmit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#ff5500] hover:bg-[#e04b00] active:scale-[0.99] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        MCM Montagens Industriais © 2026
      </footer>
    </div>
  );
};

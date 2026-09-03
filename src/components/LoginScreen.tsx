import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, Tv, X, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { authService, INITIAL_KIOSK_USER } from '../services/authService';

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

  // Kiosk Authentication Modal state
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [kioskUsername, setKioskUsername] = useState('');
  const [kioskPassword, setKioskPassword] = useState('');
  const [kioskShowPassword, setKioskShowPassword] = useState(false);
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [isKioskLoading, setIsKioskLoading] = useState(false);

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

  const handleKioskAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskUsername.trim()) {
      setKioskError('Informe o usuário ou perfil autorizado para o Quiosque.');
      return;
    }

    setKioskError(null);
    setIsKioskLoading(true);

    try {
      const result = await authService.authenticateByCredentials(kioskUsername, kioskPassword);
      if (result.success && result.user) {
        setIsKioskModalOpen(false);
        // Garantir que entra no modo quiosque
        const userToLog = result.user.role === 'kiosk' || result.user.isKiosk
          ? result.user
          : { ...result.user, isKiosk: true, role: 'kiosk' };
        authService.setAuthenticatedUser(userToLog);
        onLoginSuccess(userToLog);
      } else {
        setKioskError(result.error || 'Credenciais inválidas para acesso ao Modo Quiosque.');
      }
    } catch (err) {
      console.error('Erro na autenticação do quiosque:', err);
      setKioskError('Erro ao validar acesso. Tente novamente.');
    } finally {
      setIsKioskLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] dark:bg-[#18191a] flex flex-col justify-between select-none font-sans antialiased relative">
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

      {/* Floating Kiosk Button in Bottom Right Corner */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={() => {
            setKioskError(null);
            setIsKioskModalOpen(true);
          }}
          id="btnBottomRightKiosk"
          title="Acessar Modo Quiosque / Painel TV (Exige Login de Segurança)"
          className="py-2.5 px-4 rounded-2xl border border-orange-300/80 dark:border-orange-500/40 bg-white/95 dark:bg-[#242526]/95 hover:bg-orange-50/90 dark:hover:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95 group backdrop-blur-xs"
        >
          <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
            <Tv className="w-3.5 h-3.5" />
          </div>
          <span>Modo Quiosque / TV</span>
        </button>
      </div>

      {/* Security Auth Modal for Kiosk Mode */}
      {isKioskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Entre com uma conta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acesso de segurança ao Modo Quiosque / TV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKioskModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleKioskAuthSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Usuário ou Perfil de Acesso
                </label>
                <input
                  type="text"
                  value={kioskUsername}
                  onChange={(e) => {
                    setKioskUsername(e.target.value);
                    setKioskError(null);
                  }}
                  placeholder="Digite seu usuário ou perfil"
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#3a3b3c] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={kioskShowPassword ? 'text' : 'password'}
                    value={kioskPassword}
                    onChange={(e) => {
                      setKioskPassword(e.target.value);
                      setKioskError(null);
                    }}
                    placeholder="Digite sua senha"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#3a3b3c] border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setKioskShowPassword(!kioskShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {kioskShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {kioskError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                  {kioskError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKioskModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isKioskLoading}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  {isKioskLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Tv className="w-3.5 h-3.5" />
                      <span>Entrar Quiosque</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        MCM Montagens Industriais © 2026
      </footer>
    </div>
  );
};

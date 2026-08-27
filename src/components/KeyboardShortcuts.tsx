import React, { useState } from 'react';
import { Keyboard, X, Command, Plus, Search, Shield, RotateCcw, Settings as SettingsIcon } from 'lucide-react';

interface KeyboardShortcutsProps {
  onOpenAdd: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenSettings?: () => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onOpenAdd,
  onOpenGlobalSearch,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: 'Ctrl + K  ou  ⌘ + K', macKey: '⌘ + K', description: 'Abrir Busca Rápida Global (SC + Inventário)', icon: <Search className="w-4 h-4 text-orange-500" /> },
    { key: 'Ctrl + ,', macKey: '⌘ + ,', description: 'Abrir Configurações do Sistema', icon: <SettingsIcon className="w-4 h-4 text-orange-500" /> },
    { key: 'Ctrl + N', macKey: '⌘ + N', description: 'Abrir modal de Nova Solicitação (SC)', icon: <Plus className="w-4 h-4 text-amber-500" /> },
    { key: 'Ctrl + F  ou  /', macKey: '⌘ + F  ou  /', description: 'Focar no campo de filtro da tabela', icon: <Search className="w-4 h-4 text-sky-500" /> },
    { key: 'Esc', macKey: 'Esc', description: 'Fechar modais e painéis de detalhes abertos', icon: <X className="w-4 h-4 text-red-500" /> },
    { key: 'Ctrl + Shift + A', macKey: '⌘ + Shift + A', description: 'Abrir o Painel Administrativo', icon: <Shield className="w-4 h-4 text-amber-500" /> },
  ];

  return (
    <>
      {/* Footer bar with shortcut hints */}
      <footer className="mt-8 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#202532]/80 backdrop-blur-md py-3 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
            <Keyboard className="w-4 h-4 text-orange-500" /> Atalhos rápidos:
          </span>

          {/* Quick inline badges */}
          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              title="Pressione Ctrl+K para busca global simultânea"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer"
            >
              <kbd className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-900/50 font-bold text-orange-600 dark:text-orange-400 shadow-2xs">
                Ctrl + K
              </kbd>
              <span className="text-[11px] font-bold">Busca Global</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Pressione Ctrl+, para abrir configurações"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-[#2c3343] border border-slate-200 dark:border-slate-600/60 text-slate-700 dark:text-slate-200 hover:border-orange-400 dark:hover:border-orange-400 transition-colors cursor-pointer"
            >
              <kbd className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                Ctrl + ,
              </kbd>
              <span className="text-[11px] font-medium">Configurações</span>
            </button>
          )}

          <button
            onClick={onOpenAdd}
            title="Pressione Ctrl+N para criar nova SC"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-[#2c3343] border border-slate-200 dark:border-slate-600/60 text-slate-700 dark:text-slate-200 hover:border-orange-400 dark:hover:border-orange-400 transition-colors cursor-pointer"
          >
            <kbd className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
              Ctrl + N
            </kbd>
            <span className="text-[11px] font-medium">Nova SC</span>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('headerBuscaSC') as HTMLInputElement;
              el?.focus();
            }}
            title="Pressione Ctrl+F ou / para buscar"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-[#2c3343] border border-slate-200 dark:border-slate-600/60 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-400 transition-colors cursor-pointer"
          >
            <kbd className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-sky-600 dark:text-sky-400 shadow-2xs">
              Ctrl + F
            </kbd>
            <span className="text-[11px] font-medium">Buscar</span>
          </button>

          <div className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-[#2c3343] border border-slate-200 dark:border-slate-600/60 text-slate-700 dark:text-slate-200">
            <kbd className="font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
              Esc
            </kbd>
            <span className="text-[11px] font-medium">Fechar</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="text-orange-600 dark:text-orange-400 hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
          >
            Ver todos os atalhos (?) →
          </button>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="text-[11px]">MCM Soluções Industriais © 2026</span>
        </div>
      </footer>

      {/* Modal with Full Shortcuts Guide */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#2a3040] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-500/60 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-500/50 bg-slate-50 dark:bg-[#202532]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/15 rounded-lg text-orange-500">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Atalhos de Teclado</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Produtividade e navegação rápida no sistema</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content List */}
            <div className="p-5 space-y-3">
              {shortcuts.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-200/80 dark:border-slate-600/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-[#2c3343] border border-slate-200 dark:border-slate-600/60 shadow-2xs">
                      {s.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{s.description}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="font-mono text-xs bg-white dark:bg-[#2c3343] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600/80 font-bold text-slate-800 dark:text-slate-100 shadow-2xs">
                      {s.key}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-[#202532] border-t border-slate-200 dark:border-slate-500/50 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-2xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

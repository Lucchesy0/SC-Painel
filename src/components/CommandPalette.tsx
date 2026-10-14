import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ShoppingCart,
  Boxes,
  FileCheck,
  LayoutDashboard,
  BarChart3,
  Plus,
  FileSpreadsheet,
  Sparkles,
  Tv,
  Settings,
  Download,
  Moon,
  Sun,
  Laptop,
  ArrowRight,
  Command,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SC, Equipment, ResponsibilityTerm, ActiveNavTab, ThemeMode } from '../types';
import { formatDateBR } from '../utils/storage';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  scs: SC[];
  equipments: Equipment[];
  terms?: ResponsibilityTerm[];
  theme?: ThemeMode;
  onSelectSC: (sc: SC) => void;
  onSelectEquipment: (eq: Equipment) => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  onOpenAddSC: () => void;
  onOpenImportRM: () => void;
  onOpenAIPrintImport: () => void;
  onOpenAddEquipment: () => void;
  onOpenKioskMode: () => void;
  onOpenSettings: () => void;
  onToggleTheme?: () => void;
  onExportCSV?: () => void;
}

interface PaletteAction {
  id: string;
  type: 'action' | 'navigation' | 'sc' | 'equipment' | 'term';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  onRun: () => void;
}

function removeAccents(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  scs,
  equipments,
  terms = [],
  theme,
  onSelectSC,
  onSelectEquipment,
  onNavigateTab,
  onOpenAddSC,
  onOpenImportRM,
  onOpenAIPrintImport,
  onOpenAddEquipment,
  onOpenKioskMode,
  onOpenSettings,
  onToggleTheme,
  onExportCSV,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global Keyboard listener for opening via Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.metaKey || e.ctrlKey;
      if (isModifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered from parent or event
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build items based on query
  const items: PaletteAction[] = useMemo(() => {
    const clean = removeAccents(query.trim());
    const list: PaletteAction[] = [];

    // 1. Ações Rápidas do Sistema
    const quickActions: PaletteAction[] = [
      {
        id: 'act-new-sc',
        type: 'action',
        title: 'Nova Solicitação de Compra',
        subtitle: 'Cadastrar nova SC manualmente (Ctrl + N)',
        icon: <Plus className="w-4 h-4 text-orange-500" />,
        onRun: () => {
          onClose();
          onOpenAddSC();
        },
      },
      {
        id: 'act-ai-print',
        type: 'action',
        title: 'Criar SC por Print / Foto (IA)',
        subtitle: 'Extrair dados automaticamente de imagem com Gemini',
        icon: <Sparkles className="w-4 h-4 text-blue-500" />,
        onRun: () => {
          onClose();
          onOpenAIPrintImport();
        },
      },
      {
        id: 'act-import-rm',
        type: 'action',
        title: 'Importar Planilha Totvs RM',
        subtitle: 'Carregar pedidos em massa a partir de Excel/XLSX',
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
        onRun: () => {
          onClose();
          onOpenImportRM();
        },
      },
      {
        id: 'act-new-eq',
        type: 'action',
        title: 'Cadastrar Equipamento no Inventário',
        subtitle: 'Adicionar novo notebook, celular, tablet ou ativo de TI',
        icon: <Boxes className="w-4 h-4 text-sky-500" />,
        onRun: () => {
          onClose();
          onOpenAddEquipment();
        },
      },
      {
        id: 'act-kiosk',
        type: 'action',
        title: 'Modo Painel TV / Totem de Operação',
        subtitle: 'Visão de monitoramento contínuo em tela cheia',
        icon: <Tv className="w-4 h-4 text-purple-500" />,
        onRun: () => {
          onClose();
          onOpenKioskMode();
        },
      },
      {
        id: 'act-settings',
        type: 'action',
        title: 'Configurações do Sistema & SLAs',
        subtitle: 'Ajustar prazos de alerta, tema e parâmetros (Ctrl + ,)',
        icon: <Settings className="w-4 h-4 text-amber-500" />,
        onRun: () => {
          onClose();
          onOpenSettings();
        },
      },
    ];

    if (onToggleTheme) {
      quickActions.push({
        id: 'act-theme',
        type: 'action',
        title: theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro',
        subtitle: 'Mudar tema visual da interface',
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        onRun: () => {
          onClose();
          onToggleTheme();
        },
      });
    }

    if (onExportCSV) {
      quickActions.push({
        id: 'act-export',
        type: 'action',
        title: 'Exportar Base Completa para CSV',
        subtitle: 'Download de todas as solicitações para planilha',
        icon: <Download className="w-4 h-4 text-emerald-600" />,
        onRun: () => {
          onClose();
          onExportCSV();
        },
      });
    }

    // 2. Navegação entre Módulos
    const navActions: PaletteAction[] = [
      {
        id: 'nav-solicitacoes',
        type: 'navigation',
        title: 'Ir para Solicitações de Compra',
        subtitle: 'Tabela principal, cartões e controle de pedidos',
        icon: <ShoppingCart className="w-4 h-4 text-orange-500" />,
        onRun: () => {
          onClose();
          onNavigateTab('solicitacoes');
        },
      },
      {
        id: 'nav-inventario',
        type: 'navigation',
        title: 'Ir para Inventário de TI',
        subtitle: 'Equipamentos, números de série e patrimônio',
        icon: <Boxes className="w-4 h-4 text-blue-500" />,
        onRun: () => {
          onClose();
          onNavigateTab('inventario');
        },
      },
      {
        id: 'nav-termos',
        type: 'navigation',
        title: 'Ir para Termos de Responsabilidade',
        subtitle: 'Entrega e devolução de notebooks, tablets e celulares',
        icon: <FileCheck className="w-4 h-4 text-emerald-500" />,
        onRun: () => {
          onClose();
          onNavigateTab('termo-responsabilidade');
        },
      },
      {
        id: 'nav-indicadores',
        type: 'navigation',
        title: 'Ir para Indicadores & KPIs',
        subtitle: 'Métricas de atendimento, SLA e solicitações atrasadas',
        icon: <LayoutDashboard className="w-4 h-4 text-amber-500" />,
        onRun: () => {
          onClose();
          onNavigateTab('indicadores');
        },
      },
      {
        id: 'nav-graficos',
        type: 'navigation',
        title: 'Ir para Gráficos & Tendências',
        subtitle: 'Gráficos mensais e distribuição por departamento',
        icon: <BarChart3 className="w-4 h-4 text-teal-500" />,
        onRun: () => {
          onClose();
          onNavigateTab('graficos');
        },
      },
    ];

    // Se a busca estiver vazia, exibe atalhos rápidos e de navegação
    if (!clean) {
      return [...quickActions, ...navActions];
    }

    // Filtrar Ações e Navegações pela busca
    const matchingQuick = quickActions.filter(
      (a) => removeAccents(a.title).includes(clean) || removeAccents(a.subtitle || '').includes(clean)
    );
    const matchingNav = navActions.filter(
      (a) => removeAccents(a.title).includes(clean) || removeAccents(a.subtitle || '').includes(clean)
    );
    list.push(...matchingQuick);
    list.push(...matchingNav);

    // 3. Buscar Solicitações de Compra (SCs)
    const matchingSCs = scs
      .filter((sc) => {
        const numMatch = removeAccents(sc.numero).includes(clean);
        const solMatch = removeAccents(sc.solicitante).includes(clean);
        const statusMatch = removeAccents(sc.status).includes(clean);
        const itemsMatch = sc.itens.some((it) => removeAccents(it.descricao).includes(clean));
        return numMatch || solMatch || statusMatch || itemsMatch;
      })
      .slice(0, 6);

    matchingSCs.forEach((sc) => {
      const isConcluido = sc.status === 'Concluído';
      list.push({
        id: `sc-${sc.id}`,
        type: 'sc',
        title: `SC ${sc.numero} — ${sc.solicitante}`,
        subtitle: `${sc.itens.length} item(ns) | Emissão: ${formatDateBR(sc.data)}`,
        badge: sc.status,
        badgeColor: isConcluido ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600',
        icon: <ShoppingCart className="w-4 h-4 text-orange-500" />,
        onRun: () => {
          onClose();
          onSelectSC(sc);
        },
      });
    });

    // 4. Buscar Equipamentos de TI
    const matchingEquipments = equipments
      .filter((eq) => {
        const codeMatch = removeAccents(eq.codigoPatrimonio).includes(clean);
        const nameMatch = removeAccents(eq.nome).includes(clean);
        const catMatch = removeAccents(eq.categoria).includes(clean);
        const brandMatch = removeAccents(eq.marcaModelo || '').includes(clean);
        const serialMatch = removeAccents(eq.numeroSerie || '').includes(clean);
        const userMatch = removeAccents(eq.usuarioResponsavel || eq.responsavel || '').includes(clean);
        return codeMatch || nameMatch || catMatch || brandMatch || serialMatch || userMatch;
      })
      .slice(0, 5);

    matchingEquipments.forEach((eq) => {
      list.push({
        id: `eq-${eq.id}`,
        type: 'equipment',
        title: `${eq.codigoPatrimonio} — ${eq.nome}`,
        subtitle: `${eq.categoria} ${eq.marcaModelo ? `• ${eq.marcaModelo}` : ''} ${eq.usuarioResponsavel ? `• Resp: ${eq.usuarioResponsavel}` : ''}`,
        badge: eq.status,
        badgeColor:
          eq.status === 'Ativado'
            ? 'bg-emerald-500/10 text-emerald-600'
            : eq.status === 'Manutenção'
            ? 'bg-amber-500/10 text-amber-600'
            : 'bg-rose-500/10 text-rose-600',
        icon: <Laptop className="w-4 h-4 text-blue-500" />,
        onRun: () => {
          onClose();
          onSelectEquipment(eq);
        },
      });
    });

    // 5. Buscar Termos de Responsabilidade
    const matchingTerms = terms
      .filter((term) => {
        const colabMatch = removeAccents(term.colaboradorNome || '').includes(clean);
        const modelMatch = removeAccents(term.modelo || '').includes(clean);
        const docMatch = removeAccents(term.codigoDocumento || '').includes(clean);
        return colabMatch || modelMatch || docMatch;
      })
      .slice(0, 4);

    matchingTerms.forEach((term) => {
      list.push({
        id: `term-${term.id}`,
        type: 'term',
        title: `Termo: ${term.colaboradorNome}`,
        subtitle: `${term.modelo} • ${term.tituloDocumento || 'Termo de Responsabilidade'}`,
        badge: term.tipoDevolucao ? 'Devolução' : 'Entrega',
        badgeColor: term.tipoDevolucao ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600',
        icon: <FileCheck className="w-4 h-4 text-emerald-500" />,
        onRun: () => {
          onClose();
          onNavigateTab('termo-responsabilidade');
        },
      });
    });

    return list;
  }, [
    query,
    scs,
    equipments,
    terms,
    theme,
    onClose,
    onSelectSC,
    onSelectEquipment,
    onNavigateTab,
    onOpenAddSC,
    onOpenImportRM,
    onOpenAIPrintImport,
    onOpenAddEquipment,
    onOpenKioskMode,
    onOpenSettings,
    onToggleTheme,
    onExportCSV,
  ]);

  // Adjust selectedIndex if list size shrinks
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const el = document.getElementById(`palette-item-${selectedIndex}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].onRun();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
      />

      {/* Palette Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#202532] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden flex flex-col z-10"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#202532]">
          <Search className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Digite para buscar SCs, inventário, termos ou executar uma ação..."
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] sm:max-h-[440px] overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40 custom-scrollbar"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Search className="w-8 h-8 opacity-40" />
              <span>Nenhum resultado encontrado para &quot;{query}&quot;</span>
              <span className="text-[11px] text-slate-400">
                Tente buscar pelo número da SC, nome do solicitante, patrimônio ou item.
              </span>
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  id={`palette-item-${index}`}
                  onClick={item.onRun}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-950 dark:text-orange-100 ring-1 ring-orange-500/30 font-medium'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-orange-500 shrink-0 hidden sm:block animate-in slide-in-from-left-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-[#1a202c]/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-400 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px] shadow-2xs">
                ↑
              </kbd>
              <kbd className="px-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px] shadow-2xs">
                ↓
              </kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px] shadow-2xs">
                ↵
              </kbd>
              <span>Executar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px] shadow-2xs">
                ESC
              </kbd>
              <span>Fechar</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
            <Command className="w-3 h-3" /> Portal MCM
          </div>
        </div>
      </motion.div>
    </div>
  );
};

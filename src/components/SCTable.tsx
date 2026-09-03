import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  X,
  Check,
  Building2,
  Calendar,
  User,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  Plus,
  Bell,
  Sparkles,
  RotateCw,
  Download,
  Tv,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { SC, FilterOptions, GridConfig, RolePermissions, UserProfile } from '../types';
import { calcDays, formatDateBR, isSCInDateRange, compareSCNumbers } from '../utils/storage';
import { useSlaSettings, isSCDelayed, isSCDueSoon, calculateSCReminderInfo } from '../utils/sla';
import { motion, AnimatePresence } from 'motion/react';
import { useDebounce } from '../hooks/useDebounce';
import { SCRowItem } from './SCRowItem';
import { SCCardItem } from './SCCardItem';

interface SCTableProps {
  scs: SC[];
  filters: FilterOptions;
  permissions?: RolePermissions;
  currentUser?: UserProfile;
  isRefreshing?: boolean;
  onRefreshLive?: () => void;
  onFilterChange: (filters: FilterOptions) => void;
  onSelectSC: (sc: SC) => void;
  onEditSC: (sc: SC) => void;
  onDeleteSC: (id: string) => void;
  onToggleSCStatus?: (sc: SC) => void;
  onOpenImportRM?: () => void;
  onExportCSV?: () => void;
  onOpenAddSC?: () => void;
  onOpenKioskMode?: () => void;
}

const DEFAULT_GRID_CONFIG: GridConfig = {
  viewMode: 'table',
  density: 'compact',
  visibleColumns: {
    numero: true,
    data: true,
    solicitante: true,
    status: true,
    itens: true,
    dias: true,
    prioridade: true,
  },
};

export const SCTable: React.FC<SCTableProps> = ({
  scs,
  filters,
  permissions,
  currentUser,
  isRefreshing = false,
  onRefreshLive,
  onFilterChange,
  onSelectSC,
  onEditSC,
  onDeleteSC,
  onToggleSCStatus,
  onOpenImportRM,
  onExportCSV,
  onOpenAddSC,
  onOpenKioskMode,
}) => {
  const slaSettings = useSlaSettings();
  const windowDays = Math.max(2, Math.min(5, Math.ceil(slaSettings.slaDaysWarning * 0.3)));
  const dueSoonMin = Math.max(1, slaSettings.slaDaysWarning - windowDays);

  // Hover card state
  const [hoveredSC, setHoveredSC] = useState<SC | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Grid Personalization Config state
  const [gridConfig, setGridConfig] = useState<GridConfig>(() => {
    try {
      const saved = localStorage.getItem('mcm_sc_grid_config');
      if (saved) return JSON.parse(saved);
      // Auto-detect mobile screen for optimal initial view
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      return {
        ...DEFAULT_GRID_CONFIG,
        viewMode: isMobile ? 'cards' : 'table',
      };
    } catch {
      return DEFAULT_GRID_CONFIG;
    }
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('mcm_sc_grid_config', JSON.stringify(gridConfig));
  }, [gridConfig]);

  // Handle hover position
  const handleMouseMove = (e: React.MouseEvent, sc: SC) => {
    setHoveredSC(sc);
    let x = e.clientX + 15;
    let y = e.clientY + 15;

    // Boundary checks
    if (x + 280 > window.innerWidth) x = e.clientX - 295;
    if (y + 320 > window.innerHeight) y = window.innerHeight - 325;

    setHoverPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredSC(null);
  };

  // Debounce search query to prevent lag on rapid typing
  const debouncedSearch = useDebounce(filters.search, 150);

  // Filter and sort logic memoized for performance
  const filtered = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase().trim();

    const result = scs.filter((sc) => {
      const matchSearch =
        !searchLower ||
        sc.numero.toLowerCase().includes(searchLower) ||
        sc.solicitante.toLowerCase().includes(searchLower) ||
        sc.itens.some(
          (i) =>
            i.descricao.toLowerCase().includes(searchLower) ||
            i.destino.toLowerCase().includes(searchLower)
        );

      const matchStatus = !filters.status || sc.status === filters.status;

      let matchPrazo = true;
      const reminder = calculateSCReminderInfo(sc, undefined, slaSettings);

      if (filters.prazo === 'pendentes') matchPrazo = sc.status === 'Em andamento';
      if (filters.prazo === 'concluidas') matchPrazo = sc.status === 'Concluído';
      if (filters.prazo === 'atrasadas') {
        matchPrazo = sc.status === 'Em andamento' && (isSCDelayed(sc, slaSettings) || reminder.urgency === 'atrasada');
      }
      if (filters.prazo === 'vencendo_breve') {
        matchPrazo =
          sc.status === 'Em andamento' &&
          (isSCDueSoon(sc, slaSettings) || reminder.urgency === 'breve' || reminder.urgency === 'hoje');
      }

      const matchDateRange = isSCInDateRange(
        sc,
        filters.dataInicio,
        filters.dataFim,
        filters.tipoData || 'abertura'
      );

      return matchSearch && matchStatus && matchPrazo && matchDateRange;
    });

    result.sort((a, b) => {
      if (filters.sort === 'numero-desc') {
        return compareSCNumbers(a.numero, b.numero, 'desc');
      }
      if (filters.sort === 'numero-asc') {
        return compareSCNumbers(a.numero, b.numero, 'asc');
      }
      if (filters.sort === 'data-desc') {
        const diff = new Date(b.data).getTime() - new Date(a.data).getTime();
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'desc');
      }
      if (filters.sort === 'data-asc') {
        const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'asc');
      }
      if (filters.sort === 'dias-desc') {
        const diff = calcDays(b.data, b.status) - calcDays(a.data, a.status);
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'desc');
      }
      if (filters.sort === 'dias-asc') {
        const diff = calcDays(a.data, a.status) - calcDays(b.data, b.status);
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'desc');
      }
      if (filters.sort === 'solicitante-asc') {
        const diff = a.solicitante.localeCompare(b.solicitante);
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'desc');
      }
      if (filters.sort === 'solicitante-desc') {
        const diff = b.solicitante.localeCompare(a.solicitante);
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'desc');
      }
      if (filters.sort === 'status') {
        const diff = a.status.localeCompare(b.status);
        return diff !== 0 ? diff : compareSCNumbers(a.numero, b.numero, 'desc');
      }
      return compareSCNumbers(a.numero, b.numero, 'desc');
    });

    return result;
  }, [scs, debouncedSearch, filters.status, filters.prazo, filters.sort, filters.dataInicio, filters.dataFim, filters.tipoData, slaSettings]);

  const toggleColumn = (key: keyof GridConfig['visibleColumns']) => {
    setGridConfig((prev) => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [key]: !prev.visibleColumns[key],
      },
    }));
  };

  const handleSortClick = (column: 'numero' | 'data' | 'solicitante' | 'status' | 'dias') => {
    let nextSort: FilterOptions['sort'] = 'numero-desc';
    if (column === 'numero') {
      nextSort = filters.sort === 'numero-desc' ? 'numero-asc' : 'numero-desc';
    } else if (column === 'data') {
      nextSort = filters.sort === 'data-desc' ? 'data-asc' : 'data-desc';
    } else if (column === 'solicitante') {
      nextSort = filters.sort === 'solicitante-asc' ? 'solicitante-desc' : 'solicitante-asc';
    } else if (column === 'dias') {
      nextSort = filters.sort === 'dias-desc' ? 'dias-asc' : 'dias-desc';
    } else if (column === 'status') {
      nextSort = filters.sort === 'status' ? 'numero-desc' : 'status';
    }
    onFilterChange({ ...filters, sort: nextSort });
  };

  const renderSortIcon = (column: 'numero' | 'data' | 'solicitante' | 'status' | 'dias') => {
    let isCurrent = false;
    let isAsc = false;
    if (column === 'numero') {
      isCurrent = filters.sort === 'numero-desc' || filters.sort === 'numero-asc';
      isAsc = filters.sort === 'numero-asc';
    } else if (column === 'data') {
      isCurrent = filters.sort === 'data-desc' || filters.sort === 'data-asc';
      isAsc = filters.sort === 'data-asc';
    } else if (column === 'solicitante') {
      isCurrent = filters.sort === 'solicitante-asc' || filters.sort === 'solicitante-desc';
      isAsc = filters.sort === 'solicitante-asc';
    } else if (column === 'dias') {
      isCurrent = filters.sort === 'dias-desc' || filters.sort === 'dias-asc';
      isAsc = filters.sort === 'dias-asc';
    } else if (column === 'status') {
      isCurrent = filters.sort === 'status';
      isAsc = false;
    }

    if (!isCurrent) {
      return (
        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
      );
    }
    return isAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 stroke-[2.5] shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 stroke-[2.5] shrink-0" />
    );
  };

  const cellPadding =
    gridConfig.density === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-[13px]';

  const hasDateFilter = Boolean(filters.dataInicio || filters.dataFim);

  const activeFilterCount =
    (filters.status !== '' ? 1 : 0) +
    (filters.prazo !== 'todos' ? 1 : 0) +
    (filters.sort !== 'numero-desc' ? 1 : 0) +
    (hasDateFilter ? 1 : 0);

  // Date Range Quick Preset Handlers
  const handleDatePreset = (preset: 'hoje' | '7dias' | '30dias' | 'esteMes' | 'mesAnterior') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'hoje') {
      const todayISO = toISO(today);
      onFilterChange({ ...filters, dataInicio: todayISO, dataFim: todayISO });
    } else if (preset === '7dias') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      onFilterChange({ ...filters, dataInicio: toISO(past7), dataFim: toISO(today) });
    } else if (preset === '30dias') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      onFilterChange({ ...filters, dataInicio: toISO(past30), dataFim: toISO(today) });
    } else if (preset === 'esteMes') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onFilterChange({ ...filters, dataInicio: toISO(start), dataFim: toISO(end) });
    } else if (preset === 'mesAnterior') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      onFilterChange({ ...filters, dataInicio: toISO(start), dataFim: toISO(end) });
    }
  };

  const handleClearDateFilter = () => {
    onFilterChange({ ...filters, dataInicio: '', dataFim: '' });
  };

  const { totalCount, emAndamentoCount, delayedCount, vencendoBreveCount, concluidasCount } =
    useMemo(() => {
      let emAnd = 0;
      let delayed = 0;
      let vencendo = 0;
      let concluidas = 0;

      for (const s of scs) {
        if (s.status === 'Concluído') {
          concluidas++;
        } else {
          emAnd++;
          const rem = calculateSCReminderInfo(s, undefined, slaSettings);
          if (isSCDelayed(s, slaSettings) || rem.urgency === 'atrasada') {
            delayed++;
          } else if (isSCDueSoon(s, slaSettings) || rem.urgency === 'breve' || rem.urgency === 'hoje') {
            vencendo++;
          }
        }
      }

      return {
        totalCount: scs.length,
        emAndamentoCount: emAnd,
        delayedCount: delayed,
        vencendoBreveCount: vencendo,
        concluidasCount: concluidas,
      };
    }, [scs, slaSettings]);

  return (
    <section className="bg-white dark:bg-[#202634] rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col overflow-hidden relative max-w-full w-full min-w-0">
      {/* Responsive Clean Toolbar */}
      <div className="p-2.5 sm:p-4 border-b border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-[#1a202c]/50 flex flex-col gap-2.5 sm:gap-3">
        
        {/* Top Control Bar: Search Input + View Mode + Filter Toggle + Desktop Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              id="buscaSC"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Buscar por SC, solicitante, item..."
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-100 text-xs py-1.5 pl-8 sm:pl-9 pr-7 sm:pr-8 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-400 placeholder-slate-400 shadow-2xs transition-all"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, search: '' })}
                title="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Table / Cards) */}
          <div className="p-0.5 rounded-xl bg-slate-200/80 dark:bg-[#202532] border border-slate-200 dark:border-slate-700 flex items-center shrink-0 h-9">
            <button
              onClick={() => setGridConfig((prev) => ({ ...prev, viewMode: 'table' }))}
              title="Visualização em Tabela"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer h-7.5 w-7.5 sm:w-8 flex items-center justify-center ${
                gridConfig.viewMode === 'table'
                  ? 'bg-white dark:bg-[#2c3343] text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridConfig((prev) => ({ ...prev, viewMode: 'cards' }))}
              title="Visualização em Cards"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer h-7.5 w-7.5 sm:w-8 flex items-center justify-center ${
                gridConfig.viewMode === 'cards'
                  ? 'bg-white dark:bg-[#2c3343] text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filtros avançados"
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs ${
              isFilterOpen || activeFilterCount > 0
                ? 'bg-orange-500 text-white border-orange-600 font-bold'
                : 'bg-white dark:bg-[#202532] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-orange-600 font-bold text-[10px] flex items-center justify-center shadow-xs">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop Only Actions (Columns / Import RM / Export / Nova SC) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
              title="Personalizar Colunas"
              className={`h-9 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                isCustomizerOpen
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/40 font-bold'
                  : 'bg-white dark:bg-[#202532] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden md:inline">Colunas</span>
            </button>

            {onOpenImportRM && (
              <button
                type="button"
                onClick={onOpenImportRM}
                id="btnTableImportarRMDesktop"
                title="Importar dados do RM Totvs / Excel"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202532] text-slate-700 dark:text-slate-200 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-400 active:scale-95 transition-all cursor-pointer shadow-2xs h-9"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Importar RM</span>
              </button>
            )}

            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                id="btnTableExportarCSVDesktop"
                title="Exportar planilha completa em CSV"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202532] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282f40] active:scale-95 transition-all cursor-pointer shadow-2xs h-9"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden lg:inline">Exportar</span>
              </button>
            )}

            {onOpenAddSC && (
              <button
                type="button"
                onClick={onOpenAddSC}
                id="btnTableAddSCDesktop"
                title="Criar Nova Solicitação de Compra"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 h-9"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova SC</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Status Filter Scrollable Tabs + Mobile Action Quick Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
          {/* Status Quick Tabs Scrollable Strip */}
          <div className="w-full overflow-x-auto no-scrollbar touch-scroll min-w-0 py-0.5 -mx-1 px-1">
            <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-[#131722] border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold whitespace-nowrap min-w-max gap-1">
              {[
                { id: 'todos', label: 'Todas', prazo: 'todos', status: '', count: totalCount, color: 'text-slate-700 dark:text-slate-200' },
                { id: 'pendentes', label: 'Em Andamento', prazo: 'pendentes', status: 'Em andamento', count: emAndamentoCount, color: 'text-blue-600 dark:text-blue-400' },
                { id: 'atrasadas', label: `Atrasadas (>${slaSettings.slaDaysWarning}d)`, prazo: 'atrasadas', status: '', count: delayedCount, color: 'text-rose-600 dark:text-rose-400' },
                { id: 'vencendo', label: `Vencendo (${dueSoonMin}-${slaSettings.slaDaysWarning}d)`, prazo: 'vencendo_breve', status: '', count: vencendoBreveCount, color: 'text-amber-600 dark:text-amber-400' },
                { id: 'concluidas', label: 'Concluídas', prazo: 'concluidas', status: 'Concluído', count: concluidasCount, color: 'text-emerald-600 dark:text-emerald-400' },
              ].map((tab) => {
                const isActive =
                  filters.prazo === tab.prazo && (tab.status === '' || filters.status === tab.status);
                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      onFilterChange({
                        ...filters,
                        prazo: tab.prazo as FilterOptions['prazo'],
                        status: tab.status,
                      })
                    }
                    className={`relative z-10 px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1.5 min-h-[28px] sm:min-h-[30px] ${
                      isActive
                        ? 'text-orange-600 dark:text-orange-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                        : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="scTableFilterTab"
                        className="absolute inset-0 bg-white dark:bg-[#252b3b] rounded-lg shadow-xs -z-10 border border-slate-200/80 dark:border-slate-600/60"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile-Only Actions Strip (Compact & Clean) */}
          <div className="flex sm:hidden items-center justify-between gap-1.5 w-full pt-0.5">
            {onOpenAddSC && (
              <button
                type="button"
                onClick={onOpenAddSC}
                id="btnTableAddSCMobile"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-orange-600 active:bg-orange-700 text-white shadow-xs cursor-pointer h-8.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>Nova SC</span>
              </button>
            )}

            {onOpenImportRM && (
              <button
                type="button"
                onClick={onOpenImportRM}
                id="btnTableImportarRMMobile"
                title="Importar RM Totvs"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202532] text-slate-700 dark:text-slate-200 active:bg-slate-100 shadow-2xs cursor-pointer h-8.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>RM</span>
              </button>
            )}

            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                id="btnTableExportarCSVMobile"
                title="Exportar CSV"
                className="inline-flex items-center justify-center p-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202532] text-slate-700 dark:text-slate-200 active:bg-slate-100 shadow-2xs cursor-pointer h-8.5 w-8.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Strip (Shows date range, active search, or custom filters) */}
        {hasDateFilter && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>
                <strong className="font-bold">Período:</strong>{' '}
                {filters.dataInicio ? formatDateBR(filters.dataInicio) : 'Qualquer data'} até{' '}
                {filters.dataFim ? formatDateBR(filters.dataFim) : 'Hoje'}{' '}
                <span className="text-orange-600 text-[11px]">
                  (
                  {filters.tipoData === 'conclusao'
                    ? 'Conclusão'
                    : filters.tipoData === 'ambas'
                    ? 'Abertas ou Concluídas'
                    : 'Abertura'}
                  )
                </span>
              </span>
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="p-0.5 hover:bg-orange-200/80 rounded-full cursor-pointer text-orange-700 ml-0.5 transition-colors"
                title="Limpar filtro de período"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Customization Drawer */}
        <AnimatePresence>
          {isCustomizerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border border-orange-500/20 rounded-xl bg-orange-50/20 dark:bg-slate-800/40 p-4 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-orange-200/50 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Opções de Personalização do Grid
                  </h3>
                </div>
                <button
                  onClick={() => setIsCustomizerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Mode Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                    Modo de Exibição
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGridConfig((prev) => ({ ...prev, viewMode: 'table' }))}
                      className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer ${
                        gridConfig.viewMode === 'table'
                          ? 'bg-orange-500 text-white border-orange-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-[#2c3343] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <TableIcon className="w-4 h-4" />
                      <span>Tabela</span>
                    </button>
                    <button
                      onClick={() => setGridConfig((prev) => ({ ...prev, viewMode: 'cards' }))}
                      className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer ${
                        gridConfig.viewMode === 'cards'
                          ? 'bg-orange-500 text-white border-orange-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-[#2c3343] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Cards em Grid</span>
                    </button>
                  </div>
                </div>

                {/* 2. Density Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                    Densidade das Linhas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGridConfig((prev) => ({ ...prev, density: 'comfortable' }))}
                      className={`p-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        gridConfig.density === 'comfortable'
                          ? 'bg-orange-500 text-white border-orange-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-[#2c3343] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Confortável
                    </button>
                    <button
                      onClick={() => setGridConfig((prev) => ({ ...prev, density: 'compact' }))}
                      className={`p-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        gridConfig.density === 'compact'
                          ? 'bg-orange-500 text-white border-orange-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-[#2c3343] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Compacto
                    </button>
                  </div>
                </div>

                {/* 3. Column Toggle Switches */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                    Colunas Visíveis na Tabela
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'numero', label: 'SC' },
                      { key: 'data', label: 'Data' },
                      { key: 'solicitante', label: 'Solicitante' },
                      { key: 'status', label: 'Status' },
                      { key: 'itens', label: 'Itens' },
                      { key: 'dias', label: 'Dias' },
                      { key: 'prioridade', label: 'Prioridade' },
                    ].map((col) => {
                      const isVisible =
                        gridConfig.visibleColumns[col.key as keyof GridConfig['visibleColumns']];
                      return (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key as keyof GridConfig['visibleColumns'])}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                            isVisible
                              ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
                          }`}
                        >
                          {isVisible && <Check className="w-3 h-3 text-orange-600" />}
                          <span>{col.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsible Secondary Filter Options */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-orange-500" /> Opções de Filtro e Ordenação
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() =>
                      onFilterChange({ ...filters, status: '', prazo: 'todos', sort: 'numero-desc' })
                    }
                    className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Limpar Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                    id="filtroStatus"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 min-h-[38px]"
                  >
                    <option value="">Todos os status</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>

                {/* Prazo Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Prazo / Situação
                  </label>
                  <select
                    value={filters.prazo}
                    onChange={(e) =>
                      onFilterChange({ ...filters, prazo: e.target.value as FilterOptions['prazo'] })
                    }
                    id="filtroPrazo"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 min-h-[38px]"
                  >
                    <option value="todos">Todos os prazos</option>
                    <option value="pendentes">Pendentes (Em andamento)</option>
                    <option value="vencendo_breve">Vencendo em Breve / Hoje</option>
                    <option value="atrasadas">Atrasadas / Vencidas</option>
                    <option value="concluidas">Concluídas</option>
                  </select>
                </div>

                {/* Order Sort */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Ordenação
                  </label>
                  <select
                    value={filters.sort}
                    onChange={(e) =>
                      onFilterChange({ ...filters, sort: e.target.value as FilterOptions['sort'] })
                    }
                    id="ordenarSC"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 min-h-[38px]"
                  >
                    <option value="numero-desc">🔢 Número da SC (Decrescente - Padrão)</option>
                    <option value="numero-asc">🔢 Número da SC (Crescente)</option>
                    <option value="data-desc">📅 Data mais recente</option>
                    <option value="data-asc">📅 Data mais antiga</option>
                    <option value="dias-desc">⏳ Maior atraso / dias em aberto</option>
                    <option value="solicitante-asc">👤 Solicitante (A → Z)</option>
                    <option value="solicitante-desc">👤 Solicitante (Z → A)</option>
                    <option value="status">🏷️ Status</option>
                  </select>
                </div>
              </div>

              {/* Date Range Filter Section */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Intervalo de Datas (Início e Fim)
                    </span>
                  </div>
                  {hasDateFilter && (
                    <button
                      type="button"
                      onClick={handleClearDateFilter}
                      className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> Limpar Período
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Data Inicial */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Data Inicial (De)
                    </label>
                    <input
                      type="date"
                      id="filtroDataInicio"
                      value={filters.dataInicio || ''}
                      onChange={(e) => onFilterChange({ ...filters, dataInicio: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 min-h-[38px]"
                    />
                  </div>

                  {/* Data Final */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Data Final (Até)
                    </label>
                    <input
                      type="date"
                      id="filtroDataFim"
                      value={filters.dataFim || ''}
                      onChange={(e) => onFilterChange({ ...filters, dataFim: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 min-h-[38px]"
                    />
                  </div>

                  {/* Tipo de Data (Abertura / Conclusão / Ambas) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Considerar Data De
                    </label>
                    <select
                      value={filters.tipoData || 'abertura'}
                      onChange={(e) =>
                        onFilterChange({
                          ...filters,
                          tipoData: e.target.value as FilterOptions['tipoData'],
                        })
                      }
                      id="filtroTipoData"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2c3343] text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 min-h-[38px]"
                    >
                      <option value="abertura">📅 Data de Abertura (Emissão)</option>
                      <option value="conclusao">✅ Data de Conclusão (Finalizadas)</option>
                      <option value="ambas">🔄 Abertas ou Concluídas no período</option>
                    </select>
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
                    Atalhos rápidos:
                  </span>
                  {[
                    { id: 'hoje', label: 'Hoje' },
                    { id: '7dias', label: 'Últimos 7 dias' },
                    { id: '30dias', label: 'Últimos 30 dias' },
                    { id: 'esteMes', label: 'Este Mês' },
                    { id: 'mesAnterior', label: 'Mês Anterior' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleDatePreset(p.id as any)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202532] text-slate-600 dark:text-slate-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/50 transition-all cursor-pointer shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                  {hasDateFilter && (
                    <button
                      type="button"
                      onClick={handleClearDateFilter}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      Limpar datas
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid Content: Table Mode vs Cards Mode */}
      {gridConfig.viewMode === 'table' ? (
        <div className="overflow-x-auto overflow-y-auto touch-scroll max-h-[620px] min-h-[250px] relative custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1a1e28] text-slate-600 dark:text-slate-200 font-medium border-b border-slate-200 dark:border-slate-500/50 text-xs shadow-xs">
              <tr>
                {gridConfig.visibleColumns.numero && (
                  <th
                    onClick={() => handleSortClick('numero')}
                    title="Clique para ordenar por número da SC (Decrescente / Crescente)"
                    className="px-4 py-3 font-semibold cursor-pointer group hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          filters.sort === 'numero-desc' || filters.sort === 'numero-asc'
                            ? 'text-orange-600 dark:text-orange-400 font-bold'
                            : ''
                        }
                      >
                        SC
                      </span>
                      {renderSortIcon('numero')}
                    </div>
                  </th>
                )}
                {gridConfig.visibleColumns.data && (
                  <th
                    onClick={() => handleSortClick('data')}
                    title="Clique para ordenar por data"
                    className="px-4 py-3 font-semibold cursor-pointer group hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          filters.sort === 'data-desc' || filters.sort === 'data-asc'
                            ? 'text-orange-600 dark:text-orange-400 font-bold'
                            : ''
                        }
                      >
                        Data
                      </span>
                      {renderSortIcon('data')}
                    </div>
                  </th>
                )}
                {gridConfig.visibleColumns.solicitante && (
                  <th
                    onClick={() => handleSortClick('solicitante')}
                    title="Clique para ordenar por solicitante (A-Z)"
                    className="px-4 py-3 font-semibold cursor-pointer group hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          filters.sort === 'solicitante-asc' || filters.sort === 'solicitante-desc'
                            ? 'text-orange-600 dark:text-orange-400 font-bold'
                            : ''
                        }
                      >
                        Solicitante
                      </span>
                      {renderSortIcon('solicitante')}
                    </div>
                  </th>
                )}
                {gridConfig.visibleColumns.status && (
                  <th
                    onClick={() => handleSortClick('status')}
                    title="Clique para ordenar por status"
                    className="px-4 py-3 font-semibold cursor-pointer group hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          filters.sort === 'status'
                            ? 'text-orange-600 dark:text-orange-400 font-bold'
                            : ''
                        }
                      >
                        Status
                      </span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                )}
                {gridConfig.visibleColumns.itens && <th className="px-4 py-3 font-semibold">Itens</th>}
                {gridConfig.visibleColumns.dias && (
                  <th
                    onClick={() => handleSortClick('dias')}
                    title="Clique para ordenar por dias em andamento"
                    className="px-4 py-3 font-semibold cursor-pointer group hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          filters.sort === 'dias-desc' || filters.sort === 'dias-asc'
                            ? 'text-orange-600 dark:text-orange-400 font-bold'
                            : ''
                        }
                      >
                        Dias
                      </span>
                      {renderSortIcon('dias')}
                    </div>
                  </th>
                )}
                {gridConfig.visibleColumns.prioridade && (
                  <th className="px-4 py-3 font-semibold">Prioridade</th>
                )}
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-600/40" id="listaSC">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 sm:py-12 text-center">
                    {scs.length === 0 ? (
                      <div className="max-w-md mx-auto flex flex-col items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-2xs">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                            Base de Solicitações Limpa
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Importe sua planilha do RM / Excel ou cadastre solicitações manualmente.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {onOpenImportRM && (
                            <button
                              type="button"
                              onClick={onOpenImportRM}
                              className="h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors active:scale-95"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" /> Importar RM
                            </button>
                          )}
                          {onOpenAddSC && (
                            <button
                              type="button"
                              onClick={onOpenAddSC}
                              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" /> Nova SC
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 dark:text-slate-500 text-xs">
                        Nenhuma solicitação encontrada com os filtros atuais.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((sc) => (
                  <SCRowItem
                    key={sc.id}
                    sc={sc}
                    gridConfig={gridConfig}
                    cellPadding={cellPadding}
                    permissions={permissions}
                    onSelectSC={onSelectSC}
                    onEditSC={onEditSC}
                    onDeleteSC={onDeleteSC}
                    onToggleStatus={onToggleSCStatus}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards in Grid View Mode */
        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[620px] overflow-y-auto min-h-[200px] custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="col-span-full py-10 sm:py-12 text-center">
              {scs.length === 0 ? (
                <div className="max-w-md mx-auto flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-2xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      Base de Solicitações Limpa
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Importe sua planilha do RM / Excel ou cadastre solicitações manualmente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {onOpenImportRM && (
                      <button
                        type="button"
                        onClick={onOpenImportRM}
                        className="h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors active:scale-95"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Importar RM
                      </button>
                    )}
                    {onOpenAddSC && (
                      <button
                        type="button"
                        onClick={onOpenAddSC}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nova SC
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-xs">
                  Nenhuma solicitação encontrada com os filtros atuais.
                </div>
              )}
            </div>
          ) : (
            filtered.map((sc) => (
              <SCCardItem
                key={sc.id}
                sc={sc}
                permissions={permissions}
                onSelectSC={onSelectSC}
                onEditSC={onEditSC}
                onDeleteSC={onDeleteSC}
                onToggleStatus={onToggleSCStatus}
              />
            ))
          )}
        </div>
      )}

      {/* Floating Hover Card / Tooltip */}
      {hoveredSC && (
        <div
          id="hoverCard"
          style={{
            left: `${hoverPos.x}px`,
            top: `${hoverPos.y}px`,
          }}
          className="fixed z-40 bg-white dark:bg-[#2a3040] border border-slate-200 dark:border-slate-500/60 shadow-2xl rounded-xl w-72 pointer-events-none transition-opacity duration-150 animate-in fade-in"
        >
          <div className="bg-slate-50 dark:bg-[#202532] px-4 py-2 border-b border-slate-200 dark:border-slate-600/50 rounded-t-xl font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center justify-between">
            <span>{hoveredSC.numero}</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {hoveredSC.itens.length} item(ns)
            </span>
          </div>

          <div className="p-3 flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Data Emissão:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {formatDateBR(hoveredSC.data)}
              </strong>
            </div>
            {hoveredSC.status !== 'Concluído' && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Vencimento:</span>
                <strong className="text-orange-600 dark:text-orange-400 font-mono">
                  {formatDateBR(calculateSCReminderInfo(hoveredSC).dataVencimentoEfetiva)}
                </strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Solicitante:</span>
              <strong className="text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                {hoveredSC.solicitante}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status:</span>
              <strong className="text-slate-800 dark:text-slate-200">{hoveredSC.status}</strong>
            </div>
          </div>

          <div className="p-3">
            <div className="text-[11px] font-semibold mb-1.5 text-slate-400 uppercase tracking-wider">
              Resumo dos Itens
            </div>
            <div className="max-h-36 overflow-y-auto rounded border border-slate-100 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <tr>
                    <th className="p-1.5 font-medium">Item</th>
                    <th className="p-1.5 font-medium w-8">Un.</th>
                    <th className="p-1.5 font-medium">Destino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {hoveredSC.itens.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-slate-400 text-xs">
                        Nenhum item
                      </td>
                    </tr>
                  ) : (
                    hoveredSC.itens.map((i, idx) => (
                      <tr key={i.id || idx}>
                        <td className="p-1.5 truncate max-w-[110px] text-slate-700 dark:text-slate-300" title={i.descricao}>
                          {i.descricao}
                        </td>
                        <td className="p-1.5 text-slate-500">{i.unidade}</td>
                        <td className="p-1.5 truncate max-w-[90px] text-slate-600 dark:text-slate-400" title={i.destino}>
                          {i.destino}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

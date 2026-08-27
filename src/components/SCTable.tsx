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
} from 'lucide-react';
import { SC, FilterOptions, GridConfig, RolePermissions, UserProfile } from '../types';
import { calcDays, isDelayed, formatDateBR } from '../utils/storage';
import { calculateSCReminderInfo } from '../services/notificationService';
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
}

const DEFAULT_GRID_CONFIG: GridConfig = {
  viewMode: 'table',
  density: 'comfortable',
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
}) => {
  // Hover card state
  const [hoveredSC, setHoveredSC] = useState<SC | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Grid Personalization Config state
  const [gridConfig, setGridConfig] = useState<GridConfig>(() => {
    try {
      const saved = localStorage.getItem('mcm_sc_grid_config');
      return saved ? JSON.parse(saved) : DEFAULT_GRID_CONFIG;
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
      const dias = calcDays(sc.data, sc.status);
      const reminder = calculateSCReminderInfo(sc);

      if (filters.prazo === 'pendentes') matchPrazo = sc.status === 'Em andamento';
      if (filters.prazo === 'concluidas') matchPrazo = sc.status === 'Concluído';
      if (filters.prazo === 'atrasadas') {
        matchPrazo = sc.status === 'Em andamento' && (dias > 7 || reminder.urgency === 'atrasada');
      }
      if (filters.prazo === 'vencendo_breve') {
        matchPrazo =
          sc.status === 'Em andamento' &&
          (reminder.urgency === 'breve' || reminder.urgency === 'hoje' || (dias >= 5 && dias <= 7));
      }

      return matchSearch && matchStatus && matchPrazo;
    });

    result.sort((a, b) => {
      if (filters.sort === 'data-desc') return new Date(b.data).getTime() - new Date(a.data).getTime();
      if (filters.sort === 'data-asc') return new Date(a.data).getTime() - new Date(b.data).getTime();
      if (filters.sort === 'dias-desc')
        return calcDays(b.data, b.status) - calcDays(a.data, a.status);
      if (filters.sort === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  }, [scs, debouncedSearch, filters.status, filters.prazo, filters.sort]);

  const toggleColumn = (key: keyof GridConfig['visibleColumns']) => {
    setGridConfig((prev) => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [key]: !prev.visibleColumns[key],
      },
    }));
  };

  const cellPadding =
    gridConfig.density === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm';

  const activeFilterCount =
    (filters.status !== '' ? 1 : 0) +
    (filters.prazo !== 'todos' ? 1 : 0) +
    (filters.sort !== 'data-desc' ? 1 : 0);

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
          const d = calcDays(s.data, s.status);
          if (d > 7) delayed++;
          if (d >= 4 && d <= 7) vencendo++;
        }
      }

      return {
        totalCount: scs.length,
        emAndamentoCount: emAnd,
        delayedCount: delayed,
        vencendoBreveCount: vencendo,
        concluidasCount: concluidas,
      };
    }, [scs]);

  return (
    <section className="bg-white dark:bg-[#202634] rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col overflow-hidden relative max-w-full w-full min-w-0">
      {/* Streamlined Compact Table Navbar & Toolbar */}
      <div className="p-2.5 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex flex-col gap-2 sm:gap-2.5">
        {/* Row 1: Segmented Status Filter Tabs + Desktop Actions */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Status Quick Tabs */}
          <div className="flex-1 overflow-x-auto no-scrollbar touch-scroll min-w-0 py-0.5">
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#131722] border border-slate-200 dark:border-slate-700/80 text-xs font-semibold whitespace-nowrap min-w-max">
              {[
                { id: 'todos', label: 'Todas', prazo: 'todos', status: '', count: totalCount, color: 'text-slate-700 dark:text-slate-200' },
                { id: 'pendentes', label: 'Em Andamento', prazo: 'pendentes', status: 'Em andamento', count: emAndamentoCount, color: 'text-blue-600 dark:text-blue-400' },
                { id: 'atrasadas', label: 'Atrasadas (>7d)', prazo: 'atrasadas', status: '', count: delayedCount, color: 'text-red-600 dark:text-red-400' },
                { id: 'vencendo', label: 'Vencendo', prazo: 'vencendo_breve', status: '', count: vencendoBreveCount, color: 'text-amber-600 dark:text-amber-400' },
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
                    className={`relative z-10 px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 min-h-[28px] sm:min-h-[30px] ${
                      isActive
                        ? 'text-orange-600 dark:text-orange-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300'
                        : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="scTableFilterTab"
                        className="absolute inset-0 bg-white dark:bg-[#252b3b] rounded-lg shadow-2xs -z-10 border border-slate-200/80 dark:border-slate-600/60"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Only Quick Actions */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {onOpenImportRM && (
              <button
                type="button"
                onClick={onOpenImportRM}
                id="btnTableImportarRM"
                title="Importar dados do RM Totvs / Excel"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532] text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 active:scale-95 transition-all cursor-pointer shadow-2xs min-h-[30px]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Importar RM</span>
              </button>
            )}

            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                id="btnTableExportarCSV"
                title="Exportar planilha completa em CSV"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282f40] active:scale-95 transition-all cursor-pointer shadow-2xs min-h-[30px]"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Exportar</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search Bar + View Mode + Filtros + Colunas + Mobile Import/Export */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              id="buscaSC"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Buscar por número, solicitante, item..."
              className="w-full h-8.5 sm:h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#2c3343] text-slate-800 dark:text-slate-100 text-xs py-1 pl-9 pr-8 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-400 placeholder-slate-400 min-h-[34px] shadow-2xs transition-all"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, search: '' })}
                title="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Mobile-only Import & Export icon buttons */}
            {onOpenImportRM && (
              <button
                type="button"
                onClick={onOpenImportRM}
                title="Importar RM Totvs"
                className="md:hidden h-8.5 w-8.5 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532] text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:text-orange-600 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>
            )}

            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                title="Exportar CSV"
                className="md:hidden h-8.5 w-8.5 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282f40] transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
              >
                <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            )}

            {/* Quick View Mode Switcher (Table / Cards) */}
            <div className="p-0.5 rounded-xl bg-slate-100 dark:bg-[#202532] border border-slate-200 dark:border-slate-700 flex items-center shrink-0 h-8.5 sm:h-9">
              <button
                onClick={() => setGridConfig((prev) => ({ ...prev, viewMode: 'cards' }))}
                title="Visualização em Cards (Ideal para Celular)"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer h-7 w-7 sm:h-7.5 sm:w-7.5 flex items-center justify-center ${
                  gridConfig.viewMode === 'cards'
                    ? 'bg-white dark:bg-[#2c3343] text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setGridConfig((prev) => ({ ...prev, viewMode: 'table' }))}
                title="Visualização em Tabela"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer h-7 w-7 sm:h-7.5 sm:w-7.5 flex items-center justify-center ${
                  gridConfig.viewMode === 'table'
                    ? 'bg-white dark:bg-[#2c3343] text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-orange-500 text-white border-orange-600'
                  : 'bg-slate-50 dark:bg-[#202532] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-orange-600 dark:bg-slate-900 dark:text-orange-400 font-mono text-[10px] font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Customize Grid Button */}
            <button
              onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
              className={`h-8.5 sm:h-9 px-2 sm:px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isCustomizerOpen
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/40'
                  : 'bg-slate-50 dark:bg-[#202532] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden lg:inline">Colunas</span>
            </button>
          </div>
        </div>

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
                      onFilterChange({ ...filters, status: '', prazo: 'todos', sort: 'data-desc' })
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
                    <option value="data-desc">Mais recentes</option>
                    <option value="data-asc">Mais antigas</option>
                    <option value="dias-desc">Maior atraso</option>
                    <option value="status">Status</option>
                  </select>
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
                {gridConfig.visibleColumns.numero && <th className="px-4 py-3 font-semibold">SC</th>}
                {gridConfig.visibleColumns.data && <th className="px-4 py-3 font-semibold">Data</th>}
                {gridConfig.visibleColumns.solicitante && (
                  <th className="px-4 py-3 font-semibold">Solicitante</th>
                )}
                {gridConfig.visibleColumns.status && <th className="px-4 py-3 font-semibold">Status</th>}
                {gridConfig.visibleColumns.itens && <th className="px-4 py-3 font-semibold">Itens</th>}
                {gridConfig.visibleColumns.dias && <th className="px-4 py-3 font-semibold">Dias</th>}
                {gridConfig.visibleColumns.prioridade && (
                  <th className="px-4 py-3 font-semibold">Prioridade</th>
                )}
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-600/40" id="listaSC">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    {scs.length === 0 ? (
                      <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-xs">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            Base de Solicitações Limpa
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Você pode importar sua tabela de dados do RM / Excel ou cadastrar solicitações manualmente.
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 mt-2">
                          {onOpenImportRM && (
                            <button
                              type="button"
                              onClick={onOpenImportRM}
                              className="px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4" /> Importar Tabela RM
                            </button>
                          )}
                          {onOpenAddSC && (
                            <button
                              type="button"
                              onClick={onOpenAddSC}
                              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Plus className="w-4 h-4" /> Nova SC
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
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[620px] overflow-y-auto min-h-[250px] custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              {scs.length === 0 ? (
                <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Base de Solicitações Limpa
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Você pode importar sua tabela de dados do RM / Excel ou cadastrar solicitações manualmente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2">
                    {onOpenImportRM && (
                      <button
                        type="button"
                        onClick={onOpenImportRM}
                        className="px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" /> Importar Tabela RM
                      </button>
                    )}
                    {onOpenAddSC && (
                      <button
                        type="button"
                        onClick={onOpenAddSC}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-4 h-4" /> Nova SC
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

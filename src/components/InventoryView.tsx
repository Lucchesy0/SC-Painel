import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Wrench,
  CheckCircle2,
  Ban,
  MapPin,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  Tag,
  RotateCcw,
  RotateCw,
  CopyPlus,
  X,
} from 'lucide-react';
import { Equipment, EquipmentStatus } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { triggerHaptic } from '../utils/haptics';

interface InventoryViewProps {
  equipments: Equipment[];
  searchQuery: string;
  isRefreshing?: boolean;
  lastSyncTime?: string;
  onRefreshLive?: () => void;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (eq: Equipment) => void;
  onOpenDetailModal: (eq: Equipment) => void;
  onDeleteEquipment: (id: string) => void;
  onSaveEquipment?: (eq: Equipment) => void;
  onBulkAddEquipments?: (eqs: Equipment[]) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  equipments,
  searchQuery,
  isRefreshing = false,
  lastSyncTime,
  onRefreshLive,
  onSearchChange,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDetailModal,
  onDeleteEquipment,
  onSaveEquipment,
  onToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'codigo' | 'nome' | 'status' | 'localizacao'>('codigo');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [eqToDelete, setEqToDelete] = useState<Equipment | null>(null);

  const activeInventoryFilterCount =
    (selectedCategory !== 'todos' ? 1 : 0) +
    (selectedStatus !== 'todos' ? 1 : 0) +
    (sortBy !== 'codigo' ? 1 : 0);

  // Statistics
  const stats = useMemo(() => {
    const total = equipments.length;
    const ativados = equipments.filter((e) => e.status === 'Ativado').length;
    const manutencao = equipments.filter((e) => e.status === 'Manutenção').length;
    const desativados = equipments.filter((e) => e.status === 'Desativado').length;

    const setCat = new Set<string>();
    equipments.forEach((e) => {
      if (e.categoria) setCat.add(e.categoria);
    });
    const totalCategorias = setCat.size;

    return { total, ativados, manutencao, desativados, totalCategorias };
  }, [equipments]);

  // Extract categories dynamically with counts
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    equipments.forEach((e) => {
      if (e.categoria) {
        map.set(e.categoria, (map.get(e.categoria) || 0) + 1);
      }
    });
    return map;
  }, [equipments]);

  const categories = useMemo(() => {
    return Array.from(categoryCounts.keys()).sort();
  }, [categoryCounts]);

  // Filtered equipments
  const filteredEquipments = useMemo(() => {
    return equipments
      .filter((eq) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          eq.nome.toLowerCase().includes(q) ||
          eq.codigoPatrimonio.toLowerCase().includes(q) ||
          eq.localizacao.toLowerCase().includes(q) ||
          (eq.categoria && eq.categoria.toLowerCase().includes(q));

        const matchesCat = selectedCategory === 'todos' || eq.categoria === selectedCategory;
        const matchesStatus = selectedStatus === 'todos' || eq.status === selectedStatus;

        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'codigo') return a.codigoPatrimonio.localeCompare(b.codigoPatrimonio);
        if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        if (sortBy === 'localizacao') return a.localizacao.localeCompare(b.localizacao);
        return 0;
      });
  }, [equipments, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Quick Duplicate Asset with blank AF
  const handleDuplicate = (eq: Equipment) => {
    triggerHaptic('light');
    onOpenEditModal({
      ...eq,
      id: 'eq-' + Math.random().toString(36).substring(2, 9),
      codigoPatrimonio: '',
      nome: `${eq.nome} (Cópia)`,
    });
  };

  // Quick Toggle Status
  const handleQuickToggleStatus = (e: React.MouseEvent, eq: Equipment) => {
    e.stopPropagation();
    if (!onSaveEquipment) return;

    triggerHaptic('light');
    const nextStatus: EquipmentStatus =
      eq.status === 'Ativado'
        ? 'Manutenção'
        : eq.status === 'Manutenção'
        ? 'Desativado'
        : 'Ativado';

    const updated: Equipment = {
      ...eq,
      status: nextStatus,
    };

    onSaveEquipment(updated);
    if (onToast) {
      onToast(`Status de ${eq.codigoPatrimonio || 'Equipamento'} atualizado para "${nextStatus}"!`, 'info');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    triggerHaptic('light');
    const headers = ['AF', 'Nome', 'Categoria', 'Localização', 'Status'];
    const rows = filteredEquipments.map((e) => [
      `"${e.codigoPatrimonio}"`,
      `"${e.nome.replace(/"/g, '""')}"`,
      `"${e.categoria || ''}"`,
      `"${e.localizacao}"`,
      `"${e.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `mcm_equipamentos_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onToast) onToast('Planilha de equipamentos exportada com sucesso!', 'success');
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    if (status === 'Ativado') {
      return (
        <span
          title="Status: Ativado (Clique para alternar)"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap hover:bg-emerald-500/20 transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3 h-3 shrink-0" /> Ativado
        </span>
      );
    }
    if (status === 'Manutenção') {
      return (
        <span
          title="Status: Manutenção (Clique para alternar)"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap hover:bg-amber-500/20 transition-colors cursor-pointer"
        >
          <Wrench className="w-3 h-3 shrink-0" /> Manutenção
        </span>
      );
    }
    return (
      <span
        title="Status: Desativado (Clique para alternar)"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap hover:bg-rose-500/20 transition-colors cursor-pointer"
      >
        <Ban className="w-3 h-3 shrink-0" /> Desativado
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner with Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total */}
        <div
          onClick={() => {
            setSelectedStatus('todos');
            setSelectedCategory('todos');
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-blue-500/50 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
              Total de Equipamentos
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Ativados */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Ativado' ? 'todos' : 'Ativado')}
          className={`p-3.5 rounded-2xl bg-white dark:bg-[#202532] border shadow-2xs cursor-pointer transition-all flex items-center justify-between ${
            selectedStatus === 'Ativado'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Ativados
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.ativados}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Manutenção */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Manutenção' ? 'todos' : 'Manutenção')}
          className={`p-3.5 rounded-2xl bg-white dark:bg-[#202532] border shadow-2xs cursor-pointer transition-all flex items-center justify-between ${
            selectedStatus === 'Manutenção'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-700/80 hover:border-amber-500/50'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-amber-600 dark:text-amber-400 block mb-0.5">
              Manutenção
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.manutencao}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Desativados */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Desativado' ? 'todos' : 'Desativado')}
          className={`p-3.5 rounded-2xl bg-white dark:bg-[#202532] border shadow-2xs cursor-pointer transition-all flex items-center justify-between ${
            selectedStatus === 'Desativado'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-700/80 hover:border-rose-500/50'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-rose-600 dark:text-rose-400 block mb-0.5">
              Desativados
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.desativados}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, View Modes, Add Button */}
      <div className="p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-700/80 shadow-2xs flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por AF, nome, categoria..."
              className="w-full h-8 sm:h-8.5 pl-8 pr-7 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Live refresh */}
            {onRefreshLive && (
              <button
                onClick={onRefreshLive}
                disabled={isRefreshing}
                title={lastSyncTime ? `Última sincronização: ${lastSyncTime}` : 'Atualizar'}
                className="h-8 sm:h-8.5 w-8 sm:w-8.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
              >
                <RotateCw className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 shadow-2xs active:scale-95 ${
                isFilterOpen || activeInventoryFilterCount > 0
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeInventoryFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {activeInventoryFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-8 sm:h-8.5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-colors cursor-pointer h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#202532] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-md transition-colors cursor-pointer h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#202532] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cadastrar Equipamento Button */}
            <button
              onClick={onOpenAddModal}
              className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs hover:shadow-blue-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo</span>
              <span className="hidden md:inline"> Equipamento</span>
            </button>
          </div>
        </div>

        {/* Expandable Filter Drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200 dark:border-slate-700 pt-3 flex flex-col gap-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 min-h-[38px]"
                  >
                    <option value="todos">Todas as categorias</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({categoryCounts.get(cat)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 min-h-[38px]"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="Ativado">Ativado</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Desativado">Desativado</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Ordenação
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs py-2 px-3 focus:ring-2 focus:ring-blue-500 min-h-[38px]"
                  >
                    <option value="codigo">Código AF (Crescente)</option>
                    <option value="nome">Nome do Equipamento (A-Z)</option>
                    <option value="status">Status</option>
                    <option value="localizacao">Localização</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2.5 mt-1">
                <button
                  onClick={() => {
                    setSelectedCategory('todos');
                    setSelectedStatus('todos');
                    setSortBy('codigo');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Limpar Filtros
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1 rounded-lg bg-slate-200/50 hover:bg-emerald-500/10 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Exportar (CSV)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content List / Grid */}
      {filteredEquipments.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#202532] shadow-xs">
          <Boxes className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
            Nenhum equipamento cadastrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {equipments.length === 0
              ? 'Seu acervo de equipamentos está vazio. Clique no botão abaixo para cadastrar.'
              : 'Nenhum equipamento coincide com os filtros aplicados.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md min-h-[44px] cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Equipamento
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[660px] overflow-y-auto touch-scroll custom-scrollbar p-1">
          {filteredEquipments.map((eq) => (
            <div
              key={eq.id}
              onClick={() => onOpenDetailModal(eq)}
              className="group bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-600/60 rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-500/50 transition-all flex flex-col justify-between cursor-pointer"
            >
              <div className="p-3.5 flex flex-col gap-2.5">
                {/* Header Row: AF Code & Status Toggle Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-800 text-white text-xs font-mono font-black shadow-2xs shrink-0 tracking-tight">
                    {eq.codigoPatrimonio || 'AF'}
                  </span>
                  <div
                    onClick={(e) => handleQuickToggleStatus(e, eq)}
                    className="shrink-0"
                    title="Clique para alternar status"
                  >
                    {getStatusBadge(eq.status)}
                  </div>
                </div>

                {/* Card Info Body */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block truncate">
                    {eq.categoria}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 leading-snug">
                    {eq.nome}
                  </h3>
                </div>

                {/* Localização */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="font-semibold truncate">{eq.localizacao}</span>
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                className="px-3 py-2 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onOpenDetailModal(eq)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[36px] active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> Detalhes
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(eq)}
                    title="Duplicar Equipamento"
                    aria-label="Duplicar Equipamento"
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-90"
                  >
                    <CopyPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenEditModal(eq)}
                    title="Editar"
                    aria-label="Editar Equipamento"
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-90"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEqToDelete(eq)}
                    title="Excluir"
                    aria-label="Excluir Equipamento"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="border border-slate-200 dark:border-slate-600/60 rounded-2xl overflow-hidden bg-white dark:bg-[#202532] shadow-xs">
          <div className="overflow-x-auto overflow-y-auto touch-scroll max-h-[660px] custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
                <tr>
                  <th className="p-3">AF</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Localização</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEquipments.map((eq) => (
                  <tr
                    key={eq.id}
                    onClick={() => onOpenDetailModal(eq)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {eq.codigoPatrimonio}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {eq.nome}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                      {eq.categoria}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                      {eq.localizacao}
                    </td>
                    <td
                      className="p-3 whitespace-nowrap"
                      onClick={(e) => handleQuickToggleStatus(e, eq)}
                    >
                      {getStatusBadge(eq.status)}
                    </td>
                    <td
                      className="p-3 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenDetailModal(eq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(eq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Duplicar"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenEditModal(eq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEqToDelete(eq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(eqToDelete)}
        title="Excluir Equipamento"
        message={
          eqToDelete
            ? `Tem certeza que deseja remover o equipamento "${eqToDelete.nome}" (${eqToDelete.codigoPatrimonio})? Esta ação não pode ser desfeita.`
            : ''
        }
        onConfirm={() => {
          if (eqToDelete) {
            onDeleteEquipment(eqToDelete.id);
            setEqToDelete(null);
          }
        }}
        onCancel={() => setEqToDelete(null)}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ShoppingCart,
  Boxes,
  Calendar,
  MapPin,
  Tag,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  Command,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { SC, Equipment, MainModule } from '../types';
import { formatDateBR } from '../utils/storage';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  scs: SC[];
  equipments: Equipment[];
  onSelectSC: (sc: SC) => void;
  onSelectEquipment: (eq: Equipment) => void;
  onApplyTableSearch: (query: string, module: MainModule) => void;
}

type SearchTab = 'all' | 'sc' | 'inventario';

function removeAccents(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  scs,
  equipments,
  onSelectSC,
  onSelectEquipment,
  onApplyTableSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Foca no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Listener para atalho global Ctrl+K ou Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open is managed by parent, but if this is mounted we can toggle
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtro de Solicitações de Compra
  const filteredSCs = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = removeAccents(searchTerm.trim());

    return scs.filter((sc) => {
      const numMatch = removeAccents(sc.numero).includes(term);
      const solMatch = removeAccents(sc.solicitante).includes(term);
      const tipoMatch = removeAccents(sc.tipo || '').includes(term);
      const origemMatch = removeAccents(sc.origem || '').includes(term);
      const statusMatch = removeAccents(sc.status).includes(term);
      const prioMatch = removeAccents(sc.prioridade || '').includes(term);
      const projMatch = removeAccents(sc.projeto || '').includes(term);
      const dataMatch = (sc.data || '').includes(term);

      const itemsMatch = (sc.itens || []).some(
        (it) =>
          removeAccents(it.descricao).includes(term) ||
          removeAccents(it.destino).includes(term) ||
          removeAccents(it.unidade || '').includes(term) ||
          removeAccents(it.observacoes || '').includes(term)
      );

      return (
        numMatch ||
        solMatch ||
        tipoMatch ||
        origemMatch ||
        statusMatch ||
        prioMatch ||
        projMatch ||
        dataMatch ||
        itemsMatch
      );
    });
  }, [scs, searchTerm]);

  // Filtro de Inventário de Equipamentos
  const filteredEquipments = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = removeAccents(searchTerm.trim());

    return equipments.filter((eq) => {
      const codMatch = removeAccents(eq.codigoPatrimonio).includes(term);
      const nomeMatch = removeAccents(eq.nome).includes(term);
      const catMatch = removeAccents(eq.categoria).includes(term);
      const marcaMatch = removeAccents(eq.marcaModelo || '').includes(term);
      const locMatch = removeAccents(eq.localizacao).includes(term);
      const statusMatch = removeAccents(eq.status).includes(term);
      const obsMatch = removeAccents(eq.observacoes || '').includes(term);

      return (
        codMatch ||
        nomeMatch ||
        catMatch ||
        marcaMatch ||
        locMatch ||
        statusMatch ||
        obsMatch
      );
    });
  }, [equipments, searchTerm]);

  // Unificação dos itens selecionáveis
  const combinedResults = useMemo(() => {
    const list: Array<{ type: 'sc'; data: SC } | { type: 'equipment'; data: Equipment }> = [];

    if (activeTab === 'all' || activeTab === 'sc') {
      filteredSCs.forEach((sc) => list.push({ type: 'sc', data: sc }));
    }
    if (activeTab === 'all' || activeTab === 'inventario') {
      filteredEquipments.forEach((eq) => list.push({ type: 'equipment', data: eq }));
    }

    return list;
  }, [filteredSCs, filteredEquipments, activeTab]);

  // Reseta index selecionado ao alterar busca ou tab
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, activeTab]);

  // Scroll automático para item ativo na lista
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Tratamento de teclado na lista (setas e Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < combinedResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedResults.length > 0 && combinedResults[selectedIndex]) {
        const item = combinedResults[selectedIndex];
        if (item.type === 'sc') {
          onSelectSC(item.data);
        } else {
          onSelectEquipment(item.data);
        }
        onClose();
      } else if (searchTerm.trim()) {
        // Aplica busca na tabela do módulo ativo
        onApplyTableSearch(searchTerm, activeTab === 'inventario' ? 'inventario' : 'sc');
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!text || !query.trim()) return text;
    const cleanQuery = query.trim();
    const regex = new RegExp(`(${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-20 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1f2430] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600/80 flex flex-col max-h-[82vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center gap-3 bg-slate-50/80 dark:bg-[#181c25]">
          <Search className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar simultaneamente em SCs e Equipamentos (código, item, setor, marca, obra)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/70 border border-slate-300 dark:border-slate-600 rounded">
            ESC
          </kbd>
        </div>

        {/* Filter Tabs Bar */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1d222d] flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Todos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-500/20">
                {filteredSCs.length + filteredEquipments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sc')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sc'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Solicitações (SC)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-500/20">
                {filteredSCs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventario')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inventario'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Equipamentos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20">
                {filteredEquipments.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span>
              <strong className="text-slate-600 dark:text-slate-300">↑↓</strong> Navegar
            </span>
            <span>
              <strong className="text-slate-600 dark:text-slate-300">↵</strong> Abrir
            </span>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 sm:p-3 flex flex-col gap-1.5 min-h-[220px]">
          {!searchTerm.trim() ? (
            /* Empty Search Prompt */
            <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 mb-3 shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Busca Rápida Global MCM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Digite o número da SC, código AF, nome de item, setor de custo, marca ou localização para pesquisar em tempo real em ambas as bases.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-5 w-full max-w-md text-left text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400 mb-1">
                    <ShoppingCart className="w-3.5 h-3.5" /> Solicitações SC
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total de <strong>{scs.length}</strong> cadastradas
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 mb-1">
                    <Boxes className="w-3.5 h-3.5" /> Equipamentos
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total de <strong>{equipments.length}</strong> no acervo
                  </p>
                </div>
              </div>
            </div>
          ) : combinedResults.length === 0 ? (
            /* No Results */
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum resultado encontrado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Nenhum registro de Solicitação ou Equipamento coincide com "<strong>{searchTerm}</strong>".
              </p>
            </div>
          ) : (
            /* Result Items */
            combinedResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              if (item.type === 'sc') {
                const sc = item.data;
                const itemsCount = sc.itens?.length || 0;
                const itemsSample = sc.itens?.map((i) => i.descricao).slice(0, 2).join(', ');

                return (
                  <div
                    key={`sc-${sc.id || sc.numero}`}
                    data-active={isSelected ? 'true' : 'false'}
                    onClick={() => {
                      onSelectSC(sc);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/40 shadow-xs'
                        : 'bg-white dark:bg-[#181c25] border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-[#1c2230]'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                        <ShoppingCart className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {highlightMatch(sc.numero, searchTerm)}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            SC / Compra
                          </span>

                          {sc.tipo && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              {sc.tipo}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                              sc.status === 'Concluído'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {sc.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                          <strong className="text-slate-700 dark:text-slate-200">Setor:</strong>{' '}
                          {highlightMatch(sc.solicitante, searchTerm)}
                        </p>

                        {itemsCount > 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
                            <Package className="w-3 h-3 shrink-0 text-slate-400" />
                            <span>
                              <strong>{itemsCount} item(ns):</strong> {highlightMatch(itemsSample, searchTerm)}
                              {itemsCount > 2 ? '...' : ''}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">
                            Lista de itens vazia
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDateBR(sc.data)}
                      </span>
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">
                        Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              }

              // Equipamento Item
              const eq = item.data;
              return (
                <div
                  key={`eq-${eq.id || eq.codigoPatrimonio}`}
                  data-active={isSelected ? 'true' : 'false'}
                  onClick={() => {
                    onSelectEquipment(eq);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500/40 shadow-xs'
                      : 'bg-white dark:bg-[#181c25] border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-[#1c2230]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <Boxes className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          {highlightMatch(eq.codigoPatrimonio, searchTerm)}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Inventário / Equipamento
                        </span>

                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                          {eq.categoria}
                        </span>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                            eq.status === 'Ativado'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : eq.status === 'Manutenção'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {eq.status}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                        {highlightMatch(eq.nome, searchTerm)}
                        {eq.marcaModelo && (
                          <span className="text-slate-500 font-normal ml-1.5">
                            ({highlightMatch(eq.marcaModelo, searchTerm)})
                          </span>
                        )}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>{highlightMatch(eq.localizacao, searchTerm)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    {eq.valorEstimado ? (
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eq.valorEstimado)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">-</span>
                    )}
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                      Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & filter trigger */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#181c25] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-slate-400" />
            <span>Pressione <strong>Ctrl + K</strong> a qualquer momento para buscar</span>
          </div>

          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => {
                onApplyTableSearch(searchTerm, activeTab === 'inventario' ? 'inventario' : 'sc');
                onClose();
              }}
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Filtrar na tabela</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

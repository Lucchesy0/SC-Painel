import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ShoppingCart,
  Boxes,
  Calendar,
  ArrowRight,
  Sparkles,
  Command,
  AlertCircle,
} from 'lucide-react';
import { SC, Equipment } from '../types';
import { formatDateBR, compareSCNumbers } from '../utils/storage';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderSearchDropdownProps {
  scs: SC[];
  equipments: Equipment[];
  onSelectSC: (sc: SC) => void;
  onSelectEquipment: (eq: Equipment) => void;
  onApplyTableSearch?: (query: string, targetModule: 'solicitacoes' | 'inventario') => void;
}

type SearchTab = 'all' | 'sc' | 'inventario';

function removeAccents(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const HeaderSearchDropdown: React.FC<HeaderSearchDropdownProps> = ({
  scs,
  equipments,
  onSelectSC,
  onSelectEquipment,
  onApplyTableSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcuts (⌘K, Ctrl+K, Ctrl+F, '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.metaKey || e.ctrlKey;
      const isSearchShortcut =
        (isModifier && e.key.toLowerCase() === 'k') ||
        (isModifier && e.key.toLowerCase() === 'f') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA');

      if (isSearchShortcut) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('open-global-search', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('open-global-search', handleCustomOpen);
    };
  }, [isOpen]);

  // Click / touch outside to close dropdown on desktop
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Filter SCs
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
    }).sort((a, b) => compareSCNumbers(a.numero, b.numero, 'desc'));
  }, [scs, searchTerm]);

  // Filter Equipments
  const filteredEquipments = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = removeAccents(searchTerm.trim());

    return equipments.filter((eq) => {
      const codeMatch = removeAccents(eq.codigoPatrimonio).includes(term);
      const nameMatch = removeAccents(eq.nome).includes(term);
      const catMatch = removeAccents(eq.categoria).includes(term);
      const brandMatch = removeAccents(eq.marcaModelo || '').includes(term);
      const serialMatch = removeAccents(eq.numeroSerie || '').includes(term);
      const locMatch = removeAccents(eq.localizacao || '').includes(term);
      const userMatch = removeAccents(eq.usuarioResponsavel || eq.responsavel || '').includes(term);
      const statusMatch = removeAccents(eq.status).includes(term);
      const obsMatch = removeAccents(eq.observacoes || '').includes(term);

      return (
        codeMatch ||
        nameMatch ||
        catMatch ||
        brandMatch ||
        serialMatch ||
        locMatch ||
        userMatch ||
        statusMatch ||
        obsMatch
      );
    });
  }, [equipments, searchTerm]);

  // Combined Results list based on activeTab
  const combinedResults = useMemo(() => {
    const list: Array<
      | { type: 'sc'; item: SC; id: string }
      | { type: 'equipment'; item: Equipment; id: string }
    > = [];

    if (activeTab === 'all' || activeTab === 'sc') {
      filteredSCs.slice(0, 15).forEach((sc) => {
        list.push({ type: 'sc', item: sc, id: `sc-${sc.id}` });
      });
    }

    if (activeTab === 'all' || activeTab === 'inventario') {
      filteredEquipments.slice(0, 15).forEach((eq) => {
        list.push({ type: 'equipment', item: eq, id: `eq-${eq.id}` });
      });
    }

    return list;
  }, [filteredSCs, filteredEquipments, activeTab]);

  // Reset selected index when term or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, activeTab]);

  // Keyboard navigation within dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < combinedResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : combinedResults.length - 1));
    } else if (e.key === 'Enter' && combinedResults.length > 0) {
      e.preventDefault();
      const current = combinedResults[selectedIndex];
      if (current) {
        if (current.type === 'sc') {
          onSelectSC(current.item);
        } else {
          onSelectEquipment(current.item);
        }
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && combinedResults.length > 0) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, combinedResults]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
      {/* Search Input Box */}
      <div
        onClick={() => {
          if (!isOpen) setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex items-center gap-1.5 h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-lg border transition-all duration-150 w-full cursor-text ${
          isOpen
            ? 'border-orange-500 ring-2 ring-orange-500/20 bg-white dark:bg-[#151923] shadow-xs'
            : 'border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1a202c] hover:bg-slate-100 hover:border-slate-300 dark:hover:bg-[#222938] dark:hover:border-slate-600 shadow-2xs'
        }`}
      >
        <Search
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isOpen ? 'text-orange-500' : 'text-slate-400'
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          id="headerGlobalSearchInput"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar SC, item, AF, marca..."
          aria-label="Buscar em todo o sistema"
          className="flex-1 min-w-0 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden font-medium truncate"
        />

        {searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer transition-colors shrink-0"
            title="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/75 dark:bg-slate-700/70 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-300/70 dark:border-slate-600/60 shadow-2xs shrink-0 select-none">
            <Command className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>K</span>
          </kbd>
        )}
      </div>

      {/* Mobile Backdrop when Dropdown is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-2xs z-40 sm:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Floating Dropdown Module Anchored Below Search Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="fixed sm:absolute top-[52px] sm:top-full left-2.5 right-2.5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 mt-1 sm:mt-1.5 w-auto sm:w-[480px] md:w-[520px] bg-white dark:bg-[#181d28] rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-700/80 z-50 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[460px] ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Filter Tabs Bar */}
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#131720] flex items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Todos</span>
                  <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded-full bg-slate-500/15">
                    {filteredSCs.length + filteredEquipments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('sc')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'sc'
                      ? 'bg-orange-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>SCs</span>
                  <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded-full bg-orange-500/20">
                    {filteredSCs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('inventario')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'inventario'
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Boxes className="w-3 h-3" />
                  <span>TI</span>
                  <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded-full bg-blue-500/20">
                    {filteredEquipments.length}
                  </span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span>↑↓ Navegar</span>
                <span>↵ Abrir</span>
              </div>
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-1.5 sm:p-2 flex flex-col gap-1 min-h-[160px] max-h-[320px] custom-scrollbar"
            >
              {!searchTerm.trim() ? (
                /* Empty Prompt with Suggestion Chips */
                <div className="py-5 px-3 text-center flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 shadow-2xs">
                    <Search className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Busca Rápida em Tempo Real
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                    Digite número da SC, código AF, itens, marcas ou setores.
                  </p>

                  <div className="flex items-center justify-center gap-1 flex-wrap mt-3 max-w-xs">
                    {['Em andamento', 'Atrasadas', 'Notebook', 'Manutenção'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setSearchTerm(sug);
                          inputRef.current?.focus();
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-orange-400 text-[10px] font-medium transition-colors cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              ) : combinedResults.length === 0 ? (
                /* No Results */
                <div className="py-6 px-3 text-center flex flex-col items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Nenhum registro coincide com "{searchTerm}".
                  </p>
                </div>
              ) : (
                /* Filtered items */
                combinedResults.map((res, idx) => {
                  const isSelected = idx === selectedIndex;

                  if (res.type === 'sc') {
                    const sc = res.item;
                    return (
                      <div
                        key={res.id}
                        onClick={() => {
                          onSelectSC(sc);
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500/40 shadow-2xs'
                            : 'bg-white dark:bg-[#151923] border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-[#1a202c]'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="p-1 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                            <ShoppingCart className="w-3 h-3" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                                {highlightMatch(sc.numero, searchTerm)}
                              </span>
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                SC
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-1 py-0.2 rounded-full ${
                                  sc.status === 'Concluído'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {sc.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                              <span className="text-slate-400 font-medium">Setor:</span>{' '}
                              {highlightMatch(sc.solicitante, searchTerm)}
                            </p>

                            {sc.itens && sc.itens.length > 0 && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.2">
                                {highlightMatch(sc.itens.map((i) => i.descricao).join(', '), searchTerm)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" /> {formatDateBR(sc.data)}
                          </span>
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-0.5">
                            Abrir <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Equipment item
                  const eq = res.item;
                  return (
                    <div
                      key={res.id}
                      onClick={() => {
                        onSelectEquipment(eq);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40 shadow-2xs'
                          : 'bg-white dark:bg-[#151923] border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-[#1a202c]'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className="p-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                          <Boxes className="w-3 h-3" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                              {highlightMatch(eq.codigoPatrimonio, searchTerm)}
                            </span>
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              TI
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-1 py-0.2 rounded-full ${
                                eq.status === 'Ativado'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : eq.status === 'Manutenção'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {eq.status}
                            </span>
                          </div>

                          <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                            {highlightMatch(eq.nome, searchTerm)}
                            {eq.marcaModelo && (
                              <span className="text-slate-400 font-normal ml-1">
                                ({highlightMatch(eq.marcaModelo, searchTerm)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                          {eq.localizacao || eq.responsavel || eq.usuarioResponsavel || '-'}
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                          Abrir <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom bar action */}
            {searchTerm.trim() && onApplyTableSearch && (
              <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#131720] flex items-center justify-between text-[11px] text-slate-500">
                <span>{combinedResults.length} resultado(s)</span>
                <button
                  type="button"
                  onClick={() => {
                    onApplyTableSearch(searchTerm, activeTab === 'inventario' ? 'inventario' : 'solicitacoes');
                    setIsOpen(false);
                  }}
                  className="text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
                >
                  Filtrar na tabela principal →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

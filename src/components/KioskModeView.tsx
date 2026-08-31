import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  ShoppingBag,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  Sparkles,
  RefreshCw,
  Building,
  User,
} from 'lucide-react';
import { SC, SCItem, UserProfile } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface KioskModeViewProps {
  scs: SC[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onLogout?: () => void;
}

export const KioskModeView: React.FC<KioskModeViewProps> = ({
  scs,
  currentUser,
  onClose,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState<number>(15);
  const [progress, setProgress] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [filterMode, setFilterMode] = useState<'todos' | 'criticos' | 'andamento' | 'hoje'>('todos');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter SCs
  const filteredSCs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return scs.filter((sc) => {
      if (filterMode === 'criticos') {
        return sc.diasEmAberto > 7 || sc.prazoStatus === 'atrasada';
      }
      if (filterMode === 'andamento') {
        return sc.status === 'Em andamento';
      }
      if (filterMode === 'hoje') {
        return sc.data === today || sc.previsaoEntrega === today;
      }
      return true;
    });
  }, [scs, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filteredSCs.length / itemsPerPage));

  // Auto rotation timer
  useEffect(() => {
    if (!isPlaying || totalPages <= 1) {
      setProgress(0);
      return;
    }

    const stepMs = 100;
    const totalSteps = (intervalSec * 1000) / stepMs;
    let stepCount = 0;

    const interval = setInterval(() => {
      stepCount += 1;
      const currentProgress = (stepCount / totalSteps) * 100;
      setProgress(Math.min(100, currentProgress));

      if (stepCount >= totalSteps) {
        stepCount = 0;
        setProgress(0);
        setCurrentPage((prev) => (prev + 1) % totalPages);
      }
    }, stepMs);

    return () => clearInterval(interval);
  }, [isPlaying, intervalSec, totalPages]);

  // Adjust items per page based on window size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(3);
      } else if (window.innerHeight < 700) {
        setItemsPerPage(4);
      } else if (window.innerHeight > 1150) {
        setItemsPerPage(8);
      } else {
        setItemsPerPage(6);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut ESC to exit or spacebar to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onLogout) onLogout();
        else onClose();
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
      if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => (prev + 1) % totalPages);
        setProgress(0);
      }
      if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
        setProgress(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, onClose, onLogout]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = scs.length;
    const emAndamento = scs.filter((s) => s.status === 'Em andamento').length;
    const atrasadas = scs.filter((s) => s.diasEmAberto > 7 || s.prazoStatus === 'atrasada').length;
    const concluidas = scs.filter((s) => s.status === 'Concluído').length;
    const totalItens = scs.reduce((acc, s) => acc + (s.itens?.length || 0), 0);
    const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    return { total, emAndamento, atrasadas, concluidas, totalItens, taxaConclusao };
  }, [scs]);

  const currentSCs = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredSCs.slice(start, start + itemsPerPage);
  }, [filteredSCs, currentPage, itemsPerPage]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#f8fafc] text-slate-800 flex flex-col select-none overflow-hidden font-sans antialiased"
    >
      {/* Top White Header / Dashboard TV Bar */}
      <header className="px-5 py-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between gap-4 shrink-0 shadow-xs">
        {/* Left: Brand + Live Pulse */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff5500] flex items-center justify-center font-black text-white text-lg tracking-wider shadow-sm shadow-orange-500/20">
              MCM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight">
                  Painel Quiosque de Compras
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  AO VIVO
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                MCM Montagens Industriais • Monitoramento de Solicitações
              </p>
            </div>
          </div>
        </div>

        {/* Center: High-Contrast Light KPI Summary Cards */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total SCs</div>
              <div className="text-base font-black text-slate-900 font-mono mt-0.5">{stats.total}</div>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200/90 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Timer className="w-4 h-4" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Em Andamento</div>
              <div className="text-base font-black text-blue-900 font-mono mt-0.5">{stats.emAndamento}</div>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200/90 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Atrasadas (&gt;7d)</div>
              <div className="text-base font-black text-rose-900 font-mono mt-0.5">{stats.atrasadas}</div>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Concluídas</div>
              <div className="text-base font-black text-emerald-900 font-mono mt-0.5">{stats.concluidas}</div>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-purple-50/90 border border-purple-200/90 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Atendimento</div>
              <div className="text-base font-black text-purple-900 font-mono mt-0.5">{stats.taxaConclusao}%</div>
            </div>
          </div>
        </div>

        {/* Right: Digital Clock & Window Controls */}
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200/90 flex items-center gap-2 font-mono text-slate-800 text-sm font-bold shadow-inner">
            <Clock className="w-4 h-4 text-orange-600" />
            <span>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onLogout) onLogout();
              else onClose();
            }}
            id="btnExitKiosk"
            title="Sair / Desconectar Modo Quiosque"
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 transition-all cursor-pointer border border-rose-200 flex items-center gap-1.5 text-xs font-bold shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Control Strip & Progress Bar */}
      <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
        {/* Filter Pills in White Theme */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'todos', label: 'Todas as SCs' },
            { id: 'criticos', label: 'Críticos & Atrasados' },
            { id: 'andamento', label: 'Em Andamento' },
            { id: 'hoje', label: 'Hoje / Recentes' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                triggerHaptic('light');
                setFilterMode(mode.id as any);
                setCurrentPage(0);
                setProgress(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                filterMode === mode.id
                  ? 'bg-[#ff5500] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Carousel Player Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
                setProgress(0);
              }}
              title="Página Anterior"
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-[11px] font-mono font-bold text-slate-700">
              Pág. {currentPage + 1} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                setCurrentPage((prev) => (prev + 1) % totalPages);
                setProgress(0);
              }}
              title="Próxima Página"
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            title={isPlaying ? 'Pausar rotação' : 'Iniciar rotação'}
            className={`p-1.5 px-2.5 rounded-xl border flex items-center gap-1.5 font-bold text-[11px] cursor-pointer transition-all shadow-2xs ${
              isPlaying
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-orange-600" /> : <Play className="w-3.5 h-3.5 text-slate-500" />}
            <span>{isPlaying ? 'Rotacionando' : 'Pausado'}</span>
          </button>

          {/* Time Selector */}
          <select
            value={intervalSec}
            onChange={(e) => {
              setIntervalSec(Number(e.target.value));
              setProgress(0);
            }}
            className="bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl px-2.5 py-1.5 focus:outline-hidden cursor-pointer shadow-2xs"
          >
            <option value={10}>10s por página</option>
            <option value={15}>15s por página</option>
            <option value={20}>20s por página</option>
            <option value={30}>30s por página</option>
          </select>
        </div>
      </div>

      {/* Loading Progress Line */}
      {isPlaying && (
        <div className="w-full h-1 bg-slate-200 relative">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-100 ease-linear shadow-xs shadow-orange-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main Grid Content Area (Light Theme) */}
      <main className="flex-1 p-5 overflow-y-auto no-scrollbar bg-[#f8fafc]">
        {filteredSCs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-3">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Não há dados cadastrados para o filtro selecionado no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 auto-rows-fr h-full">
            <AnimatePresence mode="popLayout">
              {currentSCs.map((sc, idx) => {
                const isDelayed = sc.diasEmAberto > 7 || sc.prazoStatus === 'atrasada';
                const totalQtd = (sc.itens || []).reduce((sum, item) => sum + (item.quantidade || 1), 0);
                const totalRecebido = (sc.itens || []).reduce((sum, item) => sum + (item.quantidadeRecebida || 0), 0);
                const percentRecebido = totalQtd > 0 ? Math.min(100, Math.round((totalRecebido / totalQtd) * 100)) : 0;

                return (
                  <motion.div
                    key={sc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -8 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className={`rounded-2xl border p-4.5 flex flex-col justify-between shadow-sm transition-all bg-white ${
                      isDelayed
                        ? 'border-rose-300 ring-2 ring-rose-500/10 shadow-rose-100'
                        : sc.status === 'Concluído'
                        ? 'border-emerald-200 ring-1 ring-emerald-500/10 shadow-emerald-50'
                        : 'border-slate-200/90 hover:border-orange-400'
                    }`}
                  >
                    {/* Card Header: SC Number + Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                            SC #{sc.numero}
                          </span>
                          {isDelayed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-600 text-white animate-pulse shadow-xs">
                              <AlertTriangle className="w-3 h-3" />
                              {sc.diasEmAberto}d ATRASADA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-slate-700">{sc.solicitante}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-500">{sc.empresaOuProjeto || 'Geral'}</span>
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide ${
                          sc.status === 'Concluído'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {sc.status}
                      </span>
                    </div>

                    {/* Items List Preview Container */}
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 mb-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5 max-h-28 overflow-y-auto no-scrollbar">
                        {(sc.itens || []).slice(0, 3).map((item: SCItem, i: number) => (
                          <div key={item.id || i} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-800 font-semibold truncate flex-1">
                              • {item.descricao}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px] font-bold shrink-0">
                              {item.quantidadeRecebida || 0}/{item.quantidade || 1} {item.unidade || 'UN'}
                            </span>
                          </div>
                        ))}
                        {(sc.itens?.length || 0) > 3 && (
                          <div className="text-[10px] text-orange-600 font-bold pt-0.5">
                            + {(sc.itens?.length || 0) - 3} outros itens adicionais...
                          </div>
                        )}
                      </div>

                      {/* Progress Bar of Received Items */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                          <span>Recebimento Almoxarifado</span>
                          <span className="font-mono font-black text-slate-800">{percentRecebido}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentRecebido === 100
                                ? 'bg-emerald-500'
                                : percentRecebido > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${percentRecebido}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Metadata */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100 font-medium">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Emissão: {new Date(sc.data).toLocaleDateString('pt-BR')}
                      </span>
                      {sc.fornecedor ? (
                        <span className="text-[11px] font-bold text-slate-700 truncate max-w-[140px]" title={sc.fornecedor}>
                          {sc.fornecedor}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Fornecedor a definir</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* TV White Footer Bar */}
      <footer className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[10px] font-bold">Espaço</kbd> para pausar/retomar ou <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[10px] font-bold">ESC</kbd> para desconectar.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] font-semibold text-slate-600">
          <span>MCM Montagens Industriais</span>
          <span>•</span>
          <span className="text-orange-600 font-bold">Painel TV v2.5</span>
        </div>
      </footer>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  Maximize2,
  Minimize2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  ShoppingBag,
  TrendingUp,
  LogOut,
  Package,
  Check,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { SC, UserProfile } from '../types';
import { MCMLogo } from './MCMLogo';
import { dbService } from '../services/dbService';
import { subscribeToFirestoreSCs } from '../services/firebase';
import { compareSCNumbers, calcDays } from '../utils/storage';
import { useSlaSettings, isSCDelayed } from '../utils/sla';

interface KioskModeViewProps {
  scs: SC[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onLogout?: () => void;
  onRefresh?: () => Promise<void>;
}

export const KioskModeView: React.FC<KioskModeViewProps> = ({
  scs: initialSCs,
  onClose,
  onLogout,
  onRefresh,
}) => {
  const slaSettings = useSlaSettings();
  // Local synchronized state of SCs
  const [dataSCs, setDataSCs] = useState<SC[]>(initialSCs);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [progress, setProgress] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncCountdown, setSyncCountdown] = useState<number>(30);
  const containerRef = useRef<HTMLDivElement>(null);

  const itemsPerPage = 10;
  const intervalSec = 10; // 10 seconds per page rotation
  const refreshIntervalSec = 30; // Auto-fetch every 30 seconds from cloud

  // Sync with prop changes
  useEffect(() => {
    if (initialSCs && initialSCs.length >= 0) {
      setDataSCs(initialSCs);
    }
  }, [initialSCs]);

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Centralized cloud data fetch function
  const fetchCloudData = useCallback(async (silent = true) => {
    if (!silent) setIsSyncing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      const cloudSCs = await dbService.getSCs();
      if (cloudSCs && cloudSCs.length >= 0) {
        setDataSCs(cloudSCs);
      }
      setLastSyncTime(new Date());
      setSyncCountdown(refreshIntervalSec);
    } catch (err) {
      console.warn('Erro ao atualizar dados em segundo plano no Quiosque:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [onRefresh, refreshIntervalSec]);

  // Automatic 30-second background re-fetch and countdown
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          setTimeout(() => {
            fetchCloudData(false);
          }, 0);
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [fetchCloudData, refreshIntervalSec]);

  // Real-time Firestore push subscription fallback
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreSCs(
      (cloudList) => {
        if (cloudList && cloudList.length >= 0) {
          setDataSCs(cloudList);
          setLastSyncTime(new Date());
        }
      },
      (error) => {
        console.warn('Listener Firestore quiosque:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(dataSCs.length / itemsPerPage));

  // Reset page when total pages decrease
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  // Auto rotation timer for TV (10 seconds per page)
  useEffect(() => {
    if (totalPages <= 1) {
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
  }, [totalPages, intervalSec]);

  // Keyboard shortcut to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onLogout) onLogout();
        else onClose();
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

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          document.documentElement.requestFullscreen?.().catch(() => {});
        });
      } else {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = dataSCs.length;
    const emAndamento = dataSCs.filter((s) => s.status === 'Em andamento').length;
    const atrasadas = dataSCs.filter((s) => {
      if (s.status === 'Concluído') return false;
      return isSCDelayed(s, slaSettings);
    }).length;
    const concluidas = dataSCs.filter((s) => s.status === 'Concluído').length;
    const totalItens = dataSCs.reduce((acc, s) => acc + (s.itens?.length || 0), 0);
    const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    const diasMedios =
      total > 0
        ? Math.round(
            dataSCs.reduce((acc, s) => acc + (s.diasEmAberto ?? calcDays(s.data, s.status)), 0) / total
          )
        : 0;

    return {
      total,
      emAndamento,
      atrasadas,
      concluidas,
      totalItens,
      taxaConclusao,
      diasMedios,
    };
  }, [dataSCs]);

  // Chart Data for the right-side chart
  const chartData = useMemo(() => {
    const pendentesRegulares = Math.max(0, stats.emAndamento - stats.atrasadas);

    const data = [
      {
        name: 'Concluídas',
        value: stats.concluidas,
        color: '#10b981', // emerald
      },
      {
        name: 'Em Andamento',
        value: pendentesRegulares,
        color: '#ff5500', // vibrant MCM orange
      },
    ];

    if (stats.atrasadas > 0) {
      data.push({
        name: `Críticas (>${slaSettings.slaDaysWarning}d)`,
        value: stats.atrasadas,
        color: '#ef4444', // red
      });
    }

    if (data.length === 0) {
      return [{ name: 'Sem registros', value: 1, color: '#e2e8f0' }];
    }

    return data.filter((d) => d.value > 0);
  }, [stats]);

  const sortedSCs = useMemo(() => {
    return [...dataSCs].sort((a, b) => compareSCNumbers(a.numero, b.numero, 'desc'));
  }, [dataSCs]);

  const currentSCs = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return sortedSCs.slice(start, start + itemsPerPage);
  }, [sortedSCs, currentPage, itemsPerPage]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#eff1f4] text-slate-800 flex flex-col select-none overflow-hidden font-sans antialiased text-[14px]"
    >
      {/* Top TV Header (Clean & uncluttered) */}
      <header className="px-6 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between gap-4 shrink-0 shadow-xs">
        {/* Left: Authentic MCM Logo + Title + Live Status */}
        <div className="flex items-center gap-4">
          <MCMLogo variant="full" size="sm" className="h-9 w-auto" />
          <div className="border-l border-gray-200 pl-4 hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                Painel Quiosque de Compras
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                AO VIVO
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              MCM Montagens • Monitoramento de Solicitações
            </p>
          </div>
        </div>

        {/* Center: Real-time Big Metric Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-600">Total:</span>
            <span className="text-xs font-mono font-black text-slate-900">{stats.total} SCs</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-2">
            <Timer className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-700">Pendentes:</span>
            <span className="text-xs font-mono font-black text-orange-950">{stats.emAndamento}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">Concluídas:</span>
            <span className="text-xs font-mono font-black text-emerald-950">{stats.concluidas}</span>
          </div>

          {stats.atrasadas > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold text-rose-700">Críticas:</span>
              <span className="text-xs font-mono font-black text-rose-950">{stats.atrasadas}</span>
            </div>
          )}
        </div>

        {/* Right: Sync countdown, Clock & TV Actions */}
        <div className="flex items-center gap-2.5">
          {/* Sync indicator pill */}
          <div
            title={`Última sincronização: ${lastSyncTime.toLocaleTimeString('pt-BR')} (Auto-sync em ${syncCountdown}s)`}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-600"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-slate-600">
              Sync em <strong className="font-mono text-slate-900">{syncCountdown}s</strong>
            </span>
            <button
              type="button"
              onClick={() => fetchCloudData(false)}
              title="Sincronizar agora"
              className="p-0.5 hover:text-orange-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 text-slate-400 hover:text-orange-600 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Clock */}
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 font-mono text-sm font-black text-slate-800">
            <Clock className="w-4 h-4 text-orange-600" />
            <span>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit Button */}
          <button
            type="button"
            onClick={() => {
              if (onLogout) onLogout();
              else onClose();
            }}
            id="btnExitKiosk"
            title="Sair do Modo TV"
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 transition-all cursor-pointer border border-rose-200 flex items-center gap-1.5 text-xs font-bold shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Subtle Auto Rotation Indicator & Progress Bar (Seamless on TV) */}
      {totalPages > 1 && (
        <div className="w-full h-1 bg-slate-200 relative shrink-0">
          <div
            className="h-full bg-orange-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main Screen Layout (Table on Left, Analytics Card on Right) */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col lg:flex-row gap-5 bg-[#eff1f4] min-h-0">
        {/* Left Side: Table of SCs */}
        <section className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden min-h-0">
          {/* Table Header Strip */}
          <div className="px-5 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Package className="w-4.5 h-4.5 text-orange-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Tabela de Solicitações ({dataSCs.length})
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              {totalPages > 1 ? (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                  Página <strong className="text-slate-900">{currentPage + 1}</strong> de <strong>{totalPages}</strong> • Rotação a cada 10s
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                  Exibindo todos os {dataSCs.length} registros
                </span>
              )}

              {/* Botão de Tela Cheia no container da tabela */}
              <button
                type="button"
                onClick={toggleFullscreen}
                id="btnFullscreenKioskTable"
                title={isFullscreen ? 'Sair da Tela Cheia' : 'Maximizar em Tela Cheia na TV'}
                className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-900 border border-orange-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {dataSCs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-700 mb-1">Nenhuma solicitação no momento</h3>
                <p className="text-xs text-slate-500">
                  O painel atualizará automaticamente assim que novas SCs forem inseridas.
                </p>
              </div>
            ) : (
              <table className="kiosk-table w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 font-bold text-xs border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-28">Nº SC</th>
                    <th className="py-2.5 px-3 w-32">Data de Emissão</th>
                    <th className="py-2.5 px-3 w-28">Dias em Aberto</th>
                    <th className="py-2.5 px-3">Solicitante & Projeto</th>
                    <th className="py-2.5 px-3">Itens / Produtos</th>
                    <th className="py-2.5 px-3 w-32 text-center">Qtd. Itens</th>
                    <th className="py-2.5 px-3 text-center w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px]">
                  <AnimatePresence mode="popLayout">
                    {currentSCs.map((sc, idx) => {
                      const dias = sc.diasEmAberto ?? calcDays(sc.data, sc.status);
                      const isOverdue = isSCDelayed(sc, slaSettings);
                      const isCompleted = sc.status === 'Concluído';
                      const totalQtd = (sc.itens || []).reduce(
                        (sum, item) => sum + (item.quantidadeSolicitada ?? item.quantidade ?? 1),
                        0
                      );

                      return (
                        <motion.tr
                          key={sc.id || idx}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15, delay: idx * 0.015 }}
                          className={`transition-colors border-b border-gray-100 even:bg-slate-50/60 hover:bg-orange-50/40`}
                        >
                          {/* SC # */}
                          <td className="py-2 px-3 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-900 leading-none">
                                #{sc.numero}
                              </span>
                            </div>
                          </td>

                          {/* Data de Emissão */}
                          <td className="py-2 px-3 align-middle">
                            <span className="font-semibold text-xs text-slate-800">
                              {new Date(sc.data).toLocaleDateString('pt-BR')}
                            </span>
                          </td>

                          {/* Dias em Aberto */}
                          <td className="py-2 px-3 align-middle">
                            {isCompleted ? (
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Concluída
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {dias} dias
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-600">
                                {dias === 0 ? 'Hoje' : `${dias} dias`}
                              </span>
                            )}
                          </td>

                          {/* Solicitante & Destino/Projeto */}
                          <td className="py-2 px-3 align-middle">
                            <div className="flex flex-col max-w-[220px] leading-tight">
                              <span className="font-black text-slate-900 text-xs truncate">
                                {sc.solicitante}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                {sc.empresaOuProjeto || sc.projeto || sc.origem || 'MCM Geral'}
                              </span>
                            </div>
                          </td>

                          {/* Resumo de Itens */}
                          <td className="py-2 px-3 align-middle">
                            <div className="max-w-[280px] leading-tight">
                              {sc.itens && sc.itens.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 truncate text-xs">
                                    {sc.itens[0]?.descricao}
                                  </span>
                                  {sc.itens.length > 1 && (
                                    <span className="text-[10px] text-orange-600 font-bold shrink-0">
                                      +{sc.itens.length - 1} item(ns)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Sem itens</span>
                              )}
                            </div>
                          </td>

                          {/* Quantidade de Itens */}
                          <td className="py-2 px-3 align-middle text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center justify-center font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {sc.itens?.length || 0} item(ns) • {totalQtd} un.
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-2 px-3 align-middle text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide leading-tight ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-orange-100 text-orange-800 border border-orange-300'
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                                ) : isOverdue ? (
                                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5] shrink-0 text-rose-600" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 stroke-[2.5] shrink-0 text-orange-600" />
                                )}
                                <span>{sc.status}</span>
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Right Side: Analytics Card & Guaranteed Rendering Donut Chart */}
        <aside className="w-full lg:w-84 xl:w-96 flex flex-col gap-4 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <TrendingUp className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Status Geral das SCs
                    </h3>
                    <p className="text-[11px] text-slate-400">Distribuição Pendentes vs Concluídas</p>
                  </div>
                </div>

                <span className="text-xs font-black font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {stats.total} Total
                </span>
              </div>

              {/* High-Precision SVG Donut Chart (Guaranteed to render in all display modes) */}
              <div className="py-4 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                    {/* Background Circle */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="20"
                    />

                    {/* Dynamic Segments */}
                    {stats.total > 0 && (() => {
                      const radius = 60;
                      const circumference = 2 * Math.PI * radius;
                      let accumulatedOffset = 0;

                      return chartData.map((slice, index) => {
                        const sliceRatio = slice.value / stats.total;
                        const strokeDasharray = `${sliceRatio * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedOffset;
                        accumulatedOffset += sliceRatio * circumference;

                        return (
                          <circle
                            key={`donut-slice-${index}`}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="20"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-700 ease-out"
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Center Percentage Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight leading-none">
                      {stats.taxaConclusao}%
                    </span>
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mt-1">
                      Concluídas
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Legend / Metrics Breakdown */}
              <div className="space-y-2 pt-1">
                {/* Pendentes / Em Andamento */}
                <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff5500] shrink-0" />
                    <div className="leading-tight">
                      <span className="text-xs font-bold text-orange-950 block">Pendentes / Em Andamento</span>
                      <span className="text-[10px] text-orange-700">Aguardando atendimento</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-orange-950 block">{stats.emAndamento}</span>
                    <span className="text-[10px] font-bold text-orange-700">
                      {stats.total > 0 ? Math.round((stats.emAndamento / stats.total) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Concluídas */}
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <div className="leading-tight">
                      <span className="text-xs font-bold text-emerald-950 block">Concluídas</span>
                      <span className="text-[10px] text-emerald-700">Solicitações finalizadas com sucesso</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-emerald-950 block">{stats.concluidas}</span>
                    <span className="text-[10px] font-bold text-emerald-700">{stats.taxaConclusao}%</span>
                  </div>
                </div>

                {/* Críticas se houver */}
                {stats.atrasadas > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                      <div className="leading-tight">
                        <span className="text-xs font-bold text-rose-950 block">Críticas / Atrasadas</span>
                        <span className="text-[10px] text-rose-700">&gt; {slaSettings.slaDaysWarning} dias em aberto</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-rose-950 block">{stats.atrasadas}</span>
                      <span className="text-[10px] font-bold text-rose-700">
                        {stats.total > 0 ? Math.round((stats.atrasadas / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Summary Indicators */}
            <div className="grid grid-cols-2 gap-2.5 pt-3.5 mt-3.5 border-t border-gray-100">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total de Itens</span>
                <span className="text-sm font-mono font-black text-slate-800">{stats.totalItens} un.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Média de Espera</span>
                <span className="text-sm font-mono font-black text-slate-800">{stats.diasMedios} dias</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

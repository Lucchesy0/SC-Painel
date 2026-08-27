import React from 'react';
import { SC } from '../types';
import { KPICards } from './KPICards';
import { StatusChart } from './StatusChart';
import { DepartmentChart } from './DepartmentChart';
import { calcDays, isDelayed } from '../utils/storage';
import { BarChart3, AlertCircle, TrendingUp, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AnalyticsViewProps {
  scs: SC[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ scs }) => {
  const total = scs.length;

  // Priorities breakdown
  const urgent = scs.filter((s) => s.prioridade === 'Urgente').length;
  const alta = scs.filter((s) => s.prioridade === 'Alta').length;
  const media = scs.filter((s) => !s.prioridade || s.prioridade === 'Média').length;
  const baixa = scs.filter((s) => s.prioridade === 'Baixa').length;

  const urgentPct = total > 0 ? Math.round((urgent / total) * 100) : 0;
  const altaPct = total > 0 ? Math.round((alta / total) * 100) : 0;
  const mediaPct = total > 0 ? Math.round((media / total) * 100) : 0;
  const baixaPct = total > 0 ? Math.round((baixa / total) * 100) : 0;

  // SLA & Resolution Stats
  const finishedSCs = scs.filter((s) => s.status === 'Concluído');
  const finishedCount = finishedSCs.length;
  const inProgressSCs = scs.filter((s) => s.status !== 'Concluído');
  const delayedCount = inProgressSCs.filter((s) => isDelayed(s.data, s.status, 7)).length;

  // Average days in progress for open SCs
  const totalOpenDays = inProgressSCs.reduce((acc, s) => acc + calcDays(s.data, s.status), 0);
  const avgOpenDays = inProgressSCs.length > 0 ? (totalOpenDays / inProgressSCs.length).toFixed(1) : '0';

  // SLA On-time completion rate
  const onTimeCount = total - delayedCount;
  const onTimePct = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Analytics Banner Header */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-bold uppercase tracking-wider mb-1 backdrop-blur-xs">
            <BarChart3 className="w-3 h-3" /> Painel de Inteligência
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">Dashboards & Métricas Analíticas</h2>
          <p className="text-orange-100 text-[11px] sm:text-xs mt-0.5 max-w-xl line-clamp-1">
            Indicadores de SLA, distribuição de prioridades e volume por departamento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-white/10 dark:bg-black/20 p-2 sm:p-2.5 rounded-lg backdrop-blur-md border border-white/10 shrink-0">
          <div className="text-center px-1.5">
            <span className="block text-lg font-black font-mono">{total}</span>
            <span className="text-[9px] text-orange-100 uppercase tracking-wider font-semibold">Total SCs</span>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-center px-1.5">
            <span className="block text-lg font-black font-mono text-emerald-300">{onTimePct}%</span>
            <span className="text-[9px] text-orange-100 uppercase tracking-wider font-semibold">SLA no Prazo</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <KPICards scs={scs} />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart scs={scs} />
        <DepartmentChart scs={scs} />
      </div>

      {/* Extended Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#2a3040] border border-slate-200 dark:border-slate-500/50 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Distribuição por Prioridade
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classificação das solicitações de acordo com a urgência
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {total} SCs
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Urgente */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Urgente
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">
                  {urgent} ({urgentPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${urgentPct}%` }}
                />
              </div>
            </div>

            {/* Alta */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Alta
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">
                  {alta} ({altaPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${altaPct}%` }}
                />
              </div>
            </div>

            {/* Média */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> Média
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">
                  {media} ({mediaPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${mediaPct}%` }}
                />
              </div>
            </div>

            {/* Baixa */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> Baixa
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">
                  {baixa} ({baixaPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                  style={{ width: `${baixaPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SLA & Process Performance Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#2a3040] border border-slate-200 dark:border-slate-500/50 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Desempenho do Processo de Compras
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Indicadores de tempo de ciclo e conformidade com o prazo de 7 dias
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Tempo Médio Aberto</span>
              </div>
              <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">
                {avgOpenDays} <span className="text-xs font-normal text-slate-400">dias</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Média das SCs em andamento</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Concluídas</span>
              </div>
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {finishedCount}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Finalizadas com sucesso</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Fora do Prazo (&gt;7d)</span>
              </div>
              <span className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
                {delayedCount}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Exigem priorização urgente</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202532] border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-sky-500" />
                <span>Índice de Eficiência</span>
              </div>
              <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                {onTimePct}%
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Atendimentos dentro do SLA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

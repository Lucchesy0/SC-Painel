import React from 'react';
import { ListFilter, Clock, CheckCircle2, History, AlertTriangle, AlertCircle } from 'lucide-react';
import { SC } from '../types';
import { calcDays, isDelayed } from '../utils/storage';

interface KPICardsProps {
  scs: SC[];
}

export const KPICards: React.FC<KPICardsProps> = ({ scs }) => {
  const totalSC = scs.length;
  const concluidas = scs.filter((s) => s.status === 'Concluído').length;
  const emAndamento = totalSC - concluidas;

  let totalDaysPending = 0;
  let pendingCount = 0;
  let totalPendingItems = 0;
  let delayedCount = 0;
  let oldestSC: { numero: string; days: number } | null = null;

  scs.forEach((sc) => {
    if (sc.status === 'Em andamento') {
      const days = calcDays(sc.data, sc.status);
      totalDaysPending += days;
      pendingCount++;
      totalPendingItems += sc.itens.length;

      if (isDelayed(sc.data, sc.status, 7)) {
        delayedCount++;
      }

      if (!oldestSC || days > oldestSC.days) {
        oldestSC = { numero: sc.numero, days };
      }
    }
  });

  const avgDaysPending = pendingCount > 0 ? Math.round(totalDaysPending / pendingCount) : 0;

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-full min-w-0">
      {/* 4 KPI Grid Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Card 1: Total SC */}
        <article className="animate-fade-in-card bg-white dark:bg-[#2a3040] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-500/50 p-2.5 sm:p-4 flex flex-col gap-0.5 sm:gap-1 relative overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-orange-500/60 dark:hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all">
          <div className="absolute -right-3 -top-3 text-orange-500/10 dark:text-orange-400/10 pointer-events-none">
            <ListFilter className="w-12 sm:w-24 h-12 sm:h-24" />
          </div>
          <span className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-300 relative z-10 truncate">
            Total SC
          </span>
          <strong id="kpiTotalSC" className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 relative z-10">
            {totalSC}
          </strong>
        </article>

        {/* Card 2: Em andamento */}
        <article className="animate-fade-in-card [animation-delay:60ms] bg-white dark:bg-[#2a3040] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-500/50 p-2.5 sm:p-4 flex flex-col gap-0.5 sm:gap-1 relative overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-amber-500/60 dark:hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all">
          <div className="absolute -right-3 -top-3 text-amber-500/10 dark:text-amber-400/10 pointer-events-none">
            <Clock className="w-12 sm:w-24 h-12 sm:h-24" />
          </div>
          <span className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-300 relative z-10 truncate">
            Em andamento
          </span>
          <strong id="kpiEmAndamento" className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 relative z-10">
            {emAndamento}
          </strong>
        </article>

        {/* Card 3: Concluídas */}
        <article className="animate-fade-in-card [animation-delay:120ms] bg-white dark:bg-[#2a3040] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-500/50 p-2.5 sm:p-4 flex flex-col gap-0.5 sm:gap-1 relative overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-emerald-500/60 dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all">
          <div className="absolute -right-3 -top-3 text-emerald-500/10 dark:text-emerald-400/10 pointer-events-none">
            <CheckCircle2 className="w-12 sm:w-24 h-12 sm:h-24" />
          </div>
          <span className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-300 relative z-10 truncate">
            Concluídas
          </span>
          <strong id="kpiConcluidas" className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 relative z-10">
            {concluidas}
          </strong>
        </article>

        {/* Card 4: Dias médios em andamento */}
        <article className="animate-fade-in-card [animation-delay:180ms] bg-white dark:bg-[#2a3040] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-500/50 p-2.5 sm:p-4 flex flex-col gap-0.5 sm:gap-1 relative overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-slate-400/60 dark:hover:shadow-[0_0_15px_rgba(148,163,184,0.12)] transition-all">
          <div className="absolute -right-3 -top-3 text-slate-500/10 dark:text-slate-400/10 pointer-events-none">
            <History className="w-12 sm:w-24 h-12 sm:h-24" />
          </div>
          <span className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 relative z-10 truncate">
            Dias médios
          </span>
          <strong id="kpiDiasMedios" className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-200 relative z-10">
            {avgDaysPending}
          </strong>
        </article>
      </section>

      {/* Summary Alert Strip */}
      <section id="summaryStrip" className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        {/* Pendências */}
        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border border-amber-500/20 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Pendências: <strong id="summaryPendencias" className="font-bold">{totalPendingItems}</strong>
          </span>
        </div>

        {/* Atrasadas */}
        <div className="flex items-center gap-1.5 bg-red-500/10 text-red-700 dark:text-red-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border border-red-500/20 whitespace-nowrap">
          <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>
            Atrasadas: <strong id="summaryAtrasadas" className="font-bold">{delayedCount}</strong>
          </span>
        </div>

        {/* Mais antigas */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#2a3040] text-slate-600 dark:text-slate-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-600/60 shadow-xs whitespace-nowrap">
          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
          <span>
            Mais antigas:{' '}
            <strong id="summaryAntiga" className="font-bold text-slate-900 dark:text-slate-100">
              {oldestSC ? `${oldestSC.numero} (${oldestSC.days}d)` : '-'}
            </strong>
          </span>
        </div>
      </section>
    </div>
  );
};

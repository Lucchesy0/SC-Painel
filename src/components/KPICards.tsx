import React from 'react';
import { ListFilter, Clock, CheckCircle2, History, AlertTriangle, AlertCircle } from 'lucide-react';
import { SC } from '../types';
import { calcDays } from '../utils/storage';
import { useSlaSettings, isSCDelayed } from '../utils/sla';

interface KPICardsProps {
  scs: SC[];
}

export const KPICards: React.FC<KPICardsProps> = ({ scs }) => {
  const slaSettings = useSlaSettings();
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

      if (isSCDelayed(sc, slaSettings)) {
        delayedCount++;
      }

      if (!oldestSC || days > oldestSC.days) {
        oldestSC = { numero: sc.numero, days };
      }
    }
  });

  const avgDaysPending = pendingCount > 0 ? Math.round(totalDaysPending / pendingCount) : 0;

  return (
    <div className="flex flex-col gap-3 w-full max-w-full min-w-0">
      {/* 4 KPI Grid Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Total SC */}
        <article className="bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col justify-between transition-colors">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Total SC
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong id="kpiTotalSC" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
              {totalSC}
            </strong>
            <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </article>

        {/* Card 2: Em andamento */}
        <article className="bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col justify-between transition-colors">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Em andamento
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong id="kpiEmAndamento" className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {emAndamento}
            </strong>
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
        </article>

        {/* Card 3: Concluídas */}
        <article className="bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col justify-between transition-colors">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Concluídas
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong id="kpiConcluidas" className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {concluidas}
            </strong>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
        </article>

        {/* Card 4: Dias médios em andamento */}
        <article className="bg-white dark:bg-[#202532] border border-slate-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col justify-between transition-colors">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Dias médios
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong id="kpiDiasMedios" className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
              {avgDaysPending}
            </strong>
            <History className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </article>
      </section>

      {/* Summary Alert Strip */}
      <section id="summaryStrip" className="flex flex-wrap items-center gap-2">
        {/* Pendências */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Pendências: <strong id="summaryPendencias" className="font-bold">{totalPendingItems}</strong>
          </span>
        </div>

        {/* Atrasadas */}
        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2.5 py-1 text-xs font-medium border border-red-200 dark:border-red-900/50 whitespace-nowrap">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>
            Atrasadas (&gt;{slaSettings.slaDaysWarning}d): <strong id="summaryAtrasadas" className="font-bold">{delayedCount}</strong>
          </span>
        </div>

        {/* Mais antigas */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#202532] text-slate-600 dark:text-slate-300 px-2.5 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap">
          <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Mais antiga:{' '}
            <strong id="summaryAntiga" className="font-bold text-slate-900 dark:text-slate-100">
              {oldestSC ? `${oldestSC.numero} (${oldestSC.days}d)` : '-'}
            </strong>
          </span>
        </div>
      </section>
    </div>
  );
};

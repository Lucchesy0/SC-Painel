import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { SC } from '../types';
import { Building2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DepartmentChartProps {
  scs: SC[];
}

const COLOR_PALETTE = [
  '#f97316', // Orange
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export const DepartmentChart: React.FC<DepartmentChartProps> = ({ scs }) => {
  const [mode, setMode] = useState<'destino' | 'solicitante'>('destino');

  // Aggregate by Destino / Departamento (from items)
  const getDestinoData = () => {
    const counts: Record<string, number> = {};
    scs.forEach((sc) => {
      sc.itens.forEach((item) => {
        const key = item.destino?.trim() || 'Geral';
        counts[key] = (counts[key] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // Aggregate by Solicitante (from SCs)
  const getSolicitanteData = () => {
    const counts: Record<string, number> = {};
    scs.forEach((sc) => {
      const key = sc.solicitante?.trim() || 'Não Informado';
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const data = mode === 'destino' ? getDestinoData() : getSolicitanteData();

  return (
    <section className="bg-white dark:bg-[#2a3040] rounded-xl border border-slate-200 dark:border-slate-500/50 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Header with Selector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-500/50 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-bold text-lg text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <span>Distribuição de Itens</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {mode === 'destino' ? 'Por departamento / destino de entrega' : 'Por usuário solicitante'}
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#202532] border border-slate-200 dark:border-slate-600/60 text-xs font-semibold relative">
          <button
            onClick={() => setMode('destino')}
            className={`relative z-10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              mode === 'destino'
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Destino</span>
            {mode === 'destino' && (
              <motion.div
                layoutId="chartTabBg"
                className="absolute inset-0 bg-white dark:bg-[#2c3343] rounded-lg shadow-2xs -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setMode('solicitante')}
            className={`relative z-10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              mode === 'solicitante'
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Solicitante</span>
            {mode === 'solicitante' && (
              <motion.div
                layoutId="chartTabBg"
                className="absolute inset-0 bg-white dark:bg-[#2c3343] rounded-lg shadow-2xs -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Chart Canvas with Smooth Transition */}
      <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[260px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full h-full flex flex-col justify-center items-center"
          >
            {data.length === 0 ? (
              <div className="text-sm text-slate-400 dark:text-slate-500 py-12">Nenhum dado cadastrado</div>
            ) : (
              <div className="w-full h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${value} ${mode === 'destino' ? 'item(ns)' : 'SC(s)'}`,
                        'Quantidade',
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(51, 65, 85, 0.6)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                      {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

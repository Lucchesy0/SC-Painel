import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SC } from '../types';

interface StatusChartProps {
  scs: SC[];
}

export const StatusChart: React.FC<StatusChartProps> = ({ scs }) => {
  const concluidas = scs.filter((s) => s.status === 'Concluído').length;
  const emAndamento = scs.length - concluidas;

  const data = [
    { name: 'Em andamento', value: emAndamento, color: '#FF5500' },
    { name: 'Concluído', value: concluidas, color: '#10b981' },
  ];

  const total = scs.length;

  return (
    <section className="bg-white dark:bg-[#2a3040] rounded-xl border border-slate-200 dark:border-slate-500/50 shadow-xs flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-500/50">
        <h2 className="font-bold text-lg text-slate-900 dark:text-slate-200">Status da SC</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Distribuição entre em andamento e concluídas
        </p>
      </div>

      <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[260px] relative">
        {total === 0 ? (
          <div className="text-sm text-slate-400 dark:text-slate-500">Nenhum dado cadastrado</div>
        ) : (
          <div className="w-full h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} SC(s)`, 'Quantidade']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(51, 65, 85, 0.5)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total SCs</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

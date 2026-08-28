import React from 'react';
import { ShoppingCart, LayoutDashboard, BarChart3, Boxes, Shield } from 'lucide-react';
import { ActiveNavTab, UserProfile } from '../types';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface MobileBottomNavProps {
  activeNavTab: ActiveNavTab;
  onNavTabChange: (tab: ActiveNavTab) => void;
  scCount: number;
  delayedCount: number;
  equipmentCount: number;
  onOpenAdmin: () => void;
  isAdmin: boolean;
  currentUser?: UserProfile;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNavTab,
  onNavTabChange,
  scCount,
  delayedCount,
  equipmentCount,
  onOpenAdmin,
  isAdmin,
  currentUser,
}) => {
  const allItems = [
    {
      id: 'solicitacoes' as ActiveNavTab,
      label: 'SC',
      fullLabel: 'Solicitações',
      icon: <ShoppingCart className="w-5 h-5" />,
      module: 'sc',
      badge: scCount > 0 ? (
        <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-orange-500 text-white shadow-xs">
          {scCount > 99 ? '99+' : scCount}
        </span>
      ) : null,
    },
    {
      id: 'indicadores' as ActiveNavTab,
      label: 'KPIs',
      fullLabel: 'Indicadores',
      icon: <LayoutDashboard className="w-5 h-5" />,
      module: 'sc',
      badge: delayedCount > 0 ? (
        <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500 text-white shadow-xs animate-pulse">
          {delayedCount}
        </span>
      ) : null,
    },
    {
      id: 'graficos' as ActiveNavTab,
      label: 'Gráficos',
      fullLabel: 'Gráficos',
      icon: <BarChart3 className="w-5 h-5" />,
      module: 'sc',
      badge: null,
    },
    {
      id: 'inventario' as ActiveNavTab,
      label: 'Ativos',
      fullLabel: 'Inventário TI',
      icon: <Boxes className="w-5 h-5" />,
      module: 'inventario',
      badge: equipmentCount > 0 ? (
        <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-blue-500 text-white shadow-xs">
          {equipmentCount}
        </span>
      ) : null,
    },
  ];

  // Filter items based on user permissions
  const items = allItems.filter((item) => {
    if (isAdmin) return true;
    if (!currentUser) return true;
    if (item.module === 'sc' && currentUser.canAccessSC === false) return false;
    if (item.module === 'inventario' && currentUser.canAccessInventario === false) return false;
    return true;
  });

  return (
    <nav
      aria-label="Navegação móvel"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a1f2c]/95 border-t border-slate-200 dark:border-slate-700/80 backdrop-blur-lg px-2 py-1 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {items.map((item) => {
        const isActive = activeNavTab === item.id;

        return (
          <button
            key={item.id}
            id={`mobileBottomNav-${item.id}`}
            onClick={() => {
              triggerHaptic('light');
              onNavTabChange(item.id);
            }}
            className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer select-none active:scale-95 min-h-[48px] ${
              isActive
                ? item.id === 'inventario'
                  ? 'text-blue-600 dark:text-blue-400 font-black'
                  : 'text-orange-600 dark:text-orange-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge}
            </div>

            <span className="text-[11px] mt-0.5 tracking-tight font-semibold">
              {item.label}
            </span>

            {isActive && (
              <motion.div
                layoutId="activeMobileBottomTab"
                className={`absolute bottom-0 w-8 h-1 rounded-full ${
                  item.id === 'inventario' ? 'bg-blue-500 dark:bg-blue-400' : 'bg-orange-500 dark:bg-orange-400'
                }`}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}

      {isAdmin && (
        <button
          type="button"
          id="mobileBottomNav-admin"
          onClick={() => {
            triggerHaptic('light');
            onOpenAdmin();
          }}
          className="relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-all cursor-pointer select-none active:scale-95 min-h-[48px]"
        >
          <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <span className="text-[11px] mt-0.5 tracking-tight font-semibold">
            Admin
          </span>
        </button>
      )}
    </nav>
  );
};
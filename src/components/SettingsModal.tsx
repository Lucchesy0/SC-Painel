import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Sliders,
  Sun,
  Moon,
  Monitor,
  Bell,
  Volume2,
  VolumeX,
  Building,
  HardDrive,
  Database,
  Download,
  Upload,
  Shield,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Keyboard,
  Cpu,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { SC, Equipment, ThemeMode } from '../types';
import { exportToCSV, exportEquipmentsToCSV } from '../utils/storage';
import { getSlaSettings, saveSlaSettings } from '../utils/sla';
import { downloadIDBBackupFile, FullBackupPayload } from '../services/backupService';
import { dbService } from '../services/dbService';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';
import { MCMLogo } from './MCMLogo';
import { motion, AnimatePresence } from 'motion/react';

export type SettingsSection =
  | 'general'
  | 'appearance'
  | 'notifications'
  | 'integrations'
  | 'storage'
  | 'security'
  | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scs: SC[];
  equipments: Equipment[];
  theme?: ThemeMode;
  onSetTheme?: (theme: ThemeMode) => void;
  onImportData: (scs: SC[], equipments?: Equipment[]) => Promise<void>;
  onClearAll: () => Promise<void>;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onOpenShortcuts?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  scs,
  equipments,
  theme = 'light',
  onSetTheme,
  onImportData,
  onClearAll,
  onToast,
  onOpenShortcuts,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // --- GENERAL SETTINGS ---
  const [companyName, setCompanyName] = useState(() => {
    return localStorage.getItem('mcm_setting_company_name') || 'MCM Construções e Serviços';
  });
  const [defaultCostCenter, setDefaultCostCenter] = useState(() => {
    return (
      localStorage.getItem('mcm_setting_default_cc') ||
      '110 - 8004 - CEQ - Central de Equipamentos (MCM)'
    );
  });
  const [defaultBranch, setDefaultBranch] = useState(() => {
    return localStorage.getItem('mcm_setting_default_branch') || '110 - CEQ Cabo de Santo Agostinho';
  });
  const [defaultRequester, setDefaultRequester] = useState(() => {
    return localStorage.getItem('mcm_setting_default_requester') || 'TI / Equipamentos MCM';
  });
  const [currencyFormat, setCurrencyFormat] = useState(() => {
    return localStorage.getItem('mcm_setting_currency') || 'BRL';
  });

  // --- APPEARANCE SETTINGS ---
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem('mcm_table_grid_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.density || 'compact';
      }
    } catch {}
    return 'compact';
  });
  const [defaultViewMode, setDefaultViewMode] = useState<'table' | 'cards'>(() => {
    try {
      const saved = localStorage.getItem('mcm_table_grid_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.viewMode || 'table';
      }
    } catch {}
    return 'table';
  });
  const [enableAnimations, setEnableAnimations] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_animations') !== 'false';
  });

  // --- NOTIFICATION & SLA SETTINGS ---
  const [slaDaysWarning, setSlaDaysWarning] = useState<number>(() => getSlaSettings().slaDaysWarning);
  const [criticalOverdueDays, setCriticalOverdueDays] = useState<number>(() => getSlaSettings().criticalOverdueDays);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_sound') !== 'false';
  });
  const [browserNotifications, setBrowserNotifications] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_browser_notifications') === 'true';
  });
  const [preventiveAlerts, setPreventiveAlerts] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_preventive_alerts') !== 'false';
  });

  // --- INTEGRATIONS SETTINGS ---
  const [totvsRmUrl, setTotvsRmUrl] = useState(() => {
    return localStorage.getItem('mcm_setting_rm_url') || 'https://rm.mcm.com.br/Corpore.Net/';
  });
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(() => {
    return Number(localStorage.getItem('mcm_setting_sync_interval')) || 30;
  });
  const [smartRmParser, setSmartRmParser] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_smart_parser') !== 'false';
  });

  // --- SECURITY & DANGER ZONE ---
  const [requireDeleteConfirm, setRequireDeleteConfirm] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_require_confirm') !== 'false';
  });
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- STORAGE DIAGNOSTICS ---
  const [storageInfo, setStorageInfo] = useState<{
    usageMB: number;
    quotaMB: number;
    percent: number;
  } | null>(null);

  // Backup restore preview
  const [pendingRestore, setPendingRestore] = useState<{
    scs: SC[];
    equipments: Equipment[];
    sourceFilename: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load storage diagnostics
  useEffect(() => {
    if (!isOpen) return;

    if (isOpen) {
      const curSla = getSlaSettings();
      setSlaDaysWarning(curSla.slaDaysWarning);
      setCriticalOverdueDays(curSla.criticalOverdueDays);

      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((estimate) => {
          const usageMB = (estimate.usage || 0) / (1024 * 1024);
          const quotaMB = (estimate.quota || 0) / (1024 * 1024);
          const percent = quotaMB > 0 ? (usageMB / quotaMB) * 100 : 0;
          setStorageInfo({
            usageMB: Math.round(usageMB * 10) / 10,
            quotaMB: Math.round(quotaMB),
            percent: Math.min(100, Math.round(percent * 10) / 10),
          });
        }).catch(() => {});
      }
    }
  }, [isOpen]);

  // Request browser notification permission
  const handleToggleBrowserNotifications = async (enable: boolean) => {
    if (enable) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setBrowserNotifications(true);
          localStorage.setItem('mcm_setting_browser_notifications', 'true');
          onToast('Notificações do navegador ativadas com sucesso!', 'success');
        } else {
          setBrowserNotifications(false);
          localStorage.setItem('mcm_setting_browser_notifications', 'false');
          onToast('Permissão de notificação negada pelo navegador.', 'error');
        }
      } else {
        onToast('Seu navegador não suporta notificações de área de trabalho.', 'info');
      }
    } else {
      setBrowserNotifications(false);
      localStorage.setItem('mcm_setting_browser_notifications', 'false');
      onToast('Notificações do navegador desativadas.', 'info');
    }
  };

  // Save General Settings
  const handleSaveGeneral = () => {
    localStorage.setItem('mcm_setting_company_name', companyName);
    localStorage.setItem('mcm_setting_default_cc', defaultCostCenter);
    localStorage.setItem('mcm_setting_default_branch', defaultBranch);
    localStorage.setItem('mcm_setting_default_requester', defaultRequester);
    localStorage.setItem('mcm_setting_currency', currencyFormat);
    triggerCompletionFeedback();
    onToast('Configurações gerais salvas com sucesso!', 'success');
  };

  // Save Appearance Settings
  const handleSaveAppearance = (
    newTheme: ThemeMode = 'light',
    newDensity: 'comfortable' | 'compact',
    newViewMode: 'table' | 'cards',
    newAnim: boolean
  ) => {
    if (onSetTheme) {
      onSetTheme(newTheme);
    }
    setTableDensity(newDensity);
    setDefaultViewMode(newViewMode);
    setEnableAnimations(newAnim);

    // Save grid config
    try {
      const existing = localStorage.getItem('mcm_table_grid_config');
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(
        'mcm_table_grid_config',
        JSON.stringify({
          ...parsed,
          density: newDensity,
          viewMode: newViewMode,
        })
      );
    } catch {}

    localStorage.setItem('mcm_setting_animations', String(newAnim));
    triggerHaptic('light');
    onToast('Preferências visuais atualizadas!', 'success');
  };

  // Immediate live updates for SLA settings
  const handleSlaDaysWarningChange = (val: number) => {
    const clean = Math.max(1, Math.min(120, val));
    setSlaDaysWarning(clean);
    saveSlaSettings({ slaDaysWarning: clean });
  };

  const handleCriticalOverdueDaysChange = (val: number) => {
    const clean = Math.max(2, Math.min(180, val));
    setCriticalOverdueDays(clean);
    saveSlaSettings({ criticalOverdueDays: clean });
  };

  // Save SLA & Notifications
  const handleSaveNotifications = () => {
    saveSlaSettings({
      slaDaysWarning,
      criticalOverdueDays,
    });
    localStorage.setItem('mcm_setting_sound', String(soundEnabled));
    localStorage.setItem('mcm_setting_preventive_alerts', String(preventiveAlerts));
    triggerCompletionFeedback();
    onToast('Parâmetros de SLA e Notificações atualizados com sucesso!', 'success');
  };

  // Save Integrations
  const handleSaveIntegrations = () => {
    localStorage.setItem('mcm_setting_rm_url', totvsRmUrl);
    localStorage.setItem('mcm_setting_sync_interval', String(autoSyncInterval));
    localStorage.setItem('mcm_setting_smart_parser', String(smartRmParser));
    triggerCompletionFeedback();
    onToast('Configurações de integração TOTVS RM salvas!', 'success');
  };

  // Export Full JSON Backup
  const handleDownloadBackup = async () => {
    try {
      setIsProcessing(true);
      await downloadIDBBackupFile();
      triggerCompletionFeedback();
      onToast('Arquivo de backup completo gerado e baixado!', 'success');
    } catch (err) {
      console.error(err);
      onToast('Erro ao exportar backup do banco local.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // File Upload for Backup Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let restoredSCs: SC[] = [];
        let restoredEquipments: Equipment[] = [];

        if (parsed.scs && Array.isArray(parsed.scs)) {
          restoredSCs = parsed.scs;
        } else if (Array.isArray(parsed)) {
          restoredSCs = parsed;
        }

        if (parsed.equipments && Array.isArray(parsed.equipments)) {
          restoredEquipments = parsed.equipments;
        }

        if (restoredSCs.length === 0 && restoredEquipments.length === 0) {
          onToast('O arquivo JSON selecionado não contém dados válidos de SC ou Ativos.', 'error');
          return;
        }

        setPendingRestore({
          scs: restoredSCs,
          equipments: restoredEquipments,
          sourceFilename: file.name,
        });
        triggerHaptic('medium');
      } catch (err) {
        console.error(err);
        onToast('Formato de arquivo inválido. Selecione um backup JSON válido.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    try {
      setIsProcessing(true);
      await onImportData(pendingRestore.scs, pendingRestore.equipments);
      triggerCompletionFeedback();
      onToast(
        `Restauração concluída! ${pendingRestore.scs.length} SCs e ${pendingRestore.equipments.length} Ativos importados.`,
        'success'
      );
      setPendingRestore(null);
    } catch (err) {
      console.error(err);
      onToast('Erro ao processar restauração de dados.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Factory Reset / Clear All
  const handleExecuteReset = async () => {
    if (dangerConfirmText !== 'ZERAR BANCO') {
      onToast('Digite exatamente "ZERAR BANCO" para confirmar.', 'error');
      return;
    }
    try {
      setIsProcessing(true);
      await onClearAll();
      setDangerConfirmText('');
      triggerCompletionFeedback();
      onToast('Todos os dados locais foram apagados com sucesso.', 'info');
      onClose();
    } catch (err) {
      console.error(err);
      onToast('Falha ao limpar base de dados.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const navMenuItems = [
    { id: 'general' as SettingsSection, label: 'Geral & Empresa', icon: Building },
    { id: 'appearance' as SettingsSection, label: 'Aparência & Tema', icon: Sun },
    { id: 'notifications' as SettingsSection, label: 'Alertas & SLA', icon: Bell },
    { id: 'integrations' as SettingsSection, label: 'Integrações TOTVS', icon: Sliders },
    { id: 'storage' as SettingsSection, label: 'Backup & Dados', icon: HardDrive },
    { id: 'security' as SettingsSection, label: 'Segurança & Zona de Risco', icon: Shield },
    { id: 'about' as SettingsSection, label: 'Sobre o Sistema', icon: Info },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settingsModalTitle"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#181d28] border border-slate-200 dark:border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[780px] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1f2534] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <SettingsIcon className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2
                id="settingsModalTitle"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight"
              >
                Configurações do Sistema
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize preferências visuais, automações de SLA, integrações e backups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              id="btnCloseSettingsModal"
              aria-label="Fechar Configurações"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2-Column Layout: Sidebar Nav + Content Pane) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Category Sidebar */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#141923] p-2 sm:p-3 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0">
            <nav className="flex md:flex-col gap-1 min-w-max md:min-w-0" role="tablist">
              {navMenuItems.map((item) => {
                const isActive = activeSection === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveSection(item.id);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left whitespace-nowrap md:whitespace-normal w-full ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Main Content Pane */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto custom-scrollbar touch-scroll bg-white dark:bg-[#181d28]">
            {/* 1. GERAL & EMPRESA */}
            {activeSection === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                    Geral & Padrões Operacionais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina os dados padrão para novas Solicitações de Compras e cadastros de Ativos TI.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome da Empresa */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nome da Empresa / Unidade
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: MCM Construções"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  </div>

                  {/* Centro de Custo Padrão */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Centro de Custo Padrão
                    </label>
                    <input
                      type="text"
                      value={defaultCostCenter}
                      onChange={(e) => setDefaultCostCenter(e.target.value)}
                      placeholder="Ex: 110 - CEQ Central de Equipamentos"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  </div>

                  {/* Filial Padrão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Filial Padrão
                    </label>
                    <input
                      type="text"
                      value={defaultBranch}
                      onChange={(e) => setDefaultBranch(e.target.value)}
                      placeholder="Ex: 110 - CEQ Cabo"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  </div>

                  {/* Solicitante Padrão */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Solicitante / Setor Padrão
                    </label>
                    <input
                      type="text"
                      value={defaultRequester}
                      onChange={(e) => setDefaultRequester(e.target.value)}
                      placeholder="Ex: TI / Equipamentos"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  </div>

                  {/* Moeda */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Moeda Padrão
                    </label>
                    <select
                      value={currencyFormat}
                      onChange={(e) => setCurrencyFormat(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    >
                      <option value="BRL">R$ - Real Brasileiro (BRL)</option>
                      <option value="USD">US$ - Dólar Americano (USD)</option>
                      <option value="EUR">€ - Euro (EUR)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveGeneral}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Configurações Gerais</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. APARÊNCIA & TELA */}
            {activeSection === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    Aparência & Interface do Usuário
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajuste a densidade de visualização das tabelas, animações e preferências visuais.
                  </p>
                </div>

                {/* Light Theme Fixed Card */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-3">
                    Tema Padrão
                  </label>
                  <div className="p-4 rounded-2xl border border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20 max-w-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Tema Claro (Ativo)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Interface clara de alto contraste em todo o sistema
                        </span>
                      </div>
                    </div>
                    <span className="p-1 rounded-full bg-orange-500 text-white">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Table Density & Defaults */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Densidade da Tabela de SCs
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAppearance('light', 'compact', defaultViewMode, enableAnimations)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          tableDensity === 'compact'
                            ? 'bg-orange-500 text-white border-orange-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Compacta (Mais dados)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAppearance('light', 'comfortable', defaultViewMode, enableAnimations)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          tableDensity === 'comfortable'
                            ? 'bg-orange-500 text-white border-orange-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Confortável (Mais espaço)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Modo de Exibição Padrão
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAppearance('light', tableDensity, 'table', enableAnimations)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          defaultViewMode === 'table'
                            ? 'bg-orange-500 text-white border-orange-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Tabela Completa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAppearance('light', tableDensity, 'cards', enableAnimations)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          defaultViewMode === 'cards'
                            ? 'bg-orange-500 text-white border-orange-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Grade de Cards
                      </button>
                    </div>
                  </div>
                </div>

                {/* Animations Toggle */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Animações e Efeitos Fluidos
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Transições visuais suaves entre abas e modais
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAnimations}
                    onChange={(e) => handleSaveAppearance('light', tableDensity, defaultViewMode, e.target.checked)}
                    className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. ALERTAS & SLA */}
            {activeSection === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                    Regras de SLA, Prazos & Notificações
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure quando o sistema deve sinalizar alertas amarelos ou vermelhos de atraso.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dias para Alerta de Vencimento */}
                  <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Alerta de Vencimento Geral
                        </label>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          Padrão de atraso da tabela e indicadores
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={slaDaysWarning}
                          onChange={(e) => handleSlaDaysWarningChange(Number(e.target.value) || 1)}
                          className="w-14 text-center text-xs font-mono font-bold py-1 rounded-lg border border-amber-500/50 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                        />
                        <span className="text-xs font-semibold text-slate-500">dias</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Solicitações abertas há mais de <strong className="text-amber-600 dark:text-amber-400">{slaDaysWarning} dias</strong> serão classificadas como <strong className="text-rose-600 dark:text-rose-400">Atrasadas</strong> na tabela e nos gráficos.
                    </p>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="1"
                      value={slaDaysWarning}
                      onChange={(e) => handleSlaDaysWarningChange(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Atalhos:</span>
                      {[7, 10, 15, 20, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleSlaDaysWarningChange(days)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            slaDaysWarning === days
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dias para Atraso Crítico */}
                  <div className="p-4 rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Atraso Crítico (&gt; Vermelho)
                        </label>
                        <span className="text-[10px] text-red-700 dark:text-red-400 font-medium">
                          Nível severo de urgência
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="2"
                          max="120"
                          value={criticalOverdueDays}
                          onChange={(e) => handleCriticalOverdueDaysChange(Number(e.target.value) || 2)}
                          className="w-14 text-center text-xs font-mono font-bold py-1 rounded-lg border border-red-500/50 bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                        />
                        <span className="text-xs font-semibold text-slate-500">dias</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      SCs abertas há mais de <strong className="text-red-600 dark:text-red-400">{criticalOverdueDays} dias</strong> recebem destaque vermelho urgente e prioridade nas notificações.
                    </p>
                    <input
                      type="range"
                      min="3"
                      max="90"
                      step="1"
                      value={criticalOverdueDays}
                      onChange={(e) => handleCriticalOverdueDaysChange(Number(e.target.value))}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Atalhos:</span>
                      {[15, 20, 30, 45, 60].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleCriticalOverdueDaysChange(days)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            criticalOverdueDays === days
                              ? 'bg-red-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-red-400'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>
                    <strong>Atualização em tempo real:</strong> qualquer alteração nos prazos acima atualiza instantaneamente a tabela de SCs, os filtros de atrasadas/vencendo e todos os gráficos.
                  </span>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  {/* Browser Notifications */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Notificações no Navegador (Desktop)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Exibir avisos popup quando houver SCs críticas vencendo
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={browserNotifications}
                      onChange={(e) => handleToggleBrowserNotifications(e.target.checked)}
                      className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Sound Alerts */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Alertas Sonoros & Feedback Háptico
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Sons suaves e vibrações ao salvar, concluir ou exportar dados
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Preventive Alerts TI */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Lembretes de Manutenção Preventiva de Ativos TI
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Sinalizar equipamentos que não recebem revisão há mais de 180 dias
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preventiveAlerts}
                      onChange={(e) => setPreventiveAlerts(e.target.checked)}
                      className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Parâmetros de Notificação</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. INTEGRAÇÕES & TOTVS RM */}
            {activeSection === 'integrations' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                    Integrações & TOTVS RM
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure a conexão rápida e sincronização com o ERP TOTVS RM da MCM.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* RM Portal URL */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      URL do Portal TOTVS RM / Corpore.Net
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={totvsRmUrl}
                        onChange={(e) => setTotvsRmUrl(e.target.value)}
                        placeholder="https://rm.mcm.com.br/..."
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                      />
                      <a
                        href={totvsRmUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir RM</span>
                      </a>
                    </div>
                  </div>

                  {/* Sync Interval */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Intervalo de Auto-Sincronização em Segundo Plano
                      </label>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {autoSyncInterval}s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Sincroniza automaticamente alterações entre abas e dispositivos conectados.
                    </p>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="5"
                      value={autoSyncInterval}
                      onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Smart Parser */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Auto-Detecção Inteligente de Colunas Copiadas
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Identifica automaticamente colunas coladas do Excel / RM (Número, Data, Solicitante, Item)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smartRmParser}
                      onChange={(e) => setSmartRmParser(e.target.checked)}
                      className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveIntegrations}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Configurações RM</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. BACKUP & DADOS */}
            {activeSection === 'storage' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                    Armazenamento, Backups & Exportação
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gerencie o banco de dados local (IndexedDB) e garanta a integridade com backups periódicos.
                  </p>
                </div>

                {/* Storage Diagnostics Card */}
                {storageInfo && (
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">
                        Uso de Armazenamento Local
                      </span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {storageInfo.usageMB} MB / {storageInfo.quotaMB} MB ({storageInfo.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, storageInfo.percent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{scs.length} Solicitações de Compras</span>
                      <span>{equipments.length} Ativos TI</span>
                    </div>
                  </div>
                )}

                {/* Backup & Export Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Export Full JSON Backup */}
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isProcessing}
                    className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-left transition-all cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs">
                      <Download className="w-4 h-4" />
                      <span>Exportar Backup Completo (JSON)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Gera arquivo .json com todas as SCs, histórico de auditoria e Ativos TI.
                    </p>
                  </button>

                  {/* Restore Backup */}
                  <label className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all cursor-pointer flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                      <Upload className="w-4 h-4" />
                      <span>Restaurar Backup (JSON)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Importa e recupera dados a partir de um backup previamente salvo.
                    </p>
                  </label>

                  {/* Export SCs CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      exportToCSV(scs);
                      onToast('Planilha de SCs exportada em CSV!', 'success');
                    }}
                    className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Exportar SCs em Planilha (CSV)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Compatível com Excel, Google Sheets e LibreOffice.
                    </p>
                  </button>

                  {/* Export Equipments CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      exportEquipmentsToCSV(equipments);
                      onToast('Planilha de Ativos TI exportada em CSV!', 'success');
                    }}
                    className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-left transition-all cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Exportar Inventário TI (CSV)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Relatório completo de patrimônios, localização e status.
                    </p>
                  </button>
                </div>

                {/* Restore Preview Confirmation Dialog */}
                {pendingRestore && (
                  <div className="p-4 rounded-2xl border border-blue-500 bg-blue-500/10 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Arquivo carregado: {pendingRestore.sourceFilename}</span>
                    </div>
                    <div className="text-xs text-blue-800 dark:text-blue-300">
                      Conteúdo detectado: <b>{pendingRestore.scs.length}</b> Solicitações e{' '}
                      <b>{pendingRestore.equipments.length}</b> Ativos de TI.
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setPendingRestore(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRestore}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer hover:bg-blue-700"
                      >
                        {isProcessing ? 'Restaurando...' : 'Confirmar e Substituir Dados'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. SEGURANÇA & ZONA DE RISCO */}
            {activeSection === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                    Segurança & Zona de Risco
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mecanismos de proteção contra exclusão acidental e ferramentas de reset.
                  </p>
                </div>

                {/* Require Delete Confirmation */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Exigir Confirmação Dupla para Excluir Registros
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Abre modal de segurança antes de remover qualquer SC ou Equipamento
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireDeleteConfirm}
                    onChange={(e) => {
                      setRequireDeleteConfirm(e.target.checked);
                      localStorage.setItem('mcm_setting_require_confirm', String(e.target.checked));
                      onToast('Preferência de segurança atualizada.', 'info');
                    }}
                    className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                  />
                </div>

                {/* Danger Zone: Factory Reset */}
                <div className="p-5 rounded-2xl border border-red-500/40 bg-red-500/5 space-y-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Zona de Perigo: Redefinição Geral do Banco Local</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Esta ação apagará permanentemente todas as <b>{scs.length}</b> solicitações e{' '}
                    <b>{equipments.length}</b> ativos salvos no IndexedDB deste navegador. Recomendamos exportar um backup antes.
                  </p>

                  <div className="space-y-2 pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Para confirmar a limpeza, digite <span className="font-mono text-red-600">ZERAR BANCO</span> abaixo:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={dangerConfirmText}
                        onChange={(e) => setDangerConfirmText(e.target.value)}
                        placeholder="ZERAR BANCO"
                        className="flex-1 h-10 px-3 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-red-600 focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={handleExecuteReset}
                        disabled={dangerConfirmText !== 'ZERAR BANCO' || isProcessing}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{isProcessing ? 'Apagando...' : 'Apagar Todos os Dados'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. SOBRE O SISTEMA */}
            {activeSection === 'about' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700/80">
                  <MCMLogo className="h-8" variant="full" />
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      MCM Gestão Integrada de SC & TI
                    </h3>
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-mono font-bold">
                      Versão 2.5 (Build 2026.08)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Arquitetura</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Single Page Application (React 18 + Vite + Tailwind CSS)
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Persistência</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      IndexedDB (Local Offline-First + Auto Sync Multi-Aba)
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Módulos Ativos</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Solicitações de Compras, KPIs, Gráficos e Inventário TI
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Compatibilidade</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Desktop, Tablets, Celulares (PWA Ready & Mobile-First)
                    </p>
                  </div>
                </div>

                {onOpenShortcuts && (
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenShortcuts();
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Keyboard className="w-4 h-4 text-indigo-500" />
                      <span>Ver Atalhos de Teclado (?)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-[#1f2534] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold">Configurações salvas localmente</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

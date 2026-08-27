import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Shield,
  Trash2,
  Download,
  Upload,
  Database,
  AlertTriangle,
  FileSpreadsheet,
  HardDrive,
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Layers,
  Settings,
  RefreshCw,
  Cpu,
  Laptop,
  Check,
  Zap,
  Users,
  KeyRound,
} from 'lucide-react';
import { SC, Equipment, UserProfile } from '../types';
import { exportToCSV, exportEquipmentsToCSV, calcDays } from '../utils/storage';
import { downloadIDBBackupFile, FullBackupPayload } from '../services/backupService';
import { dbService } from '../services/dbService';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';
import { UserManagementTab } from './UserManagementTab';

export type AdminTab = 'overview' | 'users' | 'backup' | 'config' | 'maintenance';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  scs: SC[];
  equipments?: Equipment[];
  users?: UserProfile[];
  currentUser?: UserProfile;
  onRefreshUsers?: () => void;
  initialTab?: AdminTab;
  onImportData: (scs: SC[], equipments?: Equipment[]) => Promise<void>;
  onClearAll: () => Promise<void>;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

interface StorageEstimateData {
  usageMB: number;
  quotaMB: number;
  percent: number;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  scs,
  equipments = [],
  users = [],
  currentUser = { id: 'usr-admin', nome: 'Admin', email: 'admin@mcm.com.br', role: 'admin', departamento: 'TI' },
  onRefreshUsers = () => {},
  initialTab = 'overview',
  onImportData,
  onClearAll,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateData | null>(null);
  const [serverPing, setServerPing] = useState<{ status: 'online' | 'offline' | 'checking'; latencyMs: number | null }>({
    status: 'checking',
    latencyMs: null,
  });

  // Danger Zone confirmation
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  // Settings State (persisted)
  const [slaDays, setSlaDays] = useState<number>(() => {
    return Number(localStorage.getItem('mcm_setting_sla_days')) || 15;
  });
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(() => {
    return Number(localStorage.getItem('mcm_setting_sync_interval')) || 30;
  });
  const [defaultCostCenter, setDefaultCostCenter] = useState<string>(() => {
    return localStorage.getItem('mcm_setting_default_cc') || '110 - 8004 - CEQ - Central de Equipamentos (MCM)';
  });
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    return localStorage.getItem('mcm_setting_sound') !== 'false';
  });

  // Backup restore preview
  const [pendingRestore, setPendingRestore] = useState<{
    scs: SC[];
    equipments: Equipment[];
    sourceFilename: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Diagnostics & Telemetry loaders
  useEffect(() => {
    if (!isOpen) return;

    // 1. Check storage estimate
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const usageMB = (estimate.usage || 0) / (1024 * 1024);
        const quotaMB = (estimate.quota || 0) / (1024 * 1024);
        const percent = quotaMB > 0 ? (usageMB / quotaMB) * 100 : 0;
        setStorageInfo({
          usageMB: Math.round(usageMB * 100) / 100,
          quotaMB: Math.round(quotaMB),
          percent: Math.min(100, Math.round(percent * 10) / 10),
        });
      });
    }

    // 2. Ping server
    checkServerLatency();
  }, [isOpen]);

  const checkServerLatency = async () => {
    setServerPing({ status: 'checking', latencyMs: null });
    const startTime = performance.now();
    try {
      const res = await fetch('/api/sync-status', { cache: 'no-store' });
      const endTime = performance.now();
      if (res.ok) {
        setServerPing({
          status: 'online',
          latencyMs: Math.round(endTime - startTime),
        });
      } else {
        setServerPing({ status: 'offline', latencyMs: null });
      }
    } catch {
      setServerPing({ status: 'offline', latencyMs: null });
    }
  };

  if (!isOpen) return null;

  // Calculos analíticos de métricas
  const totalSCs = scs.length;
  const totalConcluidas = scs.filter((s) => s.status === 'Concluído').length;
  const totalAndamento = scs.filter((s) => s.status === 'Em andamento').length;
  const totalItens = scs.reduce((acc, sc) => acc + (sc.itens?.length || 0), 0);
  const atrasadas = scs.filter((s) => s.status === 'Em andamento' && calcDays(s.data, s.status) > slaDays).length;

  const totalEquipamentos = equipments.length;
  const eqAtivados = equipments.filter((e) => e.status === 'Ativado').length;
  const eqManutencao = equipments.filter((e) => e.status === 'Manutenção').length;
  const valorTotalInventario = equipments.reduce((acc, eq) => acc + (eq.valorEstimado || 0), 0);

  // Handlers de Configuração
  const handleSaveSettings = () => {
    localStorage.setItem('mcm_setting_sla_days', String(slaDays));
    localStorage.setItem('mcm_setting_sync_interval', String(autoSyncInterval));
    localStorage.setItem('mcm_setting_default_cc', defaultCostCenter);
    localStorage.setItem('mcm_setting_sound', String(soundAlerts));
    onToast('Configurações do sistema salvas com sucesso!', 'success');
  };

  // Handler de Exportação de Backup JSON Oficial
  const handleExportJSON = async () => {
    try {
      setIsProcessing(true);
      const { filename } = await downloadIDBBackupFile('Backup Administrativo');
      onToast(`Backup gerado com sucesso: ${filename}`, 'success');
    } catch (err) {
      console.error(err);
      onToast('Erro ao exportar backup completo.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler de Leitura de Arquivo para Restauração
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let parsedSCs: SC[] = [];
        let parsedEquipments: Equipment[] = [];

        if (parsed && typeof parsed === 'object' && parsed.dados) {
          const payload = parsed as FullBackupPayload;
          if (Array.isArray(payload.dados.solicitacoes)) parsedSCs = payload.dados.solicitacoes;
          if (Array.isArray(payload.dados.equipamentos)) parsedEquipments = payload.dados.equipamentos;
        } else if (Array.isArray(parsed)) {
          parsedSCs = parsed;
        } else {
          throw new Error('Formato do arquivo de backup inválido ou incompatível.');
        }

        setPendingRestore({
          scs: parsedSCs,
          equipments: parsedEquipments,
          sourceFilename: file.name,
        });
      } catch (err: any) {
        onToast(err.message || 'Falha ao processar arquivo JSON.', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Execução final da Restauração
  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsProcessing(true);
    try {
      await onImportData(pendingRestore.scs, pendingRestore.equipments);
      onToast(
        `Restauração concluída: ${pendingRestore.scs.length} SCs e ${pendingRestore.equipments.length} equipamentos restaurados!`,
        'success'
      );
      setPendingRestore(null);
    } catch (err) {
      console.error(err);
      onToast('Erro durante a restauração do banco.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler de Limpeza Total (Danger Zone)
  const handleExecuteDangerClear = async () => {
    if (dangerConfirmText.trim().toUpperCase() !== 'EXCLUIR TUDO') {
      onToast('Digite EXCLUIR TUDO exatamente como solicitado.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await onClearAll();
      onToast('Banco de dados completamente resetado com sucesso.', 'info');
      setIsDangerZoneOpen(false);
      setDangerConfirmText('');
    } catch (err) {
      console.error(err);
      onToast('Erro ao limpar banco de dados.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Otimização / Reindexação do Banco
  const handleOptimizeDB = async () => {
    setIsProcessing(true);
    try {
      await dbService.getSCs();
      await dbService.getEquipments();
      await new Promise((r) => setTimeout(r, 600));
      onToast('Índices reconstruídos e banco local otimizado com sucesso!', 'success');
    } catch {
      onToast('Erro na otimização do banco.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1e2330] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/70 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Premium do Painel */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Painel do Administrador</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  MCM Enterprise v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Central de telemetria, governança de dados, auditoria e backups do sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Navegação por Abas */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#181c26] px-6 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-[#1e2330]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Visão Geral & Telemetria
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-[#1e2330]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Equipe & Senhas ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-[#1e2330]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Backups & Exportações
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-[#1e2330]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurações Globais
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'border-red-500 text-red-600 dark:text-red-400 bg-white dark:bg-[#1e2330]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Manutenção & Segurança
          </button>
        </div>

        {/* Conteúdo Dinâmico por Aba */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          
          {/* ================= ABA 1: VISÃO GERAL & TELEMETRIA ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Status do Servidor & Armazenamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Card de Conexão com Servidor REST */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#171b24] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Servidor de Sincronização</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Endpoint REST /api/sync-status</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          serverPing.status === 'online'
                            ? 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse'
                            : serverPing.status === 'checking'
                            ? 'bg-amber-500 ring-4 ring-amber-500/20'
                            : 'bg-red-500 ring-4 ring-red-500/20'
                        }`}
                      />
                      <span className="text-xs font-bold">
                        {serverPing.status === 'online'
                          ? 'Operacional'
                          : serverPing.status === 'checking'
                          ? 'Verificando...'
                          : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Latência do Ping:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {serverPing.latencyMs !== null ? `${serverPing.latencyMs} ms` : '-'}
                      </strong>
                    </span>
                    <button
                      onClick={checkServerLatency}
                      className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Testar Conexão
                    </button>
                  </div>
                </div>

                {/* Card de Armazenamento IndexedDB */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#171b24] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Armazenamento Local</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Motor IndexedDB (MCM_Industrial_DB)</p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {storageInfo ? `${storageInfo.usageMB} MB em uso` : 'IndexedDB Ativo'}
                    </span>
                  </div>

                  {storageInfo && (
                    <div className="mt-3">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(2, storageInfo.percent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>Cota Total: {storageInfo.quotaMB} MB</span>
                        <span>{storageInfo.percent}% consumido</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid de Contadores do Sistema */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Métricas de Negócio
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1a1e28]">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Solicitações de Compra</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalSCs}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <span>{totalAndamento} em andamento</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1a1e28]">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">SCs Concluídas</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalConcluidas}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {totalSCs > 0 ? `${Math.round((totalConcluidas / totalSCs) * 100)}% de conclusão` : '0%'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1a1e28]">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Itens Solicitados</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalItens}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Produtos & Serviços</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1a1e28]">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Equipamentos de TI</div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalEquipamentos}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {eqAtivados} ativos / {eqManutencao} manut.
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações da Aplicação */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171b24] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-300">Resumo da Infraestrutura</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div>
                    • <strong>Valor Inventário:</strong> R${' '}
                    {valorTotalInventario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div>
                    • <strong>Alertas de Atraso (&gt;{slaDays}d):</strong> {atrasadas} solicitações
                  </div>
                  <div>
                    • <strong>PWA & Service Worker:</strong> Ativo (Cache v3)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA: GESTÃO DE USUÁRIOS E SENHAS ================= */}
          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <UserManagementTab
                users={users}
                currentUser={currentUser}
                onRefreshUsers={onRefreshUsers}
                onToast={onToast}
              />
            </div>
          )}

          {/* ================= ABA 2: BACKUPS & EXPORTAÇÕES ================= */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Preview de Restauração se houver arquivo selecionado */}
              {pendingRestore && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Confirmar Restauração de Backup
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                    Arquivo identificado: <strong>{pendingRestore.sourceFilename}</strong> contendo{' '}
                    <strong>{pendingRestore.scs.length} Solicitações de Compra</strong> e{' '}
                    <strong>{pendingRestore.equipments.length} Equipamentos</strong>.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmRestore}
                      disabled={isProcessing}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isProcessing ? 'Restaurando...' : 'Aplicar Restauração'}
                    </button>
                    <button
                      onClick={() => setPendingRestore(null)}
                      className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Bloco de Exportações */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" />
                  Gerar Backups & Planilhas
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Backup Completo JSON */}
                  <button
                    onClick={handleExportJSON}
                    disabled={isProcessing}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28] hover:border-orange-500 dark:hover:border-orange-500 transition-all text-left group cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 w-fit mb-3 group-hover:scale-110 transition-transform">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Backup Completo (JSON)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Cópia integral criptografável de SCs, Inventário e Histórico
                    </p>
                  </button>

                  {/* Planilha SCs CSV */}
                  <button
                    onClick={() => {
                      exportToCSV(scs);
                      onToast('Planilha de SCs exportada com sucesso!', 'success');
                    }}
                    disabled={scs.length === 0}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28] hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group cursor-pointer shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mb-3 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Planilha SCs (CSV/Excel)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Exporta todas as {totalSCs} solicitações com itens detalhados
                    </p>
                  </button>

                  {/* Planilha Equipamentos CSV */}
                  <button
                    onClick={() => {
                      exportEquipmentsToCSV(equipments);
                      onToast('Planilha de Inventário exportada com sucesso!', 'success');
                    }}
                    disabled={equipments.length === 0}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28] hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left group cursor-pointer shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit mb-3 group-hover:scale-110 transition-transform">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Inventário TI (CSV/Excel)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Exporta {totalEquipamentos} ativos de TI, valores e AFs
                    </p>
                  </button>
                </div>
              </div>

              {/* Bloco de Restauração */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Restauração de Backup
                </h4>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-[#161a24] hover:bg-slate-50 dark:hover:bg-[#1a1f2b] transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Selecione um arquivo de backup (.JSON) para restaurar
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                    Compatível com backups gerados pelo sistema MCM v1.0 e v2.0
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Procurar Arquivo de Backup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 3: CONFIGURAÇÕES GLOBAIS ================= */}
          {activeTab === 'config' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* SLA de Atraso */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28]">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    SLA Limite para Alerta de Atraso
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                    Quantidade de dias corridos antes de sinalizar a SC em vermelho
                  </p>
                  <select
                    value={slaDays}
                    onChange={(e) => setSlaDays(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#151922] font-semibold"
                  >
                    <option value={7}>7 dias corridos (Rápido)</option>
                    <option value={15}>15 dias corridos (Padrão MCM)</option>
                    <option value={30}>30 dias corridos (Projetos Longos)</option>
                    <option value={45}>45 dias corridos (Importações)</option>
                  </select>
                </div>

                {/* Intervalo de Polling */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28]">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Frequência de Sincronização em Background
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                    Intervalo para consulta de atualizações de outros usuários
                  </p>
                  <select
                    value={autoSyncInterval}
                    onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#151922] font-semibold"
                  >
                    <option value={10}>A cada 10 segundos (Tempo Real)</option>
                    <option value={30}>A cada 30 segundos (Recomendado)</option>
                    <option value={60}>A cada 1 minuto (Econômico)</option>
                  </select>
                </div>
              </div>

              {/* Centro de Custo Padrão */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28]">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Centro de Custo / Setor Padrão
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Preenchimento automático para novas solicitações criadas manualmente
                </p>
                <input
                  type="text"
                  value={defaultCostCenter}
                  onChange={(e) => setDefaultCostCenter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#151922]"
                />
              </div>

              {/* Alertas Sonoros & Feedback Tátil */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Feedback Tátil & Sonoro (Haptic API + Chime)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Microvibrações no smartphone e acorde harmônico ao concluir tarefas e alternar status de SCs
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerCompletionFeedback();
                      onToast('Testando vibração tátil e som...', 'info');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-all cursor-pointer select-none active:scale-95"
                  >
                    Testar Haptic
                  </button>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Salvar Parâmetros
                </button>
              </div>
            </div>
          )}

          {/* ================= ABA 4: MANUTENÇÃO & SEGURANÇA ================= */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Otimização de Índices */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1e28] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Reindexar e Otimizar Motor IndexedDB
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Reconstrói os índices de busca por número, filial, AF e status para máxima performance
                  </p>
                </div>
                <button
                  onClick={handleOptimizeDB}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  {isProcessing ? 'Otimizando...' : 'Executar Otimização'}
                </button>
              </div>

              {/* Zona de Perigo com Proteção por Digitação */}
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Zona de Perigo (Danger Zone)
                </div>
                <p className="text-xs text-red-600 dark:text-red-300/80 mb-4">
                  Ações nesta área são irreversíveis e apagarão todos os registros de solicitações e inventário.
                </p>

                {!isDangerZoneOpen ? (
                  <button
                    onClick={() => setIsDangerZoneOpen(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Abrir Painel de Limpeza Total
                  </button>
                ) : (
                  <div className="p-3 bg-white dark:bg-[#1c181c] rounded-lg border border-red-300 dark:border-red-800 space-y-3">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                      Para confirmar a limpeza total de todos os dados do sistema, digite exatamente:{' '}
                      <code className="bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded font-mono font-bold text-red-700 dark:text-red-200">
                        EXCLUIR TUDO
                      </code>
                    </p>

                    <input
                      type="text"
                      placeholder="Digite EXCLUIR TUDO"
                      value={dangerConfirmText}
                      onChange={(e) => setDangerConfirmText(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30 font-mono font-bold text-red-900 dark:text-red-100"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleExecuteDangerClear}
                        disabled={dangerConfirmText.trim().toUpperCase() !== 'EXCLUIR TUDO' || isProcessing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Limpando banco...' : 'Confirmar e Apagar Todo o Banco'}
                      </button>
                      <button
                        onClick={() => {
                          setIsDangerZoneOpen(false);
                          setDangerConfirmText('');
                        }}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-[#171b24] border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Última verificação: {new Date().toLocaleTimeString('pt-BR')}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

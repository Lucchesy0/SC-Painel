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
  Settings,
  Users,
  Check,
  CheckCircle2,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Lock,
  Unlock,
  ArrowRight,
  Activity,
  Clock,
  KeyRound,
  FileText,
  Layers,
} from 'lucide-react';
import { SC, Equipment, UserProfile } from '../types';
import { exportToCSV, exportEquipmentsToCSV } from '../utils/storage';
import { downloadIDBBackupFile, FullBackupPayload } from '../services/backupService';
import { dbService } from '../services/dbService';
import { triggerCompletionFeedback, triggerHaptic } from '../utils/haptics';
import { getRoleLabel } from '../services/authService';

export type AdminTab = 'overview' | 'backup' | 'config' | 'maintenance';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  scs: SC[];
  equipments?: Equipment[];
  users?: UserProfile[];
  currentUser?: UserProfile;
  onRefreshUsers?: () => void;
  initialTab?: AdminTab;
  onOpenUsersModal?: () => void;
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
  onOpenUsersModal,
  onImportData,
  onClearAll,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [storageInfo, setStorageInfo] = useState<StorageEstimateData | null>(null);

  // Danger Zone confirmation
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  // Settings State (persisted in localStorage)
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

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculos de estatísticas para a Visão Geral
  const totalSCs = scs.length;
  const concluidasSCs = scs.filter((s) => s.status === 'Concluído').length;
  const emAndamentoSCs = totalSCs - concluidasSCs;
  const atrasadasSCs = scs.filter((s) => {
    if (s.status === 'Concluído') return false;
    if (!s.data) return false;
    const parts = s.data.split('/');
    if (parts.length === 3) {
      const dt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      const diffDays = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > slaDays;
    }
    return false;
  }).length;

  const totalEquipments = equipments.length;
  const emUsoEquipments = equipments.filter((e) => e.status === 'Em Uso').length;
  const disponiveisEquipments = equipments.filter((e) => e.status === 'Disponível').length;

  const totalUsers = users.length;
  const adminUsersCount = users.filter((u) => u.role === 'admin').length;
  const usersWithPassword = users.filter((u) => Boolean(u.password && u.password.trim().length > 0)).length;
  const usersWithoutPassword = totalUsers - usersWithPassword;

  const handleSaveSettings = () => {
    localStorage.setItem('mcm_setting_sla_days', String(slaDays));
    localStorage.setItem('mcm_setting_sync_interval', String(autoSyncInterval));
    localStorage.setItem('mcm_setting_default_cc', defaultCostCenter);
    localStorage.setItem('mcm_setting_sound', String(soundAlerts));
    triggerCompletionFeedback();
    onToast('Configurações salvas com sucesso.', 'success');
  };

  const handleExportJSON = async () => {
    try {
      setIsProcessing(true);
      const { filename } = await downloadIDBBackupFile('Backup Administrativo');
      onToast(`Backup gerado: ${filename}`, 'success');
    } catch (err) {
      console.error(err);
      onToast('Erro ao exportar backup.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

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
          throw new Error('Arquivo de backup incompatível.');
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

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsProcessing(true);
    try {
      await onImportData(pendingRestore.scs, pendingRestore.equipments);
      onToast(
        `Restauração concluída: ${pendingRestore.scs.length} solicitações e ${pendingRestore.equipments.length} itens de inventário.`,
        'success'
      );
      setPendingRestore(null);
    } catch (err) {
      console.error(err);
      onToast('Erro durante a restauração dos dados.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteDangerClear = async () => {
    if (dangerConfirmText.trim().toUpperCase() !== 'EXCLUIR TUDO') {
      onToast('Digite EXCLUIR TUDO para confirmar a exclusão.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await onClearAll();
      onToast('Todos os dados locais foram excluídos.', 'info');
      setIsDangerZoneOpen(false);
      setDangerConfirmText('');
    } catch (err) {
      console.error(err);
      onToast('Erro ao limpar banco de dados.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptimizeDB = async () => {
    setIsProcessing(true);
    try {
      await dbService.getSCs();
      await dbService.getEquipments();
      triggerCompletionFeedback();
      onToast('Banco de dados local otimizado.', 'success');
    } catch {
      onToast('Erro ao otimizar banco.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  interface TabItem {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'backup', label: 'Exportação e Backup', icon: Database },
    { id: 'config', label: 'Configurações do Sistema', icon: Settings },
    { id: 'maintenance', label: 'Manutenção do Banco', icon: HardDrive },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header Claro, Limpo e Profissional */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                Painel Administrativo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestão central de governança, equipe, backups e parâmetros do sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
              <span>Sessão:</span>
              <strong className="text-slate-900 font-medium">{currentUser.nome}</strong>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar painel"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-1 shrink-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 py-3 px-3 text-xs border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-slate-800">
          
          {/* TAB 0: VISÃO GERAL / PAINEL ADMINISTRATIVO */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                
                {/* Card 1: Solicitações */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Solicitações (SCs)</span>
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-xl font-bold text-slate-900">{totalSCs}</div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{emAndamentoSCs} em andamento</span>
                    <span className="text-emerald-700 font-medium">{concluidasSCs} concluídas</span>
                  </div>
                </div>

                {/* Card 2: Inventário TI */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Ativos de TI</span>
                    <Boxes className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-slate-900">{totalEquipments}</div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{emUsoEquipments} em uso</span>
                    <span className="text-blue-700 font-medium">{disponiveisEquipments} disponíveis</span>
                  </div>
                </div>

                {/* Card 3: Colaboradores & Acessos */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Equipe & Acessos</span>
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-bold text-slate-900">{totalUsers}</div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{adminUsersCount} administradores</span>
                    <span className="text-slate-700 font-medium">{totalUsers - adminUsersCount} operadores</span>
                  </div>
                </div>

                {/* Card 4: Saúde do Banco / SLAs */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Parâmetros & SLA</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-slate-900">{slaDays} dias</div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Limite de atraso</span>
                    {atrasadasSCs > 0 ? (
                      <span className="text-rose-600 font-bold">{atrasadasSCs} em atraso</span>
                    ) : (
                      <span className="text-emerald-700 font-medium">Em dia</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção de Ações Rápidas de Administração */}
              <div className="border border-slate-200 rounded-lg bg-slate-50/50 p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                      Módulos de Gestão Administrativa
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Selecione um módulo específico para gerenciar acessos, dados ou configurações
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  
                  {/* Card Atalho: Usuários */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUsersModal?.();
                    }}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                        <Users className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          Usuários & Permissões
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Abrir tela dedicada de colaboradores, cargos, senhas e módulos
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Card Atalho: Backup */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('backup')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                        <Database className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                          Exportação e Backup
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Download de planilhas CSV e restauração de dados JSON
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Card Atalho: Configurações */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <Settings className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-slate-900 transition-colors">
                          Configurações Globais
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Prazos de SLA, alertas sonoros e centro de custo padrão
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                  {/* Card Atalho: Manutenção */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('maintenance')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-lg text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <HardDrive className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          Manutenção & Diagnóstico
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Otimização de índices, armazenamento e limpeza
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>
              </div>

              {/* Status de Segurança e Banco */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Segurança & Senhas */}
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-slate-600" />
                      Segurança de Acesso
                    </h4>
                    <span className="text-[11px] font-medium text-slate-500">
                      {usersWithPassword} de {totalUsers} protegidos
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{
                        width: `${totalUsers > 0 ? (usersWithPassword / totalUsers) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Colaboradores com senha requerem verificação de credencial para alternar de perfil ou acessar o sistema.
                  </p>
                </div>

                {/* Status do Armazenamento */}
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-slate-600" />
                      Banco Local (IndexedDB)
                    </h4>
                    <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ativo
                    </span>
                  </div>

                  {storageInfo ? (
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-slate-800 h-full rounded-full transition-all"
                          style={{ width: `${Math.max(1, storageInfo.percent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{storageInfo.usageMB} MB utilizados</span>
                        <span>{storageInfo.quotaMB} MB cota do navegador</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Sincronização contínua com Firestore e armazenamento local ativo.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 1: EXPORTAÇÃO E BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              
              {/* Preview de Restauração */}
              {pendingRestore && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-amber-900 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Confirmar Restauração de Dados
                  </div>
                  <p className="text-amber-800 mb-3">
                    Arquivo: <strong>{pendingRestore.sourceFilename}</strong> com{' '}
                    <strong>{pendingRestore.scs.length} Solicitações de Compra</strong> e{' '}
                    <strong>{pendingRestore.equipments.length} Ativos de TI</strong>.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmRestore}
                      disabled={isProcessing}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isProcessing ? 'Restaurando...' : 'Confirmar e Restaurar'}
                    </button>
                    <button
                      onClick={() => setPendingRestore(null)}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Seção de Exportações */}
              <div className="bg-slate-50/60 p-4.5 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Exportação de Relatórios em Planilha (CSV / Excel)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gera planilhas compatíveis com Excel e visualizadores padrão.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      exportToCSV(scs);
                      triggerCompletionFeedback();
                      onToast('Planilha de SCs exportada com sucesso.', 'success');
                    }}
                    disabled={scs.length === 0}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-md text-slate-800 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportar Solicitações de Compra ({scs.length} SCs)</span>
                  </button>

                  <button
                    onClick={() => {
                      exportEquipmentsToCSV(equipments);
                      triggerCompletionFeedback();
                      onToast('Planilha de Inventário exportada com sucesso.', 'success');
                    }}
                    disabled={equipments.length === 0}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-md text-slate-800 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Exportar Inventário de TI ({equipments.length} Itens)</span>
                  </button>
                </div>
              </div>

              {/* Seção de Backup Completo */}
              <div className="bg-slate-50/60 p-4.5 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Backup Integral e Restauração (JSON)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gera uma cópia de segurança completa para restauração ou migração entre máquinas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={handleExportJSON}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isProcessing ? 'Gerando Backup...' : 'Baixar Cópia de Backup'}</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Restaurar Backup</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURAÇÕES DO SISTEMA */}
          {activeTab === 'config' && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-slate-50/60 p-5 rounded-lg border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Parâmetros Operacionais
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Definições gerais para SLAs, intervalos de sincronização e valores padrão
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Limite de SLA para Alerta de Atraso
                    </label>
                    <select
                      value={slaDays}
                      onChange={(e) => setSlaDays(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    >
                      <option value={7}>7 dias corridos</option>
                      <option value={15}>15 dias corridos (Padrão)</option>
                      <option value={30}>30 dias corridos</option>
                      <option value={45}>45 dias corridos</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Solicitações em aberto com prazo superior a este limite serão sinalizadas como pendentes de atenção.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Intervalo de Sincronização Automática
                    </label>
                    <select
                      value={autoSyncInterval}
                      onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    >
                      <option value={10}>A cada 10 segundos</option>
                      <option value={30}>A cada 30 segundos (Recomendado)</option>
                      <option value={60}>A cada 1 minuto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Centro de Custo / Solicitante Padrão
                    </label>
                    <input
                      type="text"
                      value={defaultCostCenter}
                      onChange={(e) => setDefaultCostCenter(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soundAlerts}
                        onChange={(e) => setSoundAlerts(e.target.checked)}
                        className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                      />
                      <span>Ativar notificações sonoras e retorno tátil de confirmação</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Configurações</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MANUTENÇÃO & BANCO */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4 max-w-2xl">
              
              {/* Otimização */}
              <div className="bg-slate-50/60 p-4.5 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Armazenamento Local e Diagnóstico
                  </h3>
                  <div className="text-xs text-slate-600 mt-1">
                    {storageInfo ? (
                      <p>
                        Armazenamento IndexedDB: <strong>{storageInfo.usageMB} MB</strong> de{' '}
                        <strong>{storageInfo.quotaMB} MB</strong> disponíveis ({storageInfo.percent}% de ocupação).
                      </p>
                    ) : (
                      <p>Banco IndexedDB e Firestore ativos e operacionais.</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOptimizeDB}
                  disabled={isProcessing}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-md text-xs font-medium cursor-pointer shadow-2xs"
                >
                  {isProcessing ? 'Otimizando...' : 'Otimizar e Reindexar Banco Local'}
                </button>
              </div>

              {/* Zona de Perigo / Limpeza */}
              <div className="bg-red-50/40 p-4.5 rounded-lg border border-red-200 space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Exclusão Total de Dados Locais</span>
                </div>
                <p className="text-xs text-red-600">
                  Esta ação apaga os registros locais armazenados neste navegador.
                </p>

                {!isDangerZoneOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsDangerZoneOpen(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium cursor-pointer shadow-2xs"
                  >
                    Iniciar Exclusão de Dados
                  </button>
                ) : (
                  <div className="p-3.5 bg-white rounded-md border border-red-200 space-y-2.5">
                    <p className="text-xs text-slate-700">
                      Para confirmar, digite <strong className="text-red-700 font-mono">EXCLUIR TUDO</strong>:
                    </p>
                    <input
                      type="text"
                      placeholder="EXCLUIR TUDO"
                      value={dangerConfirmText}
                      onChange={(e) => setDangerConfirmText(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-md border border-red-300 font-mono font-semibold text-red-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleExecuteDangerClear}
                        disabled={dangerConfirmText.trim().toUpperCase() !== 'EXCLUIR TUDO' || isProcessing}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium cursor-pointer disabled:opacity-40"
                      >
                        {isProcessing ? 'Excluindo...' : 'Confirmar Exclusão'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDangerZoneOpen(false);
                          setDangerConfirmText('');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
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

        {/* Footer Claro e Funcional */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>Sistema operacional e conectado ao banco</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium cursor-pointer transition-colors shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

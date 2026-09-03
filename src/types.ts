export type SCStatus = 'Em andamento' | 'Concluído';

export type UserRole = string;

export interface UserPermissions {
  // Acesso aos Módulos Principais
  canAccessSC: boolean;          // Acesso ao Painel de Solicitações de Compra
  canAccessInventario: boolean;  // Acesso ao Painel de Inventário de TI / Ativos
  canAccessAnalytics: boolean;   // Acesso aos Indicadores & Relatórios Gráficos
  canAccessAdmin: boolean;       // Acesso ao Painel Administrativo / Backups / Manutenção
  canManageUsers: boolean;       // Acesso à Gestão de Usuários e Permissões

  // Ações em Solicitações de Compra (SC)
  canCreateSC: boolean;          // Criar novas Solicitações
  canEditSC: boolean;            // Editar Solicitações existentes
  canDeleteSC: boolean;          // Excluir Solicitações

  // Ações de TI / Inventário
  canManageEquipments: boolean;  // Adicionar, editar ou desativar equipamentos

  // Ações Globais / Relatórios
  canExportReports: boolean;     // Exportar dados e relatórios (PDF / Excel / CSV)
  canImportData: boolean;        // Importar dados / planilhas
}

// Retrocompatibilidade
export type RolePermissions = UserPermissions;

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  cargo?: string;               // Cargo / Função personalizada livre (ex: 'Comprador', 'Analista de TI', 'Diretor')
  role?: string;                // Mantido para compatibilidade ('admin' | 'kiosk' | string)
  departamento: string;
  avatarColor?: string;
  password?: string;            // Senha de acesso definida pelo Admin
  requiresPassword?: boolean;
  isKiosk?: boolean;            // Identifica perfil de Quiosque / Painel TV
  
  // Permissões diretas e granulares do usuário
  permissions?: Partial<UserPermissions>;

  // Atalhos de acesso rápido para retrocompatibilidade direta
  canAccessSC?: boolean;
  canAccessInventario?: boolean;
  canAccessAnalytics?: boolean;
  canAccessAdmin?: boolean;
  canManageUsers?: boolean;

  isBuiltIn?: boolean;
  createdAt?: string;
}

export type CloudSyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export type MainModule = 'sc' | 'inventario';

export type ActiveNavTab = 'solicitacoes' | 'indicadores' | 'graficos' | 'inventario';

export type ActiveTab = 'principal' | 'dashboards' | 'lista';

export type EquipmentStatus = 'Ativado' | 'Desativado' | 'Manutenção' | 'Em Uso' | 'Disponível';

export interface EquipmentMaintenanceRecord {
  id: string;
  data: string;
  tipo: string;
  descricao: string;
  responsavel?: string;
  custo?: number;
}

export interface Equipment {
  id: string;
  codigoPatrimonio: string; // AF (Ativo Fixo / Código AF)
  nome: string;
  categoria: string;
  marcaModelo?: string;
  status: EquipmentStatus;
  localizacao: string; // ex: Empresa (Rack A / Sede) ou Assistência Técnica
  valorEstimado?: number;
  observacoes?: string;
  imageUrl?: string;
  dataManutencao?: string;
  numeroSerie?: string; // Serial / Service Tag
  responsavel?: string; // Colaborador / Depto atribuído
  usuarioResponsavel?: string; // Alias para compatibilidade
  ipAddress?: string; // IP / MAC / Hostname
  dataAquisicao?: string; // Data de aquisição / tombamento
  historicoManutencao?: EquipmentMaintenanceRecord[];
}

export interface SCItem {
  id: string;
  descricao: string;
  unidade: string;
  destino: string;
  quantidade?: number; // Qtd Solicitada
  quantidadeSolicitada?: number;
  fornecedor?: string;
  valorUnitario?: number;
  previsaoEntrega?: string;
  observacoes?: string;
  imageUrl?: string; // Support for direct image links on items
}

export interface AuditLogEntry {
  id: string;
  dataHora: string;
  tipo: string;
  descricao: string;
  usuario?: string;
}

export type SCTipo = 'Item' | 'Serviço / Assistência';

export interface SC {
  id: string;
  numero: string;
  data: string; // YYYY-MM-DD
  solicitante: string;
  tipo?: SCTipo;
  origem?: string;
  filial?: string;
  projeto?: string;
  status: SCStatus;
  itens: SCItem[];
  observacoes?: string; // Comentário / Observações gerais da Solicitação (opcional)
  comentarios?: string; // Sinônimo para observações
  prioridade?: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  dataVencimento?: string; // YYYY-MM-DD (Data Limite / Prazo de Entrega)
  diasEmAberto?: number;
  prazoStatus?: string;
  empresaOuProjeto?: string;
  anexos?: string[]; // Support for direct image URLs / document links attached to SC
  ultimaAlteracao?: {
    dataHora: string;
    tipo: string;
    usuario?: string;
  };
  historicoAuditoria?: AuditLogEntry[];
}

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface FilterOptions {
  search: string;
  status: string;
  prazo: 'todos' | 'pendentes' | 'concluidas' | 'atrasadas' | 'vencendo_breve';
  sort:
    | 'numero-desc'
    | 'numero-asc'
    | 'data-desc'
    | 'data-asc'
    | 'dias-desc'
    | 'dias-asc'
    | 'solicitante-asc'
    | 'solicitante-desc'
    | 'status';
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD
  tipoData?: 'abertura' | 'conclusao' | 'ambas'; // 'abertura' (padrão), 'conclusao' ou 'ambas'
}

export type SCReminderUrgency = 'atrasada' | 'hoje' | 'breve' | 'normal' | 'concluida';

export interface SCReminderInfo {
  sc: SC;
  urgency: SCReminderUrgency;
  diasRestantes: number; // positive = days until due, negative = days overdue
  dataVencimentoEfetiva: string;
  mensagem: string;
}

export interface NotificationSettings {
  browserNotificationsEnabled: boolean;
  notifyDueSoonDays: number; // e.g. 3 days before due date
  notifyOverdue: boolean;
  soundEnabled: boolean;
  lastCheckedDate?: string;
}

export interface SlaPrioritySettings {
  Urgente: number;
  Alta: number;
  Média: number;
  Baixa: number;
}

export interface SlaSettings {
  slaDaysWarning: number;
  criticalOverdueDays: number;
  priorities?: SlaPrioritySettings;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface GridConfig {
  density: 'comfortable' | 'compact';
  viewMode: 'table' | 'cards';
  visibleColumns: {
    numero: boolean;
    data: boolean;
    solicitante: boolean;
    status: boolean;
    itens: boolean;
    dias: boolean;
    prioridade: boolean;
  };
}

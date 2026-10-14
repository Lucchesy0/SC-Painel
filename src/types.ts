export type SCStatus = 'Em andamento' | 'Concluído';

export type UserRole = string;

export interface UserPermissions {
  // Acesso aos Módulos Principais
  canAccessSC: boolean;          // Acesso ao Painel de Solicitações de Compra
  canAccessInventario: boolean;  // Acesso ao Painel de Inventário de TI / Ativos
  canAccessTermos: boolean;      // Acesso aos Termos de Responsabilidade
  canAccessAnalytics: boolean;   // Acesso aos Indicadores & Relatórios Gráficos
  canAccessAdmin: boolean;       // Acesso ao Painel Administrativo / Backups / Manutenção
  canManageUsers: boolean;       // Acesso à Gestão de Usuários e Permissões

  // Ações em Solicitações de Compra (SC)
  canCreateSC: boolean;          // Criar novas Solicitações
  canEditSC: boolean;            // Editar Solicitações existentes
  canDeleteSC: boolean;          // Excluir Solicitações

  // Ações de TI / Inventário
  canManageEquipments: boolean;  // Adicionar, editar ou desativar equipamentos

  // Ações em Termos de Responsabilidade
  canManageTermos?: boolean;     // Emitir, editar ou arquivar termos de responsabilidade

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
  canAccessTermos?: boolean;
  canManageTermos?: boolean;
  canAccessAnalytics?: boolean;
  canAccessAdmin?: boolean;
  canManageUsers?: boolean;

  isBuiltIn?: boolean;
  createdAt?: string;

  // Status de conexão e presença do perfil (Online / Offline)
  isOnline?: boolean;
  lastSeen?: string;
}

export type CloudSyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export type MainModule = 'sc' | 'inventario';

export type ActiveNavTab = 'solicitacoes' | 'indicadores' | 'graficos' | 'inventario' | 'termo-responsabilidade';

export type ActiveTab = 'principal' | 'dashboards' | 'lista';

export type EquipmentStatus = 'Ativado' | 'Desativado' | 'Manutenção' | 'Em Uso' | 'Disponível';

export type TermStatus = 'Ativo' | 'Devolvido' | 'Pendente' | 'Concluído';

export interface TermEquipmentItem {
  equipmentId?: string; // ID do equipamento no inventário, se vinculado
  codigoPatrimonio: string; // AF ou Patrimônio (ex: AF-0042)
  nome: string; // Descrição (ex: Notebook Dell Latitude 3420)
  categoria?: string;
  marcaModelo?: string;
  numeroSerie?: string;
  estadoConservacao?: string; // ex: 'Novo', 'Excelente', 'Bom'
  valorEstimado?: number;
}

export type TermCategory = 'notebook' | 'celular' | 'tablet' | 'devolucao';

export type ReturnType =
  | 'Celular'
  | 'Notebook'
  | 'Modem'
  | 'Celular e Notebook'
  | 'Celular e Modem'
  | 'Notebook e Modem'
  | 'Outro'
  // compatibilidade legada
  | 'desligamento'
  | 'substituicao'
  | 'manutencao'
  | 'fim_projeto'
  | 'devolucao_definitiva'
  | 'emprestimo_temporario'
  | 'outro';

export interface ReturnTypeDefinition {
  id: string; // Identificador único (ex: 'Notebook', 'Celular', etc.)
  nome: string; // Nome legível do tipo de devolução
  icone: string; // Emoji ou identificador de ícone
  descricao: string; // Descrição explicativa
  templatePadrao: string; // Template de preenchimento para o campo 'Detalhes da Devolução'
  observacaoPadrao?: string; // Observação padrão sugerida (ex: 'Com carregador.')
  isDefault?: boolean; // Se é um dos 6 tipos oficiais nativos
  ordem?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResponsibilityTerm {
  id: string;
  numeroTermo: string; // ex: TR-2026-001 ou AF-30466 ou CEL-98226-8217 ou TAB-40120 ou DEV-2026-001
  categoriaTermo?: TermCategory; // 'notebook' (padrão) | 'celular' | 'tablet' | 'devolucao'
  tipo?: 'Entrega' | 'Devolucao' | 'Emprestimo';
  tipoDevolucao?: ReturnType | string; // Tipo específico da devolução (ex: 'Celular', 'Notebook', 'Modem', etc.)
  detalhesDevolucao?: string; // Detalhes da devolução conforme template RG.TI.004 (Modelo, Marca, AF, Imei Chip, Imei Celular)
  observacaoDevolucao?: string; // Observação da devolução (ex: "Com carregador.")
  motivoDevolucao?: string; // Motivo da devolução
  recebidoPor?: string; // Nome do responsável da TI que conferiu e recebeu o item
  estadoConservacaoDevolucao?: string; // ex: 'Novo', 'Excelente', 'Bom', 'Regular', 'Com Defeito'
  acessoriosDevolvidos?: string[]; // Carregador, Cabo, Mochila, Mouse, Chip, Capa, Caneta, etc.
  observacoesDevolucao?: string;
  termoEntregaOrigemId?: string; // ID ou AF do termo de entrega original se houver
  dataEmissao: string; // YYYY-MM-DD
  dataDevolucaoPrevista?: string; // YYYY-MM-DD
  dataDevolucaoEfetiva?: string; // YYYY-MM-DD
  status: TermStatus;

  // Documento Oficial Modelo
  tituloDocumento?: string; // Padrão: "Termo de Responsabilidade Notebook" ou "Termo de Responsabilidade Celular Corporativo" ou "Termo de Responsabilidade Tablet Corporativo"
  codigoDocumento?: string; // Padrão: "RG.TI.001 Rev00 10ago2020", "RG.TI.002 Rev00 10ago2020" ou "RG.TI.003 Rev00 10ago2020"

  // Colaborador / Responsável
  colaboradorNome: string; // Nome em destaque (ex: Nise Luis de Lima ou Keity Miyuki Mathias Hirae)
  colaboradorId?: string;
  colaboradorCargo?: string;
  colaboradorDepartamento?: string;
  colaboradorDocumento?: string; // CPF ou Matrícula
  colaboradorEmail?: string;

  // Dados do Aparelho (Notebook, Celular ou Tablet)
  modelo: string; // ex: "VOSTRO 3480" ou "APENAS CHIP" / "SAMSUNG GALAXY A14" / "SAMSUNG GALAXY TAB A9+"
  processador?: string; // ex: "Intel Core I5" (Notebook)
  memoria?: string; // ex: "8 GB" (Notebook)
  capacidadeHD?: string; // ex: "SSD 256 GB" (Notebook)
  af?: string; // ex: "30466" (Notebook / Tablet)

  // Dados Específicos para Celular e Tablet (Modelo Oficial RG.TI.002 e RG.TI.003)
  comCarregador?: boolean; // Padrão: false / 'NÃO' ou true / 'SIM'
  comCapaProtecao?: boolean; // Padrão Tablet: true / 'SIM' ou false / 'NÃO'
  comCaneta?: boolean; // Padrão Tablet: true / 'SIM' (S-Pen / Stylus) ou false
  imeiChip?: string; // ex: "8955118512900069883729" (ICCID do Chip SIM)
  imeiCelular?: string; // ex: "0" ou IMEI do aparelho celular/tablet (15 dígitos)
  imeiTablet?: string; // IMEI do Tablet (15 dígitos)
  numeroLinha?: string; // ex: "81-98226-8217"

  // Checklists oficiais (Notebook)
  checklistVerificacao?: {
    oneDrive?: boolean;
    teams?: boolean;
    office365?: boolean;
    office2010?: boolean;
    bitdefender?: boolean;
    java?: boolean;
    fortnet?: boolean;
    anydesk?: boolean;
    sharepoint?: boolean;
    [key: string]: boolean | undefined;
  };

  opcionais?: {
    zwcad?: boolean;
    dwgNaviswork?: boolean;
    powerBi?: boolean;
    project?: boolean;
    [key: string]: boolean | undefined;
  };

  // Centro de Custo, Cidade e Assinatura
  centroCusto?: string; // ex: "988" ou "CEQ - Central de Equipamentos"
  cidade?: string; // "Recife" ou "Escada, PE"

  // Local & Finalidade (Opcionais adicionais)
  localUso?: string;
  finalidade?: string;

  // Equipamentos e Acessórios legados/extras
  equipamentos?: TermEquipmentItem[];
  acessorios?: string[];

  // Observações adicionais e Anexo
  observacoes?: string;
  anexoNome?: string;
  anexoUrl?: string;

  // Assinatura e Autoria
  emitidoPor?: string;
  assinadoDigitalmente?: boolean;
  assinaturaUrl?: string; // Data URL com desenho da rubrica/assinatura
  dataAssinatura?: string;

  // Rastreabilidade de Emissão / Download do PDF
  ultimoPdfGeradoEm?: string; // Data e hora ISO do último PDF gerado/baixado
  ultimoPdfGeradoPor?: string; // Nome do colaborador ou usuário logado que gerou/baixou o PDF
  ultimoPdfDownloadCount?: number; // Total de vezes que o PDF foi gerado ou baixado

  createdAt?: string;
  updatedAt?: string;
}

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
  categoria: string; // ex: Equipamentos
  subcategoria?: string; // ex: Tablet
  marcaModelo?: string;
  status: EquipmentStatus;
  localizacao: string; // ex: Empresa (Rack A / Sede) ou Assistência Técnica
  valorEstimado?: number;
  observacoes?: string;
  imageUrl?: string;
  dataManutencao?: string;
  numeroSerie?: string; // Serial / Service Tag
  imei?: string; // IMEI (15 ou 17 dígitos numéricos para telefonia/tablets/modems)
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

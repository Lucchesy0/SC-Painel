import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Printer,
  User,
  Laptop,
  Smartphone,
  Tablet,
  RotateCcw,
  Calendar,
  Building2,
  Plus,
  Phone,
  Hash,
  Zap,
  MapPin,
  ShieldCheck,
  PenTool,
  Wifi,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { ResponsibilityTerm, TermCategory, ReturnType, UserProfile, ReturnTypeDefinition } from '../types';
import { getTodayISODate } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';
import { returnTypesService } from '../services/returnTypesService';

interface ResponsibilityTermModalProps {
  isOpen: boolean;
  term: ResponsibilityTerm | null;
  defaultCategory?: TermCategory;
  initialReturnType?: string;
  users: UserProfile[];
  currentUser: UserProfile;
  onClose: () => void;
  onSave: (term: ResponsibilityTerm, shouldPrintImmediately?: boolean) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Valores padrões oficiais para Notebook
const DEFAULT_PROCESSORS = [
  'Intel Core I5',
  'Intel Core I3',
  'Intel Core I7',
  'Intel Core I9',
  'AMD Ryzen 5',
  'AMD Ryzen 7',
];

const DEFAULT_MEMORIES = ['8 GB', '16 GB', '4 GB', '32 GB', '64 GB'];

const DEFAULT_STORAGES = [
  'SSD 256 GB',
  'SSD 512 GB',
  'SSD 128 GB',
  'SSD 1 TB',
  'HD 500 GB',
  'HD 1 TB',
];

// Valores padrões oficiais para Celular / Chip
const DEFAULT_CELL_MODELS = [
  'APENAS CHIP',
  'SAMSUNG GALAXY A14',
  'SAMSUNG GALAXY A04e',
  'MOTOROLA MOTO G23',
  'MOTOROLA MOTO G',
  'XIAOMI REDMI 12',
  'IPHONE 11',
];

// Valores padrões oficiais para Tablet Corporativo
const DEFAULT_TABLET_MODELS = [
  'SAMSUNG GALAXY TAB A9+',
  'SAMSUNG GALAXY TAB A8',
  'SAMSUNG GALAXY TAB S6 LITE',
  'SAMSUNG GALAXY TAB ACTIVE',
  'IPAD 9ª GERAÇÃO',
  'IPAD 10ª GERAÇÃO',
  'LENOVO TAB M10',
];

// LocalStorage keys
const LS_KEY_MODELS = 'mcm_saved_models_clean';
const LS_KEY_CELL_MODELS = 'mcm_saved_cell_models_clean';
const LS_KEY_TABLET_MODELS = 'mcm_saved_tablet_models_clean';
const LS_KEY_PROCS = 'mcm_saved_processors_clean';
const LS_KEY_MEMS = 'mcm_saved_memories_clean';
const LS_KEY_STORAGES = 'mcm_saved_storages_clean';
const LS_KEY_COST_CENTERS = 'mcm_saved_cost_centers_clean';

export const ResponsibilityTermModal: React.FC<ResponsibilityTermModalProps> = ({
  isOpen,
  term,
  defaultCategory = 'notebook',
  initialReturnType,
  users,
  currentUser,
  onClose,
  onSave,
  onToast,
}) => {
  // Category state
  const [categoria, setCategoria] = useState<TermCategory>('notebook');

  // Tipos dinâmicos de Devolução (RG.TI.004)
  const [availableReturnTypes, setAvailableReturnTypes] = useState<ReturnTypeDefinition[]>(() =>
    returnTypesService.getReturnTypes()
  );

  useEffect(() => {
    const unsub = returnTypesService.subscribe((updatedList) => {
      setAvailableReturnTypes(updatedList);
    });
    return () => unsub();
  }, []);

  // Common Form State
  const [colaboradorNome, setColaboradorNome] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [cidade, setCidade] = useState('Escada, PE');
  const [dataEmissao, setDataEmissao] = useState(getTodayISODate());

  // Notebook Specific State
  const [modelo, setModelo] = useState('');
  const [processador, setProcessador] = useState('Intel Core I5');
  const [memoria, setMemoria] = useState('8 GB');
  const [capacidadeHD, setCapacidadeHD] = useState('SSD 256 GB');
  const [af, setAf] = useState('');

  // Celular Specific State (Modelo RG.TI.002 Rev00)
  const [modeloCelular, setModeloCelular] = useState('APENAS CHIP');
  const [comCarregador, setComCarregador] = useState(false);
  const [imeiChip, setImeiChip] = useState('');
  const [imeiCelular, setImeiCelular] = useState('0');
  const [numeroLinha, setNumeroLinha] = useState('');

  // Tablet Specific State (Modelo RG.TI.003 Rev00)
  const [modeloTablet, setModeloTablet] = useState('SAMSUNG GALAXY TAB A9+');
  const [afTablet, setAfTablet] = useState('');
  const [comCarregadorTablet, setComCarregadorTablet] = useState(true);
  const [comCapaTablet, setComCapaTablet] = useState(true);
  const [comCanetaTablet, setComCanetaTablet] = useState(false);
  const [imeiTablet, setImeiTablet] = useState('');

  // Devolução Specific State (RG.TI.004)
  const [tipoDevolucao, setTipoDevolucao] = useState<ReturnType | string>('Celular');
  const [detalhesDevolucao, setDetalhesDevolucao] = useState('');
  const [observacaoDevolucao, setObservacaoDevolucao] = useState('Com carregador.');
  const [motivoDevolucao, setMotivoDevolucao] = useState('');
  const [recebidoPor, setRecebidoPor] = useState('');
  const [estadoConservacaoDevolucao, setEstadoConservacaoDevolucao] = useState('Bom');
  const [acessoriosDevolvidos, setAcessoriosDevolvidos] = useState<string[]>([
    'Carregador / Fonte',
    'Cabo de Alimentação',
  ]);
  const [equipamentoDevolvido, setEquipamentoDevolvido] = useState('');
  const [afDevolucao, setAfDevolucao] = useState('');
  const [dataDevolucaoEfetiva, setDataDevolucaoEfetiva] = useState(getTodayISODate());
  const [observacoesDevolucao, setObservacoesDevolucao] = useState('');

  // Checklists Notebook (As 9 opções)
  const [checklist, setChecklist] = useState({
    oneDrive: false,
    teams: false,
    office365: false,
    office2010: false,
    bitdefender: false,
    java: false,
    fortnet: false,
    anydesk: false,
    sharepoint: false,
  });

  // Opcionais Notebook (As 4 opções exatas solicitadas)
  const [opcionais, setOpcionais] = useState({
    zwcad: false,
    dwgNaviswork: false,
    powerBi: false,
    project: false,
  });

  // Dynamic Saved Lists for Specifications
  const [savedModels, setSavedModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_MODELS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [savedCellModels, setSavedCellModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_CELL_MODELS);
      return stored ? JSON.parse(stored) : DEFAULT_CELL_MODELS;
    } catch {
      return DEFAULT_CELL_MODELS;
    }
  });

  const [savedTabletModels, setSavedTabletModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_TABLET_MODELS);
      return stored ? JSON.parse(stored) : DEFAULT_TABLET_MODELS;
    } catch {
      return DEFAULT_TABLET_MODELS;
    }
  });

  const [savedProcessors, setSavedProcessors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_PROCS);
      return stored ? JSON.parse(stored) : DEFAULT_PROCESSORS;
    } catch {
      return DEFAULT_PROCESSORS;
    }
  });

  const [savedMemories, setSavedMemories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_MEMS);
      return stored ? JSON.parse(stored) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  });

  const [savedStorages, setSavedStorages] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_STORAGES);
      return stored ? JSON.parse(stored) : DEFAULT_STORAGES;
    } catch {
      return DEFAULT_STORAGES;
    }
  });

  const [savedCostCenters, setSavedCostCenters] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_COST_CENTERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Inline "Criar Novo" states for adding custom specifications
  const [newModelInput, setNewModelInput] = useState('');
  const [isAddingModel, setIsAddingModel] = useState(false);

  const [newProcInput, setNewProcInput] = useState('');
  const [isAddingProc, setIsAddingProc] = useState(false);

  const [newMemInput, setNewMemInput] = useState('');
  const [isAddingMem, setIsAddingMem] = useState(false);

  const [newStorageInput, setNewStorageInput] = useState('');
  const [isAddingStorage, setIsAddingStorage] = useState(false);

  // Initialize form
  useEffect(() => {
    if (!isOpen) return;

    if (term) {
      const isDevolucao =
        term.categoriaTermo === 'devolucao' ||
        term.tipo === 'Devolucao' ||
        Boolean(term.tipoDevolucao);

      const isTablet =
        !isDevolucao &&
        (term.categoriaTermo === 'tablet' ||
          Boolean(term.codigoDocumento?.includes('RG.TI.003')) ||
          (Boolean(term.modelo) &&
            /tablet|tab\b|ipad/i.test(term.modelo) &&
            term.categoriaTermo !== 'celular' &&
            term.categoriaTermo !== 'notebook'));

      const isCell =
        !isDevolucao &&
        !isTablet &&
        (term.categoriaTermo === 'celular' ||
          Boolean(term.numeroLinha) ||
          Boolean(term.imeiChip) ||
          Boolean(term.codigoDocumento?.includes('RG.TI.002')));

      if (isDevolucao) {
        setCategoria('devolucao');
        setColaboradorNome(term.colaboradorNome || '');
        setCentroCusto(term.centroCusto || '');
        setCidade(term.cidade || 'Recife');
        setDataEmissao(term.dataEmissao || getTodayISODate());
        setTipoDevolucao(term.tipoDevolucao || initialReturnType || 'Celular');
        setDetalhesDevolucao(term.detalhesDevolucao || '');
        setObservacaoDevolucao(term.observacaoDevolucao || term.observacoesDevolucao || 'Com carregador.');
        setMotivoDevolucao(term.motivoDevolucao || '');
        setRecebidoPor(term.recebidoPor || '');
        setEstadoConservacaoDevolucao(term.estadoConservacaoDevolucao || 'Bom');
        setAcessoriosDevolvidos(term.acessoriosDevolvidos || ['Carregador / Fonte', 'Cabo de Alimentação']);
        setEquipamentoDevolvido(term.modelo || '');
        setAfDevolucao(term.af || '');
        setDataDevolucaoEfetiva(term.dataDevolucaoEfetiva || term.dataEmissao || getTodayISODate());
        setObservacoesDevolucao(term.observacoesDevolucao || term.observacoes || '');
      } else if (isTablet) {
        setCategoria('tablet');
        setColaboradorNome(term.colaboradorNome || '');
        setCentroCusto(term.centroCusto || '');
        setCidade(term.cidade || 'Recife');
        setDataEmissao(term.dataEmissao || getTodayISODate());
        setModeloTablet(term.modelo || 'SAMSUNG GALAXY TAB A9+');
        setAfTablet(term.af || term.numeroTermo?.replace(/^TAB-/, '') || '');
        setComCarregadorTablet(term.comCarregador !== false);
        setComCapaTablet(term.comCapaProtecao !== false);
        setComCanetaTablet(Boolean(term.comCaneta));
        setImeiTablet(term.imeiTablet || term.imeiCelular || term.imeiChip || '');
      } else if (isCell) {
        setCategoria('celular');
        setColaboradorNome(term.colaboradorNome || '');
        setCentroCusto(term.centroCusto || '');
        setCidade(term.cidade || 'Recife');
        setDataEmissao(term.dataEmissao || getTodayISODate());
        setModeloCelular(term.modelo || 'APENAS CHIP');
        setComCarregador(Boolean(term.comCarregador));
        setImeiChip(term.imeiChip || '');
        setImeiCelular(term.imeiCelular ?? '0');
        setNumeroLinha(term.numeroLinha || '');
      } else {
        setCategoria('notebook');
        setColaboradorNome(term.colaboradorNome || '');
        setCentroCusto(term.centroCusto || '');
        setCidade(term.cidade || 'Escada, PE');
        setDataEmissao(term.dataEmissao || getTodayISODate());
        setModelo(term.modelo || '');
        setProcessador(term.processador || 'Intel Core I5');
        setMemoria(term.memoria || '8 GB');
        setCapacidadeHD(term.capacidadeHD || 'SSD 256 GB');
        setAf(term.af || term.numeroTermo?.replace(/^AF-/, '') || '');

        // Parse checklists
        const c = term.checklistVerificacao || {};
        setChecklist({
          oneDrive: !!c.oneDrive,
          teams: !!c.teams,
          office365: !!c.office365,
          office2010: !!c.office2010,
          bitdefender: !!c.bitdefender,
          java: !!c.java,
          fortnet: !!c.fortnet,
          anydesk: !!c.anydesk,
          sharepoint: !!c.sharepoint,
        });

        // Parse opcionais
        const o = term.opcionais || {};
        setOpcionais({
          zwcad: !!o.zwcad,
          dwgNaviswork: !!o.dwgNaviswork,
          powerBi: !!o.powerBi,
          project: !!o.project,
        });
      }
    } else {
      // Novo termo com categoria padrão
      setCategoria(defaultCategory);
      setColaboradorNome('');
      setCentroCusto('');
      setCidade(defaultCategory === 'notebook' ? 'Escada, PE' : 'Recife');
      setDataEmissao(getTodayISODate());

      // Padrões Devolução (RG.TI.004)
      const targetDevType = initialReturnType || 'Celular';
      setTipoDevolucao(targetDevType);
      const matchedDevDef = availableReturnTypes.find(
        (t) => t.id.toLowerCase() === targetDevType.toLowerCase() || t.nome.toLowerCase() === targetDevType.toLowerCase()
      );
      if (matchedDevDef) {
        setDetalhesDevolucao(matchedDevDef.templatePadrao);
        setObservacaoDevolucao(matchedDevDef.observacaoPadrao || 'Com carregador.');
      } else {
        setDetalhesDevolucao('Celular\n\nModelo: Galaxy A03 Core\nImei chip: \nImei Celular: ');
        setObservacaoDevolucao('Com carregador.');
      }
      setMotivoDevolucao('');
      setRecebidoPor('');
      setEstadoConservacaoDevolucao('Bom');
      setAcessoriosDevolvidos(['Carregador / Fonte', 'Cabo de Alimentação']);
      setEquipamentoDevolvido('');
      setAfDevolucao('');
      setDataDevolucaoEfetiva(getTodayISODate());
      setObservacoesDevolucao('');

      // Padrões Tablet
      setModeloTablet('SAMSUNG GALAXY TAB A9+');
      setAfTablet('');
      setComCarregadorTablet(true);
      setComCapaTablet(true);
      setComCanetaTablet(false);
      setImeiTablet('');

      // Padrões Celular
      setModeloCelular('APENAS CHIP');
      setComCarregador(false);
      setImeiChip('');
      setImeiCelular('0');
      setNumeroLinha('');

      // Padrões Notebook
      setModelo('');
      setProcessador('Intel Core I5');
      setMemoria('8 GB');
      setCapacidadeHD('SSD 256 GB');
      setAf('');
      setChecklist({
        oneDrive: true,
        teams: true,
        office365: true,
        office2010: false,
        bitdefender: true,
        java: true,
        fortnet: true,
        anydesk: true,
        sharepoint: true,
      });
      setOpcionais({
        zwcad: false,
        dwgNaviswork: false,
        powerBi: false,
        project: false,
      });
    }

    setIsAddingModel(false);
    setIsAddingProc(false);
    setIsAddingMem(false);
    setIsAddingStorage(false);
  }, [isOpen, term, defaultCategory]);

  if (!isOpen) return null;

  // Add custom options handlers for Notebook
  const handleSaveNewModel = () => {
    const trimmed = newModelInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!savedModels.includes(trimmed)) {
      const updated = [...savedModels, trimmed];
      setSavedModels(updated);
      localStorage.setItem(LS_KEY_MODELS, JSON.stringify(updated));
      onToast(`Modelo "${trimmed}" salvo com sucesso!`, 'success');
    }
    setModelo(trimmed);
    setNewModelInput('');
    setIsAddingModel(false);
  };

  const handleSaveNewProc = () => {
    const trimmed = newProcInput.trim();
    if (!trimmed) return;
    if (!savedProcessors.includes(trimmed)) {
      const updated = [...savedProcessors, trimmed];
      setSavedProcessors(updated);
      localStorage.setItem(LS_KEY_PROCS, JSON.stringify(updated));
      onToast(`Processador "${trimmed}" salvo!`, 'success');
    }
    setProcessador(trimmed);
    setNewProcInput('');
    setIsAddingProc(false);
  };

  const handleSaveNewMem = () => {
    const trimmed = newMemInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!savedMemories.includes(trimmed)) {
      const updated = [...savedMemories, trimmed];
      setSavedMemories(updated);
      localStorage.setItem(LS_KEY_MEMS, JSON.stringify(updated));
      onToast(`Memória "${trimmed}" salva!`, 'success');
    }
    setMemoria(trimmed);
    setNewMemInput('');
    setIsAddingMem(false);
  };

  const handleSaveNewStorage = () => {
    const trimmed = newStorageInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!savedStorages.includes(trimmed)) {
      const updated = [...savedStorages, trimmed];
      setSavedStorages(updated);
      localStorage.setItem(LS_KEY_STORAGES, JSON.stringify(updated));
      onToast(`Armazenamento "${trimmed}" salvo!`, 'success');
    }
    setCapacidadeHD(trimmed);
    setNewStorageInput('');
    setIsAddingStorage(false);
  };

  // Toggle checklist item
  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle opcional item
  const handleToggleOpcional = (key: keyof typeof opcionais) => {
    setOpcionais((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Persist new model or cost center when submitted
  const persistOption = (
    value: string,
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    lsKey: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const exists = currentList.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const updated = [...currentList, trimmed];
      setList(updated);
      try {
        localStorage.setItem(lsKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar opção:', e);
      }
    }
  };

  // Submit handler
  const handleSubmit = (shouldPrint = false) => {
    if (!colaboradorNome.trim()) {
      onToast('Por favor, informe o nome do colaborador.', 'error');
      return;
    }

    if (categoria === 'devolucao') {
      if (!colaboradorNome.trim()) {
        onToast('Por favor, informe o nome do colaborador (* Título).', 'error');
        return;
      }

      if (!detalhesDevolucao.trim() && !equipamentoDevolvido.trim() && !afDevolucao.trim()) {
        onToast('Por favor, informe os Detalhes da Devolução (Modelo, Marca, AF, etc.).', 'error');
        return;
      }

      if (centroCusto.trim()) {
        persistOption(centroCusto.trim(), savedCostCenters, setSavedCostCenters, LS_KEY_COST_CENTERS);
      }

      // Extrai AF de detalhesDevolucao ou do campo afDevolucao
      const afMatch = detalhesDevolucao.match(/AF:\s*([^\n\r]+)/i);
      const cleanAf = afDevolucao.trim() || (afMatch ? afMatch[1].trim() : '');

      const termData: ResponsibilityTerm = {
        id: term?.id || `TR-DEV-${Date.now().toString().slice(-6)}`,
        numeroTermo:
          term?.numeroTermo ||
          (cleanAf
            ? `DEV-AF-${cleanAf}`
            : `DEV-${Date.now().toString().slice(-4)}`),
        categoriaTermo: 'devolucao',
        tipo: 'Devolucao',
        tipoDevolucao: tipoDevolucao,
        detalhesDevolucao: detalhesDevolucao.trim(),
        observacaoDevolucao: observacaoDevolucao.trim(),
        motivoDevolucao: motivoDevolucao.trim(),
        recebidoPor: recebidoPor.trim() || currentUser.nome || 'Departamento de TI',
        estadoConservacaoDevolucao: estadoConservacaoDevolucao,
        acessoriosDevolvidos: acessoriosDevolvidos,
        observacoesDevolucao: observacaoDevolucao.trim() || observacoesDevolucao.trim(),
        tituloDocumento: 'Termo de Devolução',
        codigoDocumento: 'RG.TI.004 Rev00 10ago2020',
        dataEmissao: dataEmissao || getTodayISODate(),
        dataDevolucaoEfetiva: dataDevolucaoEfetiva || dataEmissao || getTodayISODate(),
        status: 'Devolvido',
        colaboradorNome: colaboradorNome.trim(),
        modelo:
          equipamentoDevolvido.trim().toUpperCase() ||
          (tipoDevolucao ? `DEVOLUÇÃO: ${tipoDevolucao.toUpperCase()}` : 'EQUIPAMENTO TI'),
        af: cleanAf,
        centroCusto: centroCusto.trim() || '988',
        cidade: cidade.trim() || 'Recife',
        emitidoPor: currentUser.nome || 'Departamento de TI',
        // Rastreabilidade de PDF
        ultimoPdfGeradoEm: shouldPrint ? new Date().toISOString() : term?.ultimoPdfGeradoEm,
        ultimoPdfGeradoPor: shouldPrint ? currentUser.nome || 'Departamento de TI' : term?.ultimoPdfGeradoPor,
        ultimoPdfDownloadCount: shouldPrint
          ? (term?.ultimoPdfDownloadCount || 0) + 1
          : term?.ultimoPdfDownloadCount || 0,
        createdAt: term?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSave(termData, shouldPrint);
      triggerHaptic('medium');
      onClose();
      return;
    }

    if (categoria === 'tablet') {
      if (!modeloTablet.trim()) {
        onToast('Por favor, informe o modelo do tablet.', 'error');
        return;
      }

      if (modeloTablet.trim()) {
        persistOption(modeloTablet.trim().toUpperCase(), savedTabletModels, setSavedTabletModels, LS_KEY_TABLET_MODELS);
      }
      if (centroCusto.trim()) {
        persistOption(centroCusto.trim(), savedCostCenters, setSavedCostCenters, LS_KEY_COST_CENTERS);
      }

      // Validação do IMEI do Tablet se preenchido
      const cleanImei = imeiTablet.trim().replace(/[\s-]/g, '');
      if (cleanImei) {
        const isNumeric = /^\d+$/.test(cleanImei);
        const isValidLen = cleanImei.length === 15 || cleanImei.length === 17;
        if (!isNumeric || !isValidLen) {
          onToast('O IMEI do Tablet deve conter exatamente 15 ou 17 dígitos numéricos.', 'error');
          triggerHaptic('error');
          return;
        }
      }

      const cleanAf = afTablet.trim();
      const termData: ResponsibilityTerm = {
        id: term?.id || `TR-TAB-${Date.now().toString().slice(-6)}`,
        numeroTermo:
          term?.numeroTermo ||
          (cleanAf
            ? `TAB-${cleanAf}`
            : `TAB-${Date.now().toString().slice(-4)}`),
        categoriaTermo: 'tablet',
        tituloDocumento: 'Termo de Responsabilidade Tablet Corporativo',
        codigoDocumento: 'RG.TI.003 Rev00 10ago2020',
        dataEmissao: dataEmissao || getTodayISODate(),
        status: term?.status || 'Ativo',
        colaboradorNome: colaboradorNome.trim(),
        modelo: modeloTablet.trim().toUpperCase(),
        af: cleanAf,
        comCarregador: comCarregadorTablet,
        comCapaProtecao: comCapaTablet,
        comCaneta: comCanetaTablet,
        imeiCelular: imeiTablet.trim() || undefined,
        imeiChip: imeiTablet.trim() || undefined,
        imeiTablet: imeiTablet.trim() || undefined,
        centroCusto: centroCusto.trim() || '988',
        cidade: cidade.trim() || 'Recife',
        emitidoPor: currentUser.nome || 'Departamento de TI',
        // Rastreabilidade de PDF
        ultimoPdfGeradoEm: shouldPrint ? new Date().toISOString() : term?.ultimoPdfGeradoEm,
        ultimoPdfGeradoPor: shouldPrint ? currentUser.nome || 'Departamento de TI' : term?.ultimoPdfGeradoPor,
        ultimoPdfDownloadCount: shouldPrint
          ? (term?.ultimoPdfDownloadCount || 0) + 1
          : term?.ultimoPdfDownloadCount || 0,
        createdAt: term?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSave(termData, shouldPrint);
      triggerHaptic('medium');
      onClose();
      return;
    }

    if (categoria === 'celular') {
      if (!numeroLinha.trim() && !imeiChip.trim()) {
        onToast('Por favor, informe o número da linha ou o IMEI do chip.', 'error');
        return;
      }

      if (centroCusto.trim()) {
        persistOption(centroCusto.trim(), savedCostCenters, setSavedCostCenters, LS_KEY_COST_CENTERS);
      }

      // Validação do IMEI Celular se preenchido e não '0'
      const cleanCelImei = imeiCelular.trim().replace(/[\s-]/g, '');
      if (cleanCelImei && cleanCelImei !== '0') {
        const isNumeric = /^\d+$/.test(cleanCelImei);
        const isValidLen = cleanCelImei.length === 15 || cleanCelImei.length === 17;
        if (!isNumeric || !isValidLen) {
          onToast('O IMEI do Celular deve conter exatamente 15 ou 17 dígitos numéricos.', 'error');
          triggerHaptic('error');
          return;
        }
      }

      const termData: ResponsibilityTerm = {
        id: term?.id || `TR-CEL-${Date.now().toString().slice(-6)}`,
        numeroTermo:
          term?.numeroTermo ||
          (numeroLinha.trim()
            ? `CEL-${numeroLinha.replace(/\D/g, '')}`
            : `CEL-${Date.now().toString().slice(-4)}`),
        categoriaTermo: 'celular',
        tituloDocumento: 'Termo de Responsabilidade Celular Corporativo',
        codigoDocumento: 'RG.TI.002 Rev00 10ago2020',
        dataEmissao: dataEmissao || getTodayISODate(),
        status: term?.status || 'Ativo',
        colaboradorNome: colaboradorNome.trim(),
        modelo: modeloCelular.trim() || 'APENAS CHIP',
        comCarregador: comCarregador,
        imeiChip: imeiChip.trim(),
        imeiCelular: imeiCelular.trim() || '0',
        numeroLinha: numeroLinha.trim(),
        centroCusto: centroCusto.trim() || '988',
        cidade: cidade.trim() || 'Recife',
        emitidoPor: currentUser.nome || 'Departamento de TI',
        // Rastreabilidade de PDF
        ultimoPdfGeradoEm: shouldPrint ? new Date().toISOString() : term?.ultimoPdfGeradoEm,
        ultimoPdfGeradoPor: shouldPrint ? currentUser.nome || 'Departamento de TI' : term?.ultimoPdfGeradoPor,
        ultimoPdfDownloadCount: shouldPrint
          ? (term?.ultimoPdfDownloadCount || 0) + 1
          : term?.ultimoPdfDownloadCount || 0,
        createdAt: term?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSave(termData, shouldPrint);
      triggerHaptic('medium');
      onClose();
      return;
    }

    // Categoria: Notebook
    if (modelo.trim()) {
      persistOption(modelo.trim().toUpperCase(), savedModels, setSavedModels, LS_KEY_MODELS);
    }
    if (centroCusto.trim()) {
      persistOption(centroCusto.trim(), savedCostCenters, setSavedCostCenters, LS_KEY_COST_CENTERS);
    }

    const termData: ResponsibilityTerm = {
      id: term?.id || `TR-${Date.now().toString().slice(-6)}`,
      numeroTermo: af.trim() ? `AF-${af.trim()}` : term?.numeroTermo || `TR-${Date.now().toString().slice(-4)}`,
      categoriaTermo: 'notebook',
      tituloDocumento: 'Termo de Responsabilidade Notebook',
      codigoDocumento: 'RG.TI.001 Rev00 10ago2020',
      dataEmissao: dataEmissao || getTodayISODate(),
      status: term?.status || 'Ativo',
      colaboradorNome: colaboradorNome.trim(),
      modelo: modelo.trim(),
      processador: processador.trim() || 'Intel Core I5',
      memoria: memoria.trim() || '8 GB',
      capacidadeHD: capacidadeHD.trim() || 'SSD 256 GB',
      af: af.trim(),
      checklistVerificacao: checklist,
      opcionais: opcionais,
      centroCusto: centroCusto.trim(),
      localUso: 'CEQ (Central de Equipamentos)',
      cidade: cidade.trim() || 'Escada, PE',
      emitidoPor: currentUser.nome || 'Departamento de TI',
      // Rastreabilidade de PDF
      ultimoPdfGeradoEm: shouldPrint ? new Date().toISOString() : term?.ultimoPdfGeradoEm,
      ultimoPdfGeradoPor: shouldPrint ? currentUser.nome || 'Departamento de TI' : term?.ultimoPdfGeradoPor,
      ultimoPdfDownloadCount: shouldPrint
        ? (term?.ultimoPdfDownloadCount || 0) + 1
        : term?.ultimoPdfDownloadCount || 0,
      createdAt: term?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(termData, shouldPrint);
    triggerHaptic('medium');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#f25c27] to-[#e04510] flex items-center justify-center text-white shadow-xs">
              {categoria === 'devolucao' ? (
                <RotateCcw className="w-5 h-5" />
              ) : categoria === 'tablet' ? (
                <Tablet className="w-5 h-5" />
              ) : categoria === 'celular' ? (
                <Smartphone className="w-5 h-5" />
              ) : (
                <Laptop className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {term
                  ? categoria === 'devolucao'
                    ? 'Editar Termo de Devolução'
                    : categoria === 'tablet'
                    ? 'Editar Termo de Tablet Corporativo'
                    : categoria === 'celular'
                    ? 'Editar Termo de Celular Corporativo'
                    : 'Editar Termo de Notebook'
                  : categoria === 'devolucao'
                  ? 'Registrar Termo de Devolução de Equipamento'
                  : categoria === 'tablet'
                  ? 'Gerar Termo de Tablet Corporativo'
                  : categoria === 'celular'
                  ? 'Gerar Termo de Celular Corporativo'
                  : 'Gerar Termo de Notebook'}
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {categoria === 'devolucao'
                    ? 'DEV.TI.001'
                    : categoria === 'tablet'
                    ? 'RG.TI.003'
                    : categoria === 'celular'
                    ? 'RG.TI.002'
                    : 'RG.TI.001'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {categoria === 'devolucao'
                  ? 'Devolução de ativo de TI, periféricos e acessórios com controle de estado'
                  : categoria === 'tablet'
                  ? 'Termo de Aceite e Conservação de Tablet e Acessórios · Recife, PE'
                  : categoria === 'celular'
                  ? 'Termo de Aceite e Conservação de Celular/Chip · Recife, PE'
                  : 'Emissão em CEQ (Central de Equipamentos) · Escada, PE'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categoria Selector Switcher (Notebook vs Celular vs Tablet vs Devolução) */}
        <div className="px-6 pt-4 pb-1 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            Tipo de Termo:
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setCategoria('notebook');
              if (cidade === 'Recife') setCidade('Escada, PE');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
              categoria === 'notebook'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Notebook (RG.TI.001)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setCategoria('celular');
              if (cidade === 'Escada, PE') setCidade('Recife');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
              categoria === 'celular'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Celular (RG.TI.002)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setCategoria('tablet');
              if (cidade === 'Escada, PE') setCidade('Recife');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
              categoria === 'tablet'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet (RG.TI.003)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setCategoria('devolucao');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
              categoria === 'devolucao'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Devolução (DEV.TI.001)</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          
          {/* Section 1: Colaborador e Centro de Custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nome do Colaborador */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-600" />
                Nome do Colaborador *
              </label>
              <input
                type="text"
                required
                value={colaboradorNome}
                onChange={(e) => setColaboradorNome(e.target.value)}
                placeholder="Nome do colaborador"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            {/* Centro de Custo do Colaborador */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-600" />
                Centro de Custo
              </label>
              <input
                type="text"
                value={centroCusto}
                onChange={(e) => setCentroCusto(e.target.value)}
                list="saved-cost-centers-list"
                placeholder="Centro de custo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              <datalist id="saved-cost-centers-list">
                {savedCostCenters.map((cc, idx) => (
                  <option key={`cc-${idx}`} value={cc} />
                ))}
              </datalist>
            </div>
          </div>

          {categoria === 'devolucao' ? (
            /* ================================================================= */
            /* MODELO OFICIAL TERMO DE DEVOLUÇÃO: RG.TI.004 Rev00 10ago2020      */
            /* ================================================================= */
            <div className="space-y-4 pt-1">
              {/* Card Principal: Tipo Devolução e Data Termo */}
              <div className="border border-orange-200 bg-orange-50/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-orange-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f25c27] flex items-center justify-center text-white shadow-xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Termo de Devolução</h4>
                      <p className="text-[11px] text-slate-500">Padrão Oficial RG.TI.004 Rev00 10ago2020</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white text-orange-800 border border-orange-200">
                    RG.TI.004
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tipo Devolução (Os 6 tipos exatos das fotos) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <span className="text-orange-600 font-bold">*</span> Tipo Devolução
                    </label>
                    <select
                      value={tipoDevolucao}
                      onChange={(e) => {
                        const newType = e.target.value;
                        triggerHaptic('light');
                        setTipoDevolucao(newType);

                        const matched = availableReturnTypes.find(
                          (t) => t.id.toLowerCase() === newType.toLowerCase() || t.nome.toLowerCase() === newType.toLowerCase()
                        );
                        if (matched) {
                          setDetalhesDevolucao(matched.templatePadrao);
                          if (matched.observacaoPadrao) {
                            setObservacaoDevolucao(matched.observacaoPadrao);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden cursor-pointer"
                    >
                      {availableReturnTypes.map((rt) => (
                        <option key={rt.id} value={rt.nome}>
                          {rt.icone} {rt.nome}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Selecione um dos tipos de devolução cadastrados no sistema
                    </span>
                  </div>

                  {/* Data Termo */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-orange-600 font-bold">*</span> Data Termo
                    </label>
                    <input
                      type="date"
                      value={dataEmissao}
                      onChange={(e) => {
                        setDataEmissao(e.target.value);
                        setDataDevolucaoEfetiva(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Data impressa no cabeçalho do termo de devolução
                    </span>
                  </div>
                </div>

                {/* Seletores Rápidos de Tipos cadastrados em formato de botão */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                      Seleção Rápida de Tipo:
                    </span>
                    <span className="text-[10px] text-orange-600 font-medium">
                      {availableReturnTypes.length} tipos disponíveis
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableReturnTypes.map((item) => {
                      const isSelected =
                        tipoDevolucao.toLowerCase() === item.nome.toLowerCase() ||
                        tipoDevolucao.toLowerCase() === item.id.toLowerCase();
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setTipoDevolucao(item.nome);
                            setDetalhesDevolucao(item.templatePadrao);
                            if (item.observacaoPadrao) {
                              setObservacaoDevolucao(item.observacaoPadrao);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-2 text-left ${
                            isSelected
                              ? 'bg-orange-600 text-white border-orange-600 shadow-xs ring-2 ring-orange-500/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="text-base select-none">{item.icone}</span>
                          <span className="truncate">{item.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Seção Detalhes da Devolução (Conforme template oficial RG.TI.004) */}
              <div className="border border-slate-200 bg-white rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-orange-600" />
                    <span>Detalhes da Devolução *</span>
                  </label>
                  {/* Ações rápidas de inserção de template */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        const tpl = 'Notebook\nModelo: \nMarca: \nAF: ';
                        setDetalhesDevolucao((prev) => (prev.trim() ? `${prev.trim()}\n\n${tpl}` : tpl));
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      + Notebook
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        const tpl = 'Celular\nModelo: Galaxy A03 Core\nImei chip: \nImei Celular: ';
                        setDetalhesDevolucao((prev) => (prev.trim() ? `${prev.trim()}\n\n${tpl}` : tpl));
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      + Celular
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        const tpl = 'Modem\nModelo: Huawei 4G\nImei Chip: \nImei Celular: ';
                        setDetalhesDevolucao((prev) => (prev.trim() ? `${prev.trim()}\n\n${tpl}` : tpl));
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      + Modem
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setDetalhesDevolucao('');
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Caixa de instrução do template oficial */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1 font-sans">
                  <p className="font-semibold text-slate-900">
                    Coloque os detalhes da devolução de acordo com o template abaixo:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 text-slate-600">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-900 block">Notebook</span>
                      <span>Modelo: XXXX</span><br />
                      <span>Marca: XXXX</span><br />
                      <span>AF: XXXX</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-900 block">Celular</span>
                      <span>Modelo: XXXX</span><br />
                      <span>Imei Chip: XXXX</span><br />
                      <span>Imei Celular: XXXX</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-900 block">Modem</span>
                      <span>Modelo: XXXX</span><br />
                      <span>Imei Chip: XXXX</span><br />
                      <span>Imei Celular: XXXX</span>
                    </div>
                  </div>
                  <p className="text-red-600 font-bold text-[11px] pt-1">
                    Obs.: Evite passar de 15 linhas no campo &quot;Detalhes da Devolução&quot;, só colocando o que necessita.
                  </p>
                </div>

                {/* Textarea para Detalhes da Devolução */}
                <textarea
                  rows={6}
                  value={detalhesDevolucao}
                  onChange={(e) => setDetalhesDevolucao(e.target.value)}
                  placeholder={`Celular\n\nModelo: Galaxy A03 Core\nImei chip: 89551185129000699116\nImei Celular: 358.302.232.438.612`}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden leading-relaxed"
                />
                
                {/* Linhas Contador */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Linhas preenchidas:{' '}
                    <strong className={detalhesDevolucao.split('\n').length > 15 ? 'text-red-600' : 'text-slate-800'}>
                      {detalhesDevolucao.trim() ? detalhesDevolucao.split('\n').length : 0}
                    </strong>{' '}
                    / 15 recomendadas
                  </span>
                  {detalhesDevolucao.split('\n').length > 15 && (
                    <span className="text-red-600 font-bold">Aviso: texto com mais de 15 linhas</span>
                  )}
                </div>
              </div>

              {/* Seção Observação */}
              <div className="border border-slate-200 bg-white rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    Observação
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setObservacaoDevolucao('Com carregador.')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      &quot;Com carregador.&quot;
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservacaoDevolucao('Com carregador e mochila.')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      &quot;Com carregador e mochila.&quot;
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservacaoDevolucao('Apenas aparelho sem carregador.')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      &quot;Sem carregador&quot;
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={observacaoDevolucao}
                  onChange={(e) => setObservacaoDevolucao(e.target.value)}
                  placeholder="Ex: Com carregador."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Detalhes de Conferência Interna da TI (Recebido Por, Cidade, Estado de Conservação) */}
              <div className="border border-slate-200 bg-white rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Conferência do Recebimento (TI)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-orange-600" />
                      Recebido por (TI)
                    </label>
                    <input
                      type="text"
                      value={recebidoPor}
                      onChange={(e) => setRecebidoPor(e.target.value)}
                      placeholder="Nome do técnico da TI"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-600" />
                      Cidade / Unidade
                    </label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Recife ou Escada, PE"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Estado de Conservação */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Estado de Conservação
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {['Novo', 'Excelente', 'Bom', 'Regular', 'Com Defeito'].map((estado) => (
                      <button
                        key={estado}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setEstadoConservacaoDevolucao(estado);
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition cursor-pointer text-center ${
                          estadoConservacaoDevolucao === estado
                            ? estado === 'Com Defeito'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {estado}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : categoria === 'tablet' ? (
            /* ================================================================= */
            /* CAMPOS ESPECÍFICOS DE TABLET CORPORATIVO (RG.TI.003)              */
            /* ================================================================= */
            <div className="space-y-4 pt-1">
              <div className="border border-orange-200 bg-orange-50/40 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-950">
                  <Tablet className="w-4 h-4 text-orange-600" />
                  <span>Especificações do Tablet e Acessórios (RG.TI.003 Rev00)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Modelo do Tablet */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Modelo do Tablet *
                    </label>
                    <input
                      type="text"
                      value={modeloTablet}
                      onChange={(e) => setModeloTablet(e.target.value)}
                      list="saved-tablet-models"
                      placeholder="Ex: SAMSUNG GALAXY TAB A9+"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden uppercase"
                    />
                    <datalist id="saved-tablet-models">
                      {savedTabletModels.map((m, idx) => (
                        <option key={`tab-mod-${idx}`} value={m} />
                      ))}
                    </datalist>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Opções rápidas:</span>
                      {['SAMSUNG GALAXY TAB A9+', 'SAMSUNG GALAXY TAB S6 LITE', 'IPAD 9ª GERAÇÃO'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setModeloTablet(opt)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AF / Patrimônio */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      AF (Nº do Equipamento / Patrimônio)
                    </label>
                    <input
                      type="text"
                      value={afTablet}
                      onChange={(e) => setAfTablet(e.target.value)}
                      placeholder="Ex: 40120"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Gera identificador do termo ex: TAB-40120
                    </span>
                  </div>
                </div>

                {/* Acessórios inclusos */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                    Acessórios e Itens Inclusos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Carregador */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Zap className="w-3.5 h-3.5 text-orange-600" />
                        <span>Carregador + Cabo</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setComCarregadorTablet(false)}
                          className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            !comCarregadorTablet
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          NÃO
                        </button>
                        <button
                          type="button"
                          onClick={() => setComCarregadorTablet(true)}
                          className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            comCarregadorTablet
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          SIM
                        </button>
                      </div>
                    </div>

                    {/* Capa de Proteção */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                        <span>Capa de Proteção</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setComCapaTablet(false)}
                          className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            !comCapaTablet
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          NÃO
                        </button>
                        <button
                          type="button"
                          onClick={() => setComCapaTablet(true)}
                          className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            comCapaTablet
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          SIM
                        </button>
                      </div>
                    </div>

                    {/* Caneta Stylus / S-Pen */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <PenTool className="w-3.5 h-3.5 text-orange-600" />
                        <span>Caneta S-Pen / Stylus</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setComCanetaTablet(false)}
                          className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            !comCanetaTablet
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          NÃO
                        </button>
                        <button
                          type="button"
                          onClick={() => setComCanetaTablet(true)}
                          className={`py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            comCanetaTablet
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          SIM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identificação de IMEI do Tablet */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-orange-600" />
                    IMEI do Tablet
                  </label>
                  <input
                    type="text"
                    value={imeiTablet}
                    onChange={(e) => setImeiTablet(e.target.value)}
                    placeholder="Ex: 354892109827341 (15 dígitos) ou Serial/IMEI do Aparelho"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Número de IMEI do dispositivo para controle patrimonial
                  </span>
                </div>
              </div>

              {/* Cidade e Data de Emissão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    Cidade de Emissão
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Recife"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          ) : categoria === 'celular' ? (
            /* ================================================================= */
            /* CAMPOS ESPECÍFICOS DE CELULAR CORPORATIVO (RG.TI.002)            */
            /* ================================================================= */
            <div className="space-y-4 pt-1">
              <div className="border border-orange-200 bg-orange-50/40 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-950">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span>Especificações do Celular e Chip (RG.TI.002 Rev00)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Modelo do Aparelho */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Modelo do Aparelho / Chip *
                    </label>
                    <input
                      type="text"
                      value={modeloCelular}
                      onChange={(e) => setModeloCelular(e.target.value)}
                      list="saved-cell-models"
                      placeholder="Ex: APENAS CHIP ou SAMSUNG GALAXY A14"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden uppercase"
                    />
                    <datalist id="saved-cell-models">
                      {savedCellModels.map((m, idx) => (
                        <option key={`cell-mod-${idx}`} value={m} />
                      ))}
                    </datalist>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Opções rápidas:</span>
                      {['APENAS CHIP', 'SAMSUNG GALAXY A14', 'MOTOROLA MOTO G'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setModeloCelular(opt);
                            if (opt === 'APENAS CHIP') {
                              setComCarregador(false);
                              if (!imeiCelular || imeiCelular === '') setImeiCelular('0');
                            }
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Com Carregador? */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-orange-600" />
                      Com Carregador?
                    </label>
                    <div className="grid grid-cols-2 gap-2 h-[42px]">
                      <button
                        type="button"
                        onClick={() => setComCarregador(false)}
                        className={`rounded-xl text-xs font-bold flex items-center justify-center transition cursor-pointer border ${
                          !comCarregador
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        NÃO
                      </button>
                      <button
                        type="button"
                        onClick={() => setComCarregador(true)}
                        className={`rounded-xl text-xs font-bold flex items-center justify-center transition cursor-pointer border ${
                          comCarregador
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        SIM
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {comCarregador ? 'Aparelho entregue com carregador' : 'Sem carregador (padrão para chip)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Número da Linha */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-orange-600" />
                      Número da Linha *
                    </label>
                    <input
                      type="text"
                      value={numeroLinha}
                      onChange={(e) => setNumeroLinha(e.target.value)}
                      placeholder="Ex: 81-98226-8217"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* IMEI CHIP (ICCID) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-orange-600" />
                      IMEI Chip (ICCID)
                    </label>
                    <input
                      type="text"
                      value={imeiChip}
                      onChange={(e) => setImeiChip(e.target.value)}
                      placeholder="Ex: 8955118512900069883729"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* IMEI Celular */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-orange-600" />
                      IMEI Celular
                    </label>
                    <input
                      type="text"
                      value={imeiCelular}
                      onChange={(e) => setImeiCelular(e.target.value)}
                      placeholder="0 para apenas chip ou 15 dígitos"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Cidade de Emissão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    Cidade de Emissão
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Recife"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ================================================================= */
            /* CAMPOS ESPECÍFICOS DE NOTEBOOK (RG.TI.001)                       */
            /* ================================================================= */
            <>
              {/* Section 2: Hardware Especificações */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-orange-600" />
                    Especificações Técnicas de Hardware (RG.TI.001)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Modelo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Modelo do Notebook *
                    </label>
                    <input
                      type="text"
                      required
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      list="saved-models-list"
                      placeholder="Ex: VOSTRO 3480"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 uppercase focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <datalist id="saved-models-list">
                      {savedModels.map((m, idx) => (
                        <option key={`m-${idx}`} value={m} />
                      ))}
                    </datalist>
                  </div>

                  {/* Processador */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Processador
                    </label>
                    <input
                      type="text"
                      value={processador}
                      onChange={(e) => setProcessador(e.target.value)}
                      list="saved-procs-list"
                      placeholder="Ex: Intel Core I5"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <datalist id="saved-procs-list">
                      {savedProcessors.map((p, idx) => (
                        <option key={`p-${idx}`} value={p} />
                      ))}
                    </datalist>
                  </div>

                  {/* AF */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      AF (Nº do Equipamento)
                    </label>
                    <input
                      type="text"
                      value={af}
                      onChange={(e) => setAf(e.target.value)}
                      placeholder="Ex: 30466"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Memória */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Memória Instalada
                    </label>
                    <input
                      type="text"
                      value={memoria}
                      onChange={(e) => setMemoria(e.target.value)}
                      list="saved-mems-list"
                      placeholder="Ex: 8 GB"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <datalist id="saved-mems-list">
                      {savedMemories.map((m, idx) => (
                        <option key={`mem-${idx}`} value={m} />
                      ))}
                    </datalist>
                  </div>

                  {/* Capacidade HD */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Capacidade de HD / SSD
                    </label>
                    <input
                      type="text"
                      value={capacidadeHD}
                      onChange={(e) => setCapacidadeHD(e.target.value)}
                      list="saved-storage-list"
                      placeholder="Ex: SSD 256 GB"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <datalist id="saved-storage-list">
                      {savedStorages.map((s, idx) => (
                        <option key={`st-${idx}`} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Section 3: Checklist de Verificação */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Checklist de Verificação
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 uppercase">Softwares Padrão (Pré-instalados): </span>
                    <span className="text-slate-600">
                      One drive, Teams, Bitdefender, Java, Fortnet, Anydesk, Sharepoint.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                      checklist.office2010
                        ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-400/30'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!checklist.office2010}
                        onChange={() => handleToggleChecklist('office2010')}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Office 2010</span>
                        <span className="text-[10px] text-slate-500">Versão instalada</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                      checklist.office365
                        ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-400/30'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!checklist.office365}
                        onChange={() => handleToggleChecklist('office365')}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Office 365</span>
                        <span className="text-[10px] text-slate-500">Versão em nuvem</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Opcionais */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Opcionais (4 Itens)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none p-1 rounded-lg hover:bg-white transition">
                    <input
                      type="checkbox"
                      checked={!!opcionais.zwcad}
                      onChange={() => handleToggleOpcional('zwcad')}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                    />
                    <span className="font-medium">Zwcad</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none p-1 rounded-lg hover:bg-white transition">
                    <input
                      type="checkbox"
                      checked={!!opcionais.dwgNaviswork}
                      onChange={() => handleToggleOpcional('dwgNaviswork')}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                    />
                    <span className="font-medium">DWG/Naviswork</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none p-1 rounded-lg hover:bg-white transition">
                    <input
                      type="checkbox"
                      checked={!!opcionais.powerBi}
                      onChange={() => handleToggleOpcional('powerBi')}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                    />
                    <span className="font-medium">Power BI</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none p-1 rounded-lg hover:bg-white transition">
                    <input
                      type="checkbox"
                      checked={!!opcionais.project}
                      onChange={() => handleToggleOpcional('project')}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                    />
                    <span className="font-medium">Project</span>
                  </label>
                </div>
              </div>

              {/* Section 5: Local de Emissão e Data */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="text-slate-600">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Local de Emissão:</span>
                  <strong className="text-slate-800">CEQ (Central de Equipamentos) · Escada, PE</strong>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Data de Emissão:
                  </span>
                  <input
                    type="date"
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>Padrão Institucional MCM:</span>
            <strong className="text-slate-700 font-mono">
              {categoria === 'devolucao'
                ? 'DEV.TI.001 Rev00'
                : categoria === 'tablet'
                ? 'RG.TI.003 Rev00'
                : categoria === 'celular'
                ? 'RG.TI.002 Rev00'
                : 'RG.TI.001 Rev00'}
            </strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Termo</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Salvar & Gerar PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

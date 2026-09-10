import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Printer,
  User,
  Laptop,
  CheckSquare,
  Calendar,
  Building2,
  Plus,
} from 'lucide-react';
import { ResponsibilityTerm, UserProfile } from '../types';
import { getTodayISODate } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';

interface ResponsibilityTermModalProps {
  isOpen: boolean;
  term: ResponsibilityTerm | null;
  users: UserProfile[];
  currentUser: UserProfile;
  onClose: () => void;
  onSave: (term: ResponsibilityTerm, shouldPrintImmediately?: boolean) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Valores padrões oficiais para Processador, Memória e HD/SSD
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

// LocalStorage keys
const LS_KEY_MODELS = 'mcm_saved_models_clean';
const LS_KEY_PROCS = 'mcm_saved_processors_clean';
const LS_KEY_MEMS = 'mcm_saved_memories_clean';
const LS_KEY_STORAGES = 'mcm_saved_storages_clean';
const LS_KEY_COST_CENTERS = 'mcm_saved_cost_centers_clean';

export const ResponsibilityTermModal: React.FC<ResponsibilityTermModalProps> = ({
  isOpen,
  term,
  users,
  currentUser,
  onClose,
  onSave,
  onToast,
}) => {
  // Form State
  const [colaboradorNome, setColaboradorNome] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [modelo, setModelo] = useState('');
  const [processador, setProcessador] = useState('Intel Core I5');
  const [memoria, setMemoria] = useState('8 GB');
  const [capacidadeHD, setCapacidadeHD] = useState('SSD 256 GB');
  const [af, setAf] = useState('');
  const [dataEmissao, setDataEmissao] = useState(getTodayISODate());

  // Checklists (As 9 opções)
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

  // Opcionais (As 4 opções exatas solicitadas)
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
      setColaboradorNome(term.colaboradorNome || '');
      setCentroCusto(term.centroCusto || '');
      setModelo(term.modelo || '');
      setProcessador(term.processador || 'Intel Core I5');
      setMemoria(term.memoria || '8 GB');
      setCapacidadeHD(term.capacidadeHD || 'SSD 256 GB');
      setAf(term.af || term.numeroTermo?.replace(/^AF-/, '') || '');
      setDataEmissao(term.dataEmissao || getTodayISODate());

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
    } else {
      // Começa com os padrões clássicos setados em Processador/Memória/HD
      setColaboradorNome('');
      setCentroCusto('');
      setModelo('');
      setProcessador('Intel Core I5');
      setMemoria('8 GB');
      setCapacidadeHD('SSD 256 GB');
      setAf('');
      setDataEmissao(getTodayISODate());
      setChecklist({
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
  }, [isOpen, term]);

  if (!isOpen) return null;

  // Add custom options handlers
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
      onToast(`Processador "${trimmed}" salvo com sucesso!`, 'success');
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
      onToast(`Memória "${trimmed}" salva com sucesso!`, 'success');
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
      onToast(`Capacidade "${trimmed}" salva com sucesso!`, 'success');
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

  // Select all / clear checklist
  const handleSelectAllChecklist = () => {
    setChecklist({
      oneDrive: true,
      teams: true,
      office365: true,
      office2010: true,
      bitdefender: true,
      java: true,
      fortnet: true,
      anydesk: true,
      sharepoint: true,
    });
  };

  const handleClearChecklist = () => {
    setChecklist({
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

    // Auto-save model and cost center so they are remembered for next terms
    if (modelo.trim()) {
      persistOption(modelo.trim().toUpperCase(), savedModels, setSavedModels, LS_KEY_MODELS);
    }
    if (centroCusto.trim()) {
      persistOption(centroCusto.trim(), savedCostCenters, setSavedCostCenters, LS_KEY_COST_CENTERS);
    }

    const termData: ResponsibilityTerm = {
      id: term?.id || `TR-${Date.now().toString().slice(-6)}`,
      numeroTermo: af.trim() ? `AF-${af.trim()}` : term?.numeroTermo || `TR-${Date.now().toString().slice(-4)}`,
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
      cidade: 'Escada, PE',
      emitidoPor: currentUser.nome || 'Departamento de TI',
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
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {term ? 'Editar Termo de Responsabilidade' : 'Gerar Termo de Responsabilidade'}
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  RG.TI.001
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Emissão em CEQ (Central de Equipamentos) · Escada, PE
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
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              {users.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Sugestões:</span>
                  {users.slice(0, 3).map((u, idx) => (
                    <button
                      key={u.uid || u.email || `colab-${idx}`}
                      type="button"
                      onClick={() => setColaboradorNome(u.nome)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {u.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Centro de Custo do Colaborador */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-600" />
                Centro de Custo do Colaborador
              </label>
              <input
                type="text"
                value={centroCusto}
                onChange={(e) => setCentroCusto(e.target.value)}
                list="saved-cost-centers-list"
                placeholder=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
              <datalist id="saved-cost-centers-list">
                {savedCostCenters.map((cc, idx) => (
                  <option key={`cc-${idx}-${cc}`} value={cc} />
                ))}
              </datalist>

              {savedCostCenters.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Salvos:</span>
                  {savedCostCenters.slice(0, 3).map((cc, idx) => (
                    <button
                      key={`quick-cc-${idx}`}
                      type="button"
                      onClick={() => setCentroCusto(cc)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                    >
                      {cc}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Section 2: Especificações do Notebook */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-orange-600" />
                Especificações do Notebook
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Padrões selecionados · Novos itens ficam salvos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* MODELO (Com opção de criar item para salvar para os demais termos) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    MODELO
                  </label>
                  {!isAddingModel && (
                    <button
                      type="button"
                      onClick={() => setIsAddingModel(true)}
                      className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Criar novo
                    </button>
                  )}
                </div>

                {isAddingModel ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={newModelInput}
                      onChange={(e) => setNewModelInput(e.target.value)}
                      placeholder="Ex: DELL LATITUDE 3420"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-orange-300 bg-white text-xs font-semibold uppercase text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewModel}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingModel(false);
                        setNewModelInput('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      list="saved-models-list"
                      placeholder=""
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold uppercase text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                    <datalist id="saved-models-list">
                      {savedModels.map((m, idx) => (
                        <option key={`model-${idx}-${m}`} value={m} />
                      ))}
                    </datalist>

                    {savedModels.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {savedModels.map((m, idx) => (
                          <button
                            key={`chip-m-${idx}`}
                            type="button"
                            onClick={() => setModelo(m)}
                            className={`text-[9px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              modelo.toUpperCase() === m.toUpperCase()
                                ? 'bg-orange-100 border-orange-300 text-orange-800 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AF (Sem aviso de exemplo dentro da caixinha) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  AF (Ativo Fixo)
                </label>
                <input
                  type="text"
                  value={af}
                  onChange={(e) => setAf(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* PROCESSADOR (Com padrão setado e opção de criar novo) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    PROCESSADOR
                  </label>
                  {!isAddingProc && (
                    <button
                      type="button"
                      onClick={() => setIsAddingProc(true)}
                      className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Criar novo
                    </button>
                  )}
                </div>

                {isAddingProc ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={newProcInput}
                      onChange={(e) => setNewProcInput(e.target.value)}
                      placeholder="Novo processador"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-orange-300 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewProc}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingProc(false);
                        setNewProcInput('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={processador}
                    onChange={(e) => setProcessador(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    {savedProcessors.map((p, idx) => (
                      <option key={`proc-${idx}-${p}`} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* MEMÓRIA & HD/SSD (Com padrões setados e opções de criar novo) */}
              <div className="grid grid-cols-2 gap-2">
                
                {/* MEMÓRIA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      MEMÓRIA
                    </label>
                    {!isAddingMem && (
                      <button
                        type="button"
                        onClick={() => setIsAddingMem(true)}
                        className="text-[9px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        + Criar
                      </button>
                    )}
                  </div>

                  {isAddingMem ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newMemInput}
                        onChange={(e) => setNewMemInput(e.target.value)}
                        placeholder="Ex: 32 GB"
                        className="w-full px-2 py-1 rounded border border-orange-300 text-xs font-semibold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewMem}
                        className="px-1.5 py-1 bg-orange-600 text-white text-[10px] font-bold rounded cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={memoria}
                      onChange={(e) => setMemoria(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                      {savedMemories.map((m, idx) => (
                        <option key={`mem-${idx}-${m}`} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* HD / SSD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      HD / SSD
                    </label>
                    {!isAddingStorage && (
                      <button
                        type="button"
                        onClick={() => setIsAddingStorage(true)}
                        className="text-[9px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        + Criar
                      </button>
                    )}
                  </div>

                  {isAddingStorage ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newStorageInput}
                        onChange={(e) => setNewStorageInput(e.target.value)}
                        placeholder="Ex: SSD 1 TB"
                        className="w-full px-2 py-1 rounded border border-orange-300 text-xs font-semibold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewStorage}
                        className="px-1.5 py-1 bg-orange-600 text-white text-[10px] font-bold rounded cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={capacidadeHD}
                      onChange={(e) => setCapacidadeHD(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                      {savedStorages.map((s, idx) => (
                        <option key={`storage-${idx}-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* Section 3: Checklist de Verificação (9 Itens) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                Checklist de Verificação (9 Itens)
              </label>

              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAllChecklist}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={handleClearChecklist}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Checklist Grid (3 cols x 3 rows) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.oneDrive}
                  onChange={() => handleToggleChecklist('oneDrive')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">One drive</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.teams}
                  onChange={() => handleToggleChecklist('teams')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Teams</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.office365}
                  onChange={() => handleToggleChecklist('office365')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Office 365</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.office2010}
                  onChange={() => handleToggleChecklist('office2010')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Office 2010</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.bitdefender}
                  onChange={() => handleToggleChecklist('bitdefender')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Bitdefender</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.java}
                  onChange={() => handleToggleChecklist('java')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Java</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.fortnet}
                  onChange={() => handleToggleChecklist('fortnet')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Fortnet</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.anydesk}
                  onChange={() => handleToggleChecklist('anydesk')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Anydesk</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white transition">
                <input
                  type="checkbox"
                  checked={!!checklist.sharepoint}
                  onChange={() => handleToggleChecklist('sharepoint')}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                />
                <span className="font-medium">Sharepoint</span>
              </label>
            </div>
          </div>

          {/* Section 4: Opcionais (Apenas as 4 opções solicitadas) */}
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
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Local de Emissão do Termo:</span>
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

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>Padrão Institucional MCM:</span>
            <strong className="text-slate-700 font-mono">RG.TI.001 Rev00</strong>
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

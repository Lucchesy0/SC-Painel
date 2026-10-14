import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Boxes, Tag, MapPin, Plus, Check, Trash2, Tablet, User, Laptop, Smartphone, Wifi } from 'lucide-react';
import { Equipment, EquipmentStatus, UserProfile } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface EquipmentModalProps {
  isOpen: boolean;
  editingEquipment: Equipment | null;
  users?: UserProfile[];
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STORAGE_CAT_KEY = 'mcm_inventory_custom_categories_v2';
const STORAGE_LOC_KEY = 'mcm_inventory_custom_locations_v2';

// Sequência exata solicitada: notebook, VIVOBOX, celular, tablet, outro
export type EquipmentType = 'Notebook' | 'VIVOBOX' | 'Celular' | 'Tablet' | 'Outro';
export const EQUIPMENT_TYPES: EquipmentType[] = ['Notebook', 'VIVOBOX', 'Celular', 'Tablet', 'Outro'];

// Os 4 modelos exatos de tablets corporativos
export const COMPANY_TABLET_MODELS = [
  'Tablet Samsung A9',
  'Tablet Lenovo TAB K11',
  'Tablet Galaxy A11',
  'Tablet TAB ACTIVE 5',
];

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  editingEquipment,
  users = [],
  onClose,
  onSave,
  onToast,
}) => {
  // Tipo de Equipamento selecionado (único controle por abas/botões diretos)
  const [tipoEquipamento, setTipoEquipamento] = useState<EquipmentType>('Tablet');

  // Campos específicos de Tablet: Modelo, Usuário e AF
  const [modeloTablet, setModeloTablet] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [usuarioTablet, setUsuarioTablet] = useState('');
  const [afTablet, setAfTablet] = useState('');

  // Campos de outros equipamentos
  const [codigoPatrimonio, setCodigoPatrimonio] = useState('');
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Ativado');

  // Categorias cadastradas para o tipo 'Outro'
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      localStorage.removeItem('mcm_inventory_categories');
      const saved = localStorage.getItem(STORAGE_CAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return ['Equipamentos', 'Acessórios', 'Ferramentas'];
  });
  const [categoria, setCategoria] = useState<string>('Equipamentos');

  // Mini-form para nova categoria
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Localizações cadastradas
  const [locations, setLocations] = useState<string[]>(() => {
    try {
      localStorage.removeItem('mcm_inventory_locations');
      const saved = localStorage.getItem(STORAGE_LOC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return ['Almoxarifado', 'Escritório', 'Com Colaborador', 'Obra'];
  });
  const [localizacao, setLocalizacao] = useState<string>('Almoxarifado');

  // Mini-form para nova localização
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  const isInitializedRef = useRef(false);
  const prevEqIdRef = useRef<string | null>(null);

  // Sincroniza o estado ao abrir ou mudar o equipamento editado
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      prevEqIdRef.current = null;
      return;
    }

    const currentEqId = editingEquipment?.id || null;
    const shouldInitialize = !isInitializedRef.current || currentEqId !== prevEqIdRef.current;

    if (shouldInitialize) {
      isInitializedRef.current = true;
      prevEqIdRef.current = currentEqId;

      if (editingEquipment) {
        const isTablet =
          editingEquipment.subcategoria === 'Tablet' ||
          (editingEquipment.categoria || '').toLowerCase().includes('tablet') ||
          COMPANY_TABLET_MODELS.some((m) =>
            (editingEquipment.nome || '').toLowerCase().includes(m.toLowerCase())
          );

        const isNotebook =
          editingEquipment.subcategoria === 'Notebook' ||
          (editingEquipment.categoria || '').toLowerCase().includes('notebook') ||
          (editingEquipment.nome || '').toLowerCase().includes('notebook');

        const isVivobox =
          editingEquipment.subcategoria === 'VIVOBOX' ||
          (editingEquipment.categoria || '').toLowerCase().includes('vivobox') ||
          (editingEquipment.categoria || '').toLowerCase().includes('vivo box') ||
          (editingEquipment.nome || '').toLowerCase().includes('vivobox');

        const isCelular =
          editingEquipment.subcategoria === 'Celular' ||
          (editingEquipment.categoria || '').toLowerCase().includes('celular') ||
          (editingEquipment.categoria || '').toLowerCase().includes('smartphone') ||
          (editingEquipment.nome || '').toLowerCase().includes('celular');

        let detectedType: EquipmentType = 'Outro';
        if (isNotebook) detectedType = 'Notebook';
        else if (isVivobox) detectedType = 'VIVOBOX';
        else if (isCelular) detectedType = 'Celular';
        else if (isTablet) detectedType = 'Tablet';

        setTipoEquipamento(detectedType);

        // Campos do Tablet
        const currentModel = editingEquipment.marcaModelo || editingEquipment.nome || '';
        setModeloTablet(currentModel);
        setIsCustomModel(currentModel !== '' && !COMPANY_TABLET_MODELS.includes(currentModel));
        setUsuarioTablet(editingEquipment.usuarioResponsavel || editingEquipment.responsavel || '');
        setAfTablet(editingEquipment.codigoPatrimonio || '');

        // Campos gerais
        setCodigoPatrimonio(editingEquipment.codigoPatrimonio || '');
        setNome(editingEquipment.nome || '');
        setStatus(editingEquipment.status || 'Ativado');
        setLocalizacao(editingEquipment.localizacao || 'Almoxarifado');

        const cat = editingEquipment.categoria || (detectedType !== 'Outro' ? detectedType : 'Equipamentos');
        if (cat) {
          setCategories((prev) => {
            if (!prev.includes(cat)) {
              const updated = [...prev, cat];
              try {
                localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(updated));
              } catch (e) {}
              return updated;
            }
            return prev;
          });
          setCategoria(cat);
          setIsCreatingCategory(false);
        }
      } else {
        // Novo Equipamento: padrão Tablet (ou Notebook conforme o primeiro da lista)
        setTipoEquipamento('Tablet');
        setModeloTablet('');
        setIsCustomModel(false);
        setUsuarioTablet('');
        setAfTablet('');
        setCodigoPatrimonio('');
        setNome('');
        setStatus('Ativado');
        setCategoria('Equipamentos');
        setLocalizacao('Almoxarifado');
        setIsCreatingCategory(false);
        setIsCreatingLocation(false);
      }

      setNewCategoryName('');
      setNewLocationName('');
    }
  }, [isOpen, editingEquipment?.id]);

  if (!isOpen) return null;

  // Adicionar Categoria via mini-form
  const handleAddNewCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      onToast('Digite o nome da nova categoria.', 'error');
      return;
    }

    let updated = [...categories];
    if (!categories.includes(trimmed)) {
      updated = [...categories, trimmed];
      setCategories(updated);
      try {
        localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(updated));
      } catch (e) {}
    }

    setCategoria(trimmed);
    setNewCategoryName('');
    setIsCreatingCategory(false);
    triggerHaptic('light');
    onToast(`Categoria "${trimmed}" salva com sucesso!`, 'success');
  };

  // Excluir Categoria
  const handleDeleteCategory = (catToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = categories.filter((c) => c !== catToDelete);
    setCategories(updated);
    try {
      localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(updated));
    } catch (e) {}
    if (categoria === catToDelete) {
      setCategoria(updated.length > 0 ? updated[0] : 'Equipamentos');
    }
    triggerHaptic('light');
    onToast(`Categoria "${catToDelete}" removida da lista.`, 'info');
  };

  // Adicionar Localização via mini-form
  const handleAddNewLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newLocationName.trim();
    if (!trimmed) {
      onToast('Digite o nome da nova localização.', 'error');
      return;
    }

    let updated = [...locations];
    if (!locations.includes(trimmed)) {
      updated = [...locations, trimmed];
      setLocations(updated);
      try {
        localStorage.setItem(STORAGE_LOC_KEY, JSON.stringify(updated));
      } catch (e) {}
    }

    setLocalizacao(trimmed);
    setNewLocationName('');
    setIsCreatingLocation(false);
    triggerHaptic('light');
    onToast(`Localização "${trimmed}" salva com sucesso!`, 'success');
  };

  // Excluir Localização
  const handleDeleteLocation = (locToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = locations.filter((l) => l !== locToDelete);
    setLocations(updated);
    try {
      localStorage.setItem(STORAGE_LOC_KEY, JSON.stringify(updated));
    } catch (e) {}
    if (localizacao === locToDelete) {
      setLocalizacao(updated.length > 0 ? updated[0] : '');
      if (updated.length === 0) setIsCreatingLocation(true);
    }
    triggerHaptic('light');
    onToast(`Localização "${locToDelete}" removida da lista.`, 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // =========================================================================
    // MODO TABLET: Valida APENAS Modelo, Usuário e AF (outros ocultos)
    // =========================================================================
    if (tipoEquipamento === 'Tablet') {
      const cleanModelo = modeloTablet.trim();
      const cleanUsuario = usuarioTablet.trim();
      const cleanAf = afTablet.trim();

      if (!cleanModelo) {
        onToast('Selecione ou informe o Modelo do Tablet.', 'error');
        return;
      }
      if (!cleanUsuario) {
        onToast('Informe o Usuário (Colaborador Responsável) do Tablet.', 'error');
        return;
      }
      if (!cleanAf) {
        onToast('Informe o Código AF do Tablet.', 'error');
        return;
      }

      const eqData: Equipment = {
        id: editingEquipment ? editingEquipment.id : 'eq-' + Math.random().toString(36).substring(2, 9),
        codigoPatrimonio: cleanAf.toUpperCase(),
        nome: cleanModelo,
        marcaModelo: cleanModelo,
        categoria: 'Equipamentos',
        subcategoria: 'Tablet',
        responsavel: cleanUsuario,
        usuarioResponsavel: cleanUsuario,
        localizacao: `Com ${cleanUsuario}`,
        status: editingEquipment?.status || 'Ativado',
      };

      triggerHaptic('medium');
      onSave(eqData);
      onToast(
        editingEquipment
          ? `Tablet ${eqData.codigoPatrimonio} atualizado com sucesso!`
          : `Tablet ${eqData.codigoPatrimonio} cadastrado no inventário!`,
        'success'
      );
      onClose();
      return;
    }

    // =========================================================================
    // OUTROS TIPOS: Notebook, VIVOBOX, Celular, Outro
    // =========================================================================
    if (!codigoPatrimonio.trim()) {
      onToast('Preencha o Código AF.', 'error');
      return;
    }
    if (!nome.trim()) {
      onToast('Preencha o Nome do Equipamento.', 'error');
      return;
    }

    let finalCategoria = tipoEquipamento;
    if (tipoEquipamento === 'Outro') {
      finalCategoria = categoria.trim();
      if (isCreatingCategory && newCategoryName.trim()) {
        finalCategoria = newCategoryName.trim();
        if (!categories.includes(finalCategoria)) {
          const updated = [...categories, finalCategoria];
          setCategories(updated);
          try {
            localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(updated));
          } catch (err) {}
        }
      }
      if (!finalCategoria) finalCategoria = 'Equipamentos';
    }

    let finalLocalizacao = localizacao.trim();
    if (isCreatingLocation && newLocationName.trim()) {
      finalLocalizacao = newLocationName.trim();
      if (!locations.includes(finalLocalizacao)) {
        const updated = [...locations, finalLocalizacao];
        setLocations(updated);
        try {
          localStorage.setItem(STORAGE_LOC_KEY, JSON.stringify(updated));
        } catch (err) {}
      }
    }

    const eqData: Equipment = {
      id: editingEquipment ? editingEquipment.id : 'eq-' + Math.random().toString(36).substring(2, 9),
      codigoPatrimonio: codigoPatrimonio.trim().toUpperCase(),
      nome: nome.trim(),
      categoria: finalCategoria,
      subcategoria: tipoEquipamento !== 'Outro' ? tipoEquipamento : undefined,
      localizacao: finalLocalizacao || 'Almoxarifado',
      status,
    };

    triggerHaptic('medium');
    onSave(eqData);
    onToast(
      editingEquipment
        ? `${tipoEquipamento} ${eqData.codigoPatrimonio} atualizado com sucesso!`
        : `${tipoEquipamento} ${eqData.codigoPatrimonio} cadastrado com sucesso!`,
      'success'
    );
    onClose();
  };

  // Helper de cores temáticas para os botões de tipo
  const getThemeDetails = (tipo: EquipmentType) => {
    switch (tipo) {
      case 'Notebook':
        return {
          icon: <Laptop className="w-4 h-4 text-blue-500 shrink-0" />,
          activeBtn: 'bg-white dark:bg-[#202532] text-blue-600 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-800/80 font-bold',
        };
      case 'VIVOBOX':
        return {
          icon: <Wifi className="w-4 h-4 text-purple-500 shrink-0" />,
          activeBtn: 'bg-white dark:bg-[#202532] text-purple-600 dark:text-purple-400 shadow-xs border border-purple-200/80 dark:border-purple-800/80 font-bold',
        };
      case 'Celular':
        return {
          icon: <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />,
          activeBtn: 'bg-white dark:bg-[#202532] text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-200/80 dark:border-emerald-800/80 font-bold',
        };
      case 'Tablet':
        return {
          icon: <Tablet className="w-4 h-4 text-orange-500 shrink-0" />,
          activeBtn: 'bg-white dark:bg-[#202532] text-orange-600 dark:text-orange-400 shadow-xs border border-orange-200/80 dark:border-orange-800/80 font-bold',
        };
      case 'Outro':
      default:
        return {
          icon: <Boxes className="w-4 h-4 text-slate-500 shrink-0" />,
          activeBtn: 'bg-white dark:bg-[#202532] text-slate-800 dark:text-slate-100 shadow-xs border border-slate-300 dark:border-slate-600 font-bold',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202532]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white shadow-md shrink-0 bg-blue-600">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>
                  {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tipoEquipamento === 'Tablet'
                  ? 'Campos essenciais do tablet: Modelo, Usuário e AF'
                  : 'Cadastro no inventário de equipamentos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4">
          {/* Único Controle: Abas com a Sequência Exata (notebook, VIVOBOX, celular, tablet, outro) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-blue-500" />
              Tipo de Equipamento *
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
              {EQUIPMENT_TYPES.map((tipo) => {
                const isSelected = tipoEquipamento === tipo;
                const itemTheme = getThemeDetails(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setTipoEquipamento(tipo);
                      triggerHaptic('light');
                    }}
                    className={`py-2 px-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? itemTheme.activeBtn
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                    }`}
                  >
                    {itemTheme.icon}
                    <span className="truncate">{tipo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RENDERIZAÇÃO CONDICIONAL                                                  */}
          {/* SE TABLET: APENAS MODELO, USUÁRIO E AF (TODOS OS OUTROS OCULTOS)          */}
          {/* ========================================================================= */}
          {tipoEquipamento === 'Tablet' ? (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              {/* 1. MODELO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tablet className="w-3.5 h-3.5 text-orange-500" />
                  Modelo *
                </label>

                <select
                  required
                  value={
                    isCustomModel
                      ? '__OUTRO__'
                      : COMPANY_TABLET_MODELS.includes(modeloTablet)
                      ? modeloTablet
                      : modeloTablet
                      ? '__OUTRO__'
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__OUTRO__') {
                      setIsCustomModel(true);
                      setModeloTablet('');
                    } else {
                      setIsCustomModel(false);
                      setModeloTablet(val);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
                >
                  <option value="">Selecione o modelo do tablet</option>
                  {COMPANY_TABLET_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                  <option value="__OUTRO__">+ Outro modelo...</option>
                </select>

                {isCustomModel && (
                  <div className="mt-2 animate-in fade-in">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={modeloTablet}
                      onChange={(e) => setModeloTablet(e.target.value)}
                      placeholder="Digite o modelo"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 font-semibold focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                    />
                  </div>
                )}
              </div>

              {/* 2. USUÁRIO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Usuário *
                </label>
                <input
                  type="text"
                  required
                  list="inventory-users-list"
                  value={usuarioTablet}
                  onChange={(e) => setUsuarioTablet(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
                />
                <datalist id="inventory-users-list">
                  {users.map((u, idx) => (
                    <option key={`usr-opt-${idx}`} value={u.nome} />
                  ))}
                </datalist>
              </div>

              {/* 3. AF */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  AF *
                </label>
                <input
                  type="text"
                  required
                  value={afTablet}
                  onChange={(e) => setAfTablet(e.target.value)}
                  placeholder="Código AF"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 font-mono font-black focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
                />
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* QUANDO NOTEBOOK, VIVOBOX, CELULAR OU OUTRO                                */
            /* ========================================================================= */
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              {/* 1. AF (Código AF) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                  AF (Código AF) *
                </label>
                <input
                  type="text"
                  required
                  value={codigoPatrimonio}
                  onChange={(e) => setCodigoPatrimonio(e.target.value)}
                  placeholder="Código AF"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
                />
              </div>

              {/* 2. Nome / Modelo do Equipamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                  Nome / Modelo do Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome ou modelo do equipamento"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
                />
              </div>

              {/* 3. Categoria (Apenas quando selecionado 'Outro') */}
              {tipoEquipamento === 'Outro' && (
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Categoria *
                    </label>
                    {!isCreatingCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCategory(true);
                          setNewCategoryName('');
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Criar Categoria
                      </button>
                    )}
                  </div>

                  {isCreatingCategory || categories.length === 0 ? (
                    <div className="flex flex-col gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in">
                      <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                        {categories.length === 0
                          ? 'Nenhuma categoria cadastrada. Crie a primeira:'
                          : 'Criar e salvar nova categoria:'}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus={isCreatingCategory}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nome da categoria"
                          className="flex-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:ring-2 focus:ring-blue-500 min-h-[38px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewCategory()}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[38px] flex items-center gap-1 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" /> Salvar
                        </button>
                        {categories.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsCreatingCategory(false)}
                            className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] shrink-0"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={categoria}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setIsCreatingCategory(true);
                            setNewCategoryName('');
                          } else {
                            setCategoria(e.target.value);
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__NEW__" className="text-blue-600 font-bold">
                          + Criar nova categoria...
                        </option>
                      </select>
                      {categoria && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCategory(categoria, e)}
                          title={`Excluir categoria "${categoria}" da lista`}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Localização */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    Localização *
                  </label>
                  {!isCreatingLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingLocation(true);
                        setNewLocationName('');
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Criar Localização
                    </button>
                  )}
                </div>

                {isCreatingLocation || locations.length === 0 ? (
                  <div className="flex flex-col gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in">
                    <span className="text-[11px] font-semibold text-red-800 dark:text-red-300">
                      {locations.length === 0
                        ? 'Nenhuma localização cadastrada. Crie a primeira:'
                        : 'Criar e salvar nova localização:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus={isCreatingLocation}
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="Nome da localização"
                        className="flex-1 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:ring-2 focus:ring-red-500 min-h-[38px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewLocation();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewLocation()}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[38px] flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar
                      </button>
                      {locations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCreatingLocation(false)}
                          className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] shrink-0"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={localizacao}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingLocation(true);
                          setNewLocationName('');
                        } else {
                          setLocalizacao(e.target.value);
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                      <option value="__NEW__" className="text-red-600 font-bold">
                        + Criar nova localização...
                      </option>
                    </select>
                    {localizacao && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLocation(localizacao, e)}
                        title={`Excluir localização "${localizacao}" da lista`}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 font-semibold focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  <option value="Ativado">Ativado</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Desativado">Desativado</option>
                </select>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center min-h-[44px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer min-h-[44px] ${
                tipoEquipamento === 'Tablet'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : tipoEquipamento === 'Notebook'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : tipoEquipamento === 'VIVOBOX'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : tipoEquipamento === 'Celular'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {editingEquipment
                  ? 'Salvar Equipamento'
                  : 'Cadastrar Equipamento'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

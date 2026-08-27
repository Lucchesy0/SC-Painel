import React, { useState, useEffect } from 'react';
import { X, Save, Boxes, Tag, MapPin, Plus, Check, Trash2, AlertCircle } from 'lucide-react';
import { Equipment, EquipmentStatus } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface EquipmentModalProps {
  isOpen: boolean;
  editingEquipment: Equipment | null;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Clean initial empty state - No hardcoded preset options!
const STORAGE_CAT_KEY = 'mcm_inventory_custom_categories_v2';
const STORAGE_LOC_KEY = 'mcm_inventory_custom_locations_v2';

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  editingEquipment,
  onClose,
  onSave,
  onToast,
}) => {
  const [codigoPatrimonio, setCodigoPatrimonio] = useState('');
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Ativado');

  // Categories list (purely user-created)
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      // Purge old legacy keys
      localStorage.removeItem('mcm_inventory_categories');
      const saved = localStorage.getItem(STORAGE_CAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [categoria, setCategoria] = useState<string>('');

  // Mini-form for new category
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Locations list (purely user-created)
  const [locations, setLocations] = useState<string[]>(() => {
    try {
      // Purge old legacy keys
      localStorage.removeItem('mcm_inventory_locations');
      const saved = localStorage.getItem(STORAGE_LOC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [localizacao, setLocalizacao] = useState<string>('');

  // Mini-form for new location
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Sync state on open/edit
  useEffect(() => {
    if (isOpen) {
      // Clean legacy defaults from previous sessions
      try {
        localStorage.removeItem('mcm_inventory_categories');
        localStorage.removeItem('mcm_inventory_locations');
      } catch (e) {}

      if (editingEquipment) {
        setCodigoPatrimonio(editingEquipment.codigoPatrimonio || '');
        setNome(editingEquipment.nome || '');
        setStatus(editingEquipment.status || 'Ativado');

        // Ensure category is in list if it has one
        const cat = editingEquipment.categoria || '';
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
        } else if (categories.length === 0) {
          setIsCreatingCategory(true);
        }

        // Ensure location is in list if it has one
        const loc = editingEquipment.localizacao || '';
        if (loc) {
          setLocations((prev) => {
            if (!prev.includes(loc)) {
              const updated = [...prev, loc];
              try {
                localStorage.setItem(STORAGE_LOC_KEY, JSON.stringify(updated));
              } catch (e) {}
              return updated;
            }
            return prev;
          });
          setLocalizacao(loc);
          setIsCreatingLocation(false);
        } else if (locations.length === 0) {
          setIsCreatingLocation(true);
        }
      } else {
        // ALWAYS BLANK for new equipment
        setCodigoPatrimonio('');
        setNome('');
        setStatus('Ativado');

        if (categories.length > 0) {
          setCategoria(categories[0]);
          setIsCreatingCategory(false);
        } else {
          setCategoria('');
          setIsCreatingCategory(true); // Open mini-form immediately so user can type first category
        }

        if (locations.length > 0) {
          setLocalizacao(locations[0]);
          setIsCreatingLocation(false);
        } else {
          setLocalizacao('');
          setIsCreatingLocation(true); // Open mini-form immediately so user can type first location
        }
      }

      setNewCategoryName('');
      setNewLocationName('');
    }
  }, [isOpen, editingEquipment]);

  if (!isOpen) return null;

  // Add new Category via mini-form
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

  // Remove individual Category
  const handleDeleteCategory = (catToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = categories.filter((c) => c !== catToDelete);
    setCategories(updated);
    try {
      localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(updated));
    } catch (e) {}
    if (categoria === catToDelete) {
      setCategoria(updated.length > 0 ? updated[0] : '');
      if (updated.length === 0) setIsCreatingCategory(true);
    }
    triggerHaptic('light');
    onToast(`Categoria "${catToDelete}" removida da lista.`, 'info');
  };

  // Add new Location via mini-form
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

  // Remove individual Location
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

    if (!codigoPatrimonio.trim()) {
      onToast('Preencha o Código AF.', 'error');
      return;
    }
    if (!nome.trim()) {
      onToast('Preencha o Nome do Equipamento.', 'error');
      return;
    }

    // Auto-save category if user typed in mini-form but forgot to click salvar
    let finalCategoria = categoria.trim();
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

    if (!finalCategoria) {
      onToast('Informe ou crie uma Categoria para o equipamento.', 'error');
      setIsCreatingCategory(true);
      return;
    }

    // Auto-save location if user typed in mini-form but forgot to click salvar
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

    if (!finalLocalizacao) {
      onToast('Informe ou crie uma Localização para o equipamento.', 'error');
      setIsCreatingLocation(true);
      return;
    }

    const eqData: Equipment = {
      id: editingEquipment ? editingEquipment.id : 'eq-' + Math.random().toString(36).substring(2, 9),
      codigoPatrimonio: codigoPatrimonio.trim().toUpperCase(),
      nome: nome.trim(),
      categoria: finalCategoria,
      localizacao: finalLocalizacao,
      status,
    };

    triggerHaptic('medium');
    onSave(eqData);
    onToast(
      editingEquipment
        ? `Equipamento ${eqData.codigoPatrimonio} atualizado com sucesso!`
        : `Equipamento ${eqData.codigoPatrimonio} cadastrado com sucesso!`,
      'success'
    );
    onClose();
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
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastro direto e simplificado de patrimônio
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

        {/* Form Body - APENAS OS CAMPOS SOLICITADOS */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4">
          {/* 1. AF (Código AF) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              AF (Código AF) *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={codigoPatrimonio}
              onChange={(e) => setCodigoPatrimonio(e.target.value)}
              placeholder="Ex: AF-001, AF-2026-05, 10420..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
            />
          </div>

          {/* 2. Nome do Equipamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-500" />
              Nome do Equipamento *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Notebook Dell Latitude, Switch Cisco 24P, Nobreak..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm p-3 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
            />
          </div>

          {/* 3. Categoria (com mini-form para criar uma a uma do zero) */}
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
                    placeholder="Nome da categoria (ex: Notebooks, Switches...)"
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
                    ➕ + Criar nova categoria...
                  </option>
                </select>
                {categoria && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCategory(categoria, e)}
                    title={`Excluir categoria "${categoria}" da lista de opções`}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. Localização (com mini-form para criar uma a uma do zero) */}
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
                    placeholder="Nome da localização (ex: Rack 02, CPD Bloco B...)"
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
                    ➕ + Criar nova localização...
                  </option>
                </select>
                {localizacao && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteLocation(localizacao, e)}
                    title={`Excluir localização "${localizacao}" da lista de opções`}
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
              <option value="Ativado">🟢 Ativado</option>
              <option value="Manutenção">🟡 Manutenção</option>
              <option value="Desativado">🔴 Desativado</option>
            </select>
          </div>

          {/* Actions */}
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
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{editingEquipment ? 'Salvar Alterações' : 'Cadastrar Equipamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

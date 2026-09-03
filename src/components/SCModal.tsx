import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  User,
  MessageSquare,
  Calendar,
  Layers,
  ChevronDown,
  Check,
  Search,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import { SC, SCItem, SCStatus, SCTipo, UserProfile } from '../types';

interface SCModalProps {
  isOpen: boolean;
  editingSC: SC | null;
  users?: UserProfile[];
  currentUser?: UserProfile;
  onClose: () => void;
  onSave: (scData: Omit<SC, 'id'>, id?: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SCModal: React.FC<SCModalProps> = ({
  isOpen,
  editingSC,
  users = [],
  currentUser,
  onClose,
  onSave,
  onToast,
}) => {
  // Main SC fields
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [tipo, setTipo] = useState<SCTipo>('Item');
  const [status, setStatus] = useState<SCStatus>('Em andamento');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<SCItem[]>([]);

  // Profile Selector Dropdown State
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Item form state
  const [itemDesc, setItemDesc] = useState('');
  const [itemQtd, setItemQtd] = useState<number>(1);
  const [itemUni, setItemUni] = useState('UN');
  const [itemValor, setItemValor] = useState<string>('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Requester choices ONLY from created user profiles (excluding kiosk)
  const profileRequesters = useMemo(() => {
    const validProfiles = (users || []).filter(
      (u) => u.role !== 'kiosk' && !u.isKiosk && u.nome && u.nome.trim() !== ''
    );

    return validProfiles.map((u) => ({
      id: u.id,
      name: u.nome,
      cargo: u.cargo || u.departamento || 'Colaborador',
      departamento: u.departamento,
      avatarColor: u.avatarColor || 'bg-slate-700',
    }));
  }, [users]);

  // Find currently selected profile object for the visual card
  const selectedProfile = useMemo(() => {
    if (!solicitante) return null;
    return (
      profileRequesters.find(
        (p) =>
          p.name.toLowerCase() === solicitante.toLowerCase() ||
          solicitante.toLowerCase().includes(p.name.toLowerCase())
      ) || {
        id: 'custom',
        name: solicitante,
        cargo: 'Solicitante Registrado',
        departamento: '',
        avatarColor: 'bg-slate-700',
      }
    );
  }, [solicitante, profileRequesters]);

  // Filtered profiles for search
  const filteredProfiles = useMemo(() => {
    if (!profileSearchQuery.trim()) return profileRequesters;
    const q = profileSearchQuery.toLowerCase();
    return profileRequesters.filter(
      (p) => p.name.toLowerCase().includes(q) || p.cargo.toLowerCase().includes(q)
    );
  }, [profileRequesters, profileSearchQuery]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingSC) {
        setNumero(editingSC.numero || '');
        setData(editingSC.data || new Date().toISOString().split('T')[0]);
        setSolicitante(editingSC.solicitante || '');
        setTipo(editingSC.tipo || 'Item');
        setStatus(editingSC.status || 'Em andamento');
        setObservacoes(editingSC.observacoes || editingSC.comentarios || '');
        setItens(
          editingSC.itens
            ? editingSC.itens.map((it) => ({
                ...it,
                quantidadeSolicitada: it.quantidadeSolicitada ?? it.quantidade ?? 1,
              }))
            : []
        );
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setNumero('');
        setData(todayStr);
        setTipo('Item');
        setStatus('Em andamento');
        setObservacoes('');
        setItens([]);

        // Default to current logged-in profile if valid, otherwise first available profile
        if (currentUser && currentUser.role !== 'kiosk' && !currentUser.isKiosk && currentUser.nome) {
          setSolicitante(currentUser.nome);
        } else if (profileRequesters.length > 0) {
          setSolicitante(profileRequesters[0].name);
        } else {
          setSolicitante('Luchesy (Admin)');
        }
      }

      // Reset item inputs & dropdown
      setItemDesc('');
      setItemQtd(1);
      setItemUni('UN');
      setItemValor('');
      setEditingItemIndex(null);
      setIsProfileDropdownOpen(false);
      setProfileSearchQuery('');
    }
  }, [isOpen, editingSC, currentUser, profileRequesters]);

  if (!isOpen) return null;

  const handleEditItem = (index: number) => {
    const it = itens[index];
    if (!it) return;
    setEditingItemIndex(index);
    setItemDesc(it.descricao);
    setItemQtd(it.quantidadeSolicitada ?? it.quantidade ?? 1);
    setItemUni(it.unidade || 'UN');
    setItemValor(it.valorUnitario ? String(it.valorUnitario).replace('.', ',') : '');
    onToast(`Editando item #${index + 1}. Modifique os campos e clique em Salvar Alterações.`, 'info');
  };

  const handleCancelEditItem = () => {
    setEditingItemIndex(null);
    setItemDesc('');
    setItemQtd(1);
    setItemUni('UN');
    setItemValor('');
  };

  const handleAddItem = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();

    if (!itemDesc.trim()) {
      onToast('Informe a descrição do produto antes de salvar.', 'error');
      return;
    }

    const qtdSol = itemQtd > 0 ? itemQtd : 1;
    const valUnit = itemValor ? parseFloat(itemValor.replace(',', '.')) : undefined;

    // Se estiver editando um item existente na lista
    if (editingItemIndex !== null) {
      setItens((prev) =>
        prev.map((item, idx) => {
          if (idx === editingItemIndex) {
            return {
              ...item,
              descricao: itemDesc.trim(),
              quantidade: qtdSol,
              quantidadeSolicitada: qtdSol,
              unidade: itemUni.trim().toUpperCase() || 'UN',
              destino: item.destino || 'CEQ / Obra',
              valorUnitario: valUnit && !isNaN(valUnit) && valUnit > 0 ? valUnit : undefined,
            };
          }
          return item;
        })
      );
      setEditingItemIndex(null);
      setItemDesc('');
      setItemQtd(1);
      setItemUni('UN');
      setItemValor('');
      onToast('Item atualizado com sucesso!', 'success');
      return;
    }

    const newItem: SCItem = {
      id: 'itm-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      descricao: itemDesc.trim(),
      quantidade: qtdSol,
      quantidadeSolicitada: qtdSol,
      unidade: itemUni.trim().toUpperCase() || 'UN',
      destino: 'CEQ / Obra',
      ...(valUnit && !isNaN(valUnit) && valUnit > 0 ? { valorUnitario: valUnit } : {}),
    };

    setItens((prev) => [...prev, newItem]);
    setItemDesc('');
    setItemQtd(1);
    setItemUni('UN');
    setItemValor('');
    onToast('Item incluído na lista!', 'success');
  };

  const handleRemoveItem = (index: number) => {
    if (editingItemIndex === index) {
      handleCancelEditItem();
    } else if (editingItemIndex !== null && editingItemIndex > index) {
      setEditingItemIndex(editingItemIndex - 1);
    }
    setItens((prev) => prev.filter((_, i) => i !== index));
    onToast('Item removido da lista.', 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!numero.trim()) {
      onToast('Informe o Número da Solicitação.', 'error');
      return;
    }
    if (!solicitante.trim()) {
      onToast('Selecione o Solicitante (perfil de usuário).', 'error');
      return;
    }

    // Auto-inclui o item pendente caso o usuário tenha preenchido os campos e clicado em Salvar direto
    let finalItens = [...itens];
    if (itemDesc.trim()) {
      const qtdSol = itemQtd > 0 ? itemQtd : 1;
      const valUnit = itemValor ? parseFloat(itemValor.replace(',', '.')) : undefined;
      const autoItem: SCItem = {
        id: 'itm-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        descricao: itemDesc.trim(),
        quantidade: qtdSol,
        quantidadeSolicitada: qtdSol,
        unidade: itemUni.trim().toUpperCase() || 'UN',
        destino: 'CEQ / Obra',
        ...(valUnit && !isNaN(valUnit) && valUnit > 0 ? { valorUnitario: valUnit } : {}),
      };
      finalItens.push(autoItem);
    }

    const payload: Omit<SC, 'id'> = {
      numero: numero.trim(),
      data: data || new Date().toISOString().split('T')[0],
      solicitante: solicitante.trim(),
      tipo,
      origem: tipo === 'Item' ? 'Estoque - Reposição' : 'Manual - Consumo',
      status,
      itens: finalItens,
      ...(observacoes.trim() ? { observacoes: observacoes.trim(), comentarios: observacoes.trim() } : {}),
    };

    onSave(payload, editingSC?.id);
  };

  const totalEstimado = itens.reduce((acc, it) => {
    if (it.valorUnitario) {
      return acc + it.valorUnitario * (it.quantidadeSolicitada ?? it.quantidade ?? 1);
    }
    return acc;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      {/* Main Modal Card */}
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white dark:bg-[#1e2330] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Fixo */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#161b26]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100" id="modalTitle">
                {editingSC ? `Editar Solicitação #${editingSC.numero}` : 'Nova Solicitação de Compra'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Preencha os dados e adicione os itens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body com Rolagem Fluida e Completa */}
        <form
          id="form-sc"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
        >
          {/* Informações Principais da SC */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 dark:bg-[#181d28] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Número da Solicitação */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número da SC *
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 26015"
                required
                autoFocus
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>

            {/* Data de Emissão */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Data *</span>
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-medium"
              />
            </div>

            {/* Solicitante (Custom Profile Selector matching Image 2) */}
            <div className="sm:col-span-6" ref={profileDropdownRef}>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-orange-500" />
                <span>Solicitante (Perfil de Usuário) *</span>
              </label>

              <div className="relative">
                {/* Profile Pill Trigger Button */}
                <button
                  type="button"
                  id="btnSelectSolicitantePerfil"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`w-full flex items-center justify-between p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer text-left bg-white dark:bg-slate-900 shadow-2xs ${
                    isProfileDropdownOpen
                      ? 'border-orange-500 ring-2 ring-orange-500/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar Icon with Online Green Dot */}
                    <div
                      className={`w-7.5 h-7.5 rounded-lg ${
                        selectedProfile?.avatarColor || 'bg-slate-800'
                      } text-white flex items-center justify-center font-bold text-xs shrink-0 relative shadow-2xs`}
                    >
                      {selectedProfile?.name ? selectedProfile.name.charAt(0).toUpperCase() : 'U'}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-500" />
                    </div>

                    {/* Name and Role Subtitle */}
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {selectedProfile?.name || 'Selecione o perfil...'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {selectedProfile?.cargo || 'Colaborador'}
                      </span>
                    </div>
                  </div>

                  {/* Chevron Icon */}
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-150 ${
                      isProfileDropdownOpen ? 'rotate-180 text-orange-500' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu with Search and User Cards */}
                {isProfileDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-64 flex flex-col">
                    {profileRequesters.length > 4 && (
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={profileSearchQuery}
                            onChange={(e) => setProfileSearchQuery(e.target.value)}
                            placeholder="Buscar perfil..."
                            autoFocus
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredProfiles.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Nenhum perfil encontrado
                        </div>
                      ) : (
                        filteredProfiles.map((prof) => {
                          const isSelected =
                            solicitante === prof.name ||
                            solicitante.toLowerCase() === prof.name.toLowerCase();

                          return (
                            <button
                              key={prof.id}
                              type="button"
                              onClick={() => {
                                setSolicitante(prof.name);
                                setIsProfileDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer pt-1.5 ${
                                isSelected
                                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg ${
                                    prof.avatarColor || 'bg-slate-700'
                                  } text-white flex items-center justify-center font-bold text-xs shrink-0 relative`}
                                >
                                  {prof.name.charAt(0).toUpperCase()}
                                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-500" />
                                </div>
                                <div className="flex flex-col min-w-0 leading-tight">
                                  <span className="text-xs font-bold truncate">{prof.name}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {prof.cargo}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tipo */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Tipo</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as SCTipo)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-semibold"
              >
                <option value="Item">Item / Produto</option>
                <option value="Serviço / Assistência">Serviço / Assistência</option>
              </select>
            </div>

            {/* Status */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SCStatus)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-bold"
              >
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>

            {/* Comentário / Observações Opcionais */}
            <div className="sm:col-span-12">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-orange-500" />
                <span>Comentário / Observações (opcional)</span>
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Insira detalhes adicionais, justificativa ou marca desejada..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Seção de Itens & Produtos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                  <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  Itens da Solicitação
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              {totalEstimado > 0 && (
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  Total: R$ {totalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Barra de Inserção / Edição de Item */}
            <div className={`p-3 rounded-xl border transition-all ${
              editingItemIndex !== null
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-xs'
                : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50'
            }`}>
              {editingItemIndex !== null && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200 dark:border-amber-800/60 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                    Editando Item #{editingItemIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEditItem}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Cancelar Edição
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                    Descrição do Produto / Equipamento *
                  </label>
                  <input
                    type="text"
                    id="inputItemDescricao"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    placeholder="Ex: Monitor 24 Polegadas LED, Notebook i5..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 sm:col-span-4 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5 text-center">
                      Qtd *
                    </label>
                    <input
                      type="number"
                      min={1}
                      id="inputItemQtd"
                      value={itemQtd}
                      onChange={(e) => setItemQtd(parseInt(e.target.value) || 1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold text-center p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5 text-center">
                      Unid
                    </label>
                    <input
                      type="text"
                      id="inputItemUnidade"
                      value={itemUni}
                      onChange={(e) => setItemUni(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                      placeholder="UN"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold uppercase text-center p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5 text-right">
                      Valor Unit.
                    </label>
                    <input
                      type="text"
                      id="inputItemValor"
                      value={itemValor}
                      onChange={(e) => setItemValor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                      placeholder="R$ (opc)"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs text-right p-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    id="btnAdicionarItemLista"
                    className={`w-full py-2 px-3 rounded-lg text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 ${
                      editingItemIndex !== null
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#ff5500] hover:bg-[#e04b00]'
                    }`}
                  >
                    {editingItemIndex !== null ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Salvar</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Itens Adicionados */}
            {itens.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nenhum item adicionado ainda.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Informe a descrição acima e clique em <strong>Adicionar</strong>.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                {/* Visualização Desktop */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center text-slate-400">#</th>
                        <th className="py-2.5 px-3">Descrição do Produto</th>
                        <th className="py-2.5 px-3 text-center w-24">Qtd</th>
                        <th className="py-2.5 px-3 text-right w-28">Valor Unit.</th>
                        <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                        <th className="py-2.5 px-3 text-center w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {itens.map((item, idx) => {
                        const requested = item.quantidadeSolicitada ?? item.quantidade ?? 1;
                        const subtotal = item.valorUnitario ? item.valorUnitario * requested : undefined;
                        const isEditingThis = editingItemIndex === idx;

                        return (
                          <tr
                            key={item.id || idx}
                            className={`transition ${
                              isEditingThis
                                ? 'bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-400'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block break-words">
                                {item.descricao}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold text-xs">
                                {requested} {item.unidade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 text-xs">
                              {item.valorUnitario
                                ? `R$ ${item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {subtotal
                                ? `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItem(idx)}
                                  title="Editar item"
                                  className={`p-1 rounded transition cursor-pointer ${
                                    isEditingThis
                                      ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40'
                                      : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                                  }`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  title="Remover item"
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visualização Mobile */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {itens.map((item, idx) => {
                    const requested = item.quantidadeSolicitada ?? item.quantidade ?? 1;
                    const subtotal = item.valorUnitario ? item.valorUnitario * requested : undefined;
                    const isEditingThis = editingItemIndex === idx;

                    return (
                      <div
                        key={item.id || idx}
                        className={`p-3 flex items-start justify-between gap-2.5 transition ${
                          isEditingThis
                            ? 'bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-400'
                            : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 break-words">
                              {item.descricao}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold text-[11px]">
                              {requested} {item.unidade}
                            </span>
                            {subtotal && (
                              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditItem(idx)}
                            aria-label="Editar item"
                            className="p-1.5 text-slate-400 hover:text-orange-600 rounded cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4 text-orange-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            aria-label="Remover item"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Rodapé Fixo e Visível */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-[#161b26] px-5 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {itens.length > 0 ? (
              <span><strong>{itens.length}</strong> item(ns) na lista</span>
            ) : (
              <span>Nenhum item na lista</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              form="form-sc"
              type="submit"
              id="btnSalvarSolicitacaoModal"
              className="px-5 py-2 text-xs font-black rounded-xl bg-[#ff5500] hover:bg-[#e04b00] text-white transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
            >
              Salvar Solicitação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

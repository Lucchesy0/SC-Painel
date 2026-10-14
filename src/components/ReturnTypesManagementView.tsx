import React, { useState } from 'react';
import { Plus, Edit2, Trash2, RotateCcw, Check, Sparkles, FileText, ArrowRight, Layers, HelpCircle, X } from 'lucide-react';
import { ReturnTypeDefinition, UserProfile } from '../types';
import { returnTypesService } from '../services/returnTypesService';
import { triggerHaptic } from '../utils/haptics';

interface ReturnTypesManagementViewProps {
  returnTypes: ReturnTypeDefinition[];
  currentUser: UserProfile;
  onSelectTypeForNewTerm?: (typeId: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const POPULAR_ICONS = ['💻', '📱', '📡', '🖥️', '🖨️', '🎧', '🔋', '⌨️', '📦', '📻', '🛠️', '🧭', '🔌', '📷', '⏱️'];

export const ReturnTypesManagementView: React.FC<ReturnTypesManagementViewProps> = ({
  returnTypes,
  currentUser,
  onSelectTypeForNewTerm,
  onToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ReturnTypeDefinition | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('📦');
  const [formDesc, setFormDesc] = useState('');
  const [formTemplate, setFormTemplate] = useState('');
  const [formObs, setFormObs] = useState('Com carregador.');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingType(null);
    setFormName('');
    setFormIcon('📦');
    setFormDesc('');
    setFormTemplate('Novo Equipamento\nModelo: XXXX\nMarca: XXXX\nAF: XXXX');
    setFormObs('Com carregador.');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (typeDef: ReturnTypeDefinition) => {
    triggerHaptic('light');
    setEditingType(typeDef);
    setFormName(typeDef.nome);
    setFormIcon(typeDef.icone || '📦');
    setFormDesc(typeDef.descricao || '');
    setFormTemplate(typeDef.templatePadrao || '');
    setFormObs(typeDef.observacaoPadrao || 'Com carregador.');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onToast('Informe o nome do tipo de devolução.', 'error');
      return;
    }
    if (!formTemplate.trim()) {
      onToast('Informe o template de preenchimento padrão.', 'error');
      return;
    }

    const itemToSave: ReturnTypeDefinition = {
      id: editingType ? editingType.id : formName.trim(),
      nome: formName.trim(),
      icone: formIcon.trim() || '📦',
      descricao: formDesc.trim() || `Devolução de ${formName.trim()}`,
      templatePadrao: formTemplate.trim(),
      observacaoPadrao: formObs.trim() || 'Com carregador.',
      isDefault: editingType?.isDefault || false,
      createdAt: editingType?.createdAt,
    };

    try {
      await returnTypesService.saveReturnType(itemToSave);
      triggerHaptic('success');
      onToast(`Tipo "${itemToSave.nome}" salvo com sucesso!`, 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      onToast('Erro ao salvar o tipo de devolução.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await returnTypesService.deleteReturnType(id);
      triggerHaptic('medium');
      onToast('Tipo de devolução removido com sucesso.', 'info');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      onToast('Erro ao remover o tipo de devolução.', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Deseja restaurar os 6 tipos oficiais de devolução padrão do sistema?')) {
      try {
        await returnTypesService.resetToDefaults();
        triggerHaptic('success');
        onToast('Tipos oficiais de devolução restaurados com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        onToast('Erro ao restaurar padrões.', 'error');
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Banner Superior da Sub-Seção */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            Configuração de Devoluções · RG.TI.004
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Gerenciamento de Tipos de Devolução
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Cadastre e personalize os tipos de equipamentos devolvidos. Ao gerar um novo termo de devolução, o tipo selecionado preencherá automaticamente o template e as regras oficiais no documento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            title="Restaurar os 6 tipos originais de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-gradient-to-r from-[#f25c27] to-[#e04510] hover:from-[#e04510] hover:to-[#c83907] text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Tipo de Devolução</span>
          </button>
        </div>
      </div>

      {/* Grid de Tipos Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {returnTypes.map((typeItem, index) => (
          <div
            key={typeItem.id || index}
            className="bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3.5">
              {/* Topo do Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 select-none">
                    {typeItem.icone || '📦'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                        {typeItem.nome}
                      </h3>
                      {typeItem.isDefault && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Oficial
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {typeItem.descricao}
                    </p>
                  </div>
                </div>

                {/* Ações de Edição e Exclusão */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(typeItem)}
                    className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition cursor-pointer"
                    title="Editar Tipo"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(typeItem.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                    title="Excluir Tipo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Template Preview Monospace Box */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Template Padrão RG.TI.004</span>
                  <span className="text-[10px] text-slate-400">
                    {typeItem.templatePadrao?.split('\n').length || 1} linhas
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed select-text">
                  {typeItem.templatePadrao}
                </div>
              </div>

              {/* Observação Padrão */}
              {typeItem.observacaoPadrao && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Obs. Padrão:</span>
                  <span className="italic truncate">{typeItem.observacaoPadrao}</span>
                </div>
              )}
            </div>

            {/* Ação rápida: Criar Termo com este Tipo */}
            {onSelectTypeForNewTerm && (
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Disponível no formulário</span>
                <button
                  type="button"
                  onClick={() => onSelectTypeForNewTerm(typeItem.nome)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1 transition cursor-pointer hover:underline"
                >
                  <span>Gerar Termo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{formIcon}</span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingType ? 'Editar Tipo de Devolução' : 'Cadastrar Novo Tipo de Devolução'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configuração do template oficial RG.TI.004
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs sm:text-sm">
              {/* Nome do Tipo */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Nome do Tipo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Tablet, Monitor, Rádio Comunicador..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              {/* Seletor de Ícone / Emoji */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Ícone / Emoji Representativo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-16 text-center text-xl py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                  <div className="flex flex-wrap gap-1.5 flex-1 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 max-h-20 overflow-y-auto">
                    {POPULAR_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormIcon(emoji)}
                        className={`text-lg p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer select-none ${
                          formIcon === emoji ? 'bg-orange-100 dark:bg-orange-950/60 ring-1 ring-orange-500' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descrição Curta */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Descrição Curta
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ex: Devolução de Tablet corporativo e caneta S-Pen"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              {/* Template Padrão RG.TI.004 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Template Padrão dos Detalhes <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Inserido automaticamente</span>
                </div>
                <textarea
                  rows={5}
                  required
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  placeholder="Ex:&#10;Tablet&#10;Modelo: Galaxy Tab A9&#10;AF: 40120&#10;Imei Celular: 358.302..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 leading-tight">
                  Este texto será preenchido no campo <strong>Detalhes da Devolução</strong> ao selecionar este tipo no modal.
                </p>
              </div>

              {/* Observação Padrão */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Observação Padrão Sugerida
                </label>
                <input
                  type="text"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Ex: Com carregador."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              {/* Botoes de Acao */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#f25c27] to-[#e04510] hover:from-[#e04510] hover:to-[#c83907] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Excluir Tipo de Devolução?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tem certeza que deseja remover este tipo? Termos já gerados não serão afetados, mas este tipo não aparecerá mais como opção para novos termos.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

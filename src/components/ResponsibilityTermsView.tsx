import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Laptop,
  CheckCircle2,
  Calendar,
  Building2,
  Copy,
  Sparkles,
  Download,
  Shield,
  Clock,
} from 'lucide-react';
import { ResponsibilityTerm, Equipment, UserProfile } from '../types';
import { formatDateBR } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';
import { ResponsibilityTermModal } from './ResponsibilityTermModal';
import { ResponsibilityTermPrintView } from './ResponsibilityTermPrintView';

interface ResponsibilityTermsViewProps {
  terms: ResponsibilityTerm[];
  equipments: Equipment[];
  users: UserProfile[];
  currentUser: UserProfile;
  onSaveTerm: (term: ResponsibilityTerm) => Promise<void>;
  onDeleteTerm: (id: string) => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ResponsibilityTermsView: React.FC<ResponsibilityTermsViewProps> = ({
  terms,
  equipments,
  users,
  currentUser,
  onSaveTerm,
  onDeleteTerm,
  onToast,
}) => {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ResponsibilityTerm | null>(null);
  const [printTerm, setPrintTerm] = useState<ResponsibilityTerm | null>(null);
  const [termToDelete, setTermToDelete] = useState<ResponsibilityTerm | null>(null);

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchColab = (term.colaboradorNome || '').toLowerCase().includes(query);
        const matchModelo = (term.modelo || '').toLowerCase().includes(query);
        const matchAf = (term.af || term.numeroTermo || '').toLowerCase().includes(query);
        const matchCC = (term.centroCusto || '').toLowerCase().includes(query);
        const matchProc = (term.processador || '').toLowerCase().includes(query);

        return matchColab || matchModelo || matchAf || matchCC || matchProc;
      }
      return true;
    });
  }, [terms, searchQuery]);

  // Open modal to create a new term
  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingTerm(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing term
  const handleOpenEdit = (term: ResponsibilityTerm) => {
    triggerHaptic('light');
    setEditingTerm(term);
    setIsModalOpen(true);
  };

  // Duplicate a term as template
  const handleDuplicate = (term: ResponsibilityTerm) => {
    triggerHaptic('light');
    const duplicated: ResponsibilityTerm = {
      ...term,
      id: '',
      colaboradorNome: '', // Prompt new name
      af: '',
      numeroTermo: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingTerm(duplicated);
    setIsModalOpen(true);
    onToast('Configurações do aparelho copiadas! Informe o novo colaborador e AF.', 'info');
  };

  // Save handler from modal
  const handleSaveModal = async (termToSave: ResponsibilityTerm, shouldPrintImmediately?: boolean) => {
    await onSaveTerm(termToSave);
    if (shouldPrintImmediately) {
      setPrintTerm(termToSave);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!termToDelete) return;
    triggerHaptic('medium');
    await onDeleteTerm(termToDelete.id);
    setTermToDelete(null);
  };

  // Quick template for testing based on the user's PDF
  const handleLoadSamplePDF = async () => {
    const sampleTerm: ResponsibilityTerm = {
      id: `TR-${Date.now().toString().slice(-6)}`,
      numeroTermo: 'AF-30466',
      tituloDocumento: 'Termo de Responsabilidade Notebook',
      codigoDocumento: 'RG.TI.001 Rev00 10ago2020',
      dataEmissao: '2026-09-02',
      status: 'Ativo',
      colaboradorNome: 'Nise Luis de Lima',
      modelo: 'VOSTRO 3480',
      processador: 'Intel Core I5',
      memoria: '8 GB',
      capacidadeHD: 'SSD 256 GB',
      af: '30466',
      checklistVerificacao: {
        oneDrive: true,
        teams: true,
        office365: true,
        office2010: false,
        bitdefender: true,
        java: true,
        fortnet: true,
      },
      opcionais: {
        zwcad: false,
        dwgNaviswork: false,
        powerBi: false,
        project: false,
      },
      centroCusto: 'CEQ (Central de Equipamentos)',
      localUso: 'CEQ (Central de Equipamentos)',
      cidade: 'Escada, PE',
      emitidoPor: currentUser.nome || 'Departamento de TI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTerm(sampleTerm);
    setPrintTerm(sampleTerm);
    onToast('Termo exemplo criado conforme o PDF oficial!', 'success');
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1f2c] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#f25c27] to-[#e04510] flex items-center justify-center text-white shadow-sm shrink-0 mt-0.5">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400">
                Modelo Oficial RG.TI.001 Rev00
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">Notebooks MCM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Gerador de Termos de Responsabilidade
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Emita, visualize e imprima os termos oficiais de uso e conservação de notebooks no formato padrão da empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {terms.length === 0 && (
            <button
              onClick={handleLoadSamplePDF}
              className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-orange-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar Exemplo do PDF</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Gerar Novo Termo</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1a1f2c] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por colaborador, AF, modelo, centro de custo..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#141822] text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto justify-between sm:justify-end px-1">
          <span>
            Total emitidos: <strong className="text-slate-900 dark:text-slate-100 font-mono font-bold">{terms.length}</strong>
          </span>
          {terms.length > 0 && (
            <button
              onClick={handleOpenAdd}
              className="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Emitir outro
            </button>
          )}
        </div>
      </div>

      {/* Terms Grid */}
      {filteredTerms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTerms.map((term, idx) => {
            // Count checked items
            const checklistCount = Object.values(term.checklistVerificacao || {}).filter(Boolean).length;
            const opcionaisCount = Object.values(term.opcionais || {}).filter(Boolean).length;

            return (
              <div
                key={term.id || `term-${idx}`}
                className="bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                        <Laptop className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {term.af ? `AF: ${term.af}` : term.numeroTermo}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {term.codigoDocumento || 'RG.TI.001'}
                    </span>
                  </div>

                  {/* Colaborador in Red Bold (template pattern) */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      Responsável:
                    </span>
                    <h3 className="font-black text-sm text-[#d32f2f] dark:text-red-400 tracking-tight">
                      {term.colaboradorNome}
                    </h3>
                  </div>

                  {/* Specs Pill Summary */}
                  <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                        {term.modelo || 'VOSTRO 3480'}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {term.processador || 'Intel Core I5'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>RAM: <strong className="text-slate-700 dark:text-slate-300">{term.memoria || '8 GB'}</strong></span>
                      <span>·</span>
                      <span>HD: <strong className="text-slate-700 dark:text-slate-300">{term.capacidadeHD || 'SSD 256 GB'}</strong></span>
                    </div>
                  </div>

                  {/* Centro de Custo e Data */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" title={term.centroCusto || 'Centro de Custo não informado'}>
                        {term.centroCusto ? `CC: ${term.centroCusto}` : 'Sem Centro de Custo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{term.cidade || 'Escada, PE'}, {formatDateBR(term.dataEmissao)}</span>
                    </div>
                  </div>

                  {/* Checklists Summary Badges */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                      ✓ {checklistCount}/9 Verificações
                    </span>
                    {opcionaisCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-[10px] font-semibold border border-purple-200 dark:border-purple-800">
                        +{opcionaisCount} Opcionais
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-slate-50/80 dark:bg-[#161b26] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setPrintTerm(term);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(term)}
                    title="Usar dados como modelo para outro termo"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(term)}
                    title="Editar Termo"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setTermToDelete(term)}
                    title="Excluir Termo"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 sm:p-14 text-center bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
            <Laptop className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'Nenhum termo encontrado na busca' : 'Nenhum termo de notebook gerado ainda'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery
                ? 'Verifique os termos digitados ou limpe a busca para visualizar todos os termos emitidos.'
                : 'Esta área é dedicada exclusivamente para gerar e imprimir os termos de responsabilidade oficiais (RG.TI.001) para entrega de notebooks aos colaboradores.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Gerar Novo Termo</span>
            </button>

            <button
              onClick={handleLoadSamplePDF}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Carregar Exemplo do PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <ResponsibilityTermModal
        isOpen={isModalOpen}
        term={editingTerm}
        users={users}
        currentUser={currentUser}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        onToast={onToast}
      />

      {/* Modal de Visualização e Impressão Oficial */}
      {printTerm && (
        <ResponsibilityTermPrintView
          term={printTerm}
          onClose={() => setPrintTerm(null)}
        />
      )}

      {/* Confirmation Modal to Delete */}
      {termToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir Termo de Responsabilidade</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Deseja realmente excluir o termo emitido para{' '}
              <strong className="text-slate-900">{termToDelete.colaboradorNome}</strong> ({termToDelete.af ? `AF: ${termToDelete.af}` : termToDelete.numeroTermo})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTermToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
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

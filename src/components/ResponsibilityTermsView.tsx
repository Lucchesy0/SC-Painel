import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Plus,
  Search,
  Laptop,
  Smartphone,
  Tablet,
  RotateCcw,
  Calendar,
  Building2,
  Trash2,
  Edit2,
  Copy,
  Table as TableIcon,
  LayoutGrid,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Layers,
  Phone,
  Hash,
  Zap,
  ShieldCheck,
  PenTool,
  Wifi,
  Package,
  Settings2,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  Shield,
  Cpu,
  HardDrive,
  Eye,
  CheckCircle,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsibilityTerm, Equipment, UserProfile, TermCategory, ReturnType, ReturnTypeDefinition } from '../types';
import { formatDateBR, formatDateTimeBR } from '../utils/dateUtils';
import { ResponsibilityTermModal } from './ResponsibilityTermModal';
import { ResponsibilityTermPrintView } from './ResponsibilityTermPrintView';
import { ReturnTypesManagementView } from './ReturnTypesManagementView';
import { returnTypesService } from '../services/returnTypesService';
import {
  normalizeCostCentersWithAI,
  normalizeCostCentersLocally,
  AICostCenterCanonicalInfo,
} from '../services/aiService';
import { triggerHaptic } from '../utils/haptics';

interface ResponsibilityTermsViewProps {
  terms: ResponsibilityTerm[];
  equipments: Equipment[];
  users: UserProfile[];
  currentUser: UserProfile;
  onSaveTerm: (term: ResponsibilityTerm) => Promise<void>;
  onDeleteTerm: (id: string) => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function isTermDevolucao(term: ResponsibilityTerm): boolean {
  return (
    term.categoriaTermo === 'devolucao' ||
    term.tipo === 'Devolucao' ||
    term.status === 'Devolvido' ||
    Boolean(term.codigoDocumento?.toUpperCase().includes('DEV')) ||
    Boolean(term.codigoDocumento?.includes('RG.TI.004')) ||
    Boolean(term.tituloDocumento?.toLowerCase().includes('devolução')) ||
    Boolean(term.tipoDevolucao)
  );
}

export function isTermTablet(term: ResponsibilityTerm): boolean {
  if (isTermDevolucao(term)) return false;
  return (
    term.categoriaTermo === 'tablet' ||
    Boolean(term.codigoDocumento?.includes('RG.TI.003')) ||
    (Boolean(term.modelo) &&
      /tablet|tab\b|ipad/i.test(term.modelo) &&
      term.categoriaTermo !== 'celular' &&
      term.categoriaTermo !== 'notebook')
  );
}

export function isTermCelular(term: ResponsibilityTerm): boolean {
  if (isTermDevolucao(term)) return false;
  if (isTermTablet(term)) return false;
  return (
    term.categoriaTermo === 'celular' ||
    Boolean(term.numeroLinha) ||
    Boolean(term.imeiChip) ||
    Boolean(term.codigoDocumento?.includes('RG.TI.002'))
  );
}

export const RETURN_TYPES_CONFIG: Array<{ id: 'all' | ReturnType | string; label: string; icon: string; desc: string }> = [
  { id: 'all', label: 'Todos os Tipos', icon: '📋', desc: 'Todas as devoluções registradas' },
  { id: 'Notebook', label: 'Notebook', icon: '💻', desc: 'Devolução de Notebook e periféricos' },
  { id: 'Celular', label: 'Celular', icon: '📱', desc: 'Devolução de Celular corporativo e chip' },
  { id: 'Modem', label: 'Modem', icon: '📡', desc: 'Devolução de Modem Wi-Fi / 4G' },
  { id: 'Celular e Notebook', label: 'Celular e Notebook', icon: '📱💻', desc: 'Devolução conjunta de Celular e Notebook' },
  { id: 'Celular e Modem', label: 'Celular e Modem', icon: '📱📡', desc: 'Devolução conjunta de Celular e Modem' },
  { id: 'Notebook e Modem', label: 'Notebook e Modem', icon: '💻📡', desc: 'Devolução conjunta de Notebook e Modem' },
];

interface TermTableRowProps {
  term: ResponsibilityTerm;
  activeCategory: 'notebook' | 'celular' | 'tablet' | 'devolucao' | 'all';
  isExpanded: boolean;
  canonicalInfo?: AICostCenterCanonicalInfo | null;
  onToggleExpand: () => void;
  onPrint: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TermTableRow: React.FC<TermTableRowProps> = ({
  term,
  activeCategory,
  isExpanded,
  canonicalInfo,
  onToggleExpand,
  onPrint,
  onDuplicate,
  onEdit,
  onDelete,
}) => {
  const isDev = isTermDevolucao(term);
  const isTab = !isDev && isTermTablet(term);
  const isCell = !isDev && isTermCelular(term);

  const checklistCount = Object.values(term.checklistVerificacao || {}).filter(Boolean).length;
  const opcionaisCount = Object.values(term.opcionais || {}).filter(Boolean).length;

  const rawCC = (term.centroCusto || '').trim();
  const displayCC = canonicalInfo?.canonical || (rawCC ? `CC ${rawCC}` : '-');

  return (
    <>
      <tr
        className={`transition group border-b border-slate-200 dark:border-slate-800/80 ${
          isExpanded
            ? 'bg-orange-50/30 dark:bg-orange-950/20'
            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 bg-white dark:bg-[#1a1f2c]'
        }`}
      >
        {/* COLUNA 1: IDENTIFICADOR E STATUS */}
        <td className="py-2.5 px-3.5 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              {isDev ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : isTab ? (
                <Tablet className="w-3.5 h-3.5" />
              ) : isCell ? (
                <Smartphone className="w-3.5 h-3.5" />
              ) : (
                <Laptop className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                {isDev
                  ? term.numeroTermo || 'DEV-2026'
                  : isTab
                  ? term.af ? `AF: ${term.af}` : term.numeroTermo
                  : isCell
                  ? term.numeroLinha || term.numeroTermo
                  : term.af
                  ? `AF: ${term.af}`
                  : term.numeroTermo}
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400 font-medium">
                  {isDev
                    ? RETURN_TYPES_CONFIG.find((c) => c.id === term.tipoDevolucao)?.label || 'RG.TI.004'
                    : isTab
                    ? 'RG.TI.003'
                    : isCell
                    ? 'RG.TI.002'
                    : 'RG.TI.001'}
                </span>
                <span
                  className={`px-1 py-0.2 rounded font-semibold text-[9px] ${
                    isDev
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  {isDev ? 'Devolvido' : 'Ativo'}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* COLUNA 2: RESPONSÁVEL & LOTAÇÃO */}
        <td className="py-2.5 px-3.5">
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
            {term.colaboradorNome}
          </div>
          {term.colaboradorCargo && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
              {term.colaboradorCargo}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]"
              title={`Centro de Custo: ${displayCC}`}
            >
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{displayCC}</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              · {term.cidade || (isCell || isTab ? 'Recife' : 'Escada, PE')}
            </span>
          </div>
        </td>

        {/* COLUNA 3: EQUIPAMENTO & CONFIGURAÇÃO */}
        <td className="py-2.5 px-3.5">
          {isDev ? (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-xs flex items-center gap-1.5">
                <span>{term.modelo || 'EQUIPAMENTO TI'}</span>
                {term.af && (
                  <span className="text-[10px] font-mono text-slate-500">
                    (AF: {term.af})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                {term.estadoConservacaoDevolucao && (
                  <span>Estado: <strong className="text-slate-700 dark:text-slate-300">{term.estadoConservacaoDevolucao}</strong></span>
                )}
                {term.recebidoPor && (
                  <span>· Rec.: <strong className="text-slate-700 dark:text-slate-300">{term.recebidoPor}</strong></span>
                )}
              </div>
            </div>
          ) : isTab ? (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-xs">
                {term.modelo || 'TABLET CORPORATIVO'}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {(term.imeiTablet || term.imeiCelular || term.imeiChip) && (
                  <span className="font-mono text-[10px]">IMEI: {term.imeiTablet || term.imeiCelular || term.imeiChip}</span>
                )}
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>{term.comCarregador ? 'Com Carregador' : 'Sem Carregador'}</span>
                {term.comCapaProtecao && <span>· Com Capa</span>}
              </div>
            </div>
          ) : isCell ? (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-xs flex items-center gap-1.5">
                <span>{term.modelo || 'APENAS CHIP'}</span>
                {term.numeroLinha && (
                  <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                    {term.numeroLinha}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {term.imeiChip && <span className="font-mono text-[10px]">Chip: {term.imeiChip}</span>}
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>{term.comCarregador ? 'Com Carregador' : 'Sem Carregador'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-xs tracking-tight">
                {term.modelo || 'VOSTRO 3480'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <span>{term.processador || 'Core i5'}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>{term.memoria || '16 GB'}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>{term.capacidadeHD || 'SSD 512 GB'}</span>
              </div>
            </div>
          )}
        </td>

        {/* COLUNA 4: EMISSÃO & PDF */}
        <td className="py-2.5 px-3.5">
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Emissão: <strong className="text-slate-700 dark:text-slate-300 font-medium">{formatDateBR(isDev ? (term.dataDevolucaoEfetiva || term.dataEmissao) : term.dataEmissao)}</strong></span>
            </div>

            {term.ultimoPdfGeradoEm ? (
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <FileCheck className="w-3 h-3 shrink-0" />
                <span>PDF em {formatDateBR(term.ultimoPdfGeradoEm)}</span>
                {term.ultimoPdfGeradoPor && (
                  <span className="text-slate-400 font-normal">({term.ultimoPdfGeradoPor})</span>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span>PDF pendente</span>
              </div>
            )}
          </div>
        </td>

        {/* COLUNA 5: AÇÕES */}
        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onPrint}
              className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
              title="Visualizar e Imprimir Termo em PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={onToggleExpand}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer border ${
                isExpanded
                  ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 border-orange-200 dark:border-orange-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
              }`}
              title={isExpanded ? 'Recolher detalhes' : 'Ver ficha técnica completa'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onDuplicate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Duplicar configurações"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Editar Termo"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
              title="Excluir Termo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* GAVETA INLINE DE DETALHES COMPLETOS (ACCORDION) */}
      <AnimatePresence>
        {isExpanded && (
          <tr className="bg-orange-50/20 dark:bg-[#141824] border-b-2 border-orange-200/80 dark:border-orange-950/80">
            <td colSpan={5} className="p-4 sm:p-5">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Header da Gaveta */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ficha Técnica Completa: <span className="text-orange-600 font-mono">{term.af ? `AF ${term.af}` : term.numeroTermo}</span>
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Código Oficial: {term.codigoDocumento || 'RG.TI.001'}
                  </span>
                </div>

                {/* Grade de 4 Cartões de Detalhes */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 text-xs">
                  {/* Cartão 1: Softwares de TI Padrão MCM */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Softwares de TI (Checklist)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">
                        {checklistCount}/9 OK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {[
                        { key: 'oneDrive', label: 'OneDrive' },
                        { key: 'teams', label: 'Teams' },
                        { key: 'office365', label: 'Office 365' },
                        { key: 'bitdefender', label: 'Bitdefender' },
                        { key: 'anydesk', label: 'AnyDesk' },
                        { key: 'sharepoint', label: 'SharePoint' },
                        { key: 'java', label: 'Java' },
                        { key: 'fortnet', label: 'FortiClient' },
                        { key: 'office2010', label: 'Office 2010' },
                      ].map((item) => {
                        const checked = Boolean(term.checklistVerificacao?.[item.key]);
                        return (
                          <div
                            key={item.key}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                              checked
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                            }`}
                          >
                            <span className={checked ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                              {checked ? '✓' : '—'}
                            </span>
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cartão 2: Softwares de Engenharia & Acessórios */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-600" />
                        Engenharia & Acessórios
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Softwares Opcionais:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { key: 'zwcad', label: 'ZWCAD' },
                            { key: 'dwgNaviswork', label: 'DWG/Navisworks' },
                            { key: 'powerBi', label: 'Power BI' },
                            { key: 'project', label: 'MS Project' },
                          ].map((opt) => {
                            const hasOpt = Boolean(term.opcionais?.[opt.key]);
                            return (
                              <span
                                key={opt.key}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  hasOpt
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 line-through'
                                }`}
                              >
                                {opt.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Acessórios Inclusos:
                        </span>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            Fonte Bivolt
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            Mochila Corporativa
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            Mouse USB
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cartão 3: Cadastro & Lotação Completa */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        Cadastro & Lotação
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">Colaborador:</strong> {term.colaboradorNome}
                      </div>
                      {term.colaboradorDocumento && (
                        <div>
                          <strong className="text-slate-700 dark:text-slate-200">CPF / Matrícula:</strong> {term.colaboradorDocumento}
                        </div>
                      )}
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">Centro de Custo:</strong>{' '}
                        <span>{canonicalInfo?.canonical || rawCC || 'Não informado'}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">Localidade:</strong> {term.cidade || 'Escada, PE'}
                      </div>
                      {term.finalidade && (
                        <div>
                          <strong className="text-slate-700 dark:text-slate-200">Finalidade:</strong> {term.finalidade}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cartão 4: Rastreabilidade & Auditoria do Documento */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-orange-500" />
                        Rastreabilidade & Histórico
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">Última Geração PDF:</strong>{' '}
                        {term.ultimoPdfGeradoEm ? formatDateTimeBR(term.ultimoPdfGeradoEm) : 'Nunca gerado'}
                      </div>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">Gerado por:</strong>{' '}
                        {term.ultimoPdfGeradoPor || 'Sistema'}
                      </div>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">Total de Impressões:</strong>{' '}
                        {term.ultimoPdfDownloadCount || 0} vezes
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onPrint}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={onEdit}
                          className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
};

const TermGridCard: React.FC<{
  term: ResponsibilityTerm;
  activeCategory: 'notebook' | 'celular' | 'tablet' | 'devolucao' | 'all';
  onPrint: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ term, activeCategory, onPrint, onDuplicate, onEdit, onDelete }) => {
  const isDev = isTermDevolucao(term);
  const isTab = !isDev && isTermTablet(term);
  const isCell = !isDev && isTermCelular(term);
  const checklistCount = Object.values(term.checklistVerificacao || {}).filter(Boolean).length;
  const opcionaisCount = Object.values(term.opcionais || {}).filter(Boolean).length;

  return (
    <div
      key={term.id}
      className="bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
    >
      <div className="p-5 space-y-3.5">
        {/* Top Row: AF / Linha + Código */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
              {isDev ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : isTab ? (
                <Tablet className="w-3.5 h-3.5" />
              ) : isCell ? (
                <Smartphone className="w-3.5 h-3.5" />
              ) : (
                <Laptop className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
              {isDev
                ? term.numeroTermo || 'DEV-2026'
                : isTab
                ? term.af ? `AF: ${term.af}` : term.numeroTermo
                : isCell
                ? term.numeroLinha || term.numeroTermo
                : term.af
                ? `AF: ${term.af}`
                : term.numeroTermo}
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {isDev
              ? RETURN_TYPES_CONFIG.find((c) => c.id === term.tipoDevolucao)?.label || 'Devolução'
              : isTab
              ? 'RG.TI.003'
              : isCell
              ? 'RG.TI.002'
              : 'RG.TI.001'}
          </span>
        </div>

        {/* Colaborador */}
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
            {isDev ? 'Colaborador (Devolvente):' : 'Responsável:'}
          </span>
          <h3 className="font-black text-sm text-[#d32f2f] dark:text-red-400 tracking-tight">
            {term.colaboradorNome}
          </h3>
          {term.colaboradorCargo && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {term.colaboradorCargo}
            </span>
          )}
        </div>

        {/* Specs Pill Summary */}
        {isDev ? (
          <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                {term.modelo || 'EQUIPAMENTO DEVOLVIDO'}
              </span>
              {term.af && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">
                  AF: {term.af}
                </span>
              )}
            </div>
            {term.motivoDevolucao && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                <strong>Motivo:</strong> {term.motivoDevolucao}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {term.estadoConservacaoDevolucao && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  Estado: {term.estadoConservacaoDevolucao}
                </span>
              )}
              {term.recebidoPor && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Recebido: {term.recebidoPor}
                </span>
              )}
            </div>
            {term.acessoriosDevolvidos && term.acessoriosDevolvidos.length > 0 && (
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <strong>Acessórios:</strong> {term.acessoriosDevolvidos.join(', ')}
              </div>
            )}
          </div>
        ) : isTab ? (
          <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                {term.modelo || 'TABLET CORPORATIVO'}
              </span>
              {term.af && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">
                  AF: {term.af}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  term.comCarregador
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {term.comCarregador ? '✓ Carregador' : 'Sem Carregador'}
              </span>
              {term.comCapaProtecao && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                  ✓ Capa
                </span>
              )}
              {term.comCaneta && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                  ✓ Caneta
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200/50 dark:border-slate-800">
              <div>IMEI: {term.imeiTablet || term.imeiCelular || term.imeiChip || '-'}</div>
            </div>
          </div>
        ) : isCell ? (
          <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                {term.modelo || 'APENAS CHIP'}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  term.comCarregador
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {term.comCarregador ? 'Com Carregador' : 'Sem Carregador'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
              <div>Chip: {term.imeiChip || '-'}</div>
              <div>Aparelho: {term.imeiCelular ?? '0'}</div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {term.modelo || 'VOSTRO 3480'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
              <span>{term.processador || 'Core i5'}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{term.memoria || '16 GB'}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{term.capacidadeHD || 'SSD 512 GB'}</span>
            </div>
          </div>
        )}

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
            <span>{term.cidade || (isCell || isTab ? 'Recife' : 'Escada, PE')}, {formatDateBR(isDev ? (term.dataDevolucaoEfetiva || term.dataEmissao) : term.dataEmissao)}</span>
          </div>
        </div>

        {/* Checklists Summary Badges (Notebook) */}
        {!isCell && !isTab && !isDev && (
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
        )}

        {/* METADADO DE RASTREABILIDADE DE PDF NO CARD */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-orange-500" />
              Rastreabilidade de PDF:
            </span>
            {term.ultimoPdfDownloadCount && term.ultimoPdfDownloadCount > 1 && (
              <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold lowercase">
                {term.ultimoPdfDownloadCount}x gerado
              </span>
            )}
          </div>

          {term.ultimoPdfGeradoEm ? (
            <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/50 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {formatDateTimeBR(term.ultimoPdfGeradoEm)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate" title={term.ultimoPdfGeradoPor}>
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Por: <strong className="text-slate-800 dark:text-slate-100">{term.ultimoPdfGeradoPor || 'Sistema'}</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141822] border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>PDF ainda não gerado ou baixado</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="p-3 bg-slate-50/80 dark:bg-[#161b26] flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onPrint}
          className="flex-1 py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / PDF</span>
        </button>

        <button
          onClick={onDuplicate}
          title="Usar dados como modelo para outro termo"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          onClick={onEdit}
          title="Editar Termo"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          onClick={onDelete}
          title="Excluir Termo"
          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ResponsibilityTermsView: React.FC<ResponsibilityTermsViewProps> = ({
  terms,
  equipments,
  users,
  currentUser,
  onSaveTerm,
  onDeleteTerm,
  onToast,
}) => {
  // Navigation tabs for Notebooks vs Celulares vs Tablets vs Devolução vs Todos
  const [activeCategory, setActiveCategory] = useState<'notebook' | 'celular' | 'tablet' | 'devolucao' | 'all'>('notebook');

  // Sub-aba dentro da sessão Devoluções: 'termos' (Termos emitidos) ou 'tipos' (Gerenciar Tipos de Devolução)
  const [devolucaoSubTab, setDevolucaoSubTab] = useState<'termos' | 'tipos'>('termos');

  // Tipo pré-selecionado para criação de termo
  const [preselectedReturnType, setPreselectedReturnType] = useState<string | undefined>(undefined);

  // Tipos dinâmicos de Devolução gerenciáveis
  const [returnTypesList, setReturnTypesList] = useState<ReturnTypeDefinition[]>(() =>
    returnTypesService.getReturnTypes()
  );

  useEffect(() => {
    const unsub = returnTypesService.subscribe((updated) => {
      setReturnTypesList(updated);
    });
    returnTypesService.fetchReturnTypesWithSync();
    return () => unsub();
  }, []);

  // Sub-filtro para Tipos de Devolução quando na sessão Devolução
  const [devolucaoTipoFilter, setDevolucaoTipoFilter] = useState<'all' | ReturnType | string>('all');

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [groupByCentroCusto, setGroupByCentroCusto] = useState<boolean>(false);
  const [filterCentroCusto, setFilterCentroCusto] = useState<string>('all');
  const [expandedTermIds, setExpandedTermIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ResponsibilityTerm | null>(null);
  const [printTerm, setPrintTerm] = useState<ResponsibilityTerm | null>(null);
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);
  const [termToDelete, setTermToDelete] = useState<ResponsibilityTerm | null>(null);

  // Mapeamento automático inteligente de Centros de Custo (unifica variações do mesmo CC)
  const [aiCanonicalMap, setAiCanonicalMap] = useState<Record<string, AICostCenterCanonicalInfo>>({});

  // Helper para obter o Centro de Custo canônico unificado
  const getCanonicalCC = (rawCC?: string): string => {
    if (!rawCC || !rawCC.trim()) return 'Sem Centro de Custo';
    const trimmed = rawCC.trim();
    if (aiCanonicalMap[trimmed]?.canonical) {
      return aiCanonicalMap[trimmed].canonical;
    }
    return trimmed;
  };

  const getCanonicalInfo = (rawCC?: string): AICostCenterCanonicalInfo | null => {
    if (!rawCC || !rawCC.trim()) return null;
    return aiCanonicalMap[rawCC.trim()] || null;
  };

  // Normalização automática em segundo plano (unifica números sem nome ao Centro de Custo oficial)
  const performCostCenterNormalization = async () => {
    const items = terms
      .map((t) => ({
        raw: (t.centroCusto || '').trim(),
        colaborador: t.colaboradorNome,
        localidade: t.cidade,
      }))
      .filter((i) => i.raw.length > 0);

    if (items.length === 0) return;

    // 1. Normalização local imediata
    const localResult = normalizeCostCentersLocally(items);
    setAiCanonicalMap(localResult.canonicalMap);

    // 2. Consulta de retaguarda para consolidar variações
    try {
      const result = await normalizeCostCentersWithAI(items);
      if (result?.canonicalMap) {
        setAiCanonicalMap(result.canonicalMap);
      }
    } catch {
      // Silencioso: heurística local já ativa
    }
  };

  useEffect(() => {
    performCostCenterNormalization();
  }, [terms]);

  // Toggle expand/collapse of individual term row drawer
  const toggleExpandTerm = (id: string) => {
    triggerHaptic('light');
    setExpandedTermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle expand all filtered terms
  const toggleExpandAll = () => {
    triggerHaptic('light');
    if (expandedTermIds.size > 0) {
      setExpandedTermIds(new Set());
    } else {
      setExpandedTermIds(new Set(filteredTerms.map((t) => t.id).filter(Boolean)));
    }
  };

  // Counts for each section
  const notebookCount = useMemo(() => {
    return terms.filter((t) => !isTermDevolucao(t) && !isTermCelular(t) && !isTermTablet(t)).length;
  }, [terms]);

  const celularCount = useMemo(() => {
    return terms.filter((t) => !isTermDevolucao(t) && isTermCelular(t)).length;
  }, [terms]);

  const tabletCount = useMemo(() => {
    return terms.filter((t) => !isTermDevolucao(t) && isTermTablet(t)).length;
  }, [terms]);

  const devolucaoCount = useMemo(() => {
    return terms.filter((t) => isTermDevolucao(t)).length;
  }, [terms]);

  // Centros de Custo Únicos consolidados e unificados pela IA para a categoria ativa
  const uniqueCentrosCusto = useMemo(() => {
    const countsMap = new Map<
      string,
      { count: number; canonical: string; codigo: string; originalValues: Set<string> }
    >();

    terms.forEach((term) => {
      const isDev = isTermDevolucao(term);
      const isTab = !isDev && isTermTablet(term);
      const isCell = !isDev && isTermCelular(term);

      if (activeCategory === 'notebook' && (isDev || isCell || isTab)) return;
      if (activeCategory === 'celular' && !isCell) return;
      if (activeCategory === 'tablet' && !isTab) return;
      if (activeCategory === 'devolucao' && !isDev) return;

      const raw = (term.centroCusto || 'Sem Centro de Custo').trim();
      const canonical = getCanonicalCC(term.centroCusto);
      const info = getCanonicalInfo(term.centroCusto);
      const codigo = info?.codigo || canonical.match(/\b\d{2,6}\b/)?.[0] || 'CC';

      const existing = countsMap.get(canonical);
      if (existing) {
        existing.count += 1;
        existing.originalValues.add(raw);
      } else {
        countsMap.set(canonical, {
          count: 1,
          canonical,
          codigo,
          originalValues: new Set([raw]),
        });
      }
    });

    return Array.from(countsMap.values())
      .map((item) => ({
        cc: item.canonical,
        count: item.count,
        codigo: item.codigo,
        hasMultipleVariations: item.originalValues.size > 1,
        variations: Array.from(item.originalValues),
      }))
      .sort((a, b) => b.count - a.count);
  }, [terms, activeCategory, aiCanonicalMap]);

  // Filtered terms by activeCategory, devolucaoTipoFilter, filterCentroCusto (canônico) and searchQuery
  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const isDev = isTermDevolucao(term);
      const isTab = !isDev && isTermTablet(term);
      const isCell = !isDev && isTermCelular(term);

      // Category filter
      if (activeCategory === 'notebook' && (isDev || isCell || isTab)) return false;
      if (activeCategory === 'celular' && !isCell) return false;
      if (activeCategory === 'tablet' && !isTab) return false;
      if (activeCategory === 'devolucao') {
        if (!isDev) return false;
        if (devolucaoTipoFilter !== 'all') {
          const tType = (term.tipoDevolucao || '').toLowerCase();
          const fType = devolucaoTipoFilter.toLowerCase();
          if (tType !== fType && !tType.includes(fType)) {
            return false;
          }
        }
      }

      // Centro de Custo filter (canônico da IA)
      if (filterCentroCusto !== 'all') {
        const canonical = getCanonicalCC(term.centroCusto);
        if (canonical !== filterCentroCusto) return false;
      }

      // Search filter (busca por original ou pelo canônico unificado pela IA)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchColab = (term.colaboradorNome || '').toLowerCase().includes(query);
        const matchModelo = (term.modelo || '').toLowerCase().includes(query);
        const matchAf = (term.af || term.numeroTermo || '').toLowerCase().includes(query);
        const rawCC = (term.centroCusto || '').toLowerCase();
        const canonicalCC = getCanonicalCC(term.centroCusto).toLowerCase();
        const matchCC = rawCC.includes(query) || canonicalCC.includes(query);
        const matchProc = (term.processador || '').toLowerCase().includes(query);
        const matchLinha = (term.numeroLinha || '').toLowerCase().includes(query);
        const matchImeiChip = (term.imeiChip || '').toLowerCase().includes(query);
        const matchImeiCel = (term.imeiCelular || '').toLowerCase().includes(query);
        const matchDetalhesDev = (term.detalhesDevolucao || '').toLowerCase().includes(query);
        const matchObsDev = (term.observacaoDevolucao || '').toLowerCase().includes(query);

        return (
          matchColab ||
          matchModelo ||
          matchAf ||
          matchCC ||
          matchProc ||
          matchLinha ||
          matchImeiChip ||
          matchImeiCel ||
          matchDetalhesDev ||
          matchObsDev
        );
      }
      return true;
    });
  }, [terms, activeCategory, devolucaoTipoFilter, filterCentroCusto, searchQuery, aiCanonicalMap]);

  // Grouped terms by Centro de Custo Canônico da IA when groupByCentroCusto is active
  const groupedTermsByCC = useMemo(() => {
    const groups: Record<string, ResponsibilityTerm[]> = {};
    filteredTerms.forEach((term) => {
      const canonical = getCanonicalCC(term.centroCusto);
      if (!groups[canonical]) groups[canonical] = [];
      groups[canonical].push(term);
    });
    return groups;
  }, [filteredTerms, aiCanonicalMap]);

  // Open modal to create a new term (preselect active category)
  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingTerm(null);
    setPreselectedReturnType(undefined);
    setIsModalOpen(true);
  };

  // Open modal preselected with a specific return type
  const handleCreateTermForType = (typeId: string) => {
    triggerHaptic('light');
    setEditingTerm(null);
    setPreselectedReturnType(typeId);
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
    const isTab = isTermTablet(term);
    const isCell = isTermCelular(term);
    const duplicated: ResponsibilityTerm = {
      ...term,
      id: '',
      colaboradorNome: '', // Prompt new name
      af: isCell ? undefined : '',
      numeroTermo: '',
      numeroLinha: isCell || isTab ? '' : undefined,
      imeiChip: isCell || isTab ? '' : undefined,
      ultimoPdfGeradoEm: undefined,
      ultimoPdfGeradoPor: undefined,
      ultimoPdfDownloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingTerm(duplicated);
    setIsModalOpen(true);
    onToast(
      isTab
        ? 'Configurações de tablet copiadas! Informe o novo colaborador e AF.'
        : isCell
        ? 'Configurações de celular/chip copiadas! Informe o novo colaborador e linha.'
        : 'Configurações do aparelho copiadas! Informe o novo colaborador e AF.',
      'info'
    );
  };

  // Aciona a impressão e salva imediatamente a rastreabilidade no Firestore
  const handlePrintTerm = async (term: ResponsibilityTerm, autoPrint = false) => {
    triggerHaptic('light');
    const nowISO = new Date().toISOString();
    const updatedTerm: ResponsibilityTerm = {
      ...term,
      ultimoPdfGeradoEm: nowISO,
      ultimoPdfGeradoPor: currentUser.nome || 'Departamento de TI',
      ultimoPdfDownloadCount: (term.ultimoPdfDownloadCount || 0) + 1,
      updatedAt: nowISO,
    };

    setShouldAutoPrint(autoPrint);
    setPrintTerm(updatedTerm);

    try {
      await onSaveTerm(updatedTerm);
    } catch (err) {
      console.warn('Falha ao registrar rastreabilidade do PDF no Firestore:', err);
    }
  };

  // Callback acionado se o usuário clicar no botão Imprimir dentro do visualizador
  const handleTrackPdfGenerated = async (term: ResponsibilityTerm) => {
    const nowISO = new Date().toISOString();
    // Evita duplicar se registrado nos últimos 3 segundos
    if (
      term.ultimoPdfGeradoEm &&
      new Date().getTime() - new Date(term.ultimoPdfGeradoEm).getTime() < 3000
    ) {
      return;
    }

    const updatedTerm: ResponsibilityTerm = {
      ...term,
      ultimoPdfGeradoEm: nowISO,
      ultimoPdfGeradoPor: currentUser.nome || 'Departamento de TI',
      ultimoPdfDownloadCount: (term.ultimoPdfDownloadCount || 0) + 1,
      updatedAt: nowISO,
    };

    setPrintTerm(updatedTerm);
    try {
      await onSaveTerm(updatedTerm);
    } catch (err) {
      console.warn('Falha ao atualizar rastreabilidade do PDF:', err);
    }
  };

  // Save handler from modal
  const handleSaveModal = async (termToSave: ResponsibilityTerm, shouldPrintImmediately?: boolean) => {
    await onSaveTerm(termToSave);
    if (shouldPrintImmediately) {
      setShouldAutoPrint(true);
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

  // Carregar exemplo oficial de Notebook (RG.TI.001)
  const handleLoadSampleNotebook = async () => {
    const sampleTerm: ResponsibilityTerm = {
      id: `TR-${Date.now().toString().slice(-6)}`,
      numeroTermo: 'AF-30466',
      categoriaTermo: 'notebook',
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
    onToast('Termo exemplo de Notebook (RG.TI.001) criado com sucesso!', 'success');
  };

  // Carregar exemplo oficial de Celular Corporativo (RG.TI.002)
  const handleLoadSampleCelular = async () => {
    const sampleCelularTerm: ResponsibilityTerm = {
      id: `TR-CEL-${Date.now().toString().slice(-6)}`,
      numeroTermo: 'CEL-98226-8217',
      categoriaTermo: 'celular',
      tituloDocumento: 'Termo de Responsabilidade Celular Corporativo',
      codigoDocumento: 'RG.TI.002 Rev00 10ago2020',
      dataEmissao: '2026-06-18',
      status: 'Ativo',
      colaboradorNome: 'Keity Miyuki Mathias Hirae',
      modelo: 'APENAS CHIP',
      comCarregador: false,
      imeiChip: '8955118512900069883729',
      imeiCelular: '0',
      numeroLinha: '81-98226-8217',
      centroCusto: '988',
      cidade: 'Recife',
      emitidoPor: currentUser.nome || 'Departamento de TI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTerm(sampleCelularTerm);
    setPrintTerm(sampleCelularTerm);
    onToast('Termo exemplo de Celular Corporativo (RG.TI.002) criado com sucesso!', 'success');
  };

  // Carregar exemplo oficial de Tablet Corporativo (RG.TI.003)
  const handleLoadSampleTablet = async () => {
    const sampleTabletTerm: ResponsibilityTerm = {
      id: `TR-TAB-${Date.now().toString().slice(-6)}`,
      numeroTermo: 'TAB-40120',
      categoriaTermo: 'tablet',
      tituloDocumento: 'Termo de Responsabilidade Tablet Corporativo',
      codigoDocumento: 'RG.TI.003 Rev00 10ago2020',
      dataEmissao: '2026-09-05',
      status: 'Ativo',
      colaboradorNome: 'Carlos Eduardo Menezes',
      colaboradorCargo: 'Coordenador de Operações',
      modelo: 'SAMSUNG GALAXY TAB A9+ 5G',
      af: '40120',
      comCarregador: true,
      comCapaProtecao: true,
      comCaneta: true,
      imeiCelular: '354892109827341',
      imeiChip: '354892109827341',
      imeiTablet: '354892109827341',
      centroCusto: 'CEQ - Operações de Campo',
      localUso: 'CEQ (Central de Equipamentos)',
      cidade: 'Recife',
      emitidoPor: currentUser.nome || 'Departamento de TI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTerm(sampleTabletTerm);
    setPrintTerm(sampleTabletTerm);
    onToast('Termo exemplo de Tablet (RG.TI.003) criado com sucesso!', 'success');
  };

  // Carregar exemplo oficial de Devolução de Equipamento (RG.TI.004)
  const handleLoadSampleDevolucao = async () => {
    const sampleDevolucaoTerm: ResponsibilityTerm = {
      id: `TR-DEV-${Date.now().toString().slice(-6)}`,
      numeroTermo: 'DEV-2026-001',
      categoriaTermo: 'devolucao',
      tipo: 'Devolucao',
      tipoDevolucao: 'Celular',
      tituloDocumento: 'Termo de Devolução',
      codigoDocumento: 'RG.TI.004 Rev00 10ago2020',
      dataEmissao: '2026-09-23',
      dataDevolucaoEfetiva: '2026-09-23',
      status: 'Devolvido',
      colaboradorNome: 'Felipe Wanderley Vieira de Sá',
      colaboradorCargo: 'Colaborador',
      colaboradorDepartamento: 'Operações',
      modelo: 'SAMSUNG GALAXY A03 CORE',
      af: 'CHIP-TIM-CORP',
      detalhesDevolucao: 'Celular\n\nModelo: Galaxy A03 Core\nImei chip: 89551185129000699116\nImei Celular: 358.302.232.438.612',
      observacaoDevolucao: 'Com carregador.',
      motivoDevolucao: 'Devolução de aparelho celular e chip funcional',
      estadoConservacaoDevolucao: 'Bom',
      recebidoPor: '',
      observacoesDevolucao: 'Com carregador.',
      acessoriosDevolvidos: ['Carregador / Fonte', 'Cabo de Alimentação', 'Chip SIM (Operadora)'],
      centroCusto: '988 - Administração Central',
      cidade: 'Recife',
      emitidoPor: currentUser.nome || 'Departamento de TI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTerm(sampleDevolucaoTerm);
    setPrintTerm(sampleDevolucaoTerm);
    onToast('Exemplo de Termo de Devolução (RG.TI.004) gerado com sucesso!', 'success');
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner - Limpo, Executivo e Sem Botões de Demonstração */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1f2c] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm shrink-0 mt-0.5">
            {activeCategory === 'devolucao' ? (
              <RotateCcw className="w-6 h-6" />
            ) : activeCategory === 'tablet' ? (
              <Tablet className="w-6 h-6" />
            ) : activeCategory === 'celular' ? (
              <Smartphone className="w-6 h-6" />
            ) : (
              <Laptop className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400">
                {activeCategory === 'devolucao'
                  ? 'RG.TI.004 Rev00 · Folha Única A4'
                  : activeCategory === 'tablet'
                  ? 'RG.TI.003 Rev00 · Folha Única A4'
                  : activeCategory === 'celular'
                  ? 'RG.TI.002 Rev00 · Folha Única A4'
                  : activeCategory === 'notebook'
                  ? 'RG.TI.001 Rev00 · Folha Única A4'
                  : 'RG.TI.001 a RG.TI.004'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {activeCategory === 'devolucao'
                  ? 'Devoluções & Baixas de Equipamentos'
                  : activeCategory === 'tablet'
                  ? 'Tablets Corporativos'
                  : activeCategory === 'celular'
                  ? 'Celulares & Chips'
                  : activeCategory === 'notebook'
                  ? 'Notebooks Corporativos'
                  : 'Todos os Termos MCM'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {activeCategory === 'devolucao'
                ? 'Devolução de Equipamentos TI'
                : activeCategory === 'tablet'
                ? 'Termos de Tablets Corporativos'
                : activeCategory === 'celular'
                ? 'Termos de Celulares Corporativos'
                : activeCategory === 'notebook'
                ? 'Termos de Notebooks'
                : 'Termos de Responsabilidade TI'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              {activeCategory === 'devolucao' ? (
                <>
                  Controle, registro e emissão de termos de devolução para{' '}
                  <strong className="text-slate-700 dark:text-slate-300">Desligamento</strong>,{' '}
                  <strong className="text-slate-700 dark:text-slate-300">Substituição</strong>,{' '}
                  <strong className="text-slate-700 dark:text-slate-300">Manutenção</strong> ou{' '}
                  <strong className="text-slate-700 dark:text-slate-300">Fim de Obra</strong>.
                </>
              ) : (
                <>
                  Emissão, controle e impressão oficial dos termos de responsabilidade corporativos com rastreabilidade completa.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeCategory === 'devolucao'
                ? 'Novo Termo de Devolução'
                : activeCategory === 'tablet'
                ? 'Novo Termo de Tablet'
                : activeCategory === 'celular'
                ? 'Novo Termo de Celular'
                : activeCategory === 'notebook'
                ? 'Novo Termo de Notebook'
                : 'Novo Termo'}
            </span>
          </button>
        </div>
      </div>

      {/* BARRA UNIFICADA DE NAVEGAÇÃO: Categorias + Sub-abas de Devolução no mesmo nível */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#1a1f2c] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Abas Principais de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {/* Notebooks */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveCategory('notebook');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeCategory === 'notebook'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Notebooks</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeCategory === 'notebook'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {notebookCount}
            </span>
          </button>

          {/* Celulares */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveCategory('celular');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeCategory === 'celular'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Celulares</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeCategory === 'celular'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {celularCount}
            </span>
          </button>

          {/* Tablets */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveCategory('tablet');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeCategory === 'tablet'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>Tablets</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeCategory === 'tablet'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {tabletCount}
            </span>
          </button>

          {/* Devoluções */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveCategory('devolucao');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeCategory === 'devolucao'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Devoluções</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeCategory === 'devolucao'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {devolucaoCount}
            </span>
          </button>

          {/* Todos */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveCategory('all');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeCategory === 'all'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {terms.length}
            </span>
          </button>
        </div>

        {/* Sub-Aba de Devolução (Termos vs Tipos) Integrada perfeitamente no lado direito */}
        {activeCategory === 'devolucao' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDevolucaoSubTab('termos');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                devolucaoSubTab === 'termos'
                  ? 'bg-white dark:bg-[#1a1f2c] text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Termos Emitidos</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  devolucaoSubTab === 'termos'
                    ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {devolucaoCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDevolucaoSubTab('tipos');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                devolucaoSubTab === 'tipos'
                  ? 'bg-white dark:bg-[#1a1f2c] text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Gerenciar Tipos</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  devolucaoSubTab === 'tipos'
                    ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {returnTypesList.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL: Gerenciamento de Tipos OU Listagem de Termos */}
      {activeCategory === 'devolucao' && devolucaoSubTab === 'tipos' ? (
        <ReturnTypesManagementView
          returnTypes={returnTypesList}
          currentUser={currentUser}
          onSelectTypeForNewTerm={handleCreateTermForType}
          onToast={onToast}
        />
      ) : (
        <>
          {/* BARRA UNIFICADA DE FILTROS & BUSCA (Design Limpo, Integrado, Sem Caixas Gigantes) */}
          <div className="bg-white dark:bg-[#1a1f2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            {/* Linha Principal: Busca + Alternador Tabela/Cards + Contador */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeCategory === 'devolucao'
                      ? 'Buscar por colaborador, equipamento, AF, centro de custo...'
                      : activeCategory === 'celular'
                      ? 'Buscar por colaborador, número da linha, IMEI, centro de custo...'
                      : activeCategory === 'tablet'
                      ? 'Buscar por colaborador, modelo de tablet, AF, centro de custo...'
                      : 'Buscar por colaborador, AF, modelo, centro de custo...'
                  }
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#141822] text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {filteredTerms.length} {filteredTerms.length === 1 ? 'termo' : 'termos'}
                </span>

                {/* View Mode Toggle: Tabela ou Cards */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setViewMode('table');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-[#1a1f2c] text-orange-600 dark:text-orange-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Visualizar em formato Tabela com rastreabilidade"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tabela</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setViewMode('grid');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-[#1a1f2c] text-orange-600 dark:text-orange-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Visualizar em formato Cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Linha Secundária: Chips de Filtro por Tipo de Devolução (quando na Sessão Devolução) */}
            {activeCategory === 'devolucao' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 select-none">
                  Filtrar por:
                </span>

                {/* Botão Todos os Tipos */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setDevolucaoTipoFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 border ${
                    devolucaoTipoFilter === 'all'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500'
                  }`}
                >
                  <span>📋</span>
                  <span>Todos os Tipos</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      devolucaoTipoFilter === 'all'
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {terms.filter(isTermDevolucao).length}
                  </span>
                </button>

                {/* Lista dinâmica de tipos cadastrados */}
                {returnTypesList.map((cfg) => {
                  const count = terms.filter(
                    (t) =>
                      isTermDevolucao(t) &&
                      (t.tipoDevolucao?.toLowerCase() === cfg.nome.toLowerCase() ||
                        t.tipoDevolucao?.toLowerCase() === cfg.id.toLowerCase() ||
                        (t.detalhesDevolucao && t.detalhesDevolucao.toLowerCase().includes(cfg.nome.toLowerCase())))
                  ).length;
                  const isSelected =
                    devolucaoTipoFilter.toLowerCase() === cfg.nome.toLowerCase() ||
                    devolucaoTipoFilter.toLowerCase() === cfg.id.toLowerCase();

                  return (
                    <button
                      key={cfg.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setDevolucaoTipoFilter(cfg.nome);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500'
                      }`}
                      title={cfg.descricao}
                    >
                      <span>{cfg.icone}</span>
                      <span>{cfg.nome}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Linha de Divisão por Centro de Custo, Filtros e Ações Rápidas */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
              {/* Chips Rápidos de Centro de Custo */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-[280px]">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 select-none flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-orange-500" />
                  Centros de Custo:
                </span>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterCentroCusto('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 border ${
                    filterCentroCusto === 'all'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                  }`}
                >
                  <span>Todos</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      filterCentroCusto === 'all'
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {filteredTerms.length}
                  </span>
                </button>

                {uniqueCentrosCusto.map(({ cc, count }) => {
                  const isSelected = filterCentroCusto === cc;
                  return (
                    <button
                      key={cc}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setFilterCentroCusto(isSelected ? 'all' : cc);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                      }`}
                    >
                      <span>{cc.startsWith('CC ') ? cc : `CC ${cc}`}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Controles de Divisão Visual & Detalhes */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Alternador Dividir por Centro de Custo */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setGroupByCentroCusto(!groupByCentroCusto);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    groupByCentroCusto
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                  }`}
                  title="Agrupa e divide os termos visualmente por Centro de Custo"
                >
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  <span>{groupByCentroCusto ? 'Dividido por CC' : 'Dividir por CC'}</span>
                </button>

                {/* Botão Expandir / Recolher Detalhes */}
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 hover:border-slate-300 dark:hover:border-slate-600 flex items-center gap-1.5 transition cursor-pointer"
                  title="Expandir ou recolher os detalhes de todos os termos"
                >
                  {expandedTermIds.size > 0 ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-orange-500" />
                      <span>Recolher Detalhes ({expandedTermIds.size})</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-orange-500" />
                      <span>Mais Detalhes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

      {/* Terms Display */}
      {filteredTerms.length > 0 ? (
        viewMode === 'table' ? (
          /* TABULAR VIEW COM INFORMAÇÕES COESAS, BEM DIVIDIDAS E DETALHADAS */
          <div className="bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#141822] text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold w-[170px]">AF / Nº Termo</th>
                    <th className="py-3 px-4 font-bold min-w-[260px] max-w-[340px]">Responsável & Lotação</th>
                    <th className="py-3 px-4 font-bold min-w-[320px]">
                      {activeCategory === 'devolucao'
                        ? 'Equipamento Devolvido & Estado'
                        : activeCategory === 'celular'
                        ? 'Celular, Linha & Acessórios'
                        : activeCategory === 'tablet'
                        ? 'Tablet & Acessórios'
                        : 'Notebook & Configuração'}
                    </th>
                    <th className="py-3 px-4 font-bold min-w-[240px] bg-orange-50/40 dark:bg-orange-950/10">
                      <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                        <FileCheck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                        <span>Emissão & PDF Oficial</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-right w-[190px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {groupByCentroCusto ? (
                    // MODO DIVIDIDO POR CENTRO DE CUSTO
                    (Object.entries(groupedTermsByCC) as [string, ResponsibilityTerm[]][]).map(([ccName, ccTerms]) => (
                      <React.Fragment key={`cc-group-${ccName}`}>
                        {/* Cabeçalho de Divisão por Centro de Custo */}
                        <tr className="bg-slate-100/90 dark:bg-[#151a24] border-y border-slate-200 dark:border-slate-700/80">
                          <td colSpan={5} className="py-2.5 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-orange-600 text-white flex items-center justify-center text-[10px] shadow-xs">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-bold text-xs uppercase tracking-tight text-slate-800 dark:text-slate-100">
                                  Centro de Custo: <span className="text-orange-600 dark:text-orange-400 font-bold">{ccName}</span>
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                                  {ccTerms.length} {ccTerms.length === 1 ? 'termo' : 'termos'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                                Unidade: {ccTerms[0]?.cidade || 'Escada, PE'}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Linhas de Termos deste Centro de Custo */}
                        {ccTerms.map((term, idx) => (
                          <TermTableRow
                            key={term.id || `term-${ccName}-${idx}`}
                            term={term}
                            activeCategory={activeCategory}
                            isExpanded={expandedTermIds.has(term.id)}
                            canonicalInfo={getCanonicalInfo(term.centroCusto)}
                            onToggleExpand={() => toggleExpandTerm(term.id)}
                            onPrint={() => handlePrintTerm(term)}
                            onDuplicate={() => handleDuplicate(term)}
                            onEdit={() => handleOpenEdit(term)}
                            onDelete={() => setTermToDelete(term)}
                          />
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    // MODO LISTA CONTÍNUA COM DIVISÃO NÍTIDA ENTRE LINHAS
                    filteredTerms.map((term, idx) => (
                      <TermTableRow
                        key={term.id || `term-row-${idx}`}
                        term={term}
                        activeCategory={activeCategory}
                        isExpanded={expandedTermIds.has(term.id)}
                        canonicalInfo={getCanonicalInfo(term.centroCusto)}
                        onToggleExpand={() => toggleExpandTerm(term.id)}
                        onPrint={() => handlePrintTerm(term)}
                        onDuplicate={() => handleDuplicate(term)}
                        onEdit={() => handleOpenEdit(term)}
                        onDelete={() => setTermToDelete(term)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* GRID DE CARDS COM METADADO DE RASTREABILIDADE */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTerms.map((term, idx) => {
              const isDev = isTermDevolucao(term);
              const isTab = !isDev && isTermTablet(term);
              const isCell = !isDev && isTermCelular(term);
              const checklistCount = Object.values(term.checklistVerificacao || {}).filter(Boolean).length;
              const opcionaisCount = Object.values(term.opcionais || {}).filter(Boolean).length;

              return (
                <div
                  key={term.id || `term-card-${idx}`}
                  className="bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-3.5">
                    {/* Top Row: AF / Linha + Código */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                          {isDev ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : isTab ? (
                            <Tablet className="w-3.5 h-3.5" />
                          ) : isCell ? (
                            <Smartphone className="w-3.5 h-3.5" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                          {isDev
                            ? term.numeroTermo || 'DEV-2026'
                            : isTab
                            ? term.af ? `AF: ${term.af}` : term.numeroTermo
                            : isCell
                            ? term.numeroLinha || term.numeroTermo
                            : term.af
                            ? `AF: ${term.af}`
                            : term.numeroTermo}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {isDev
                          ? RETURN_TYPES_CONFIG.find((c) => c.id === term.tipoDevolucao)?.label || 'Devolução'
                          : isTab
                          ? 'RG.TI.003'
                          : isCell
                          ? 'RG.TI.002'
                          : 'RG.TI.001'}
                      </span>
                    </div>

                    {/* Colaborador in Red Bold (template pattern) */}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                        {isDev ? 'Colaborador (Devolvente):' : 'Responsável:'}
                      </span>
                      <h3 className="font-black text-sm text-[#d32f2f] dark:text-red-400 tracking-tight">
                        {term.colaboradorNome}
                      </h3>
                    </div>

                    {/* Specs Pill Summary */}
                    {isDev ? (
                      <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                            {term.modelo || 'EQUIPAMENTO DEVOLVIDO'}
                          </span>
                          {term.af && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">
                              AF: {term.af}
                            </span>
                          )}
                        </div>
                        {term.motivoDevolucao && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                            <strong>Motivo:</strong> {term.motivoDevolucao}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {term.estadoConservacaoDevolucao && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              Estado: {term.estadoConservacaoDevolucao}
                            </span>
                          )}
                          {term.recebidoPor && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Recebido: {term.recebidoPor}
                            </span>
                          )}
                        </div>
                        {term.acessoriosDevolvidos && term.acessoriosDevolvidos.length > 0 && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                            <strong>Acessórios:</strong> {term.acessoriosDevolvidos.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : isTab ? (
                      <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                            {term.modelo || 'TABLET CORPORATIVO'}
                          </span>
                          {term.af && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">
                              AF: {term.af}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              term.comCarregador
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {term.comCarregador ? '✓ Carregador' : 'Sem Carregador'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              term.comCapaProtecao
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {term.comCapaProtecao ? '✓ Capa' : 'Sem Capa'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              term.comCaneta
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {term.comCaneta ? '✓ Caneta' : 'Sem Caneta'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                          <div>IMEI: {term.imeiTablet || term.imeiCelular || term.imeiChip || '-'}</div>
                        </div>
                      </div>
                    ) : isCell ? (
                      <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                            {term.modelo || 'APENAS CHIP'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              term.comCarregador
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {term.comCarregador ? 'Com Carregador' : 'Sem Carregador'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
                          <div>Chip: {term.imeiChip || '-'}</div>
                          <div>Aparelho: {term.imeiCelular ?? '0'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-[#141822] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                            {term.modelo || 'VOSTRO 3480'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
                          <span>{term.processador || 'Core i5'}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span>{term.memoria || '8 GB'}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span>{term.capacidadeHD || 'SSD 256 GB'}</span>
                        </div>
                      </div>
                    )}

                    {/* Centro de Custo e Data */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-semibold" title={term.centroCusto ? `Centro de Custo: ${getCanonicalCC(term.centroCusto)}` : 'Centro de Custo não informado'}>
                          {getCanonicalCC(term.centroCusto)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{term.cidade || (isCell || isTab ? 'Recife' : 'Escada, PE')}, {formatDateBR(isDev ? (term.dataDevolucaoEfetiva || term.dataEmissao) : term.dataEmissao)}</span>
                      </div>
                    </div>

                    {/* Checklists Summary Badges (Notebook) */}
                    {!isCell && !isTab && !isDev && (
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
                    )}

                    {/* METADADO DE RASTREABILIDADE DE PDF NO CARD */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-orange-500" />
                          Rastreabilidade de PDF:
                        </span>
                        {term.ultimoPdfDownloadCount && term.ultimoPdfDownloadCount > 1 && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold lowercase">
                            {term.ultimoPdfDownloadCount}x gerado
                          </span>
                        )}
                      </div>

                      {term.ultimoPdfGeradoEm ? (
                        <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/50 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 font-mono text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {formatDateTimeBR(term.ultimoPdfGeradoEm)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate" title={term.ultimoPdfGeradoPor}>
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Por: <strong className="text-slate-800 dark:text-slate-100">{term.ultimoPdfGeradoPor || 'Sistema'}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141822] border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>PDF ainda não gerado ou baixado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-3 bg-slate-50/80 dark:bg-[#161b26] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handlePrintTerm(term)}
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
        )
      ) : (
        /* Empty State */
        <div className="p-10 sm:p-14 text-center bg-white dark:bg-[#1a1f2c] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
            {activeCategory === 'devolucao' ? (
              <RotateCcw className="w-8 h-8" />
            ) : activeCategory === 'tablet' ? (
              <Tablet className="w-8 h-8" />
            ) : activeCategory === 'celular' ? (
              <Smartphone className="w-8 h-8" />
            ) : (
              <Laptop className="w-8 h-8" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchQuery
                ? 'Nenhum termo encontrado na busca'
                : activeCategory === 'devolucao'
                ? 'Nenhum termo de devolução registrado ainda'
                : activeCategory === 'tablet'
                ? 'Nenhum termo de tablet corporativo gerado ainda'
                : activeCategory === 'celular'
                ? 'Nenhum termo de celular corporativo emitido ainda'
                : 'Nenhum termo de notebook gerado ainda'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {searchQuery
                ? 'Verifique os termos digitados ou limpe a busca para visualizar todos os termos emitidos.'
                : activeCategory === 'devolucao'
                ? 'Registre termos de devolução para desligamentos, substituição de máquinas, manutenções ou encerramento de obras com rastreabilidade completa.'
                : activeCategory === 'tablet'
                ? 'Emita e imprima termos de responsabilidade e conservação para tablets corporativos com acessórios (capa, carregador e caneta) no modelo oficial RG.TI.003.'
                : activeCategory === 'celular'
                ? 'Emita e imprima termos de aceitação e conservação para chips e aparelhos celulares corporativos no modelo padrão RG.TI.002.'
                : 'Esta área é dedicada para emitir e imprimir os termos de responsabilidade oficiais (RG.TI.001) para entrega de notebooks aos colaboradores.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeCategory === 'devolucao'
                  ? 'Registrar Termo de Devolução'
                  : activeCategory === 'tablet'
                  ? 'Gerar Termo de Tablet'
                  : activeCategory === 'celular'
                  ? 'Gerar Termo de Celular'
                  : 'Gerar Termo de Notebook'}
              </span>
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal de Criação / Edição */}
      <ResponsibilityTermModal
        isOpen={isModalOpen}
        term={editingTerm}
        defaultCategory={
          activeCategory === 'devolucao'
            ? 'devolucao'
            : activeCategory === 'tablet'
            ? 'tablet'
            : activeCategory === 'celular'
            ? 'celular'
            : 'notebook'
        }
        initialReturnType={preselectedReturnType}
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
          autoPrint={shouldAutoPrint}
          onTrackPdfGenerated={handleTrackPdfGenerated}
          onClose={() => {
            setPrintTerm(null);
            setShouldAutoPrint(false);
          }}
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
              <strong className="text-slate-900">{termToDelete.colaboradorNome}</strong> (
              {isTermCelular(termToDelete)
                ? termToDelete.numeroLinha || termToDelete.numeroTermo
                : termToDelete.af
                ? `AF: ${termToDelete.af}`
                : termToDelete.numeroTermo}
              )?
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

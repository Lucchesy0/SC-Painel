import React from 'react';
import { Printer, X } from 'lucide-react';
import { ResponsibilityTerm } from '../types';
import { formatDateBR } from '../utils/dateUtils';

interface ResponsibilityTermPrintViewProps {
  term: ResponsibilityTerm;
  onClose: () => void;
}

export const ResponsibilityTermPrintView: React.FC<ResponsibilityTermPrintViewProps> = ({
  term,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isChecked = (val?: boolean) => !!val;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-[850px] bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:rounded-none">
        
        {/* Actions bar (Hidden in Print) */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Visualização do Termo Oficial · Modelo RG.TI.001 Rev00</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Imprimir ou Salvar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Outer page sheet container */}
        <div className="p-4 sm:p-8 bg-slate-100 print:p-0 print:bg-white flex justify-center">
          
          {/* Exact Document Paper with Outer Border (matches PDF template) */}
          <div className="w-full max-w-[760px] bg-white text-slate-900 p-8 sm:p-10 border border-slate-400 print:border print:border-slate-400 font-sans text-xs leading-relaxed select-text shadow-sm print:shadow-none">
            
            {/* Header: Orange Notebook Icon on Left + Centered Title */}
            <div className="relative flex items-center justify-center mb-8 pt-2">
              {/* Notebook Icon in Orange Tile (left aligned) */}
              <div className="absolute left-0 top-0">
                <div className="w-14 h-14 bg-gradient-to-b from-[#f25c27] to-[#e04510] rounded-xl flex items-center justify-center shadow-xs">
                  <svg
                    viewBox="0 0 32 32"
                    className="w-8 h-8 text-white fill-none stroke-current stroke-[2.2] stroke-linecap-round stroke-linejoin-round"
                  >
                    <rect x="5" y="6" width="22" height="15" rx="2" />
                    <line x1="2" y1="25" x2="30" y2="25" />
                    <line x1="12" y1="21" x2="20" y2="21" />
                    <circle cx="16" cy="13.5" r="1.5" fill="currentColor" />
                  </svg>
                </div>
              </div>

              {/* Centered Document Title */}
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
                  Termo de Responsabilidade
                </h1>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 font-sans">
                  Notebook
                </h2>
              </div>
            </div>

            {/* Employee Name (in bold red font, exactly like template) */}
            <div className="mb-2">
              <span className="text-[#d32f2f] font-bold text-sm sm:text-base tracking-tight">
                {term.colaboradorNome || 'Nome do Colaborador'}
              </span>
            </div>

            {/* Acceptance Statement */}
            <p className="text-slate-800 text-xs sm:text-[13px] mb-4 leading-normal">
              mediante este instrumento de aceitação, responsabiliza-se pelo uso e conservação do aparelho notebook:
            </p>

            {/* Hardware Specification block */}
            <div className="space-y-1.5 mb-6 text-xs sm:text-[12px] font-sans">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-tight">MODELO:</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {term.modelo || 'VOSTRO 3480'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-tight">PROCESSADOR:</span>
                <span className="font-medium text-slate-900">
                  {term.processador || 'Intel Core I5'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-tight">MEMÓRIA INSTALADA:</span>
                <span className="font-medium text-slate-900">
                  {term.memoria || '8 GB'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-tight">CAPACIDADE DE HD:</span>
                <span className="font-medium text-slate-900">
                  {term.capacidadeHD || 'SSD 256 GB'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-tight">AF:</span>
                <span className="font-semibold text-slate-900">
                  {term.af || term.numeroTermo?.replace(/^AF-/, '') || '-'}
                </span>
              </div>
            </div>

            {/* Legal Commitment Paragraphs */}
            <div className="space-y-3 mb-6 text-xs sm:text-[12px] text-slate-800 leading-normal">
              <p>
                Está em perfeita condição de uso e a partir dessa data encontra-se sob minha responsabilidade, comprometendo-me a devolvê-los em perfeito estado.
              </p>
              <p>
                Em caso de extravio e/ou dano, total ou parcial, do material acima, fico obrigado a ressarcir o proprietário dos prejuízos decorrentes.
              </p>
            </div>

            {/* TABLE 1: CHECKLIST DE VERIFICAÇÃO (7 itens) */}
            <div className="mb-4">
              <table className="w-full border-collapse border border-slate-900 text-[11px] sm:text-xs">
                <thead>
                  <tr>
                    <th
                      colSpan={3}
                      className="border border-slate-900 py-1 px-2 text-center font-bold tracking-wider uppercase text-slate-900 bg-slate-50 print:bg-white"
                    >
                      CHECKLIST DE VERIFICAÇÃO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.oneDrive) ? 'X' : ''}
                        </span>
                        <span>One drive</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.teams) ? 'X' : ''}
                        </span>
                        <span>Teams</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.office365) ? 'X' : ''}
                        </span>
                        <span>Office 365</span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.office2010) ? 'X' : ''}
                        </span>
                        <span>Office 2010</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.bitdefender) ? 'X' : ''}
                        </span>
                        <span>Bitdefender</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.java) ? 'X' : ''}
                        </span>
                        <span>Java</span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.fortnet) ? 'X' : ''}
                        </span>
                        <span>Fortnet</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.anydesk) ? 'X' : ''}
                        </span>
                        <span>Anydesk</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.checklistVerificacao?.sharepoint) ? 'X' : ''}
                        </span>
                        <span>Sharepoint</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABLE 2: OPCIONAIS (4 itens) */}
            <div className="mb-6">
              <table className="w-full border-collapse border border-slate-900 text-[11px] sm:text-xs">
                <thead>
                  <tr>
                    <th
                      colSpan={4}
                      className="border border-slate-900 py-1 px-2 text-center font-bold tracking-wider uppercase text-slate-900 bg-slate-50 print:bg-white"
                    >
                      OPCIONAIS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 p-1.5 w-1/4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.opcionais?.zwcad) ? 'X' : ''}
                        </span>
                        <span>Zwcad</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.opcionais?.dwgNaviswork) ? 'X' : ''}
                        </span>
                        <span>DWG/Naviswork</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.opcionais?.powerBi) ? 'X' : ''}
                        </span>
                        <span>Power BI</span>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1.5 w-1/4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold shrink-0">
                          {isChecked(term.opcionais?.project) ? 'X' : ''}
                        </span>
                        <span>Project</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Centro de Custo do Colaborador */}
            <div className="mb-6 text-xs sm:text-[13px] flex items-center gap-2">
              <span className="font-medium text-slate-800">Centro de Custo:</span>
              <span className="font-semibold text-slate-900">
                {term.centroCusto || '-'}
              </span>
            </div>

            {/* Cidade e Data (Fixo: Escada, PE) */}
            <div className="mb-10 text-xs sm:text-[13px] text-slate-800 flex items-center gap-1.5">
              <span>{term.cidade || 'Escada, PE'},</span>
              <span className="font-medium">{formatDateBR(term.dataEmissao)}</span>
            </div>

            {/* Assinatura do Responsável */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 text-xs sm:text-[13px]">
                <span className="whitespace-nowrap font-medium text-slate-800">
                  Assinatura do Responsável:
                </span>
                <div className="border-b border-slate-900 flex-1 w-full h-8" />
              </div>
            </div>

            {/* Footer reference code (Bottom-right: RG.TI.001 Rev00 10ago2020) */}
            <div className="pt-6 flex justify-end">
              <span className="text-[11px] font-sans font-bold text-slate-700 tracking-tight">
                {term.codigoDocumento || 'RG.TI.001 Rev00 10ago2020'}
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

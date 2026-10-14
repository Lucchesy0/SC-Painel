import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Calendar, ChevronDown, FileText } from 'lucide-react';
import { ResponsibilityTerm } from '../types';
import { formatDateBR } from '../utils/dateUtils';

interface ResponsibilityTermPrintViewProps {
  term: ResponsibilityTerm;
  autoPrint?: boolean;
  onTrackPdfGenerated?: (term: ResponsibilityTerm) => void;
  onClose: () => void;
}

export function isTermDevolucao(term: ResponsibilityTerm): boolean {
  return (
    term.categoriaTermo === 'devolucao' ||
    term.tipo === 'Devolucao' ||
    term.status === 'Devolvido' ||
    Boolean(term.codigoDocumento?.includes('RG.TI.004')) ||
    Boolean(term.codigoDocumento?.toUpperCase().includes('DEV')) ||
    Boolean(term.tituloDocumento?.toLowerCase().includes('devolução')) ||
    Boolean(term.tipoDevolucao)
  );
}

export function isTermTablet(term: ResponsibilityTerm): boolean {
  if (isTermDevolucao(term)) return false;
  return (
    term.categoriaTermo === 'tablet' ||
    Boolean(term.codigoDocumento?.includes('RG.TI.003')) ||
    (Boolean(term.modelo) && /tablet|tab\b|ipad/i.test(term.modelo) && term.categoriaTermo !== 'celular' && term.categoriaTermo !== 'notebook')
  );
}

export function isTermCelular(term: ResponsibilityTerm): boolean {
  if (isTermDevolucao(term)) return false;
  if (isTermTablet(term)) return false;
  return (
    term.categoriaTermo === 'celular' ||
    Boolean(term.codigoDocumento?.includes('RG.TI.002')) ||
    (!term.processador && !term.memoria && (Boolean(term.numeroLinha) || Boolean(term.imeiChip)))
  );
}

/**
 * Gera o nome de arquivo padrão para salvar o PDF do termo conforme as regras:
 * - Devolução: "Termo Devolução - (nome e sobrenome que estiver no termo)" (Padrão exato do SharePoint RG.TI.004)
 * - Notebook: "Termo de notebook - (nome e sobrenome que estiver no termo)"
 * - Celular: "Termo de celular - (nome e sobrenome que estiver no termo)"
 * - Tablet: "Termo de tablet - (nome e sobrenome que estiver no termo)"
 */
export function getTermoPdfFileName(colaboradorNome?: string, categoria?: string): string {
  const raw = (colaboradorNome || '').trim();
  // Remove caracteres ilegais para nomes de arquivo no Windows/Linux/macOS
  const sanitized = raw.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
  const prefix =
    categoria === 'devolucao'
      ? 'Termo Devolução'
      : categoria === 'tablet'
      ? 'Termo de tablet'
      : categoria === 'celular'
      ? 'Termo de celular'
      : 'Termo de notebook';
  
  if (!sanitized) {
    return prefix;
  }
  
  return `${prefix} - ${sanitized}`;
}

export const ResponsibilityTermPrintView: React.FC<ResponsibilityTermPrintViewProps> = ({
  term,
  autoPrint = false,
  onTrackPdfGenerated,
  onClose,
}) => {
  const isDevolucao = isTermDevolucao(term);
  const isTablet = !isDevolucao && isTermTablet(term);
  const isCelular = !isDevolucao && !isTablet && isTermCelular(term);
  const categoryKey = isDevolucao ? 'devolucao' : isTablet ? 'tablet' : isCelular ? 'celular' : 'notebook';

  const pdfFileName = getTermoPdfFileName(term.colaboradorNome, categoryKey);

  // Formatações específicas para Termo de Devolução (RG.TI.004)
  const tipoDevolucaoDisplay = (() => {
    const raw = term.tipoDevolucao || 'Celular';
    if (raw === 'desligamento' || raw === 'substituicao' || raw === 'manutencao') {
      if (term.modelo && /galaxy|iphone|celular|moto|xiaomi/i.test(term.modelo)) return 'Celular';
      if (term.modelo && /modem/i.test(term.modelo)) return 'Modem';
      return 'Notebook';
    }
    return raw;
  })();

  const detalhesFormatted = (() => {
    if (term.detalhesDevolucao && term.detalhesDevolucao.trim()) {
      return term.detalhesDevolucao.trim();
    }
    
    // Constrói de acordo com o template padrão caso venha com campos isolados
    const tipo = tipoDevolucaoDisplay;
    const blocks: string[] = [];

    if (tipo === 'Notebook' || tipo.includes('Notebook')) {
      blocks.push(
        `Notebook\nModelo: ${term.modelo || 'Dell Latitude'}\nMarca: ${term.fabricante || 'Dell'}\nAF: ${term.af || '-'}`
      );
    }
    if (tipo === 'Celular' || tipo.includes('Celular')) {
      blocks.push(
        `Celular\nModelo: ${term.modelo || 'Galaxy A03 Core'}\nImei chip:${term.imeiChip || '-'}\nImei Celular:${term.imeiCelular || '-'}`
      );
    }
    if (tipo === 'Modem' || tipo.includes('Modem')) {
      blocks.push(
        `Modem\nModelo: ${term.modelo || 'Huawei 4G Wi-Fi'}\nImei Chip:${term.imeiChip || '-'}\nImei Celular:${term.imeiCelular || '-'}`
      );
    }

    if (blocks.length > 0) {
      return blocks.join('\n\n');
    }

    return `${term.modelo || 'Equipamento TI'}\nAF: ${term.af || '-'}`;
  })();

  const observacaoText = (() => {
    if (term.observacaoDevolucao && term.observacaoDevolucao.trim()) {
      return term.observacaoDevolucao.trim();
    }
    if (term.observacoesDevolucao && term.observacoesDevolucao.trim()) {
      return term.observacoesDevolucao.trim();
    }
    if (term.comCarregador) {
      return 'Com carregador.';
    }
    return 'Com carregador.';
  })();

  // Configura a impressão e o título dinâmico da página (usado pelos navegadores como nome do arquivo PDF)
  useEffect(() => {
    document.body.classList.add('printing-term-active');
    document.documentElement.classList.add('printing-term-active');

    const originalTitle = document.title;
    // Define o título que o navegador exibirá na caixa de diálogo "Salvar como PDF"
    document.title = pdfFileName;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    let timer: NodeJS.Timeout | null = null;
    if (autoPrint) {
      timer = setTimeout(() => {
        onTrackPdfGenerated?.(term);
        window.print();
      }, 350);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
      document.body.classList.remove('printing-term-active');
      document.documentElement.classList.remove('printing-term-active');
      document.title = originalTitle;
    };
  }, [pdfFileName, autoPrint, term, onTrackPdfGenerated, onClose]);

  const handlePrint = () => {
    // Garante que o título do documento esteja no padrão solicitado antes de abrir o diálogo do navegador
    document.title = pdfFileName;
    onTrackPdfGenerated?.(term);
    window.print();
  };

  const isChecked = (val?: boolean) => !!val;

  return createPortal(
    <div
      id="printable-term-modal"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div className="printable-modal-inner relative w-full max-w-[850px] bg-white text-slate-900 shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none">
        
        {/* Actions bar (Oculto na Impressão / PDF) */}
        <div className="print-hide relative shrink-0 px-4 sm:px-6 py-3.5 bg-slate-900 text-white print:hidden border-b border-slate-800">
          {/* Botão X de fechar fixado no canto superior direito */}
          <button
            type="button"
            onClick={onClose}
            id="btnCloseTermPrintModal"
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer z-20"
            title="Fechar Visualização (ESC)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {isDevolucao
                    ? 'Visualização do Termo Oficial · Devolução RG.TI.004 Rev00 (Folha Única A4)'
                    : isTablet
                    ? 'Visualização do Termo Oficial · Tablet Corporativo RG.TI.003 Rev00 (Folha Única A4)'
                    : isCelular
                    ? 'Visualização do Termo Oficial · Celular Corporativo RG.TI.002 Rev00 (Folha Única A4)'
                    : 'Visualização do Termo Oficial · Notebook RG.TI.001 Rev00 (Folha Única A4)'}
                </span>
              </div>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="text-[11px] text-orange-400 font-mono bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 select-all" title="Nome que será salvo no arquivo PDF">
                PDF: {pdfFileName}.pdf
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                id="btnPrintTermAction"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95 rounded-lg"
                title={`Imprimir ou Salvar como "${pdfFileName}.pdf"`}
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Outer page sheet container */}
        <div className="printable-outer-container p-4 sm:p-8 bg-slate-100 print:p-0 print:bg-white flex justify-center">
          
          {/* Folha Oficial A4 Exata com borda externa */}
          <div
            id="printable-term-sheet"
            className="w-full max-w-[800px] min-h-[960px] bg-white text-slate-900 p-6 sm:p-9 print:p-6 border-2 border-slate-800 print:border-[1.8px] print:border-slate-900 font-sans text-sm select-text shadow-md print:shadow-none print:max-w-none print:m-0 flex flex-col justify-between"
          >
            {isDevolucao ? (
              /* ========================================================================= */
              /* MODELO OFICIAL TERMO DE DEVOLUÇÃO: RG.TI.004 Rev00 10ago2020              */
              /* Layout Direto Oficial: Formato estruturado conforme documento da empresa   */
              /* ========================================================================= */
              <div className="w-full flex flex-col justify-between h-full space-y-6">
                <div className="space-y-0 border border-slate-300 bg-white">
                  {/* Cabeçalho Oficial: 2 colunas com borda */}
                  <div className="w-full border-b border-slate-300 bg-white grid grid-cols-12 select-none">
                    {/* Coluna 1: Logo ou Ícone Oficial de Devolução */}
                    <div className="col-span-3 sm:col-span-2 border-r border-slate-300 p-3 sm:p-4 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
                        <FileText className="w-6 h-6 stroke-[2]" />
                      </div>
                    </div>

                    {/* Coluna 2: Título Central */}
                    <div className="col-span-9 sm:col-span-10 p-3 sm:p-4 flex items-center justify-center text-center">
                      <h1 className="text-xl sm:text-2xl print:text-xl font-bold tracking-normal text-slate-900 font-sans">
                        Termo de Devolução
                      </h1>
                    </div>
                  </div>

                  {/* Seção: Dados do Usuário/Devolução */}
                  <div className="p-4 sm:p-5 border-b border-slate-300 bg-white space-y-3.5">
                    {/* Título da Seção com linha laranja oficial */}
                    <div className="border-b-2 border-orange-500 pb-1">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 font-sans">
                        Dados do Usuário/Devolução
                      </h2>
                    </div>

                    {/* Campos Diretos Estruturados */}
                    <div className="space-y-2.5 text-xs sm:text-[13px] print:text-[12px] font-sans pt-1">
                      {/* Nome Completo */}
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 sm:col-span-3 font-semibold text-slate-800">
                          Nome Completo:
                        </div>
                        <div className="col-span-9 sm:col-span-9 px-3 py-1.5 border border-slate-300 rounded-sm font-medium text-slate-900 bg-white shadow-2xs">
                          {term.colaboradorNome || '—'}
                        </div>
                      </div>

                      {/* Tipo Devolução */}
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 sm:col-span-3 font-semibold text-slate-800">
                          Tipo Devolução:
                        </div>
                        <div className="col-span-9 sm:col-span-9 px-3 py-1.5 border border-slate-300 rounded-sm font-medium text-slate-900 bg-white shadow-2xs">
                          {term.tipoDevolucao || 'Celular'}
                        </div>
                      </div>

                      {/* Data Termo */}
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 sm:col-span-3 font-semibold text-slate-800">
                          Data Termo:
                        </div>
                        <div className="col-span-9 sm:col-span-9 px-3 py-1.5 border border-slate-300 rounded-sm font-medium text-slate-900 bg-white shadow-2xs">
                          {formatDateBR(term.dataEmissao || term.dataDevolucaoEfetiva)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Detalhes da Devolução */}
                  <div className="p-4 sm:p-5 border-b border-slate-300 bg-white">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-3 sm:col-span-3 font-semibold text-slate-800 text-xs sm:text-[13px] print:text-[12px] pt-1 font-sans">
                        Detalhes da Devolução:
                      </div>
                      <div className="col-span-9 sm:col-span-9 p-3.5 border border-slate-300 rounded-sm font-sans text-xs sm:text-[13px] print:text-[12px] text-slate-900 whitespace-pre-wrap leading-relaxed min-h-[160px] bg-white shadow-2xs">
                        {detalhesFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Seção: Observação */}
                  <div className="p-4 sm:p-5 bg-white">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3 sm:col-span-3 font-semibold text-slate-800 text-xs sm:text-[13px] print:text-[12px] font-sans">
                        Observação:
                      </div>
                      <div className="col-span-9 sm:col-span-9 px-3.5 py-2.5 border border-slate-300 rounded-sm font-sans text-xs sm:text-[13px] print:text-[12px] text-slate-900 whitespace-pre-wrap bg-white shadow-2xs">
                        {observacaoText || 'Com carregador.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé e Assinatura */}
                <div className="space-y-8 pt-4">
                  {/* Bloco de Assinatura Centralizado do Usuário */}
                  <div className="flex justify-center pt-8 print:pt-12">
                    <div className="flex flex-col items-center text-center text-xs sm:text-[13px] print:text-[12px] w-full max-w-[340px]">
                      <div className="w-full border-b border-slate-900 mb-2" />
                      <span className="font-bold text-slate-900">
                        {term.colaboradorNome || 'Nome do Usuário'}
                      </span>
                      <span className="text-slate-700 text-xs">Usuário</span>
                    </div>
                  </div>

                  {/* Código do Documento e Revisão no Canto Inferior Direito */}
                  <div className="text-right text-[11px] font-sans text-slate-600 print:text-slate-800 select-none pr-1">
                    RG.TI.004 Rev00 10ago2020
                  </div>
                </div>
              </div>
            ) : isTablet ? (
              /* ========================================================================= */
              /* MODELO OFICIAL TABLET CORPORATIVO: RG.TI.003 Rev00 10ago2020              */
              /* ========================================================================= */
              <>
                <div className="flex flex-col gap-4 sm:gap-5 print:gap-4">
                  {/* Header Oficial: Logo MCM Oficial + Título */}
                  <div className="relative flex items-center justify-center pt-1 min-h-[52px] print:min-h-[48px] pb-2 border-b border-slate-200 print:border-none">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                      <img
                        src="/logo-mcm.png"
                        alt="Logo MCM"
                        referrerPolicy="no-referrer"
                        className="h-9 sm:h-10 print:h-9 w-auto max-w-[170px] print:max-w-[160px] object-contain select-none"
                      />
                    </div>

                    <div className="text-center px-28 print:px-24">
                      <h1 className="text-xl sm:text-2xl print:text-2xl font-bold tracking-tight text-slate-900 font-sans leading-tight">
                        Termo de Responsabilidade
                      </h1>
                      <h2 className="text-lg sm:text-xl print:text-xl font-bold tracking-tight text-slate-800 font-sans leading-tight">
                        Tablet Corporativo
                      </h2>
                    </div>
                  </div>

                  {/* Nome do Colaborador (Em destaque vermelho) */}
                  <div>
                    <span className="text-[#d32f2f] font-bold text-base sm:text-lg print:text-[15px] tracking-tight">
                      {term.colaboradorNome || 'Nome do Colaborador'}
                    </span>
                  </div>

                  {/* Parágrafo de Aceitação */}
                  <p className="text-slate-800 text-xs sm:text-[13px] print:text-[12px] leading-relaxed">
                    mediante este instrumento de aceitação, responsabiliza-se pelo uso e conservação do aparelho Tablet e respectivos acessórios:
                  </p>

                  {/* Bloco de Especificações Técnicas do Tablet */}
                  <div className="space-y-2 print:space-y-1.5 text-xs sm:text-[13px] print:text-[12px] font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-52 print:w-48 shrink-0">MODELO:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.modelo || 'SAMSUNG GALAXY TAB'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-52 print:w-48 shrink-0">AF / PATRIMÔNIO:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {term.af || term.numeroTermo?.replace(/^TAB-/, '') || '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-52 print:w-48 shrink-0">COM CARREGADOR:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.comCarregador !== false ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-52 print:w-48 shrink-0">CAPA DE PROTEÇÃO:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.comCapaProtecao !== false ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-52 print:w-48 shrink-0">CANETA TOUCH / S-PEN:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.comCaneta ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-52 print:w-48 shrink-0">IMEI:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {term.imeiTablet || term.imeiCelular || term.imeiChip || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Parágrafos de Compromisso Legal */}
                  <div className="space-y-2.5 print:space-y-2 text-xs sm:text-[13px] print:text-[12px] text-slate-800 leading-relaxed pt-2">
                    <p>
                      Está em perfeita condição de uso e a partir dessa data encontra-se sob minha responsabilidade, comprometendo-me a devolvê-los em perfeito estado.
                    </p>
                    <p>
                      Em caso de extravio e/ou dano, total ou parcial, do material acima, fico obrigado a ressarcir o proprietário dos prejuízos decorrentes.
                    </p>
                  </div>
                </div>

                {/* Bloco Inferior Tablet */}
                <div className="flex flex-col gap-4 sm:gap-5 print:gap-4 pt-4 sm:pt-6 print:pt-4 border-t border-slate-200 print:border-none">
                  <div className="text-xs sm:text-[13px] print:text-[12px] flex items-center gap-2">
                    <span className="font-medium text-slate-800">Centro de Custo:</span>
                    <span className="font-semibold text-slate-900">
                      {term.centroCusto || '-'}
                    </span>
                  </div>

                  <div className="text-xs sm:text-[13px] print:text-[12px] text-slate-800 flex items-center gap-1.5">
                    <span>{term.cidade || 'Recife'},</span>
                    <span className="font-medium">{formatDateBR(term.dataEmissao)}</span>
                  </div>

                  <div className="pt-3 print:pt-2">
                    <div className="flex flex-row items-end gap-2 text-xs sm:text-[13px] print:text-[12px] w-full">
                      <span className="whitespace-nowrap font-medium text-slate-800 shrink-0">
                        Assinatura do Responsável:
                      </span>
                      <div className="border-b border-slate-900 flex-1 h-6 print:h-5" />
                    </div>
                  </div>

                  <div className="pt-3 print:pt-2 flex justify-end">
                    <span className="text-[11px] print:text-[10px] font-sans font-bold text-slate-700 tracking-tight">
                      {term.codigoDocumento || 'RG.TI.003 Rev00 10ago2020'}
                    </span>
                  </div>
                </div>
              </>
            ) : isCelular ? (
              /* ========================================================================= */
              /* MODELO OFICIAL CELULAR CORPORATIVO: RG.TI.002 Rev00 10ago2020             */
              /* ========================================================================= */
              <>
                <div className="flex flex-col gap-4 sm:gap-5 print:gap-4">
                  {/* Header Oficial */}
                  <div className="relative flex items-center justify-center pt-1 min-h-[52px] print:min-h-[48px] pb-2 border-b border-slate-200 print:border-none">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                      <img
                        src="/logo-mcm.png"
                        alt="Logo MCM"
                        referrerPolicy="no-referrer"
                        className="h-9 sm:h-10 print:h-9 w-auto max-w-[170px] print:max-w-[160px] object-contain select-none"
                      />
                    </div>

                    <div className="text-center px-28 print:px-24">
                      <h1 className="text-xl sm:text-2xl print:text-2xl font-bold tracking-tight text-slate-900 font-sans leading-tight">
                        Termo de Responsabilidade
                      </h1>
                      <h2 className="text-lg sm:text-xl print:text-xl font-bold tracking-tight text-slate-800 font-sans leading-tight">
                        Celular Corporativo
                      </h2>
                    </div>
                  </div>

                  {/* Nome do Colaborador (Em vermelho forte destacado) */}
                  <div>
                    <span className="text-[#d32f2f] font-bold text-base sm:text-lg print:text-[15px] tracking-tight">
                      {term.colaboradorNome || 'Nome do Colaborador'}
                    </span>
                  </div>

                  {/* Parágrafo de Aceitação Celular */}
                  <p className="text-slate-800 text-xs sm:text-[13px] print:text-[12px] leading-relaxed">
                    mediante este instrumento de aceitação, responsabiliza-se pelo uso e conservação do Celular:
                  </p>

                  {/* Bloco de Especificações Técnicas de Celular / Chip */}
                  <div className="space-y-2 print:space-y-1.5 text-xs sm:text-[13px] print:text-[12px] font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">MODELO:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.modelo || 'APENAS CHIP'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">COM CARREGADOR:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.comCarregador ? 'SIM' : 'NÃO'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">IMEI CHIP:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {term.imeiChip || '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">IMEI CELULAR:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {term.imeiCelular ?? '0'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">NÚMERO:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {term.numeroLinha || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Parágrafos Legais */}
                  <div className="space-y-2.5 print:space-y-2 text-xs sm:text-[13px] print:text-[12px] text-slate-800 leading-relaxed pt-2">
                    <p>
                      A partir dessa data encontra-se sob minha responsabilidade, comprometendo-me a devolvê-lo em perfeito estado.
                    </p>
                    <p>
                      Em caso de extravio e/ou dano, total ou parcial, do material acima, fico obrigado a ressarcir o proprietário dos prejuízos decorrentes.
                    </p>
                  </div>
                </div>

                {/* Bloco Inferior Celular */}
                <div className="flex flex-col gap-4 sm:gap-5 print:gap-4 pt-4 sm:pt-6 print:pt-4 border-t border-slate-200 print:border-none">
                  {/* Centro de Custo */}
                  <div className="text-xs sm:text-[13px] print:text-[12px] flex items-center gap-2">
                    <span className="font-medium text-slate-800">Centro de Custo:</span>
                    <span className="font-semibold text-slate-900">
                      {term.centroCusto || '-'}
                    </span>
                  </div>

                  {/* Cidade e Data */}
                  <div className="text-xs sm:text-[13px] print:text-[12px] text-slate-800 flex items-center gap-1.5">
                    <span>{term.cidade || 'Recife'},</span>
                    <span className="font-medium">{formatDateBR(term.dataEmissao)}</span>
                  </div>

                  {/* Assinatura do Responsável */}
                  <div className="pt-3 print:pt-2">
                    <div className="flex flex-row items-end gap-2 text-xs sm:text-[13px] print:text-[12px] w-full">
                      <span className="whitespace-nowrap font-medium text-slate-800 shrink-0">
                        Assinatura do Responsável:
                      </span>
                      <div className="border-b border-slate-900 flex-1 h-6 print:h-5" />
                    </div>
                  </div>

                  {/* Código de Referência Documental */}
                  <div className="pt-3 print:pt-2 flex justify-end">
                    <span className="text-[11px] print:text-[10px] font-sans font-bold text-slate-700 tracking-tight">
                      {term.codigoDocumento || 'RG.TI.002 Rev00 10ago2020'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* ========================================================================= */
              /* MODELO OFICIAL NOTEBOOK: RG.TI.001 Rev00 10ago2020                        */
              /* ========================================================================= */
              <>
                <div className="flex flex-col gap-3.5 sm:gap-4 print:gap-3">
                  {/* Header: Logo MCM Oficial à Esquerda + Título Centralizado */}
                  <div className="relative flex items-center justify-center pt-1 min-h-[52px] print:min-h-[48px] pb-1 border-b border-slate-200 print:border-none">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                      <img
                        src="/logo-mcm.png"
                        alt="Logo MCM"
                        referrerPolicy="no-referrer"
                        className="h-9 sm:h-10 print:h-9 w-auto max-w-[170px] print:max-w-[160px] object-contain select-none"
                      />
                    </div>

                    <div className="text-center px-28 print:px-24">
                      <h1 className="text-xl sm:text-2xl print:text-2xl font-bold tracking-tight text-slate-900 font-sans leading-tight">
                        Termo de Responsabilidade
                      </h1>
                      <h2 className="text-lg sm:text-xl print:text-xl font-bold tracking-tight text-slate-800 font-sans leading-tight">
                        Notebook
                      </h2>
                    </div>
                  </div>

                  {/* Nome do Colaborador (Em vermelho forte destacado) */}
                  <div>
                    <span className="text-[#d32f2f] font-bold text-base sm:text-lg print:text-[15px] tracking-tight">
                      {term.colaboradorNome || 'Nome do Colaborador'}
                    </span>
                  </div>

                  {/* Parágrafo de Aceitação */}
                  <p className="text-slate-800 text-xs sm:text-[13px] print:text-[12px] leading-relaxed">
                    mediante este instrumento de aceitação, responsabiliza-se pelo uso e conservação do aparelho notebook:
                  </p>

                  {/* Bloco de Especificações Técnicas de Hardware */}
                  <div className="space-y-1.5 print:space-y-1 text-xs sm:text-[13px] print:text-[12px] font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">MODELO:</span>
                      <span className="font-semibold text-slate-900 uppercase">
                        {term.modelo || 'VOSTRO 3480'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">PROCESSADOR:</span>
                      <span className="font-medium text-slate-900">
                        {term.processador || 'Intel Core I5'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">MEMÓRIA INSTALADA:</span>
                      <span className="font-medium text-slate-900">
                        {term.memoria || '8 GB'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">CAPACIDADE DE HD:</span>
                      <span className="font-medium text-slate-900">
                        {term.capacidadeHD || 'SSD 256 GB'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-tight w-48 print:w-44 shrink-0">AF:</span>
                      <span className="font-semibold text-slate-900">
                        {term.af || term.numeroTermo?.replace(/^AF-/, '') || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Parágrafos de Compromisso Legal */}
                  <div className="space-y-1.5 print:space-y-1 text-xs sm:text-[12.5px] print:text-[11px] text-slate-800 leading-normal">
                    <p>
                      Está em perfeita condição de uso e a partir dessa data encontra-se sob minha responsabilidade, comprometendo-me a devolvê-los em perfeito estado.
                    </p>
                    <p>
                      Em caso de extravio e/ou dano, total ou parcial, do material acima, fico obrigado a ressarcir o proprietário dos prejuízos decorrentes.
                    </p>
                  </div>

                  {/* TABELA 1: CHECKLIST DE VERIFICAÇÃO */}
                  <div>
                    <table className="w-full border-collapse border border-slate-900 text-xs sm:text-[12.5px] print:text-[11px] table-fixed">
                      <thead>
                        <tr>
                          <th
                            colSpan={2}
                            className="border border-slate-900 py-1.5 print:py-1 px-2 text-center font-bold tracking-wider uppercase text-slate-900 bg-slate-100 print:bg-slate-50"
                          >
                            CHECKLIST DE VERIFICAÇÃO
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td
                            colSpan={2}
                            className="border border-slate-900 p-2 sm:p-2.5 print:p-1.5 bg-slate-50/70 print:bg-white text-slate-800 text-[11px] sm:text-xs print:text-[10px] leading-relaxed"
                          >
                            <span className="font-bold text-slate-900 uppercase">Softwares Padrão: </span>
                            <span>One drive, Teams, Bitdefender, Java, Fortnet, Anydesk, Sharepoint.</span>
                          </td>
                        </tr>

                        <tr>
                          <td className="border border-slate-900 p-2 sm:p-2.5 print:p-1.5 w-1/2 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex items-center justify-center w-4 h-4 print:w-3.5 print:h-3.5 border border-slate-900 text-[11px] font-bold shrink-0">
                                {isChecked(term.checklistVerificacao?.office2010) ? 'X' : ''}
                              </span>
                              <span className="font-semibold text-slate-900">Office 2010</span>
                            </div>
                          </td>
                          <td className="border border-slate-900 p-2 sm:p-2.5 print:p-1.5 w-1/2 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex items-center justify-center w-4 h-4 print:w-3.5 print:h-3.5 border border-slate-900 text-[11px] font-bold shrink-0">
                                {isChecked(term.checklistVerificacao?.office365) ? 'X' : ''}
                              </span>
                              <span className="font-semibold text-slate-900">Office 365</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* TABELA 2: OPCIONAIS */}
                  <div>
                    <table className="w-full border-collapse border border-slate-900 text-xs sm:text-[12.5px] print:text-[11px] table-fixed">
                      <thead>
                        <tr>
                          <th
                            colSpan={4}
                            className="border border-slate-900 py-1.5 print:py-1 px-2 text-center font-bold tracking-wider uppercase text-slate-900 bg-slate-100 print:bg-slate-50"
                          >
                            OPCIONAIS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-900 p-2 print:p-1.5 w-1/4 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 print:w-3.5 print:h-3.5 border border-slate-900 text-[11px] font-bold shrink-0">
                                {isChecked(term.opcionais?.zwcad) ? 'X' : ''}
                              </span>
                              <span className="truncate">ZWCAD</span>
                            </div>
                          </td>
                          <td className="border border-slate-900 p-2 print:p-1.5 w-1/4 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 print:w-3.5 print:h-3.5 border border-slate-900 text-[11px] font-bold shrink-0">
                                {isChecked(term.opcionais?.dwgNaviswork) ? 'X' : ''}
                              </span>
                              <span className="truncate">DWG/Naviswork</span>
                            </div>
                          </td>
                          <td className="border border-slate-900 p-2 print:p-1.5 w-1/4 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 print:w-3.5 print:h-3.5 border border-slate-900 text-[11px] font-bold shrink-0">
                                {isChecked(term.opcionais?.powerBi) ? 'X' : ''}
                              </span>
                              <span className="truncate">Power BI</span>
                            </div>
                          </td>
                          <td className="border border-slate-900 p-2 print:p-1.5 w-1/4 whitespace-nowrap overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 print:w-3.5 print:h-3.5 border border-slate-900 text-[11px] font-bold shrink-0">
                                {isChecked(term.opcionais?.project) ? 'X' : ''}
                              </span>
                              <span className="truncate">Project</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bloco Inferior Notebook */}
                <div className="flex flex-col gap-3.5 sm:gap-4 print:gap-3 pt-4 sm:pt-6 print:pt-3 border-t border-slate-200 print:border-none">
                  <div className="text-xs sm:text-[13px] print:text-[11.5px] flex items-center gap-2">
                    <span className="font-medium text-slate-800">Centro de Custo:</span>
                    <span className="font-semibold text-slate-900">
                      {term.centroCusto || '-'}
                    </span>
                  </div>

                  <div className="text-xs sm:text-[13px] print:text-[11.5px] text-slate-800 flex items-center gap-1.5">
                    <span>{term.cidade || 'Escada, PE'},</span>
                    <span className="font-medium">{formatDateBR(term.dataEmissao)}</span>
                  </div>

                  <div className="pt-2 print:pt-1">
                    <div className="flex flex-row items-end gap-2 text-xs sm:text-[13px] print:text-[11.5px] w-full">
                      <span className="whitespace-nowrap font-medium text-slate-800 shrink-0">
                        Assinatura do Responsável:
                      </span>
                      <div className="border-b border-slate-900 flex-1 h-6 print:h-5" />
                    </div>
                  </div>

                  <div className="pt-2 print:pt-1 flex justify-end">
                    <span className="text-[11px] print:text-[10px] font-sans font-bold text-slate-700 tracking-tight">
                      {term.codigoDocumento || 'RG.TI.001 Rev00 10ago2020'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

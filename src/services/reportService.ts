import jsPDF from 'jspdf';

const COMPANY_NAME = 'SANLE TRANSPORTES LOGISTICA LTDA - ME';
const COMPANY_CNPJ = 'CNPJ: 46.265.852/0001-01';
const LOGO_URL = '/logo.png';

// ── Logo base64 ───────────────────────────────────────────────────────────────
async function getLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Download via Blob ─────────────────────────────────────────────────────────
function downloadPDF(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  } catch {
    doc.save(filename);
  }
}

// ── Cabeçalho verde com logo ──────────────────────────────────────────────────
function addHeader(doc: jsPDF, logoBase64: string | null, subtitle?: string): number {
  const pageW = doc.internal.pageSize.getWidth();

  (doc as any).setFillColor(16, 185, 129);
  (doc as any).rect(0, 0, pageW, 58, 'F');

  if (logoBase64) {
    try {
      (doc as any).setFillColor(255, 255, 255);
      (doc as any).roundedRect(4, 3, 58, 52, 3, 3, 'F');
      doc.addImage(logoBase64, 'PNG', 5, 4, 56, 50);
    } catch { /* ignora se imagem falhar */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 68, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_CNPJ, 68, 29);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, 68, 40);
  }

  return 65;
}

// ── Rodapé com numeração de página ────────────────────────────────────────────
function addFooter(doc: jsPDF, pageNum?: number, totalPages?: number) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();

  // Linha divisória
  (doc as any).setDrawColor(203, 213, 225);
  (doc as any).setLineWidth(0.3);
  (doc as any).line(14, pageH - 13, pageW - 14, pageH - 13);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);

  const now = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em: ${now}`, 14, pageH - 7);
  doc.text('Sanle Transporte e Logística', pageW / 2, pageH - 7, { align: 'center' });

  if (pageNum !== undefined && totalPages !== undefined) {
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
  }
}

// ── Título de seção com linha verde ──────────────────────────────────────────
function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  y += 2;
  (doc as any).setDrawColor(16, 185, 129);
  (doc as any).setLineWidth(0.7);
  (doc as any).line(14, y, 196, y);
  return y + 6;
}

// ── Cards de resumo ───────────────────────────────────────────────────────────
interface SummaryCard {
  label: string;
  value: string | number;
  color?: [number, number, number];
}

function drawSummaryCards(doc: jsPDF, cards: SummaryCard[], startY: number): number {
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap    = 4;
  const count  = cards.length;
  const cardW  = (pageW - margin * 2 - gap * (count - 1)) / count;
  const cardH  = 22;

  cards.forEach((card, i) => {
    const x   = margin + i * (cardW + gap);
    const bg  = card.color ?? [16, 185, 129];
    const r   = bg[0], g = bg[1], b = bg[2];

    // Fundo com cor suave
    (doc as any).setFillColor(r, g, b, 0.12);
    (doc as any).setFillColor(
      Math.min(255, r + Math.round((255 - r) * 0.85)),
      Math.min(255, g + Math.round((255 - g) * 0.85)),
      Math.min(255, b + Math.round((255 - b) * 0.85)),
    );
    (doc as any).roundedRect(x, startY, cardW, cardH, 2, 2, 'F');

    // Borda esquerda colorida
    (doc as any).setFillColor(r, g, b);
    (doc as any).rect(x, startY, 3, cardH, 'F');

    // Valor em destaque
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(String(card.value), x + 7, startY + 13);

    // Label abaixo
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label.toUpperCase(), x + 7, startY + 19);
  });

  return startY + cardH + 6;
}

// ── Tabela manual ─────────────────────────────────────────────────────────────
interface TableOptions {
  startY: number;
  headers?: string[];
  rows: (string | number)[][];
  colWidths?: number[];
  rowHeight?: number;
  fontSize?: number;
  headerBg?: [number, number, number];
  altRowBg?: [number, number, number];
  labelCol?: boolean;
  pageNum?: number;
  totalPages?: number;
}

function drawTable(doc: jsPDF, opts: TableOptions): number {
  const {
    startY,
    headers,
    rows,
    colWidths,
    rowHeight = 9,
    fontSize = 9,
    headerBg = [16, 185, 129],
    altRowBg = [241, 245, 249],
    labelCol = false,
    pageNum,
    totalPages,
  } = opts;

  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const tableW  = pageW - marginL * 2;

  const colCount = rows[0]?.length ?? (headers?.length ?? 2);
  let widths: number[];
  if (colWidths) {
    widths = colWidths;
  } else if (labelCol && colCount === 2) {
    widths = [48, tableW - 48];
  } else {
    widths = Array(colCount).fill(tableW / colCount);
  }

  let y = startY;
  let currentPage = pageNum ?? 1;

  const renderHeader = (yPos: number) => {
    (doc as any).setFillColor(...headerBg);
    (doc as any).rect(marginL, yPos, tableW, rowHeight + 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    let x = marginL;
    headers!.forEach((h, i) => {
      doc.text(String(h), x + 2, yPos + rowHeight - 1);
      x += widths[i];
    });
    return yPos + rowHeight + 2;
  };

  if (headers && headers.length) {
    y = renderHeader(y);
  }

  rows.forEach((row, rowIdx) => {
    if (y + rowHeight > pageH - 18) {
      addFooter(doc, currentPage, totalPages);
      doc.addPage();
      currentPage++;
      y = 20;
      if (headers && headers.length) {
        y = renderHeader(y);
      }
    }

    // Fundo alternado
    if (rowIdx % 2 === 1) {
      (doc as any).setFillColor(...altRowBg);
    } else {
      (doc as any).setFillColor(255, 255, 255);
    }
    (doc as any).rect(marginL, y, tableW, rowHeight, 'F');

    // Linha divisória
    (doc as any).setDrawColor(226, 232, 240);
    (doc as any).setLineWidth(0.2);
    (doc as any).line(marginL, y + rowHeight, marginL + tableW, y + rowHeight);

    // Células
    let x = marginL;
    row.forEach((cell, colIdx) => {
      const isLabel = labelCol && colIdx === 0;
      doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(isLabel ? 16 : 30, isLabel ? 185 : 41, isLabel ? 129 : 59);

      const cellText = String(cell ?? '');
      const maxW     = widths[colIdx] - 4;
      const truncated =
        doc.getStringUnitWidth(cellText) * fontSize > maxW
          ? cellText.slice(0, Math.floor(maxW / (fontSize * 0.35))) + '…'
          : cellText;

      doc.text(truncated, x + 2, y + rowHeight - 2);
      x += widths[colIdx];
    });

    y += rowHeight;
  });

  return y + 4;
}

// ── Utilitários de cálculo ────────────────────────────────────────────────────
function calcColumnWidths(columns: string[], pageW = 210): number[] {
  const margin    = 14;
  const tableW    = pageW - margin * 2;
  const colCount  = columns.length;

  // Heurística: colunas de nomes/locais ganham mais espaço
  const weights = columns.map(col => {
    const lower = col.toLowerCase();
    if (/origem|destino|endereço|observ|descrição|empresa|passageiro|motorista/.test(lower)) return 2.2;
    if (/data|hora|status|placa|veículo/.test(lower)) return 1.2;
    return 1;
  });

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => Math.round((w / totalWeight) * tableW));
}

// ── Opções avançadas para o relatório geral ────────────────────────────────────
export interface GeneralReportOptions {
  /** Cards de resumo exibidos abaixo do cabeçalho */
  summaryCards?: SummaryCard[];
  /** Larguras manuais de coluna (mm). Se omitido, calculado automaticamente */
  colWidths?: number[];
  /** Período do relatório ex: "01/01/2024 – 31/01/2024" */
  period?: string;
  /** Texto livre exibido antes da tabela */
  notes?: string;
}

// ── PDF de corrida individual ─────────────────────────────────────────────────
export const generateTripPDF = async (trip: any) => {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoBase64 = await getLogoBase64();

  const osNum = trip.os_number
    ? String(trip.os_number).padStart(4, '0')
    : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

  let y = addHeader(doc, logoBase64, `Relatório de Serviço — OS #${osNum}`);

  y = addSectionTitle(doc, 'DADOS DO SERVIÇO', y);

  const kmTotal = (Number(trip.km_end) || 0) - (Number(trip.km_start) || 0);

  y = drawTable(doc, {
    startY: y,
    labelCol: true,
    rowHeight: 9,
    fontSize: 10,
    altRowBg: [248, 250, 252],
    rows: [
      ['Empresa:',         trip.company_name   || '—'],
      ['Motorista:',       trip.driver_name    || '—'],
      ['Veículo:',         `${trip.vehicle_model || ''} ${trip.plate ? `(${trip.plate})` : ''}`.trim() || '—'],
      ['Data:',            trip.date           || '—'],
      ['Passageiro:',      trip.user_name      || '—'],
      ['Origem:',          trip.origin         || '—'],
      ['Destino:',         trip.destination    || '—'],
      ['KM Inicial:',      String(trip.km_start ?? '—')],
      ['KM Final:',        String(trip.km_end   ?? '—')],
      ['KM Total:',        `${kmTotal} km`],
      ['Hora Finalizada:', trip.finished_at    || '—'],
      ['Horas Parado:',    `${trip.stopped_hours || 0}h${trip.stopped_reason ? ` — ${trip.stopped_reason}` : ''}`],
    ],
  });

  y += 4;

  if (trip.description) {
    y = addSectionTitle(doc, 'DESCRIÇÃO', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.description, 182) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  if (trip.observations) {
    y = addSectionTitle(doc, 'OBSERVAÇÕES', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.observations, 182) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  if (trip.signature_url) {
    if (y > 230) { addFooter(doc, 1, 1); doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'ASSINATURA DO PASSAGEIRO', y);
    try {
      doc.addImage(trip.signature_url, 'PNG', 14, y, 90, 36);
    } catch { /* imagem pode falhar */ }
    (doc as any).setDrawColor(148, 163, 184);
    (doc as any).setLineWidth(0.4);
    (doc as any).line(14, y + 38, 104, y + 38);
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(trip.user_name || '', 14, y + 43);
    y += 50;
  }

  addFooter(doc, 1, 1);
  downloadPDF(doc, `OS_${osNum}_${(trip.driver_name || 'corrida').replace(/\s+/g, '_')}.pdf`);
};

// ── PDF de relatório geral ────────────────────────────────────────────────────
export const generateGeneralReportPDF = async (
  title: string,
  data: (string | number)[][],
  columns: string[],
  options: GeneralReportOptions = {}
) => {
  const { summaryCards, colWidths, period, notes } = options;

  // Pré-calcular total de páginas estimado não é trivial sem renderizar,
  // então usamos uma segunda passagem com o número real de páginas ao final.
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoBase64 = await getLogoBase64();

  const subtitle = period ? `${title}  |  Período: ${period}` : title;
  let y = addHeader(doc, logoBase64, subtitle);

  // ── Cards de resumo ──────────────────────────────────────────────────────
  if (summaryCards && summaryCards.length > 0) {
    y = drawSummaryCards(doc, summaryCards, y);
  } else if (data.length > 0) {
    // Cards automáticos básicos
    const autoCards: SummaryCard[] = [
      { label: 'Total de Registros', value: data.length, color: [16, 185, 129] },
    ];

    // Tenta encontrar coluna de KM para somar
    const kmColIdx = columns.findIndex(c => /km.?total|quilôm/i.test(c));
    if (kmColIdx >= 0) {
      const totalKm = data.reduce((sum, row) => {
        const val = parseFloat(String(row[kmColIdx]).replace(/[^\d.]/g, ''));
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      autoCards.push({ label: 'KM Total Percorrido', value: `${totalKm.toLocaleString('pt-BR')} km`, color: [59, 130, 246] });
    }

    // Tenta encontrar coluna de motoristas únicos
    const driverColIdx = columns.findIndex(c => /motorista/i.test(c));
    if (driverColIdx >= 0) {
      const unique = new Set(data.map(r => String(r[driverColIdx]))).size;
      autoCards.push({ label: 'Motoristas', value: unique, color: [139, 92, 246] });
    }

    y = drawSummaryCards(doc, autoCards, y);
  }

  // ── Título da seção de dados ─────────────────────────────────────────────
  y = addSectionTitle(doc, 'LISTAGEM DE REGISTROS', y);

  // ── Notas opcionais ──────────────────────────────────────────────────────
  if (notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const noteLines = doc.splitTextToSize(notes, 182) as string[];
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4.5 + 4;
  }

  if (data.length === 0) {
    // Caixa de aviso
    (doc as any).setFillColor(248, 250, 252);
    (doc as any).roundedRect(14, y, 182, 18, 2, 2, 'F');
    (doc as any).setDrawColor(203, 213, 225);
    (doc as any).setLineWidth(0.3);
    (doc as any).roundedRect(14, y, 182, 18, 2, 2, 'S');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro encontrado para o período selecionado.', 105, y + 11, { align: 'center' });
    y += 24;
  } else {
    const resolvedWidths = colWidths ?? calcColumnWidths(columns);

    // Estimativa de páginas (1 página + quebras a cada ~27 linhas)
    const rowsPerPage = 27;
    const totalPages  = 1 + Math.max(0, Math.ceil((data.length - rowsPerPage) / rowsPerPage));

    y = drawTable(doc, {
      startY: y,
      headers: columns,
      rows: data,
      colWidths: resolvedWidths,
      rowHeight: 8,
      fontSize: 8,
      pageNum: 1,
      totalPages,
    });
  }

  // Rodapé da última página
  const totalPagesFinal = (doc as any).internal.getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= totalPagesFinal; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPagesFinal);
  }

  const safeTitle = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  downloadPDF(doc, `relatorio_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

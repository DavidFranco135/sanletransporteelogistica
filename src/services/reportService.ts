import jsPDF from 'jspdf';

const COMPANY_NAME = 'SANLE TRANSPORTES LOGISTICA LTDA - ME';
const COMPANY_CNPJ = 'CNPJ: 46.265.852/0001-01';
const LOGO_URL     = '/logo.png';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export interface Trip {
  id?:             string | number;
  os_number?:      string | number;
  date?:           string;
  finished_at?:    string;        // "HH:mm" ou "DD/MM/YYYY HH:mm"
  user_name?:      string;        // passageiro
  company_name?:   string;
  driver_name?:    string;
  km_start?:       number | string;
  km_end?:         number | string;
  origin?:         string;
  destination?:    string;
  vehicle_model?:  string;
  plate?:          string;
  description?:    string;
  observations?:   string;
  signature_url?:  string;
  stopped_hours?:  number;
  stopped_reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo base64
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Download PDF
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Cabeçalho verde com logo
// ─────────────────────────────────────────────────────────────────────────────
function addHeader(
  doc: jsPDF,
  logoBase64: string | null,
  subtitle?: string,
  extra?: string,
): number {
  const pageW = doc.internal.pageSize.getWidth();

  (doc as any).setFillColor(16, 185, 129);
  (doc as any).rect(0, 0, pageW, 54, 'F');

  if (logoBase64) {
    try {
      (doc as any).setFillColor(255, 255, 255);
      (doc as any).roundedRect(4, 3, 48, 48, 3, 3, 'F');
      doc.addImage(logoBase64, 'PNG', 5, 4, 46, 46);
    } catch { /* silencioso */ }
  }

  const textX = logoBase64 ? 58 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(COMPANY_NAME, textX, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(COMPANY_CNPJ, textX, 26);

  if (subtitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(subtitle, textX, 36);
  }
  if (extra) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(extra, textX, 45);
  }

  return 60;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rodapé com número de página
// ─────────────────────────────────────────────────────────────────────────────
function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();

  (doc as any).setDrawColor(203, 213, 225);
  (doc as any).setLineWidth(0.3);
  (doc as any).line(10, pageH - 12, pageW - 10, pageH - 12);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, pageH - 6);
  doc.text('Sanle Transporte e Logística', pageW / 2, pageH - 6, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 10, pageH - 6, { align: 'right' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Título de seção
// ─────────────────────────────────────────────────────────────────────────────
function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 10, y);
  y += 2;
  (doc as any).setDrawColor(16, 185, 129);
  (doc as any).setLineWidth(0.8);
  (doc as any).line(10, y, doc.internal.pageSize.getWidth() - 10, y);
  return y + 5;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabela
// ─────────────────────────────────────────────────────────────────────────────
interface TableOpts {
  startY:       number;
  headers:      string[];
  rows:         (string | number)[][];
  colWidths:    number[];
  rowHeight?:   number;
  fontSize?:    number;
  headerBg?:    [number, number, number];
  altRowBg?:    [number, number, number];
  marginL?:     number;
  onPageBreak?: (doc: jsPDF, y: number) => void;
}

function drawTable(doc: jsPDF, opts: TableOpts): number {
  const {
    startY,
    headers,
    rows,
    colWidths,
    rowHeight   = 8,
    fontSize    = 7.5,
    headerBg    = [16, 185, 129],
    altRowBg    = [241, 245, 249],
    marginL     = 10,
    onPageBreak,
  } = opts;

  const pageH  = doc.internal.pageSize.getHeight();
  const tableW = colWidths.reduce((s, w) => s + w, 0);

  const renderHeader = (y: number): number => {
    (doc as any).setFillColor(...headerBg);
    (doc as any).rect(marginL, y, tableW, rowHeight + 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    let x = marginL;
    headers.forEach((h, i) => {
      doc.text(String(h), x + 2, y + rowHeight - 0.5);
      x += colWidths[i];
    });
    return y + rowHeight + 2;
  };

  const renderRow = (row: (string | number)[], y: number, isAlt: boolean): number => {
    const lineH = fontSize * 0.42;
    let maxLines = 1;
    row.forEach((cell, ci) => {
      const lines = doc.splitTextToSize(String(cell ?? ''), colWidths[ci] - 4);
      if (lines.length > maxLines) maxLines = lines.length;
    });
    const dynH = Math.max(rowHeight, maxLines * lineH + 3);

    (doc as any).setFillColor(...(isAlt ? altRowBg : [255, 255, 255]));
    (doc as any).rect(marginL, y, tableW, dynH, 'F');

    (doc as any).setDrawColor(226, 232, 240);
    (doc as any).setLineWidth(0.2);
    (doc as any).line(marginL, y + dynH, marginL + tableW, y + dynH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 41, 59);
    let x = marginL;
    row.forEach((cell, ci) => {
      const lines = doc.splitTextToSize(String(cell ?? ''), colWidths[ci] - 4) as string[];
      doc.text(lines, x + 2, y + lineH + 1.5);
      x += colWidths[ci];
    });

    return y + dynH;
  };

  let y = startY;
  if (headers.length > 0) y = renderHeader(y);

  rows.forEach((row, idx) => {
    if (y + rowHeight + 4 > pageH - 16) {
      onPageBreak?.(doc, y);
      doc.addPage();
      y = 20;
      if (headers.length > 0) y = renderHeader(y);
    }
    y = renderRow(row, y, idx % 2 === 1);
  });

  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards de resumo
// ─────────────────────────────────────────────────────────────────────────────
interface SummaryItem {
  label:   string;
  value:   string | number;
  accent?: [number, number, number];
}

function drawSummaryCards(doc: jsPDF, items: SummaryItem[], y: number): number {
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 10;
  const gap    = 4;
  const cardW  = (pageW - margin * 2 - gap * (items.length - 1)) / items.length;
  const cardH  = 26;

  items.forEach((item, i) => {
    const x       = margin + i * (cardW + gap);
    const [r,g,b] = item.accent ?? [16, 185, 129];

    // Fundo claro
    (doc as any).setFillColor(
      Math.min(255, r + Math.round((255 - r) * 0.88)),
      Math.min(255, g + Math.round((255 - g) * 0.88)),
      Math.min(255, b + Math.round((255 - b) * 0.88)),
    );
    (doc as any).roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    // Borda lateral colorida
    (doc as any).setFillColor(r, g, b);
    (doc as any).roundedRect(x, y, 3, cardH, 1, 1, 'F');

    // Valor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(r, g, b);
    doc.text(String(item.value), x + 8, y + 16);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), x + 8, y + 22);
  });

  return y + cardH + 4;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extrai hora de um campo de data/hora
// ─────────────────────────────────────────────────────────────────────────────
function extractTime(value?: string): string {
  if (!value) return '—';
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF de corrida individual
// ─────────────────────────────────────────────────────────────────────────────
export const generateTripPDF = async (trip: Trip) => {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoBase64 = await getLogoBase64();

  const osNum = trip.os_number
    ? String(trip.os_number).padStart(4, '0')
    : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

  let y = addHeader(doc, logoBase64, `Relatório de Serviço — OS #${osNum}`);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO SERVIÇO', 14, y);
  y += 2;
  (doc as any).setDrawColor(16, 185, 129);
  (doc as any).setLineWidth(0.7);
  (doc as any).line(14, y, 196, y);
  y += 5;

  const kmTotal = (Number(trip.km_end) || 0) - (Number(trip.km_start) || 0);

  y = drawTable(doc, {
    startY: y,
    headers: [],
    colWidths: [48, 134],
    marginL: 14,
    rowHeight: 9,
    fontSize: 10,
    altRowBg: [248, 250, 252],
    rows: [
      ['Empresa:',          trip.company_name   || '—'],
      ['Motorista:',        trip.driver_name    || '—'],
      ['Veículo:',          `${trip.vehicle_model || ''} ${trip.plate ? `(${trip.plate})` : ''}`.trim() || '—'],
      ['Data:',             trip.date           || '—'],
      ['Passageiro:',       trip.user_name      || '—'],
      ['Origem:',           trip.origin         || '—'],
      ['Destino:',          trip.destination    || '—'],
      ['KM Inicial:',       String(trip.km_start ?? '—')],
      ['KM Final:',         String(trip.km_end   ?? '—')],
      ['KM Total:',         `${kmTotal} km`],
      ['Hora Finalizada:',  trip.finished_at    || '—'],
      ['Horas Parado:',     `${trip.stopped_hours || 0}h${trip.stopped_reason ? ` — ${trip.stopped_reason}` : ''}`],
    ],
  });

  y += 4;

  if (trip.description) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('DESCRIÇÃO:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.description, 182) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 5;
  }

  if (trip.observations) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.observations, 182) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  if (trip.signature_url) {
    if (y > 230) { addFooter(doc, 1, 1); doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('ASSINATURA DO PASSAGEIRO', 14, y); y += 5;
    try { doc.addImage(trip.signature_url, 'PNG', 14, y, 90, 36); } catch { /* silencioso */ }
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

// ─────────────────────────────────────────────────────────────────────────────
// PDF de relatório geral de TODAS as corridas  —  Landscape A4
//
// Como usar:
//   import { generateTripsReportPDF } from './reportService';
//
//   await generateTripsReportPDF(trips);
//   // ou com opções:
//   await generateTripsReportPDF(trips, {
//     title:  'Corridas de Janeiro',
//     period: '01/01/2025 – 31/01/2025',
//   });
// ─────────────────────────────────────────────────────────────────────────────
export const generateTripsReportPDF = async (
  trips: Trip[],
  options: { title?: string; period?: string } = {}
) => {
  const {
    title  = 'Relatório Geral de Corridas',
    period = '',
  } = options;

  // Landscape A4: 297 × 210 mm
  const doc        = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const logoBase64 = await getLogoBase64();
  const pageW      = doc.internal.pageSize.getWidth();   // 297
  const pageH      = doc.internal.pageSize.getHeight();  // 210
  const marginL    = 10;
  const tableW     = pageW - marginL * 2;                // 277

  // ── Colunas  (total = 277 mm exatos) ─────────────────────────────────────
  //  Nº OS | Data | Hora | Passageiro | Empresa | Motorista | KM | Origem | Destino | Veículo
  const headers: string[] = [
    'Nº OS', 'Data', 'Hora', 'Passageiro', 'Empresa',
    'Motorista', 'KM Rod.', 'Origem', 'Destino', 'Veículo / Placa',
  ];
  const colWidths: number[] = [
    14,  // Nº OS
    20,  // Data
    14,  // Hora
    30,  // Passageiro
    30,  // Empresa
    30,  // Motorista
    16,  // KM Rod.
    38,  // Origem
    38,  // Destino
    47,  // Veículo / Placa
  ]; // soma = 277 ✓

  // Ajuste fino caso não bata exato
  const sumW = colWidths.reduce((s, w) => s + w, 0);
  if (sumW !== tableW) colWidths[colWidths.length - 1] += tableW - sumW;

  // ── Monta linhas da tabela ────────────────────────────────────────────────
  let totalKm = 0;

  const rows: (string | number)[][] = trips.map(trip => {
    const km = (Number(trip.km_end) || 0) - (Number(trip.km_start) || 0);
    totalKm += km;

    const osNum = trip.os_number
      ? String(trip.os_number).padStart(4, '0')
      : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

    const carro = [trip.vehicle_model, trip.plate ? `(${trip.plate})` : '']
      .filter(Boolean).join(' ') || '—';

    return [
      osNum,
      trip.date         || '—',
      extractTime(trip.finished_at),
      trip.user_name    || '—',
      trip.company_name || '—',
      trip.driver_name  || '—',
      km > 0 ? `${km} km` : '—',
      trip.origin       || '—',
      trip.destination  || '—',
      carro,
    ];
  });

  // ── Cabeçalho página 1 ────────────────────────────────────────────────────
  const metaLine = [
    period ? `Período: ${period}` : '',
    `Total de corridas: ${trips.length}`,
  ].filter(Boolean).join('   |   ');

  let y = addHeader(doc, logoBase64, title, metaLine);
  y = addSectionTitle(doc, 'LISTAGEM DE CORRIDAS', y);

  // ── Tabela ────────────────────────────────────────────────────────────────
  let currentPage = 1;

  if (trips.length === 0) {
    (doc as any).setFillColor(248, 250, 252);
    (doc as any).roundedRect(marginL, y, tableW, 16, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro encontrado.', pageW / 2, y + 10, { align: 'center' });
    y += 22;
  } else {
    y = drawTable(doc, {
      startY:   y,
      headers,
      rows,
      colWidths,
      rowHeight: 8,
      fontSize:  7,
      marginL,
      headerBg:  [16, 185, 129],
      altRowBg:  [241, 248, 245],
      onPageBreak: (d) => {
        // rodapé será aplicado no loop final
        currentPage++;
      },
    });
  }

  // ── Bloco de resumo ───────────────────────────────────────────────────────
  const uniqueDrivers   = new Set(trips.map(t => t.driver_name).filter(Boolean)).size;
  const uniqueCompanies = new Set(trips.map(t => t.company_name).filter(Boolean)).size;
  const avgKm = trips.length > 0 ? (totalKm / trips.length).toFixed(1) : '—';

  const SUMMARY_HEIGHT = 48; // espaço estimado para o bloco de resumo
  if (y + SUMMARY_HEIGHT > pageH - 16) {
    currentPage++;
    doc.addPage();
    y = 20;
  } else {
    y += 8;
  }

  y = addSectionTitle(doc, 'RESUMO DO RELATÓRIO', y);
  drawSummaryCards(doc, [
    { label: 'Total de Corridas',      value: trips.length,                              accent: [16, 185, 129]  },
    { label: 'KM Total Percorrido',    value: `${totalKm.toLocaleString('pt-BR')} km`,   accent: [59, 130, 246]  },
    { label: 'Média KM / Corrida',     value: trips.length > 0 ? `${avgKm} km` : '—',   accent: [245, 158, 11]  },
    { label: 'Motoristas',             value: uniqueDrivers,                             accent: [139, 92, 246]  },
    { label: 'Empresas',               value: uniqueCompanies,                           accent: [239, 68, 68]   },
  ], y);

  // ── Rodapé em todas as páginas ────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages() as number;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, p, totalPages);
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const safeTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  downloadPDF(doc, `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Mantém compatibilidade com a assinatura antiga
// ─────────────────────────────────────────────────────────────────────────────
export const generateGeneralReportPDF = async (
  title: string,
  data: (string | number)[][],
  columns: string[]
) => {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoBase64 = await getLogoBase64();
  const pageW      = doc.internal.pageSize.getWidth();
  const margin     = 14;
  const tableW     = pageW - margin * 2;
  const colW       = Array(columns.length).fill(tableW / columns.length);

  let y = addHeader(doc, logoBase64, title);
  y += 4;

  if (data.length === 0) {
    doc.setFontSize(11); doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro encontrado.', margin, y);
  } else {
    y = addSectionTitle(doc, 'LISTAGEM DE REGISTROS', y);
    let page = 1;
    drawTable(doc, {
      startY: y, headers: columns, rows: data, colWidths: colW,
      rowHeight: 9, fontSize: 9, marginL: margin,
      onPageBreak: () => { page++; },
    });
  }

  const total = (doc as any).internal.getNumberOfPages() as number;
  for (let p = 1; p <= total; p++) { doc.setPage(p); addFooter(doc, p, total); }
  downloadPDF(doc, `relatorio_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

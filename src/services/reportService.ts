import jsPDF from 'jspdf';

const COMPANY_NAME = 'SANLE TRANSPORTES LOGISTICA LTDA - ME';
const COMPANY_CNPJ = 'CNPJ: 46.265.852/0001-01';
const LOGO_URL     = '/logo_png.png';

export interface Trip {
  id?:             string | number;
  os_number?:      string | number;
  date?:           string;
  finished_at?:    string;
  user_name?:      string;
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

export interface Contract {
  id?:          string | number;
  title?:       string;
  description?: string;
  date?:        string;
  file_url?:    string;
}

interface LogoInfo { base64: string; w: number; h: number; }

async function getLogoInfo(): Promise<LogoInfo | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => reject(null);
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>(resolve => {
      const img = new Image();
      img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = base64;
    });
    return { base64, ...dims };
  } catch { return null; }
}

function addLogoToDoc(doc: jsPDF, logo: LogoInfo | null, boxX: number, boxY: number, boxW: number, boxH: number) {
  if (!logo) return;
  try {
    (doc as any).setFillColor(255, 255, 255);
    (doc as any).roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F');
    const pad = 2; const maxW = boxW - pad * 2; const maxH = boxH - pad * 2;
    const ratio = logo.w / logo.h;
    let w: number, h: number;
    if (ratio > maxW / maxH) { w = maxW; h = maxW / ratio; }
    else                      { h = maxH; w = maxH * ratio; }
    const x = boxX + pad + (maxW - w) / 2;
    const y = boxY + pad + (maxH - h) / 2;
    doc.addImage(logo.base64, 'PNG', x, y, w, h);
  } catch {}
}

function downloadPDF(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  } catch { doc.save(filename); }
}

function addHeader(doc: jsPDF, logo: LogoInfo | null, subtitle?: string, extra?: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  (doc as any).setFillColor(16, 185, 129);
  (doc as any).rect(0, 0, pageW, 54, 'F');
  addLogoToDoc(doc, logo, 4, 3, 48, 48);
  const textX = 58;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(COMPANY_NAME, textX, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(COMPANY_CNPJ, textX, 26);
  if (subtitle) { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(subtitle, textX, 36); }
  if (extra)    { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(extra, textX, 45); }
  return 60;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  (doc as any).setDrawColor(203, 213, 225); (doc as any).setLineWidth(0.3);
  (doc as any).line(10, pageH - 12, pageW - 10, pageH - 12);
  doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, pageH - 6);
  doc.text(COMPANY_NAME, pageW / 2, pageH - 6, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 10, pageH - 6, { align: 'right' });
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(title, 10, y); y += 2;
  (doc as any).setDrawColor(16, 185, 129); (doc as any).setLineWidth(0.8);
  (doc as any).line(10, y, doc.internal.pageSize.getWidth() - 10, y);
  return y + 5;
}

interface TableOpts {
  startY: number; headers: string[]; rows: (string | number)[][];
  colWidths: number[]; rowHeight?: number; fontSize?: number;
  headerBg?: [number,number,number]; altRowBg?: [number,number,number];
  marginL?: number; onPageBreak?: (doc: jsPDF) => void;
}

function drawTable(doc: jsPDF, opts: TableOpts): number {
  const { startY, headers, rows, colWidths, rowHeight=8, fontSize=7.5,
    headerBg=[16,185,129], altRowBg=[241,245,249], marginL=10, onPageBreak } = opts;
  const pageH = doc.internal.pageSize.getHeight();
  const tableW = colWidths.reduce((s, w) => s + w, 0);

  const renderHeader = (y: number): number => {
    (doc as any).setFillColor(...headerBg);
    (doc as any).rect(marginL, y, tableW, rowHeight + 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(fontSize);
    let x = marginL;
    headers.forEach((h, i) => { doc.text(String(h), x + 2, y + rowHeight - 0.5); x += colWidths[i]; });
    return y + rowHeight + 2;
  };

  const renderRow = (row: (string | number)[], y: number, isAlt: boolean): number => {
    const lineH = fontSize * 0.42; let maxLines = 1;
    row.forEach((cell, ci) => {
      const lines = doc.splitTextToSize(String(cell ?? ''), colWidths[ci] - 4);
      if (lines.length > maxLines) maxLines = lines.length;
    });
    const dynH = Math.max(rowHeight, maxLines * lineH + 3);
    (doc as any).setFillColor(...(isAlt ? altRowBg : [255, 255, 255]));
    (doc as any).rect(marginL, y, tableW, dynH, 'F');
    (doc as any).setDrawColor(226, 232, 240); (doc as any).setLineWidth(0.2);
    (doc as any).line(marginL, y + dynH, marginL + tableW, y + dynH);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fontSize); doc.setTextColor(30, 41, 59);
    let x = marginL;
    row.forEach((cell, ci) => {
      const lines = doc.splitTextToSize(String(cell ?? ''), colWidths[ci] - 4) as string[];
      doc.text(lines, x + 2, y + lineH + 1.5); x += colWidths[ci];
    });
    return y + dynH;
  };

  let y = startY;
  if (headers.length > 0) y = renderHeader(y);
  rows.forEach((row, idx) => {
    if (y + rowHeight + 4 > pageH - 16) {
      onPageBreak?.(doc); doc.addPage(); y = 20;
      if (headers.length > 0) y = renderHeader(y);
    }
    y = renderRow(row, y, idx % 2 === 1);
  });
  return y;
}

interface SummaryItem { label: string; value: string | number; accent?: [number, number, number]; }
function drawSummaryCards(doc: jsPDF, items: SummaryItem[], y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10, gap = 4;
  const cardW = (pageW - margin * 2 - gap * (items.length - 1)) / items.length;
  const cardH = 26;
  items.forEach((item, i) => {
    const x = margin + i * (cardW + gap);
    const [r, g, b] = item.accent ?? [16, 185, 129];
    (doc as any).setFillColor(Math.min(255, r + Math.round((255 - r) * 0.88)), Math.min(255, g + Math.round((255 - g) * 0.88)), Math.min(255, b + Math.round((255 - b) * 0.88)));
    (doc as any).roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    (doc as any).setFillColor(r, g, b); (doc as any).roundedRect(x, y, 3, cardH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(r, g, b);
    doc.text(String(item.value), x + 8, y + 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), x + 8, y + 22);
  });
  return y + cardH + 4;
}

function extractTime(value?: string): string {
  if (!value) return '—';
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export const generateTripPDF = async (trip: Trip) => {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getLogoInfo();
  const osNum = trip.os_number
    ? String(trip.os_number).padStart(4, '0')
    : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

  let y = addHeader(doc, logo, `Relatório de Serviço — OS #${osNum}`);
  doc.setTextColor(30, 41, 59); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO SERVIÇO', 14, y); y += 2;
  (doc as any).setDrawColor(16, 185, 129); (doc as any).setLineWidth(0.7);
  (doc as any).line(14, y, 196, y); y += 5;

  const kmTotal = (Number(trip.km_end) || 0) - (Number(trip.km_start) || 0);
  y = drawTable(doc, {
    startY: y, headers: [], colWidths: [48, 134], marginL: 14, rowHeight: 9, fontSize: 10,
    altRowBg: [248, 250, 252],
    rows: [
      ['Empresa:',         trip.company_name || '—'],
      ['Motorista:',       trip.driver_name || '—'],
      ['Veículo:',         `${trip.vehicle_model || ''} ${trip.plate ? `(${trip.plate})` : ''}`.trim() || '—'],
      ['Data:',            trip.date || '—'],
      ['Passageiro:',      trip.user_name || '—'],
      ['Origem:',          trip.origin || '—'],
      ['Destino:',         trip.destination || '—'],
      ['KM Inicial:',      String(trip.km_start ?? '—')],
      ['KM Final:',        String(trip.km_end ?? '—')],
      ['KM Total:',        `${kmTotal} km`],
      ['Hora Finalizada:', trip.finished_at || '—'],
      ['Horas Parado:',    `${trip.stopped_hours || 0}h${trip.stopped_reason ? ` — ${trip.stopped_reason}` : ''}`],
    ],
  });

  y += 4;
  if (trip.description) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('DESCRIÇÃO:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.description, 182) as string[];
    doc.text(lines, 14, y); y += lines.length * 5 + 5;
  }
  if (trip.observations) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.observations, 182) as string[];
    doc.text(lines, 14, y); y += lines.length * 5 + 8;
  }
  if (trip.signature_url) {
    if (y > 230) { addFooter(doc, 1, 1); doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('ASSINATURA DO PASSAGEIRO', 14, y); y += 5;
    try { doc.addImage(trip.signature_url, 'PNG', 14, y, 90, 36); } catch {}
    (doc as any).setDrawColor(148, 163, 184); (doc as any).setLineWidth(0.4);
    (doc as any).line(14, y + 38, 104, y + 38);
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(trip.user_name || '', 14, y + 43); y += 50;
  }

  addFooter(doc, 1, 1);
  downloadPDF(doc, `OS_${osNum}_${(trip.driver_name || 'corrida').replace(/\s+/g, '_')}.pdf`);
};

export const generateTripsReportPDF = async (trips: Trip[], options: { title?: string; period?: string } = {}) => {
  const { title = 'Relatório Geral de Corridas', period = '' } = options;
  const doc    = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const logo   = await getLogoInfo();
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const marginL = 10;
  const tableW  = pageW - marginL * 2;
  const headers = ['Nº OS', 'Data', 'Hora', 'Passageiro', 'Empresa', 'Motorista', 'KM Rod.', 'Origem', 'Destino', 'Veículo / Placa'];
  const colWidths: number[] = [14, 20, 14, 30, 30, 30, 16, 38, 38, 47];
  const sumW = colWidths.reduce((s, w) => s + w, 0);
  if (sumW !== tableW) colWidths[colWidths.length - 1] += tableW - sumW;

  let totalKm = 0;
  const rows = trips.map(trip => {
    const km = (Number(trip.km_end) || 0) - (Number(trip.km_start) || 0); totalKm += km;
    const osNum = trip.os_number ? String(trip.os_number).padStart(4, '0') : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    const carro = [trip.vehicle_model, trip.plate ? `(${trip.plate})` : ''].filter(Boolean).join(' ') || '—';
    return [osNum, trip.date || '—', extractTime(trip.finished_at), trip.user_name || '—',
      trip.company_name || '—', trip.driver_name || '—', km > 0 ? `${km} km` : '—',
      trip.origin || '—', trip.destination || '—', carro];
  });

  const metaLine = [period ? `Período: ${period}` : '', `Total de corridas: ${trips.length}`].filter(Boolean).join('   |   ');
  let y = addHeader(doc, logo, title, metaLine);
  y = addSectionTitle(doc, 'LISTAGEM DE CORRIDAS', y);

  if (trips.length === 0) {
    (doc as any).setFillColor(248, 250, 252); (doc as any).roundedRect(marginL, y, tableW, 16, 2, 2, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro encontrado.', pageW / 2, y + 10, { align: 'center' }); y += 22;
  } else {
    y = drawTable(doc, { startY: y, headers, rows, colWidths, rowHeight: 8, fontSize: 7, marginL, headerBg: [16, 185, 129], altRowBg: [241, 248, 245] });
  }

  if (y + 50 > pageH - 16) { doc.addPage(); y = 20; } else { y += 8; }

  const uniqueDrivers   = new Set(trips.map(t => t.driver_name).filter(Boolean)).size;
  const uniqueCompanies = new Set(trips.map(t => t.company_name).filter(Boolean)).size;

  y = addSectionTitle(doc, 'RESUMO DO RELATÓRIO', y);
  drawSummaryCards(doc, [
    { label: 'Total de Corridas',   value: trips.length,                             accent: [16, 185, 129] },
    { label: 'KM Total Percorrido', value: `${totalKm.toLocaleString('pt-BR')} km`,  accent: [59, 130, 246] },
    { label: 'Média KM / Corrida',  value: trips.length > 0 ? `${(totalKm / trips.length).toFixed(1)} km` : '—', accent: [245, 158, 11] },
    { label: 'Motoristas',          value: uniqueDrivers,                            accent: [139, 92, 246] },
    { label: 'Empresas',            value: uniqueCompanies,                          accent: [239, 68, 68]  },
  ], y);

  const totalPages = (doc as any).internal.getNumberOfPages() as number;
  for (let p = 1; p <= totalPages; p++) { doc.setPage(p); addFooter(doc, p, totalPages); }

  const safeTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  downloadPDF(doc, `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateGeneralReportPDF = async (title: string, data: (string | number)[][], columns: string[]) => {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getLogoInfo();
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colW   = Array(columns.length).fill((pageW - margin * 2) / columns.length);
  let y = addHeader(doc, logo, title); y += 4;

  if (data.length === 0) {
    doc.setFontSize(11); doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro encontrado.', margin, y);
  } else {
    y = addSectionTitle(doc, 'LISTAGEM DE REGISTROS', y);
    drawTable(doc, { startY: y, headers: columns, rows: data, colWidths: colW, rowHeight: 9, fontSize: 9, marginL: margin });
  }

  const total = (doc as any).internal.getNumberOfPages() as number;
  for (let p = 1; p <= total; p++) { doc.setPage(p); addFooter(doc, p, total); }
  downloadPDF(doc, `relatorio_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

/** Gera PDF de um contrato individual */
export const generateContractPDF = async (contract: Contract) => {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await getLogoInfo();
  let y = addHeader(doc, logo, 'Contrato de Prestação de Serviços');

  doc.setTextColor(30, 41, 59); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CONTRATO', 14, y); y += 2;
  (doc as any).setDrawColor(16, 185, 129); (doc as any).setLineWidth(0.7);
  (doc as any).line(14, y, 196, y); y += 8;

  y = drawTable(doc, {
    startY: y, headers: [], colWidths: [45, 137], marginL: 14, rowHeight: 10, fontSize: 10,
    altRowBg: [248, 250, 252],
    rows: [
      ['Título:',    contract.title || '—'],
      ['Data:',      contract.date ? new Date(contract.date).toLocaleDateString('pt-BR') : '—'],
    ],
  });

  if (contract.description) {
    y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('DESCRIÇÃO / NOTAS:', 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(contract.description, 182) as string[];
    doc.text(lines, 14, y); y += lines.length * 6 + 10;
  }

  // Linha de assinatura
  y = Math.max(y + 20, 200);
  if (y > 240) { addFooter(doc, 1, 1); doc.addPage(); y = 30; }
  (doc as any).setDrawColor(148, 163, 184); (doc as any).setLineWidth(0.4);
  (doc as any).line(14, y, 96, y);
  (doc as any).line(110, y, 196, y);
  y += 5;
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('Representante SANLE', 14, y);
  doc.text('Contratante', 110, y);

  addFooter(doc, 1, 1);
  const safeName = (contract.title || 'contrato')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  downloadPDF(doc, `contrato_${safeName}.pdf`);
};

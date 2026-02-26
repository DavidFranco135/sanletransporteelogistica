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

// ── Download via Blob (funciona iOS Safari, Android Chrome, Desktop) ──────────
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

// ── Cabeçalho verde com logo ───────────────────────────────────────────────────
function addHeader(doc: jsPDF, logoBase64: string | null, subtitle?: string): number {
  const pageW = doc.internal.pageSize.getWidth();

  // Fundo verde
  (doc as any).setFillColor(16, 185, 129);
  (doc as any).rect(0, 0, pageW, 58, 'F');

  // Logo em fundo branco
  if (logoBase64) {
    try {
      (doc as any).setFillColor(255, 255, 255);
      (doc as any).roundedRect(4, 3, 58, 52, 3, 3, 'F');
      doc.addImage(logoBase64, 'PNG', 5, 4, 56, 50);
    } catch { /* ignora se imagem falhar */ }
  }

  // Textos
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

  return 65; // próxima posição Y após o header
}

// ── Rodapé ────────────────────────────────────────────────────────────────────
function addFooter(doc: jsPDF) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const now = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em: ${now}`, 14, pageH - 8);
  doc.text('Sanle Transporte e Logística', pageW - 14, pageH - 8, { align: 'right' });
}

// ── Tabela manual (sem autoTable) ─────────────────────────────────────────────
interface TableOptions {
  startY: number;
  headers?: string[];
  rows: (string | number)[][];
  colWidths?: number[];
  rowHeight?: number;
  fontSize?: number;
  headerBg?: [number, number, number];
  altRowBg?: [number, number, number];
  labelCol?: boolean; // primeira coluna em verde (para key:value)
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
  } = opts;

  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const tableW  = pageW - marginL * 2;

  // calcula larguras das colunas
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

  // cabeçalho
  if (headers && headers.length) {
    (doc as any).setFillColor(...headerBg);
    (doc as any).rect(marginL, y, tableW, rowHeight + 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    let x = marginL;
    headers.forEach((h, i) => {
      doc.text(String(h), x + 2, y + rowHeight - 1);
      x += widths[i];
    });
    y += rowHeight + 2;
  }

  // linhas de dados
  rows.forEach((row, rowIdx) => {
    // quebra de página
    if (y + rowHeight > pageH - 16) {
      addFooter(doc);
      doc.addPage();
      y = 20;
      // repetir cabeçalho na nova página
      if (headers && headers.length) {
        (doc as any).setFillColor(...headerBg);
        (doc as any).rect(marginL, y, tableW, rowHeight + 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        let xh = marginL;
        headers.forEach((h, i) => {
          doc.text(String(h), xh + 2, y + rowHeight - 1);
          xh += widths[i];
        });
        y += rowHeight + 2;
      }
    }

    // fundo alternado
    if (rowIdx % 2 === 1) {
      (doc as any).setFillColor(...altRowBg);
      (doc as any).rect(marginL, y, tableW, rowHeight, 'F');
    } else {
      (doc as any).setFillColor(255, 255, 255);
      (doc as any).rect(marginL, y, tableW, rowHeight, 'F');
    }

    // linha divisória
    (doc as any).setDrawColor(203, 213, 225);
    (doc as any).setLineWidth(0.2);
    (doc as any).line(marginL, y + rowHeight, marginL + tableW, y + rowHeight);

    // células
    let x = marginL;
    row.forEach((cell, colIdx) => {
      const isLabel = labelCol && colIdx === 0;
      doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      if (isLabel) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(30, 41, 59);
      }

      const cellText = String(cell ?? '');
      const maxW = widths[colIdx] - 4;
      // trunca se muito longo
      const truncated = doc.getStringUnitWidth(cellText) * fontSize > maxW
        ? cellText.slice(0, Math.floor(maxW / (fontSize * 0.35))) + '…'
        : cellText;

      doc.text(truncated, x + 2, y + rowHeight - 2);
      x += widths[colIdx];
    });

    y += rowHeight;
  });

  return y + 4;
}

// ── PDF de corrida individual ─────────────────────────────────────────────────
export const generateTripPDF = async (trip: any) => {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoBase64 = await getLogoBase64();

  const osNum = trip.os_number
    ? String(trip.os_number).padStart(4, '0')
    : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

  let y = addHeader(doc, logoBase64, `Relatório de Serviço — OS #${osNum}`);

  // Título da seção
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
    labelCol: true,
    rowHeight: 9,
    fontSize: 10,
    altRowBg: [248, 250, 252],
    rows: [
      ['Empresa:',        trip.company_name   || '—'],
      ['Motorista:',      trip.driver_name    || '—'],
      ['Veículo:',        `${trip.vehicle_model || ''} ${trip.plate ? `(${trip.plate})` : ''}`.trim() || '—'],
      ['Data:',           trip.date           || '—'],
      ['Passageiro:',     trip.user_name      || '—'],
      ['Origem:',         trip.origin         || '—'],
      ['Destino:',        trip.destination    || '—'],
      ['KM Inicial:',     String(trip.km_start ?? '—')],
      ['KM Final:',       String(trip.km_end   ?? '—')],
      ['KM Total:',       `${kmTotal} km`],
      ['Hora Finalizada:', trip.finished_at   || '—'],
      ['Horas Parado:',   `${trip.stopped_hours || 0}h${trip.stopped_reason ? ` — ${trip.stopped_reason}` : ''}`],
    ],
  });

  y += 4;

  // Descrição
  if (trip.description) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('DESCRIÇÃO:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.description, 182) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 5;
  }

  // Observações
  if (trip.observations) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(trip.observations, 182) as string[];
    doc.text(lines, 14, y);
    y += lines.length * 5 + 8;
  }

  // Assinatura
  if (trip.signature_url) {
    if (y > 230) { addFooter(doc); doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('ASSINATURA DO PASSAGEIRO', 14, y); y += 5;
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

  addFooter(doc);
  downloadPDF(doc, `OS_${osNum}_${(trip.driver_name || 'corrida').replace(/\s+/g, '_')}.pdf`);
};

// ── PDF de relatório geral ─────────────────────────────────────────────────────
export const generateGeneralReportPDF = async (
  title: string,
  data: (string | number)[][],
  columns: string[]
) => {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoBase64 = await getLogoBase64();

  let y = addHeader(doc, logoBase64, title);
  y += 4;

  if (data.length === 0) {
    doc.setFontSize(11); doc.setTextColor(100, 116, 139);
    doc.text('Nenhum registro encontrado.', 14, y);
  } else {
    y = drawTable(doc, {
      startY: y,
      headers: columns,
      rows: data,
      rowHeight: 9,
      fontSize: 9,
    });
  }

  addFooter(doc);
  downloadPDF(doc, `relatorio_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

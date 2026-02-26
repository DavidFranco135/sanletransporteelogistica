import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COMPANY_NAME = 'SANLE TRANSPORTES LOGISTICA LTDA - ME';
const COMPANY_CNPJ = 'CNPJ: 46.265.852/0001-01';
const LOGO_URL = '/logo.png';

// ── Carrega logo como base64 ──────────────────────────────────────────────────
async function getLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Download robusto via Blob (funciona em mobile iOS/Android) ───────────────
function downloadPDF(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch {
    // último fallback
    doc.save(filename);
  }
}

// ── Cabeçalho com logo grande preenchendo a área verde ───────────────────────
function addHeader(doc: any, logoBase64: string | null, subtitle?: string) {
  // Barra verde principal
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 60, 'F');

  // Logo em fundo branco, grande
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(4, 3, 60, 54, 3, 3, 'F');
      doc.addImage(logoBase64, 'PNG', 5, 4, 58, 52);
    } catch { /* ignora erro de imagem */ }
  }

  // Nome da empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 70, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_CNPJ, 70, 29);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, 70, 40);
  }

  // Linha separadora
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(0, 60, 210, 60);
}

// ── Rodapé ────────────────────────────────────────────────────────────────────
function addFooter(doc: any) {
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const now = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em ${now}`, 14, 290);
  doc.text('Sanle Transporte e Logística — Sistema de Gestão', 196, 290, { align: 'right' });
}

// ── PDF de corrida ────────────────────────────────────────────────────────────
export const generateTripPDF = async (trip: any) => {
  const doc = new jsPDF() as any;
  const logoBase64 = await getLogoBase64();

  const osNum = trip.os_number
    ? String(trip.os_number).padStart(4, '0')
    : String(trip.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');

  addHeader(doc, logoBase64, `Relatório de Transporte — OS #${osNum}`);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO SERVIÇO', 14, 72);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(14, 75, 196, 75);

  const tableBody = [
    ['Empresa:',       trip.company_name   || '—'],
    ['Motorista:',     trip.driver_name    || '—'],
    ['Veículo:',       `${trip.vehicle_model || ''} ${trip.plate ? `(${trip.plate})` : ''}`.trim() || '—'],
    ['Data:',          trip.date           || '—'],
    ['Passageiro:',    trip.user_name      || '—'],
    ['Origem:',        trip.origin         || '—'],
    ['Destino:',       trip.destination    || '—'],
    ['KM Inicial:',    String(trip.km_start ?? '—')],
    ['KM Final:',      String(trip.km_end ?? '—')],
    ['KM Total:',      `${(Number(trip.km_end) || 0) - (Number(trip.km_start) || 0)} km`],
    ['Finalizado:',    trip.finished_at    || '—'],
    ['Horas Parado:',  `${trip.stopped_hours || 0}h${trip.stopped_reason ? ` — ${trip.stopped_reason}` : ''}`],
  ];

  doc.autoTable({
    startY: 79,
    head: [],
    body: tableBody,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44, textColor: [16, 185, 129] } },
  });

  let y: number = doc.lastAutoTable.finalY + 10;

  if (trip.description) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('DESCRIÇÃO', 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const lines = doc.splitTextToSize(trip.description, 182);
    doc.text(lines, 14, y); y += lines.length * 5 + 6;
  }

  if (trip.observations) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES', 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const lines = doc.splitTextToSize(trip.observations, 182);
    doc.text(lines, 14, y); y += lines.length * 5 + 10;
  }

  if (trip.signature_url) {
    if (y > 235) { doc.addPage(); y = 20; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('ASSINATURA DO PASSAGEIRO', 14, y); y += 6;
    try { doc.addImage(trip.signature_url, 'PNG', 14, y, 85, 34); } catch {}
    doc.setDrawColor(100, 116, 139); doc.setLineWidth(0.5);
    doc.line(14, y + 36, 99, y + 36);
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(trip.user_name || '', 14, y + 41);
  }

  addFooter(doc);
  downloadPDF(doc, `OS_${osNum}_${(trip.driver_name || 'corrida').replace(/\s+/g, '_')}.pdf`);
};

// ── PDF de relatório geral ─────────────────────────────────────────────────────
export const generateGeneralReportPDF = async (
  title: string,
  data: any[],
  columns: string[]
) => {
  const doc = new jsPDF() as any;
  const logoBase64 = await getLogoBase64();

  addHeader(doc, logoBase64, title);

  doc.autoTable({
    startY: 67,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
  });

  addFooter(doc);
  downloadPDF(doc, `relatorio_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

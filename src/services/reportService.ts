import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COMPANY_NAME = 'SANLE TRANSPORTES LOGISTICA LTDA - ME';
const COMPANY_CNPJ = 'CNPJ: 46.265.852/0001-01';
const LOGO_URL = '/logo.png';

async function getLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_URL);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addHeader(doc: any, logoBase64: string | null, subtitle?: string) {
  // Green header bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 45, 'F');

  // Logo on left
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 8, 5, 35, 35);
    } catch {}
  }

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 47, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_CNPJ, 47, 25);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, 47, 33);
  }

  // Thin line below header
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(0, 45, 210, 45);
}

function addFooter(doc: any) {
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const now = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em ${now}`, 14, 290);
  doc.text('Sanle Transporte e Logística - Sistema de Gestão', 110, 290);
}

export const generateTripPDF = async (trip: any) => {
  const doc = new jsPDF() as any;
  const logoBase64 = await getLogoBase64();

  addHeader(doc, logoBase64, `Relatório de Serviço de Transporte — OS #${String(trip.id || '').padStart(4, '0')}`);

  // Section title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO SERVIÇO', 14, 58);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(14, 61, 196, 61);

  const data = [
    ['Empresa:', trip.company_name || ''],
    ['Motorista:', trip.driver_name || ''],
    ['Veículo:', `${trip.vehicle_model || ''} ${trip.plate ? `(${trip.plate})` : ''}`],
    ['Data:', trip.date || ''],
    ['Passageiro:', trip.user_name || 'N/A'],
    ['Origem:', trip.origin || ''],
    ['Destino:', trip.destination || ''],
    ['KM Inicial:', String(trip.km_start ?? '')],
    ['KM Final:', String(trip.km_end ?? '')],
    ['KM Total:', String((trip.km_end ?? 0) - (trip.km_start ?? 0))],
    ['Hora Finalizada:', trip.finished_at || 'N/A'],
    ['Horas Parado:', `${trip.stopped_hours || 0}h — ${trip.stopped_reason || 'N/A'}`],
  ];

  doc.autoTable({
    startY: 65,
    head: [],
    body: data,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: [16, 185, 129] } }
  });

  let y = doc.lastAutoTable.finalY + 10;

  if (trip.description) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('DESCRIÇÃO DA VIAGEM', 14, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(trip.description, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 5;
  }

  if (trip.observations) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES', 14, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(trip.observations, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 10;
  }

  if (trip.signature_url) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('ASSINATURA DO USUÁRIO', 14, y);
    y += 5;
    try {
      doc.addImage(trip.signature_url, 'PNG', 14, y, 70, 28);
    } catch {}
    doc.setDrawColor(100, 116, 139);
    doc.line(14, y + 30, 84, y + 30);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(trip.user_name || '', 14, y + 35);
  }

  addFooter(doc);
  doc.save(`corrida_${trip.id || 'relatorio'}.pdf`);
};

export const generateGeneralReportPDF = async (
  title: string,
  data: any[],
  columns: string[]
) => {
  const doc = new jsPDF() as any;
  const logoBase64 = await getLogoBase64();

  addHeader(doc, logoBase64, title);

  doc.autoTable({
    startY: 52,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] }
  });

  addFooter(doc);
  doc.save(`relatorio_${title.toLowerCase().replace(/\s/g, '_')}.pdf`);
};

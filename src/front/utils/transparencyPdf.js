import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateTransparencyReport = (matches) => {
  const doc = new jsPDF("p", "mm", "a4");
  const colors = {
    oxford: [44, 62, 80],   // Tu color de seriedad/gestión
    emerald: [16, 185, 129] // Color de éxito/completado
  };

  // --- Encabezado ---
  doc.setFillColor(...colors.oxford);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MUNDIAL ELITE PREDICTOR", 14, 20);
  doc.setFontSize(10);
  doc.text("REPORTE OFICIAL DE TRANSPARENCIA", 14, 28);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 34);

  let currentY = 50;

  // --- Contenido por Partido ---
  matches.forEach((match, index) => {
    // Verificar si necesitamos una nueva página
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    // Título del Partido
    doc.setTextColor(...colors.oxford);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const matchTitle = `${match.home_team.toUpperCase()} VS ${match.away_team.toUpperCase()}`;
    doc.text(matchTitle, 14, currentY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date(match.match_date).toLocaleString()}`, 14, currentY + 5);

    // Tabla de Predicciones
    autoTable(doc, {
      startY: currentY + 8,
      head: [["Participante", "Predicción"]],
      body: match.predictions.map(p => [p.user, `${p.h_score} - ${p.a_score}`]),
      theme: "striped",
      headStyles: { fillColor: colors.oxford },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 15;
  });

  doc.save("muro_transparencia_quiniela.pdf");
};
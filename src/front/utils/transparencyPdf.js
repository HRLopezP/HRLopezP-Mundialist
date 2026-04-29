import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateTransparencyReport = (matches) => {
  const doc = new jsPDF("p", "mm", "a4");
  const colors = {
    oxford: [44, 62, 80],   
    emerald: [16, 185, 129] 
  };

  // --- Encabezado ---
  doc.setFillColor(...colors.oxford);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ÉLITE MUNDIALISTA", 14, 20);
  doc.setFontSize(10);
  doc.text("REPORTE OFICIAL DE TRANSPARENCIA", 14, 28);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 34);

  let currentY = 50;

  matches.forEach((match, index) => {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(...colors.oxford);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const matchTitle = `${match.home_team.toUpperCase()} VS ${match.away_team.toUpperCase()}`;
    doc.text(matchTitle, 14, currentY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date(match.match_date).toLocaleString()}`, 14, currentY + 5);

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


export const generateRankingReport = (rankingData) => {
  const doc = new jsPDF("p", "mm", "a4");
  const colors = {
    oxford: [44, 62, 80],
    emerald: [16, 185, 129]
  };

  // --- Encabezado ---
  doc.setFillColor(...colors.oxford);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ÉLITE MUNDIALISTA", 14, 20);
  doc.setFontSize(10);
  doc.text("RANKING OFICIAL DE POSICIONES", 14, 28);
  doc.text(`Fecha de descarga: ${new Date().toLocaleString()}`, 14, 34);

  autoTable(doc, {
    startY: 50,
    head: [["Pos", "Usuario", "Exactos", "Tendencia", "Total Pts"]],
    body: rankingData.map((item, index) => [
      index + 1,                   
      item.username.toUpperCase(), 
      item.exact_hits || 0,   
      item.trend_hits || 0,           
      `${item.total_points} pts`  
    ]),
    theme: "striped",
    headStyles: { fillColor: colors.oxford, halign: 'center' },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' }
    },
 
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.textColor = colors.emerald;
      }
    }
  });

  doc.save(`Ranking_Elite_${new Date().toLocaleDateString()}.pdf`);
};
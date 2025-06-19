
import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company } from '@/lib/api/apiContract';

interface PDFOptions {
  filename?: string;
  title?: string;
}

export const usePdfDownload = () => {
  const downloadCompaniesAsPdf = useCallback((companies: Company[], options: PDFOptions = {}) => {
    const { filename = 'companies-prospects.pdf', title = 'Companies Prospects' } = options;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Calculate summary statistics
    const totalProspects = companies.length;
    const highPotential = companies.filter(company => company.overall_score >= 70).length;
    const mediumPotential = companies.filter(company => company.overall_score >= 40 && company.overall_score < 70).length;
    const lowPotential = companies.filter(company => company.overall_score < 40).length;
    
    // Add summary statistics
    doc.setFontSize(12);
    doc.text('Summary Statistics:', 14, 45);
    
    doc.setFontSize(10);
    doc.text(`Total Prospects: ${totalProspects}`, 14, 55);
    doc.text(`High Potential (70+): ${highPotential}`, 14, 62);
    doc.text(`Medium Potential (40-69): ${mediumPotential}`, 14, 69);
    doc.text(`Low Potential (<40): ${lowPotential}`, 14, 76);
    
    // Prepare table data
    const tableHeaders = [
      'Company Name',
      'Contact',
      'Email', 
      'Industry',
      'Score',
      'Reason for Scoring'
    ];
    
    const tableData = companies.map(company => [
      company.name || 'N/A',
      (company as any).poc_name || (company as any).company_details?.point_of_contact || 'N/A',
      (company as any).email || (company as any).company_details?.contact_email || 'N/A',
      company.industry || 'N/A',
      `${Math.round(company.overall_score)}/100`,
      company.scoring_reason || 'Scoring analysis pending'
    ]);
    
    // Add table using the autoTable function
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 85,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 20, right: 14, bottom: 20, left: 14 },
      columnStyles: {
        0: { cellWidth: 30 }, // Company Name
        1: { cellWidth: 25 }, // Contact
        2: { cellWidth: 30 }, // Email
        3: { cellWidth: 25 }, // Industry
        4: { cellWidth: 20 }, // Score
        5: { cellWidth: 'auto' } // Reason for Scoring - auto will use remaining space
      },
      showHead: 'everyPage',
      pageBreak: 'auto',
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
      tableWidth: 'auto', // This ensures the table uses the full available width
    });
    
    // Save the PDF
    doc.save(filename);
  }, []);

  return { downloadCompaniesAsPdf };
};

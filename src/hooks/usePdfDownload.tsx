
import { useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    
    // Prepare table data
    const tableHeaders = [
      'Company Name',
      'Contact',
      'Email', 
      'Industry',
      'Score',
      'Source'
    ];
    
    const tableData = companies.map(company => [
      company.name || 'N/A',
      (company as any).poc_name || (company as any).company_details?.point_of_contact || 'N/A',
      (company as any).email || (company as any).company_details?.contact_email || 'N/A',
      company.industry || 'N/A',
      `${Math.round(company.overall_score)}/100`,
      company.source || 'Dashboard'
    ]);
    
    // Add table
    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 40,
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
      margin: { top: 40, right: 14, bottom: 20, left: 14 },
    });
    
    // Save the PDF
    doc.save(filename);
  }, []);

  return { downloadCompaniesAsPdf };
};

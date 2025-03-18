
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';

export async function generatePDF(elementId: string, fileName: string): Promise<void> {
  try {
    // Show loading toast
    toast({
      title: "Generating PDF",
      description: "Please wait while we prepare your report...",
    });

    // Get the element to be converted to PDF
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable CORS to load external images
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      // Make sure to capture all content
      onclone: (clonedDoc) => {
        // Find all elements with class hidden-in-pdf within the cloned document and show them
        const hiddenElements = clonedDoc.querySelectorAll('.hidden-in-pdf');
        hiddenElements.forEach((el) => {
          (el as HTMLElement).style.display = 'block';
        });
        
        // Apply professional formatting to the PDF content
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          if (el.tagName === 'H3') {
            (el as HTMLElement).style.fontSize = '16px';
            (el as HTMLElement).style.fontWeight = 'bold';
            (el as HTMLElement).style.marginTop = '15px';
            (el as HTMLElement).style.marginBottom = '8px';
            (el as HTMLElement).style.color = '#333333';
            (el as HTMLElement).style.borderBottom = '1px solid #eeeeee';
            (el as HTMLElement).style.paddingBottom = '5px';
          }
          
          if (el.tagName === 'H4') {
            (el as HTMLElement).style.fontSize = '14px';
            (el as HTMLElement).style.fontWeight = 'bold';
            (el as HTMLElement).style.marginTop = '12px';
            (el as HTMLElement).style.marginBottom = '6px';
            (el as HTMLElement).style.color = '#444444';
          }
          
          if (el.tagName === 'P') {
            (el as HTMLElement).style.fontSize = '12px';
            (el as HTMLElement).style.lineHeight = '1.5';
            (el as HTMLElement).style.color = '#333333';
          }
          
          if (el.tagName === 'LI') {
            (el as HTMLElement).style.fontSize = '12px';
            (el as HTMLElement).style.lineHeight = '1.5';
            (el as HTMLElement).style.marginBottom = '4px';
          }
          
          if (el.tagName === 'UL') {
            (el as HTMLElement).style.paddingLeft = '20px';
            (el as HTMLElement).style.marginBottom = '12px';
          }
        });
        
        // Make sure all sections in report are visible
        const sectionElements = clonedDoc.querySelectorAll('.section-detail');
        sectionElements.forEach((el) => {
          (el as HTMLElement).style.maxHeight = 'none';
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.padding = '10px';
          (el as HTMLElement).style.border = '1px solid #eaeaea';
          (el as HTMLElement).style.borderRadius = '5px';
          (el as HTMLElement).style.backgroundColor = '#fafafa';
          (el as HTMLElement).style.marginTop = '10px';
          (el as HTMLElement).style.marginBottom = '10px';
        });
        
        // Make sure all research content is visible and formatted
        const researchElements = clonedDoc.querySelectorAll('.research-content');
        researchElements.forEach((el) => {
          (el as HTMLElement).style.maxHeight = 'none';
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.padding = '10px';
          (el as HTMLElement).style.border = '1px solid #eaeaea';
          (el as HTMLElement).style.borderRadius = '5px';
          (el as HTMLElement).style.backgroundColor = '#f8f9fa';
          (el as HTMLElement).style.marginBottom = '15px';
        });
        
        // Add header and title to the report
        const titleElement = clonedDoc.querySelector('.text-2xl');
        if (titleElement) {
          (titleElement as HTMLElement).style.fontSize = '22px';
          (titleElement as HTMLElement).style.fontWeight = 'bold';
          (titleElement as HTMLElement).style.color = '#1a1a1a';
          (titleElement as HTMLElement).style.textAlign = 'center';
          (titleElement as HTMLElement).style.padding = '15px 0';
          (titleElement as HTMLElement).style.borderBottom = '2px solid #333';
          (titleElement as HTMLElement).style.marginBottom = '20px';
        }
        
        // Format strengths and weaknesses
        const strengthElements = clonedDoc.querySelectorAll('.text-emerald-700');
        strengthElements.forEach((el) => {
          (el as HTMLElement).style.color = '#10b981';
        });
        
        const weaknessElements = clonedDoc.querySelectorAll('.text-rose-700');
        weaknessElements.forEach((el) => {
          (el as HTMLElement).style.color = '#e11d48';
        });
      }
    });

    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Calculate number of pages
    let heightLeft = imgHeight;
    let position = 0;
    
    // Create PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Add a header to the PDF
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    const reportDate = new Date().toLocaleDateString();
    pdf.text(`Generated on ${reportDate}`, 10, 10);
    pdf.text('Company Assessment Report', imgWidth - 70, 10);
    
    // Add a footer with page numbers
    const addFooter = (pageNumber: number) => {
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Page ${pageNumber}`, imgWidth - 20, pageHeight - 10);
    };
    
    // Add first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 15, imgWidth, imgHeight);
    addFooter(1);
    
    // Add more pages if needed
    heightLeft -= pageHeight - 20; // Adjust for header and footer
    let pageNumber = 1;
    
    while (heightLeft > 0) {
      pageNumber++;
      position = heightLeft - imgHeight + 20; // Adjust for header
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      addFooter(pageNumber);
      heightLeft -= (pageHeight - 20); // Adjust for header and footer
    }
    
    // Save the PDF
    pdf.save(`${fileName.replace(/\s+/g, '_')}.pdf`);
    
    // Show success toast
    toast({
      title: "Report Downloaded",
      description: "Your report has been successfully downloaded.",
    });
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // Show error toast
    toast({
      title: "PDF Generation Failed",
      description: "There was an error generating your report. Please try again.",
      variant: "destructive",
    });
  }
}

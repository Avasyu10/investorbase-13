
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
        
        // Make sure all sections in report are visible
        const sectionElements = clonedDoc.querySelectorAll('.section-detail');
        sectionElements.forEach((el) => {
          (el as HTMLElement).style.maxHeight = 'none';
          (el as HTMLElement).style.overflow = 'visible';
        });
        
        // Make sure all research content is visible
        const researchElements = clonedDoc.querySelectorAll('.research-content');
        researchElements.forEach((el) => {
          (el as HTMLElement).style.maxHeight = 'none';
          (el as HTMLElement).style.overflow = 'visible';
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
    
    // Add first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    
    // Add more pages if needed
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
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

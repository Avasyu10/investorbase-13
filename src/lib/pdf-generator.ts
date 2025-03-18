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
        
        // Preserve original colors in PDF
        const preserveColors = (el: Element) => {
          // Keep original background colors
          const computedStyle = window.getComputedStyle(el as HTMLElement);
          const backgroundColor = computedStyle.backgroundColor;
          const color = computedStyle.color;
          
          if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            (el as HTMLElement).style.backgroundColor = backgroundColor;
          }
          
          if (color) {
            (el as HTMLElement).style.color = color;
          }
          
          // Process all children
          Array.from(el.children).forEach(preserveColors);
        };
        
        // Apply color preservation to all elements
        preserveColors(clonedDoc.getElementById(elementId) as Element);
        
        // Apply professional formatting to the PDF content
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          if (el.tagName === 'H3') {
            (el as HTMLElement).style.fontSize = '16px';
            (el as HTMLElement).style.fontWeight = 'bold';
            (el as HTMLElement).style.marginTop = '15px';
            (el as HTMLElement).style.marginBottom = '8px';
            (el as HTMLElement).style.paddingBottom = '5px';
            // Keep original color but ensure border
            (el as HTMLElement).style.borderBottom = '1px solid #eeeeee';
          }
          
          if (el.tagName === 'H4') {
            (el as HTMLElement).style.fontSize = '14px';
            (el as HTMLElement).style.fontWeight = 'bold';
            (el as HTMLElement).style.marginTop = '12px';
            (el as HTMLElement).style.marginBottom = '6px';
          }
          
          if (el.tagName === 'P') {
            (el as HTMLElement).style.fontSize = '12px';
            (el as HTMLElement).style.lineHeight = '1.5';
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
        
        // Ensure title is properly styled
        const titleElement = clonedDoc.querySelector('.text-2xl');
        if (titleElement) {
          (titleElement as HTMLElement).style.fontSize = '22px';
          (titleElement as HTMLElement).style.fontWeight = 'bold';
          (titleElement as HTMLElement).style.textAlign = 'center';
          (titleElement as HTMLElement).style.padding = '15px 0';
          (titleElement as HTMLElement).style.borderBottom = '2px solid #333';
          (titleElement as HTMLElement).style.marginBottom = '20px';
        }
        
        // Apply page break before "Latest Research" section
        const researchHeader = clonedDoc.querySelector('.research-content h3');
        if (researchHeader) {
          (researchHeader.parentNode as HTMLElement).style.pageBreakBefore = 'always';
        }
        
        // Setup the detailed sections layout - convert to a two-column layout
        const detailedSections = clonedDoc.querySelectorAll('.section-detail');
        detailedSections.forEach((el, index) => {
          // Start new page after every two sections (index 0 and 1 on first page, 2 and 3 on second page, etc.)
          if (index % 2 === 0 && index > 0) {
            (el as HTMLElement).style.pageBreakBefore = 'always';
          }
          
          // Style each section as a card with original colors preserved
          (el as HTMLElement).style.maxHeight = 'none';
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.padding = '15px';
          (el as HTMLElement).style.borderRadius = '5px';
          (el as HTMLElement).style.marginTop = '10px';
          (el as HTMLElement).style.marginBottom = '20px';
          (el as HTMLElement).style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          
          // Ensure headers in sections stand out
          const sectionHeaders = el.querySelectorAll('h4');
          sectionHeaders.forEach(header => {
            (header as HTMLElement).style.fontSize = '14px';
            (header as HTMLElement).style.fontWeight = '600';
            (header as HTMLElement).style.marginTop = '10px';
            (header as HTMLElement).style.marginBottom = '5px';
            (header as HTMLElement).style.borderBottom = '1px solid #eaeaea';
            (header as HTMLElement).style.paddingBottom = '3px';
          });
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
    const addHeader = (pageNumber: number) => {
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      const reportDate = new Date().toLocaleDateString();
      pdf.text(`Generated on ${reportDate}`, 10, 10);
      pdf.text('Company Assessment Report', imgWidth - 70, 10);
    };
    
    // Add a footer with page numbers
    const addFooter = (pageNumber: number) => {
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Page ${pageNumber}`, imgWidth - 20, pageHeight - 10);
    };
    
    // Add first page
    addHeader(1);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 15, imgWidth, imgHeight);
    addFooter(1);
    
    // Add more pages if needed
    heightLeft -= pageHeight - 20; // Adjust for header and footer
    let pageNumber = 1;
    
    while (heightLeft > 0) {
      pageNumber++;
      position = heightLeft - imgHeight + 20; // Adjust for header
      pdf.addPage();
      addHeader(pageNumber);
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

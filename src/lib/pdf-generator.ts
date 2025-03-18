
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export async function generatePDF(elementId: string, fileName: string, companyId?: string): Promise<void> {
  try {
    // Show loading toast
    toast({
      title: "Generating PDF",
      description: "Please wait while we prepare your report...",
    });

    // If companyId is provided, fetch the latest research data directly from Supabase
    let researchContent = null;
    if (companyId) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('perplexity_response')
          .eq('id', companyId)
          .single();
        
        if (!error && data && data.perplexity_response) {
          researchContent = data.perplexity_response;
          console.log("Fetched research content from Supabase for PDF", researchContent.substring(0, 50) + "...");
        }
      } catch (err) {
        console.error("Error fetching research content from Supabase:", err);
      }
    }

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
      backgroundColor: '#111827', // Match the dark theme background
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      // Make sure to capture all content
      onclone: (clonedDoc) => {
        // Find all elements with class hidden-in-pdf within the cloned document and show them
        const hiddenElements = clonedDoc.querySelectorAll('.hidden-in-pdf');
        hiddenElements.forEach((el) => {
          (el as HTMLElement).style.display = 'block';
        });
        
        // Make all research content visible
        const researchContentEl = clonedDoc.querySelector('.research-content');
        if (researchContentEl) {
          (researchContentEl as HTMLElement).style.display = 'block';
          (researchContentEl as HTMLElement).classList.remove('hidden-in-pdf');
          
          // If we fetched the research content from Supabase, inject it directly
          if (researchContent) {
            const researchContainer = document.createElement('div');
            researchContainer.className = 'space-y-4';
            
            // Process the research content into sections
            const sections = researchContent.split(/#{3,}\s+/).filter(section => section.trim().length > 0);
            
            sections.forEach((section) => {
              const sectionDiv = document.createElement('div');
              sectionDiv.className = 'space-y-1 mb-4';
              
              const lines = section.split('\n');
              const title = lines[0].replace(/^[#\s]+/, '');
              
              if (!title.trim()) return;
              
              const content = lines.slice(1).join('\n')
                .replace(/\*\*/g, '')
                .replace(/\[(\d+)\]/g, '')
                .replace(/Sources:[\s\S]*$/, '')
                .replace(/https?:\/\/[^\s]+/g, '')
                .replace(/\n\s*\n/g, '\n')
                .replace(/\n+$/, '')
                .trim();
              
              const titleEl = document.createElement('h4');
              titleEl.className = 'text-sm font-semibold';
              titleEl.textContent = title;
              
              const contentEl = document.createElement('p');
              contentEl.className = 'text-sm text-muted-foreground';
              contentEl.textContent = content;
              
              sectionDiv.appendChild(titleEl);
              sectionDiv.appendChild(contentEl);
              researchContainer.appendChild(sectionDiv);
            });
            
            // Replace the research content
            (researchContentEl as HTMLElement).innerHTML = '';
            (researchContentEl as HTMLElement).appendChild(researchContainer);
          }
        }
        
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
          
          // Process all children recursively
          Array.from(el.children).forEach(preserveColors);
        };
        
        // Apply color preservation to all elements
        preserveColors(clonedDoc.getElementById(elementId) as Element);
        
        // Set the background of the report to match dark theme
        const reportContent = clonedDoc.getElementById(elementId);
        if (reportContent) {
          reportContent.style.backgroundColor = '#111827';
          reportContent.style.color = '#f3f4f6';
          reportContent.style.padding = '0';
          reportContent.style.margin = '0';
        }

        // Ensure each section is treated as its own page
        const sections = clonedDoc.querySelectorAll('h3, .section-detail, .research-content');
        sections.forEach((section) => {
          (section as HTMLElement).style.pageBreakInside = 'avoid';
          (section as HTMLElement).style.breakInside = 'avoid';
          (section as HTMLElement).style.display = 'block';
        });
        
        // Ensure research section gets its own page and is fully visible
        const researchSection = clonedDoc.querySelector('.research-content');
        if (researchSection) {
          (researchSection as HTMLElement).style.pageBreakBefore = 'always';
          (researchSection as HTMLElement).style.pageBreakInside = 'avoid';
          (researchSection as HTMLElement).style.breakBefore = 'always';
          (researchSection as HTMLElement).style.breakInside = 'avoid';
          (researchSection as HTMLElement).style.display = 'block';
          (researchSection as HTMLElement).style.visibility = 'visible';
        }
        
        // Apply professional formatting to the PDF content
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          // Ensure no elements break across pages
          (el as HTMLElement).style.pageBreakInside = 'avoid';
          (el as HTMLElement).style.breakInside = 'avoid';
          
          if (el.tagName === 'H3') {
            (el as HTMLElement).style.fontSize = '18px';
            (el as HTMLElement).style.fontWeight = 'bold';
            (el as HTMLElement).style.marginTop = '15px';
            (el as HTMLElement).style.marginBottom = '10px';
            (el as HTMLElement).style.paddingBottom = '5px';
            (el as HTMLElement).style.borderBottom = '1px solid #374151';
            (el as HTMLElement).style.pageBreakAfter = 'avoid';
            (el as HTMLElement).style.breakAfter = 'avoid';
          }
          
          if (el.tagName === 'H4') {
            (el as HTMLElement).style.fontSize = '16px';
            (el as HTMLElement).style.fontWeight = 'bold';
            (el as HTMLElement).style.marginTop = '12px';
            (el as HTMLElement).style.marginBottom = '8px';
            (el as HTMLElement).style.pageBreakAfter = 'avoid';
            (el as HTMLElement).style.breakAfter = 'avoid';
          }
          
          if (el.tagName === 'P') {
            (el as HTMLElement).style.fontSize = '14px';
            (el as HTMLElement).style.lineHeight = '1.6';
            (el as HTMLElement).style.marginBottom = '8px';
            (el as HTMLElement).style.pageBreakInside = 'avoid';
            (el as HTMLElement).style.breakInside = 'avoid';
          }
          
          if (el.tagName === 'LI') {
            (el as HTMLElement).style.fontSize = '14px';
            (el as HTMLElement).style.lineHeight = '1.5';
            (el as HTMLElement).style.marginBottom = '6px';
            (el as HTMLElement).style.textAlign = 'left';
            (el as HTMLElement).style.pageBreakInside = 'avoid';
            (el as HTMLElement).style.breakInside = 'avoid';
          }
          
          if (el.tagName === 'UL') {
            (el as HTMLElement).style.paddingLeft = '20px';
            (el as HTMLElement).style.marginBottom = '14px';
            (el as HTMLElement).style.textAlign = 'left';
            (el as HTMLElement).style.pageBreakInside = 'avoid';
            (el as HTMLElement).style.breakInside = 'avoid';
          }
        });
        
        // Ensure title is properly styled
        const titleElement = clonedDoc.querySelector('.text-2xl');
        if (titleElement) {
          (titleElement as HTMLElement).style.fontSize = '24px';
          (titleElement as HTMLElement).style.fontWeight = 'bold';
          (titleElement as HTMLElement).style.textAlign = 'center';
          (titleElement as HTMLElement).style.padding = '20px 0';
          (titleElement as HTMLElement).style.borderBottom = '2px solid #4b5563';
          (titleElement as HTMLElement).style.marginBottom = '25px';
          (titleElement as HTMLElement).style.color = '#f3f4f6';
          (titleElement as HTMLElement).style.pageBreakAfter = 'avoid';
          (titleElement as HTMLElement).style.breakAfter = 'avoid';
        }
        
        // Setup the detailed sections layout - convert to a two-column layout
        const detailedSections = clonedDoc.querySelectorAll('.section-detail');
        detailedSections.forEach((el, index) => {
          // Start new page after every two sections (index 0 and 1 on first page, 2 and 3 on second page, etc.)
          if (index % 2 === 0 && index > 0) {
            (el as HTMLElement).style.pageBreakBefore = 'always';
            (el as HTMLElement).style.breakBefore = 'always';
          }
          
          // Style each section as a card with original colors preserved
          (el as HTMLElement).style.maxHeight = 'none';
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.padding = '20px';
          (el as HTMLElement).style.borderRadius = '6px';
          (el as HTMLElement).style.marginTop = '15px';
          (el as HTMLElement).style.marginBottom = '25px';
          (el as HTMLElement).style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
          (el as HTMLElement).style.pageBreakInside = 'avoid'; // Prevent section from breaking across pages
          (el as HTMLElement).style.breakInside = 'avoid';
          
          // Ensure headers in sections stand out
          const sectionHeaders = el.querySelectorAll('h4');
          sectionHeaders.forEach(header => {
            (header as HTMLElement).style.fontSize = '16px';
            (header as HTMLElement).style.fontWeight = '600';
            (header as HTMLElement).style.marginTop = '12px';
            (header as HTMLElement).style.marginBottom = '8px';
            (header as HTMLElement).style.borderBottom = '1px solid #374151';
            (header as HTMLElement).style.paddingBottom = '5px';
            (header as HTMLElement).style.color = '#f3f4f6';
            (header as HTMLElement).style.pageBreakAfter = 'avoid';
            (header as HTMLElement).style.breakAfter = 'avoid';
          });
          
          // Style strengths with green color
          const strengthItems = el.querySelectorAll('.text-emerald-700');
          strengthItems.forEach(item => {
            (item as HTMLElement).style.color = '#10b981'; // Emerald color for strengths
          });
          
          // Style weaknesses with red color
          const weaknessItems = el.querySelectorAll('.text-rose-700');
          weaknessItems.forEach(item => {
            (item as HTMLElement).style.color = '#f43f5e'; // Rose color for weaknesses
          });
        });
      }
    });

    // Calculate dimensions for A4 with no margins
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF document with no margins
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    
    // Remove white margins from pages
    pdf.setDrawColor(17, 24, 39); // Dark background color
    pdf.setFillColor(17, 24, 39); // Dark background color
    pdf.rect(0, 0, imgWidth, pageHeight, 'F');
    
    // Add the canvas image to fill the entire page without margins
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Add more pages if needed - one page per major section
    let heightLeft = imgHeight - pageHeight;
    let position = -pageHeight;
    
    while (heightLeft > 0) {
      pdf.addPage();
      position -= pageHeight;
      
      // Fill the new page with the background color
      pdf.setDrawColor(17, 24, 39);
      pdf.setFillColor(17, 24, 39);
      pdf.rect(0, 0, imgWidth, pageHeight, 'F');
      
      // Add the rest of the content
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0), 
        'PNG', 
        0, // Left margin = 0
        position, // Position based on previous page
        imgWidth, // Full width
        imgHeight // Full height of content
      );
      
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

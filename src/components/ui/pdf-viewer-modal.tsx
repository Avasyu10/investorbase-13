
import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title?: string;
}

const PdfViewerModal = ({ isOpen, onClose, pdfUrl, title }: PdfViewerModalProps) => {
  const [loading, setLoading] = React.useState(true);

  // Reset loading state when modal opens with new PDF
  React.useEffect(() => {
    if (isOpen) {
      setLoading(true);
    }
  }, [isOpen, pdfUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        {title && (
          <DialogTitle className="px-6 pt-6 pb-2">{title}</DialogTitle>
        )}
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <div className="w-full h-full relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                onLoad={() => setLoading(false)}
                title="PDF Viewer"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No PDF available to view</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;

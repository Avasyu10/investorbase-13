
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AnalysisLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisLimitModal = ({ isOpen, onClose }: AnalysisLimitModalProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Analysis Limit Reached</AlertDialogTitle>
          <AlertDialogDescription>
            You have reached your maximum number of allowed analyses. Please contact support for more information.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

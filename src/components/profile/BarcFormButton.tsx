
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function BarcFormButton() {
  const handleClick = () => {
    // This would link to your existing BARC form route
    window.open('/submit/barc-form', '_blank');
  };

  return (
    <Button 
      onClick={handleClick} 
      variant="outline" 
      className="flex items-center"
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      BARC Application Form
    </Button>
  );
}

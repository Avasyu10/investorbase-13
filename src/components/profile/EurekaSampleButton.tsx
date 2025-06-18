
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function EurekaSampleButton() {
  const handleClick = () => {
    window.open('/submit/eureka-sample', '_blank');
  };

  return (
    <Button 
      onClick={handleClick} 
      variant="outline" 
      className="flex items-center"
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      Eureka Sample Form
    </Button>
  );
}

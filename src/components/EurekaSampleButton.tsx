
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export function EurekaSampleButton() {
  const handleClick = () => {
    // Open the eureka sample form in a new tab
    window.open("/eureka-sample/iit-bombay-eureka", "_blank");
  };

  return (
    <Button variant="outline" className="flex items-center gap-2" onClick={handleClick}>
      <Rocket className="h-4 w-4" />
      Eureka Sample
    </Button>
  );
}


import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export function EurekaSampleButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate directly to the eureka sample form with a specific slug
    navigate("/eureka-sample/iit-bombay-eureka");
  };

  return (
    <Button variant="outline" className="flex items-center gap-2" onClick={handleClick}>
      <Rocket className="h-4 w-4" />
      Eureka Sample
    </Button>
  );
}

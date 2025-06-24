
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Code2 } from "lucide-react";
import EurekaEmbedHelper from "@/components/forms/EurekaEmbedHelper";

const EurekaEmbedButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="flex items-center gap-2"
        >
          <Code2 className="h-4 w-4" />
          Generate Embed Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eureka Form Embed Generator</DialogTitle>
          <DialogDescription>
            Generate embeddable iframe code for your Eureka application form to share on other websites.
          </DialogDescription>
        </DialogHeader>
        <EurekaEmbedHelper />
      </DialogContent>
    </Dialog>
  );
};

export default EurekaEmbedButton;

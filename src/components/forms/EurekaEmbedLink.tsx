
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EurekaEmbedLink() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const currentDomain = window.location.origin;
  const embedUrl = `${currentDomain}/submit/eureka-sample`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="800" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Iframe code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    window.open(embedUrl, '_blank');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Embed Eureka Form
        </CardTitle>
        <CardDescription>
          Copy the iframe code below to embed this form on other websites
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="embed-url">Form URL</Label>
          <div className="flex gap-2">
            <Input
              id="embed-url"
              value={embedUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={openInNewTab}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="iframe-code">Iframe Code</Label>
          <div className="relative">
            <textarea
              id="iframe-code"
              value={iframeCode}
              readOnly
              className="w-full p-3 border rounded-md font-mono text-sm resize-none h-20"
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> The embedded form will maintain all functionality including form submission and analysis.</p>
          <p>Recommended iframe height: 800px minimum to avoid scrolling issues.</p>
        </div>
      </CardContent>
    </Card>
  );
}

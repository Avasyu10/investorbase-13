
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmbedOptions {
  title: string;
  description: string;
  hideHeader: boolean;
  width: string;
  height: string;
  theme: string;
}

const EurekaEmbedHelper = () => {
  const { toast } = useToast();
  const [embedOptions, setEmbedOptions] = useState<EmbedOptions>({
    title: "Eureka Sample Application Form",
    description: "Submit your application - analysis will start automatically",
    hideHeader: false,
    width: "100%",
    height: "800px",
    theme: "default"
  });

  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/eureka/embed/eureka-sample`;
  
  const generateEmbedUrl = () => {
    const params = new URLSearchParams();
    
    if (embedOptions.title !== "Eureka Sample Application Form") {
      params.append('title', embedOptions.title);
    }
    if (embedOptions.description !== "Submit your application - analysis will start automatically") {
      params.append('description', embedOptions.description);
    }
    if (embedOptions.hideHeader) {
      params.append('hideHeader', 'true');
    }
    if (embedOptions.theme !== 'default') {
      params.append('theme', embedOptions.theme);
    }
    
    return params.toString() ? `${embedUrl}?${params.toString()}` : embedUrl;
  };

  const generateIframeCode = () => {
    const url = generateEmbedUrl();
    return `<iframe 
  src="${url}" 
  width="${embedOptions.width}" 
  height="${embedOptions.height}"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
  allow="clipboard-write"
  loading="lazy">
</iframe>`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    });
  };

  const previewUrl = generateEmbedUrl();
  const iframeCode = generateIframeCode();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Eureka Form Embed Generator
          </CardTitle>
          <CardDescription>
            Generate embeddable iframe code for your Eureka application form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customization Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customization Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Form Title</Label>
                <Input
                  id="title"
                  value={embedOptions.title}
                  onChange={(e) => setEmbedOptions(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Form title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Form Description</Label>
                <Input
                  id="description"
                  value={embedOptions.description}
                  onChange={(e) => setEmbedOptions(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Form description"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  value={embedOptions.width}
                  onChange={(e) => setEmbedOptions(prev => ({ ...prev, width: e.target.value }))}
                  placeholder="100%"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  value={embedOptions.height}
                  onChange={(e) => setEmbedOptions(prev => ({ ...prev, height: e.target.value }))}
                  placeholder="800px"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <select
                  id="theme"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  value={embedOptions.theme}
                  onChange={(e) => setEmbedOptions(prev => ({ ...prev, theme: e.target.value }))}
                >
                  <option value="default">Default</option>
                  <option value="minimal">Minimal</option>
                  <option value="branded">Branded</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="hideHeader"
                checked={embedOptions.hideHeader}
                onCheckedChange={(checked) => setEmbedOptions(prev => ({ ...prev, hideHeader: checked }))}
              />
              <Label htmlFor="hideHeader">Hide form header</Label>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(previewUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Preview
              </Button>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <iframe
                src={previewUrl}
                width="100%"
                height="400px"
                className="border-none rounded"
                title="Eureka Form Preview"
              />
            </div>
          </div>

          {/* Generated Code */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Embed Code</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Direct URL</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(previewUrl, "URL")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </Button>
                </div>
                <Input value={previewUrl} readOnly className="font-mono text-sm" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>iframe Code</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(iframeCode, "iframe code")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </Button>
                </div>
                <Textarea
                  value={iframeCode}
                  readOnly
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>
            </div>
          </div>

          {/* Implementation Notes */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Implementation Notes</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>The embedded form maintains the same backend functionality as the original form</li>
              <li>Form submissions will trigger the same analysis process</li>
              <li>All validation and security measures remain in place</li>
              <li>The form is responsive and will adapt to the container size</li>
              <li>HTTPS is required for proper iframe functionality</li>
            </ul>
          </div>

          {/* Usage Examples */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Usage Examples</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <Badge variant="secondary" className="mr-2">Website</Badge>
                Copy the iframe code into your HTML
              </div>
              <div>
                <Badge variant="secondary" className="mr-2">WordPress</Badge>
                Use the HTML block or custom HTML widget
              </div>
              <div>
                <Badge variant="secondary" className="mr-2">Notion</Badge>
                Use the embed block with the direct URL
              </div>
              <div>
                <Badge variant="secondary" className="mr-2">React</Badge>
                Use dangerouslySetInnerHTML or a dedicated iframe component
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EurekaEmbedHelper;

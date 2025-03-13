
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadReport, analyzeReport } from "@/lib/supabase";
import { FileUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function ReportUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        uiToast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        uiToast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      uiToast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }
    
    if (!title.trim()) {
      uiToast({
        title: "Title required",
        description: "Please provide a title for the report",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setProgressStage("Uploading pitch deck...");
      setProgress(10);
      
      // Upload the report
      console.log("Starting upload process");
      const report = await uploadReport(file, title, description);
      setProgress(40);
      console.log("Upload complete, report:", report);
      
      toast({
        title: "Upload complete",
        description: "Your pitch deck has been uploaded successfully",
      });
      
      // Start analysis
      setIsAnalyzing(true);
      setProgressStage("Analyzing pitch deck with AI...");
      setProgress(50);
      
      toast({
        title: "Analysis started",
        description: "This may take a few minutes depending on the size of your deck",
      });
      
      try {
        console.log("Starting analysis with report ID:", report.id);
        const result = await analyzeReport(report.id);
        setProgress(100);
        console.log("Analysis complete, result:", result);
        
        toast({
          title: "Analysis complete",
          description: "Your pitch deck has been analyzed successfully!",
        });
        
        // Navigate to the company page
        if (result && result.companyId) {
          navigate(`/company/${result.companyId}`);
        } else {
          console.error("No company ID returned from analysis");
          navigate('/dashboard');
        }
      } catch (analysisError) {
        console.error("Error analyzing report:", analysisError);
        toast({
          title: "Analysis failed",
          description: analysisError instanceof Error ? analysisError.message : "Failed to analyze pitch deck. The file was uploaded but couldn't be analyzed.",
          variant: "destructive",
        });
        
        // Still navigate to dashboard if analysis fails
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error processing report:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process pitch deck",
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Pitch Deck</CardTitle>
        <CardDescription>
          Upload a PDF pitch deck for analysis. Our AI will evaluate the pitch deck and provide feedback.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this pitch deck"
              disabled={isUploading || isAnalyzing}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief description"
              disabled={isUploading || isAnalyzing}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">PDF File</Label>
            <div className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center space-y-2">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Drag and drop or click to upload"}
                </p>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading || isAnalyzing}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file")?.click()}
                  disabled={isUploading || isAnalyzing}
                >
                  Select PDF
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF files only, max 10MB
                </p>
              </div>
            </div>
          </div>
          
          {(isUploading || isAnalyzing) && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{progressStage}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground italic mt-1">
                {isAnalyzing ? "AI analysis may take a few minutes. Please be patient..." : ""}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            disabled={!file || isUploading || isAnalyzing}
            className="w-full md:w-auto"
          >
            {isUploading || isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAnalyzing ? "Analyzing..." : "Uploading..."}
              </>
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

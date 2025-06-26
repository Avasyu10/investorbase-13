
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VCChatInterface } from "./VCChatInterface";

export function VCAnalysisUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [chatOpen, setChatOpen] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== acceptedFiles.length) {
      toast.error("Only PDF files are allowed");
    }
    setFiles(prev => [...prev, ...pdfFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one PDF file");
      return;
    }

    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("You must be logged in to upload documents");
      }

      // Upload each file
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${companyName}/${Date.now()}-${index}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('vc-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Update progress
        const progress = ((index + 1) / files.length) * 80; // 80% for upload, 20% for processing
        setUploadProgress(progress);

        return fileName;
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Create database entries for the uploaded documents
      const { error: dbError } = await supabase
        .from('vc_documents')
        .insert(
          uploadedFiles.map(filePath => ({
            user_id: user.id,
            company_name: companyName,
            file_path: filePath,
            notes: notes || null,
            status: 'uploaded'
          }))
        );

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadStatus('success');
      
      toast.success(`Successfully uploaded ${files.length} document(s) for ${companyName}`);
      
      // Reset form
      setTimeout(() => {
        setFiles([]);
        setCompanyName("");
        setNotes("");
        setUploadProgress(0);
        setUploadStatus('idle');
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast.error(error.message || "Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'uploading': return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VC Document Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Upload pitch decks and investment documents for AI-powered analysis
          </p>
        </div>
        <Button 
          onClick={() => setChatOpen(true)}
          variant="default"
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          VC Assistant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload PDF pitch decks and related investment documents for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              type="text"
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} disabled={isUploading} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the PDF files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop PDF files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Only PDF files are supported
                </p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context or specific questions about these documents..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={getStatusColor()}>
                  {uploadStatus === 'uploading' ? 'Uploading documents...' : 
                   uploadStatus === 'success' ? 'Upload completed!' :
                   uploadStatus === 'error' ? 'Upload failed' : ''}
                </span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {uploadStatus !== 'idle' && (
            <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
              {getStatusIcon()}
              <span>
                {uploadStatus === 'uploading' ? 'Processing your documents...' :
                 uploadStatus === 'success' ? 'Documents uploaded successfully!' :
                 uploadStatus === 'error' ? 'Failed to upload documents' : ''}
              </span>
            </div>
          )}

          <Button 
            onClick={handleUpload}
            disabled={files.length === 0 || !companyName.trim() || isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <VCChatInterface 
        open={chatOpen} 
        onOpenChange={setChatOpen} 
      />
    </div>
  );
}

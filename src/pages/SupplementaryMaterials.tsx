import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertCircle, Download, FileText, Loader } from "lucide-react";
import { useCompanyDetails } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type SupplementaryFile = {
  name: string;
  url: string;
  size?: number;
  type?: string; 
};

// The correct bucket name as shown in your Supabase dashboard
const STORAGE_BUCKET_NAME = "Supplementary Materials";

const SupplementaryMaterials = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { company, isLoading: companyLoading } = useCompanyDetails(companyId);
  const [files, setFiles] = useState<SupplementaryFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noFilesDialogOpen, setNoFilesDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Set loading state immediately to true
    setIsLoading(true);
    setError(null); // Reset error state
    
    // Only proceed with fetching if company data is available
    if (!companyLoading && company) {
      const fetchSupplementaryFiles = async () => {
        try {
          console.log("Starting to fetch supplementary files for company:", company.name);
          
          // Get the report ID associated with the company
          const getReportIdForCompany = async () => {
            if (!companyId) return null;
            
            try {
              // Try to get the report ID from the company object first
              if (company?.reportId) {
                console.log("Using reportId from company object:", company.reportId);
                return company.reportId;
              }
              
              // If not found in the company object, try to get it from the reports table
              console.log("Looking up reportId from reports table for company:", companyId);
              
              const { data, error } = await supabase
                .from('reports')
                .select('id')
                .eq('company_id', companyId)
                .maybeSingle();
                
              if (error) {
                console.error("Error getting report ID:", error);
                throw new Error(`Failed to get report ID: ${error.message}`);
              }
              
              if (data?.id) {
                console.log("Found reportId in reports table:", data.id);
                return data.id;
              }
              
              console.log("No reportId found for company", companyId);
              return null;
            } catch (err) {
              console.error("Error in getReportIdForCompany:", err);
              throw err;
            }
          };
          
          // Get the report ID
          const reportId = await getReportIdForCompany();
          
          setDebugInfo(prev => prev + `\nCompany: ${company.name}\nReport ID: ${reportId}`);
          
          if (!reportId) {
            console.log("No reportId available for company:", company.name);
            setNoFilesDialogOpen(true);
            setIsLoading(false);
            return;
          }
          
          console.log("Fetching supplementary files for report:", reportId);
          
          // Try to list files directly without checking bucket existence first
          // This approach is more direct and less prone to errors with bucket name casing
          console.log(`Listing files from bucket: ${STORAGE_BUCKET_NAME}, path: ${reportId}`);
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .list(`${reportId}`);
            
          if (error) {
            console.error("Error fetching supplementary files:", error);
            
            // Specially handle bucket not found errors
            if (error.message.includes("not found") || error.message.includes("does not exist")) {
              throw new Error(`The storage bucket "${STORAGE_BUCKET_NAME}" does not exist`);
            }
            
            throw new Error(`Error loading files: ${error.message}`);
          }
          
          console.log("Files data from Supabase:", data);
          setDebugInfo(prev => prev + `\nFiles found: ${data?.length || 0}`);
          
          if (data && data.length > 0) {
            // Create file objects with signed URLs
            const filePromises = data.map(async (file) => {
              console.log(`Creating signed URL for file: ${reportId}/${file.name}`);
              
              const { data: url, error: urlError } = await supabase.storage
                .from(STORAGE_BUCKET_NAME)
                .createSignedUrl(`${reportId}/${file.name}`, 3600); // 1 hour expiry
                
              if (urlError) {
                console.error(`Error creating signed URL for ${file.name}:`, urlError);
                return { name: file.name, url: '' };
              }
              
              console.log(`Signed URL created for ${file.name}`);
              
              return {
                name: file.name,
                url: url?.signedUrl || '',
                size: file.metadata?.size,
                type: file.metadata?.mimetype
              };
            });
            
            const fileObjects = await Promise.all(filePromises);
            const validFiles = fileObjects.filter(file => file.url);
            
            console.log(`Found ${validFiles.length} valid files with URLs`);
            setDebugInfo(prev => prev + `\nValid files: ${validFiles.length}`);
            setFiles(validFiles);
            
            if (validFiles.length === 0) {
              console.log("No valid files found, showing dialog");
              setNoFilesDialogOpen(true);
            }
          } else {
            // Show modal if no files found
            console.log("No files found in storage, showing dialog");
            setNoFilesDialogOpen(true);
          }
        } catch (err) {
          console.error("Error processing supplementary files:", err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          toast.error("Failed to load supplementary materials", {
            description: errorMessage
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchSupplementaryFiles();
    }
  }, [company, companyId, companyLoading]);

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

  const handleDownload = (file: SupplementaryFile) => {
    if (!file.url) {
      toast.error("Unable to download file", {
        description: "The file URL is not available."
      });
      return;
    }
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  const handleCloseNoFilesDialog = () => {
    setNoFilesDialogOpen(false);
    navigate(-1);
  };

  // Show loading indicator if any of these conditions are true
  if (authLoading || companyLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading materials...</p>
        </div>
      </div>
    );
  }

  if (!user || !company) return null;

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="mb-6"
        >
          <ChevronLeft className="mr-1" /> Back
        </Button>
        
        <h1 className="text-2xl font-bold tracking-tight mb-6">
          Supplementary Materials for {company.name}
        </h1>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {files.length === 0 && !noFilesDialogOpen ? (
          <Alert variant="default" className="bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Supplementary Materials</AlertTitle>
            <AlertDescription>
              No supplementary materials are available for this company.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-card rounded-md border shadow-sm"
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{file.name}</span>
                    {file.size && (
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => window.open(file.url, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    View
                  </Button>
                  <Button 
                    onClick={() => handleDownload(file)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Debug info in development mode (add ?debug=true to URL) */}
        {window.location.search.includes('debug=true') && debugInfo && (
          <div className="mt-8 p-4 bg-muted rounded border">
            <h3 className="font-bold">Debug Info:</h3>
            <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
          </div>
        )}
        
        <Dialog open={noFilesDialogOpen} onOpenChange={setNoFilesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No Supplementary Materials</DialogTitle>
              <DialogDescription>
                There are no supplementary materials available for {company.name}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleCloseNoFilesDialog}>
                Return to Company Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SupplementaryMaterials;

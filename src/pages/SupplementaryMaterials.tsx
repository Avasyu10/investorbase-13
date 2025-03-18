
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertCircle, Download } from "lucide-react";
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
};

const SupplementaryMaterials = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { company, isLoading: companyLoading } = useCompanyDetails(companyId);
  const [files, setFiles] = useState<SupplementaryFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noFilesDialogOpen, setNoFilesDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSupplementaryFiles = async () => {
      if (!company || !company.reportId) {
        console.log("No company or reportId available");
        setNoFilesDialogOpen(true);
        setIsLoading(false);
        return;
      }
      
      console.log("Fetching supplementary files for report:", company.reportId);
      
      try {
        // List all files in the supplementary-materials folder for this report
        const { data, error } = await supabase.storage
          .from('supplementary-materials')
          .list(`${company.reportId}`);
          
        if (error) {
          console.error("Error fetching supplementary files:", error);
          setError(`Error loading files: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        console.log("Files data from Supabase:", data);
        
        if (data && data.length > 0) {
          // Create file objects with signed URLs
          const filePromises = data.map(async (file) => {
            console.log(`Creating signed URL for file: ${company.reportId}/${file.name}`);
            
            const { data: url, error: urlError } = await supabase.storage
              .from('supplementary-materials')
              .createSignedUrl(`${company.reportId}/${file.name}`, 3600); // 1 hour expiry
              
            if (urlError) {
              console.error(`Error creating signed URL for ${file.name}:`, urlError);
              return { name: file.name, url: '' };
            }
            
            console.log(`Signed URL created: ${url?.signedUrl?.substring(0, 50)}...`);
            
            return {
              name: file.name,
              url: url?.signedUrl || ''
            };
          });
          
          const fileObjects = await Promise.all(filePromises);
          const validFiles = fileObjects.filter(file => file.url);
          
          console.log(`Found ${validFiles.length} valid files with URLs`);
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
        setError(`Error processing files: ${err instanceof Error ? err.message : 'Unknown error'}`);
        toast.error("Failed to load supplementary materials");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (company) {
      fetchSupplementaryFiles();
    }
  }, [company]);

  // Check if the supplementary-materials bucket exists and create it if it doesn't
  useEffect(() => {
    const checkAndCreateBucket = async () => {
      try {
        // Attempt to get bucket details to see if it exists
        const { data: bucketData, error: bucketError } = await supabase.storage
          .getBucket('supplementary-materials');
          
        if (bucketError) {
          console.log("Supplementary materials bucket might not exist, attempting to create it");
          // Try to create the bucket
          const { data, error } = await supabase.storage
            .createBucket('supplementary-materials', {
              public: false,
              fileSizeLimit: 10485760 // 10MB
            });
            
          if (error) {
            console.error("Error creating supplementary materials bucket:", error);
          } else {
            console.log("Created supplementary materials bucket:", data);
          }
        } else {
          console.log("Supplementary materials bucket exists:", bucketData);
        }
      } catch (err) {
        console.error("Error checking/creating bucket:", err);
      }
    };
    
    checkAndCreateBucket();
  }, []);

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

  if (authLoading || companyLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
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
                <span className="font-medium">{file.name}</span>
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

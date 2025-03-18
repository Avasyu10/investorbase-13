
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useCompanyDetails } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSupplementaryFiles = async () => {
      if (!company || !company.reportId) return;
      
      try {
        // List all files in the supplementary-materials folder for this report
        const { data, error } = await supabase.storage
          .from('supplementary-materials')
          .list(`${company.reportId}`);
          
        if (error) {
          console.error("Error fetching supplementary files:", error);
          return;
        }
        
        if (data && data.length > 0) {
          // Create file objects with signed URLs
          const filePromises = data.map(async (file) => {
            const { data: url } = await supabase.storage
              .from('supplementary-materials')
              .createSignedUrl(`${company.reportId}/${file.name}`, 3600); // 1 hour expiry
              
            return {
              name: file.name,
              url: url?.signedUrl || ''
            };
          });
          
          const fileObjects = await Promise.all(filePromises);
          setFiles(fileObjects.filter(file => file.url));
        }
      } catch (err) {
        console.error("Error processing supplementary files:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (company) {
      fetchSupplementaryFiles();
    }
  }, [company]);

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
        
        {files.length === 0 ? (
          <div className="bg-muted p-8 rounded-lg text-center">
            <p className="text-lg text-muted-foreground">
              No Supplementary Material for this Company
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-card rounded-md border shadow-sm"
              >
                <span className="font-medium">{file.name}</span>
                <Button 
                  onClick={() => handleDownload(file)}
                  variant="outline"
                  size="sm"
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplementaryMaterials;

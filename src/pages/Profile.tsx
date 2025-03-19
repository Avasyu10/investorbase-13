
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Edit, Globe, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AreaOfInterestOptions } from "@/lib/constants";
import PdfViewerModal from "@/components/ui/pdf-viewer-modal";

interface VCProfile {
  id: string;
  fund_name: string;
  fund_size: string;
  areas_of_interest: string[];
  investment_stage: string[];
  companies_invested: string[];
  fund_thesis_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

// Available options for the investment stage multiselect field
const stageOptions = [
  { label: "Pre-seed", value: "Pre-seed" },
  { label: "Seed", value: "Seed" },
  { label: "Series A", value: "Series A" },
  { label: "Series B", value: "Series B" },
  { label: "Series C+", value: "Series C+" },
  { label: "Growth", value: "Growth" },
  { label: "Late Stage", value: "Late Stage" }
];

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VCProfile | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');

  // Function to get label by value
  const getAreaOfInterestLabel = (value: string) => {
    const option = AreaOfInterestOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Function to get investment stage label by value
  const getInvestmentStageLabel = (value: string) => {
    const option = stageOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vc_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching profile:", error);
          // If no profile, redirect to profile setup
          if (error.code === 'PGRST116') {
            navigate('/profile/setup');
          }
          return;
        }
        
        setProfile(data as VCProfile);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, navigate]);
  
  const downloadThesis = async () => {
    if (!profile?.fund_thesis_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('vc-documents')
        .download(profile.fund_thesis_url);
        
      if (error) throw error;
      
      // Create a blob URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = profile.fund_thesis_url.split('/').pop() || 'fund_thesis.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewThesis = async () => {
    if (!profile?.fund_thesis_url) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('vc-documents')
        .download(profile.fund_thesis_url);
        
      if (error) throw error;
      
      // Create a blob URL for viewing
      const url = URL.createObjectURL(data);
      setPdfViewUrl(url);
      setIsPdfModalOpen(true);
      
    } catch (error: any) {
      toast({
        title: "Failed to view document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveWebsiteUrl = async () => {
    if (!user || !newWebsiteUrl.trim()) return;
    
    try {
      const { error } = await supabase
        .from('vc_profiles')
        .update({ website_url: newWebsiteUrl.trim() })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          website_url: newWebsiteUrl.trim()
        });
      }
      
      setShowUrlInput(false);
      
      toast({
        title: "URL saved",
        description: "Your website URL has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save URL",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Clean up blob URL when component unmounts or when modal closes
  useEffect(() => {
    return () => {
      if (pdfViewUrl) {
        URL.revokeObjectURL(pdfViewUrl);
      }
    };
  }, []);

  // Close the PDF modal and clean up the blob URL
  const handleCloseModal = () => {
    setIsPdfModalOpen(false);
    if (pdfViewUrl) {
      URL.revokeObjectURL(pdfViewUrl);
      setPdfViewUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>You haven't set up your VC profile yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/profile/setup')}>
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl mb-1">{profile.fund_name || "Your VC Fund"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 sm:mt-0"
              onClick={() => navigate('/profile/edit')}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Fund Details</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Fund Size</p>
                <p>{profile.fund_size || "Not specified"}</p>
              </div>
              {profile.fund_thesis_url && (
                <div>
                  <p className="text-sm font-medium">Fund Thesis</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={downloadThesis}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={viewThesis}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Investment Focus</h3>
            <Separator className="mb-4" />
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Areas of Interest</p>
                <div className="flex flex-wrap gap-2">
                  {profile.areas_of_interest && profile.areas_of_interest.length > 0 ? (
                    profile.areas_of_interest.map((area, index) => (
                      <Badge key={index} variant="secondary">
                        {getAreaOfInterestLabel(area)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No areas specified</p>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Investment Stages</p>
                <div className="flex flex-wrap gap-2">
                  {profile.investment_stage && profile.investment_stage.length > 0 ? (
                    profile.investment_stage.map((stage, index) => (
                      <Badge key={index} variant="secondary">{getInvestmentStageLabel(stage)}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No stages specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Portfolio</h3>
            <Separator className="mb-4" />
            
            <div>
              <p className="text-sm font-medium mb-2">Companies Invested</p>
              {profile.companies_invested && profile.companies_invested.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {profile.companies_invested.map((company, index) => (
                    <li key={index}>{company}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No companies specified</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Public URL</h3>
            <Separator className="mb-4" />
            
            <div>
              {profile.website_url ? (
                <div>
                  <a 
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Visit Website
                  </a>
                </div>
              ) : showUrlInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newWebsiteUrl}
                    onChange={(e) => setNewWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={saveWebsiteUrl}
                  >
                    Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowUrlInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUrlInput(true)}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Add URL
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* PDF Viewer Modal */}
      <PdfViewerModal 
        isOpen={isPdfModalOpen}
        onClose={handleCloseModal}
        pdfUrl={pdfViewUrl}
        title="Fund Thesis"
      />
    </div>
  );
};

export default Profile;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Building2, Calendar, CheckCircle, Eye, FileText, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// Component to display company analysis in an organized format
const CompanyAnalysisDialog = ({ analysisResult }: { analysisResult: any }) => {
  if (!analysisResult) {
    return <div className="text-muted-foreground">No analysis data available.</div>;
  }

  const sections = [
    { key: 'executive_summary', title: 'Executive Summary', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'market_opportunity', title: 'Market Opportunity', icon: <Building2 className="h-4 w-4" /> },
    { key: 'business_model', title: 'Business Model', icon: <Star className="h-4 w-4" /> },
    { key: 'team_assessment', title: 'Team Assessment', icon: <Eye className="h-4 w-4" /> },
    { key: 'financial_projections', title: 'Financial Projections', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'competitive_analysis', title: 'Competitive Analysis', icon: <Building2 className="h-4 w-4" /> },
    { key: 'risk_assessment', title: 'Risk Assessment', icon: <Star className="h-4 w-4" /> },
    { key: 'investment_recommendation', title: 'Investment Recommendation', icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const formatContent = (content: any) => {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      // Handle arrays
      if (Array.isArray(content)) {
        return content.map((item, index) => (
          <div key={index} className="mb-2">
            {typeof item === 'object' ? 
              Object.entries(item).map(([k, v]) => (
                <div key={k} className="ml-2">
                  <span className="font-medium">{k.replace(/_/g, ' ')}:</span> {String(v)}
                </div>
              )) : 
              <span>• {String(item)}</span>
            }
          </div>
        ));
      }
      
      // Handle objects - extract relevant information only
      return Object.entries(content).map(([key, value]) => {
        // Skip slide-by-slide notes and other irrelevant data
        if (key.includes('slide') || key.includes('note') || key.includes('_notes')) {
          return null;
        }
        
        return (
          <div key={key} className="mb-2">
            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
            <span>{String(value)}</span>
          </div>
        );
      }).filter(Boolean);
    }
    
    return String(content);
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const content = analysisResult[section.key];
        if (!content) return null;

        return (
          <div key={section.key} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              {section.icon}
              <h3 className="font-semibold text-lg">{section.title}</h3>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatContent(content)}
            </div>
          </div>
        );
      })}
      
      {/* Display any other relevant fields */}
      {Object.entries(analysisResult).map(([key, value]) => {
        if (sections.some(s => s.key === key) || !value || 
            key.includes('slide') || key.includes('note') || key.includes('_notes')) {
          return null;
        }
        
        return (
          <div key={key} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4" />
              <h3 className="font-semibold text-lg capitalize">{key.replace(/_/g, ' ')}</h3>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatContent(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface VCNotification {
  id: string;
  company_name: string;
  company_stage: string | null;
  company_industry: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean;
  founder_user_id: string;
  company_id: string;
  overall_score?: number;
  analysis_result?: any;
  deck_url?: string;
}

export const VCNotifications = () => {
  const [notifications, setNotifications] = useState<VCNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('vc_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vc_notifications'
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications(); // Refresh the list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      // First get the basic notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('vc_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        toast({
          title: "Error",
          description: "Failed to load notifications.",
          variant: "destructive"
        });
        return;
      }

      // Enrich with company and report data
      const enrichedNotifications = await Promise.all(
        (notificationsData || []).map(async (notification) => {
          // Get company data
          const { data: companyData } = await supabase
            .from('companies')
            .select('overall_score, report_id, deck_url')
            .eq('id', notification.company_id)
            .maybeSingle();

          // Get report analysis if company has a report
          let analysisResult = null;
          let reportScore = null;
          let pitchDeckUrl = companyData?.deck_url; // Use company deck_url first
          
          if (companyData?.report_id) {
            const { data: reportData } = await supabase
              .from('reports')
              .select('analysis_result, overall_score, pdf_url')
              .eq('id', companyData.report_id)
              .maybeSingle();
            
            analysisResult = reportData?.analysis_result;
            reportScore = reportData?.overall_score;
            
            // If no direct deck_url, use the report's pdf_url as the pitch deck
            if (!pitchDeckUrl && reportData?.pdf_url) {
              pitchDeckUrl = reportData.pdf_url;
            }
          }

          return {
            ...notification,
            overall_score: companyData?.overall_score || reportScore,
            analysis_result: analysisResult,
            deck_url: pitchDeckUrl
          };
        })
      );

      setNotifications(enrichedNotifications);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('vc_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading notifications...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
            <p className="text-muted-foreground">
              You'll receive notifications when companies express interest in connecting with you.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.is_read 
                    ? 'bg-muted/30 border-muted' 
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">{notification.company_name}</h4>
                        {!notification.is_read && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {notification.overall_score && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                            <Star className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                              {Math.round(notification.overall_score)}/100
                            </span>
                          </div>
                        )}
                        {notification.deck_url && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1 text-xs"
                            onClick={async () => {
                              try {
                                // Handle direct URLs (if deck_url is a full URL)
                                if (notification.deck_url?.startsWith('http')) {
                                  window.open(notification.deck_url, '_blank');
                                  return;
                                }
                                
                                // Get the report to access user_id for the correct path
                                const { data: companyData } = await supabase
                                  .from('companies')
                                  .select('report_id')
                                  .eq('id', notification.company_id)
                                  .maybeSingle();
                                
                                if (companyData?.report_id) {
                                  const { data: reportData } = await supabase
                                    .from('reports')
                                    .select('user_id, pdf_url')
                                    .eq('id', companyData.report_id)
                                    .maybeSingle();
                                  
                                  if (reportData?.user_id && reportData?.pdf_url) {
                                    // Use the correct bucket and path structure
                                    const bucketName = 'report-pdfs';
                                    const filePath = `${reportData.user_id}/${reportData.pdf_url}`;
                                    
                                    const { data: signedUrlData, error } = await supabase.storage
                                      .from(bucketName)
                                      .createSignedUrl(filePath, 300); // 5 minutes expiry
                                    
                                    if (error) {
                                      console.error('Error creating signed URL:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to access pitch deck.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    if (signedUrlData?.signedUrl) {
                                      window.open(signedUrlData.signedUrl, '_blank');
                                    }
                                  }
                                }
                              } catch (error) {
                                console.error('Error accessing pitch deck:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to access pitch deck.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <FileText className="h-3 w-3" />
                            View Pitch Deck
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {notification.message || "Company is interested in connecting with you!"}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      {notification.company_stage && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>Stage: {notification.company_stage}</span>
                        </div>
                      )}
                      {notification.company_industry && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>Industry: {notification.company_industry}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    {notification.analysis_result && (
                      <div className="mb-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              View Analysis
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                {notification.company_name} - Detailed Analysis
                              </DialogTitle>
                            </DialogHeader>
                            <CompanyAnalysisDialog analysisResult={notification.analysis_result} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                  
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
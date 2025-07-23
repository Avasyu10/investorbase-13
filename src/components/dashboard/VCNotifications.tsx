import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Building2, Calendar, CheckCircle, Eye, FileText, Star, TrendingUp, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { FounderVCChatInterface } from "@/components/chat/FounderVCChatInterface";

// Component to display company analysis in an organized format
const CompanyAnalysisDialog = ({ analysisResult }: { analysisResult: any }) => {
  if (!analysisResult) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Analysis Available</h3>
          <p className="text-muted-foreground">Analysis data is not available for this company.</p>
        </div>
      </div>
    );
  }

  // First, let's check if it's the sectioned format (like in the screenshot)
  const isSectionedFormat = analysisResult.sections || 
    (typeof analysisResult === 'object' && 
     Object.values(analysisResult).some((item: any) => 
       item && typeof item === 'object' && ('type' in item || 'score' in item || 'title' in item)
     ));

  if (isSectionedFormat) {
    // Handle the sectioned format from the screenshot
    const sections = analysisResult.sections || Object.values(analysisResult).filter((item: any) => 
      item && typeof item === 'object' && ('type' in item || 'title' in item)
    );

    const getScoreColor = (score: number) => {
      if (score >= 80) return "text-green-600 bg-green-50 dark:bg-green-900/20";
      if (score >= 60) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      return "text-red-600 bg-red-50 dark:bg-red-900/20";
    };

    const getTypeIcon = (type: string) => {
      switch (type?.toUpperCase()) {
        case 'PROBLEM':
          return <Eye className="h-5 w-5" />;
        case 'MARKET':
          return <TrendingUp className="h-5 w-5" />;
        case 'SOLUTION':
          return <Star className="h-5 w-5" />;
        case 'COMPETITIVE_LANDSCAPE':
          return <Building2 className="h-5 w-5" />;
        case 'TEAM':
          return <MessageCircle className="h-5 w-5" />;
        default:
          return <FileText className="h-5 w-5" />;
      }
    };

    const getTypeColor = (type: string) => {
      switch (type?.toUpperCase()) {
        case 'PROBLEM':
          return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
        case 'MARKET':
          return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
        case 'SOLUTION':
          return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800";
        case 'COMPETITIVE_LANDSCAPE':
          return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800";
        case 'TEAM':
          return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800";
        default:
          return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid gap-6">
          {sections.map((section: any, index: number) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(section.type)}`}>
                      {getTypeIcon(section.type)}
                    </div>
                    <div>
                      <Badge variant="outline" className={`mb-2 ${getTypeColor(section.type)}`}>
                        {section.type?.replace(/_/g, ' ') || 'Section'}
                      </Badge>
                      <CardTitle className="text-xl">
                        {section.title || section.type?.replace(/_/g, ' ') || 'Untitled Section'}
                      </CardTitle>
                    </div>
                  </div>
                  
                  {section.score !== undefined && (
                    <div className={`px-4 py-2 rounded-full font-semibold ${getScoreColor(section.score)}`}>
                      {section.score}/100
                    </div>
                  )}
                </div>
                
                {section.status && (
                  <div className="flex items-center gap-2 mt-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Status: {section.status}
                    </span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {section.description && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                )}
                
                {/* Display any additional fields */}
                {Object.entries(section).map(([key, value]) => {
                  if (['type', 'title', 'score', 'status', 'description'].includes(key) || !value) {
                    return null;
                  }
                  
                  return (
                    <div key={key} className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium text-sm text-foreground/80 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Display overall metrics if available */}
        {analysisResult.overall_score && (
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Overall Score</h3>
                    <p className="text-sm text-muted-foreground">Investment recommendation score</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {Math.round(analysisResult.overall_score)}/100
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Fallback to the original structured format
  const predefinedSections = [
    { key: 'executive_summary', title: 'Executive Summary', icon: <TrendingUp className="h-5 w-5" />, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    { key: 'market_opportunity', title: 'Market Opportunity', icon: <Building2 className="h-5 w-5" />, color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
    { key: 'business_model', title: 'Business Model', icon: <Star className="h-5 w-5" />, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
    { key: 'team_assessment', title: 'Team Assessment', icon: <MessageCircle className="h-5 w-5" />, color: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' },
    { key: 'financial_projections', title: 'Financial Projections', icon: <TrendingUp className="h-5 w-5" />, color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' },
    { key: 'competitive_analysis', title: 'Competitive Analysis', icon: <Building2 className="h-5 w-5" />, color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
    { key: 'risk_assessment', title: 'Risk Assessment', icon: <Eye className="h-5 w-5" />, color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
    { key: 'investment_recommendation', title: 'Investment Recommendation', icon: <CheckCircle className="h-5 w-5" />, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' }
  ];

  const formatContent = (content: any) => {
    if (typeof content === 'string') {
      return <p className="leading-relaxed">{content}</p>;
    }
    
    if (typeof content === 'object' && content !== null) {
      if (Array.isArray(content)) {
        return (
          <ul className="space-y-2">
            {content.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>{typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      
      return (
        <div className="space-y-3">
          {Object.entries(content).map(([key, value]) => {
            if (key.includes('slide') || key.includes('note') || key.includes('_notes')) {
              return null;
            }
            
            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="font-medium text-sm text-foreground/80">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="text-muted-foreground">{String(value)}</span>
              </div>
            );
          }).filter(Boolean)}
        </div>
      );
    }
    
    return <p className="leading-relaxed">{String(content)}</p>;
  };

  return (
    <div className="space-y-6">
      {predefinedSections.map((section) => {
        const content = analysisResult[section.key];
        if (!content) return null;

        return (
          <Card key={section.key} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${section.color}`}>
                  {section.icon}
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {formatContent(content)}
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Display any other relevant fields */}
      {Object.entries(analysisResult).map(([key, value]) => {
        if (predefinedSections.some(s => s.key === key) || !value || 
            key.includes('slide') || key.includes('note') || key.includes('_notes') ||
            key === 'overall_score') {
          return null;
        }
        
        return (
          <Card key={key} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                  <FileText className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg capitalize">{key.replace(/_/g, ' ')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {formatContent(value)}
              </div>
            </CardContent>
          </Card>
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
  const [acceptedNotifications, setAcceptedNotifications] = useState<Set<string>>(new Set());
  const [selectedChatFounder, setSelectedChatFounder] = useState<{
    userId: string;
    name: string;
    companyName: string;
  } | null>(null);

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

  const handleAcceptNotification = (notificationId: string) => {
    setAcceptedNotifications(prev => new Set([...prev, notificationId]));
    toast({
      title: "Notification Accepted",
      description: "You can now chat with that founder!",
    });
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
                                console.log('Pitch deck button clicked for notification:', notification.id);
                                console.log('Company ID:', notification.company_id);
                                
                                // Handle direct URLs (if deck_url is a full URL)
                                if (notification.deck_url?.startsWith('http')) {
                                  window.open(notification.deck_url, '_blank');
                                  return;
                                }
                                
                                // Get the company and report data
                                const { data: companyData } = await supabase
                                  .from('companies')
                                  .select('report_id')
                                  .eq('id', notification.company_id)
                                  .maybeSingle();
                                
                                if (!companyData?.report_id) {
                                  toast({
                                    title: "Error",
                                    description: "No pitch deck available for this company.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                // Fetch the report to get the pdf_url and user_id
                                const { data: report } = await supabase
                                  .from('reports')
                                  .select('pdf_url, user_id, is_public_submission')
                                  .eq('id', companyData.report_id)
                                  .maybeSingle();

                                if (!report || !report.pdf_url) {
                                  toast({
                                    title: "Error",
                                    description: "No pitch deck available for this company.",
                                    variant: "destructive"
                                  });
                                  return;
                                }

                                console.log('Report found, downloading PDF:', report.pdf_url);

                                // Download PDF using the same logic as ViewOnlyCompaniesTable
                                const bucketName = 'report-pdfs';
                                let pdfData = null;

                                // Try with user_id path first (this is the correct format)
                                if (report.user_id) {
                                  const userPath = `${report.user_id}/${report.pdf_url}`;
                                  console.log('Trying user path:', userPath);
                                  const { data: userData, error: userError } = await supabase.storage
                                    .from(bucketName)
                                    .download(userPath);

                                  if (!userError && userData) {
                                    pdfData = userData;
                                    console.log('PDF downloaded successfully (user path):', userPath);
                                  } else {
                                    console.log('Failed to download from user path:', userPath, userError);
                                  }
                                }

                                // Fallback to direct path if user path fails
                                if (!pdfData) {
                                  console.log('Trying direct path:', report.pdf_url);
                                  const { data: directData, error: directError } = await supabase.storage
                                    .from(bucketName)
                                    .download(report.pdf_url);

                                  if (!directError && directData) {
                                    pdfData = directData;
                                    console.log('PDF downloaded successfully (direct path)');
                                  } else {
                                    console.log('Failed to download from direct path:', report.pdf_url, directError);
                                  }
                                }

                                if (!pdfData) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to access pitch deck.",
                                    variant: "destructive"
                                  });
                                  return;
                                }

                                // Create blob URL and open in new tab
                                const blobUrl = URL.createObjectURL(new Blob([pdfData], { type: 'application/pdf' }));
                                window.open(blobUrl, '_blank');
                                toast({
                                  title: "Success",
                                  description: "Opening pitch deck...",
                                });

                                // Clean up the blob URL after a delay
                                setTimeout(() => {
                                  URL.revokeObjectURL(blobUrl);
                                }, 1000);
                                
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
                    
                    <div className="flex items-center gap-2 mb-2">
                      {notification.analysis_result && (
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
                      )}
                      
                      {acceptedNotifications.has(notification.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setSelectedChatFounder({
                            userId: notification.founder_user_id,
                            name: 'Founder',
                            companyName: notification.company_name
                          })}
                        >
                          <MessageCircle className="h-3 w-3" />
                          Connect with Founder
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleAcceptNotification(notification.id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Accept
                        </Button>
                      )}
                    </div>
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
      
      {/* Founder-VC Chat Interface */}
      {selectedChatFounder && (
        <FounderVCChatInterface
          open={!!selectedChatFounder}
          onOpenChange={(open) => !open && setSelectedChatFounder(null)}
          founderUserId={selectedChatFounder.userId}
          founderName={selectedChatFounder.name}
          companyName={selectedChatFounder.companyName}
        />
      )}
    </Card>
  );
};
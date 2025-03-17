
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Menu, X, CheckCircle, XCircle, Maximize } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";

export function SectionDetail() {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const { company } = useCompanyDetails(companyId);
  const { section, isLoading } = useSectionDetails(companyId, sectionId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="w-64 border-r bg-background/95 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="px-4 py-3 border-b">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Card className="shadow-sm animate-pulse">
            <CardHeader className="pb-4 border-b">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!company || !section) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Section details not found</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-700"; // Darker for better contrast
    if (score >= 3.5) return "text-blue-700";    // Darker for better contrast
    if (score >= 2.5) return "text-amber-700";   // Darker for better contrast
    if (score >= 1.5) return "text-orange-700";  // Darker for better contrast
    return "text-red-700";                       // Darker for better contrast
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)]">
      <Button 
        variant="outline" 
        size="icon"
        className="fixed bottom-4 right-4 z-50 lg:hidden shadow-md rounded-full h-12 w-12"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      <div 
        className={`fixed lg:relative lg:flex w-64 border-r bg-muted/30 h-[calc(100vh-4rem)] top-16 z-40 transition-all duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } overflow-y-auto`}
      >
        <div className="p-4 border-b">
          <h3 className="font-medium text-foreground">{company.name}</h3>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <nav className="flex flex-col w-full">
          {company.sections.map((s) => (
            <Link
              key={s.id}
              to={`/company/${companyId}/section/${s.id}`}
              className={`flex items-center px-4 py-3 text-sm hover:bg-muted/80 transition-colors ${
                Number(s.id) === Number(sectionId) ? "bg-muted/80 font-medium" : ""
              }`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="flex-1">{s.title}</span>
              {Number(s.id) === Number(sectionId) && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-3 sm:p-6 w-full">
        <Card className="shadow-md border-muted">
          <CardHeader className="pb-4 border-b bg-secondary/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">{section.title}</CardTitle>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                {company.reportId && (
                  <Button 
                    onClick={() => setShowReportModal(true)}
                    variant="outline"
                    className="flex items-center gap-2 bg-background hover:bg-secondary"
                    size="sm"
                  >
                    <Maximize className="h-4 w-4" />
                    View Deck
                  </Button>
                )}
                <span className="font-medium text-sm sm:text-base text-foreground">Score: {section.score}/5</span>
                <div className="w-24 sm:w-32">
                  <Progress 
                    value={section.score * 20} 
                    className={`h-2.5 ${section.score >= 4 ? 'bg-emerald-200' : section.score >= 2.5 ? 'bg-amber-200' : 'bg-red-200'}`}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 sm:pt-8">
            <div className="space-y-6">
              <div className="p-5 rounded-lg bg-secondary/40 border border-border shadow-sm">
                <h3 className="text-lg font-medium mb-3 text-foreground">Summary</h3>
                <p 
                  className="text-sm sm:text-base leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ 
                    __html: section.description.replace(/([\d.]+%|[\d.,]+|[$€£¥][\d.,]+|[\d.,]+[KMBTkmbt])/g, 
                      match => `<span class="font-semibold ${getScoreColor(section.score)}">${match}</span>`) 
                  }}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-lg border border-emerald-300 bg-emerald-50/30 shadow-sm">
                  <h4 className="flex items-center gap-2 font-medium text-emerald-800 mb-3">
                    <CheckCircle className="h-5 w-5 text-emerald-700" />
                    <span>Key Strengths</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base text-foreground">
                    {section.strengths && section.strengths.length > 0 ? (
                      section.strengths.map((strength, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-emerald-400"
                        >
                          {strength}
                        </li>
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-emerald-400 text-muted-foreground">No strengths data available</li>
                    )}
                  </ul>
                </div>
                
                <div className="p-5 rounded-lg border border-amber-300 bg-amber-50/30 shadow-sm">
                  <h4 className="flex items-center gap-2 font-medium text-amber-800 mb-3">
                    <XCircle className="h-5 w-5 text-amber-700" />
                    <span>Areas for Improvement</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base text-foreground">
                    {section.weaknesses && section.weaknesses.length > 0 ? (
                      section.weaknesses.map((weakness, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-amber-400"
                        >
                          {weakness}
                        </li>
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-amber-400 text-muted-foreground">No weaknesses data available</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Modal */}
      {company.reportId && (
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{company.name} - {section.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-1">
              <ReportViewer reportId={company.reportId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

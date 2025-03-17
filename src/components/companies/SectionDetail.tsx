
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Menu, X, CheckCircle, XCircle } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function SectionDetail() {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const { company } = useCompanyDetails(companyId);
  const { section, isLoading } = useSectionDetails(companyId, sectionId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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

  // Function to highlight numbers in text
  const highlightNumbers = (text: string) => {
    // This regex matches:
    // - Numbers with optional decimal points (e.g., 12, 12.34)
    // - Numbers with % sign (e.g., 12%, 12.34%)
    // - Dollar amounts (e.g., $12, $12.34)
    // - Numbers with K, M, B, T suffixes (e.g., 12K, $12M)
    return text.replace(/(\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?[KMBTkmbt]?|\d+(?:\.\d+)?[KMBTkmbt])/g, 
      (match) => `<span class="font-medium ${getScoreColor(section.score)}">${match}</span>`);
  };

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-amber-600";
    if (score >= 1.5) return "text-orange-600";
    return "text-red-600";
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
        className={`fixed lg:relative lg:flex w-64 border-r bg-background/95 h-[calc(100vh-4rem)] top-16 z-40 transition-all duration-300 ease-in-out transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } overflow-y-auto`}
      >
        <div className="p-4 border-b">
          <h3 className="font-medium">{company.name}</h3>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <nav className="flex flex-col w-full">
          {company.sections.map((s) => (
            <Link
              key={s.id}
              to={`/company/${companyId}/section/${s.id}`}
              className={`flex items-center px-4 py-3 text-sm hover:bg-muted transition-colors ${
                Number(s.id) === Number(sectionId) ? "bg-muted font-medium" : ""
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
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl sm:text-2xl">{section.title}</CardTitle>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <span className="font-medium text-sm sm:text-base">Score: {section.score}/5</span>
                <div className="w-24 sm:w-32">
                  <Progress 
                    value={section.score * 20} 
                    className={`h-2.5 ${section.score >= 4 ? 'bg-green-100' : section.score >= 2.5 ? 'bg-amber-100' : 'bg-red-100'}`}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 sm:pt-8">
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h3 className="text-lg font-medium mb-3">Summary</h3>
                <p 
                  className="text-sm sm:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightNumbers(section.description) }}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                  <h4 className="flex items-center gap-2 font-medium text-green-700 mb-3">
                    <CheckCircle className="h-5 w-5" />
                    <span>Key Strengths</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base">
                    {section.strengths && section.strengths.length > 0 ? (
                      section.strengths.map((strength, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-green-300"
                          dangerouslySetInnerHTML={{ __html: highlightNumbers(strength) }}
                        />
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-green-300 text-muted-foreground">No strengths data available</li>
                    )}
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <h4 className="flex items-center gap-2 font-medium text-amber-700 mb-3">
                    <XCircle className="h-5 w-5" />
                    <span>Areas for Improvement</span>
                  </h4>
                  <ul className="space-y-3 text-sm sm:text-base">
                    {section.weaknesses && section.weaknesses.length > 0 ? (
                      section.weaknesses.map((weakness, idx) => (
                        <li 
                          key={idx} 
                          className="pl-4 border-l-2 border-amber-300"
                          dangerouslySetInnerHTML={{ __html: highlightNumbers(weakness) }}
                        />
                      ))
                    ) : (
                      <li className="pl-4 border-l-2 border-amber-300 text-muted-foreground">No weaknesses data available</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

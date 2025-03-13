
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Menu, X, CheckCircle, XCircle } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
            <Tabs defaultValue="overview">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <h3 className="text-lg font-medium mb-3">Summary</h3>
                  <p className="text-sm sm:text-base leading-relaxed">{section.description}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                    <h4 className="flex items-center gap-2 font-medium text-green-700 mb-3">
                      <CheckCircle className="h-5 w-5" />
                      <span>Key Strengths</span>
                    </h4>
                    <ul className="space-y-3 text-sm sm:text-base">
                      {section.strengths.map((strength, idx) => (
                        <li key={idx} className="pl-4 border-l-2 border-green-300">{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                    <h4 className="flex items-center gap-2 font-medium text-amber-700 mb-3">
                      <XCircle className="h-5 w-5" />
                      <span>Areas for Improvement</span>
                    </h4>
                    <ul className="space-y-3 text-sm sm:text-base">
                      {section.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="pl-4 border-l-2 border-amber-300">{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3 pb-2 border-b">Detailed Analysis</h3>
                  <p className="mb-3 text-sm sm:text-base leading-relaxed">
                    {section.detailedContent}
                  </p>
                  
                  <div className="mt-6 space-y-6">
                    <div className="p-4 rounded-lg border bg-muted/20">
                      <h4 className="font-medium mb-3">Key Strengths:</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base leading-relaxed">
                        {section.strengths.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-4 rounded-lg border bg-muted/20">
                      <h4 className="font-medium mb-3">Areas for Improvement:</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base leading-relaxed">
                        {section.weaknesses.map((weakness, idx) => (
                          <li key={idx}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

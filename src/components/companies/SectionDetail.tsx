
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";

export function SectionDetail() {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const { company } = useCompanyDetails(companyId ? Number(companyId) : undefined);
  const { section, isLoading } = useSectionDetails(
    companyId ? Number(companyId) : undefined,
    sectionId
  );

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
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r bg-background/95 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-medium">{company.name}</h3>
          <p className="text-sm text-muted-foreground">Sections</p>
        </div>
        <nav className="flex flex-col">
          {company.sections.map((s) => (
            <Link
              key={s.id}
              to={`/company/${companyId}/section/${s.id}`}
              className={`flex items-center px-4 py-3 text-sm hover:bg-muted transition-colors ${
                s.id === sectionId ? "bg-muted font-medium" : ""
              }`}
            >
              <span className="flex-1">{s.title}</span>
              {s.id === sectionId && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{section.title}</CardTitle>
              <div className="flex items-center space-x-4">
                <span className="font-medium">Score: {section.score}/5</span>
                <div className="w-32">
                  <Progress value={section.score * 20} className="h-2" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Summary</h3>
                <p>{section.description}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Detailed Analysis</h3>
                <p className="mb-3">
                  {section.detailedContent}
                </p>
                
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium">Key Strengths:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {section.strengths.map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                  
                  <h4 className="font-medium">Areas for Improvement:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {section.weaknesses.map((weakness, idx) => (
                      <li key={idx}>{weakness}</li>
                    ))}
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

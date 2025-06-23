
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSectionDetails } from "@/hooks/companyHooks/useSectionDetails";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, BarChart2, List, FileText } from "lucide-react";
import { SECTION_TYPE_MAPPINGS } from "@/lib/constants";

const SectionDetail = () => {
  const { companyId, sectionId } = useParams<{ companyId: string; sectionId: string }>();
  const navigate = useNavigate();
  const { section, sectionDetails, isLoading } = useSectionDetails(sectionId || "");

  const handleBack = () => {
    navigate(`/company/${companyId}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "score-excellent";
    if (score >= 60) return "score-good"; 
    if (score >= 40) return "score-average";
    return "score-poor";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Poor";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary rounded w-1/3"></div>
            <div className="h-6 bg-secondary rounded w-1/2"></div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-secondary rounded w-full"></div>
                  <div className="h-4 bg-secondary rounded w-full"></div>
                  <div className="h-4 bg-secondary rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={handleBack} className="mb-6">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Button>
          <p>Section not found</p>
        </div>
      </div>
    );
  }

  const isSlideNotesSection = section.type === "SLIDE_NOTES";
  const displayTitle = SECTION_TYPE_MAPPINGS[section.type as keyof typeof SECTION_TYPE_MAPPINGS] || section.title;

  const slideNotes = sectionDetails.filter(detail => detail.detail_type === 'slide_note');
  const strengths = sectionDetails.filter(detail => detail.detail_type === 'strength');
  const weaknesses = sectionDetails.filter(detail => detail.detail_type === 'weakness');

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <Button variant="outline" onClick={handleBack} className="mb-6">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Company
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {isSlideNotesSection ? (
              <List className="h-6 w-6 text-primary" />
            ) : (
              <BarChart2 className="h-6 w-6 text-primary" />
            )}
            <h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
          </div>

          {!isSlideNotesSection && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">Score:</span>
                <span className="text-3xl font-bold">{section.score}</span>
                <Badge className={`${getScoreColor(section.score)} text-white`}>
                  {getScoreLabel(section.score)}
                </Badge>
              </div>
            </div>
          )}

          {!isSlideNotesSection && (
            <Progress 
              value={section.score} 
              className={`h-3 mb-6 ${getScoreColor(section.score)}`} 
            />
          )}
        </div>

        {isSlideNotesSection ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </CardContent>
            </Card>

            {slideNotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Slide-by-Slide Analysis ({slideNotes.length} notes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {slideNotes.map((note, index) => (
                      <div key={note.id} className="border-l-4 border-primary pl-4 py-2">
                        <p className="text-sm font-medium text-primary mb-1">
                          Note {index + 1}
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {strengths.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-400">
                      Strengths ({strengths.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {strengths.map((strength) => (
                        <li key={strength.id} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm leading-relaxed">{strength.content}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {weaknesses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-700 dark:text-red-400">
                      Areas for Improvement ({weaknesses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {weaknesses.map((weakness) => (
                        <li key={weakness.id} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm leading-relaxed">{weakness.content}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionDetail;

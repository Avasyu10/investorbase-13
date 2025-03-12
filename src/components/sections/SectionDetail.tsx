
import { useQuery } from "@tanstack/react-query";
import { getSectionDetailsBySectionId } from "@/lib/api";
import { SectionDetail as SectionDetailType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SectionDetailProps {
  sectionId: string;
}

export function SectionDetail({ sectionId }: SectionDetailProps) {
  const { data: details, isLoading, error } = useQuery({
    queryKey: ['section-details', sectionId],
    queryFn: () => getSectionDetailsBySectionId(sectionId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-destructive">
        <h3 className="font-bold">Error loading section details</h3>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  if (!details || details.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No details found for this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {details.map((detail: SectionDetailType) => (
        <Card key={detail.id}>
          <CardHeader>
            <CardTitle className="text-lg">{detail.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{detail.content}</p>
            {detail.score_impact && (
              <>
                <Separator />
                <div className={`text-sm font-medium ${detail.score_impact.includes('Positive') ? 'text-green-600' : 
                  detail.score_impact.includes('Negative') ? 'text-red-600' : 'text-amber-600'}`}>
                  {detail.score_impact}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

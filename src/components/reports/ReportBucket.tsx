
import { useDroppable } from "@dnd-kit/core";
import { Report } from "@/lib/supabase/reports";
import { DraggableReportCard } from "./DraggableReportCard";
import { ReportCard } from "./ReportCard";

interface ReportBucketProps {
  id: string;
  title: string;
  reports: Report[];
  color: "blue" | "amber" | "gray";
  emptyMessage: string;
  isDraggable: boolean;
}

export function ReportBucket({ id, title, reports, color, emptyMessage, isDraggable }: ReportBucketProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const colorStyles = {
    blue: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    gray: "bg-gray-100 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700",
  };

  return (
    <div 
      ref={setNodeRef} 
      className={`rounded-lg border-2 transition-colors h-full flex flex-col ${colorStyles[color]} ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="p-3 border-b border-border">
        <h3 className="font-medium text-lg">{title}</h3>
      </div>
      
      <div className="p-3 flex-1 overflow-y-auto">
        {reports.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((report) => (
              isDraggable ? (
                <DraggableReportCard 
                  key={report.id} 
                  report={report} 
                  id={`report-${report.id}`} 
                />
              ) : (
                <div key={report.id} className="pointer-events-none">
                  <ReportCard report={report} />
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

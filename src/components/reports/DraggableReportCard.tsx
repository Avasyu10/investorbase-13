
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ReportCard } from "./ReportCard";
import { Report } from "@/lib/supabase/reports";

interface DraggableReportCardProps {
  report: Report;
  id: string;
}

export function DraggableReportCard({ report, id }: DraggableReportCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { report }
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <ReportCard report={report} />
    </div>
  );
}

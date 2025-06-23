
import { Badge } from "@/components/ui/badge";

interface SectionDetailProps {
  type: string;
  content: string;
}

export const SectionDetail = ({ type, content }: SectionDetailProps) => {
  const getTypeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'strength':
        return 'green';
      case 'weakness':
        return 'destructive';
      case 'opportunity':
        return 'blue';
      case 'threat':
        return 'gold';
      default:
        return 'secondary';
    }
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
      <Badge variant={getTypeVariant(type)} className="shrink-0">
        {formatType(type)}
      </Badge>
      <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
    </div>
  );
};

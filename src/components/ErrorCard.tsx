
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorCardProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export function ErrorCard({ title, message, actionText, onAction }: ErrorCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto mt-8 border-red-200 shadow-lg">
      <CardHeader className="bg-red-50 border-b border-red-100">
        <CardTitle className="text-red-700 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-600">{message}</p>
      </CardContent>
      {actionText && onAction && (
        <CardFooter className="bg-gray-50 border-t">
          <Button variant="secondary" onClick={onAction}>{actionText}</Button>
        </CardFooter>
      )}
    </Card>
  );
}

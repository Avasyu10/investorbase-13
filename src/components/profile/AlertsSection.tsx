
import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const AlertsSection = () => {
  return (
    <div>
      <div className="flex items-center mb-3">
        <AlertCircle className="h-5 w-5 text-primary mr-2" />
        <h3 className="text-base font-semibold text-foreground/80">Alerts</h3>
      </div>
      <Separator className="mb-4" />
      <Card className="bg-secondary/10">
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">Coming Soon</p>
        </CardContent>
      </Card>
    </div>
  );
};

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Mail, Layers, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function ApplicationsNavigation() {
  const location = useLocation();

  const applicationTypes = [
    {
      title: "All Applications",
      description: "View all submissions across all forms",
      icon: Inbox,
      path: "/dashboard",
      color: "text-blue-600"
    },
    {
      title: "BARC Applications", 
      description: "BARC form submissions",
      icon: FileText,
      path: "/applications/barc",
      color: "text-green-600"
    },
    {
      title: "Eureka Applications",
      description: "Eureka form submissions", 
      icon: Layers,
      path: "/applications/eureka",
      color: "text-purple-600"
    },
    {
      title: "Email Applications",
      description: "Email pitch submissions",
      icon: Mail,
      path: "/applications/email", 
      color: "text-orange-600"
    },
    {
      title: "Public Form Applications",
      description: "General public form submissions",
      icon: FileText,
      path: "/applications/public-forms",
      color: "text-teal-600"
    }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-4">Application Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {applicationTypes.map((app) => {
            const Icon = app.icon;
            const isActive = location.pathname === app.path;
            
            return (
              <Button
                key={app.path}
                variant={isActive ? "default" : "outline"}
                asChild
                className={cn(
                  "h-auto p-4 flex flex-col items-center text-center space-y-2",
                  !isActive && "hover:bg-accent"
                )}
              >
                <Link to={app.path}>
                  <Icon className={cn("h-5 w-5", isActive ? "text-white" : app.color)} />
                  <div>
                    <div className="font-medium text-sm">{app.title}</div>
                    <div className={cn(
                      "text-xs mt-1",
                      isActive ? "text-white/80" : "text-muted-foreground"
                    )}>
                      {app.description}
                    </div>
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
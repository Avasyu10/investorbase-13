
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forms, FileText, Settings, AlertCircle } from "lucide-react";

export const ProfileNavigation = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/public-forms">
            <Forms className="h-4 w-4 mr-2" />
            Manage Public Forms
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/profile/edit">
            <FileText className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/feedback">
            <AlertCircle className="h-4 w-4 mr-2" />
            Send Feedback
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

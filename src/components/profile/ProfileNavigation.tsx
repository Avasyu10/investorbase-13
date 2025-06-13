
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, AlertCircle, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export const ProfileNavigation = () => {
  const { user } = useAuth();
  const { isIITBombay } = useProfile();

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
            <FileText className="h-4 w-4 mr-2" />
            Manage Public Forms
          </Link>
        </Button>
        {isIITBombay && (
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/barc-submissions">
              <Building className="h-4 w-4 mr-2" />
              BARC Submissions
            </Link>
          </Button>
        )}
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


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { InvestorPitchEmail } from "@/components/profile/InvestorPitchEmail";

export default function ProfileSetup() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    full_name: string;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: "Error fetching profile",
            description: error.message,
            variant: "destructive",
          });
        } else if (data) {
          setProfileData({
            full_name: data.full_name || "",
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user, toast]);

  const handleSubmit = async (data: { full_name: string; }) => {
    setIsLoading(true);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: data.full_name,
        updated_at: new Date().toISOString(), // Convert Date to string
      });

      if (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Error updating profile",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast({
        title: "Unexpected error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication Required
            </CardTitle>
            <CardDescription>Please sign in to access this page.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")}>Go to Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <InvestorPitchEmail isSetupPage={true} />

        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Profile Setup</CardTitle>
            <CardDescription>
              Tell us a little about yourself to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              initialData={profileData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

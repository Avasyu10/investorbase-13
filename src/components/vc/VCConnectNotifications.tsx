import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Building2, Mail, Globe, Linkedin, MessageCircle, User, Calendar, Phone } from "lucide-react";

interface VCConnectionRequest {
  id: string;
  founder_user_id: string;
  founder_name: string;
  founder_email: string;
  company_id: string;
  company_name: string;
  vc_name: string;
  vc_email: string | null;
  vc_phone: string | null;
  vc_website: string | null;
  vc_linkedin: string | null;
  message: string | null;
  created_at: string;
  status: string;
}

export function VCConnectNotifications() {
  const {
    data: connectionRequests,
    isLoading,
    error
  } = useQuery({
    queryKey: ['vc-connection-requests'],
    queryFn: async (): Promise<VCConnectionRequest[]> => {
      const { data, error } = await supabase
        .from('vc_connection_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connection requests:', error);
        throw error;
      }

      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading notifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Failed to load notifications. Please try again.</p>
      </div>
    );
  }

  if (!connectionRequests || connectionRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No notifications yet.</p>
        <p className="text-sm mt-1">
          When founders connect with VCs, notifications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">VC Connection Notifications</h2>
      </div>

      <div className="grid gap-4">
        {connectionRequests.map((request) => (
          <Card key={request.id} className="border border-muted/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {request.company_name} → {request.vc_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Founder Information */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Founder Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{request.founder_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{request.founder_email}</span>
                  </div>
                </div>
              </div>

              {/* VC Information */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-600" />
                  Target VC Details
                </h4>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">VC Name:</span>
                    <span className="ml-2 font-medium">{request.vc_name}</span>
                  </div>
                  
                   {request.vc_email && (
                     <div className="text-sm flex items-center gap-2">
                       <Mail className="h-3 w-3 text-blue-600" />
                       <span className="text-muted-foreground">Email:</span>
                       <span className="font-medium">{request.vc_email}</span>
                     </div>
                   )}
                   
                   {request.vc_phone && (
                     <div className="text-sm flex items-center gap-2">
                       <Phone className="h-3 w-3 text-green-600" />
                       <span className="text-muted-foreground">Phone:</span>
                       <span className="font-medium">{request.vc_phone}</span>
                     </div>
                   )}
                   
                   {request.vc_website && (
                    <div className="text-sm flex items-center gap-2">
                      <Globe className="h-3 w-3 text-purple-600" />
                      <span className="text-muted-foreground">Website:</span>
                      <a 
                        href={request.vc_website.startsWith('http') ? request.vc_website : `https://${request.vc_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {request.vc_website}
                      </a>
                    </div>
                  )}
                  
                  {request.vc_linkedin && (
                    <div className="text-sm flex items-center gap-2">
                      <Linkedin className="h-3 w-3 text-blue-700" />
                      <span className="text-muted-foreground">LinkedIn:</span>
                      <a 
                        href={request.vc_linkedin.startsWith('http') ? request.vc_linkedin : `https://${request.vc_linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {request.vc_linkedin}
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
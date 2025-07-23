import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Building2, User, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface VCNotification {
  id: string;
  vc_profile_id: string;
  company_id: string;
  founder_user_id: string;
  company_name: string;
  company_stage: string | null;
  company_industry: string | null;
  message: string | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
}

export function VCConnectNotifications() {
  const [notifications, setNotifications] = useState<VCNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('vc_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        toast.error("Failed to load notifications");
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setMarkingAsRead(prev => new Set(prev).add(notificationId));
    
    try {
      const { error } = await supabase
        .from('vc_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        toast.error("Failed to mark as read");
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );

      toast.success("Marked as read");
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error("Failed to mark as read");
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Connection Requests</h2>
        <Badge variant="secondary" className="ml-2">
          {notifications.filter(n => !n.is_read).length} new
        </Badge>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No connection requests yet</h3>
            <p className="text-muted-foreground">
              When founders send connection requests to VCs, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all duration-200 ${
                !notification.is_read 
                  ? 'border-l-4 border-l-primary bg-primary/5' 
                  : 'border-l-4 border-l-muted'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Connection Request from {notification.company_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <Button
                        onClick={() => markAsRead(notification.id)}
                        disabled={markingAsRead.has(notification.id)}
                        size="sm"
                        variant="outline"
                      >
                        {markingAsRead.has(notification.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark as Read
                          </>
                        )}
                      </Button>
                    )}
                    <Badge variant={notification.is_read ? "secondary" : "default"}>
                      {notification.is_read ? "Read" : "New"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Company</span>
                      <div className="text-sm font-medium">{notification.company_name}</div>
                    </div>
                  </div>
                  
                  {notification.company_stage && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Stage: {notification.company_stage}
                      </Badge>
                    </div>
                  )}
                  
                  {notification.company_industry && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Industry: {notification.company_industry}
                      </Badge>
                    </div>
                  )}
                </div>

                {notification.message && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">{notification.message}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </div>
                  {notification.read_at && (
                    <div>
                      Read {formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
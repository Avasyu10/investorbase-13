
import React, { useEffect, useState } from "react";
import { PlusCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";

interface CustomAlert {
  id: string;
  industry: string | null;
  stage: string | null;
  min_score: number | null;
}

const stageOptions = [
  { label: "Pre-seed", value: "Pre-seed" },
  { label: "Seed", value: "Seed" },
  { label: "Series A", value: "Series A" },
  { label: "Series B", value: "Series B" },
  { label: "Series C+", value: "Series C+" },
  { label: "Growth", value: "Growth" },
  { label: "Late Stage", value: "Late Stage" },
];

const industryOptions = [
  { label: "SaaS", value: "SaaS" },
  { label: "Fintech", value: "Fintech" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "E-commerce", value: "E-commerce" },
  { label: "AI/ML", value: "AI/ML" },
  { label: "Cleantech", value: "Cleantech" },
  { label: "Biotech", value: "Biotech" },
  { label: "Edtech", value: "Edtech" },
  { label: "Hardware", value: "Hardware" },
  { label: "Consumer", value: "Consumer" },
];

const scoreOptions = [
  { label: "7 and above", value: 7 },
  { label: "8 and above", value: 8 },
  { label: "9 and above", value: 9 },
];

const customAlertSchema = z.object({
  industry: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  min_score: z.number().int().min(1).max(10).optional().nullable(),
});

type CustomAlertFormValues = z.infer<typeof customAlertSchema>;

export const AlertsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dailyAlertEnabled, setDailyAlertEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingDailyAlert, setIsUpdatingDailyAlert] = useState(false);
  const [customAlerts, setCustomAlerts] = useState<CustomAlert[]>([]);
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeletingAlert, setIsDeletingAlert] = useState<string | null>(null);

  const form = useForm<CustomAlertFormValues>({
    resolver: zodResolver(customAlertSchema),
    defaultValues: {
      industry: null,
      stage: null,
      min_score: null,
    },
  });

  useEffect(() => {
    if (user) {
      fetchAlertSettings();
    }
  }, [user]);

  const fetchAlertSettings = async () => {
    try {
      setIsLoading(true);
      
      // Fetch end of day alert setting
      const { data: dailyAlert, error: dailyError } = await supabase
        .from("end_of_day_alerts")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
        
      if (dailyError) throw dailyError;
      
      // If no daily alert setting exists yet, create one with default value (false)
      if (!dailyAlert) {
        const { error: insertError } = await supabase
          .from("end_of_day_alerts")
          .insert({ user_id: user?.id, enabled: false });
          
        if (insertError) throw insertError;
        setDailyAlertEnabled(false);
      } else {
        setDailyAlertEnabled(dailyAlert.enabled);
      }
      
      // Fetch custom alerts
      const { data: alerts, error: alertsError } = await supabase
        .from("custom_alerts")
        .select("*")
        .eq("user_id", user?.id);
        
      if (alertsError) throw alertsError;
      setCustomAlerts(alerts || []);
    } catch (error: any) {
      console.error("Error fetching alert settings:", error);
      toast({
        title: "Error fetching alerts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailyAlertToggle = async () => {
    if (!user) return;
    
    try {
      setIsUpdatingDailyAlert(true);
      
      // Update the end of day alert setting
      const { error } = await supabase
        .from("end_of_day_alerts")
        .upsert(
          { 
            user_id: user.id, 
            enabled: !dailyAlertEnabled 
          },
          { onConflict: "user_id" }
        );
        
      if (error) throw error;
      
      setDailyAlertEnabled(!dailyAlertEnabled);
      
      toast({
        title: "Alert setting updated",
        description: `End of day alerts ${!dailyAlertEnabled ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      console.error("Error updating daily alert:", error);
      toast({
        title: "Error updating setting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingDailyAlert(false);
    }
  };

  const handleAddCustomAlert = async (values: CustomAlertFormValues) => {
    if (!user) return;
    
    // Validate that at least one field is set
    if (!values.industry && !values.stage && values.min_score === null) {
      toast({
        title: "Validation error",
        description: "Please set at least one alert criteria",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsAddingAlert(true);
      
      // Add the custom alert
      const { data, error } = await supabase
        .from("custom_alerts")
        .insert({
          user_id: user.id,
          industry: values.industry,
          stage: values.stage,
          min_score: values.min_score,
        })
        .select();
        
      if (error) throw error;
      
      setCustomAlerts([...customAlerts, data[0]]);
      
      toast({
        title: "Alert created",
        description: "Your custom alert has been created successfully",
      });
      
      // Close the dialog and reset the form
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error adding custom alert:", error);
      toast({
        title: "Error creating alert",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      setIsDeletingAlert(alertId);
      
      // Delete the custom alert
      const { error } = await supabase
        .from("custom_alerts")
        .delete()
        .eq("id", alertId);
        
      if (error) throw error;
      
      setCustomAlerts(customAlerts.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Alert deleted",
        description: "Your custom alert has been deleted",
      });
    } catch (error: any) {
      console.error("Error deleting alert:", error);
      toast({
        title: "Error deleting alert",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAlert(null);
    }
  };

  return (
    <div>
      <div className="flex items-center mb-3">
        <AlertCircle className="h-5 w-5 text-primary mr-2" />
        <h3 className="text-base font-semibold text-foreground/80">Alerts</h3>
      </div>
      <Separator className="mb-4" />
      
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card className="bg-secondary/10 mb-5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="daily-alert" className="text-base font-medium">End of Day Alert</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily email summary of all new prospects added to your profile
                  </p>
                </div>
                <div className="flex items-center">
                  <Switch
                    id="daily-alert"
                    checked={dailyAlertEnabled}
                    onCheckedChange={handleDailyAlertToggle}
                    disabled={isUpdatingDailyAlert}
                  />
                  {isUpdatingDailyAlert && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-medium">Custom Alerts</h4>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Alert
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Custom Alert</DialogTitle>
                    <DialogDescription>
                      Set criteria for companies that you want to be alerted about
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddCustomAlert)} className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {industryOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="stage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Stage</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {stageOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="min_score"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Assessment Score</FormLabel>
                            <Select
                              onValueChange={val => field.onChange(val ? parseInt(val) : null)}
                              value={field.value?.toString() || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select minimum score" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {scoreOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value.toString()}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              You'll receive alerts for companies with this score or higher
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={isAddingAlert}
                          className="w-full"
                        >
                          {isAddingAlert ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Alert
                            </>
                          ) : 'Create Alert'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {customAlerts.length === 0 ? (
              <Card className="bg-secondary/10">
                <CardContent className="text-center py-6">
                  <p className="text-muted-foreground text-sm">
                    No custom alerts configured yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {customAlerts.map((alert) => (
                  <Card key={alert.id} className="bg-secondary/10">
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 mt-1">
                            {alert.industry && (
                              <Badge variant="secondary">Industry: {alert.industry}</Badge>
                            )}
                            {alert.stage && (
                              <Badge variant="secondary">Stage: {alert.stage}</Badge>
                            )}
                            {alert.min_score !== null && (
                              <Badge variant="secondary">Score: {alert.min_score}+</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          disabled={isDeletingAlert === alert.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {isDeletingAlert === alert.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

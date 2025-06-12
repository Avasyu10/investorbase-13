
import React from "react";
import { AlertCircle, GraduationCap, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileNavigation } from "./ProfileNavigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const IITBombayAlertsSection = () => {
  return (
    <div className="space-y-6">
      <ProfileNavigation />
      
      <div>
        <div className="flex items-center mb-3">
          <GraduationCap className="h-5 w-5 text-primary mr-2" />
          <h3 className="text-base font-semibold text-foreground/80">IIT Bombay Alumni Network</h3>
        </div>
        <Separator className="mb-4" />
        
        <div className="grid gap-4">
          {/* Enhanced Alert Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Advanced Alert Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Alumni Startup Alerts</label>
                  <p className="text-xs text-muted-foreground">Get notified about new startups from IIT Bombay alumni</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">High-Potential Deals</label>
                  <p className="text-xs text-muted-foreground">Priority alerts for deals scoring 8+ points</p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">BARC Application Updates</label>
                  <p className="text-xs text-muted-foreground">Real-time notifications for new BARC submissions</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Alumni Network Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Network Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">247</div>
                  <div className="text-sm text-muted-foreground">Alumni Startups</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₹1.2B</div>
                  <div className="text-sm text-muted-foreground">Total Funded</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                View Alumni Directory
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Access Investment Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Generate Network Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

export const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateApiKey = () => {
    return `sk_${crypto.randomUUID().replace(/-/g, '')}`;
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a key name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newKey = generateApiKey();

      const { error } = await supabase
        .from("api_keys")
        .insert({
          key_name: newKeyName,
          api_key: newKey,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key created successfully. Make sure to copy it now!",
      });

      setNewKeyName("");
      fetchApiKeys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const deactivateApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", keyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key deactivated successfully",
      });

      fetchApiKeys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeleteKeyId(null);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage API keys for programmatic access to submit startup data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Production Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createApiKey} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </div>
          </div>

          {apiKeys.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.key_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">
                            {visibleKeys.has(key.id) ? key.api_key : maskApiKey(key.api_key)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(key.api_key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{key.usage_count}</TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {key.is_active && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteKeyId(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Use your API key to submit startup data programmatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Endpoint</h4>
              <code className="block bg-muted p-3 rounded-md text-sm">
                POST https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Headers</h4>
              <code className="block bg-muted p-3 rounded-md text-sm">
                x-api-key: your-api-key-here
              </code>
            </div>

            <div>
              <h4 className="font-medium mb-2">Example cURL Request</h4>
              <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`curl -X POST \\
  https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/submit-startup-public \\
  -H "x-api-key: your-api-key-here" \\
  -F "startup_name=TechStartup Inc" \\
  -F "founder_email=founder@example.com" \\
  -F "problem_statement=..." \\
  -F "solution=..." \\
  -F "market_understanding=..." \\
  -F "customer_understanding=..." \\
  -F "competitive_understanding=..." \\
  -F "unique_selling_proposition=..." \\
  -F "technical_understanding=..." \\
  -F "vision=..."`}
              </pre>
            </div>

            <Button
              variant="outline"
              onClick={() => window.open('/API_DOCUMENTATION.md', '_blank')}
            >
              View Full Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this API key? This action will prevent any future requests using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteKeyId && deactivateApiKey(deleteKeyId)}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

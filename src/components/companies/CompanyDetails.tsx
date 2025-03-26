import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { CompanyForm } from './CompanyForm';
import { MarketResearch } from './MarketResearch';

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const fetchCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) {
          console.error('Error fetching company:', error);
          toast.error("Failed to load company details", {
            description: error.message
          });
        } else {
          setCurrentCompany(data);
        }
      } catch (error) {
        console.error('Error fetching company:', error);
        toast.error("Failed to load company details", {
          description: "An unexpected error occurred"
        });
      }
    };

    fetchCompany();
  }, [companyId]);

  const handleDelete = async () => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) {
        console.error('Error deleting company:', error);
        toast.error("Failed to delete company", {
          description: error.message
        });
      } else {
        toast.success("Company deleted successfully");
        // Redirect to the companies list page
        window.location.href = '/companies';
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error("Failed to delete company", {
        description: "An unexpected error occurred"
      });
    }
  };

  return (
    <div>
      {isEditing ? (
        <CompanyForm company={currentCompany} onCancel={() => setIsEditing(false)} />
      ) : (
        <Card className="shadow-md border bg-card overflow-hidden mb-8">
          <CardHeader className="bg-muted/50 border-b pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-semibold">{currentCompany?.name || 'Loading...'}</CardTitle>
              <div>
                <Button variant="outline" onClick={() => setIsEditing(true)} className="mr-2">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 px-4 sm:px-6">
            {currentCompany ? (
              <div className="space-y-4">
                <p><strong>Description:</strong> {currentCompany.description || 'N/A'}</p>
                <p><strong>Website:</strong> {currentCompany.website || 'N/A'}</p>
                <p><strong>Industry:</strong> {currentCompany.industry || 'N/A'}</p>
                <p><strong>Location:</strong> {currentCompany.location || 'N/A'}</p>
                
                {/* Market Research Component */}
                <MarketResearch 
                  companyId={companyId}
                  assessmentPoints={currentCompany?.assessment_points || []}
                />
              </div>
            ) : (
              <p>Loading company details...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

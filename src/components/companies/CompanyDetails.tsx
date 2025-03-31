import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { ScoreAssessment } from "@/components/companies/ScoreAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Briefcase } from "lucide-react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatUI } from "./ChatUI";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { company, isLoading, companyDetails } = useCompanyDetails(id || "");
  const [error, setError] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [messages, setMessages] = useState<{ content: string; role: "user" | "assistant" }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (!company && !isLoading) {
      setError("Company not found");
    }
  }, [company, isLoading]);

  // Early return for loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Early return for error state
  if (error || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Company Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The company you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Function to open the chat modal
  const openChatModal = () => {
    setIsChatModalOpen(true);
    setMessages([]); // Clear existing messages
    setInputValue(""); // Clear input
  };

  // Function to close the chat modal
  const closeChatModal = () => {
    setIsChatModalOpen(false);
  };

  // When making the API call to the company-chatbot function:
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newUserMessage = { content: inputValue, role: "user" };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputValue("");
    setIsChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("company-chatbot", {
        body: {
          companyName: company?.name || "",
          companyIntroduction: companyDetails?.introduction || "",
          companyIndustry: companyDetails?.industry || "",
          companyStage: companyDetails?.stage || "",
          assessmentPoints: company?.assessmentPoints || [],
          messages: [...messages, newUserMessage],
        },
      });

      if (error) {
        console.error("Error invoking company-chatbot:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });

        // Add error message
        setMessages((prevMessages) => [
          ...prevMessages,
          { content: "I'm sorry, I encountered an error. Please try again later.", role: "assistant" },
        ]);
      } else if (data?.success && data?.response) {
        // Add assistant response
        setMessages((prevMessages) => [
          ...prevMessages,
          { content: data.response, role: "assistant" },
        ]);
      } else {
        // Add error message
        setMessages((prevMessages) => [
          ...prevMessages,
          { content: "I'm sorry, I couldn't process your request. Please try again.", role: "assistant" },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });

      // Add error message
      setMessages((prevMessages) => [
        ...prevMessages,
        { content: "I'm sorry, I encountered an error. Please try again later.", role: "assistant" },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-0 pb-6 animate-fade-in">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/dashboard")}
        className="mb-6 flex items-center"
      >
        <ChevronLeft className="mr-1" /> Back
      </Button>

      {/* Company Info and Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <CompanyInfoCard
            website=""
            stage=""
            industry=""
            introduction={company?.introduction || ""}
          />
        </div>
        <div>
          <ScoreAssessment company={company} />
        </div>
      </div>

      {/* Overall Assessment */}
      <OverallAssessment
        score={company.overallScore || 0}
        assessmentPoints={company.assessmentPoints || []}
      />

      {/* Sections */}
      <h2 className="text-2xl font-bold mt-12 mb-6">Detailed Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {company.sections &&
          company.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onClick={() => navigate(`/company/${company.id}/section/${section.id}`)}
            />
          ))}
        {(!company.sections || company.sections.length === 0) && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No Analysis Sections Available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There are no detailed analysis sections available for this company.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Company Information Section */}
      <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
        <Briefcase className="h-5 w-5" />
        Company Information
      </h2>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">About {company.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {company.introduction || "No detailed description available."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium mb-1">Industry</h3>
                <p className="text-muted-foreground">Not specified</p>
              </div>

              <div>
                <h3 className="font-medium mb-1">Stage</h3>
                <p className="text-muted-foreground">Not specified</p>
              </div>

              <div>
                <h3 className="font-medium mb-1">Website</h3>
                <p className="text-muted-foreground">Not available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Modal */}
      <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] overflow-hidden">
          <ChatUI
            messages={messages}
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            title={company?.name || "this company"}
            onClose={closeChatModal}
          />
        </DialogContent>
      </Dialog>

      {/* Chat Button */}
      <div className="fixed bottom-6 right-6">
        <Button onClick={openChatModal}>
          <Briefcase className="mr-2 h-4 w-4" />
          Analyze with AI
        </Button>
      </div>
    </div>
  );
}

export default CompanyDetails;

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
interface CompanyChatbotDialogProps {
  companyId: string;
  companyName: string;
  companyIntroduction: string;
  companyIndustry: string;
  companyStage: string;
  assessmentPoints: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function CompanyChatbotDialog({
  companyId,
  companyName,
  companyIntroduction,
  companyIndustry,
  companyStage,
  assessmentPoints,
  open,
  onOpenChange
}: CompanyChatbotDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();

  // Add greeting message when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      const greetingMessage: Message = {
        id: "greeting",
        role: "assistant",
        content: `Hello! I'm here to help you learn more about ${companyName}. I have access to their pitch deck analysis, including their business model, market opportunity, team background, and investment potential. Feel free to ask me anything about the company!`,
        timestamp: new Date()
      };
      setMessages([greetingMessage]);
    }
  }, [open, companyName, messages.length]);

  // Function to clean markdown formatting from response
  const cleanMarkdownFormatting = (text: string): string => {
    return text.replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\*/g, '') // Remove italic markdown
    .replace(/#{1,6}\s/g, '') // Remove heading markdown
    .replace(/`{1,3}/g, '') // Remove code block markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to plain text
    .replace(/\n\s*[-*+]\s/g, '\n• ') // Convert markdown lists to bullet points
    .trim();
  };
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("company-chatbot", {
        body: {
          companyName,
          companyIntroduction,
          companyIndustry,
          companyStage,
          assessmentPoints,
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });
      if (error) {
        console.error("Error calling chatbot function:", error);
        throw error;
      }
      if (data?.success && data?.response) {
        // Clean the response of markdown formatting
        const cleanedResponse = cleanMarkdownFormatting(data.response);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: cleanedResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data?.error || "Failed to get response from chatbot");
      }
    } catch (error) {
      console.error("Error in chatbot conversation:", error);
      toast({
        title: "Error",
        description: "Failed to get response from the chatbot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-[400px] rounded-none">
        <div className="flex flex-col h-full">
          <DrawerHeader className="flex-shrink-0 border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                
                Chat about {companyName}
              </DrawerTitle>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 flex flex-col min-h-0 p-4">
            <ScrollArea className="flex-1 pr-4">
              {messages.map(message => <div key={message.id} className={`flex gap-3 mb-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && <div className="flex-shrink-0">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>}
                  
                  <div className={`max-w-[280px] rounded-lg px-3 py-2 ${message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"}`}>
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                  
                  {message.role === "user" && <div className="flex-shrink-0">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>}
                </div>)}
              
              {isLoading && <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="text-sm text-muted-foreground">
                      Thinking...
                    </div>
                  </div>
                </div>}
            </ScrollArea>

            <div className="flex gap-2 mt-4 flex-shrink-0">
              <Input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask about the company..." disabled={isLoading} className="flex-1" />
              <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>;
}
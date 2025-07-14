import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, X } from "lucide-react"; // Changed TrendingUp to Bot
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VCEvaluationBotProps {
  companyId: string;
  companyName: string;
  companyIntroduction: string;
  companyIndustry: string;
  companyStage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VCEvaluationBot({
  companyId,
  companyName,
  companyIntroduction,
  companyIndustry,
  companyStage,
  open,
  onOpenChange
}: VCEvaluationBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Add initial VC evaluation message when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      const initialMessage: Message = {
        id: "initial",
        role: "assistant",
        content: `Welcome to the VC Evaluation Bot! I'm designed to simulate how a venture capitalist would evaluate ${companyName}.

I'll ask you questions as if you're pitching this startup to investors. After each of your responses, I'll provide feedback and ask the next relevant question.

Let's begin: Can you tell me what problem ${companyName} is solving and why this problem is significant in the market?`,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }
  }, [open, companyName, messages.length]);

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
      const { data, error } = await supabase.functions.invoke("vc-evaluation-bot", {
        body: {
          companyName,
          companyIntroduction,
          companyIndustry,
          companyStage,
          userResponse: inputValue,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });

      if (error) {
        console.error("Error calling VC evaluation bot:", error);
        throw error;
      }

      if (data?.success && data?.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data?.error || "Failed to get response from VC evaluation bot");
      }
    } catch (error) {
      console.error("Error in VC evaluation:", error);
      toast({
        title: "Error",
        description: "Failed to get response from the VC evaluation bot. Please try again.",
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-[450px] rounded-none">
        <div className="flex flex-col h-full">
          <DrawerHeader className="flex-shrink-0 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2 text-primary">
                <Bot className="h-5 w-5" /> {/* Changed icon here */}
                VC Evaluation: {companyName}
              </DrawerTitle>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 flex flex-col min-h-0 p-4">
            <ScrollArea className="flex-1 pr-4">
              {messages.map(message => (
                <div key={message.id} className={`flex gap-3 mb-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" /> {/* Changed icon here */}
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[320px] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted border"
                  }`}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary animate-pulse" /> {/* Changed icon here */}
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3 border">
                    <div className="text-sm text-muted-foreground">
                      Evaluating your response...
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 mt-4 flex-shrink-0">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Your response to the VC..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}


import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CompanyChatbotProps {
  companyId: string;
  companyName: string;
}

export function CompanyChatbot({ companyId, companyName }: CompanyChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi there! I'm your AI assistant for ${companyName}. Ask me anything about this company and I'll try to help based on the information I have.`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to chat
    const userMessageObj = {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessageObj]);
    setIsLoading(true);

    try {
      // Extract only the content and role for sending to API
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('company-chatbot', {
        body: {
          companyId,
          message: userMessage,
          chatHistory
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get response');
      }

      // Add assistant message to chat
      setMessages(prevMessages => [
        ...prevMessages, 
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages, 
        {
          role: 'assistant',
          content: 'Sorry, I encountered a problem while processing your request. Please try again later.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] border shadow-md">
      <div className="bg-muted/50 p-4 border-b flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{companyName} Assistant</h3>
        <div className="ml-auto flex items-center text-xs text-muted-foreground gap-1">
          <Sparkle className="h-3 w-3" />
          <span>Powered by AI</span>
        </div>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted border'
                }`}
              >
                <div className="prose prose-sm dark:prose-invert">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted border rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <CardContent className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a question about this company..."
            className="min-h-[60px] flex-1 resize-none"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            className="h-[60px] px-3" 
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

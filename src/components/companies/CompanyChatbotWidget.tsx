
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface CompanyChatbotWidgetProps {
  companyId: string;
  companyName: string;
}

export const CompanyChatbotWidget: React.FC<CompanyChatbotWidgetProps> = ({ companyId, companyName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your AI assistant for ${companyName}. How can I help you today?`,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await supabase.functions.invoke('company-chatbot', {
        body: {
          companyId,
          message: userMessage.content,
          chatHistory
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Error communicating with the chatbot');
      }
      
      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setChatHistory(data.updatedHistory);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get a response',
        variant: 'destructive'
      });
      
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again later.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat toggle button */}
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 shadow-lg z-50 bg-primary hover:bg-primary/90"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat interface */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[500px] z-50 shadow-xl flex flex-col overflow-hidden border rounded-lg">
          {/* Chat header */}
          <div className="p-3 bg-primary text-primary-foreground flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-medium">{companyName} Assistant</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleChat} className="text-primary-foreground hover:bg-primary/90">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1 p-3 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    <div 
                      className={`text-xs mt-1 ${
                        msg.role === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Loading indicator */}
          {isLoading && (
            <div className="p-2 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Chat input */}
          <div className="p-3 border-t flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="resize-none min-h-[60px]"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              size="icon" 
              className="h-10 w-10 shrink-0"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};

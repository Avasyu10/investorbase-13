
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Send, MessageSquare, X, User, Bot, Users } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface VCChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

type VCRole = 'general_partner' | 'principal' | 'associate' | 'analyst' | 'investment_committee';

const VC_ROLES = [
  { id: 'general_partner', label: 'General Partner', description: 'Senior investment decision maker' },
  { id: 'principal', label: 'Principal', description: 'Investment lead and deal originator' },
  { id: 'associate', label: 'Associate', description: 'Deal execution and analysis' },
  { id: 'analyst', label: 'Analyst', description: 'Research and due diligence' },
  { id: 'investment_committee', label: 'Investment Committee', description: 'Collective decision making perspective' }
] as const;

export function VCChatInterface({ open, onOpenChange }: VCChatInterfaceProps) {
  const [selectedRole, setSelectedRole] = useState<VCRole | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && selectedRole && messages.length === 0) {
      const roleData = VC_ROLES.find(r => r.id === selectedRole);
      setMessages([{
        id: '1',
        content: `Hello! I'm your AI assistant specialized for ${roleData?.label} perspectives. I can help you analyze investment opportunities, review pitch decks, and provide insights tailored to your role in the VC ecosystem. How can I assist you today?`,
        role: 'assistant',
        timestamp: new Date()
      }]);
    }
  }, [open, selectedRole, messages.length]);

  const handleRoleSelect = (role: VCRole) => {
    setSelectedRole(role);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isSending || !selectedRole) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsSending(true);

    // Simulate AI response (replace with actual backend call later)
    setTimeout(() => {
      const roleData = VC_ROLES.find(r => r.id === selectedRole);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `As a ${roleData?.label}, I understand your question about "${currentMessage}". Here's my perspective based on typical ${roleData?.label} responsibilities and priorities:\n\nThis is a simulated response. The actual AI backend integration will provide real insights tailored to your specific role and context.`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsSending(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setSelectedRole(null);
      setMessages([]);
      setCurrentMessage('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">VC Assistant</div>
              <div className="text-sm text-muted-foreground font-normal">
                Role-specific investment analysis and insights
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!selectedRole ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Select Your Role</h3>
              <p className="text-muted-foreground">
                Choose your role to get personalized insights and analysis tailored to your responsibilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VC_ROLES.map((role) => (
                <Card 
                  key={role.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium mb-1">{role.label}</h4>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[70vh]">
            {/* Role indicator */}
            <div className="px-6 py-3 border-b bg-accent/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {VC_ROLES.find(r => r.id === selectedRole)?.label}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedRole(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Change Role
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div 
                        className={`rounded-lg p-4 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        ) : (
                          <ReactMarkdown 
                            className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="mb-2 last:mb-0 space-y-1 pl-4 list-disc">{children}</ul>
                              ),
                              li: ({ children }) => (
                                <li className="text-sm leading-relaxed">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold">{children}</strong>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isSending && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75"></div>
                          <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input area */}
            <div className="p-6 border-t">
              <div className="flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask about investments as a ${VC_ROLES.find(r => r.id === selectedRole)?.label}...`}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isSending || !currentMessage.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send your message
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

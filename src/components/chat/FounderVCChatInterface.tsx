import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_name: string;
  sender_id: string;
  content: string;
  timestamp: Date;
  is_from_vc: boolean;
}

interface FounderVCChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  founderUserId: string;
  founderName: string;
  companyName: string;
}

export function FounderVCChatInterface({ 
  open, 
  onOpenChange, 
  founderUserId, 
  founderName,
  companyName 
}: FounderVCChatInterfaceProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isVC = profile?.is_vc || profile?.is_manager;

  // Load messages between the VC and founder
  const loadMessages = async () => {
    if (!user || !open) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vc_chat_messages')
        .select('*')
        .eq('conversation_type', 'vc_founder')
        .or(`and(user_id.eq.${user.id},recipient_id.eq.${founderUserId}),and(user_id.eq.${founderUserId},recipient_id.eq.${user.id})`)
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Failed to load chat messages",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          sender_name: msg.name,
          sender_id: msg.user_id,
          content: msg.message,
          timestamp: new Date(msg.time),
          is_from_vc: msg.user_id !== founderUserId
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !profile) return;

    try {
      const { error } = await supabase
        .from('vc_chat_messages')
        .insert({
          name: profile.full_name || user.email || 'Anonymous',
          message: newMessage,
          time: new Date().toISOString(),
          to_recipient: 'vc_founder_chat',
          user_id: user.id,
          recipient_id: founderUserId,
          conversation_type: 'vc_founder'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        return;
      }

      setNewMessage("");
      // Reload messages to show the new one
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!open || !user) return;

    loadMessages();

    const channel = supabase
      .channel('founder_vc_chat_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vc_chat_messages',
          filter: `conversation_type=eq.vc_founder`
        },
        (payload) => {
          const newMsg = payload.new;
          // Only add if this message is part of the current conversation
          if ((newMsg.user_id === user.id && newMsg.recipient_id === founderUserId) ||
              (newMsg.user_id === founderUserId && newMsg.recipient_id === user.id)) {
            
            const formattedMessage: Message = {
              id: newMsg.id,
              sender_name: newMsg.name,
              sender_id: newMsg.user_id,
              content: newMsg.message,
              timestamp: new Date(newMsg.time),
              is_from_vc: newMsg.user_id !== founderUserId
            };
            
            setMessages(prev => [...prev, formattedMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user, founderUserId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col p-0">
        <DialogHeader className="border-b px-4 py-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {isVC ? `Chat with ${founderName}` : 'Chat with VC Team'}
            <Badge variant="outline" className="ml-2">
              <Building2 className="h-3 w-3 mr-1" />
              {companyName}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  {isVC ? "Start the conversation with the founder" : "Wait for the VC team to message you"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.sender_id !== user?.id && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={`${
                          message.is_from_vc ? 'bg-blue-500' : 'bg-green-500'
                        } text-white text-xs`}>
                          {message.is_from_vc ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col max-w-[70%] ${
                      message.sender_id === user?.id ? 'items-end' : 'items-start'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.sender_name}</span>
                        <Badge variant="outline" className={`text-xs ${
                          message.is_from_vc 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {message.is_from_vc ? 'VC Team' : 'Founder'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className={`rounded-lg p-3 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>

                    {message.sender_id === user?.id && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={`${
                          isVC ? 'bg-blue-500' : 'bg-green-500'
                        } text-white text-xs`}>
                          {isVC ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder={`Message ${isVC ? founderName : 'the VC team'}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
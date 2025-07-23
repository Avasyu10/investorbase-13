import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  founder_id: string;
  founder_name: string;
  founder_email?: string;
  company_name?: string;
  last_message: string;
  last_message_time: Date;
  unread_count: number;
}

interface Message {
  id: string;
  sender_name: string;
  sender_id: string;
  content: string;
  timestamp: Date;
  is_from_vc: boolean;
}

export function VCFounderChats() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user && profile?.is_vc) {
      loadConversations();
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user || !selectedConversation) return;

    // Set up real-time subscription for messages
    const channel = supabase
      .channel('vc-founder-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vc_chat_messages',
          filter: `conversation_type=eq.vc_founder`
        },
        () => {
          // Reload conversations and messages when there are changes
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get all VC-founder conversations where current user is involved
      const { data: messageData, error } = await supabase
        .from('vc_chat_messages')
        .select('*')
        .eq('conversation_type', 'vc_founder')
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive"
        });
        return;
      }

      // Group messages by conversation (founder) and get proper founder names
      const conversationMap = new Map<string, Conversation>();
      const founderIds = new Set<string>();

      for (const message of messageData || []) {
        // Determine the founder ID (the one who is not the current VC)
        const founderId = message.user_id === user.id ? message.recipient_id : message.user_id;
        
        if (!founderId) continue;
        founderIds.add(founderId);

        const existing = conversationMap.get(founderId);
        
        if (!existing || new Date(message.created_at) > existing.last_message_time) {
          conversationMap.set(founderId, {
            founder_id: founderId,
            founder_name: 'Loading...', // We'll update this below
            last_message: message.message,
            last_message_time: new Date(message.created_at),
            unread_count: 0
          });
        }
      }

      // Now fetch proper founder names and company information
      if (founderIds.size > 0) {
        const founderIdsArray = Array.from(founderIds);
        
        // Get founder profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, email')
          .in('id', founderIdsArray);

        if (profilesError) {
          console.error('Error fetching founder profiles:', profilesError);
        }

        // Get company information from reports or companies tables
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('user_id, name')
          .in('user_id', founderIdsArray);

        if (companiesError) {
          console.error('Error fetching company information:', companiesError);
        }

        // Update conversation data with proper names and company info
        const updatedConversations = Array.from(conversationMap.values()).map(conversation => {
          const profile = profiles?.find(p => p.id === conversation.founder_id);
          const company = companies?.find(c => c.user_id === conversation.founder_id);
          
          return {
            ...conversation,
            founder_name: profile?.full_name || profile?.username || profile?.email || 'Unknown User',
            founder_email: profile?.email,
            company_name: company?.name
          };
        });

        setConversations(updatedConversations.sort(
          (a, b) => b.last_message_time.getTime() - a.last_message_time.getTime()
        ));
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error in loadConversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (founderId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vc_chat_messages')
        .select('*')
        .eq('conversation_type', 'vc_founder')
        .or(`and(user_id.eq.${user.id},recipient_id.eq.${founderId}),and(user_id.eq.${founderId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        sender_name: msg.name,
        sender_id: msg.user_id,
        content: msg.message,
        timestamp: new Date(msg.created_at),
        is_from_vc: msg.user_id === user.id
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || !profile) {
      return;
    }

    try {
      setIsSending(true);
      
      const { error } = await supabase
        .from('vc_chat_messages')
        .insert({
          user_id: user.id,
          recipient_id: selectedConversation,
          message: newMessage.trim(),
          name: profile.full_name || profile.username || 'VC User',
          conversation_type: 'vc_founder',
          to_recipient: 'private'
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
      // Messages will be reloaded via real-time subscription
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const selectedConversationData = conversations.find(c => c.founder_id === selectedConversation);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex gap-4">
      {/* Conversations List */}
      <Card className="w-1/3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-semibold">Founder Conversations</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.founder_id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation === conversation.founder_id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation.founder_id);
                    loadMessages(conversation.founder_id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conversation.founder_name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(conversation.last_message_time)}
                        </span>
                      </div>
                      {conversation.company_name && (
                        <p className="text-xs text-primary font-medium truncate">
                          {conversation.company_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <Badge variant="default" className="text-xs">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {selectedConversationData?.founder_name}
                  </h3>
                  {selectedConversationData?.company_name && (
                    <p className="text-sm text-primary font-medium">
                      {selectedConversationData.company_name}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Founder</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[500px]">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_from_vc ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.is_from_vc
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1 gap-2">
                            <span className="text-xs opacity-70">
                              {message.sender_name}
                            </span>
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isSending}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || isSending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
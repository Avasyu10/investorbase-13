import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, User, Building2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  vc_user_id: string;
  vc_name: string;
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

export function FounderChatDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations where the founder has been contacted by VCs
  const loadConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vc_chat_messages')
        .select('*')
        .eq('conversation_type', 'vc_founder')
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('time', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        toast({
          title: "Error",
          description: "Failed to load chat conversations",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        // Group messages by conversation (other user)
        const conversationMap = new Map<string, {
          vc_user_id: string;
          vc_name: string;
          messages: any[];
        }>();

        data.forEach(msg => {
          const otherUserId = msg.user_id === user.id ? msg.recipient_id : msg.user_id;
          const otherUserName = msg.user_id === user.id ? 'VC Team' : msg.name;
          
          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, {
              vc_user_id: otherUserId,
              vc_name: otherUserName,
              messages: []
            });
          }
          
          conversationMap.get(otherUserId)!.messages.push(msg);
        });

        // Convert to conversation list with metadata
        const conversationList: Conversation[] = Array.from(conversationMap.values()).map(conv => {
          const sortedMessages = conv.messages.sort((a, b) => 
            new Date(b.time).getTime() - new Date(a.time).getTime()
          );
          
          const lastMessage = sortedMessages[0];
          const unreadCount = conv.messages.filter(msg => 
            msg.user_id !== user.id && new Date(msg.time) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length;

          return {
            vc_user_id: conv.vc_user_id,
            vc_name: conv.vc_name,
            last_message: lastMessage.message,
            last_message_time: new Date(lastMessage.time),
            unread_count: unreadCount
          };
        });

        setConversations(conversationList.sort((a, b) => 
          b.last_message_time.getTime() - a.last_message_time.getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for a specific conversation
  const loadMessages = async (vcUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vc_chat_messages')
        .select('*')
        .eq('conversation_type', 'vc_founder')
        .or(`and(user_id.eq.${user.id},recipient_id.eq.${vcUserId}),and(user_id.eq.${vcUserId},recipient_id.eq.${user.id})`)
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (data) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          sender_name: msg.name,
          sender_id: msg.user_id,
          content: msg.message,
          timestamp: new Date(msg.time),
          is_from_vc: msg.user_id !== user.id
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !profile || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('vc_chat_messages')
        .insert({
          name: profile.full_name || user.email || 'Founder',
          message: newMessage,
          time: new Date().toISOString(),
          to_recipient: 'vc_founder_chat',
          user_id: user.id,
          recipient_id: selectedConversation.vc_user_id,
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
      await loadMessages(selectedConversation.vc_user_id);
      // Refresh conversations list
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    loadConversations();

    const channel = supabase
      .channel('founder_chat_updates')
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
          // Check if this message is for the current user
          if (newMsg.user_id === user.id || newMsg.recipient_id === user.id) {
            // Refresh conversations and messages
            loadConversations();
            if (selectedConversation && 
                (newMsg.user_id === selectedConversation.vc_user_id || 
                 newMsg.recipient_id === selectedConversation.vc_user_id)) {
              loadMessages(selectedConversation.vc_user_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Communications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading conversations...</p>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Communications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
            <p className="text-muted-foreground">
              When VCs reach out to you, their messages will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Conversations
            {conversations.some(c => c.unread_count > 0) && (
              <Badge variant="default" className="ml-2">
                {conversations.reduce((sum, c) => sum + c.unread_count, 0)} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.vc_user_id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedConversation?.vc_user_id === conversation.vc_user_id
                      ? 'bg-primary/10 border-primary/20'
                      : 'hover:bg-muted/50 border-muted'
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    loadMessages(conversation.vc_user_id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{conversation.vc_name}</p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.last_message}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(conversation.last_message_time, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedConversation ? (
              <>
                <User className="h-5 w-5" />
                Chat with {selectedConversation.vc_name}
              </>
            ) : (
              <>
                <MessageCircle className="h-5 w-5" />
                Select a Conversation
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[400px]">
          {selectedConversation ? (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4 p-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.sender_id !== user?.id && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            <User className="h-4 w-4" />
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
                            {message.is_from_vc ? 'VC Team' : 'You'}
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
                          <AvatarFallback className="bg-green-500 text-white text-xs">
                            <Building2 className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder={`Message ${selectedConversation.vc_name}...`}
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Select a conversation to start chatting with VCs
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
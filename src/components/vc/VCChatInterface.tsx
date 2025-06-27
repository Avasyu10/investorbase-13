
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  user: UserProfile;
  content: string;
  timestamp: Date;
  isPrivate?: boolean;
  targetUserId?: string;
  isSystemMessage?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "associate" | "intern";
  avatar?: string;
  color: string;
  email?: string;
  is_vc?: boolean;
  is_manager?: boolean;
}

interface DbMessage {
  id: string;
  name: string;
  message: string;
  time: string;
  to_recipient: string;
  user_id: string;
  recipient_id: string | null;
  created_at: string;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "admin": return "bg-red-100 text-red-800 border-red-200";
    case "manager": return "bg-blue-100 text-blue-800 border-blue-200";
    case "analyst": return "bg-green-100 text-green-800 border-green-200";
    case "associate": return "bg-purple-100 text-purple-800 border-purple-200";
    case "intern": return "bg-orange-100 text-orange-800 border-orange-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getUserColor = (email: string) => {
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
};

interface VCChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VCChatInterface({ open, onOpenChange }: VCChatInterfaceProps) {
  const { user } = useAuth();
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<{ [key: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [otherUsers, setOtherUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState("group");
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profiles from database
  const loadUserProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or('is_vc.eq.true,is_manager.eq.true');

      if (error) {
        console.error('Error loading user profiles:', error);
        return;
      }

      if (profiles) {
        const userProfiles: UserProfile[] = profiles.map(profile => {
          let displayName = profile.full_name || profile.username || profile.email?.split('@')[0] || 'Unknown User';
          let role: UserProfile['role'] = 'intern';
          
          // Handle manager role with special display
          if (profile.is_manager) {
            role = 'manager';
            if (profile.email === 'kanishksaxena1103@gmail.com') {
              displayName = 'Kanishk Saxena (manager)';
            }
          } else if (profile.is_admin) {
            role = 'admin';
          } else if (profile.is_vc) {
            role = 'analyst';
          }

          return {
            id: profile.id,
            name: displayName,
            role,
            color: getUserColor(profile.email || profile.id),
            email: profile.email,
            is_vc: profile.is_vc,
            is_manager: profile.is_manager
          };
        });

        // Find current user
        const current = userProfiles.find(p => p.id === user?.id);
        if (current) {
          setCurrentUser(current);
          setOtherUsers(userProfiles.filter(p => p.id !== user?.id));
        }
      }
    } catch (error) {
      console.error('Error loading user profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert database message to UI message format
  const convertDbMessageToMessage = (dbMessage: DbMessage): Message => {
    // Find user by ID first, then by name as fallback
    let messageUser = otherUsers.find(u => u.id === dbMessage.user_id) || 
                     currentUser && currentUser.id === dbMessage.user_id ? currentUser : null;
    
    if (!messageUser) {
      messageUser = otherUsers.find(u => u.name === dbMessage.name) || currentUser;
    }
    
    // If still no user found, create a placeholder
    if (!messageUser) {
      messageUser = {
        id: dbMessage.user_id || 'unknown',
        name: dbMessage.name,
        role: 'intern',
        color: getUserColor(dbMessage.name)
      };
    }
    
    return {
      id: dbMessage.id,
      user: messageUser,
      content: dbMessage.message,
      timestamp: new Date(dbMessage.time),
      isPrivate: dbMessage.recipient_id !== null,
      targetUserId: dbMessage.recipient_id || undefined,
    };
  };

  // Helper function to determine which chat key to use for private messages
  const getChatKey = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('-');
  };

  // Load existing messages from database
  const loadMessages = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('vc_chat_messages')
        .select('*')
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
        const messages = data.map(convertDbMessageToMessage);
        
        // Separate group and private messages
        const group = messages.filter(msg => !msg.isPrivate);
        const privateMessagesByKey: { [key: string]: Message[] } = {};
        
        messages.filter(msg => msg.isPrivate).forEach(msg => {
          if (msg.targetUserId) {
            const chatKey = getChatKey(currentUser.id, msg.targetUserId);
            if (!privateMessagesByKey[chatKey]) {
              privateMessagesByKey[chatKey] = [];
            }
            privateMessagesByKey[chatKey].push(msg);
          }
        });

        setGroupMessages(group);
        setPrivateMessages(privateMessagesByKey);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Save message to database
  const saveMessage = async (message: Message, isPrivateMessage = false, targetUser?: UserProfile) => {
    if (!user || !currentUser) return false;

    try {
      const { error } = await supabase
        .from('vc_chat_messages')
        .insert({
          name: currentUser.name,
          message: message.content,
          time: message.timestamp.toISOString(),
          to_recipient: isPrivateMessage && targetUser ? targetUser.id : 'group_chat',
          recipient_id: isPrivateMessage && targetUser ? targetUser.id : null,
          user_id: user.id
        });

      if (error) {
        console.error('Error saving message:', error);
        toast({
          title: "Error",
          description: "Failed to save message",
          variant: "destructive"
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      return false;
    }
  };

  // Initialize user profiles when component opens
  useEffect(() => {
    if (open && user) {
      loadUserProfiles();
    }
  }, [open, user]);

  // Load messages when current user is set
  useEffect(() => {
    if (currentUser) {
      loadMessages();
    }
  }, [currentUser]);

  // Set up real-time subscription
  useEffect(() => {
    if (!open || !currentUser) return;

    const channel = supabase
      .channel('vc_chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vc_chat_messages'
        },
        (payload) => {
          const dbMessage = payload.new as DbMessage;
          const newMessage = convertDbMessageToMessage(dbMessage);
          
          console.log('New message received via realtime:', newMessage);
          
          if (newMessage.isPrivate && newMessage.targetUserId) {
            const chatKey = getChatKey(currentUser.id, newMessage.targetUserId);
            console.log('Adding private message to chat key:', chatKey);
            setPrivateMessages(prev => ({
              ...prev,
              [chatKey]: [...(prev[chatKey] || []), newMessage]
            }));
          } else {
            console.log('Adding group message via realtime');
            setGroupMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, currentUser]);

  const handleSendMessage = async (isPrivateMessage = false, targetUser?: UserProfile) => {
    if (!newMessage.trim() || !currentUser) return;

    const message: Message = {
      id: Date.now().toString(),
      user: currentUser,
      content: newMessage,
      timestamp: new Date(),
      isPrivate: isPrivateMessage,
      targetUserId: targetUser?.id,
    };

    console.log('Sending message:', message);
    
    // Save to database
    const success = await saveMessage(message, isPrivateMessage, targetUser);
    
    if (success) {
      console.log('Message saved successfully');
      setNewMessage("");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === "group") {
        handleSendMessage();
      } else if (selectedPrivateUser) {
        handleSendMessage(true, selectedPrivateUser);
      }
    }
  };

  const getPrivateMessages = (userId: string) => {
    if (!currentUser) return [];
    const chatKey = getChatKey(currentUser.id, userId);
    return (privateMessages[chatKey] || [])
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Render messages function
  const renderMessages = (messages: Message[]) => (
    <div className="space-y-3 p-4">
      {messages.map((message) => {
        // Render system messages differently
        if (message.isSystemMessage) {
          return (
            <div key={message.id} className="flex justify-center my-2">
              <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full border">
                {message.content}
              </div>
            </div>
          );
        }

        // Regular message rendering
        return (
          <div key={message.id} className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.user.avatar} />
              <AvatarFallback className={`${message.user.color} text-white text-xs`}>
                {message.user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{message.user.name}</span>
                <Badge variant="outline" className={`text-xs ${getRoleColor(message.user.role)}`}>
                  {message.user.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (isLoading || !currentUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading chat...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="border-b px-4 py-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Team Chat
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 min-h-0">
          {/* Users Sidebar */}
          <div className="w-60 border-r flex flex-col">
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <p className="text-xs text-muted-foreground mb-1">Logged in as:</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`${currentUser.color} text-white text-xs`}>
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{currentUser.name}</span>
                  <Badge variant="outline" className={`ml-1 text-xs ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-3 flex-shrink-0">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Team Members ({otherUsers.length})
              </h3>
            </div>
            
            <div className="flex-1 px-3 pb-3 overflow-y-auto">
              <div className="space-y-1">
                {otherUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPrivateUser?.id === user.id && activeTab === "private"
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedPrivateUser(user);
                      setActiveTab("private");
                    }}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className={`${user.color} text-white text-xs`}>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <Badge variant="outline" className={`text-xs ${getRoleColor(user.role)}`}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tab Navigation */}
            <div className="border-b px-4 py-3 flex-shrink-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="group" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Group Chat
                  </TabsTrigger>
                  <TabsTrigger value="private" className="flex items-center gap-2" disabled={!selectedPrivateUser}>
                    <User className="h-4 w-4" />
                    {selectedPrivateUser ? `Chat with ${selectedPrivateUser.name}` : "Private Chat"}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === "group" ? (
                <>
                  <ScrollArea className="flex-1">
                    {renderMessages(groupMessages)}
                  </ScrollArea>
                  <div className="border-t p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Message the team..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => handleSendMessage()}
                        disabled={!newMessage.trim()}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send • Click on team members for private chat
                    </p>
                  </div>
                </>
              ) : selectedPrivateUser ? (
                <>
                  <div className="p-4 bg-muted/30 border-b flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`${selectedPrivateUser.color} text-white text-xs`}>
                          {selectedPrivateUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">Private chat with {selectedPrivateUser.name}</span>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    {renderMessages(getPrivateMessages(selectedPrivateUser.id))}
                  </ScrollArea>
                  
                  <div className="border-t p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Private message to ${selectedPrivateUser.name}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => handleSendMessage(true, selectedPrivateUser)}
                        disabled={!newMessage.trim()}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send private message
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a team member to start a private conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

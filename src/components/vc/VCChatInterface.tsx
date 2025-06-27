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
  const [realUserMappings, setRealUserMappings] = useState<{ [staticId: string]: string }>({});

  // Load user profiles from database and create static team members
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

      // Create static team members array with 4 members - Fixed names without role suffixes
      const staticTeamMembers: UserProfile[] = [
        {
          id: 'static-kanishk',
          name: 'Kanishk Saxena',
          role: 'manager',
          color: getUserColor('kanishksaxena1103@gmail.com'),
          email: 'kanishksaxena1103@gmail.com',
          is_manager: true,
          is_vc: false
        },
        {
          id: 'static-roohi',
          name: 'Roohi Sharma', 
          role: 'admin',
          color: getUserColor('roohi@example.com'),
          email: 'roohi@example.com',
          is_vc: true,
          is_manager: false
        },
        {
          id: 'static-alex',
          name: 'Alex Johnson',
          role: 'analyst',
          color: getUserColor('alex@example.com'),
          email: 'alex@example.com',
          is_vc: false,
          is_manager: false
        },
        {
          id: 'static-sarah',
          name: 'Sarah Wilson',
          role: 'associate', 
          color: getUserColor('sarah@example.com'),
          email: 'sarah@example.com',
          is_vc: false,
          is_manager: false
        }
      ];

      // Create mapping from static IDs to real database user IDs
      const mappings: { [staticId: string]: string } = {};
      
      if (profiles && user) {
        // Find current user and determine their display info
        const dbProfile = profiles.find(p => p.id === user.id);
        let current: UserProfile | null = null;

        if (dbProfile) {
          if (dbProfile.is_manager) {
            // Map real Kanishk to static Kanishk
            current = {
              ...staticTeamMembers[0],
              id: dbProfile.id // Use real database ID for messaging
            };
            // Create reverse mapping: static-kanishk -> real user ID
            mappings['static-kanishk'] = dbProfile.id;
          } else if (dbProfile.is_vc && !dbProfile.is_manager) {
            // Map real VC user to static Roohi
            current = {
              ...staticTeamMembers[1],
              id: dbProfile.id // Use real database ID for messaging
            };
            // Create reverse mapping: static-roohi -> real user ID
            mappings['static-roohi'] = dbProfile.id;
          }
        }

        // Find other real users and create mappings
        profiles.forEach(profile => {
          if (profile.is_manager && profile.id !== user.id) {
            mappings['static-kanishk'] = profile.id;
          } else if (profile.is_vc && !profile.is_manager && profile.id !== user.id) {
            mappings['static-roohi'] = profile.id;
          }
        });

        console.log('Created user mappings:', mappings);
        setRealUserMappings(mappings);

        if (current) {
          setCurrentUser(current);
          
          // Set other users - filter out current user's static equivalent and only show members who can cross-message
          const others = staticTeamMembers.filter(member => {
            if (current.role === 'manager') {
              // If current user is manager (Kanishk), show Roohi for cross-messaging
              return member.role === 'admin';
            } else if (current.role === 'admin') {
              // If current user is admin (Roohi), show Kanishk for cross-messaging  
              return member.role === 'manager';
            }
            return false;
          }).map(member => {
            // Map the static user to real user for messaging if available
            const realUserId = mappings[member.id];
            return {
              ...member,
              // Keep static ID for display but store real user ID in a custom property
              realUserId: realUserId
            };
          });
          
          // Add the other static members for display only (they can't cross-message yet)
          const displayOnlyMembers = staticTeamMembers.filter(member => 
            member.role !== 'manager' && member.role !== 'admin'
          );
          
          setOtherUsers([...others, ...displayOnlyMembers]);
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
    // Try to map database user to current user or team members
    let messageUser: UserProfile | null = null;
    
    if (currentUser && currentUser.id === dbMessage.user_id) {
      messageUser = currentUser;
    } else {
      // Try to find in other users by ID
      messageUser = otherUsers.find(u => u.id === dbMessage.user_id);
    }
    
    // If still no user found, create a placeholder based on the name
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
      console.log('Loading messages for user:', currentUser.id);
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
        console.log('Loaded messages from database:', data.length);
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
        console.log('Set group messages:', group.length);
        console.log('Set private messages:', Object.keys(privateMessagesByKey).length);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Save message to database
  const saveMessage = async (message: Message, isPrivateMessage = false, targetUser?: UserProfile) => {
    if (!user || !currentUser) return false;

    try {
      console.log('Saving message:', {
        content: message.content,
        isPrivate: isPrivateMessage,
        targetUser: targetUser?.name,
        targetUserId: targetUser?.id,
        currentUser: currentUser.name,
        realUserMappings: realUserMappings
      });

      // Get the real recipient ID if this is a private message
      let realRecipientId: string | null = null;
      if (isPrivateMessage && targetUser) {
        // Check if the target user has a realUserId property (our custom mapping)
        if ((targetUser as any).realUserId) {
          realRecipientId = (targetUser as any).realUserId;
          console.log(`Using realUserId property: ${realRecipientId}`);
        } else if (targetUser.id.startsWith('static-')) {
          // Fallback to mapping lookup
          realRecipientId = realUserMappings[targetUser.id] || null;
          console.log(`Mapping ${targetUser.id} to real user ID: ${realRecipientId}`);
        } else {
          realRecipientId = targetUser.id;
        }
        
        if (!realRecipientId) {
          console.error('Could not find real user ID for target user:', targetUser);
          console.error('Available mappings:', realUserMappings);
          toast({
            title: "Error",
            description: "Could not find recipient user",
            variant: "destructive"
          });
          return false;
        }
      }

      const { error } = await supabase
        .from('vc_chat_messages')
        .insert({
          name: currentUser.name,
          message: message.content,
          time: message.timestamp.toISOString(),
          to_recipient: isPrivateMessage && targetUser ? realRecipientId : 'group_chat',
          recipient_id: realRecipientId,
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
      
      console.log('Message saved successfully');
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
      console.log('Message saved successfully, reloading messages');
      setNewMessage("");
      // Immediately reload messages to ensure they appear right away
      await loadMessages();
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

  // Check if user can cross-message (only Kanishk and Roohi for now)
  const canCrossMessage = (user: UserProfile) => {
    return user.role === 'manager' || user.role === 'admin';
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
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      canCrossMessage(user)
                        ? `cursor-pointer ${
                            selectedPrivateUser?.id === user.id && activeTab === "private"
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted/50'
                          }`
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (canCrossMessage(user)) {
                        console.log('Selected user for private chat:', user);
                        setSelectedPrivateUser(user);
                        setActiveTab("private");
                      }
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
                      {!canCrossMessage(user) && (
                        <p className="text-xs text-muted-foreground">Chat coming soon</p>
                      )}
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
                  <TabsTrigger value="private" className="flex items-center gap-2" disabled={!selectedPrivateUser || !canCrossMessage(selectedPrivateUser)}>
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
                      Press Enter to send • Click on available team members for private chat
                    </p>
                  </div>
                </>
              ) : selectedPrivateUser && canCrossMessage(selectedPrivateUser) ? (
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
                    <p>Select an available team member to start a private conversation</p>
                    <p className="text-sm mt-2">Private messaging coming soon for other members</p>
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

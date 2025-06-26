
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, User, Bell, BellRing } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: Date;
  isPrivate?: boolean;
  targetUserId?: string;
  isSystemNotification?: boolean;
}

interface User {
  id: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "associate" | "intern";
  avatar?: string;
  color: string;
}

const mockUsers: User[] = [
  { id: "1", name: "Roohi Sharma", role: "admin", color: "bg-red-500" },
  { id: "2", name: "Kanishk Saxena", role: "manager", color: "bg-blue-500" },
  { id: "3", name: "Avasyu Sharma", role: "analyst", color: "bg-green-500" },
  { id: "4", name: "Tanisha Singh", role: "associate", color: "bg-purple-500" },
  { id: "5", name: "Himanshu", role: "intern", color: "bg-orange-500" },
];

// System user for notifications
const systemUser: User = {
  id: "system",
  name: "System",
  role: "admin",
  color: "bg-gray-500"
};

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

interface VCChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VCChatInterface({ open, onOpenChange }: VCChatInterfaceProps) {
  const [groupMessages, setGroupMessages] = useState<Message[]>([
    {
      id: "1",
      user: mockUsers[0],
      content: "Good morning team! Let's discuss the latest pitch decks that came in.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: "2",
      user: mockUsers[1],
      content: "I've reviewed the three submissions from yesterday. The fintech startup looks promising.",
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
    },
    {
      id: "3",
      user: mockUsers[2],
      content: "Their market analysis is solid, but I have concerns about their customer acquisition strategy.",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      id: "4",
      user: mockUsers[3],
      content: "I agree with Avasyu. The CAC to LTV ratio needs more work. Should we schedule a follow-up call?",
      timestamp: new Date(Date.now() - 45 * 60 * 1000)
    },
    {
      id: "5",
      user: mockUsers[4],
      content: "I can prepare a comparative analysis with similar companies in our portfolio.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000)
    },
  ]);
  
  const [privateMessages, setPrivateMessages] = useState<{ [key: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState("");
  const [currentUser] = useState(mockUsers[0]); // Admin user (Roohi Sharma)
  const [activeTab, setActiveTab] = useState("group");
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<User | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const { toast } = useToast();

  // Real-time subscription effect with proper error handling
  useEffect(() => {
    if (!open) {
      setConnectionStatus('disconnected');
      return;
    }

    console.log('Setting up real-time subscription for company_details updates...');
    setConnectionStatus('connecting');

    let channel: any = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isSubscribing = true;

    const setupRealtimeSubscription = () => {
      if (!isSubscribing) return;

      try {
        console.log('Creating new real-time channel...');
        
        channel = supabase
          .channel('company-poc-updates', {
            config: {
              broadcast: { self: false },
              presence: { key: 'company-poc-channel' }
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'company_details',
              filter: 'teammember_name=not.is.null'
            },
            (payload) => {
              console.log('Received real-time update:', payload);
              
              try {
                const oldRecord = payload.old as any;
                const newRecord = payload.new as any;
                
                // Check if teammember_name was actually changed
                if (oldRecord?.teammember_name !== newRecord?.teammember_name) {
                  const notificationMessage: Message = {
                    id: `notification-${Date.now()}`,
                    user: systemUser,
                    content: `🔔 Team POC updated: "${newRecord.teammember_name || 'Not assigned'}" assigned to a company`,
                    timestamp: new Date(),
                    isSystemNotification: true
                  };

                  console.log('Adding notification message:', notificationMessage);
                  
                  setGroupMessages(prev => [...prev, notificationMessage]);
                  setNotificationCount(prev => prev + 1);
                  
                  toast({
                    title: "Team POC Updated",
                    description: `New team member assigned: ${newRecord.teammember_name || 'Not assigned'}`,
                    duration: 5000,
                  });
                }
              } catch (error) {
                console.error('Error processing real-time update:', error);
              }
            }
          )
          .subscribe(async (status, err) => {
            console.log('Real-time subscription status:', status, err);
            
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to company_details changes');
              setConnectionStatus('connected');
              
              // Clear any retry timeout since we're now connected
              if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
              }
              
              toast({
                title: "Real-time notifications enabled",
                description: "You'll receive Team POC updates in real-time",
              });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.error('Real-time subscription error:', status, err);
              setConnectionStatus('error');
              
              // Clean up the current channel
              if (channel) {
                try {
                  await supabase.removeChannel(channel);
                } catch (cleanupError) {
                  console.error('Error cleaning up channel:', cleanupError);
                }
                channel = null;
              }
              
              // Retry connection after a delay if still subscribing
              if (isSubscribing && !retryTimeout) {
                console.log('Scheduling retry in 5 seconds...');
                retryTimeout = setTimeout(() => {
                  if (isSubscribing) {
                    console.log('Retrying real-time connection...');
                    setConnectionStatus('connecting');
                    setupRealtimeSubscription();
                  }
                }, 5000);
              }
            }
          });
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        setConnectionStatus('error');
        
        // Retry after error
        if (isSubscribing && !retryTimeout) {
          retryTimeout = setTimeout(() => {
            if (isSubscribing) {
              setupRealtimeSubscription();
            }
          }, 5000);
        }
      }
    };

    setupRealtimeSubscription();

    return () => {
      console.log('Cleaning up real-time subscription...');
      isSubscribing = false;
      setConnectionStatus('disconnected');
      
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      
      if (channel) {
        supabase.removeChannel(channel).catch(console.error);
      }
    };
  }, [open, toast]);

  const handleSendMessage = (isPrivate = false, targetUser?: User) => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      user: currentUser,
      content: newMessage,
      timestamp: new Date(),
      isPrivate,
      targetUserId: targetUser?.id,
    };

    if (isPrivate && targetUser) {
      const chatKey = `${currentUser.id}-${targetUser.id}`;
      setPrivateMessages(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), message]
      }));
    } else {
      setGroupMessages(prev => [...prev, message]);
    }

    setNewMessage("");
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
    const chatKey = `${currentUser.id}-${userId}`;
    const reverseChatKey = `${userId}-${currentUser.id}`;
    return [...(privateMessages[chatKey] || []), ...(privateMessages[reverseChatKey] || [])]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const renderMessages = (messages: Message[]) => (
    <div className="space-y-3 p-4">
      {messages.map((message) => (
        <div key={message.id} className={`flex gap-3 ${message.isSystemNotification ? 'bg-blue-50 p-2 rounded-lg border border-blue-200' : ''}`}>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={message.user.avatar} />
            <AvatarFallback className={`${message.user.color} text-white text-xs`}>
              {message.isSystemNotification ? <Bell className="h-4 w-4" /> : message.user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{message.user.name}</span>
              {!message.isSystemNotification && (
                <Badge variant="outline" className={`text-xs ${getRoleColor(message.user.role)}`}>
                  {message.user.role}
                </Badge>
              )}
              {message.isSystemNotification && (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                  notification
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className={`${message.isSystemNotification ? 'bg-blue-100/50' : 'bg-muted/30'} rounded-lg p-3`}>
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const otherUsers = mockUsers.filter(user => user.id !== currentUser.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="border-b px-4 py-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Team Chat
            {notificationCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                <BellRing className="h-3 w-3 mr-1" />
                {notificationCount}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-xs ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
              <div className={`h-2 w-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
            </div>
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
                    {notificationCount > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0.5">
                        {notificationCount}
                      </Badge>
                    )}
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
                      Press Enter to send • Click on team members for private chat • 
                      <span className={`ml-1 ${getConnectionStatusColor()}`}>
                        Real-time: {getConnectionStatusText()}
                      </span>
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

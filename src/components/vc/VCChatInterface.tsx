
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Users, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: Date;
  isPrivate?: boolean;
  targetUserId?: string;
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

  const renderMessages = (messages: Message[]) => (
    <div className="space-y-3 p-2">
      {messages.map((message) => (
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
      ))}
    </div>
  );

  const otherUsers = mockUsers.filter(user => user.id !== currentUser.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[98vh] flex flex-col p-0">
        <DialogHeader className="border-b px-4 py-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Team Chat
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 gap-3 min-h-0 px-4 pb-4">
          {/* Users Sidebar */}
          <div className="w-60 border-r pr-3 flex flex-col">
            <div className="mb-3 p-2 bg-muted/30 rounded-lg flex-shrink-0">
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

            <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
              Team Members ({otherUsers.length})
            </h3>
            <div className="space-y-1 flex-1 overflow-y-auto">
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

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="mb-2 flex-shrink-0">
                <TabsTrigger value="group" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Group Chat
                </TabsTrigger>
                <TabsTrigger value="private" className="flex items-center gap-2" disabled={!selectedPrivateUser}>
                  <User className="h-4 w-4" />
                  {selectedPrivateUser ? `Chat with ${selectedPrivateUser.name}` : "Private Chat"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="group" className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1">
                  {renderMessages(groupMessages)}
                </ScrollArea>
                <div className="border-t pt-2 mt-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Message the team..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full"
                      />
                    </div>
                    <Button 
                      onClick={() => handleSendMessage()}
                      disabled={!newMessage.trim()}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Enter to send • Click on team members for private chat
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="private" className="flex-1 flex flex-col min-h-0">
                {selectedPrivateUser ? (
                  <>
                    <div className="flex items-center gap-2 mb-2 p-2 bg-muted/30 rounded-lg flex-shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`${selectedPrivateUser.color} text-white text-xs`}>
                          {selectedPrivateUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">Private chat with {selectedPrivateUser.name}</span>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      {renderMessages(getPrivateMessages(selectedPrivateUser.id))}
                    </ScrollArea>
                    
                    <div className="border-t pt-2 mt-2 flex-shrink-0">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder={`Private message to ${selectedPrivateUser.name}...`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full"
                          />
                        </div>
                        <Button 
                          onClick={() => handleSendMessage(true, selectedPrivateUser)}
                          disabled={!newMessage.trim()}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

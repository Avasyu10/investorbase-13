import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: Date;
}

interface User {
  id: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "associate" | "intern";
  avatar?: string;
  color: string;
  email?: string;
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

interface VCChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VCChatInterface({ open, onOpenChange }: VCChatInterfaceProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  // Create current user as admin
  const currentUser: User = {
    id: user?.id || "current-user",
    name: profile?.full_name || user?.email?.split('@')[0] || "You",
    role: "admin",
    color: "bg-red-500",
    email: user?.email || ""
  };

  // Other mock users for the team
  const otherUsers: User[] = [
    { id: "2", name: "Michael Rodriguez", role: "manager", color: "bg-blue-500" },
    { id: "3", name: "Emily Johnson", role: "analyst", color: "bg-green-500" },
    { id: "4", name: "David Kim", role: "associate", color: "bg-purple-500" },
    { id: "5", name: "Alex Thompson", role: "intern", color: "bg-orange-500" },
  ];

  const allUsers = [currentUser, ...otherUsers];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      user: currentUser,
      content: "Good morning team! Let's discuss the latest pitch decks that came in.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: "2",
      user: otherUsers[0],
      content: "I've reviewed the three submissions from yesterday. The fintech startup looks promising.",
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
    },
    {
      id: "3",
      user: otherUsers[1],
      content: "Their market analysis is solid, but I have concerns about their customer acquisition strategy.",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      id: "4",
      user: otherUsers[2],
      content: "I agree with Emily. The CAC to LTV ratio needs more work. Should we schedule a follow-up call?",
      timestamp: new Date(Date.now() - 45 * 60 * 1000)
    },
    {
      id: "5",
      user: otherUsers[3],
      content: "I can prepare a comparative analysis with similar companies in our portfolio.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000)
    },
  ]);
  
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(currentUser);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      user: selectedUser,
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            VC Team Chat
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Users Sidebar */}
          <div className="w-64 border-r pr-4 flex flex-col">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Team Members ({allUsers.length})
            </h3>
            <div className="space-y-2">
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUser.id === user.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className={`${user.color} text-white text-xs`}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.id === currentUser.id ? `${user.name} (You)` : user.name}
                    </p>
                    <Badge variant="outline" className={`text-xs ${getRoleColor(user.role)}`}>
                      {user.role}
                    </Badge>
                  </div>
                  {selectedUser.id === user.id && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Currently speaking as:</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className={`${selectedUser.color} text-white text-xs`}>
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {selectedUser.id === currentUser.id ? `${selectedUser.name} (You)` : selectedUser.name}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
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
                        <span className="font-medium text-sm">
                          {message.user.id === currentUser.id ? `${message.user.name} (You)` : message.user.name}
                        </span>
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
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t pt-4 px-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Message as ${selectedUser.id === currentUser.id ? `${selectedUser.name} (You)` : selectedUser.name}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full"
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send • Click on team members to switch perspectives
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

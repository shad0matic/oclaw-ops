import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

interface CategoryChatProps {
  category: string;
  currentUser: string;
}

export function CategoryChat({ category, currentUser }: CategoryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMessages() {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookmark-chat?category=${encodeURIComponent(category)}`);
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error("Failed to fetch chat messages", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [category]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`/api/bookmark-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category, text: newMessage, author: currentUser }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
      } else {
        console.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-medium">Chat for {category}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.author === currentUser ? 'flex-row-reverse' : ''}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {msg.author.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-xs p-3 rounded-lg ${msg.author === currentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <div className="text-sm font-medium">{msg.author}</div>
                <div className="text-sm">{msg.text}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-border flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

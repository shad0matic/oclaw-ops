"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Comment {
  id: number;
  task_id: number;
  author: string;
  message: string;
  created_at: string;
}

interface TaskCommentsProps {
  taskId: number;
}

const formatTime = (date: string) => {
  try {
    return format(new Date(date), "dd/MM HH:mm", { locale: fr });
  } catch {
    return "";
  }
};

const getAuthorStyle = (author: string) => {
  if (author === "boss") {
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
  return "bg-amber-500/20 text-amber-400 border-amber-500/30";
};

const getAuthorLabel = (author: string) => {
  if (author === "boss") return "👔 Boss";
  if (author === "kevin" || author === "main") return "🍌 Kevin";
  return `🤖 ${author}`;
};

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["task-comments", taskId],
    queryFn: () => fetch(`/api/tasks/${taskId}/comments`).then((r) => r.json()),
    refetchInterval: isOpen ? 10000 : false,
  });

  // Mark agent comments as read by boss when opening
  const markAsRead = useMutation({
    mutationFn: async () => {
      await fetch(`/api/tasks/${taskId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reader: "boss" }),
      });
    },
    onSuccess: () => {
      // Invalidate the queue to refresh chat icons
      qc.invalidateQueries({ queryKey: ["task-queue"] });
    },
  });

  // Mark as read on first open
  useEffect(() => {
    if (isOpen && comments.length > 0) {
      markAsRead.mutate();
    }
  }, [isOpen, taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addComment = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, author: "boss" }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
      setMessage("");
    },
  });

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      addComment.mutate(message.trim());
    }
  };

  const unreadCount = comments.length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
          isOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Chat</span>
        {unreadCount > 0 && (
          <span className="bg-amber-500/20 text-amber-400 text-xs rounded-full px-2 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="border border-border rounded-lg bg-background/50 overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-48 overflow-y-auto p-3 space-y-2"
          >
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No messages yet. Start the conversation!
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border px-3 py-2 ${getAuthorStyle(c.author)}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {getAuthorLabel(c.author)}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!message.trim() || addComment.isPending}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import type { Message, Profile } from "../types";
import { parseAvatar } from "../lib/api";
import { Send } from "lucide-react";

interface Props {
  messages: Message[];
  profile: Profile | null;
  onSendMessage: (text: string) => void;
}

export function ChatPanel({ messages, profile, onSendMessage }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) { onSendMessage(input); setInput(""); }
  };

  return (
    <div className="glass-card flex flex-col h-[500px] lg:h-[600px]">
      <div className="p-4 border-b border-border"><h3 className="font-semibold text-white">Chat</h3></div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-muted text-sm text-center mt-8">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            if (msg.type === "system" || msg.type === "gift") {
              return <div key={msg.id} className="text-center animate-fade-in">
                <span className="inline-block text-xs text-muted bg-bg-elevated px-3 py-1.5 rounded-full">{msg.content}</span>
              </div>;
            }
            const avatar = parseAvatar(msg.profile?.avatar_url || null);
            const isMe = msg.sender_id === profile?.id;
            return (
              <div key={msg.id} className={`flex gap-2.5 animate-slide-up ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-sm flex-shrink-0`}>{avatar.emoji}</div>
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <span className="text-xs text-muted mb-0.5">{msg.profile?.nickname || "Unknown"}</span>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-accent text-white rounded-tr-sm" : "bg-bg-elevated text-zinc-200 rounded-tl-sm"}`}>{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="input-field flex-1" maxLength={500} />
        <button type="submit" disabled={!input.trim()} className="btn-primary !px-3 disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}

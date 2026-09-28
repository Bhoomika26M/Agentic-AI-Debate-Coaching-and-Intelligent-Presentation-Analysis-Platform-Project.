"use client";

import { useState } from "react";
import { Send, Mic, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Practice() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{role: string, content: string}[]>([
    { role: "agent", content: "Welcome to the debate simulation. Please state your opening argument." }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newChat = [...chat, { role: "user", content: input }];
    setChat(newChat);
    setInput("");
    setLoading(true);

    try {
      // Connect to the FastAPI Backend we built!
      const res = await fetch("http://localhost:8000/api/v1/simulation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newChat, difficulty: "medium" })
      });
      const data = await res.json();
      
      setChat([...newChat, { role: "agent", content: data.agent_response }]);
    } catch (err) {
      console.error(err);
      setChat([...newChat, { role: "agent", content: "Error connecting to AI Reasoning Engine." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border flex justify-between items-center bg-card">
        <Link href="/" className="font-heading font-bold text-xl hover:text-primary transition-colors">
          Agentic<span className="text-primary">Coach</span>
        </Link>
        <div className="flex gap-4">
          <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm font-medium">One-on-One Format</span>
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Fallacy Engine Active
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {chat.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-4 rounded-2xl max-w-[80%] ${
              msg.role === "user" 
                ? "bg-primary text-primary-foreground rounded-tr-none" 
                : "bg-card border border-border rounded-tl-none shadow-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-none flex gap-2 items-center">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75"></span>
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </main>

      <footer className="p-6 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button className="p-4 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">
            <Mic className="w-6 h-6" />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your argument here..." 
            className="flex-1 bg-background border border-border rounded-full px-6 outline-none focus:border-primary transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}

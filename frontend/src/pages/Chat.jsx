import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { WS_URL } from "@/lib/api";
import TagChip from "@/components/TagChip";
import { Send } from "lucide-react";
import { Link } from "react-router-dom";

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "history") setMessages(data.messages);
      else if (data.type === "message") setMessages((m) => [...m, data.message]);
      else if (data.type === "presence") setOnline(data.online);
    };
    return () => ws.close();
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ text }));
    setText("");
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="chat-page">
        <h1 className="font-racing font-black text-4xl uppercase mb-4">Chat Geral</h1>
        <p className="text-white/60 mb-6">Faça login para entrar na conversa.</p>
        <Link to="/login" className="race-btn-blue text-sm">Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12" data-testid="chat-page">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-racing uppercase tracking-widest text-neon-red text-xs mb-2">▸ Comunicação</p>
          <h1 className="font-racing font-black text-4xl md:text-5xl uppercase tracking-tighter">
            <span className="neon-blue">C</span>hat <span className="neon-red">Geral</span>
          </h1>
        </div>
        <div className="text-xs font-racing uppercase">
          <span className={connected ? "text-green-400" : "text-red-500"}>● {connected ? "Conectado" : "Offline"}</span>
          <span className="text-white/60 ml-3">{online} online</span>
        </div>
      </div>

      <div className="race-card flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-white/5" data-testid={`msg-${m.id}`}>
              <span className="font-racing text-xs text-white/40 w-12 flex-shrink-0">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <div className="flex flex-wrap gap-1 items-center min-w-0 flex-1">
                {(m.tags || []).slice(0, 2).map((t) => <TagChip key={t} name={t} small />)}
                <span className="font-racing font-bold" style={{ color: m.name_color || "#fff", textShadow: `0 0 6px ${m.name_color || "#00C2FF"}` }}>{m.nick}:</span>
                <span className="text-white/90 font-body break-all">{m.text}</span>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="border-t border-white/10 p-3 flex gap-2">
          <input
            className="race-input flex-1"
            placeholder="Digite a sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            data-testid="chat-input"
          />
          <button type="submit" className="race-btn-red text-xs px-4" data-testid="chat-send-btn">
            <Send size={14} />
          </button>
        </form>
      </div>

      <div className="mt-4 text-center text-xs text-white/40 font-racing uppercase tracking-widest">
        Dica: Mude a cor do seu nick no <Link to="/perfil" className="text-neon-blue underline">Perfil</Link>
      </div>
    </div>
  );
}

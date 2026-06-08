import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Flag, Disc, HardHat, Trophy, Zap, Crown, Gift, Send } from "lucide-react";
import { toast } from "sonner";

const ICONS = { flag: Flag, wheel: Disc, helmet: HardHat, trophy: Trophy, nitro: Zap, vip: Crown };

export default function Ofertas() {
  const { user, refresh } = useAuth();
  const [packages, setPackages] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [sendNick, setSendNick] = useState("");
  const [sendAmt, setSendAmt] = useState(10);

  useEffect(() => { api.get("/packages").then((r) => setPackages(r.data)); }, []);

  useEffect(() => {
    if (!user) return;
    const load = () => api.get("/tokens/next-claim").then((r) => setCountdown(r.data)).catch(() => {});
    load();
    const i = setInterval(() => {
      setCountdown((c) => c && c.seconds_remaining > 0 ? { ...c, seconds_remaining: c.seconds_remaining - 1 } : c);
    }, 1000);
    const refreshI = setInterval(load, 30000);
    return () => { clearInterval(i); clearInterval(refreshI); };
  }, [user]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60;
    return `${h}h ${m}m ${ss}s`;
  };

  const buy = async (pkg) => {
    if (!user) return toast.error("Faça login primeiro");
    try {
      const { data } = await api.post("/tokens/purchase", { package_id: pkg.id });
      toast.success(`+${data.tokens_added} tokens! Tag: ${data.auto_tag || "—"}`);
      refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const claim = async () => {
    try {
      await api.post("/tokens/claim-free");
      toast.success("+2 tokens grátis!");
      refresh();
      api.get("/tokens/next-claim").then((r) => setCountdown(r.data));
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const send = async () => {
    if (!user) return toast.error("Faça login");
    try {
      await api.post("/tokens/send", { nick: sendNick, amount: Number(sendAmt) });
      toast.success(`Enviado ${sendAmt} tokens para ${sendNick}`);
      setSendNick(""); setSendAmt(10);
      refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="ofertas-page">
      <div className="mb-10">
        <p className="font-racing uppercase tracking-widest text-neon-red text-xs mb-2">▸ Loja de Tokens</p>
        <h1 className="font-racing font-black text-4xl md:text-6xl uppercase tracking-tighter">
          <span className="neon-red">O</span>fertas
        </h1>
      </div>

      {/* Free claim + Send */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="race-card p-6" data-testid="claim-free-card">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="text-neon-blue" size={28} />
            <h2 className="font-racing uppercase font-bold tracking-wide">Tokens Grátis</h2>
          </div>
          <p className="text-white/70 font-body mb-4">Resgate <b className="text-neon-blue">2 tokens</b> a cada 10 horas.</p>
          {!user ? (
            <p className="text-white/50 text-sm">Faça login para resgatar.</p>
          ) : countdown?.ready ? (
            <button onClick={claim} className="race-btn-blue text-sm" data-testid="claim-free-btn">Resgatar Agora</button>
          ) : (
            <div>
              <p className="font-racing text-2xl text-neon-red" data-testid="claim-countdown">{countdown ? fmt(countdown.seconds_remaining) : "..."}</p>
              <p className="text-xs text-white/40 mt-1">até o próximo resgate</p>
            </div>
          )}
        </div>

        <div className="race-card p-6" data-testid="send-tokens-card">
          <div className="flex items-center gap-3 mb-3">
            <Send className="text-neon-red" size={28} />
            <h2 className="font-racing uppercase font-bold tracking-wide">Enviar Tokens</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="race-input" placeholder="Nick do destinatário" value={sendNick} onChange={(e) => setSendNick(e.target.value)} data-testid="send-nick-input" />
            <input type="number" className="race-input" placeholder="Quantia" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} data-testid="send-amount-input" />
          </div>
          <button onClick={send} className="race-btn-red text-xs mt-3" data-testid="send-tokens-btn" disabled={!user}>Enviar</button>
        </div>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((p) => {
          const Icon = ICONS[p.symbol] || Flag;
          return (
            <div key={p.id} className="race-card p-6 flex flex-col" data-testid={`pkg-${p.id}`}>
              <div className="flex items-center justify-between mb-4">
                <Icon className="text-neon-red" size={48} style={{ filter: "drop-shadow(0 0 8px #FF1E1E)" }} />
                <span className="tag-rgb px-2 py-1 text-[10px]" style={{ clipPath: "polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)" }}>{p.auto_tag}</span>
              </div>
              <h3 className="font-racing font-black uppercase text-xl">{p.name}</h3>
              <p className="font-racing text-3xl text-neon-blue mt-2">{p.tokens} <span className="text-sm text-white/60">tokens</span></p>
              <p className="text-white/80 font-body text-2xl mt-1">€ {p.price}</p>
              <button onClick={() => buy(p)} className="race-btn-blue text-xs mt-4" data-testid={`buy-${p.id}`} disabled={!user}>Comprar</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

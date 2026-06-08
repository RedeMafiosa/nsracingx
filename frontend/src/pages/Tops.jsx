import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Trophy, Eye } from "lucide-react";

export default function Tops() {
  const [tops, setTops] = useState([]);

  useEffect(() => { api.get("/tops").then((r) => setTops(r.data)); }, []);

  const podium = tops.slice(0, 3);
  const rest = tops.slice(3);
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visually
  const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="tops-page">
      <div className="mb-10 text-center">
        <p className="font-racing uppercase tracking-widest text-neon-red text-xs mb-2">▸ Hall da Fama</p>
        <h1 className="font-racing font-black text-4xl md:text-6xl uppercase tracking-tighter">
          <span className="neon-blue">T</span>ops <span className="neon-red">/</span> Upes
        </h1>
        <p className="text-white/60 font-body mt-2">As transmissões mais assistidas da pista</p>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-4 items-end mb-12">
        {podiumOrder.map((idx, vis) => {
          const item = podium[idx];
          if (!item) return <div key={vis} />;
          const heights = ["h-48", "h-64", "h-40"];
          return (
            <div key={item.id} className="text-center" data-testid={`podium-${idx + 1}`}>
              <div className="race-card overflow-hidden mb-2">
                <img src={item.thumbnail} alt={item.title} className="w-full h-32 object-cover" />
              </div>
              <Trophy size={32} className="mx-auto mb-2" style={{ color: medals[idx] }} />
              <div className={`${heights[vis]} race-card flex flex-col items-center justify-center p-4`}>
                <div className="font-racing text-5xl font-black" style={{ color: medals[idx], textShadow: `0 0 20px ${medals[idx]}` }}>#{idx + 1}</div>
                <p className="font-racing uppercase text-sm mt-2 line-clamp-2">{item.title}</p>
                <p className="text-white/60 text-xs flex items-center gap-1 mt-1"><Eye size={10} /> {item.views}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest */}
      <div className="space-y-2">
        {rest.map((t, i) => (
          <div key={t.id} className="race-card flex items-center gap-4 p-3" data-testid={`top-row-${i + 4}`}>
            <div className="font-racing text-2xl font-black w-12 text-center text-neon-blue">#{i + 4}</div>
            <img src={t.thumbnail} alt={t.title} className="w-24 h-16 object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-racing font-bold uppercase truncate">{t.title}</h3>
              <p className="text-white/50 text-sm">{t.streamer}</p>
            </div>
            <div className="text-neon-red font-racing flex items-center gap-1"><Eye size={14} /> {t.views}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

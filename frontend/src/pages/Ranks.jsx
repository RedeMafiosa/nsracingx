import { useEffect, useState } from "react";
import api from "@/lib/api";
import TagChip from "@/components/TagChip";
import { Clock, Trophy } from "lucide-react";

export default function Ranks() {
  const [data, setData] = useState({ by_rank: [], top_hours: [] });

  useEffect(() => { api.get("/ranks").then((r) => setData(r.data)); }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="ranks-page">
      <div className="mb-10">
        <p className="font-racing uppercase tracking-widest text-neon-blue text-xs mb-2">▸ Classificação</p>
        <h1 className="font-racing font-black text-4xl md:text-6xl uppercase tracking-tighter">
          <span className="neon-red">R</span>anks
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main list */}
        <div className="lg:col-span-2 space-y-2">
          <h2 className="font-racing uppercase font-bold tracking-wide text-neon-red mb-3 flex items-center gap-2">
            <Trophy size={18} /> Ranking por Tag (Maior para Menor)
          </h2>
          {data.by_rank.map((u, i) => (
            <div key={u.id} className="race-card p-4 flex items-center gap-4" data-testid={`rank-${i + 1}`}>
              <div className="font-racing font-black text-3xl text-neon-blue w-14 text-center">#{i + 1}</div>
              <img src={u.avatar_url || "https://images.unsplash.com/photo-1555532686-d0fccaccadcf"} alt={u.nick} className="w-12 h-12 object-cover border border-white/20" />
              <div className="flex-1 min-w-0">
                <p className="font-racing font-bold uppercase truncate" style={{ color: u.name_color || "#fff" }}>{u.nick}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(u.tags || []).slice(0, 4).map((t) => <TagChip key={t} name={t} small />)}
                </div>
              </div>
              <div className="text-right text-white/70 text-sm flex items-center gap-1 font-racing"><Clock size={12} /> {u.hours_active}h</div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="race-card p-5 h-fit lg:sticky lg:top-32" data-testid="top-hours-sidebar">
          <h2 className="font-racing uppercase font-bold tracking-wide text-neon-red mb-4 flex items-center gap-2">
            <Clock size={18} /> Top 10 Horas Ativas
          </h2>
          <ol className="space-y-2">
            {data.top_hours.map((u, i) => (
              <li key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-testid={`top-hours-${i + 1}`}>
                <span className={`font-racing font-black text-xl w-8 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-white/60"}`}>{i + 1}º</span>
                <img src={u.avatar_url || "https://images.unsplash.com/photo-1555532686-d0fccaccadcf"} className="w-8 h-8 object-cover border border-white/10" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="font-racing truncate text-sm" style={{ color: u.name_color || "#fff" }}>{u.nick}</p>
                  <p className="text-white/50 text-xs">{u.hours_active}h</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

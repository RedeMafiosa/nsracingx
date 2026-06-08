import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Eye, Radio } from "lucide-react";

export default function Lives() {
  const [lives, setLives] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => { api.get("/lives").then((r) => setLives(r.data)); }, []);

  const open = (l) => {
    setSelected(l);
    api.post(`/lives/${l.id}/view`).catch(() => {});
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="lives-page">
      <div className="mb-10">
        <p className="font-racing uppercase tracking-widest text-neon-blue text-xs mb-2">▸ Transmissões Ao Vivo</p>
        <h1 className="font-racing font-black text-4xl md:text-6xl uppercase tracking-tighter">
          <span className="neon-red">L</span>ives
        </h1>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelected(null)} data-testid="live-player-modal">
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-black border-2 border-neon-blue">
              <iframe src={selected.url} title={selected.title} className="w-full h-full" allowFullScreen frameBorder="0" />
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div>
                <h3 className="font-racing text-xl uppercase">{selected.title}</h3>
                <p className="text-white/60 font-body">{selected.streamer}</p>
              </div>
              <button onClick={() => setSelected(null)} className="race-btn-red text-xs" data-testid="close-live-btn">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {lives.map((l) => (
          <button key={l.id} onClick={() => open(l)} className="race-card text-left group" data-testid={`live-card-${l.id}`}>
            <div className="aspect-video relative overflow-hidden bg-black">
              <img src={l.thumbnail} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.src = "https://images.pexels.com/photos/28794445/pexels-photo-28794445.jpeg"; }} />
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-neon-red text-white text-[10px] font-racing font-bold uppercase px-2 py-1 tracking-widest">
                <Radio size={10} className="animate-pulse" /> Live
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 text-white text-xs font-racing px-2 py-1">
                <Eye size={12} /> {l.views}
              </div>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-racing uppercase tracking-widest text-neon-blue">{l.platform}</p>
              <h3 className="font-racing font-bold uppercase mt-1 line-clamp-2">{l.title}</h3>
              <p className="text-white/50 font-body text-sm mt-1">{l.streamer}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

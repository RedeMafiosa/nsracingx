import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import TagChip from "@/components/TagChip";
import { toast } from "sonner";
import { Camera, Save, Coins, Clock } from "lucide-react";

export default function Perfil() {
  const { user, refresh } = useAuth();
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar_url || "");
  const [cover, setCover] = useState(user?.cover_url || "");
  const [color, setColor] = useState(user?.name_color || "#00C2FF");

  if (!user) return <div className="p-12 text-center font-racing">Faça login.</div>;

  const save = async () => {
    try {
      await api.put("/profile", { bio, avatar_url: avatar, cover_url: cover, name_color: color });
      toast.success("Perfil salvo");
      refresh();
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  return (
    <div data-testid="perfil-page">
      {/* Cover */}
      <div className="relative h-64 md:h-80 carbon-bg" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url(${cover || "https://images.pexels.com/photos/4758140/pexels-photo-4758140.jpeg"})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 race-stripes opacity-40" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-10">
        <div className="flex items-end gap-6 mb-8">
          <img src={avatar || "https://images.unsplash.com/photo-1555532686-d0fccaccadcf"} alt={user.nick} className="w-32 h-32 border-4 border-neon-blue object-cover" style={{ boxShadow: "0 0 20px #00C2FF" }} data-testid="profile-avatar" />
          <div>
            <h1 className="font-racing font-black text-3xl md:text-5xl uppercase" style={{ color, textShadow: `0 0 12px ${color}` }} data-testid="profile-nick">{user.nick}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {(user.tags || []).map((t) => <TagChip key={t} name={t} />)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="race-card p-4 text-center">
            <Coins className="mx-auto text-yellow-400" />
            <p className="font-racing text-2xl mt-1">{user.tokens}</p>
            <p className="text-xs text-white/50 uppercase tracking-widest">Tokens</p>
          </div>
          <div className="race-card p-4 text-center">
            <Clock className="mx-auto text-neon-blue" />
            <p className="font-racing text-2xl mt-1">{user.hours_active}h</p>
            <p className="text-xs text-white/50 uppercase tracking-widest">Horas</p>
          </div>
          <div className="race-card p-4 text-center">
            <span className="text-2xl">🏁</span>
            <p className="font-racing text-2xl mt-1">{(user.tags || []).length}</p>
            <p className="text-xs text-white/50 uppercase tracking-widest">Tags</p>
          </div>
        </div>

        {/* Edit form */}
        <div className="race-card p-6">
          <h2 className="font-racing font-bold uppercase tracking-wide text-neon-blue mb-4 flex items-center gap-2">
            <Camera size={18} /> Editar Perfil
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/60 font-racing">Biografia</label>
              <textarea className="race-input mt-1" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} data-testid="bio-input" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60 font-racing">URL Foto de Perfil</label>
                <input className="race-input mt-1" value={avatar} onChange={(e) => setAvatar(e.target.value)} data-testid="avatar-input" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60 font-racing">URL Foto de Capa</label>
                <input className="race-input mt-1" value={cover} onChange={(e) => setCover(e.target.value)} data-testid="cover-input" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/60 font-racing">Cor do Nick no Chat</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" className="w-16 h-10 bg-transparent border border-white/20 cursor-pointer" value={color} onChange={(e) => setColor(e.target.value)} data-testid="color-input" />
                <span className="font-racing text-2xl" style={{ color, textShadow: `0 0 10px ${color}` }}>{user.nick}</span>
              </div>
            </div>
            <button onClick={save} className="race-btn-red text-sm" data-testid="profile-save-btn">
              <Save size={14} className="inline mr-2" /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

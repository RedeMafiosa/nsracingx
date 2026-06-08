import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import TagChip from "@/components/TagChip";
import { toast } from "sonner";
import { Ban, RotateCcw, UserX, Tag as TagIcon, Crown, ShieldOff, Plus, Trash2 } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState({ name: "", tier: 1 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [tab, setTab] = useState("users");

  const load = async () => {
    const [u, t] = await Promise.all([api.get("/admin/users"), api.get("/tags")]);
    setUsers(u.data); setTags(t.data);
  };

  useEffect(() => { if (user?.is_admin) load(); }, [user]);

  if (!user?.is_admin) return <div className="p-12 text-center font-racing text-neon-red">Acesso restrito</div>;

  const act = async (path, body, msg) => {
    try { await api.post(path, body); toast.success(msg); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const createTag = async () => {
    try { await api.post("/tags", { name: newTag.name, tier: Number(newTag.tier), rgb: true }); toast.success("Tag criada"); setNewTag({ name: "", tier: 1 }); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };

  const delTag = async (id) => { try { await api.delete(`/tags/${id}`); toast.success("Removida"); load(); } catch { toast.error("Erro"); } };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="admin-page">
      <div className="mb-8">
        <p className="font-racing uppercase tracking-widest text-neon-red text-xs mb-2">▸ Painel de Controle</p>
        <h1 className="font-racing font-black text-4xl md:text-5xl uppercase tracking-tighter">
          <span className="neon-red">A</span>dmin
        </h1>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10">
        {["users", "tags"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`font-racing uppercase tracking-widest text-xs px-4 py-3 transition ${tab === t ? "text-neon-blue border-b-2 border-neon-blue" : "text-white/50"}`} data-testid={`admin-tab-${t}`}>
            {t === "users" ? "Membros" : "Tags / Cargos"}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-2" data-testid="admin-users-list">
          {users.map((u) => (
            <div key={u.id} className="race-card p-4 flex items-center gap-4 flex-wrap">
              <img src={u.avatar_url || "https://images.unsplash.com/photo-1555532686-d0fccaccadcf"} className="w-12 h-12 object-cover border border-white/20" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-racing font-bold uppercase" style={{ color: u.name_color }}>
                  {u.nick} {u.is_admin && <Crown size={14} className="inline text-yellow-400 ml-1" />}
                  {u.banned && <span className="ml-2 text-xs bg-red-700 px-2 py-0.5 uppercase">Banido</span>}
                </p>
                <p className="text-white/50 text-xs">{u.email} · {u.tokens} tokens · {u.hours_active}h</p>
                <div className="flex flex-wrap gap-1 mt-1">{(u.tags || []).map((t) => <TagChip key={t} name={t} small />)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!u.banned ? (
                  <button onClick={() => act("/admin/ban", { user_id: u.id }, "Banido")} className="px-3 py-1.5 text-xs font-racing uppercase tracking-widest border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition" data-testid={`ban-${u.id}`}>
                    <Ban size={12} className="inline mr-1" />Banir
                  </button>
                ) : (
                  <button onClick={() => act("/admin/unban", { user_id: u.id }, "Desbanido")} className="px-3 py-1.5 text-xs font-racing uppercase border border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition" data-testid={`unban-${u.id}`}>
                    <RotateCcw size={12} className="inline mr-1" />Desbanir
                  </button>
                )}
                <button onClick={() => act("/admin/kick", { user_id: u.id }, "Expulso do chat")} className="px-3 py-1.5 text-xs font-racing uppercase border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white transition" data-testid={`kick-${u.id}`}>
                  <UserX size={12} className="inline mr-1" />Kick
                </button>
                {!u.is_admin ? (
                  <button onClick={() => act("/admin/promote", { user_id: u.id }, "Promovido")} className="px-3 py-1.5 text-xs font-racing uppercase border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition" data-testid={`promote-${u.id}`}>
                    <Crown size={12} className="inline mr-1" />Promover
                  </button>
                ) : (
                  <button onClick={() => act("/admin/demote", { user_id: u.id }, "Rebaixado")} className="px-3 py-1.5 text-xs font-racing uppercase border border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white transition" data-testid={`demote-${u.id}`}>
                    <ShieldOff size={12} className="inline mr-1" />Rebaixar
                  </button>
                )}
                <button onClick={() => setSelectedUser(u)} className="px-3 py-1.5 text-xs font-racing uppercase border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition" data-testid={`tag-${u.id}`}>
                  <TagIcon size={12} className="inline mr-1" />Tags
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tags" && (
        <div data-testid="admin-tags-tab">
          <div className="race-card p-4 mb-6 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs uppercase tracking-widest text-white/60 font-racing">Nome da Tag</label>
              <input className="race-input mt-1" value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} data-testid="new-tag-name" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/60 font-racing">Tier</label>
              <input type="number" className="race-input mt-1 w-24" value={newTag.tier} onChange={(e) => setNewTag({ ...newTag, tier: e.target.value })} data-testid="new-tag-tier" />
            </div>
            <button onClick={createTag} className="race-btn-blue text-xs" data-testid="create-tag-btn"><Plus size={12} className="inline mr-1" />Criar Tag</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tags.map((t) => (
              <div key={t.id} className="race-card p-4 flex items-center justify-between" data-testid={`admin-tag-${t.id}`}>
                <div>
                  <TagChip name={t.name} />
                  <p className="text-white/50 text-xs mt-2 font-racing">Tier {t.tier}</p>
                </div>
                <button onClick={() => delTag(t.id)} className="text-red-400 hover:text-red-300" data-testid={`del-tag-${t.id}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign tag modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)} data-testid="assign-tag-modal">
          <div className="race-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-racing font-bold uppercase mb-4">Atribuir Tags a {selectedUser.nick}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {(selectedUser.tags || []).map((t) => {
                const tg = tags.find((x) => x.name === t);
                return (
                  <button key={t} onClick={() => tg && act("/admin/remove-tag", { user_id: selectedUser.id, tag_id: tg.id }, "Removida").then(() => api.get("/admin/users").then(r => setSelectedUser(r.data.find(x => x.id === selectedUser.id))))} className="relative">
                    <TagChip name={t} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center">×</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-white/60 mb-2 font-racing uppercase">Adicionar:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tags.filter((tg) => !(selectedUser.tags || []).includes(tg.name)).map((tg) => (
                <button key={tg.id} onClick={() => act("/admin/assign-tag", { user_id: selectedUser.id, tag_id: tg.id }, "Atribuída").then(() => api.get("/admin/users").then(r => setSelectedUser(r.data.find(x => x.id === selectedUser.id))))} className="race-card p-2 hover:border-neon-blue" data-testid={`assign-${tg.id}`}>
                  <TagChip name={tg.name} small />
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedUser(null)} className="race-btn-red text-xs mt-4">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

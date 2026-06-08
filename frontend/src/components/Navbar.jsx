import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Flag, Users, Wifi, LogOut, Shield, Coins } from "lucide-react";

const NAV = [
  { to: "/", label: "Casa" },
  { to: "/lives", label: "Lives" },
  { to: "/tops", label: "Tops" },
  { to: "/ofertas", label: "Ofertas" },
  { to: "/ranks", label: "Ranks" },
  { to: "/chat", label: "Chat" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ registered: 0, online: 0, top10_hours: [] });

  useEffect(() => {
    const load = () => api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="sticky top-0 z-50 carbon-bg border-b border-white/10 backdrop-blur" data-testid="main-header">
      {/* Top stats ticker */}
      <div className="border-b border-white/5 bg-black/60 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-racing uppercase tracking-widest">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-neon-blue" data-testid="stat-registered">
              <Users size={12} /> Membros <span className="text-white font-bold">{stats.registered}</span>
            </span>
            <span className="flex items-center gap-1.5 text-neon-red" data-testid="stat-online">
              <Wifi size={12} /> Online <span className="text-white font-bold">{stats.online}</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 overflow-hidden">
            <span className="text-white/40">Top 10 Horas:</span>
            <div className="flex gap-3 animate-pulse" data-testid="top10-ticker">
              {stats.top10_hours.slice(0, 5).map((u, i) => (
                <span key={u.nick} className="text-white/70">
                  <span className="text-neon-blue">#{i + 1}</span> {u.nick} ({u.hours_active}h)
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
          <Flag className="text-neon-red group-hover:rotate-12 transition" size={28} />
          <span className="font-racing font-black text-2xl tracking-tight">
            <span className="neon-red">Ns</span><span className="neon-blue">Racing</span>
          </span>
        </Link>

        {/* Centered nav */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `font-racing uppercase text-sm tracking-widest px-4 py-2 transition-all ${
                  isActive ? "text-neon-blue [text-shadow:0_0_8px_#00C2FF]" : "text-white/70 hover:text-white"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/perfil" className="hidden md:flex items-center gap-2 text-sm font-racing" data-testid="profile-link">
                <Coins size={14} className="text-yellow-400" />
                <span className="text-yellow-400 font-bold">{user.tokens}</span>
                <span className="text-white/80">{user.nick}</span>
              </Link>
              {user.is_admin && (
                <Link to="/admin" className="text-neon-red" data-testid="admin-link" title="Admin">
                  <Shield size={18} />
                </Link>
              )}
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-white/60 hover:text-neon-red transition"
                data-testid="logout-btn"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="race-btn-blue text-xs" data-testid="login-link">Login</Link>
              <Link to="/register" className="race-btn-red text-xs" data-testid="register-link">Register</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex overflow-x-auto border-t border-white/5 bg-black/60">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) =>
            `flex-shrink-0 px-4 py-2 text-xs font-racing uppercase tracking-widest ${isActive ? "text-neon-blue" : "text-white/60"}`
          }>{n.label}</NavLink>
        ))}
      </nav>
      <div className="race-accent" />
    </header>
  );
}

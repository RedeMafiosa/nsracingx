import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

export function Forgot() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/forgot", { email }); setDone(true); toast.success("Se existir, enviamos o link"); }
    catch { toast.error("Erro"); }
  };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 carbon-bg" data-testid="forgot-page">
      <div className="race-card p-8 w-full max-w-md">
        <h1 className="font-racing font-black text-3xl uppercase mb-4"><span className="neon-red">Esqueceu</span> a senha?</h1>
        {done ? (
          <p className="text-white/70 font-body">Se o email existir, enviamos um link para resetar.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input className="race-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="forgot-email" />
            <button className="race-btn-blue w-full text-sm" data-testid="forgot-submit">Enviar Link</button>
          </form>
        )}
        <p className="mt-4 text-center"><Link to="/login" className="text-neon-blue text-sm font-racing uppercase">Voltar</Link></p>
      </div>
    </div>
  );
}

export function Reset() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/reset", { token: sp.get("token"), password: pw }); toast.success("Senha atualizada"); nav("/login"); }
    catch (err) { toast.error(err.response?.data?.detail || "Erro"); }
  };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 carbon-bg" data-testid="reset-page">
      <div className="race-card p-8 w-full max-w-md">
        <h1 className="font-racing font-black text-3xl uppercase mb-4">Nova senha</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="race-input" placeholder="Nova senha" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} data-testid="reset-pw" />
          <button className="race-btn-red w-full text-sm" data-testid="reset-submit">Atualizar</button>
        </form>
      </div>
    </div>
  );
}

export function Verify() {
  const [sp] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  useState(() => {
    api.get(`/auth/verify?token=${sp.get("token")}`).then(() => setStatus("ok")).catch(() => setStatus("error"));
  }, []);
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 carbon-bg" data-testid="verify-page">
      <div className="race-card p-8 text-center">
        <h1 className="font-racing font-black text-3xl uppercase mb-4">Verificação</h1>
        <p className="text-white/70">{status === "ok" ? "Email verificado!" : status === "error" ? "Token inválido" : "Verificando..."}</p>
        <Link to="/login" className="race-btn-blue text-xs inline-block mt-6">Login</Link>
      </div>
    </div>
  );
}

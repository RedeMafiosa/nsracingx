import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, pw);
      toast.success("Bem-vindo de volta");
      nav("/");
    } catch (err) { toast.error(err.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 carbon-bg" data-testid="login-page">
      <div className="race-card p-8 w-full max-w-md">
        <h1 className="font-racing font-black text-4xl uppercase mb-2"><span className="neon-red">L</span>ogin</h1>
        <p className="text-white/60 mb-6 font-body">Entre na pista NsRacing</p>
        <form onSubmit={submit} className="space-y-4">
          <input className="race-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" />
          <input className="race-input" placeholder="Senha" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required data-testid="login-password" />
          <button className="race-btn-red w-full text-sm" disabled={loading} data-testid="login-submit">{loading ? "Conectando..." : "Entrar"}</button>
        </form>
        <div className="mt-6 flex justify-between text-sm font-racing uppercase tracking-wider">
          <Link to="/forgot" className="text-neon-blue hover:underline" data-testid="forgot-link">Esqueceu?</Link>
          <Link to="/register" className="text-white/60 hover:text-white" data-testid="register-from-login">Criar conta</Link>
        </div>
      </div>
    </div>
  );
}

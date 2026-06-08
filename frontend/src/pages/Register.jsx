import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(nick, email, pw);
      toast.success("Conta criada! Verifique seu email.");
      nav("/");
    } catch (err) { toast.error(err.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 carbon-bg" data-testid="register-page">
      <div className="race-card p-8 w-full max-w-md">
        <h1 className="font-racing font-black text-4xl uppercase mb-2"><span className="neon-blue">R</span>egister</h1>
        <p className="text-white/60 mb-6 font-body">Crie sua conta e entre na pista</p>
        <form onSubmit={submit} className="space-y-4">
          <input className="race-input" placeholder="Nick (único)" value={nick} onChange={(e) => setNick(e.target.value)} required minLength={3} data-testid="reg-nick" />
          <input className="race-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="reg-email" />
          <input className="race-input" placeholder="Senha (mín. 6)" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} data-testid="reg-password" />
          <button className="race-btn-blue w-full text-sm" disabled={loading} data-testid="reg-submit">{loading ? "Criando..." : "Criar Conta"}</button>
        </form>
        <p className="mt-6 text-sm text-center font-racing uppercase tracking-wider">
          <Link to="/login" className="text-neon-red hover:underline">Já tem conta? Login</Link>
        </p>
      </div>
    </div>
  );
}

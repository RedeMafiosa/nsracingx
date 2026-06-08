import { Link } from "react-router-dom";
import { Zap, Flag, Trophy, Coins, MessageSquare, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const HERO_BG = "https://images.pexels.com/photos/28794445/pexels-photo-28794445.jpeg";

const FEATURES = [
  { icon: Flag, title: "Lives 24/7", desc: "Stream das melhores corridas em tempo real", color: "red" },
  { icon: Trophy, title: "Ranks Elite", desc: "Suba no ranking e prove sua velocidade", color: "blue" },
  { icon: Coins, title: "Tokens", desc: "Ganhe tokens grátis a cada 10h", color: "red" },
  { icon: MessageSquare, title: "Chat Global", desc: "Conecte-se com a comunidade racing", color: "blue" },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section
        className="relative min-h-[90vh] flex items-center overflow-hidden carbon-bg"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5,5,5,0.6), rgba(5,5,5,0.95)), url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 speed-grid opacity-40" />
        <div className="absolute inset-0 race-stripes" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="max-w-3xl">
            <p className="font-racing uppercase tracking-[0.4em] text-neon-blue text-xs mb-4 animate-pulse" data-testid="hero-tagline">
              ▸ Velocidade. Comunidade. Lendas.
            </p>
            <h1 className="font-racing font-black uppercase italic tracking-tighter text-6xl md:text-8xl lg:text-9xl leading-none mb-6" data-testid="hero-title">
              <span className="neon-red">Ns</span><span className="neon-blue">Racing</span>
            </h1>
            <p className="font-body text-xl md:text-2xl text-white/80 mb-8 max-w-2xl">
              A pista digital onde fãs de velocidade se encontram. Streams ao vivo, tokens, ranks e a comunidade racing mais acelerada da web.
            </p>
            <div className="flex flex-wrap gap-4">
              {!user && (
                <Link to="/register" className="race-btn-red text-sm" data-testid="hero-cta-register">Entrar na Pista</Link>
              )}
              <Link to="/lives" className="race-btn-blue text-sm" data-testid="hero-cta-lives">Ver Lives</Link>
            </div>
          </div>
        </div>

        {/* speed lines bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-red to-transparent" />
      </section>

      {/* Features */}
      <section className="py-20 carbon-bg relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <p className="font-racing uppercase tracking-widest text-neon-red text-xs mb-2">// Sistema</p>
            <h2 className="font-racing font-black text-4xl md:text-5xl uppercase tracking-tight" data-testid="features-title">
              Recursos da Pista
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="race-card p-6" data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <f.icon className={f.color === "red" ? "text-neon-red" : "text-neon-blue"} size={32} />
                <h3 className="font-racing font-bold uppercase mt-4 mb-2 tracking-wide">{f.title}</h3>
                <p className="text-white/60 font-body">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="py-16 carbon-bg border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Zap className="mx-auto text-neon-red animate-pulse" size={48} />
          <h2 className="font-racing font-black text-3xl md:text-5xl uppercase tracking-tight mt-4 mb-4">
            <span className="neon-blue">Acelere</span> com a comunidade
          </h2>
          <p className="text-white/70 font-body text-lg max-w-2xl mx-auto mb-8">
            Compre tokens, envie aos amigos, conquiste tags exclusivas e domine o ranking.
          </p>
          <Link to="/ofertas" className="race-btn-red inline-block text-sm" data-testid="home-cta-ofertas">Ver Pacotes</Link>
        </div>
      </section>
    </div>
  );
}

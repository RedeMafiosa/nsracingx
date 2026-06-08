import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="relative">{children}</main>
      <footer className="border-t border-white/10 py-6 mt-16 text-center text-white/40 font-racing text-xs uppercase tracking-widest">
        © {new Date().getFullYear()} NsRacing — Built for Speed
      </footer>
    </div>
  );
}

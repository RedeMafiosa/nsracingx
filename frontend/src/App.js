import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Lives from "@/pages/Lives";
import Tops from "@/pages/Tops";
import Ofertas from "@/pages/Ofertas";
import Ranks from "@/pages/Ranks";
import Chat from "@/pages/Chat";
import Perfil from "@/pages/Perfil";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { Forgot, Reset, Verify } from "@/pages/Auth";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lives" element={<Lives />} />
            <Route path="/tops" element={<Tops />} />
            <Route path="/ofertas" element={<Ofertas />} />
            <Route path="/ranks" element={<Ranks />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/reset" element={<Reset />} />
            <Route path="/verify" element={<Verify />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" theme="dark" toastOptions={{ style: { background: "#0a0a0a", border: "1px solid #00C2FF", color: "#fff", fontFamily: "Rajdhani" } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

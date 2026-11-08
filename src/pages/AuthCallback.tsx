import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;

        // Check if this callback is for password recovery
        if (hash.includes("type=recovery") || search.includes("type=recovery")) {
          navigate("/reset-password" + hash);
          return;
        }

        // Standard session exchange / confirmation
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[AuthCallback] Errore getSession:", error);
        }

        navigate("/");
      } catch (err) {
        console.error("[AuthCallback] Errore callback:", err);
        navigate("/");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-[#080b14] text-white flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-cyan-400 animate-pulse">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
            Verifica Credenziali SquadUP
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Autenticazione in corso, verrai reindirizzato tra pochi istanti...
          </p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 mt-2" />
      </div>
    </div>
  );
};

export default AuthCallback;

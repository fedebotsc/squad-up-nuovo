import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Gamepad2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    // Check if we have an active session or recovery token from the URL
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // Check if hash has access_token or type=recovery
          const hash = window.location.hash;
          if (hash && (hash.includes("access_token") || hash.includes("type=recovery"))) {
            setHasValidSession(true);
          }
        }
      } catch (err) {
        console.warn("[ResetPassword] Verifica sessione:", err);
      } finally {
        setIsVerifying(false);
      }
    };

    checkSession();

    // Listen for auth state change recovery event
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasValidSession(true);
        setIsVerifying(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!password || password.length < 6) {
      setErrorMsg("La password deve contenere almeno 6 caratteri.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Le due password non corrispondono.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg("Password aggiornata con successo! Accesso in corso...");
      toast({
        title: "Password Aggiornata! 🛡️",
        description: "La tua password è stata modificata con successo. Reindirizzamento al quartier generale...",
      });

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      console.error("[ResetPassword] Errore salvataggio:", err);
      setErrorMsg(
        err.message || "Impossibile aggiornare la password. Il link potrebbe essere scaduto o non valido."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080b14] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Military Grid & Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Tactical Card */}
      <div className="relative w-full max-w-md bg-[#0f1322] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-xl">
        {/* Top Reticle Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">
                Squad<span className="text-cyan-400">UP</span>
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest block uppercase">
                SECURITY TERMINAL // V2.4
              </span>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
            <KeyRound className="w-3 h-3" />
            Recupero
          </div>
        </div>

        {/* Content Header */}
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            Reimposta la tua Password
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Inserisci la tua nuova password di accesso. Assicurati che contenga almeno 6 caratteri.
          </p>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="leading-snug">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="block mt-1.5 text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                Torna alla home per richiedere un nuovo link
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Nuova Password <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Almeno 6 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#14192d] border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                title={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Eye className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Conferma Nuova Password <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Ripeti la nuova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#14192d] border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                title={showConfirmPassword ? "Nascondi password" : "Mostra password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Eye className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                )}
              </button>
            </div>
          </div>

          {/* Password strength guide */}
          <div className="p-3 bg-[#13172c] border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400 space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  password.length >= 6 ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <span className={password.length >= 6 ? "text-emerald-300 font-medium" : ""}>
                Minimo 6 caratteri
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  password && password === confirmPassword
                    ? "bg-emerald-400"
                    : "bg-zinc-600"
                }`}
              />
              <span
                className={
                  password && password === confirmPassword
                    ? "text-emerald-300 font-medium"
                    : ""
                }
              >
                Le due password combaciano
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || (password.length > 0 && password.length < 6)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aggiornamento in corso...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Salva Nuova Password</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Return to Home */}
        <div className="text-center mt-6 pt-4 border-t border-zinc-800/60">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Torna alla Home di SquadUP
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

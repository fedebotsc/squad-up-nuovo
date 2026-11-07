import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  Gamepad2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "signup",
  onSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [activisionId, setActivisionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync default tab if modal is re-opened with a specific tab
  React.useEffect(() => {
    setTab(defaultTab);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setActivisionId("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanUsername = username.trim();
    const cleanActivisionId = activisionId.trim();

    // Validation
    if (!cleanEmail) {
      setErrorMsg("L'indirizzo email è obbligatorio.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (!cleanUsername) {
      setErrorMsg("Il nome utente / username è obbligatorio.");
      return;
    }
    if (cleanUsername.length < 3) {
      setErrorMsg("Lo username deve avere almeno 3 caratteri.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Supabase Auth Sign Up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          emailRedirectTo: new URL("/auth/callback", window.location.origin).href,
          data: {
            username: cleanUsername,
            display_name: cleanUsername,
            activision_id: cleanActivisionId || null,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const user = signUpData.user;
      if (!user) {
        throw new Error("Impossibile creare l'account utente.");
      }

      // 2. Parse Activision ID if present (e.g., Tag#1234567)
      let actName = cleanActivisionId;
      let actTag = "";
      if (cleanActivisionId.includes("#")) {
        const parts = cleanActivisionId.split("#");
        actName = parts[0];
        actTag = parts.slice(1).join("#");
      }

      // 3. Insert or update the public.profiles record
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: cleanUsername,
          display_name: cleanUsername,
          activision_id: cleanActivisionId || null,
          activision_name: actName || "",
          activision_tag: actTag || "",
          coins: 0,
          schoins: 0,
          balance: 0,
          bio: "",
          subscription_tier: "free",
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.warn("[AuthModal] Profilo salvato con avviso:", profileError);
      }

      if (signUpData.session) {
        toast({
          title: "Benvenuto in SquadUP! 🎮",
          description: `Account creato con successo come @${cleanUsername}.`,
        });
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        setSuccessMsg(
          "Registrazione completata! Se la conferma email è attiva, controlla la tua casella di posta per verificare l'account."
        );
        toast({
          title: "Account Creato!",
          description: "Controlla la tua email per confermare l'iscrizione.",
        });
      }
    } catch (err: any) {
      console.error("[AuthModal] Errore registrazione:", err);
      setErrorMsg(
        err.message || "Errore durante la registrazione. Riprova con un altro username o email."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Inserisci email e password.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast({
          title: "Accesso Eseguito",
          description: "Bentornato su SquadUP!",
        });
        resetForm();
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      console.error("[AuthModal] Errore login:", err);
      setErrorMsg(err.message || "Credenziali non valide o errore di connessione.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-purple-500/40 p-5 shadow-[0_0_35px_rgba(139,92,246,0.3)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-purple-600/30 to-cyan-500/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 transition-colors"
          aria-label="Chiudi"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pt-1 pb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            SquadUP Gaming
          </div>
          <h3 className="text-lg font-extrabold text-white">
            {tab === "signup" ? "Crea il tuo Profilo" : "Accedi all'Account"}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {tab === "signup"
              ? "Unisciti ai tornei e scala la classifica con la tua Squad"
              : "Inserisci le tue credenziali per continuare"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#151a30] rounded-2xl border border-zinc-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "signup"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Registrati
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "login"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Accedi
          </button>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug break-words">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-snug break-words">{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {tab === "signup" ? (
          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Username (Mandatory) */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Nome Utente / Username <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="es. GhostRider"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email (Mandatory) */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Email <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password (Mandatory) */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Password <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="Almeno 6 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Activision ID (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-300">
                  Activision ID
                </label>
                <span className="text-[10px] text-zinc-500 font-medium">Facoltativo</span>
              </div>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="es. Ghost#1234567"
                  value={activisionId}
                  onChange={(e) => setActivisionId(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                Utile per convalidare i punteggi COD nei tornei SquadUP.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creazione account...</span>
                </>
              ) : (
                <>
                  <span>Completa Registrazione</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="Inserisci la password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Submit Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Accesso in corso...</span>
                </>
              ) : (
                <>
                  <span>Accedi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

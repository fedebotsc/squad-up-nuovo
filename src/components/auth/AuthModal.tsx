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
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Check,
  Database,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export type AuthTabType = "login" | "signup" | "forgot_password" | "reset_password";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AuthTabType;
  onSuccess?: () => void;
}

const SUPABASE_SQL_TRIGGER_FIX = `-- ========================================================
-- SquadUP: Ripristino Trigger Registrazione Utenti (Supabase)
-- Risolve l'errore: "Database error saving new user"
-- ========================================================

-- 1. Concedi i permessi necessari
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- 2. Ricrea la funzione handle_new_user con SECURITY DEFINER
-- Questo garantisce che il trigger venga eseguito con i privilegi di postgres
-- anziché del ruolo anonimo 'anon', evitando l'errore di permessi.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_display_name text;
BEGIN
  -- Estrazione username da user_metadata, con fallback univoco
  v_username := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'user_name'), ''),
    'operator_' || substr(new.id::text, 1, 8)
  );

  v_display_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
    v_username
  );

  -- Inserimento con gestione conflitti
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    activision_id,
    activision_name,
    activision_tag,
    coins,
    schoins,
    balance,
    bio,
    subscription_tier
  )
  VALUES (
    new.id,
    v_username,
    v_display_name,
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    new.raw_user_meta_data->>'activision_id',
    COALESCE(new.raw_user_meta_data->>'activision_name', ''),
    COALESCE(new.raw_user_meta_data->>'activision_tag', ''),
    0,
    0,
    0,
    '',
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback per non interrompere la creazione in auth.users
    RAISE WARNING 'handle_new_user warning: %', SQLERRM;
    RETURN new;
END;
$$;

-- 3. Associa il trigger all'evento INSERT su auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "signup",
  onSuccess,
}) => {
  const [tab, setTab] = useState<AuthTabType>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [activisionId, setActivisionId] = useState("");

  // Visibility states for passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDbError, setIsDbError] = useState(false);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync default tab if modal is re-opened with a specific tab
  React.useEffect(() => {
    setTab(defaultTab);
    setErrorMsg(null);
    setIsDbError(false);
    setSuccessMsg(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setActivisionId("");
    setErrorMsg(null);
    setIsDbError(false);
    setSuccessMsg(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const copySqlFix = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_TRIGGER_FIX);
    setHasCopiedSql(true);
    toast({
      title: "Script SQL Copiato! 📋",
      description: "Incollalo nell'Editor SQL della Dashboard di Supabase e clicca su RUN.",
    });
    setTimeout(() => setHasCopiedSql(false), 3000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsDbError(false);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const cleanActivisionId = activisionId.trim();

    // Validation
    if (!cleanEmail) {
      setErrorMsg("L'indirizzo email è obbligatorio.");
      return;
    }
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Inserisci un indirizzo email valido.");
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
    if (!password || password.length < 6) {
      setErrorMsg("La password deve contenere almeno 6 caratteri.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Controllo preventivo: verifica se lo username è già registrato nella tabella profiles
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setErrorMsg(`Lo username "@${cleanUsername}" è già occupato. Scegline uno diverso.`);
        setIsLoading(false);
        return;
      }

      // 2. Controllo preventivo: se inserito Activision ID, controlla se già associato
      if (cleanActivisionId) {
        const { data: existingAct } = await supabase
          .from("profiles")
          .select("id")
          .ilike("activision_id", cleanActivisionId)
          .maybeSingle();

        if (existingAct) {
          setErrorMsg(`L'Activision ID "${cleanActivisionId}" è già associato a un altro profilo.`);
          setIsLoading(false);
          return;
        }
      }

      // 3. Esegui la registrazione con tutti i metadati utente standard
      const callbackUrl = new URL("/auth/callback", window.location.origin).href;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            username: cleanUsername,
            user_name: cleanUsername,
            display_name: cleanUsername,
            full_name: cleanUsername,
            name: cleanUsername,
            activision_id: cleanActivisionId || null,
            avatar_url: "",
          },
        },
      });

      if (signUpError) {
        const errMessage = signUpError.message || String(signUpError);
        console.error("[AuthModal] Errore risposta signUp:", signUpError);

        if (
          errMessage.toLowerCase().includes("database error saving new user") ||
          (signUpError as any)?.status === 500
        ) {
          setIsDbError(true);
          setErrorMsg(
            "Errore Database Supabase: Il trigger PostgreSQL 'handle_new_user' su auth.users ha bloccato il salvataggio del nuovo utente a causa di permessi mancanti (richiede SECURITY DEFINER)."
          );
        } else if (errMessage.toLowerCase().includes("user already registered")) {
          setErrorMsg("Un account con questo indirizzo email esiste già. Prova ad accedere dalla scheda 'Accedi'.");
        } else {
          setErrorMsg(errMessage);
        }
        setIsLoading(false);
        return;
      }

      const user = signUpData.user;
      if (!user) {
        throw new Error("Impossibile completare la registrazione dell'account.");
      }

      // 4. Se la sessione è attiva, effettua l'upsert del profilo
      let actName = cleanActivisionId;
      let actTag = "";
      if (cleanActivisionId.includes("#")) {
        const parts = cleanActivisionId.split("#");
        actName = parts[0];
        actTag = parts.slice(1).join("#");
      }

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
        console.warn("[AuthModal] Avviso upsert profilo post-signup:", profileError);
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
      console.error("[AuthModal] Errore imprevisto registrazione:", err);
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes("database error saving new user")) {
        setIsDbError(true);
        setErrorMsg(
          "Errore Database Supabase: Il trigger PostgreSQL 'handle_new_user' su auth.users ha bloccato il salvataggio del nuovo utente. È richiesta l'autorizzazione SECURITY DEFINER nello script del trigger."
        );
      } else {
        setErrorMsg(msg || "Errore durante la registrazione. Riprova più tardi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsDbError(false);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsDbError(false);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg("Inserisci l'indirizzo email del tuo account.");
      return;
    }

    setIsLoading(true);

    try {
      const resetUrl = new URL("/reset-password", window.location.origin).href;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: resetUrl,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg(
        `Abbiamo inviato un link di recupero a ${cleanEmail}. Clicca sul link nell'email per impostare una nuova password.`
      );
      toast({
        title: "Email di recupero inviata!",
        description: "Controlla la tua casella di posta per ripristinare la password.",
      });
    } catch (err: any) {
      console.error("[AuthModal] Errore invio recupero password:", err);
      setErrorMsg(
        err.message || "Impossibile inviare l'email di recupero. Verifica l'indirizzo e riprova."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsDbError(false);
    setSuccessMsg(null);

    if (!password || password.length < 6) {
      setErrorMsg("La nuova password deve contenere almeno 6 caratteri.");
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

      toast({
        title: "Password Aggiornata!",
        description: "La tua password è stata modificata con successo.",
      });
      setSuccessMsg("Password aggiornata! Ora puoi accedere con le nuove credenziali.");
      setTimeout(() => {
        setTab("login");
        setPassword("");
        setConfirmPassword("");
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error("[AuthModal] Errore aggiornamento password:", err);
      setErrorMsg(
        err.message || "Errore durante il salvataggio della nuova password. Riprova."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-purple-500/40 p-5 shadow-[0_0_35px_rgba(139,92,246,0.3)] my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-purple-600/30 to-cyan-500/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 transition-colors cursor-pointer z-10"
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
            {tab === "signup" && "Crea il tuo Profilo"}
            {tab === "login" && "Accedi all'Account"}
            {tab === "forgot_password" && "Recupera Password"}
            {tab === "reset_password" && "Nuova Password"}
          </h3>

          <p className="text-xs text-zinc-400 mt-0.5">
            {tab === "signup" && "Unisciti ai tornei e scala la classifica con la tua Squad"}
            {tab === "login" && "Inserisci le tue credenziali per continuare"}
            {tab === "forgot_password" && "Inserisci la tua email per ricevere le istruzioni di ripristino"}
            {tab === "reset_password" && "Imposta una nuova password sicura per il tuo account"}
          </p>
        </div>

        {/* Tab Switcher for login/signup */}
        {(tab === "signup" || tab === "login") && (
          <div className="grid grid-cols-2 p-1 bg-[#151a30] rounded-2xl border border-zinc-800 mb-4">
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setErrorMsg(null);
                setIsDbError(false);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
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
                setIsDbError(false);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tab === "login"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Accedi
            </button>
          </div>
        )}

        {/* Back navigation button when in forgot_password or reset_password */}
        {(tab === "forgot_password" || tab === "reset_password") && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMsg(null);
                setIsDbError(false);
                setSuccessMsg(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Torna al Login</span>
            </button>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug break-words">{errorMsg}</span>
          </div>
        )}

        {/* Dedicated Supabase Database Error Resolution Box */}
        {isDbError && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-purple-900/30 border border-amber-500/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Database className="w-4 h-4 shrink-0" />
              <span>Come risolvere il blocco in 1 minuto</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300">
              Nel database Supabase, la funzione trigger <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono">handle_new_user()</code> necessita di <strong className="text-white">SECURITY DEFINER</strong> per poter inserire il profilo utente durante la registrazione.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={copySqlFix}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {hasCopiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Query SQL Copiata negli Appunti!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-300" />
                    <span>Copia Query SQL di Ripristino</span>
                  </>
                )}
              </button>

              <a
                href="https://supabase.com/dashboard/project/ojostglcbfbpsisfdibk/sql/new"
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-medium text-[10px] flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <span>Apri SQL Editor su Supabase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[10px] text-zinc-400 pt-0.5 leading-tight">
              Incolla ed esegui (<span className="text-amber-300 font-semibold">Run</span>) nello SQL Editor per riattivare subito le registrazioni.
            </p>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-snug break-words">{successMsg}</span>
          </div>
        )}

        {/* 1. SIGNUP FORM */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Username */}
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
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (isDbError) setIsDbError(false);
                  }}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isDbError) setIsDbError(false);
                  }}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password with Eye Toggle */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Password <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Almeno 6 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                  <span>Creazione account in corso...</span>
                </>
              ) : (
                <>
                  <span>Completa Registrazione</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. LOGIN FORM */}
        {tab === "login" && (
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

            {/* Password with Eye Toggle & Forgot Link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTab("forgot_password");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium cursor-pointer"
                >
                  Password dimenticata?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Inserisci la tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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

        {/* 3. FORGOT PASSWORD FORM */}
        {tab === "forgot_password" && (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                La tua Email di Registrazione
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Invio link in corso...</span>
                </>
              ) : (
                <>
                  <span>Invia Link di Recupero</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 4. RESET PASSWORD FORM */}
        {tab === "reset_password" && (
          <form onSubmit={handleResetPassword} className="space-y-3">
            {/* New Password with Eye */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Nuova Password <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Almeno 6 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password with Eye */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Conferma Nuova Password <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Ripeti la nuova password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                  aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <span>Aggiorna Password</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

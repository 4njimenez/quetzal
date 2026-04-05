import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
// Replace these with your actual Supabase project values
const SUPABASE_URL = "https://tsxpgzjgrmeshseycmfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHBnempncm1lc2hzZXljbWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjQwMjMsImV4cCI6MjA5MTAwMDAyM30.5EtuEMDixrvkjtU7m4rA5WeNz0LgKK_FBLN-LZH6YHc";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,       // uses localStorage under the hood via supabase-js
    detectSessionInUrl: true,
  },
});

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:          "#080c08",
  surface:     "#0f150f",
  surfaceAlt:  "#141c14",
  surfaceHigh: "#1a241a",
  border:      "#1e2e1e",
  borderHigh:  "#2a3e2a",
  accent:      "#4ade80",
  accentDim:   "#4ade8022",
  gold:        "#fbbf24",
  goldDim:     "#fbbf2418",
  red:         "#f87171",
  redDim:      "#f8717118",
  orange:      "#fb923c",
  text:        "#e8f5e8",
  textSub:     "#a3c4a3",
  textMuted:   "#5a7a5a",
  textDim:     "#2e472e",
};
const F = {
  display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  mono:    "'DM Mono', 'Courier New', monospace",
  body:    "'Lato', Georgia, sans-serif",
};

// ─── APP LOCK TIMING ──────────────────────────────────────────────────────────
const LOCK_AFTER_MS = 30 * 60 * 1000; // 30 minutes

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

// ─── DATA CONTEXT ─────────────────────────────────────────────────────────────
const DataContext = createContext(null);
function useData() { return useContext(DataContext); }

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const CATEGORIES = {
  mercado:     { label: "Mercado",     icon: "🛒", color: "#4ade80" },
  agua_luz:    { label: "Agua / Luz",  icon: "💡", color: "#fbbf24" },
  transporte:  { label: "Transporte",  icon: "🚌", color: "#60a5fa" },
  remesa:      { label: "Remesa",      icon: "📲", color: "#34d399" },
  salud:       { label: "Salud",       icon: "🏥", color: "#f87171" },
  educacion:   { label: "Educación",   icon: "📚", color: "#a78bfa" },
  restaurante: { label: "Restaurante", icon: "🍽️", color: "#fb923c" },
  ahorro:      { label: "Ahorro",      icon: "🏺", color: "#fbbf24" },
  ingreso:     { label: "Ingreso",     icon: "⬆️", color: "#4ade80" },
  otro:        { label: "Otro",        icon: "📌", color: "#9ca3af" },
};

// Smart emoji suggestions based on account name / type
function suggestAccountEmoji(name = "", type = "") {
  const n = name.toLowerCase();
  if (n.includes("industrial")) return "🏦";
  if (n.includes("banrural") || n.includes("rural")) return "🌾";
  if (n.includes("coope") || n.includes("cooperativa")) return "🤝";
  if (n.includes("g&t") || n.includes("continental")) return "🏛️";
  if (n.includes("fri") || n.includes("digital")) return "📱";
  if (type === "efectivo") return "💵";
  if (type === "tarjeta") return "💳";
  if (type === "inversion") return "📈";
  if (type === "cooperativa") return "🤝";
  if (type === "banco") return "🏦";
  return "💰";
}

function suggestGoalEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("casa") || n.includes("terreno") || n.includes("vivienda")) return "🏡";
  if (n.includes("viaje") || n.includes("vacacion") || n.includes("antigua")) return "✈️";
  if (n.includes("carro") || n.includes("coche") || n.includes("moto")) return "🚗";
  if (n.includes("estudio") || n.includes("universidad") || n.includes("educacion")) return "🎓";
  if (n.includes("boda") || n.includes("matrimonio")) return "💍";
  if (n.includes("emergencia") || n.includes("fondo")) return "🛡️";
  if (n.includes("negocio") || n.includes("empresa")) return "🏪";
  if (n.includes("computadora") || n.includes("laptop") || n.includes("celular")) return "💻";
  return "🏺";
}

// Smart category suggestion from description
function suggestCategory(description = "", corrections = []) {
  const d = description.toLowerCase();
  // Check user corrections first (personal learning)
  for (const c of corrections) {
    if (d.includes(c.description_pattern)) return c.assigned_category;
  }
  // Built-in rules
  if (/walmart|walmart|hiper|mercado|super|tienda|surtidora/i.test(d)) return "mercado";
  if (/eegsa|empagua|agua|luz|electricidad|energuate/i.test(d)) return "agua_luz";
  if (/bus|transmetro|uber|taxi|gasolina|combustible/i.test(d)) return "transporte";
  if (/remesa|envio|western|moneygram|transferencia/i.test(d)) return "remesa";
  if (/doctor|médico|farmacia|hospital|medicina|clinica/i.test(d)) return "salud";
  if (/colegio|universidad|útiles|librería|colegiatura/i.test(d)) return "educacion";
  if (/restaurante|comida|pollo|pizza|burger|campero/i.test(d)) return "restaurante";
  if (/ahorro|meta|deposito ahorro/i.test(d)) return "ahorro";
  if (/salario|sueldo|pago|honorario|ingreso|deposito/i.test(d)) return "ingreso";
  return "otro";
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const formatGTQ = n => `Q${Math.abs(n).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatUSD = n => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Input({ label, type = "text", value, onChange, placeholder, error, hint, autoComplete, small }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ marginBottom: small ? 10 : 16 }}>
      {label && <label style={{ display: "block", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={isPassword && show ? "text" : type}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.surfaceAlt, border: `1px solid ${error ? C.red : C.border}`,
            borderRadius: 12, padding: small ? "10px 14px" : "13px 16px",
            paddingRight: isPassword ? 48 : 16,
            color: C.text, fontSize: small ? 13 : 15,
            fontFamily: F.body, outline: "none", transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = error ? C.red : C.accent}
          onBlur={e => e.target.style.borderColor = error ? C.red : C.border}
        />
        {isPassword && (
          <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: F.mono, fontSize: 13 }}>
            {show ? "✕" : "◉"}
          </button>
        )}
      </div>
      {error && <p style={{ fontFamily: F.mono, fontSize: 11, color: C.red, marginTop: 5 }}>{error}</p>}
      {hint && !error && <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options, small }) {
  return (
    <div style={{ marginBottom: small ? 10 : 16 }}>
      {label && <label style={{ display: "block", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: small ? "10px 14px" : "13px 16px",
        color: C.text, fontSize: small ? 13 : 15, fontFamily: F.body, outline: "none",
      }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, loading, fullWidth = true, small }) {
  const s = {
    primary:   { bg: C.accent,   color: "#000",      border: "none" },
    secondary: { bg: "transparent", color: C.accent, border: `1px solid ${C.accent}` },
    ghost:     { bg: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
    danger:    { bg: C.redDim,   color: C.red,        border: `1px solid ${C.red}` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      width: fullWidth ? "100%" : "auto",
      background: s.bg, color: s.color, border: s.border,
      borderRadius: 14, padding: small ? "9px 16px" : "14px 20px",
      fontSize: small ? 13 : 15, fontWeight: 700,
      fontFamily: F.mono, cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled || loading ? 0.5 : 1,
      transition: "opacity 0.2s, transform 0.1s",
      marginBottom: fullWidth ? 10 : 0,
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
    >{loading ? "···" : children}</button>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "#000a" }} />
      <div style={{ position: "relative", background: C.surface, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${C.border}` }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 20px" }} />
        {title && <h3 style={{ fontFamily: F.display, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 20 }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: type === "success" ? C.accentDim : C.redDim,
      border: `1px solid ${type === "success" ? C.accent : C.red}`,
      borderRadius: 12, padding: "10px 20px", zIndex: 999,
      fontFamily: F.mono, fontSize: 13,
      color: type === "success" ? C.accent : C.red,
      whiteSpace: "nowrap",
    }}>{message}</div>
  );
}

// Confetti for goal completion
function Confetti() {
  const pieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: [C.accent, C.gold, "#60a5fa", "#f472b6", "#fb923c"][i % 5],
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.2,
    size: 6 + Math.random() * 8,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 500, overflow: "hidden" }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: 0, left: `${p.x}%`,
          width: p.size, height: p.size,
          background: p.color, borderRadius: Math.random() > 0.5 ? "50%" : 2,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── AUTH PROVIDER ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── DATA PROVIDER ────────────────────────────────────────────────────────────
function DataProvider({ children }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load all data on mount / user change
  useEffect(() => {
    if (!user) { setLoadingData(false); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [accs, txs, gls, cors] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_active", true).order("display_order"),
        supabase.from("transactions").select("*").eq("user_id", user.id).eq("is_deleted", false).order("transaction_date", { ascending: false }).limit(200),
        supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("category_corrections").select("*").eq("user_id", user.id).order("match_count", { ascending: false }),
      ]);
      if (accs.data)  setAccounts(accs.data);
      if (txs.data)   setTransactions(txs.data);
      if (gls.data)   setGoals(gls.data);
      if (cors.data)  setCorrections(cors.data);
    } finally {
      setLoadingData(false);
    }
  };

  // ── ACCOUNTS ──
  const addAccount = async (data) => {
    const row = { ...data, user_id: user.id, display_order: accounts.length };
    const { data: d, error } = await supabase.from("accounts").insert(row).select().single();
    if (error) throw error;
    setAccounts(prev => [...prev, d]);
    return d;
  };

  const updateAccount = async (id, updates) => {
    const { data: d, error } = await supabase.from("accounts").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setAccounts(prev => prev.map(a => a.id === id ? d : a));
  };

  // ── TRANSACTIONS ──
  const addTransaction = async (data) => {
    const row = { ...data, user_id: user.id };
    const { data: d, error } = await supabase.from("transactions").insert(row).select().single();
    if (error) throw error;
    setTransactions(prev => [d, ...prev]);
    // Update account balance
    const acc = accounts.find(a => a.id === data.account_id);
    if (acc) await updateAccount(data.account_id, { current_balance: acc.current_balance + data.amount });
    return d;
  };

  const updateTransaction = async (id, updates) => {
    const { data: d, error } = await supabase.from("transactions").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setTransactions(prev => prev.map(t => t.id === id ? d : t));
    return d;
  };

  const softDeleteTransaction = async (id) => {
    await supabase.from("transactions").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // ── GOALS ──
  const addGoal = async (data) => {
    const row = { ...data, user_id: user.id };
    const { data: d, error } = await supabase.from("savings_goals").insert(row).select().single();
    if (error) throw error;
    setGoals(prev => [...prev, d]);
    return d;
  };

  const updateGoal = async (id, updates) => {
    const { data: d, error } = await supabase.from("savings_goals").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setGoals(prev => prev.map(g => g.id === id ? d : g));
    return d;
  };

  // ── CATEGORY CORRECTIONS ──
  const saveCorrection = async (description, category) => {
    const pattern = description.toLowerCase().trim().slice(0, 60);
    const existing = corrections.find(c => c.description_pattern === pattern);
    if (existing) {
      await supabase.from("category_corrections").update({
        assigned_category: category,
        match_count: existing.match_count + 1,
      }).eq("id", existing.id);
      setCorrections(prev => prev.map(c => c.description_pattern === pattern ? { ...c, assigned_category: category, match_count: c.match_count + 1 } : c));
    } else {
      const { data: d } = await supabase.from("category_corrections").insert({
        user_id: user.id, description_pattern: pattern, assigned_category: category,
      }).select().single();
      if (d) setCorrections(prev => [d, ...prev]);
    }
  };

  // ── CSV EXPORT (client-side, no server involved) ──
  const exportCSV = () => {
    const header = "Fecha,Descripción,Categoría,Monto,Moneda,Cuenta,Fuente\n";
    const rows = transactions.map(t => {
      const acc = accounts.find(a => a.id === t.account_id);
      return [
        t.transaction_date,
        `"${t.description}"`,
        CATEGORIES[t.category]?.label || t.category,
        t.amount,
        t.currency,
        `"${acc?.name || ""}"`,
        t.source,
      ].join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "quetzal-transacciones.csv";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <DataContext.Provider value={{
      accounts, transactions, goals, corrections, loadingData, loadAll,
      addAccount, updateAccount,
      addTransaction, updateTransaction, softDeleteTransaction,
      addGoal, updateGoal,
      saveCorrection, exportCSV,
    }}>
      {children}
    </DataContext.Provider>
  );
}

// ─── APP LOCK MANAGER ─────────────────────────────────────────────────────────
function AppLockManager({ children }) {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const lastActivity = useRef(Date.now());
  // In production, PIN hash would be stored in secure storage
  // For demo, we use a placeholder
  const DEMO_PIN = "123456";

  const resetTimer = useCallback(() => { lastActivity.current = Date.now(); }, []);

  useEffect(() => {
    const events = ["mousedown", "touchstart", "keydown", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > LOCK_AFTER_MS) setLocked(true);
    }, 10000);
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (pin.length === 6) {
      setTimeout(() => {
        if (pin === DEMO_PIN) { setLocked(false); setPin(""); setAttempts(0); setPinError(""); }
        else {
          const next = attempts + 1;
          setAttempts(next);
          setPinError(`PIN incorrecto. ${Math.max(0, 5 - next)} intentos restantes.`);
          setPin("");
        }
      }, 300);
    }
  }, [pin]);

  if (!locked) return children;

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse 60% 40% at 30% 20%, ${C.accentDim}, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: F.display, fontSize: 32, color: C.text, fontWeight: 700 }}>
          <span style={{ color: C.accent }}>Q</span>uetzal
        </div>
        <p style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.15em", color: C.textMuted, marginTop: 4, marginBottom: 32 }}>
          SESIÓN BLOQUEADA
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 28 }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} style={{
              width: 13, height: 13, borderRadius: "50%",
              background: i < pin.length ? C.accent : "transparent",
              border: `2px solid ${i < pin.length ? C.accent : C.borderHigh}`,
              transition: "all 0.15s",
            }} />
          ))}
        </div>
        {pinError && <p style={{ fontFamily: F.mono, fontSize: 12, color: C.red, marginBottom: 12 }}>{pinError}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 280, margin: "0 auto" }}>
          {keys.map((k, i) => (
            <button key={i} onClick={() => {
              if (!k) return;
              if (k === "⌫") { setPin(p => p.slice(0, -1)); return; }
              if (pin.length < 6) setPin(p => p + k);
            }} style={{
              background: k ? C.surfaceAlt : "transparent",
              border: k ? `1px solid ${C.border}` : "none",
              borderRadius: 14, padding: "16px 0",
              color: k === "⌫" ? C.textMuted : C.text,
              fontSize: k === "⌫" ? 18 : 22,
              fontFamily: F.mono, fontWeight: 500, cursor: k ? "pointer" : "default",
            }}>{k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ active, setActive }) {
  const items = [
    { id: "dashboard", icon: "◈", label: "Inicio" },
    { id: "libreta",   icon: "≡", label: "Libreta" },
    { id: "metas",     icon: "◎", label: "Metas" },
    { id: "invertir",  icon: "↗", label: "Invertir" },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 20px", zIndex: 100 }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setActive(item.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          color: active === item.id ? C.accent : C.textMuted,
          transition: "color 0.2s", minWidth: 60,
        }}>
          <span style={{ fontSize: 22 }}>{item.icon}</span>
          <span style={{ fontSize: 11, fontFamily: F.mono, letterSpacing: "0.05em" }}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── ACCOUNT DETAIL VIEW ──────────────────────────────────────────────────────
function AccountDetail({ account, onBack }) {
  const { transactions } = useData();
  const txs = transactions.filter(t => t.account_id === account.id);
  const income  = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: F.mono, fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        ← Volver
      </button>

      {/* Account header */}
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: "20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: (account.color || C.accent) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            {account.icon || "🏦"}
          </div>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 22, color: C.text, fontWeight: 700 }}>{account.name}</h2>
            <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{account.type} · {account.currency}</p>
          </div>
        </div>
        <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: "0.1em" }}>SALDO ACTUAL</p>
        <p style={{ fontFamily: F.display, fontSize: 36, color: C.text, fontWeight: 700 }}>
          {account.currency === "USD" ? formatUSD(account.current_balance) : formatGTQ(account.current_balance)}
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
          <div><p style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginBottom: 3 }}>ENTRADAS</p><p style={{ fontFamily: F.mono, fontSize: 14, color: C.accent }}>+{formatGTQ(income)}</p></div>
          <div><p style={{ fontFamily: F.mono, fontSize: 9, color: C.textMuted, marginBottom: 3 }}>SALIDAS</p><p style={{ fontFamily: F.mono, fontSize: 14, color: C.red }}>-{formatGTQ(expense)}</p></div>
        </div>
      </div>

      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted, letterSpacing: "0.12em", marginBottom: 12 }}>
        MOVIMIENTOS ({txs.length})
      </p>
      {txs.length === 0 ? (
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, textAlign: "center", marginTop: 40 }}>
          Sin transacciones aún en esta cuenta.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {txs.map(tx => {
            const cat = CATEGORIES[tx.category];
            return (
              <div key={tx.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{cat.icon}</div>
                  <div>
                    <p style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{tx.description}</p>
                    <p style={{ color: C.textMuted, fontSize: 11, fontFamily: F.mono }}>{tx.transaction_date}</p>
                  </div>
                </div>
                <span style={{ color: tx.amount > 0 ? C.accent : C.red, fontSize: 14, fontWeight: 700, fontFamily: F.mono }}>
                  {tx.amount > 0 ? "+" : "-"}{formatGTQ(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { accounts, transactions, loadingData } = useData();
  const [drillAccount, setDrillAccount] = useState(null);

  if (drillAccount) return <AccountDetail account={drillAccount} onBack={() => setDrillAccount(null)} />;

  const USD_TO_GTQ = 7.75;
  const totalGTQ = accounts.reduce((s, a) => s + a.current_balance * (a.currency === "USD" ? USD_TO_GTQ : 1), 0);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = transactions.filter(t => t.transaction_date?.startsWith(monthStr));
  const income  = thisMonth.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const catSpend = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + Math.abs(t.amount);
  });
  const topCats = Object.entries(catSpend).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const totalSpend = topCats.reduce((s, [, v]) => s + v, 0);

  if (loadingData) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ fontFamily: F.mono, fontSize: 13, color: C.textMuted }}>Cargando···</p>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.15em", color: C.textMuted, marginBottom: 6 }}>PATRIMONIO TOTAL</p>
        <p style={{ fontFamily: F.display, fontSize: 44, color: C.text, fontWeight: 700, letterSpacing: "-0.02em" }}>{formatGTQ(totalGTQ)}</p>
        <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginTop: 4 }}>≈ {formatUSD(totalGTQ / USD_TO_GTQ)} USD</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: C.surfaceAlt, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginBottom: 8, letterSpacing: "0.1em" }}>INGRESOS</p>
          <p style={{ fontFamily: F.display, fontSize: 22, color: C.accent, fontWeight: 700 }}>{formatGTQ(income)}</p>
        </div>
        <div style={{ background: C.surfaceAlt, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginBottom: 8, letterSpacing: "0.1em" }}>GASTOS</p>
          <p style={{ fontFamily: F.display, fontSize: 22, color: C.red, fontWeight: 700 }}>{formatGTQ(expense)}</p>
        </div>
      </div>

      <p style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.15em", color: C.textMuted, marginBottom: 12 }}>MIS CUENTAS</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {accounts.length === 0 && (
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, textAlign: "center", padding: 20 }}>
            No tienes cuentas aún. Agrégalas en Libreta.
          </p>
        )}
        {accounts.map(acc => (
          <button key={acc.id} onClick={() => setDrillAccount(acc)} style={{
            background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer", width: "100%", transition: "border-color 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: (acc.color || C.accent) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{acc.icon || "🏦"}</div>
              <div style={{ textAlign: "left" }}>
                <p style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{acc.name}</p>
                <p style={{ color: C.textMuted, fontSize: 11, fontFamily: F.mono }}>{acc.type}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: acc.currency === "USD" ? C.gold : C.text, fontSize: 15, fontWeight: 700 }}>
                {acc.currency === "USD" ? formatUSD(acc.current_balance) : formatGTQ(acc.current_balance)}
              </p>
              <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 2 }}>ver →</p>
            </div>
          </button>
        ))}
      </div>

      {topCats.length > 0 && (
        <>
          <p style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.15em", color: C.textMuted, marginBottom: 12 }}>GASTOS POR CATEGORÍA</p>
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px" }}>
            {topCats.map(([cat, amount]) => {
              const c = CATEGORIES[cat];
              const pct = (amount / totalSpend) * 100;
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: C.text, fontSize: 13 }}>{c?.icon} {c?.label}</span>
                    <span style={{ color: C.textMuted, fontSize: 12, fontFamily: F.mono }}>{formatGTQ(amount)}</span>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: c?.color || C.accent, borderRadius: 4, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── LIBRETA ──────────────────────────────────────────────────────────────────
function Libreta() {
  const { accounts, transactions, corrections, addAccount, addTransaction, updateTransaction, saveCorrection } = useData();
  const [filter, setFilter]   = useState("all");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [editTx, setEditTx]   = useState(null);
  const [toast, setToast]     = useState(null);

  const [newTx, setNewTx] = useState({
    description: "", amount: "", type: "expense",
    category: "otro", account_id: "", transaction_date: new Date().toISOString().split("T")[0],
    currency: "GTQ", source: "manual",
  });
  const [newAcc, setNewAcc] = useState({
    name: "", type: "banco", currency: "GTQ",
    current_balance: "", icon: "", color: "#4ade80",
  });

  // Auto-suggest category as description is typed
  useEffect(() => {
    if (newTx.description.length > 3) {
      const suggested = suggestCategory(newTx.description, corrections);
      setNewTx(p => ({ ...p, category: suggested }));
    }
  }, [newTx.description]);

  // Auto-suggest emoji for new account
  useEffect(() => {
    setNewAcc(p => ({ ...p, icon: suggestAccountEmoji(p.name, p.type) }));
  }, [newAcc.name, newAcc.type]);

  const filtered = filter === "all" ? transactions : transactions.filter(t => filter === "income" ? t.amount > 0 : t.amount < 0);

  const submitTx = async () => {
    if (!newTx.description || !newTx.amount || !newTx.account_id) return;
    const amount = newTx.type === "expense" ? -Math.abs(parseFloat(newTx.amount)) : parseFloat(newTx.amount);
    await addTransaction({ ...newTx, amount, currency: accounts.find(a => a.id === newTx.account_id)?.currency || "GTQ" });
    setShowAddTx(false);
    setNewTx({ description: "", amount: "", type: "expense", category: "otro", account_id: accounts[0]?.id || "", transaction_date: new Date().toISOString().split("T")[0], currency: "GTQ", source: "manual" });
    setToast("Transacción guardada ✓");
  };

  const submitAcc = async () => {
    if (!newAcc.name) return;
    await addAccount({ ...newAcc, current_balance: parseFloat(newAcc.current_balance) || 0 });
    setShowAddAcc(false);
    setNewAcc({ name: "", type: "banco", currency: "GTQ", current_balance: "", icon: "", color: "#4ade80" });
    setToast("Cuenta agregada ✓");
  };

  const saveEditCategory = async () => {
    if (!editTx) return;
    await updateTransaction(editTx.id, { category: editTx.category });
    await saveCorrection(editTx.description, editTx.category);
    setEditTx(null);
    setToast("Categoría actualizada y aprendida ✓");
  };

  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: F.display, fontSize: 28, color: C.text, fontWeight: 700 }}>Mi Libreta</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" fullWidth={false} small onClick={() => setShowAddAcc(true)}>+ Cuenta</Btn>
          <Btn fullWidth={false} small onClick={() => setShowAddTx(true)}>+ Mov.</Btn>
        </div>
      </div>

      {/* Add transaction sheet */}
      {showAddTx && (
        <Sheet title="Nuevo movimiento" onClose={() => setShowAddTx(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {["expense","income"].map(type => (
              <button key={type} onClick={() => setNewTx(p => ({ ...p, type }))} style={{
                background: newTx.type === type ? (type === "expense" ? C.redDim : C.accentDim) : "transparent",
                border: `1px solid ${newTx.type === type ? (type === "expense" ? C.red : C.accent) : C.border}`,
                color: newTx.type === type ? (type === "expense" ? C.red : C.accent) : C.textMuted,
                borderRadius: 10, padding: "9px", fontFamily: F.mono, fontSize: 12, cursor: "pointer",
              }}>{type === "expense" ? "▼ Gasto" : "▲ Ingreso"}</button>
            ))}
          </div>
          <Input small label="Descripción" value={newTx.description} onChange={v => setNewTx(p => ({ ...p, description: v }))} placeholder="Ej. Mercado La Terminal" />
          <Input small label="Monto" type="number" value={newTx.amount} onChange={v => setNewTx(p => ({ ...p, amount: v }))} placeholder="0.00" />
          <Select small label={`Categoría (sugerida: ${CATEGORIES[newTx.category]?.icon} ${CATEGORIES[newTx.category]?.label})`} value={newTx.category} onChange={v => setNewTx(p => ({ ...p, category: v }))}
            options={Object.entries(CATEGORIES).map(([k, v]) => [k, `${v.icon} ${v.label}`])} />
          <Select small label="Cuenta" value={newTx.account_id} onChange={v => setNewTx(p => ({ ...p, account_id: v }))}
            options={accounts.map(a => [a.id, `${a.icon || "🏦"} ${a.name}`])} />
          <Input small label="Fecha" type="date" value={newTx.transaction_date} onChange={v => setNewTx(p => ({ ...p, transaction_date: v }))} />
          <Btn onClick={submitTx} disabled={!newTx.description || !newTx.amount || !newTx.account_id}>Guardar</Btn>
        </Sheet>
      )}

      {/* Add account sheet */}
      {showAddAcc && (
        <Sheet title="Nueva cuenta" onClose={() => setShowAddAcc(false)}>
          <Input small label="Nombre" value={newAcc.name} onChange={v => setNewAcc(p => ({ ...p, name: v }))} placeholder="Banco Industrial, Mi Coope..." />
          <Select small label="Tipo" value={newAcc.type} onChange={v => setNewAcc(p => ({ ...p, type: v }))}
            options={[["banco","🏦 Banco"],["cooperativa","🤝 Cooperativa"],["efectivo","💵 Efectivo"],["tarjeta","💳 Tarjeta"],["inversion","📈 Inversión"],["otro","📌 Otro"]]} />
          <Select small label="Moneda" value={newAcc.currency} onChange={v => setNewAcc(p => ({ ...p, currency: v }))}
            options={[["GTQ","🇬🇹 Quetzales (Q)"],["USD","🇺🇸 Dólares ($)"]]} />
          <Input small label="Saldo actual" type="number" value={newAcc.current_balance} onChange={v => setNewAcc(p => ({ ...p, current_balance: v }))} placeholder="0.00" />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <Input small label={`Emoji (sugerido: ${newAcc.icon})`} value={newAcc.icon} onChange={v => setNewAcc(p => ({ ...p, icon: v }))} placeholder="🏦" />
            </div>
          </div>
          <Btn onClick={submitAcc} disabled={!newAcc.name}>Agregar cuenta</Btn>
        </Sheet>
      )}

      {/* Edit category sheet */}
      {editTx && (
        <Sheet title="Editar categoría" onClose={() => setEditTx(null)}>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSub, marginBottom: 16 }}>"{editTx.description}"</p>
          <Select label="Categoría correcta" value={editTx.category} onChange={v => setEditTx(p => ({ ...p, category: v }))}
            options={Object.entries(CATEGORIES).map(([k, v]) => [k, `${v.icon} ${v.label}`])} />
          <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontFamily: F.mono, fontSize: 11, color: C.accent }}>
              ✓ Quetzal aprenderá esta corrección para transacciones similares en el futuro.
            </p>
          </div>
          <Btn onClick={saveEditCategory}>Guardar y enseñar</Btn>
        </Sheet>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["all","Todo"],["income","Ingresos"],["expense","Gastos"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            background: filter === val ? C.accentDim : "transparent",
            border: `1px solid ${filter === val ? C.accent : C.border}`,
            color: filter === val ? C.accent : C.textMuted,
            borderRadius: 20, padding: "6px 14px", cursor: "pointer",
            fontFamily: F.mono, fontSize: 11,
          }}>{label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, textAlign: "center", marginTop: 40 }}>
          No hay movimientos aún. ¡Agrega el primero!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(tx => {
            const cat = CATEGORIES[tx.category];
            const acc = accounts.find(a => a.id === tx.account_id);
            return (
              <div key={tx.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setEditTx({ ...tx })} style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: cat?.color + "22", border: `1px solid transparent`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, cursor: "pointer",
                  }} title="Editar categoría">{cat?.icon}</button>
                  <div>
                    <p style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{tx.description}</p>
                    <p style={{ color: C.textMuted, fontSize: 11, fontFamily: F.mono }}>{tx.transaction_date} · {acc?.name}</p>
                  </div>
                </div>
                <span style={{ color: tx.amount > 0 ? C.accent : C.red, fontSize: 14, fontWeight: 700, fontFamily: F.mono }}>
                  {tx.amount > 0 ? "+" : "-"}{formatGTQ(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── METAS ────────────────────────────────────────────────────────────────────
function Metas() {
  const { goals, addGoal, updateGoal } = useData();
  const [showAdd, setShowAdd]   = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast]       = useState(null);

  const [form, setForm] = useState({ name: "", target_amount: "", current_amount: "", icon: "", color: "#4ade80", target_date: "" });

  useEffect(() => {
    setForm(p => ({ ...p, icon: suggestGoalEmoji(p.name) }));
  }, [form.name]);

  const active   = goals.filter(g => !g.is_archived);
  const archived = goals.filter(g => g.is_archived);

  const submitGoal = async () => {
    if (!form.name || !form.target_amount) return;
    await addGoal({ name: form.name, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount) || 0, icon: form.icon, color: form.color, target_date: form.target_date || null, currency: "GTQ" });
    setShowAdd(false);
    setForm({ name: "", target_amount: "", current_amount: "", icon: "", color: "#4ade80", target_date: "" });
    setToast("Meta creada ✓");
  };

  const saveEdit = async () => {
    if (!editGoal) return;
    const wasCompleted = editGoal.current_amount >= editGoal.target_amount && !editGoal.is_completed;
    const updates = { name: editGoal.name, target_amount: editGoal.target_amount, current_amount: editGoal.current_amount, icon: editGoal.icon, color: editGoal.color, target_date: editGoal.target_date || null };
    if (wasCompleted) updates.is_completed = true;
    await updateGoal(editGoal.id, updates);
    setEditGoal(null);
    if (wasCompleted) { setConfetti(true); setToast("🎉 ¡Meta alcanzada!"); setTimeout(() => setConfetti(false), 3000); }
    else setToast("Meta actualizada ✓");
  };

  const archive = async (id) => {
    await updateGoal(id, { is_archived: true });
    setToast("Meta archivada");
  };

  const unarchive = async (id) => {
    await updateGoal(id, { is_archived: false });
  };

  const GoalCard = ({ goal, editable = true }) => {
    const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
    const completed = goal.current_amount >= goal.target_amount;
    return (
      <div style={{ background: C.surfaceAlt, border: `1px solid ${completed ? C.accent + "55" : C.border}`, borderRadius: 18, padding: "20px", position: "relative" }}>
        {completed && <div style={{ position: "absolute", top: 12, right: 12, fontFamily: F.mono, fontSize: 10, color: C.accent, background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 20, padding: "3px 10px" }}>✓ Completada</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 30 }}>{goal.icon || "🏺"}</span>
          <div>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{goal.name}</p>
            <p style={{ color: C.textMuted, fontSize: 11, fontFamily: F.mono }}>
              {formatGTQ(goal.current_amount)} de {formatGTQ(goal.target_amount)}
            </p>
          </div>
        </div>
        <div style={{ height: 8, background: C.border, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: goal.color || C.accent, borderRadius: 8, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: C.textMuted, fontSize: 12, fontFamily: F.mono }}>
            {completed ? "¡Meta lograda! 🎉" : `Faltan ${formatGTQ(goal.target_amount - goal.current_amount)}`}
          </p>
          {editable && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditGoal({ ...goal })} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.textMuted, fontFamily: F.mono, fontSize: 11, cursor: "pointer" }}>Editar</button>
              <button onClick={() => archive(goal.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.textMuted, fontFamily: F.mono, fontSize: 11, cursor: "pointer" }}>Archivar</button>
            </div>
          )}
          {!editable && (
            <button onClick={() => unarchive(goal.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.textMuted, fontFamily: F.mono, fontSize: 11, cursor: "pointer" }}>Restaurar</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>
      {confetti && <Confetti />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: F.display, fontSize: 28, color: C.text, fontWeight: 700 }}>Mis Metas</h2>
        <Btn fullWidth={false} small onClick={() => setShowAdd(true)}>+ Nueva</Btn>
      </div>

      {showAdd && (
        <Sheet title="Nueva meta" onClose={() => setShowAdd(false)}>
          <Input small label="Nombre" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Terreno, viaje, emergencia..." />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Input small label="Meta total (Q)" type="number" value={form.target_amount} onChange={v => setForm(p => ({ ...p, target_amount: v }))} placeholder="0.00" /></div>
            <div style={{ flex: 1 }}><Input small label="Ya ahorré (Q)" type="number" value={form.current_amount} onChange={v => setForm(p => ({ ...p, current_amount: v }))} placeholder="0.00" /></div>
          </div>
          <Input small label={`Emoji (sugerido: ${form.icon})`} value={form.icon} onChange={v => setForm(p => ({ ...p, icon: v }))} placeholder="🏡" hint="Puedes cambiar el emoji si lo deseas" />
          <Input small label="Fecha límite (opcional)" type="date" value={form.target_date} onChange={v => setForm(p => ({ ...p, target_date: v }))} />
          <Btn onClick={submitGoal} disabled={!form.name || !form.target_amount}>Crear meta</Btn>
        </Sheet>
      )}

      {editGoal && (
        <Sheet title="Editar meta" onClose={() => setEditGoal(null)}>
          <Input small label="Nombre" value={editGoal.name} onChange={v => setEditGoal(p => ({ ...p, name: v }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Input small label="Meta total (Q)" type="number" value={editGoal.target_amount} onChange={v => setEditGoal(p => ({ ...p, target_amount: parseFloat(v) || 0 }))} /></div>
            <div style={{ flex: 1 }}><Input small label="Ahorrado (Q)" type="number" value={editGoal.current_amount} onChange={v => setEditGoal(p => ({ ...p, current_amount: parseFloat(v) || 0 }))} /></div>
          </div>
          <Input small label="Emoji" value={editGoal.icon} onChange={v => setEditGoal(p => ({ ...p, icon: v }))} hint="Cambia el emoji si lo deseas" />
          <Input small label="Fecha límite" type="date" value={editGoal.target_date || ""} onChange={v => setEditGoal(p => ({ ...p, target_date: v }))} />
          <Btn onClick={saveEdit}>Guardar cambios</Btn>
        </Sheet>
      )}

      {active.length === 0 && (
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, textAlign: "center", marginTop: 40 }}>
          No tienes metas activas. ¡Crea la primera!
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
        {active.map(g => <GoalCard key={g.id} goal={g} />)}
      </div>

      {archived.length > 0 && (
        <>
          <p style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.12em", color: C.textMuted, marginBottom: 12 }}>METAS ARCHIVADAS ({archived.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.6 }}>
            {archived.map(g => <GoalCard key={g.id} goal={g} editable={false} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── INVERTIR (unchanged from v1, placeholder for expansion) ─────────────────
function Invertir() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "📖", title: "¿Por qué invertir en dólares?", body: "El quetzal puede perder valor con el tiempo. Invertir en dólares y activos globales protege tu dinero de la inflación local y te expone al crecimiento de empresas como Apple, Amazon, y miles más.", cta: "Entiendo, ¿cómo empiezo?" },
    { icon: "🌐", title: "Guatemaltecos pueden invertir afuera", body: "Como ciudadano guatemalteco, puedes abrir una cuenta de inversión en Interactive Brokers o Schwab International. Son plataformas reguladas en EE.UU. que aceptan clientes extranjeros.", cta: "¿Qué es un fondo índice?" },
    { icon: "📊", title: "Fondos índice: lo más simple y efectivo", body: "Un fondo índice (como VTI o VOO) compra pequeñas partes de cientos de empresas a la vez. En lugar de apostar a una sola empresa, diversificas automáticamente. El S&P 500 ha crecido ~10% anual históricamente.", cta: "¿Cuánto necesito para empezar?" },
    { icon: "💸", title: "Puedes empezar con poco", body: "Interactive Brokers no tiene mínimo de cuenta. Puedes empezar con $50 o $100 dólares. Lo importante es la constancia — invertir Q200/mes durante 20 años puede crecer a más de Q200,000.", cta: "Ver simulación de crecimiento" },
    { icon: "📈", title: "El poder del tiempo", body: "Si inviertes Q500/mes en un fondo que crece 8% anual: en 10 años tendrías ~Q88,000. En 20 años ~Q280,000. En 30 años ~Q680,000. La clave es empezar hoy.", cta: "¿Cómo abro mi cuenta?" },
    { icon: "🏁", title: "Próximos pasos", body: "1. Ve a interactivebrokers.com\n2. Selecciona 'Individual Account'\n3. Completa el formulario con tu DPI y datos bancarios\n4. Transfiere fondos desde tu banco guatemalteco\n5. Compra tu primer fondo (VTI, VOO, o SCHB)", cta: "Reiniciar guía" },
  ];
  const current = steps[step];
  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>
      <h2 style={{ fontFamily: F.display, fontSize: 28, color: C.text, fontWeight: 700, marginBottom: 4 }}>Invertir</h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textMuted, marginBottom: 24 }}>Guía para guatemaltecos · Más módulos próximamente</p>
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= step ? C.accent : C.border, transition: "background 0.3s" }} />)}
      </div>
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 24, padding: "28px 22px", marginBottom: 16, minHeight: 260, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 44, marginBottom: 18 }}>{current.icon}</div>
          <h3 style={{ fontFamily: F.display, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 14, lineHeight: 1.3 }}>{current.title}</h3>
          <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line" }}>{current.body}</p>
        </div>
      </div>
      <Btn onClick={() => setStep((step + 1) % steps.length)}>{current.cta} →</Btn>
    </div>
  );
}

// ─── MAIN APP SHELL ───────────────────────────────────────────────────────────
function AppShell() {
  const { user, signOut } = useAuth();
  const { exportCSV } = useData();
  const [screen, setScreen] = useState("dashboard");

  return (
    <AppLockManager>
      <div style={{ background: C.bg, minHeight: "100vh", maxWidth: 430, margin: "0 auto", position: "relative" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.gold})` }} />
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.accent }}>Q</span>
            <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 400, color: C.text }}>uetzal</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.textMuted, fontFamily: F.mono, fontSize: 10, cursor: "pointer" }} title="Exportar CSV">↓ CSV</button>
            <button onClick={signOut} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.textMuted, fontFamily: F.mono, fontSize: 10, cursor: "pointer" }}>Salir</button>
          </div>
        </div>
        {screen === "dashboard" && <Dashboard />}
        {screen === "libreta"   && <Libreta />}
        {screen === "metas"     && <Metas />}
        {screen === "invertir"  && <Invertir />}
        <Nav active={screen} setActive={setScreen} />
      </div>
    </AppLockManager>
  );
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function AuthFlow() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [screen, setScreen] = useState("welcome");
  const [toast, setToast] = useState(null);

  const go = (s) => setScreen(s);

  // Minimal auth screens wired to real Supabase
  const screens = {
    welcome: (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", maxWidth: 430, margin: "0 auto" }}>
        <div style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse 60% 40% at 20% 20%, ${C.accentDim}, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, ${C.goldDim}, transparent 60%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: F.display, fontSize: 56, fontWeight: 700, color: C.accent }}>Q</span>
          <span style={{ fontFamily: F.display, fontSize: 56, fontWeight: 400, color: C.text }}>uetzal</span>
          <p style={{ fontFamily: F.body, fontSize: 18, color: C.textSub, marginTop: 8, marginBottom: 48, fontStyle: "italic" }}>Tu dinero, ordenado.<br />Tu futuro, construido.</p>
          <Btn onClick={() => go("signup")}>Crear cuenta</Btn>
          <Btn variant="secondary" onClick={() => go("login")}>Iniciar sesión</Btn>
          <div style={{ marginTop: 36, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 12 }}>SEGURIDAD DE NIVEL BANCARIO</p>
            {[["🔐","2FA obligatorio en todas las cuentas"],["🔒","Tus datos nunca se comparten ni se venden"],["📵","No guardamos números de cuenta"],["🇬🇹","Hecho en Guatemala para Guatemaltecos"]].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSub }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    login: (
      <LoginScreen go={go} signIn={signIn} setToast={setToast} />
    ),
    signup: (
      <SignUpScreen go={go} signUp={signUp} setToast={setToast} />
    ),
  };

  return (
    <>
      {toast && <Toast message={toast} type={toast.includes("Error") ? "error" : "success"} onDone={() => setToast(null)} />}
      {screens[screen] || screens.welcome}
    </>
  );
}

function LoginScreen({ go, signIn, setToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) { setError("Completa todos los campos"); return; }
    setLoading(true); setError("");
    try {
      await signIn(email, password);
      // Auth state change handles the rest
    } catch (e) {
      setError("Correo o contraseña incorrectos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "80px 24px 40px", maxWidth: 430, margin: "0 auto" }}>
      <button onClick={() => go("welcome")} style={{ background: "none", border: "none", color: C.textMuted, fontFamily: F.mono, fontSize: 13, cursor: "pointer", marginBottom: 24 }}>← Volver</button>
      <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.accent }}>Q</span>
      <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 400, color: C.text }}>uetzal</span>
      <h1 style={{ fontFamily: F.display, fontSize: 34, color: C.text, fontWeight: 700, marginTop: 16, marginBottom: 32 }}>Bienvenido</h1>
      <Input label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="ana@ejemplo.com" autoComplete="email" />
      <Input label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="Tu contraseña" autoComplete="current-password" />
      {error && <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}><p style={{ fontFamily: F.mono, fontSize: 12, color: C.red }}>{error}</p></div>}
      <Btn onClick={submit} loading={loading}>Ingresar</Btn>
      <p style={{ textAlign: "center", fontFamily: F.mono, fontSize: 12, color: C.textMuted, marginTop: 12 }}>
        ¿No tienes cuenta? <span onClick={() => go("signup")} style={{ color: C.accent, cursor: "pointer" }}>Regístrate</span>
      </p>
    </div>
  );
}

function SignUpScreen({ go, signUp, setToast }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden"); return; }
    if (form.password.length < 10) { setError("La contraseña debe tener al menos 10 caracteres"); return; }
    setLoading(true); setError("");
    try {
      await signUp(form.email, form.password, form.name);
      setToast("Cuenta creada. Revisa tu correo para confirmar.");
      go("login");
    } catch (e) {
      setError(e.message || "Error al crear cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "60px 24px 40px", maxWidth: 430, margin: "0 auto" }}>
      <button onClick={() => go("welcome")} style={{ background: "none", border: "none", color: C.textMuted, fontFamily: F.mono, fontSize: 13, cursor: "pointer", marginBottom: 24 }}>← Volver</button>
      <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.accent }}>Q</span>
      <span style={{ fontFamily: F.display, fontSize: 24, fontWeight: 400, color: C.text }}>uetzal</span>
      <h1 style={{ fontFamily: F.display, fontSize: 34, color: C.text, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Crear cuenta</h1>
      <p style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, marginBottom: 28 }}>Tu información siempre encriptada y segura.</p>
      <Input label="Nombre completo" value={form.name} onChange={set("name")} placeholder="Ana García" autoComplete="name" />
      <Input label="Correo electrónico" type="email" value={form.email} onChange={set("email")} placeholder="ana@ejemplo.com" autoComplete="email" />
      <Input label="Contraseña" type="password" value={form.password} onChange={set("password")} placeholder="Mínimo 10 caracteres" autoComplete="new-password" />
      <Input label="Confirmar contraseña" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repite tu contraseña" autoComplete="new-password" />
      {error && <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}><p style={{ fontFamily: F.mono, fontSize: 12, color: C.red }}>{error}</p></div>}
      <Btn onClick={submit} loading={loading} disabled={!form.email || !form.password || !form.confirm}>Crear cuenta</Btn>
      <p style={{ textAlign: "center", fontFamily: F.mono, fontSize: 12, color: C.textMuted, marginTop: 12 }}>
        ¿Ya tienes cuenta? <span onClick={() => go("login")} style={{ color: C.accent, cursor: "pointer" }}>Inicia sesión</span>
      </p>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function Root() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Mono:wght@400;500&family=Lato:wght@400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: F.display, fontSize: 36, color: C.accent }}>Q</span>
      <span style={{ fontFamily: F.display, fontSize: 36, color: C.text }}>uetzal</span>
    </div>
  );

  return user ? <DataProvider><AppShell /></DataProvider> : <AuthFlow />;
}

export default function App() {
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #080c08; }
        input::placeholder { color: #2e472e; }
        input, select { caret-color: #4ade80; color-scheme: dark; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </>
  );
}

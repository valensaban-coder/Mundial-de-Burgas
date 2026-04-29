import { useState, useEffect, useCallback, useRef } from "react";

/* ─────────────────────────────────────────
   JSONBin config — variables de entorno
   En Vercel: Settings → Environment Variables
   VITE_JSONBIN_KEY  = tu X-Master-Key
   VITE_JSONBIN_ID   = tu Bin ID
───────────────────────────────────────── */
const BIN_KEY = import.meta.env.VITE_JSONBIN_KEY;
const BIN_ID  = import.meta.env.VITE_JSONBIN_ID;
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const jsonbinHeaders = {
  "Content-Type": "application/json",
  "X-Master-Key": BIN_KEY,
};

async function fetchRemote() {
  const res = await fetch(`${BIN_URL}/latest`, { headers: jsonbinHeaders });
  if (!res.ok) throw new Error("fetch failed");
  const json = await res.json();
  return json.record?.burgers ?? [];
}

async function pushRemote(burgers) {
  const res = await fetch(BIN_URL, {
    method: "PUT",
    headers: jsonbinHeaders,
    body: JSON.stringify({ burgers }),
  });
  if (!res.ok) throw new Error("push failed");
}

/* ─────────────────────────────────────────
   Constants & helpers
───────────────────────────────────────── */
const JUDGES = [
  { id: "sira",   name: "Sira",   emoji: "👩🏻‍💻" },
  { id: "agusto", name: "Agusto", emoji: "🏋🏻‍♂️" },
  { id: "valen",  name: "Valen",  emoji: "🧑🏻‍💻" },
  { id: "male",   name: "Male",   emoji: "👩🏻‍⚕️" },
];

const P = {
  carbon:  "#1A1A1A",
  gold:    "#D4AF37",
  bone:    "#F5F5F5",
  red:     "#B22222",
  surface: "#242424",
  border:  "#333",
  muted:   "#888",
  dim:     "#555",
};

const getMedal = (i) => ["🥇","🥈","🥉"][i] ?? `${i+1}°`;

const parse = (str) => {
  if (!str && str !== 0) return null;
  const n = parseFloat(String(str).replace(",", "."));
  if (isNaN(n) || n < 0 || n > 10) return null;
  return Math.round(n * 100) / 100;
};
const fmt = (n) => n != null ? String(n).replace(".", ",") : "—";

const calcAvg = (scores) => {
  const vals = JUDGES.map(j => scores[j.id]).filter(v => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100;
};

const scoreLabel = (s) => {
  if (s == null) return "";
  if (s >= 9) return "OBRA MAESTRA";
  if (s >= 8) return "EXCELENTE";
  if (s >= 7) return "MUY BUENA";
  if (s >= 5) return "REGULAR";
  return "FLOJA";
};

const scoreGold = (s) => {
  if (s == null) return { c: P.muted, bg: "transparent", b: P.border };
  if (s >= 8) return { c: P.gold,    bg: "rgba(212,175,55,.12)", b: "rgba(212,175,55,.4)" };
  if (s >= 6) return { c: "#e0c060", bg: "rgba(224,192,96,.1)",  b: "rgba(224,192,96,.35)" };
  if (s >= 4) return { c: "#cd853f", bg: "rgba(205,133,63,.1)",  b: "rgba(205,133,63,.35)" };
  return { c: P.red, bg: "rgba(178,34,34,.1)", b: "rgba(178,34,34,.35)" };
};

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function ScoreBadge({ value, onClick, hasReview }) {
  const s = typeof value === "number" ? value : parse(value);
  const { c, bg, b } = scoreGold(s);
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 48, padding: "4px 8px", borderRadius: 6,
        background: bg, color: c,
        border: `1px solid ${b}`,
        borderBottom: hasReview && s != null ? `2px solid ${c}` : `1px solid ${b}`,
        fontSize: 13, fontWeight: 700, fontFamily: "monospace", letterSpacing: .5,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {fmt(s)}
    </span>
  );
}

function AvgBadge({ value, big }) {
  const { c, bg, b } = scoreGold(value);
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      background: bg, border: `1px solid ${b}`, borderRadius: 10,
      padding: big ? "10px 16px" : "6px 12px",
    }}>
      <span style={{ fontSize: big ? 32 : 18, fontWeight: 900, color: c, fontFamily: "monospace", lineHeight: 1 }}>
        {fmt(value)}
      </span>
      {big && (
        <span style={{ fontSize: 10, color: c, letterSpacing: 2, textTransform: "uppercase", marginTop: 3, opacity: .8 }}>
          {scoreLabel(value)}
        </span>
      )}
    </div>
  );
}

function ReviewPopover({ judge, score, review, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.75)", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e1e1e", border: `1px solid ${P.gold}`,
          borderRadius: 14, padding: "22px 24px", maxWidth: 400, width: "100%",
          boxShadow: "0 8px 40px rgba(0,0,0,.9)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{judge.emoji}</span>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: P.gold, textTransform: "uppercase", letterSpacing: 1 }}>
              {judge.name}
            </div>
            <ScoreBadge value={score} />
          </div>
        </div>

        {review ? (
          <div style={{
            padding: "12px 16px",
            background: "#161616", borderLeft: `3px solid ${P.gold}`,
            borderRadius: "0 8px 8px 0", fontSize: 14, color: "#ccc",
            lineHeight: 1.75, fontFamily: "'Lora', serif", fontStyle: "italic",
          }}>
            "{review}"
          </div>
        ) : (
          <div style={{ color: P.muted, fontStyle: "italic", fontSize: 13, padding: "10px 0" }}>
            Sin reseña.
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: "100%", padding: "10px",
            background: "transparent", border: `1px solid ${P.border}`,
            borderRadius: 8, color: P.muted, fontSize: 13, cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function SyncStatus({ status }) {
  const map = {
    idle:    { icon: "●", color: P.dim,    text: "" },
    loading: { icon: "↻", color: P.gold,   text: "Sincronizando..." },
    saving:  { icon: "↑", color: P.gold,   text: "Guardando..." },
    ok:      { icon: "✓", color: "#4ade80", text: "Sincronizado" },
    error:   { icon: "✕", color: P.red,    text: "Sin conexión — datos locales" },
  };
  const s = map[status] ?? map.idle;
  if (!s.text) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, fontSize: 12,
      color: s.color, padding: "6px 12px",
      background: "rgba(0,0,0,.3)", borderRadius: 20,
    }}>
      <span style={{ fontSize: status === "loading" || status === "saving" ? 16 : 12, lineHeight: 1 }}>{s.icon}</span>
      {s.text}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
export default function App() {
  const [burgers, setBurgers]             = useState([]);
  const [syncStatus, setSyncStatus]       = useState("loading");
  const [form, setForm]                   = useState({ name: "", score: "", review: "" });
  const [selectedJudge, setSelectedJudge] = useState(JUDGES[0].id);
  const [submitted, setSubmitted]         = useState(false);
  const [delId, setDelId]                 = useState(null);
  const [mainTab, setMainTab]             = useState("agregar");
  const [activeReview, setActiveReview]   = useState(null); // { burger, judgeId }
  const saveTimeout                       = useRef(null);

  /* ── Load from JSONBin on mount ── */
  useEffect(() => {
    if (!BIN_KEY || !BIN_ID) { setSyncStatus("error"); return; }
    setSyncStatus("loading");
    fetchRemote()
      .then(data => { setBurgers(data); setSyncStatus("ok"); })
      .catch(() => setSyncStatus("error"));
  }, []);

  /* ── Debounced push to JSONBin ── */
  const persistAndSync = useCallback((next) => {
    setBurgers(next);
    setSyncStatus("saving");
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      pushRemote(next)
        .then(() => setSyncStatus("ok"))
        .catch(() => setSyncStatus("error"));
    }, 600);
  }, []);

  const judge    = JUDGES.find(j => j.id === selectedJudge);
  const scoreVal = parse(form.score);
  const scoreErr = submitted && form.score && scoreVal === null ? "0–10" : null;
  const canSubmit = form.name.trim() && scoreVal !== null;

  // Whether the typed name matches an existing entry
  const existingMatch = burgers.find(b =>
    b.name.toLowerCase() === form.name.trim().toLowerCase()
  );

  /* ── Submit: merge into existing or create new ── */
  const handleSubmit = () => {
    setSubmitted(true);
    if (!canSubmit) return;

    const name   = form.name.trim();
    const score  = scoreVal;
    const review = form.review.trim();

    const emptyScores  = Object.fromEntries(JUDGES.map(j => [j.id, null]));
    const emptyReviews = Object.fromEntries(JUDGES.map(j => [j.id, ""]));

    let next;
    if (existingMatch) {
      next = burgers.map(b => b.id === existingMatch.id ? {
        ...b,
        scores:  { ...b.scores,  [selectedJudge]: score },
        reviews: { ...(b.reviews ?? emptyReviews), [selectedJudge]: review },
      } : b);
    } else {
      next = [...burgers, {
        id: Date.now(),
        name,
        scores:  { ...emptyScores,  [selectedJudge]: score },
        reviews: { ...emptyReviews, [selectedJudge]: review },
      }];
    }

    persistAndSync(next);
    setForm({ name: "", score: "", review: "" });
    setSubmitted(false);
    setMainTab("tabla");
  };

  /* ── Edit: pre-fill form with a specific judge's score ── */
  const handleEditScore = (burger, judgeId) => {
    setSelectedJudge(judgeId);
    setForm({
      name:   burger.name,
      score:  burger.scores[judgeId] != null ? String(burger.scores[judgeId]).replace(".", ",") : "",
      review: burger.reviews?.[judgeId] ?? "",
    });
    setSubmitted(false);
    setMainTab("agregar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    persistAndSync(burgers.filter(b => b.id !== id));
    setDelId(null);
  };

  const handleRefresh = () => {
    setSyncStatus("loading");
    fetchRemote()
      .then(data => { setBurgers(data); setSyncStatus("ok"); })
      .catch(() => setSyncStatus("error"));
  };

  const sorted       = [...burgers].sort((a, b) => (calcAvg(b.scores) ?? 0) - (calcAvg(a.scores) ?? 0));
  const existingNames = burgers.map(b => b.name);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: P.carbon, color: P.bone, fontFamily: "'Barlow', sans-serif" }}>

      {/* ── Review popover ── */}
      {activeReview && (
        <ReviewPopover
          judge={JUDGES.find(j => j.id === activeReview.judgeId)}
          score={activeReview.burger.scores[activeReview.judgeId]}
          review={activeReview.burger.reviews?.[activeReview.judgeId]}
          onClose={() => setActiveReview(null)}
        />
      )}

      {/* ── HEADER ── */}
      <header className="mh-texture" style={{
        background: "linear-gradient(160deg, #111 0%, #1e1600 60%, #1A1A1A 100%)",
        borderBottom: `2px solid ${P.gold}`,
        padding: "28px 16px 22px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${P.gold}, transparent)` }} />
        <div style={{ fontSize: 48, marginBottom: 8, filter: "drop-shadow(0 0 16px rgba(212,175,55,.5))" }}>🍔</div>
        <div style={{ fontSize: 11, letterSpacing: 5, color: P.gold, textTransform: "uppercase", fontWeight: 500, marginBottom: 6 }}>
          🍔 Copa Jurado 2026 🍔
        </div>
        <h1 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: "clamp(26px, 7vw, 52px)",
          fontWeight: 700, color: P.bone,
          textTransform: "uppercase", letterSpacing: 2, lineHeight: 1,
          textShadow: "0 2px 20px rgba(0,0,0,.8)",
        }}>
          Mundial de<br />
          <span style={{ color: P.gold }}>Hamburgueserías</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginTop: 12 }}>
          <div style={{ height: 1, width: 40, background: `linear-gradient(90deg, transparent, ${P.gold})` }} />
          <span style={{ color: P.gold, fontSize: 14 }}>✦</span>
          <div style={{ height: 1, width: 40, background: `linear-gradient(90deg, ${P.gold}, transparent)` }} />
        </div>

        {/* Sync status */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <SyncStatus status={syncStatus} />
          <button
            onClick={handleRefresh}
            title="Actualizar"
            style={{
              background: "rgba(0,0,0,.4)", border: `1px solid ${P.border}`,
              borderRadius: 20, color: P.muted, fontSize: 14,
              width: 30, height: 30, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >↻</button>
        </div>
      </header>

      {/* ── NAV TABS ── */}
      <nav style={{ background: "#111", borderBottom: `1px solid ${P.border}`, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex" }}>
          {[
            { id: "agregar", icon: "➕", label: "Agregar" },
            { id: "tabla",   icon: "🏆", label: `Tabla${burgers.length ? ` · ${burgers.length}` : ""}` },
            { id: "jurado",  icon: "🧑‍⚖️", label: "Jurado" },
          ].map(t => (
            <button key={t.id} className="mh-tab" onClick={() => setMainTab(t.id)} style={{
              flex: 1, padding: "14px 12px",
              background: "none", border: "none",
              borderBottom: `3px solid ${mainTab === t.id ? P.gold : "transparent"}`,
              color: mainTab === t.id ? P.gold : P.muted,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 1.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "20px 12px 60px" }}>

        {/* ════════════════════════ AGREGAR ════════════════════════ */}
        {mainTab === "agregar" && (
          <div className="mh-in">

            {syncStatus === "error" && (
              <div style={{ background: "rgba(178,34,34,.12)", border: `1px solid rgba(178,34,34,.4)`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171", display: "flex", gap: 8 }}>
                <span>⚠️</span>
                <span>Sin conexión con el servidor. Los cambios se guardarán cuando vuelva la conexión. Revisá las variables de entorno en Vercel.</span>
              </div>
            )}

            <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
              {/* Card header */}
              <div style={{ background: "#1e1e1e", borderBottom: `1px solid ${P.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: P.gold, fontSize: 20 }}>🍔</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P.bone }}>
                  Cargar mi puntaje
                </span>
              </div>

              <div style={{ padding: "20px" }}>

                {/* ¿Quién sos? */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: P.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                    ¿Quién sos?
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {JUDGES.map(j => (
                      <button
                        key={j.id}
                        onClick={() => setSelectedJudge(j.id)}
                        style={{
                          padding: "10px 16px", borderRadius: 10, cursor: "pointer",
                          border: `1.5px solid ${selectedJudge === j.id ? P.gold : P.border}`,
                          background: selectedJudge === j.id ? "rgba(212,175,55,.12)" : "transparent",
                          color: selectedJudge === j.id ? P.gold : P.muted,
                          fontSize: 14, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 8,
                          transition: "border-color .15s, background .15s",
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{j.emoji}</span>
                        <span>{j.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nombre del local */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: P.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                    Nombre del local
                  </label>
                  <input
                    className="mh-input"
                    list="burger-names"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ej: Big Pons, Fat Broder, Los Caminantes..."
                    style={{
                      width: "100%", padding: "13px 16px",
                      background: "#1a1a1a",
                      border: `1.5px solid ${submitted && !form.name.trim() ? P.red : P.border}`,
                      borderRadius: 10, color: P.bone, fontSize: 16, fontWeight: 500,
                    }}
                  />
                  <datalist id="burger-names">
                    {existingNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                  {submitted && !form.name.trim() && (
                    <span style={{ color: P.red, fontSize: 12, marginTop: 5, display: "block" }}>⚠ Ingresá el nombre</span>
                  )}
                  {form.name.trim() && existingMatch && (
                    <span style={{ color: P.gold, fontSize: 12, marginTop: 5, display: "block", opacity: .8 }}>
                      ✓ Actualizando entrada existente
                    </span>
                  )}
                </div>

                {/* Active judge panel */}
                <div style={{ background: "#1a1a1a", border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.gold}`, borderRadius: "0 12px 12px 0", padding: "18px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <span style={{ fontSize: 36, lineHeight: 1, filter: "drop-shadow(0 0 8px rgba(212,175,55,.3))" }}>{judge.emoji}</span>
                    <div>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P.gold }}>{judge.name}</div>
                      <div style={{ fontSize: 12, color: P.muted }}>Ingresá tu puntaje y reseña</div>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", fontSize: 11, color: P.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                      Puntaje (0–10 · podés usar coma: 8,50)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <input
                        className="mh-input"
                        type="text" inputMode="decimal"
                        value={form.score}
                        onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                        placeholder="8,50"
                        maxLength={5}
                        style={{
                          width: 90, padding: "12px",
                          background: "#111",
                          border: `1.5px solid ${scoreErr ? P.red : form.score ? P.gold : P.border}`,
                          borderRadius: 10,
                          color: scoreGold(scoreVal).c,
                          fontSize: 24, fontWeight: 800, textAlign: "center", fontFamily: "monospace",
                        }}
                      />
                      <span style={{ color: P.dim, fontSize: 14 }}>/10</span>
                      {scoreErr && <span style={{ color: P.red, fontSize: 12, fontWeight: 600 }}>⚠ {scoreErr}</span>}
                      {submitted && !form.score && <span style={{ color: P.red, fontSize: 12, fontWeight: 600 }}>⚠ Ingresá un puntaje</span>}
                      {scoreVal !== null && !scoreErr && (
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: scoreGold(scoreVal).c }}>
                          {scoreLabel(scoreVal)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: P.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                      Reseña (opcional)
                    </label>
                    <textarea
                      className="mh-textarea"
                      value={form.review}
                      onChange={e => setForm(f => ({ ...f, review: e.target.value }))}
                      placeholder={`¿Qué te pareció, ${judge.name}? La carne, el pan, las salsas...`}
                      rows={3}
                      style={{
                        width: "100%", padding: "12px 14px",
                        background: "#111", border: `1.5px solid ${P.border}`,
                        borderRadius: 10, color: "#ddd", fontSize: 14, lineHeight: 1.6,
                      }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button className="mh-btn-primary" onClick={handleSubmit} style={{
                  width: "100%", padding: "15px 20px",
                  background: `linear-gradient(135deg, ${P.gold}, #f0c840)`,
                  border: "none", borderRadius: 10,
                  color: "#111", fontSize: 14, fontWeight: 800, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: 1.5,
                  boxShadow: "0 4px 20px rgba(212,175,55,.3)",
                }}>
                  🏆 Guardar mi puntaje
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ TABLA ════════════════════════ */}
        {mainTab === "tabla" && (
          <div className="mh-in">
            {syncStatus === "loading" ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: P.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>↻</div>
                <p>Cargando datos...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 64, marginBottom: 16, filter: "grayscale(.5)" }}>🍔</div>
                <p style={{ fontFamily: "'Lora', serif", fontSize: 18, color: P.muted, fontStyle: "italic", marginBottom: 24 }}>
                  Todavía no hay hamburgueserías<br />en el mundial.
                </p>
                <button className="mh-btn-primary" onClick={() => setMainTab("agregar")} style={{
                  padding: "13px 28px",
                  background: `linear-gradient(135deg, ${P.gold}, #f0c840)`,
                  border: "none", borderRadius: 10, color: "#111",
                  fontSize: 14, fontWeight: 800, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: 1,
                  boxShadow: "0 4px 20px rgba(212,175,55,.3)",
                }}>
                  ➕ Agregar la primera
                </button>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { icon: "🍔", label: "Locales",     val: sorted.length,                  text: false },
                    { icon: "🥇", label: "Líder",        val: sorted[0].name,                 text: true  },
                    { icon: "⭐", label: "Top puntaje",  val: fmt(calcAvg(sorted[0].scores)), text: false },
                  ].map((s, i) => (
                    <div key={i} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 10, color: P.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{s.label}</div>
                      <div style={{
                        fontFamily: s.text ? "inherit" : "'Oswald', sans-serif",
                        fontSize: s.text ? 12 : 22, fontWeight: 800, color: P.gold,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {s.val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cards */}
                {sorted.map((burger, index) => {
                  const avg      = calcAvg(burger.scores);
                  const isTop    = index === 0;
                  const voted    = JUDGES.filter(j => burger.scores[j.id] != null).length;
                  return (
                    <div key={burger.id} className="mh-row" style={{
                      background: isTop ? "rgba(212,175,55,.06)" : P.surface,
                      border: `1px solid ${isTop ? "rgba(212,175,55,.3)" : P.border}`,
                      borderLeft: `4px solid ${isTop ? P.gold : index === 1 ? "#aaa" : index === 2 ? "#cd853f" : P.border}`,
                      borderRadius: 12, marginBottom: 10, overflow: "hidden",
                    }}>

                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: index < 3 ? 26 : 16, fontWeight: 800, minWidth: 36, textAlign: "center", color: index < 3 ? "inherit" : P.dim }}>
                          {getMedal(index)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, fontWeight: 700, color: isTop ? P.gold : P.bone, textTransform: "uppercase", letterSpacing: .5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {burger.name}
                          </div>
                          <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>
                            {voted}/{JUDGES.length} votos
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                          <AvgBadge value={avg} big={false} />
                          <span style={{ fontSize: 10, color: P.muted }}>promedio</span>
                        </div>
                      </div>

                      {/* Judge scores grid — click to see review */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: `1px solid ${P.border}` }}>
                        {JUDGES.map((j, ji) => {
                          const s         = burger.scores[j.id];
                          const hasReview = !!(burger.reviews?.[j.id]);
                          const clickable = s != null;
                          return (
                            <div
                              key={j.id}
                              style={{
                                padding: "10px 6px", textAlign: "center",
                                borderRight: ji < 3 ? `1px solid ${P.border}` : "none",
                                cursor: clickable ? "pointer" : "default",
                                transition: "background .15s",
                              }}
                              onClick={clickable ? () => setActiveReview({ burger, judgeId: j.id }) : undefined}
                              onMouseEnter={e => { if (clickable) e.currentTarget.style.background = "rgba(212,175,55,.05)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <div style={{ fontSize: 16, marginBottom: 4 }}>{j.emoji}</div>
                              <div style={{ fontSize: 11, color: P.muted, marginBottom: 4, fontWeight: 600 }}>{j.name}</div>
                              <ScoreBadge value={s} hasReview={hasReview} onClick={clickable ? () => setActiveReview({ burger, judgeId: j.id }) : undefined} />
                              {hasReview && s != null && (
                                <div style={{ fontSize: 9, color: P.gold, marginTop: 3, opacity: .6, letterSpacing: .5 }}>reseña</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions: edit per judge + delete */}
                      <div style={{ padding: "8px 16px 10px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {JUDGES.map(j => (
                          <button
                            key={j.id}
                            onClick={() => handleEditScore(burger, j.id)}
                            title={`Editar puntaje de ${j.name}`}
                            style={{
                              padding: "5px 10px", background: "transparent",
                              border: `1px solid ${P.border}`, borderRadius: 6,
                              color: P.muted, fontSize: 11, fontWeight: 600, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = P.gold}
                            onMouseLeave={e => e.currentTarget.style.borderColor = P.border}
                          >
                            {j.emoji} ✏️
                          </button>
                        ))}
                        <div style={{ flex: 1 }} />
                        {delId === burger.id ? (
                          <button onClick={() => handleDelete(burger.id)} onMouseLeave={() => setDelId(null)}
                            style={{ padding: "5px 12px", background: "rgba(178,34,34,.15)", border: `1px solid ${P.red}`, borderRadius: 6, color: P.red, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Confirmar borrado
                          </button>
                        ) : (
                          <button onClick={() => setDelId(burger.id)}
                            style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${P.border}`, borderRadius: 6, color: P.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = P.red; e.currentTarget.style.color = P.red; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.muted; }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Legend */}
                <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {[
                    ["≥ 9 · Obra maestra", P.gold],
                    ["≥ 8 · Excelente",    "#e0c060"],
                    ["≥ 6 · Buena",        "#cd853f"],
                    ["< 6 · Floja",        P.red],
                  ].map(([label, color]) => (
                    <span key={label} style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${color}44`, borderRadius: 6, color, fontWeight: 600, letterSpacing: .5 }}>
                      {label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════ JURADO ════════════════════════ */}
        {mainTab === "jurado" && (() => {
          const judgeStats = JUDGES.map(j => {
            const scores = burgers.map(b => b.scores[j.id]).filter(v => v != null);
            const avg    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : null;
            const min    = scores.length ? Math.min(...scores) : null;
            const max    = scores.length ? Math.max(...scores) : null;
            return { ...j, scores, avg, min, max };
          }).filter(j => j.scores.length > 0);

          if (judgeStats.length === 0) {
            return (
              <div className="mh-in" style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧑‍⚖️</div>
                <p style={{ color: P.muted, fontStyle: "italic", fontFamily: "'Lora', serif" }}>
                  Todavía no hay votos registrados.
                </p>
              </div>
            );
          }

          const sorted      = [...judgeStats].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
          const mostStrict  = [...judgeStats].sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99))[0];
          const mostGenerous = sorted[0];

          return (
            <div className="mh-in">
              {/* Podio resumen */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Más exigente", judge: mostStrict,  icon: "😤" },
                  { label: "Más generoso", judge: mostGenerous, icon: "😄" },
                ].map(({ label, judge, icon }) => (
                  <div key={label} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 10, color: P.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{judge.emoji}</div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700, color: P.gold, textTransform: "uppercase" }}>{judge.name}</div>
                    <div style={{ fontSize: 13, color: P.muted, marginTop: 4 }}>prom. <span style={{ color: P.bone, fontWeight: 700 }}>{fmt(judge.avg)}</span></div>
                  </div>
                ))}
              </div>

              {/* Cards por jurado */}
              {sorted.map((j, i) => {
                const { c, bg, b } = scoreGold(j.avg);
                return (
                  <div key={j.id} style={{
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderLeft: `4px solid ${c}`,
                    borderRadius: 12, marginBottom: 10, padding: "16px 18px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <span style={{ fontSize: 36 }}>{j.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: P.bone, textTransform: "uppercase", letterSpacing: 1 }}>{j.name}</div>
                        <div style={{ fontSize: 12, color: P.muted }}>{j.scores.length} voto{j.scores.length !== 1 ? "s" : ""} emitido{j.scores.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: P.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Promedio</div>
                        <AvgBadge value={j.avg} big={false} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[
                        { label: "Más alto",  val: j.max, color: "#4ade80" },
                        { label: "Más bajo",  val: j.min, color: P.red    },
                        { label: "Promedio",  val: j.avg, color: c        },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ background: "#1a1a1a", border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: P.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "monospace" }}>{fmt(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </main>
    </div>
  );
}

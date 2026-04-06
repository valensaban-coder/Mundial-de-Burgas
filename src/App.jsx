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
  { id: "sira",   name: "Sira",   emoji: "👩‍⚖️" },
  { id: "agusto", name: "Agusto", emoji: "🧔"   },
  { id: "valen",  name: "Valen",  emoji: "🧑‍💻" },
  { id: "male",   name: "Male",   emoji: "👩‍⚕️" },
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

const eScores  = () => Object.fromEntries(JUDGES.map(j => [j.id, ""]));
const eReviews = () => Object.fromEntries(JUDGES.map(j => [j.id, ""]));
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
function ScoreBadge({ value }) {
  const s = typeof value === "number" ? value : parse(value);
  const { c, bg, b } = scoreGold(s);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 48, padding: "4px 8px", borderRadius: 6,
      background: bg, color: c, border: `1px solid ${b}`,
      fontSize: 13, fontWeight: 700, fontFamily: "monospace", letterSpacing: .5,
    }}>
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

function ReviewAccordion({ judge, review }) {
  const [open, setOpen] = useState(false);
  if (!review) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: `1px solid ${P.border}`, borderRadius: 6,
          color: P.muted, fontSize: 12, cursor: "pointer", padding: "4px 10px",
          display: "flex", alignItems: "center", gap: 5,
          transition: "border-color .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = P.gold}
        onMouseLeave={e => e.currentTarget.style.borderColor = P.border}
      >
        {judge.emoji} reseña de {judge.name} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{
          marginTop: 6, padding: "10px 14px",
          background: "#1e1e1e", borderLeft: `3px solid ${P.gold}`,
          borderRadius: "0 8px 8px 0", fontSize: 13, color: "#ccc",
          lineHeight: 1.7, fontFamily: "'Lora', serif", fontStyle: "italic",
        }}>
          "{review}"
        </div>
      )}
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
  const [burgers, setBurgers]     = useState([]);
  const [syncStatus, setSyncStatus] = useState("loading");
  const [form, setForm]           = useState({ name: "", scores: eScores(), reviews: eReviews() });
  const [editId, setEditId]       = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [delId, setDelId]         = useState(null);
  const [judgeTab, setJudgeTab]   = useState(JUDGES[0].id);
  const [mainTab, setMainTab]     = useState("agregar");
  const saveTimeout               = useRef(null);

  /* ── Load from JSONBin on mount ── */
  useEffect(() => {
    if (!BIN_KEY || !BIN_ID) {
      setSyncStatus("error");
      return;
    }
    setSyncStatus("loading");
    fetchRemote()
      .then(data => { setBurgers(data); setSyncStatus("ok"); })
      .catch(() => setSyncStatus("error"));
  }, []);

  /* ── Debounced push to JSONBin ── */
  const persistAndSync = useCallback((next) => {
    setBurgers(next);
    // optimistic UI — show saving immediately
    setSyncStatus("saving");
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      pushRemote(next)
        .then(() => setSyncStatus("ok"))
        .catch(() => setSyncStatus("error"));
    }, 600);
  }, []);

  /* ── Validation ── */
  const errors = {};
  JUDGES.forEach(j => {
    const raw = form.scores[j.id];
    if (submitted && !raw && raw !== 0) { errors[j.id] = "Falta"; return; }
    if (raw && parse(raw) === null) errors[j.id] = "0–10";
  });

  const allScored  = JUDGES.every(j => parse(form.scores[j.id]) !== null);
  const canSubmit  = form.name.trim() && allScored && !Object.keys(errors).length;
  const previewAvg = allScored
    ? calcAvg(Object.fromEntries(JUDGES.map(j => [j.id, parse(form.scores[j.id])])))
    : null;
  const activeJ = JUDGES.find(j => j.id === judgeTab);

  /* ── Handlers ── */
  const handleSubmit = () => {
    setSubmitted(true);
    if (!canSubmit) return;
    const entry = {
      id: editId || Date.now(),
      name: form.name.trim(),
      scores: Object.fromEntries(JUDGES.map(j => [j.id, parse(form.scores[j.id])])),
      reviews: { ...form.reviews },
    };
    const next = editId
      ? burgers.map(b => b.id === editId ? entry : b)
      : [...burgers, entry];
    persistAndSync(next);
    setForm({ name: "", scores: eScores(), reviews: eReviews() });
    setEditId(null); setSubmitted(false); setJudgeTab(JUDGES[0].id);
    setMainTab("tabla");
  };

  const handleEdit = (b) => {
    setEditId(b.id);
    setForm({
      name: b.name,
      scores: Object.fromEntries(JUDGES.map(j => [j.id, String(b.scores[j.id] ?? "").replace(".", ",")])),
      reviews: { ...b.reviews },
    });
    setSubmitted(false); setJudgeTab(JUDGES[0].id); setMainTab("agregar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    persistAndSync(burgers.filter(b => b.id !== id));
    setDelId(null);
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ name: "", scores: eScores(), reviews: eReviews() });
    setSubmitted(false);
  };

  /* ── Refresh manual ── */
  const handleRefresh = () => {
    setSyncStatus("loading");
    fetchRemote()
      .then(data => { setBurgers(data); setSyncStatus("ok"); })
      .catch(() => setSyncStatus("error"));
  };

  const sorted = [...burgers].sort((a, b) => (calcAvg(b.scores) ?? 0) - (calcAvg(a.scores) ?? 0));

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: P.carbon, color: P.bone, fontFamily: "'Barlow', sans-serif" }}>

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
          ⚽ Copa Jurado 2025 ⚽
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
            { id: "agregar", icon: "➕", label: editId ? "Editando" : "Agregar" },
            { id: "tabla",   icon: "🏆", label: `Tabla${burgers.length ? ` · ${burgers.length}` : ""}` },
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

            {/* Offline warning */}
            {syncStatus === "error" && (
              <div style={{ background: "rgba(178,34,34,.12)", border: `1px solid rgba(178,34,34,.4)`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171", display: "flex", gap: 8 }}>
                <span>⚠️</span>
                <span>Sin conexión con el servidor. Los cambios se guardarán cuando vuelva la conexión. Revisá las variables de entorno en Vercel.</span>
              </div>
            )}

            {editId && (
              <div style={{ background: "rgba(212,175,55,.08)", border: `1px solid rgba(212,175,55,.3)`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: P.gold, fontWeight: 600, display: "flex", gap: 8 }}>
                <span>✏️</span><span>Editando: <strong>{form.name || "—"}</strong></span>
              </div>
            )}

            <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
              {/* Card header */}
              <div style={{ background: "#1e1e1e", borderBottom: `1px solid ${P.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: P.gold, fontSize: 20 }}>🍔</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P.bone }}>
                  {editId ? "Editar hamburguesería" : "Nueva hamburguesería"}
                </span>
              </div>

              <div style={{ padding: "20px" }}>

                {/* Nombre */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: P.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                    Nombre del local
                  </label>
                  <input
                    className="mh-input"
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
                  {submitted && !form.name.trim() && (
                    <span style={{ color: P.red, fontSize: 12, marginTop: 5, display: "block" }}>⚠ Ingresá el nombre</span>
                  )}
                </div>

                {/* Judge tabs */}
                <div style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: P.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                    Puntaje por jurado
                  </label>

                  {/* Tab strip */}
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 16 }}>
                    {JUDGES.map(j => {
                      const s   = parse(form.scores[j.id]);
                      const err = errors[j.id];
                      const act = judgeTab === j.id;
                      return (
                        <button key={j.id} className="mh-judge-btn" onClick={() => setJudgeTab(j.id)} style={{
                          flexShrink: 0,
                          padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                          border: `1.5px solid ${err ? P.red : act ? P.gold : s !== null ? "rgba(212,175,55,.35)" : P.border}`,
                          background: act ? "rgba(212,175,55,.1)" : "transparent",
                          color: err ? P.red : act ? P.gold : s !== null ? "#c9a830" : P.muted,
                          fontSize: 13, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                        }}>
                          <span>{j.emoji}</span>
                          <span>{j.name}</span>
                          {s !== null && !err && (
                            <span style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(212,175,55,.15)", color: P.gold, borderRadius: 4, padding: "1px 6px" }}>
                              {fmt(s)}
                            </span>
                          )}
                          {err && <span>⚠️</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active judge panel */}
                  <div style={{ background: "#1a1a1a", border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.gold}`, borderRadius: "0 12px 12px 0", padding: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                      <span style={{ fontSize: 36, lineHeight: 1, filter: "drop-shadow(0 0 8px rgba(212,175,55,.3))" }}>{activeJ.emoji}</span>
                      <div>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: P.gold }}>{activeJ.name}</div>
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
                          value={form.scores[activeJ.id]}
                          onChange={e => setForm(f => ({ ...f, scores: { ...f.scores, [activeJ.id]: e.target.value } }))}
                          placeholder="8,50"
                          maxLength={5}
                          style={{
                            width: 90, padding: "12px",
                            background: "#111",
                            border: `1.5px solid ${errors[activeJ.id] ? P.red : form.scores[activeJ.id] ? P.gold : P.border}`,
                            borderRadius: 10,
                            color: scoreGold(parse(form.scores[activeJ.id])).c,
                            fontSize: 24, fontWeight: 800, textAlign: "center", fontFamily: "monospace",
                          }}
                        />
                        <span style={{ color: P.dim, fontSize: 14 }}>/10</span>
                        {errors[activeJ.id] && <span style={{ color: P.red, fontSize: 12, fontWeight: 600 }}>⚠ {errors[activeJ.id]}</span>}
                        {parse(form.scores[activeJ.id]) !== null && !errors[activeJ.id] && (
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: scoreGold(parse(form.scores[activeJ.id])).c }}>
                            {scoreLabel(parse(form.scores[activeJ.id]))}
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
                        value={form.reviews[activeJ.id]}
                        onChange={e => setForm(f => ({ ...f, reviews: { ...f.reviews, [activeJ.id]: e.target.value } }))}
                        placeholder={`¿Qué te pareció, ${activeJ.name}? La carne, el pan, las salsas...`}
                        rows={3}
                        style={{
                          width: "100%", padding: "12px 14px",
                          background: "#111", border: `1.5px solid ${P.border}`,
                          borderRadius: 10, color: "#ddd", fontSize: 14, lineHeight: 1.6,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview promedio */}
                {previewAvg !== null && form.name.trim() && (
                  <div style={{ marginTop: 20, background: "rgba(212,175,55,.06)", border: `1px solid rgba(212,175,55,.2)`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, color: P.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Promedio actual</div>
                        <AvgBadge value={previewAvg} big />
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {JUDGES.map(j => { const s = parse(form.scores[j.id]); return s !== null ? (
                          <div key={j.id} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 20, marginBottom: 2 }}>{j.emoji}</div>
                            <ScoreBadge value={s} />
                          </div>
                        ) : null; })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button className="mh-btn-primary" onClick={handleSubmit} style={{
                    flex: 1, padding: "15px 20px",
                    background: `linear-gradient(135deg, ${P.gold}, #f0c840)`,
                    border: "none", borderRadius: 10,
                    color: "#111", fontSize: 14, fontWeight: 800, cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: 1.5,
                    boxShadow: "0 4px 20px rgba(212,175,55,.3)",
                  }}>
                    {editId ? "💾 Guardar" : "🏆 Agregar al mundial"}
                  </button>
                  {editId && (
                    <button onClick={handleCancel} style={{
                      padding: "15px 18px", background: "transparent",
                      border: `1px solid ${P.border}`, borderRadius: 10,
                      color: P.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                      Cancelar
                    </button>
                  )}
                </div>
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
                  const score = calcAvg(burger.scores);
                  const isTop = index === 0;
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
                        </div>
                        <AvgBadge value={score} big={false} />
                      </div>

                      {/* Judge scores grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: `1px solid ${P.border}` }}>
                        {JUDGES.map((j, ji) => (
                          <div key={j.id} style={{ padding: "10px 6px", textAlign: "center", borderRight: ji < 3 ? `1px solid ${P.border}` : "none" }}>
                            <div style={{ fontSize: 16, marginBottom: 4 }}>{j.emoji}</div>
                            <div style={{ fontSize: 11, color: P.muted, marginBottom: 4, fontWeight: 600 }}>{j.name}</div>
                            <ScoreBadge value={burger.scores[j.id]} />
                          </div>
                        ))}
                      </div>

                      {/* Reviews + actions */}
                      <div style={{ padding: "10px 16px 12px", borderTop: `1px solid ${P.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
                        {JUDGES.some(j => burger.reviews?.[j.id]) && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {JUDGES.map(j => burger.reviews?.[j.id]
                              ? <ReviewAccordion key={j.id} judge={j} review={burger.reviews[j.id]} />
                              : null
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={() => handleEdit(burger)}
                            style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${P.border}`, borderRadius: 7, color: P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = P.gold}
                            onMouseLeave={e => e.currentTarget.style.borderColor = P.border}
                          >
                            ✏️ Editar
                          </button>
                          {delId === burger.id ? (
                            <button onClick={() => handleDelete(burger.id)} onMouseLeave={() => setDelId(null)}
                              style={{ padding: "6px 14px", background: "rgba(178,34,34,.15)", border: `1px solid ${P.red}`, borderRadius: 7, color: P.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              Confirmar borrado
                            </button>
                          ) : (
                            <button onClick={() => setDelId(burger.id)}
                              style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${P.border}`, borderRadius: 7, color: P.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = P.red; e.currentTarget.style.color = P.red; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.muted; }}
                            >
                              🗑️ Borrar
                            </button>
                          )}
                        </div>
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
      </main>
    </div>
  );
}

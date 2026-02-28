import { useState, useEffect, useRef, useCallback } from "react";

// ─── CALORIE CALC ───────────────────────────────────────────────────────────
function calcCalories({ weightKg, ageYears, durationMin, distanceKm, pace }) {
  // MET-based estimate: running ~8-12 MET depending on pace (min/km)
  const paceNum = parseFloat(pace); // min/km
  const met = paceNum > 0 ? Math.max(6, Math.min(14, 90 / paceNum)) : 9;
  const hours = durationMin / 60;
  return Math.round(met * weightKg * hours);
}

// ─── ICON COMPONENTS ────────────────────────────────────────────────────────
const Icons = {
  Run: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="4" r="2"/><path d="M6 10l4-2 2 4 2-2 4 4M6 20l4-6 3 2 3-6"/>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
  Flame: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>
    </svg>
  ),
  Profile: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <polyline points="9,18 15,12 9,6"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  ),
};

// ─── MOCK ROUTES ────────────────────────────────────────────────────────────
const MOCK_ROUTES = [
  { id: 1, name: "River Loop", type: "scenic", distanceKm: 5.2, elevationM: 45, description: "Winding path along the riverbank with shade trees and wildlife viewpoints." },
  { id: 2, name: "City Sprint", type: "fast", distanceKm: 3.1, elevationM: 12, description: "Flat urban route through downtown — minimal crossings, optimized for pace." },
  { id: 3, name: "Ridge Trail", type: "scenic", distanceKm: 8.7, elevationM: 210, description: "Challenging hill path with panoramic city views at the summit." },
  { id: 4, name: "Park Express", type: "fast", distanceKm: 4.0, elevationM: 20, description: "Clean loop around the park perimeter — smooth pavement, well-lit." },
  { id: 5, name: "Lakeside Wander", type: "scenic", distanceKm: 6.5, elevationM: 30, description: "Peaceful waterfront path at sunrise or golden hour." },
];

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = ["routes", "run", "stats", "profile"];

export default function App() {
  const [tab, setTab] = useState("routes");
  const [profile, setProfile] = useState({ name: "Runner", weight: 70, age: 28, unitSystem: "metric" });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeFilter, setRouteFilter] = useState("all");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [pace, setPace] = useState("5.5"); // min/km
  const [runActive, setRunActive] = useState(false);
  const [runStartTime, setRunStartTime] = useState(null);
  const [runElapsed, setRunElapsed] = useState(0); // seconds
  const [runHistory, setRunHistory] = useState([]);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (runActive) {
      timerRef.current = setInterval(() => setRunElapsed(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [runActive]);

  const startRun = () => {
    setRunElapsed(0);
    setRunStartTime(new Date());
    setRunActive(true);
  };

  const stopRun = () => {
    setRunActive(false);
    const durationMin = runElapsed / 60;
    const distanceKm = selectedRoute ? selectedRoute.distanceKm : parseFloat(pace) * durationMin / 1000 || (durationMin * (parseFloat(pace) || 5.5) / (parseFloat(pace) || 5.5)) / (parseFloat(pace) || 5.5);
    const estimatedKm = selectedRoute ? selectedRoute.distanceKm : (durationMin / (parseFloat(pace) || 5.5));
    const cals = calcCalories({ weightKg: profile.weight, ageYears: profile.age, durationMin, distanceKm: estimatedKm, pace });
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      route: selectedRoute ? selectedRoute.name : "Custom",
      durationMin: Math.round(durationMin),
      distanceKm: parseFloat(estimatedKm.toFixed(2)),
      calories: cals,
      pace,
    };
    setRunHistory(h => [entry, ...h]);
    setTab("stats");
  };

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const previewCals = calcCalories({
    weightKg: profile.weight,
    ageYears: profile.age,
    durationMin: selectedRoute ? selectedRoute.distanceKm * parseFloat(pace || 5.5) : 30,
    distanceKm: selectedRoute ? selectedRoute.distanceKm : 5,
    pace: pace || 5.5,
  });

  const filtered = routeFilter === "all" ? MOCK_ROUTES : MOCK_ROUTES.filter(r => r.type === routeFilter);

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoMad}>MAD</span>
          <span style={styles.logoDash}>DASH</span>
        </div>
        <div style={styles.headerSub}>Health &amp; Lifestyle Tracker</div>
      </header>

      {/* Content */}
      <main style={styles.main}>
        {tab === "routes" && (
          <RoutesTab
            routes={filtered}
            filter={routeFilter}
            setFilter={setRouteFilter}
            selected={selectedRoute}
            setSelected={setSelectedRoute}
            startLocation={startLocation}
            setStartLocation={setStartLocation}
            endLocation={endLocation}
            setEndLocation={setEndLocation}
            onGoToRun={() => setTab("run")}
          />
        )}
        {tab === "run" && (
          <RunTab
            selectedRoute={selectedRoute}
            pace={pace}
            setPace={setPace}
            profile={profile}
            previewCals={previewCals}
            runActive={runActive}
            runElapsed={runElapsed}
            startRun={startRun}
            stopRun={stopRun}
            fmtTime={fmtTime}
          />
        )}
        {tab === "stats" && (
          <StatsTab history={runHistory} />
        )}
        {tab === "profile" && (
          <ProfileTab profile={profile} setProfile={setProfile} />
        )}
      </main>

      {/* Bottom Nav */}
      <nav style={styles.nav}>
        {[
          { id: "routes", label: "Routes", Icon: Icons.Map },
          { id: "run", label: "Run", Icon: Icons.Run },
          { id: "stats", label: "Stats", Icon: Icons.Flame },
          { id: "profile", label: "Profile", Icon: Icons.Profile },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            style={{ ...styles.navBtn, ...(tab === id ? styles.navBtnActive : {}) }}
            onClick={() => setTab(id)}
          >
            <Icon />
            <span style={styles.navLabel}>{label}</span>
            {tab === id && <span style={styles.navDot} />}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── ROUTES TAB ──────────────────────────────────────────────────────────────
function RoutesTab({ routes, filter, setFilter, selected, setSelected, startLocation, setStartLocation, endLocation, setEndLocation, onGoToRun }) {
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Choose Your Route</h2>

      {/* Location Inputs */}
      <div style={styles.card}>
        <div style={styles.cardLabel}>📍 LOCATIONS</div>
        <input
          style={styles.input}
          placeholder="Start location (e.g. 123 Main St)"
          value={startLocation}
          onChange={e => setStartLocation(e.target.value)}
        />
        <div style={styles.locationDivider}>
          <div style={styles.routeLine} />
          <span style={styles.arrowDown}>↓</span>
          <div style={styles.routeLine} />
        </div>
        <input
          style={styles.input}
          placeholder="End location (e.g. Central Park)"
          value={endLocation}
          onChange={e => setEndLocation(e.target.value)}
        />
        <div style={styles.mapPlaceholder}>
          <div style={styles.mapInner}>
            <span style={styles.mapIcon}>🗺️</span>
            <span style={styles.mapText}>Google Maps integration</span>
            <span style={styles.mapSub}>Add your API key in config.js to enable live maps</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={styles.filterRow}>
        {["all", "scenic", "fast"].map(f => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "scenic" ? "🌿 Scenic" : "⚡ Fast"}
          </button>
        ))}
      </div>

      {/* Route List */}
      <div style={styles.routeList}>
        {routes.map(route => (
          <button
            key={route.id}
            style={{ ...styles.routeCard, ...(selected?.id === route.id ? styles.routeCardSelected : {}) }}
            onClick={() => setSelected(route)}
          >
            <div style={styles.routeCardTop}>
              <div>
                <div style={styles.routeName}>{route.name}</div>
                <div style={styles.routeMeta}>
                  {route.distanceKm} km &nbsp;·&nbsp; ↑{route.elevationM}m
                  <span style={{ ...styles.routeTag, ...(route.type === "scenic" ? styles.tagScenic : styles.tagFast) }}>
                    {route.type === "scenic" ? "🌿 Scenic" : "⚡ Fast"}
                  </span>
                </div>
              </div>
              <Icons.ChevronRight />
            </div>
            <div style={styles.routeDesc}>{route.description}</div>
          </button>
        ))}
      </div>

      {selected && (
        <button style={styles.ctaBtn} onClick={onGoToRun}>
          Run {selected.name} →
        </button>
      )}
    </div>
  );
}

// ─── RUN TAB ─────────────────────────────────────────────────────────────────
function RunTab({ selectedRoute, pace, setPace, profile, previewCals, runActive, runElapsed, startRun, stopRun, fmtTime }) {
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>{selectedRoute ? selectedRoute.name : "Custom Run"}</h2>

      {/* Timer Display */}
      <div style={styles.timerCard}>
        <div style={styles.timerTime}>{fmtTime(runElapsed)}</div>
        <div style={styles.timerLabel}>{runActive ? "RUNNING" : "READY"}</div>
        <button
          style={{ ...styles.bigBtn, ...(runActive ? styles.bigBtnStop : {}) }}
          onClick={runActive ? stopRun : startRun}
        >
          {runActive ? <Icons.Stop /> : <Icons.Play />}
        </button>
      </div>

      {/* Inputs */}
      <div style={styles.card}>
        <div style={styles.cardLabel}>⚙️ RUN SETTINGS</div>
        <div style={styles.inputRow}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Pace (min/km)</label>
            <input
              style={styles.input}
              type="number"
              min="2" max="20" step="0.1"
              value={pace}
              onChange={e => setPace(e.target.value)}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Weight (kg)</label>
            <input style={{ ...styles.input, opacity: 0.6 }} value={profile.weight} readOnly />
          </div>
        </div>
        {selectedRoute && (
          <div style={styles.routeSummary}>
            <span>📏 {selectedRoute.distanceKm} km</span>
            <span>⏱ ~{Math.round(selectedRoute.distanceKm * parseFloat(pace || 5.5))} min</span>
          </div>
        )}
      </div>

      {/* Calorie Preview */}
      <div style={styles.calCard}>
        <div style={styles.calNum}>{previewCals}</div>
        <div style={styles.calLabel}>ESTIMATED CALORIES</div>
        <div style={styles.calSub}>Based on your weight ({profile.weight} kg) and pace ({pace} min/km)</div>
      </div>
    </div>
  );
}

// ─── STATS TAB ───────────────────────────────────────────────────────────────
function StatsTab({ history }) {
  const totalCals = history.reduce((a, r) => a + r.calories, 0);
  const totalKm = history.reduce((a, r) => a + r.distanceKm, 0);
  const totalMins = history.reduce((a, r) => a + r.durationMin, 0);

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Your Stats</h2>

      <div style={styles.statGrid}>
        <div style={styles.statBox}>
          <div style={styles.statNum}>{totalKm.toFixed(1)}</div>
          <div style={styles.statLabel}>Total km</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statNum}>{totalCals}</div>
          <div style={styles.statLabel}>Calories</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statNum}>{history.length}</div>
          <div style={styles.statLabel}>Runs</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statNum}>{totalMins}</div>
          <div style={styles.statLabel}>Minutes</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48 }}>🏃</div>
          <div style={{ color: "var(--text-muted)", marginTop: 12 }}>Complete your first run to see stats here!</div>
        </div>
      ) : (
        <div>
          <div style={styles.cardLabel}>🗓 RECENT RUNS</div>
          {history.map(run => (
            <div key={run.id} style={styles.historyCard}>
              <div style={styles.historyTop}>
                <span style={styles.historyRoute}>{run.route}</span>
                <span style={styles.historyDate}>{run.date}</span>
              </div>
              <div style={styles.historyMeta}>
                <span>📏 {run.distanceKm} km</span>
                <span>⏱ {run.durationMin} min</span>
                <span>🔥 {run.calories} cal</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile }) {
  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Your Profile</h2>

      <div style={styles.card}>
        <div style={styles.cardLabel}>👤 PERSONAL DATA</div>
        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>Name</label>
          <input style={styles.input} value={profile.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={styles.inputRow}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Age</label>
            <input style={styles.input} type="number" min="10" max="100" value={profile.age} onChange={e => set("age", parseInt(e.target.value))} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Weight (kg)</label>
            <input style={styles.input} type="number" min="30" max="250" value={profile.weight} onChange={e => set("weight", parseFloat(e.target.value))} />
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardLabel}>⚡ GOOGLE MAPS API</div>
        <input style={styles.input} placeholder="Paste your Google Maps API key here" />
        <div style={styles.apiNote}>
          Get a key at <strong>console.cloud.google.com</strong> → Maps JavaScript API. Paste it above to enable live route maps.
        </div>
      </div>

      <div style={styles.infoCard}>
        <div style={styles.cardLabel}>ℹ️ HOW CALORIES ARE CALCULATED</div>
        <p style={styles.infoText}>
          MadDash uses MET (Metabolic Equivalent of Task) values based on your running pace. 
          A faster pace (lower min/km) = higher MET = more calories burned per hour.
          <br/><br/>
          Formula: <strong>MET × weight(kg) × hours</strong>
          <br/>
          Pace adjusts MET from ~6 (slow jog) to ~14 (sprint).
        </p>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f",
  surface: "#13131a",
  surface2: "#1c1c27",
  accent: "#e8ff47",
  accent2: "#ff6b35",
  scenic: "#4ade80",
  fast: "#facc15",
  text: "#f0f0f8",
  muted: "#6b6b7e",
  border: "#2a2a3a",
};

const styles = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Mono', 'Courier New', monospace", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
  header: { padding: "24px 20px 12px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.bg} 0%, #0f0f1e 100%)` },
  logo: { fontSize: 28, letterSpacing: "-1px", lineHeight: 1 },
  logoMad: { color: C.accent, fontWeight: 900 },
  logoDash: { color: C.text, fontWeight: 300 },
  headerSub: { fontSize: 10, color: C.muted, letterSpacing: 3, marginTop: 4, textTransform: "uppercase" },
  main: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  tabContent: { padding: "20px 16px" },
  tabTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 20px", letterSpacing: "-0.5px" },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 12px" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 10, letterSpacing: 1, position: "relative", padding: "6px 0" },
  navBtnActive: { color: C.accent },
  navLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  navDot: { position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: "50%", background: C.accent },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 12 },
  input: { width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, padding: "10px 12px", boxSizing: "border-box", fontFamily: "inherit", outline: "none", marginBottom: 10 },
  inputRow: { display: "flex", gap: 10 },
  inputGroup: { flex: 1, display: "flex", flexDirection: "column" },
  inputLabel: { fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" },
  locationDivider: { display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px", color: C.muted },
  routeLine: { flex: 1, height: 1, background: C.border },
  arrowDown: { fontSize: 14 },
  mapPlaceholder: { background: C.surface2, borderRadius: 8, height: 160, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.border}`, marginTop: 4 },
  mapInner: { textAlign: "center" },
  mapIcon: { fontSize: 32, display: "block" },
  mapText: { fontSize: 13, color: C.text, marginTop: 8, display: "block" },
  mapSub: { fontSize: 11, color: C.muted, marginTop: 4, display: "block", maxWidth: 200 },
  filterRow: { display: "flex", gap: 8, marginBottom: 16 },
  filterBtn: { flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "8px 0", fontSize: 11, cursor: "pointer", letterSpacing: 1 },
  filterBtnActive: { background: C.accent, color: "#000", borderColor: C.accent, fontWeight: 700 },
  routeList: { display: "flex", flexDirection: "column", gap: 10 },
  routeCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, textAlign: "left", cursor: "pointer", color: C.text, width: "100%", transition: "all 0.15s" },
  routeCardSelected: { border: `2px solid ${C.accent}`, background: `${C.accent}11` },
  routeCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  routeName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  routeMeta: { fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 8 },
  routeTag: { fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, letterSpacing: 0.5 },
  tagScenic: { background: "#4ade8022", color: C.scenic },
  tagFast: { background: "#facc1522", color: C.fast },
  routeDesc: { fontSize: 12, color: C.muted, lineHeight: 1.5 },
  ctaBtn: { width: "100%", background: C.accent, color: "#000", fontWeight: 900, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", letterSpacing: 1, marginTop: 16, fontFamily: "inherit" },
  timerCard: { background: `linear-gradient(135deg, ${C.surface} 0%, #1a1a2e 100%)`, border: `1px solid ${C.border}`, borderRadius: 20, padding: "32px 20px", textAlign: "center", marginBottom: 20 },
  timerTime: { fontSize: 64, fontWeight: 900, letterSpacing: -2, color: C.accent, lineHeight: 1 },
  timerLabel: { fontSize: 11, letterSpacing: 4, color: C.muted, marginTop: 8, marginBottom: 24, textTransform: "uppercase" },
  bigBtn: { width: 72, height: 72, borderRadius: "50%", background: C.accent, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#000", transition: "transform 0.1s", boxShadow: `0 0 30px ${C.accent}66` },
  bigBtnStop: { background: "#ff4444", boxShadow: "0 0 30px #ff444466" },
  routeSummary: { display: "flex", gap: 20, fontSize: 13, color: C.muted, marginTop: 4 },
  calCard: { background: `linear-gradient(135deg, ${C.accent2}22, ${C.accent}11)`, border: `1px solid ${C.accent2}44`, borderRadius: 16, padding: 24, textAlign: "center" },
  calNum: { fontSize: 56, fontWeight: 900, color: C.accent2, letterSpacing: -2, lineHeight: 1 },
  calLabel: { fontSize: 10, letterSpacing: 3, color: C.muted, marginTop: 4, textTransform: "uppercase" },
  calSub: { fontSize: 11, color: C.muted, marginTop: 8 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 },
  statBox: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, textAlign: "center" },
  statNum: { fontSize: 32, fontWeight: 900, color: C.accent, letterSpacing: -1 },
  statLabel: { fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 },
  emptyState: { textAlign: "center", padding: "40px 20px", color: C.muted },
  historyCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 },
  historyTop: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  historyRoute: { fontWeight: 700, fontSize: 14 },
  historyDate: { fontSize: 11, color: C.muted },
  historyMeta: { display: "flex", gap: 16, fontSize: 12, color: C.muted },
  infoCard: { background: C.surface2, borderRadius: 12, padding: 16, marginBottom: 16 },
  apiNote: { fontSize: 11, color: C.muted, lineHeight: 1.6, marginTop: 4 },
  infoText: { fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 },
};

const globalCSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #0a0a0f; }
  input:focus { border-color: #e8ff47 !important; outline: none; }
  button:active { transform: scale(0.97); }
  :root { --text-muted: #6b6b7e; }
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
`;

import { useState, useEffect, useRef } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// ─── HAVERSINE DISTANCE ──────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── CALORIE CALC ────────────────────────────────────────────────────────────
function calcCalories({ weightKg, durationMin, distanceKm }) {
  const paceMinPerKm = distanceKm > 0 ? durationMin / distanceKm : 6;
  const met = Math.max(6, Math.min(14, 90 / paceMinPerKm));
  return Math.round(met * weightKg * (durationMin / 60));
}

// ─── LOAD GOOGLE MAPS SDK (once) ─────────────────────────────────────────────
let mapsPromise = null;
function loadGoogleMaps() {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mapsPromise;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icons = {
  Run: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="4" r="2"/><path d="M6 10l4-2 2 4 2-2 4 4M6 20l4-6 3 2 3-6"/></svg>),
  Map: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>),
  Flame: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>),
  Profile: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  ChevronRight: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="9,18 15,12 9,6"/></svg>),
  Play: () => (<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="5,3 19,12 5,21"/></svg>),
  Stop: () => (<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>),
  Location: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.25 8 13 8 13s8-7.75 8-13a8 8 0 00-8-8z"/></svg>),
};

// ─── PRESET MADISON ROUTES ───────────────────────────────────────────────────
const PRESET_ROUTES = [
  { id: 1, name: "Lakeshore Path", type: "scenic", distanceKm: 5.2, elevationM: 20, description: "Beautiful run along Lake Mendota past Memorial Union.", start: "Memorial Union, Madison, WI", end: "Picnic Point, Madison, WI" },
  { id: 2, name: "Capitol Loop", type: "fast", distanceKm: 3.8, elevationM: 15, description: "Fast flat loop around the Wisconsin State Capitol.", start: "Wisconsin State Capitol, Madison, WI", end: "Wisconsin State Capitol, Madison, WI" },
  { id: 3, name: "Monona Terrace Loop", type: "scenic", distanceKm: 6.5, elevationM: 30, description: "Scenic route along Lake Monona with city views.", start: "Monona Terrace, Madison, WI", end: "Olbrich Park, Madison, WI" },
  { id: 4, name: "UW Campus Sprint", type: "fast", distanceKm: 2.8, elevationM: 10, description: "Quick run through the UW Madison campus.", start: "Bascom Hall, Madison, WI", end: "Camp Randall Stadium, Madison, WI" },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("routes");
  const [profile, setProfile] = useState({ name: "Runner", weight: 70, age: 28 });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeFilter, setRouteFilter] = useState("all");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [pace, setPace] = useState("5.5");
  const [runActive, setRunActive] = useState(false);
  const [runElapsed, setRunElapsed] = useState(0);
  const [runHistory, setRunHistory] = useState([]);
  const [liveDistanceKm, setLiveDistanceKm] = useState(0);
  const [mapsReady, setMapsReady] = useState(false);
  const timerRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const gpsPathRef = useRef([]);

  useEffect(() => {
    loadGoogleMaps().then(() => setMapsReady(true)).catch(console.error);
  }, []);

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
    setLiveDistanceKm(0);
    gpsPathRef.current = [];
    setRunActive(true);
    if (navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const path = gpsPathRef.current;
          if (path.length > 0) {
            const last = path[path.length - 1];
            const added = haversineKm(last.lat, last.lng, latitude, longitude);
            setLiveDistanceKm(d => parseFloat((d + added).toFixed(3)));
          }
          gpsPathRef.current = [...path, { lat: latitude, lng: longitude }];
        },
        (err) => console.warn("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
  };

  const stopRun = () => {
    setRunActive(false);
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    const durationMin = runElapsed / 60;
    const distanceKm = liveDistanceKm > 0.05
      ? liveDistanceKm
      : selectedRoute ? selectedRoute.distanceKm : durationMin / parseFloat(pace || 5.5);
    const cals = calcCalories({ weightKg: profile.weight, durationMin, distanceKm });
    setRunHistory(h => [{
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      route: selectedRoute ? selectedRoute.name : "Custom Run",
      durationMin: Math.round(durationMin),
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      calories: cals,
      gpsTracked: liveDistanceKm > 0.05,
    }, ...h]);
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

  const livePace = runActive && liveDistanceKm > 0.05 && runElapsed > 0
    ? ((runElapsed / 60) / liveDistanceKm).toFixed(1)
    : pace;

  const previewCals = calcCalories({
    weightKg: profile.weight,
    durationMin: selectedRoute ? selectedRoute.distanceKm * parseFloat(pace || 5.5) : 30,
    distanceKm: selectedRoute ? selectedRoute.distanceKm : 30 / parseFloat(pace || 5.5),
  });

  const filtered = routeFilter === "all" ? PRESET_ROUTES : PRESET_ROUTES.filter(r => r.type === routeFilter);

  const selectPreset = (route) => {
    setSelectedRoute(route);
    setStartLocation(route.start);
    setEndLocation(route.end);
  };

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>
      <header style={styles.header}>
        <div style={styles.logo}><span style={styles.logoMad}>MAD</span><span style={styles.logoDash}>DASH</span></div>
        <div style={styles.headerSub}>Health &amp; Lifestyle Tracker · UW Madison</div>
      </header>
      <main style={styles.main}>
        {tab === "routes" && (
          <RoutesTab
            routes={filtered} filter={routeFilter} setFilter={setRouteFilter}
            selected={selectedRoute} onSelect={selectPreset}
            startLocation={startLocation} setStartLocation={setStartLocation}
            endLocation={endLocation} setEndLocation={setEndLocation}
            mapsReady={mapsReady} onGoToRun={() => setTab("run")}
          />
        )}
        {tab === "run" && (
          <RunTab
            selectedRoute={selectedRoute} pace={pace} setPace={setPace}
            profile={profile} previewCals={previewCals}
            runActive={runActive} runElapsed={runElapsed}
            liveDistanceKm={liveDistanceKm} livePace={livePace}
            startRun={startRun} stopRun={stopRun} fmtTime={fmtTime}
            mapsReady={mapsReady} startLocation={startLocation} endLocation={endLocation}
          />
        )}
        {tab === "stats" && <StatsTab history={runHistory} />}
        {tab === "profile" && <ProfileTab profile={profile} setProfile={setProfile} />}
      </main>
      <nav style={styles.nav}>
        {[
          { id: "routes", label: "Routes", Icon: Icons.Map },
          { id: "run",    label: "Run",    Icon: Icons.Run },
          { id: "stats",  label: "Stats",  Icon: Icons.Flame },
          { id: "profile",label: "Profile",Icon: Icons.Profile },
        ].map(({ id, label, Icon }) => (
          <button key={id} style={{ ...styles.navBtn, ...(tab === id ? styles.navBtnActive : {}) }} onClick={() => setTab(id)}>
            <Icon /><span style={styles.navLabel}>{label}</span>
            {tab === id && <span style={styles.navDot} />}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── MAP COMPONENT ────────────────────────────────────────────────────────────
function LiveMap({ startLocation, endLocation, mapsReady, height = 220 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);

  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;
    const maps = window.google.maps;
    const map = new maps.Map(mapRef.current, {
      center: { lat: 43.0731, lng: -89.4012 },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstanceRef.current = map;
    const renderer = new maps.DirectionsRenderer({
      polylineOptions: { strokeColor: "#9B0000", strokeWeight: 5 },
    });
    renderer.setMap(map);
    directionsRendererRef.current = renderer;
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !startLocation || !endLocation) return;
    const maps = window.google.maps;
    const svc = new maps.DirectionsService();
    svc.route({
      origin: startLocation,
      destination: endLocation,
      travelMode: maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === "OK") directionsRendererRef.current.setDirections(result);
    });
  }, [mapsReady, startLocation, endLocation]);

  if (!mapsReady) return (
    <div style={{ ...styles.mapPlaceholder, height }}>
      <div style={styles.mapInner}>
        <span style={styles.mapIcon}>🗺️</span>
        <span style={styles.mapText}>Loading Google Maps…</span>
      </div>
    </div>
  );

  return <div ref={mapRef} style={{ width: "100%", height, borderRadius: 10, overflow: "hidden", marginTop: 8 }} />;
}

// ─── PLACES AUTOCOMPLETE INPUT ────────────────────────────────────────────────
function PlacesInput({ value, onChange, placeholder, mapsReady }) {
  const inputRef = useRef(null);
  const acRef = useRef(null);

  useEffect(() => {
    if (!mapsReady || !inputRef.current || acRef.current) return;
    const maps = window.google.maps;
    acRef.current = new maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry"],
    });
    acRef.current.addListener("place_changed", () => {
      const place = acRef.current.getPlace();
      if (place.formatted_address) onChange(place.formatted_address);
    });
  }, [mapsReady]);

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <span style={styles.inputIcon}><Icons.Location /></span>
      <input
        ref={inputRef}
        style={{ ...styles.input, paddingLeft: 34, marginBottom: 0 }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── ROUTES TAB ───────────────────────────────────────────────────────────────
function RoutesTab({ routes, filter, setFilter, selected, onSelect, startLocation, setStartLocation, endLocation, setEndLocation, mapsReady, onGoToRun }) {
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Choose Your Route</h2>
      <div style={styles.card}>
        <div style={styles.cardLabel}>📍 Custom Locations</div>
        <PlacesInput value={startLocation} onChange={setStartLocation} placeholder="Start location" mapsReady={mapsReady} />
        <div style={styles.locationDivider}><div style={styles.routeLine} /><span style={styles.arrowDown}>↓</span><div style={styles.routeLine} /></div>
        <PlacesInput value={endLocation} onChange={setEndLocation} placeholder="End location" mapsReady={mapsReady} />
        <LiveMap startLocation={startLocation} endLocation={endLocation} mapsReady={mapsReady} />
      </div>
      <div style={styles.filterRow}>
        {["all", "scenic", "fast"].map(f => (
          <button key={f} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }} onClick={() => setFilter(f)}>
            {f === "all" ? "All Routes" : f === "scenic" ? "🌿 Scenic" : "⚡ Fast"}
          </button>
        ))}
      </div>
      <div style={styles.cardLabel}>🏃 Madison Preset Routes</div>
      <div style={styles.routeList}>
        {routes.map(route => (
          <button key={route.id} style={{ ...styles.routeCard, ...(selected?.id === route.id ? styles.routeCardSelected : {}) }} onClick={() => onSelect(route)}>
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
      {(selected || (startLocation && endLocation)) && (
        <button style={styles.ctaBtn} onClick={onGoToRun}>Start Running →</button>
      )}
    </div>
  );
}

// ─── RUN TAB ──────────────────────────────────────────────────────────────────
function RunTab({ selectedRoute, pace, setPace, profile, previewCals, runActive, runElapsed, liveDistanceKm, livePace, startRun, stopRun, fmtTime, mapsReady, startLocation, endLocation }) {
  const liveCals = calcCalories({ weightKg: profile.weight, durationMin: runElapsed / 60, distanceKm: Math.max(liveDistanceKm, 0.01) });

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>{selectedRoute ? selectedRoute.name : "Custom Run"}</h2>
      {(startLocation || selectedRoute) && (
        <div style={{ marginBottom: 16 }}>
          <LiveMap startLocation={startLocation || selectedRoute?.start} endLocation={endLocation || selectedRoute?.end} mapsReady={mapsReady} height={180} />
        </div>
      )}
      <div style={styles.timerCard}>
        <div style={styles.timerTime}>{fmtTime(runElapsed)}</div>
        <div style={styles.timerLabel}>{runActive ? "● RUNNING" : "READY TO RUN"}</div>
        {runActive && (
          <div style={styles.liveStatsRow}>
            <div style={styles.liveStat}><div style={styles.liveStatNum}>{liveDistanceKm.toFixed(2)}</div><div style={styles.liveStatLabel}>km</div></div>
            <div style={styles.liveStatDivider} />
            <div style={styles.liveStat}><div style={styles.liveStatNum}>{livePace}</div><div style={styles.liveStatLabel}>min/km</div></div>
            <div style={styles.liveStatDivider} />
            <div style={styles.liveStat}><div style={styles.liveStatNum}>{liveCals}</div><div style={styles.liveStatLabel}>cal</div></div>
          </div>
        )}
        <button style={{ ...styles.bigBtn, ...(runActive ? styles.bigBtnStop : {}) }} onClick={runActive ? stopRun : startRun}>
          {runActive ? <Icons.Stop /> : <Icons.Play />}
        </button>
        {runActive && <div style={styles.gpsNote}>📡 GPS tracking active</div>}
      </div>
      {!runActive && (
        <div style={styles.card}>
          <div style={styles.cardLabel}>⚙️ Run Settings</div>
          <div style={styles.inputRow}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Pace (min/km)</label>
              <input style={styles.input} type="number" min="2" max="20" step="0.1" value={pace} onChange={e => setPace(e.target.value)} />
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
      )}
      {!runActive && (
        <div style={styles.calCard}>
          <div style={styles.calNum}>{previewCals}</div>
          <div style={styles.calLabel}>Estimated Calories</div>
          <div style={styles.calSub}>Based on {profile.weight} kg · {pace} min/km</div>
        </div>
      )}
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ history }) {
  const totalCals = history.reduce((a, r) => a + r.calories, 0);
  const totalKm = history.reduce((a, r) => a + r.distanceKm, 0);
  const totalMins = history.reduce((a, r) => a + r.durationMin, 0);
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Your Stats</h2>
      <div style={styles.statGrid}>
        <div style={styles.statBox}><div style={styles.statNum}>{totalKm.toFixed(1)}</div><div style={styles.statLabel}>Total km</div></div>
        <div style={styles.statBox}><div style={styles.statNum}>{totalCals}</div><div style={styles.statLabel}>Calories</div></div>
        <div style={styles.statBox}><div style={styles.statNum}>{history.length}</div><div style={styles.statLabel}>Runs</div></div>
        <div style={styles.statBox}><div style={styles.statNum}>{totalMins}</div><div style={styles.statLabel}>Minutes</div></div>
      </div>
      {history.length === 0 ? (
        <div style={styles.emptyState}><div style={{ fontSize: 48 }}>🏃</div><div style={{ marginTop: 12 }}>Complete your first run to see stats!</div></div>
      ) : (
        <>
          <div style={styles.cardLabel}>🗓 Recent Runs</div>
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
                {run.gpsTracked && <span style={styles.gpsBadge}>📡 GPS</span>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile }) {
  const set = (k, v) => setProfile(p => ({ ...p, [k]: v }));
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Your Profile</h2>
      <div style={styles.card}>
        <div style={styles.cardLabel}>👤 Personal Data</div>
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
      <div style={styles.infoCard}>
        <div style={styles.cardLabel}>✅ Google Maps Status</div>
        <p style={styles.infoText}>
          API key is active. Maps, address autocomplete, and walking directions are all live.
          <br /><br />
          <strong>GPS tracking</strong> uses your browser's Geolocation API — allow location access when prompted for live distance tracking.
        </p>
      </div>
      <div style={styles.infoCard}>
        <div style={styles.cardLabel}>🧮 Calorie Formula</div>
        <p style={styles.infoText}>
          Uses MET (Metabolic Equivalent of Task) based on pace.<br />
          <strong>Calories = MET × weight(kg) × hours</strong><br />
          MET ranges 6–14 based on min/km. GPS distance is used when available.
        </p>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#faf7f4", surface: "#f2ede8", surface2: "#e9e2da",
  accent: "#9B0000", accentDark: "#6e0000", accentLight: "#f5eaea",
  scenic: "#4a7c59", text: "#2e2620", muted: "#8a7d75",
  border: "#ddd5cc", navBg: "#9B0000", headerBg: "#9B0000",
};

const styles = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Mono','Courier New',monospace", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
  header: { padding: "24px 20px 12px", borderBottom: `3px solid ${C.accentDark}`, background: C.headerBg },
  logo: { fontSize: 28, letterSpacing: "-1px", lineHeight: 1 },
  logoMad: { color: "#fff", fontWeight: 900 },
  logoDash: { color: "#ffd0d0", fontWeight: 300 },
  headerSub: { fontSize: 10, color: "#ffd0d0", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" },
  main: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  tabContent: { padding: "20px 16px" },
  tabTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 20px", letterSpacing: "-0.5px" },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.navBg, borderTop: `2px solid ${C.accentDark}`, display: "flex", padding: "8px 0 12px" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 10, letterSpacing: 1, position: "relative", padding: "6px 0" },
  navBtnActive: { color: "#fff" },
  navLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  navDot: { position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: "50%", background: "#fff" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 12 },
  input: { width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, padding: "10px 12px", boxSizing: "border-box", fontFamily: "inherit", outline: "none", marginBottom: 10 },
  inputIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none", display: "flex", alignItems: "center" },
  inputRow: { display: "flex", gap: 10 },
  inputGroup: { flex: 1, display: "flex", flexDirection: "column" },
  inputLabel: { fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" },
  locationDivider: { display: "flex", alignItems: "center", gap: 8, margin: "4px 0 10px", color: C.muted },
  routeLine: { flex: 1, height: 1, background: C.border },
  arrowDown: { fontSize: 14 },
  mapPlaceholder: { background: C.surface2, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${C.border}`, marginTop: 8 },
  mapInner: { textAlign: "center" },
  mapIcon: { fontSize: 32, display: "block" },
  mapText: { fontSize: 13, color: C.text, marginTop: 8, display: "block" },
  filterRow: { display: "flex", gap: 8, marginBottom: 12 },
  filterBtn: { flex: 1, background: C.surface, border: `1.5px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "8px 0", fontSize: 11, cursor: "pointer", letterSpacing: 1 },
  filterBtnActive: { background: C.accent, color: "#fff", borderColor: C.accent, fontWeight: 700 },
  routeList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  routeCard: { background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14, textAlign: "left", cursor: "pointer", color: C.text, width: "100%", transition: "all 0.15s" },
  routeCardSelected: { border: `2px solid ${C.accent}`, background: C.accentLight },
  routeCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  routeName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  routeMeta: { fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 8 },
  routeTag: { fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 },
  tagScenic: { background: "#e8f5ea", color: C.scenic },
  tagFast: { background: C.accentLight, color: C.accent },
  routeDesc: { fontSize: 12, color: C.muted, lineHeight: 1.5 },
  ctaBtn: { width: "100%", background: C.accent, color: "#fff", fontWeight: 900, fontSize: 15, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", letterSpacing: 1, marginTop: 4, fontFamily: "inherit", boxShadow: `0 4px 14px ${C.accent}44` },
  timerCard: { background: `linear-gradient(135deg,${C.accentLight} 0%,#fffaf9 100%)`, border: `2px solid ${C.accent}33`, borderRadius: 20, padding: "28px 20px", textAlign: "center", marginBottom: 20 },
  timerTime: { fontSize: 64, fontWeight: 900, letterSpacing: -2, color: C.accent, lineHeight: 1 },
  timerLabel: { fontSize: 11, letterSpacing: 4, color: C.muted, marginTop: 8, marginBottom: 20, textTransform: "uppercase" },
  liveStatsRow: { display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 20, background: "#fff", borderRadius: 12, padding: "12px 0", border: `1px solid ${C.border}` },
  liveStat: { flex: 1, textAlign: "center" },
  liveStatNum: { fontSize: 22, fontWeight: 900, color: C.accent },
  liveStatLabel: { fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
  liveStatDivider: { width: 1, height: 32, background: C.border },
  bigBtn: { width: 72, height: 72, borderRadius: "50%", background: C.accent, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "transform 0.1s", boxShadow: `0 0 24px ${C.accent}44` },
  bigBtnStop: { background: C.accentDark, boxShadow: `0 0 24px ${C.accentDark}44` },
  gpsNote: { fontSize: 11, color: C.muted, marginTop: 12 },
  routeSummary: { display: "flex", gap: 20, fontSize: 13, color: C.muted, marginTop: 4 },
  calCard: { background: `linear-gradient(135deg,${C.accentLight},#faf7f4)`, border: `1.5px solid ${C.accent}33`, borderRadius: 16, padding: 24, textAlign: "center" },
  calNum: { fontSize: 56, fontWeight: 900, color: C.accent, letterSpacing: -2, lineHeight: 1 },
  calLabel: { fontSize: 10, letterSpacing: 3, color: C.muted, marginTop: 4, textTransform: "uppercase" },
  calSub: { fontSize: 11, color: C.muted, marginTop: 8 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 },
  statBox: { background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, textAlign: "center" },
  statNum: { fontSize: 32, fontWeight: 900, color: C.accent, letterSpacing: -1 },
  statLabel: { fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 },
  emptyState: { textAlign: "center", padding: "40px 20px", color: C.muted },
  historyCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 },
  historyTop: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  historyRoute: { fontWeight: 700, fontSize: 14 },
  historyDate: { fontSize: 11, color: C.muted },
  historyMeta: { display: "flex", gap: 14, fontSize: 12, color: C.muted, flexWrap: "wrap" },
  gpsBadge: { background: C.accentLight, color: C.accent, fontSize: 10, padding: "1px 7px", borderRadius: 10, fontWeight: 600 },
  infoCard: { background: C.accentLight, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.accent}22` },
  infoText: { fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 },
};

const globalCSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #faf7f4; }
  input:focus { border-color: #9B0000 !important; outline: none; box-shadow: 0 0 0 3px rgba(155,0,0,0.10); }
  button:active { transform: scale(0.97); }
  .pac-container { font-family: 'DM Mono',monospace; border-radius: 8px; border: 1.5px solid #ddd5cc; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-top: 4px; }
  .pac-item { padding: 8px 12px; font-size: 13px; color: #2e2620; cursor: pointer; }
  .pac-item:hover, .pac-item-selected { background: #f5eaea; }
  .pac-matched { color: #9B0000; font-weight: 700; }
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
`;

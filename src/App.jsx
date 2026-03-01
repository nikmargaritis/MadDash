import { useState, useEffect, useRef, createContext, useContext } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const ThemeContext = createContext(null);
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}


// ─── UNIT CONVERSIONS ────────────────────────────────────────────────────────
const lbsToKg = (lbs) => lbs * 0.453592;
const miToKm  = (mi)  => mi  / 0.621371;

// ─── COORDINATE HELPERS ───────────────────────────────────────────────────────
/** Point at exactly oneWayMiles in direction (for path-based loop search). */
function pointInDirection(lat, lng, oneWayMiles, direction) {
  const milesPerDegLat = 69;
  const milesPerDegLng = 69 * Math.cos((lat * Math.PI) / 180);
  switch (direction) {
    case "N": return { lat: lat + oneWayMiles / milesPerDegLat, lng };
    case "S": return { lat: lat - oneWayMiles / milesPerDegLat, lng };
    case "E": return { lat, lng: lng + oneWayMiles / milesPerDegLng };
    case "W": return { lat, lng: lng - oneWayMiles / milesPerDegLng };
    default: return { lat, lng };
  }
}

function pointAtDistanceMi(lat, lng, distanceMi, direction) {
  const half = distanceMi / 2;
  return pointInDirection(lat, lng, half, direction);
}

// ─── HAVERSINE DISTANCE ──────────────────────────────────────────────────────
function haversineMi(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
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
function calcCalories({ weightLbs, durationMin, distanceMi }) {
  const weightKg = lbsToKg(weightLbs);
  const distanceKm = miToKm(distanceMi);
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
  Moon: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>),
  Sun: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>),
};

// ─── PRESET MADISON ROUTES ───────────────────────────────────────────────────
const PRESET_ROUTES = [
  { id: 1, name: "Lakeshore Path", type: "scenic", distanceMi: 3.2, elevationFt: 66, description: "Beautiful run along Lake Mendota past Memorial Union.", start: "Memorial Union, Madison, WI", end: "Picnic Point, Madison, WI" },
  { id: 2, name: "Capitol Loop", type: "fast", distanceMi: 2.4, elevationFt: 49, description: "Fast flat loop around the Wisconsin State Capitol.", start: "Wisconsin State Capitol, Madison, WI", end: "Wisconsin State Capitol, Madison, WI" },
  { id: 3, name: "Monona Terrace Loop", type: "scenic", distanceMi: 4.0, elevationFt: 98, description: "Scenic route along Lake Monona with city views.", start: "Monona Terrace, Madison, WI", end: "Olbrich Park, Madison, WI" },
  { id: 4, name: "UW Campus Sprint", type: "fast", distanceMi: 1.7, elevationFt: 33, description: "Quick run through the UW Madison campus.", start: "Bascom Hall, Madison, WI", end: "Camp Randall Stadium, Madison, WI" },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem("madDashDark")) === true; } catch { return false; }
  });
  const [tab, setTab] = useState("routes");
  const [profile, setProfile] = useState({ name: "Runner", weight: 155, age: 28 }); // weight in lbs
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeFilter, setRouteFilter] = useState("all");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [customDistanceMi, setCustomDistanceMi] = useState("3");
  const [customDirection, setCustomDirection] = useState("N");
  const [pace, setPace] = useState("9.0"); // min/mile
  const [runActive, setRunActive] = useState(false);
  const [runElapsed, setRunElapsed] = useState(0);
  const [runHistory, setRunHistory] = useState([]);
  const [liveDistanceMi, setLiveDistanceMi] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapsReady, setMapsReady] = useState(false);
  const timerRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const gpsPathRef = useRef([]);
  const liveDistanceRef = useRef(0);

  useEffect(() => {
    localStorage.setItem("madDashDark", JSON.stringify(darkMode));
  }, [darkMode]);

  const theme = darkMode ? darkTheme : lightTheme;
  const styles = getStyles(theme);
  const themeValue = { styles, darkMode, setDarkMode };

  useEffect(() => {
    loadGoogleMaps().then(() => setMapsReady(true)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const handlePosition = (pos) => {
      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };
    navigator.geolocation.getCurrentPosition(handlePosition, () => {}, { enableHighAccuracy: true });
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
    setLiveDistanceMi(0);
    liveDistanceRef.current = 0;
    gpsPathRef.current = [];
    setRunActive(true);
    if (navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          const path = gpsPathRef.current;
          if (path.length > 0) {
            const last = path[path.length - 1];
            const added = haversineMi(last.lat, last.lng, latitude, longitude);
            const newTotal = parseFloat((liveDistanceRef.current + added).toFixed(3));
            liveDistanceRef.current = newTotal;
            setLiveDistanceMi(newTotal);
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
    const bothCurrent = typeof startLocation === "object" && typeof endLocation === "object" && startLocation?.lat != null;
    const customDist = parseFloat(customDistanceMi) || 3;
    const distanceMi = liveDistanceMi > 0.05
      ? liveDistanceMi
      : selectedRoute ? selectedRoute.distanceMi : bothCurrent ? customDist : durationMin / parseFloat(pace || 9.0);
    const cals = calcCalories({ weightLbs: profile.weight, durationMin, distanceMi });
    const routeName = selectedRoute ? selectedRoute.name : bothCurrent ? `Personalized Run (${customDist} mi)` : "Custom Run";
    setRunHistory(h => [{
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      route: routeName,
      durationMin: Math.round(durationMin),
      distanceMi: parseFloat(distanceMi.toFixed(2)),
      calories: cals,
      gpsTracked: liveDistanceMi > 0.05,
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

  const livePace = runActive && liveDistanceMi > 0.05 && runElapsed > 0
    ? ((runElapsed / 60) / liveDistanceMi).toFixed(1)
    : pace;

  const bothCurrentForPreview = typeof startLocation === "object" && typeof endLocation === "object" && startLocation?.lat != null;
  const effectiveDistForPreview = selectedRoute ? selectedRoute.distanceMi : bothCurrentForPreview ? (parseFloat(customDistanceMi) || 3) : 30 / parseFloat(pace || 9.0);
  const previewCals = calcCalories({
    weightLbs: profile.weight,
    durationMin: effectiveDistForPreview * parseFloat(pace || 9.0),
    distanceMi: effectiveDistForPreview,
  });

  const filtered = routeFilter === "all" ? PRESET_ROUTES : PRESET_ROUTES.filter(r => r.type === routeFilter);

  const selectPreset = (route) => {
    setSelectedRoute(route);
    setStartLocation(route.start);
    setEndLocation(route.end);
  };

  return (
    <ThemeContext.Provider value={themeValue}>
    <div style={styles.app} data-theme={darkMode ? "dark" : "light"}>
      <style>{getGlobalCSS(darkMode)}</style>
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.logo}><span style={styles.logoMad}>MAD</span><span style={styles.logoDash}>DASH</span></div>
            <div style={styles.headerSub}>Health &amp; Lifestyle Tracker · UW Madison</div>
          </div>
          <button type="button" style={styles.themeBtn} onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            {darkMode ? <Icons.Sun /> : <Icons.Moon />}
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {tab === "routes" && (
          <RoutesTab
            routes={filtered} filter={routeFilter} setFilter={setRouteFilter}
            selected={selectedRoute} onSelect={selectPreset}
            startLocation={startLocation} setStartLocation={setStartLocation}
            endLocation={endLocation} setEndLocation={setEndLocation}
            mapsReady={mapsReady} onGoToRun={() => setTab("run")}
            currentLocation={currentLocation}
            customDistanceMi={customDistanceMi} setCustomDistanceMi={setCustomDistanceMi}
            customDirection={customDirection} setCustomDirection={setCustomDirection}
          />
        )}
        {tab === "run" && (
          <RunTab
            selectedRoute={selectedRoute} pace={pace} setPace={setPace}
            profile={profile} previewCals={previewCals}
            runActive={runActive} runElapsed={runElapsed}
            liveDistanceMi={liveDistanceMi} livePace={livePace}
            startRun={startRun} stopRun={stopRun} fmtTime={fmtTime}
            mapsReady={mapsReady} startLocation={startLocation} endLocation={endLocation}
            currentLocation={currentLocation}
            customDistanceMi={customDistanceMi} customDirection={customDirection}
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
    </ThemeContext.Provider>
  );
}

// ─── MAP COMPONENT ────────────────────────────────────────────────────────────
function LiveMap({ startLocation, endLocation, mapsReady, height = 220, currentLocation = null, outAndBack = false, loopTargetMi = 3, loopDirection = "N" }) {
  const { styles } = useTheme();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const polylineRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const [devicePosition, setDevicePosition] = useState(null);
  const [loopDirectionsResult, setLoopDirectionsResult] = useState(null);
  const loopSearchCancelRef = useRef(false);

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
    if (!navigator.geolocation) return;
    const handlePosition = (pos) => {
      setDevicePosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };
    navigator.geolocation.getCurrentPosition(handlePosition, () => {}, { enableHighAccuracy: true });
  }, [mapsReady]);

  const positionToShow = currentLocation ?? devicePosition;

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !positionToShow) return;
    if (currentMarkerRef.current) currentMarkerRef.current.setMap(null);
    const maps = window.google.maps;
    const marker = new maps.Marker({
      position: positionToShow,
      map: mapInstanceRef.current,
      title: "You are here",
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#9B0000",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
    });
    currentMarkerRef.current = marker;
    return () => {
      if (currentMarkerRef.current) currentMarkerRef.current.setMap(null);
    };
  }, [mapsReady, positionToShow?.lat, positionToShow?.lng]);

  // Out-and-back loop: find turnaround so walking path (trails) ≈ loopTargetMi, then show directions
  useEffect(() => {
    if (!mapsReady || !outAndBack || typeof startLocation !== "object" || startLocation?.lat == null) {
      setLoopDirectionsResult(null);
      return;
    }
    const targetMi = Math.max(0.2, Math.min(26, parseFloat(loopTargetMi) || 3));
    const start = { lat: startLocation.lat, lng: startLocation.lng };
    loopSearchCancelRef.current = false;

    (async () => {
      let low = 0.05;
      let high = Math.min(targetMi, targetMi * 0.6);
      let bestResult = null;
      let bestDiff = Infinity;

      for (let iter = 0; iter < 12; iter++) {
        if (loopSearchCancelRef.current) return;
        const outMi = (low + high) / 2;
        const waypoint = pointInDirection(start.lat, start.lng, outMi, loopDirection);
        try {
          const maps = window.google.maps;
          const svc = new maps.DirectionsService();
          const result = await new Promise((resolve, reject) => {
            svc.route(
              {
                origin: start,
                destination: start,
                waypoints: [{ location: waypoint, stopover: true }],
                travelMode: maps.TravelMode.WALKING,
              },
              (res, status) => {
                if (status === "OK") resolve(res);
                else reject(new Error(status));
              }
            );
          });
          if (loopSearchCancelRef.current) return;
          const totalMeters = result.routes[0].legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
          const totalMi = totalMeters / 1609.34;
          const diff = Math.abs(totalMi - targetMi);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestResult = result;
          }
          if (diff < 0.08) break;
          if (totalMi < targetMi) low = outMi;
          else high = outMi;
        } catch {
          high = outMi;
        }
      }
      if (!loopSearchCancelRef.current && bestResult) setLoopDirectionsResult(bestResult);
    })();

    return () => {
      loopSearchCancelRef.current = true;
    };
  }, [mapsReady, outAndBack, startLocation?.lat, startLocation?.lng, loopTargetMi, loopDirection]);

  useEffect(() => {
    if (!mapInstanceRef.current || !directionsRendererRef.current) return;
    if (outAndBack && loopDirectionsResult) {
      directionsRendererRef.current.setDirections(loopDirectionsResult);
    } else if (outAndBack) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }
  }, [outAndBack, loopDirectionsResult]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !startLocation || !endLocation || outAndBack) return;
    const origin = typeof startLocation === "object" && startLocation?.lat != null ? startLocation : startLocation;
    const destination = typeof endLocation === "object" && endLocation?.lat != null ? endLocation : endLocation;
    const maps = window.google.maps;
    const svc = new maps.DirectionsService();
    svc.route({
      origin,
      destination,
      travelMode: maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === "OK") directionsRendererRef.current.setDirections(result);
    });
  }, [mapsReady, startLocation, endLocation, outAndBack]);

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
  const { styles } = useTheme();
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
function RoutesTab({ routes, filter, setFilter, selected, onSelect, startLocation, setStartLocation, endLocation, setEndLocation, mapsReady, onGoToRun, currentLocation, customDistanceMi, setCustomDistanceMi, customDirection, setCustomDirection }) {
  const { styles } = useTheme();
  const bothCurrent = typeof startLocation === "object" && typeof endLocation === "object" && startLocation?.lat != null && endLocation?.lat != null;
  const originForMap = startLocation;
  const destForMap = bothCurrent && currentLocation
    ? pointAtDistanceMi(currentLocation.lat, currentLocation.lng, parseFloat(customDistanceMi) || 3, customDirection)
    : endLocation;

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Choose Your Route</h2>
      <div style={styles.card}>
        <div style={styles.cardLabel}>📍 Custom Locations</div>
        <div style={{ marginBottom: 10 }}>
          <PlacesInput
            value={typeof startLocation === "object" ? "Current position" : (startLocation || "")}
            onChange={(v) => setStartLocation(v)}
            placeholder="Start location"
            mapsReady={mapsReady}
          />
          <button
            type="button"
            style={{ ...styles.useCurrentBtn, opacity: currentLocation ? 1 : 0.5, cursor: currentLocation ? "pointer" : "not-allowed" }}
            onClick={() => currentLocation && setStartLocation(currentLocation)}
            disabled={!currentLocation}
          >
            📍 Use current position
          </button>
        </div>
        <div style={styles.locationDivider}><div style={styles.routeLine} /><span style={styles.arrowDown}>↓</span><div style={styles.routeLine} /></div>
        <div style={{ marginBottom: 10 }}>
          <PlacesInput
            value={typeof endLocation === "object" ? "Current position" : (endLocation || "")}
            onChange={(v) => setEndLocation(v)}
            placeholder="End location"
            mapsReady={mapsReady}
          />
          <button
            type="button"
            style={{ ...styles.useCurrentBtn, opacity: currentLocation ? 1 : 0.5, cursor: currentLocation ? "pointer" : "not-allowed" }}
            onClick={() => currentLocation && setEndLocation(currentLocation)}
            disabled={!currentLocation}
          >
            📍 Use current position
          </button>
        </div>
        {bothCurrent && (
          <div style={styles.customRouteCard}>
            <div style={styles.cardLabel}>📏 Personalized Route (out &amp; back)</div>
            <div style={{ marginBottom: 10 }}>
              <label style={styles.inputLabel}>Distance (miles)</label>
              <input
                style={styles.input}
                type="number"
                min="0.5"
                max="26"
                step="0.5"
                value={customDistanceMi}
                onChange={(e) => setCustomDistanceMi(e.target.value)}
              />
            </div>
            <div>
              <label style={styles.inputLabel}>Direction (turnaround point)</label>
              <div style={styles.directionRow}>
                {["N", "S", "E", "W"].map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    style={{ ...styles.directionBtn, ...(customDirection === dir ? styles.directionBtnActive : {}) }}
                    onClick={() => setCustomDirection(dir)}
                  >
                    {dir === "N" ? "⬆ North" : dir === "S" ? "⬇ South" : dir === "E" ? "➡ East" : "⬅ West"}
                  </button>
                ))}
              </div>
              <div style={styles.mutedText}>
                Run {(parseFloat(customDistanceMi) || 3) / 2} mi {customDirection === "N" ? "north" : customDirection === "S" ? "south" : customDirection === "E" ? "east" : "west"}, then return.
              </div>
            </div>
          </div>
        )}
        <LiveMap startLocation={originForMap} endLocation={destForMap} mapsReady={mapsReady} currentLocation={currentLocation} outAndBack={bothCurrent} loopTargetMi={customDistanceMi} loopDirection={customDirection} />
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
                  {route.distanceMi} mi &nbsp;·&nbsp; ↑{route.elevationFt} ft
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
function RunTab({ selectedRoute, pace, setPace, profile, previewCals, runActive, runElapsed, liveDistanceMi, livePace, startRun, stopRun, fmtTime, mapsReady, startLocation, endLocation, currentLocation, customDistanceMi, customDirection }) {
  const { styles } = useTheme();
  const liveCals = calcCalories({ weightLbs: profile.weight, durationMin: runElapsed / 60, distanceMi: Math.max(liveDistanceMi, 0.01) });
  const bothCurrent = typeof startLocation === "object" && typeof endLocation === "object" && startLocation?.lat != null && endLocation?.lat != null;
  const runOrigin = startLocation || selectedRoute?.start;
  const runDest = bothCurrent && currentLocation
    ? pointAtDistanceMi(currentLocation.lat, currentLocation.lng, parseFloat(customDistanceMi) || 3, customDirection)
    : (endLocation || selectedRoute?.end);
  const effectiveDistance = selectedRoute ? selectedRoute.distanceMi : (bothCurrent ? parseFloat(customDistanceMi) || 3 : null);

  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>{selectedRoute ? selectedRoute.name : bothCurrent ? "Personalized Run" : "Custom Run"}</h2>
      {(startLocation || selectedRoute) && (
        <div style={{ marginBottom: 16 }}>
          <LiveMap startLocation={runOrigin} endLocation={runDest} mapsReady={mapsReady} height={180} currentLocation={currentLocation} outAndBack={bothCurrent} loopTargetMi={customDistanceMi} loopDirection={customDirection} />
        </div>
      )}
      <div style={styles.timerCard}>
        <div style={styles.timerTime}>{fmtTime(runElapsed)}</div>
        <div style={styles.timerLabel}>{runActive ? "● RUNNING" : "READY TO RUN"}</div>
        {runActive && (
          <div style={styles.liveStatsRow}>
            <div style={styles.liveStat}><div style={styles.liveStatNum}>{liveDistanceMi.toFixed(2)}</div><div style={styles.liveStatLabel}>miles</div></div>
            <div style={styles.liveStatDivider} />
            <div style={styles.liveStat}><div style={styles.liveStatNum}>{livePace}</div><div style={styles.liveStatLabel}>min/mi</div></div>
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
              <label style={styles.inputLabel}>Pace (min/mi)</label>
              <input style={styles.input} type="number" min="4" max="30" step="0.1" value={pace} onChange={e => setPace(e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Weight (lbs)</label>
              <input style={{ ...styles.input, opacity: 0.6 }} value={profile.weight} readOnly />
            </div>
          </div>
          {(selectedRoute || effectiveDistance) && (
            <div style={styles.routeSummary}>
              <span>📏 {effectiveDistance} mi</span>
              <span>⏱ ~{Math.round(effectiveDistance * parseFloat(pace || 9.0))} min</span>
            </div>
          )}
        </div>
      )}
      {!runActive && (
        <div style={styles.calCard}>
          <div style={styles.calNum}>{previewCals}</div>
          <div style={styles.calLabel}>Estimated Calories</div>
          <div style={styles.calSub}>Based on {profile.weight} lbs · {pace} min/mi</div>
        </div>
      )}
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ history }) {
  const { styles } = useTheme();
  const totalCals = history.reduce((a, r) => a + r.calories, 0);
  const totalMi = history.reduce((a, r) => a + r.distanceMi, 0);
  const totalMins = history.reduce((a, r) => a + r.durationMin, 0);
  return (
    <div style={styles.tabContent}>
      <h2 style={styles.tabTitle}>Your Stats</h2>
      <div style={styles.statGrid}>
        <div style={styles.statBox}><div style={styles.statNum}>{totalMi.toFixed(1)}</div><div style={styles.statLabel}>Total mi</div></div>
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
                <span>📏 {run.distanceMi} mi</span>
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
  const { styles } = useTheme();
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
            <label style={styles.inputLabel}>Weight (lbs)</label>
            <input style={styles.input} type="number" min="66" max="550" value={profile.weight} onChange={e => set("weight", parseFloat(e.target.value))} />
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
          <strong>Calories = MET × weight(lbs) × hours</strong><br />
          MET ranges 6–14 based on min/mi. GPS distance is used when available.
        </p>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const lightTheme = {
  bg: "#faf7f4", surface: "#f2ede8", surface2: "#e9e2da",
  accent: "#9B0000", accentDark: "#6e0000", accentLight: "#f5eaea",
  scenic: "#4a7c59", text: "#2e2620", muted: "#8a7d75",
  border: "#ddd5cc", navBg: "#9B0000", headerBg: "#9B0000",
  inputBg: "#fff", timerGrad: "linear-gradient(135deg,#f5eaea 0%,#fffaf9 100%)",
  liveStatBg: "#fff", calGrad: "linear-gradient(135deg,#f5eaea,#faf7f4)",
  pacHover: "#f5eaea", pacMatch: "#9B0000",
};

const darkTheme = {
  bg: "#1a1a1a", surface: "#252525", surface2: "#2e2e2e",
  accent: "#c41e1e", accentDark: "#9B0000", accentLight: "#3d2020",
  scenic: "#5a9c6a", text: "#e8e4e0", muted: "#9a8f88",
  border: "#3d3832", navBg: "#9B0000", headerBg: "#9B0000",
  inputBg: "#2e2e2e", timerGrad: "linear-gradient(135deg,#3d2020 0%,#252525 100%)",
  liveStatBg: "#252525", calGrad: "linear-gradient(135deg,#3d2020,#1a1a1a)",
  pacHover: "#3d2020", pacMatch: "#e88",
};

function getStyles(C) {
  return {
    app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Mono','Courier New',monospace", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
    header: { padding: "24px 20px 12px", borderBottom: `3px solid ${C.accentDark}`, background: C.headerBg },
    logo: { fontSize: 28, letterSpacing: "-1px", lineHeight: 1 },
    logoMad: { color: "#fff", fontWeight: 900 },
    logoDash: { color: "#ffd0d0", fontWeight: 300 },
    headerSub: { fontSize: 10, color: "#ffd0d0", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" },
    headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
    themeBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 12 },
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
    mutedText: { fontSize: 11, color: C.muted, marginTop: 8 },
    input: { width: "100%", background: C.inputBg, border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, padding: "10px 12px", boxSizing: "border-box", fontFamily: "inherit", outline: "none", marginBottom: 10 },
    inputIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none", display: "flex", alignItems: "center" },
    useCurrentBtn: { marginTop: 6, padding: "6px 10px", fontSize: 12, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", opacity: 0.9 },
    customRouteCard: { background: C.accentLight, border: `1px solid ${C.accent}33`, borderRadius: 12, padding: 14, marginBottom: 16 },
    directionRow: { display: "flex", gap: 8, flexWrap: "wrap" },
    directionBtn: { flex: 1, minWidth: 70, padding: "8px 10px", fontSize: 12, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", letterSpacing: 1 },
    directionBtnActive: { background: C.accent, color: "#fff", borderColor: C.accent, fontWeight: 700 },
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
    timerCard: { background: C.timerGrad, border: `2px solid ${C.accent}33`, borderRadius: 20, padding: "28px 20px", textAlign: "center", marginBottom: 20 },
    timerTime: { fontSize: 64, fontWeight: 900, letterSpacing: -2, color: C.accent, lineHeight: 1 },
    timerLabel: { fontSize: 11, letterSpacing: 4, color: C.muted, marginTop: 8, marginBottom: 20, textTransform: "uppercase" },
    liveStatsRow: { display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 20, background: C.liveStatBg, borderRadius: 12, padding: "12px 0", border: `1px solid ${C.border}` },
    liveStat: { flex: 1, textAlign: "center" },
    liveStatNum: { fontSize: 22, fontWeight: 900, color: C.accent },
    liveStatLabel: { fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
    liveStatDivider: { width: 1, height: 32, background: C.border },
    bigBtn: { width: 72, height: 72, borderRadius: "50%", background: C.accent, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", transition: "transform 0.1s", boxShadow: `0 0 24px ${C.accent}44` },
    bigBtnStop: { background: C.accentDark, boxShadow: `0 0 24px ${C.accentDark}44` },
    gpsNote: { fontSize: 11, color: C.muted, marginTop: 12 },
    routeSummary: { display: "flex", gap: 20, fontSize: 13, color: C.muted, marginTop: 4 },
    calCard: { background: C.calGrad, border: `1.5px solid ${C.accent}33`, borderRadius: 16, padding: 24, textAlign: "center" },
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
}

const getGlobalCSS = (darkMode) => `
  * { box-sizing: border-box; }
  body { margin: 0; background: #faf7f4; }
  input:focus { border-color: ${darkMode ? "#c41e1e" : "#9B0000"} !important; outline: none; box-shadow: 0 0 0 3px ${darkMode ? "rgba(196,30,30,0.25)" : "rgba(155,0,0,0.10)"}; }
  button:active { transform: scale(0.97); }
  .pac-container { font-family: 'DM Mono',monospace; border-radius: 8px; border: 1.5px solid ${darkMode ? "#3d3832" : "#ddd5cc"}; box-shadow: 0 4px 20px rgba(0,0,0,0.2); margin-top: 4px; background: ${darkMode ? "#252525" : "#fff"}; }
  .pac-item { padding: 8px 12px; font-size: 13px; color: ${darkMode ? "#e8e4e0" : "#2e2620"}; cursor: pointer; }
  .pac-item:hover, .pac-item-selected { background: ${darkMode ? "#3d2020" : "#f5eaea"}; }
  .pac-matched { color: ${darkMode ? "#e88" : "#9B0000"}; font-weight: 700; }
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
`;

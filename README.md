# MadDash – Health & Lifestyle Run Tracker

A React app for tracking runs with route selection, calorie estimation, and Google Maps integration.

---

## Step-by-Step Setup

### Step 1 – Install Node.js
Download from https://nodejs.org (LTS version recommended, v18+).
Verify: `node -v` and `npm -v`

### Step 2 – Install Dependencies
Open a terminal in the `maddash-app` folder and run:
```bash
npm install
```

### Step 3 – Start the Dev Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser. You should see the MadDash app!

---

## Google Maps API Setup

### Step 4 – Get a Google Maps API Key
1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Go to **APIs & Services → Library**
4. Enable these APIs:
   - **Maps JavaScript API**
   - **Directions API**
   - **Places API** (for address autocomplete)
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Copy your new API key

### Step 5 – Add the API Key to the App
In `src/App.jsx`, find the Profile tab section and replace the placeholder input with your actual key, or create a `.env` file:

```bash
# .env file (in project root)
VITE_GOOGLE_MAPS_KEY=your_actual_key_here
```

Then in code, access it as: `import.meta.env.VITE_GOOGLE_MAPS_KEY`

### Step 6 – Enable Live Maps (Code Update)
In `src/App.jsx`, replace the `mapPlaceholder` div with real Google Maps:

```jsx
import { Loader } from '@googlemaps/js-api-loader';

// In your component:
useEffect(() => {
  const loader = new Loader({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: ['places', 'directions']
  });
  loader.load().then(() => {
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 40.7128, lng: -74.0060 },
      zoom: 13,
    });
    // Add DirectionsService for route drawing
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
  });
}, []);
```

---

## 📱 Features

| Feature | Status |
|--------|--------|
| Route selection (scenic / fast) | ✅ Working |
| Start / end location inputs | ✅ Working |
| Google Maps embed | 🔑 Needs API key |
| Live address autocomplete | 🔑 Needs Places API |
| Turn-by-turn directions | 🔑 Needs Directions API |
| Run timer (start/stop) | ✅ Working |
| Calorie estimator (MET-based) | ✅ Working |
| Run history & stats | ✅ Working |
| User profile (weight, age) | ✅ Working |
| GPS tracking (like Strava) | 🔧 See below |

---

## GPS Live Tracking (Strava-style)

To track the user while running:

```js
// Add to RunTab when run starts:
const watchId = navigator.geolocation.watchPosition(
  (pos) => {
    const { latitude, longitude } = pos.coords;
    // append to route polyline on map
    // calculate real distance from coordinates
  },
  (err) => console.error(err),
  { enableHighAccuracy: true, maximumAge: 0 }
);

// When run stops:
navigator.geolocation.clearWatch(watchId);
```

For full Strava-like tracking, consider:
- **Haversine formula** for distance between GPS points
- Storing coordinates array in state and drawing a polyline on the map
- Using the **Web Geolocation API** (works in browser, needs HTTPS in production)

---

## Build for Production
```bash
npm run build
```
Output goes to `/dist`. Deploy to Vercel, Netlify, or any static host.

---

## Calorie Formula
MadDash uses MET values (Metabolic Equivalent of Task):

```
MET ≈ 90 / pace_in_min_per_km   (clamped 6–14)
Calories = MET × weight_kg × duration_hours
```

Example: 70 kg runner, 5:30/km pace, 30 min = ~385 cal

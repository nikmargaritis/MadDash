# MadDash – Health & Lifestyle Run Tracker

A React app for tracking runs with route selection, calorie estimation, and Google Maps integration. Developed for runners around UW Madison.

---

## 🚀 Quick Start

### 1. Install Node.js
Download from https://nodejs.org (LTS version recommended, v18+).
Verify installation: `node -v` and `npm -v`

### 2. Install Dependencies
Open a terminal in the project folder and run:
```bash
npm install
```

### 3. Google Maps API Setup (Required for Maps)
To enable the map, route drawing, and location autocomplete features:
1. Create a `.env.local` file in the root directory.
2. Add your Google Maps API Key:
```bash
VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
```
*Note: Ensure your API key has the **Maps JavaScript API**, **Directions API**, and **Places API** enabled in Google Cloud Console.*

### 4. Start the Dev Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser to see MadDash!

---

## 📱 Features

| Feature | Description | Status |
|--------|-------------|--------|
| **Route Selection** | Choose from preset scenic/fast routes around Madison | ✅ Active |
| **Custom Routing** | Input custom start/end points using Google Places autocomplete | ✅ Active |
| **Personalized Loops** | Generate out-and-back routes of a specific distance & direction | ✅ Active |
| **Live Map Integration** | View your route visually using Google Maps SDK | ✅ Active |
| **Run Timer** | Start, pause, resume, and end runs with a precision timer | ✅ Active |
| **GPS Live Tracking** | Real-time distance tracking via browser Geolocation API | ✅ Active |
| **Calorie Estimator** | Dynamic MET-based calorie calculation using your pace and weight | ✅ Active |
| **Run History** | Save and rename completed runs, track total mileage and calories | ✅ Active |
| **Dark Mode** | Seamless light/dark theme toggling saved to local storage | ✅ Active |

---

## 🧮 How It Works

### GPS Live Tracking
When a run is started, the app uses `navigator.geolocation.watchPosition` to track the user's movement. It calculates the distance between GPS coordinates using the **Haversine formula** and accumulates the total distance traveled.

### Calorie Formula
MadDash uses MET values (Metabolic Equivalent of Task) based on the runner's pace:

```
Pace (min/km) = Duration(min) / Distance(km)
MET = 90 / Pace    (Clamped between 6 and 14)
Calories = MET × weight_kg × duration_hours
```

---

## 🛠 Tech Stack
- **Framework:** React + Vite
- **Styling:** Vanilla CSS-in-JS (Inline styles)
- **Maps:** Google Maps JavaScript API (Geocoding, Directions, Places)

---

## Build for Production
```bash
npm run build
```
Builds the app for production to the `/dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

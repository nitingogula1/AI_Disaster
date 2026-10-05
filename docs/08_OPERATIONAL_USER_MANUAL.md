# SentinelAid: Operational User Manual

## 1. Quick Start Guide for Emergency Commanders

```
                                  MISSION WORKFLOW
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │  1. DASHBOARD   │ ───► │ 2. DRONE RECON  │ ───► │ 3. ROUTE FINDER │
  │ Check Villagers │      │ Inspect with    │      │ Calculate Safe  │
  │ & Risk Levels   │      │ FLIR Thermal    │      │ Evacuation Path │
  └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Step 1: Assess Situational Awareness on the Dashboard
1. Open the browser to `http://localhost:5173/command`.
2. Scroll to the **"Affected Villages & Disaster Places Directory"** table.
3. Review locations marked with 🔴 **HIGH** risk badges.
4. Click **"Focus"** to fly the map camera directly to that village.

### Step 2: Launch Drone Reconnaissance
1. Click the blue button **"Open 3D Drone Recon HUD"** in the live drone section.
2. Observe the AI detection bounding boxes:
   * 🔴 Red: Trapped civilians on rooftops.
   * 🟢 Green: Safe helicopter/boat landing zones.
   * 🟠 Orange: Flooded highways.
3. Switch between **`RGB Optical`** (daylight) and **`FLIR Thermal IR`** (night / heat vision).
4. Click **"Dispatch Team to Locked Crosshairs"** to send immediate rescue coordinates.
5. Click **`✕`** to return to the command view.

### Step 3: Dispatch Rescue Vehicles along Safe Routes
1. In the village directory table, click the blue **"↗ Route"** button next to any village.
2. The Emergency Routes page will open with that village set as the destination.
3. Observe the route display:
   * 🟢 **Solid Green Line**: The verified safe, high-ground route.
   * 🔴 **Dashed Red Line**: The flooded road section that was bypassed.
4. Follow turn-by-turn navigation instructions in the left panel.

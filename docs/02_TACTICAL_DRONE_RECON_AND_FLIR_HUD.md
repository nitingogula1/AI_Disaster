# Tactical Drone Reconnaissance & FLIR Thermal HUD

## 1. Module Overview
The Tactical Drone Reconnaissance module provides emergency commanders with low-altitude, high-resolution aerial surveillance over areas cut off from satellite imagery due to dense monsoon cloud cover or steep mountain gorges.

---

## 2. Aerial Fleet Specifications
SentinelAid models multi-rotor and fixed-wing UAV assets:

| UAV Callsign | Airframe Type | Primary Sensor Payload | Endurance | Mission Profile |
| :--- | :--- | :--- | :--- | :--- |
| **UAV-EAGLE-01** | Heavy Quadcopter | Dual 4K Optical + FLIR Boson Thermal | 38 mins | Urban & village rooftop survivor triage |
| **UAV-FALCON-04** | Hybrid VTOL | LiDAR Depth Scanner + Optical Zoom | 55 mins | River valley corridor & embankment breach mapping |
| **UAV-HAWK-02** | Scout Drone | High-Frame-Rate Optical | 32 mins | Rapid forward road blockage verification |
| **SENTINEL-X** | Long-Range Drone | Multispectral NIR + Thermal | 70 mins | Regional watershed drainage monitoring |

---

## 3. Heads-Up Display (HUD) Architecture

### 3.1 Flight Dynamics & Telemetry Stream
The HUD overlays real-time flight metrics directly on the video feed:
* **ALT (Altitude)**: Expressed in meters Above Ground Level (`AGL`). Normal patrol altitude: 50m–120m.
* **SPD (Groundspeed)**: Current velocity in km/h.
* **GIMBAL PITCH**: Downward tilt angle of the gyro-stabilized sensor pod (-90° is straight nadir; -45° to -60° for forward reconnaissance).
* **RTK GPS LOCK**: Real-Time Kinematic positioning providing centimeter-accurate ground coordinates for target designation.
* **BATTERY RUNTIME**: Dynamic calculation of remaining flight minutes based on wind speed and current draw.

### 3.2 Dual-Spectrum Imaging Modes
* **`RGB Optical (4K)`**:
  * Daylight high-definition imagery.
  * Used for inspecting water turbulence, bridge structural fractures, mudslide debris, and civilian visual signals.
* **`FLIR Thermal IR (Infrared)`**:
  * Long-Wave Infrared (LWIR) calibrated to detect 36°C–38°C human body heat signatures.
  * Critical for nighttime search-and-rescue, locating survivors stranded under tin roofs, or spotting people trapped in forest canopies during heavy rain.

### 3.3 Computer Vision Target Locking & Bounding Boxes
The onboard edge neural network runs real-time object classification:
* 🔴 **SURVIVORS LOCK (Red)**: Identifies groups of stranded civilians with person count and neural confidence score (e.g. `SURVIVORS (35 SOULS) 98.4%`).
* 🟢 **DROP ZONE / LZ (Green)**: Detects elevated dry ground suitable for helicopter hoist operations or Zodiac boat docking.
* 🟠 **ROAD CUTOFF (Orange)**: Identifies submerged culverts, collapsed bridge approaches, and mud fissures, estimating standing water depth.

### 3.4 Direct Tactical Dispatch
Clicking **"Dispatch Team to Locked Crosshairs"** packages the locked GPS target coordinates into an immediate tactical dispatch order sent to ground rescue teams.

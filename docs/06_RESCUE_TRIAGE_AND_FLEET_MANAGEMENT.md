# Rescue Triage & Emergency Fleet Logistics

## 1. Rescue Priority Index Algorithm
The Rescue Priority Engine (`/command/rescue-priority`) continuously sorts stranded communities into an urgency queue (Priority 1 through 10) based on a weighted multi-factor formula:

$$\text{RPI} = w_1 \cdot D + w_2 \cdot \frac{dD}{dt} + w_3 \cdot P_v + w_4 \cdot C_{iso}$$

Where:
* $D$: Current standing water depth at location.
* $\frac{dD}{dt}$: Water rise velocity ($cm/hour$).
* $P_v$: Vulnerable civilian census (infants, elderly, hospital patients).
* $C_{iso}$: Isolation risk score (approaching nightfall, failing retaining walls, cut roads).

---

## 2. Fleet Asset Management
The Rescue Teams console (`/command/rescue-teams`) manages deployment tracking for diverse emergency units:

* **Zodiac Flood Rescue Craft**: Shallow-draft inflatable boats with outboard motors for urban water evacuation.
* **NDRF / APF Disaster Battalions**: Rapid-response tactical squads equipped with ropes, thermal cameras, and cutting gear.
* **Amphibious All-Terrain Vehicles (ATVs)**: High-clearance wheeled transports for traversing muddy terrains and road shoulders.
* **Helicopter Medical Evacuation (MEDEVAC)**: Air ambulances for airlift triage from isolated hill plateaus.

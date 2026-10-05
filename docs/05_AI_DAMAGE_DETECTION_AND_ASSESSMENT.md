# AI Damage Detection & Structural Damage Assessment

## 1. Neural Network Architecture
SentinelAid deploys deep learning computer vision models to perform automated post-disaster damage classification from aerial orthophotos and satellite passes.

* **Base Architecture**: Dual-Stream Siamese Convolutional Neural Network (ResNet-50 / UNet backbone).
* **Inputs**:
  * Stream A: Pre-disaster optical reference tile (cloud-free baseline).
  * Stream B: Post-disaster drone ortho-mosaic or satellite pass.
* **Output**: Pixel-wise structural change segmentation map.

---

## 2. Damage Grading Scale (EMS-98 & HAZUS Aligned)

| Damage Tier | Color Code | Structural Description | Action Requirement |
| :--- | :--- | :--- | :--- |
| **Destroyed / Collapse** | 🔴 **Red** | Complete structural failure, pancaked roof, foundation loss | Heavy search-and-rescue (USAR) deployment |
| **Major Damage** | 🟠 **Orange** | Wall fractures, partial roof collapse, structural unfitness | Immediate evacuation; cordon off perimeter |
| **Minor Damage** | 🟡 **Yellow** | Non-structural surface damage, window loss, minor water line | Secondary inspection |
| **Intact / Safe** | 🟢 **Green** | Undamaged foundation, roof intact, habitable | Potential community refuge site |

---

## 3. Damage Assessment Audit Census
On the **Damage Assessment** page (`/command/damage`):
* Aggregates total affected structures across residential, educational, commercial, and bridge infrastructure.
* Generates estimated replacement cost valuations and recovery resource allocations.

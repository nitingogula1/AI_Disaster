export interface DistrictVillage {
  id: string;
  name: string;
  tier: 'HIGH' | 'MEDIUM' | 'SAFE';
  hazard_reason: string;
  depth_m: number;
  population: number;
  stranded: number;
  status: string;
  lat: number;
  lng: number;
  bearing: string;
}

export const getDistrictVillages = (districtName: string, baseLat: number, baseLng: number): DistrictVillage[] => {
  const dLower = (districtName || '').toLowerCase();

  const isPakistan =
    dLower.includes('pakistan') ||
    dLower.includes('indus') ||
    dLower.includes('sindh') ||
    dLower.includes('manchar') ||
    dLower.includes('dadu') ||
    dLower.includes('sehwan') ||
    dLower.includes('johi') ||
    dLower.includes('bhan');

  const isWayanad =
    dLower.includes('wayanad') ||
    dLower.includes('kerala') ||
    dLower.includes('chooralmala') ||
    dLower.includes('meppadi') ||
    dLower.includes('mundakkai') ||
    dLower.includes('attamala');

  const isLibya =
    dLower.includes('libya') ||
    dLower.includes('derna') ||
    dLower.includes('cyrenaica') ||
    dLower.includes('daniel');

  const isAssam =
    dLower.includes('assam') ||
    dLower.includes('brahmaputra') ||
    dLower.includes('guwahati') ||
    dLower.includes('morigaon');

  const isFeni =
    dLower.includes('feni') ||
    dLower.includes('muhuri') ||
    dLower.includes('parshuram') ||
    dLower.includes('cumilla');

  const isSylhet =
    dLower.includes('sylhet') ||
    dLower.includes('surma') ||
    dLower.includes('fl88');

  const isRajam =
    dLower.includes('rajam') ||
    dLower.includes('srikakulam') ||
    dLower.includes('vizianagaram') ||
    dLower.includes('andhra');

  const isNepal =
    dLower.includes('nepal') ||
    dLower.includes('kathmandu') ||
    dLower.includes('trishuli') ||
    dLower.includes('nuwakot') ||
    dLower.includes('bagmati');

  const isRemal =
    dLower.includes('remal') ||
    dLower.includes('khulna') ||
    dLower.includes('mongla') ||
    dLower.includes('delta sector 4');

  if (isPakistan) {
    return [
      {
        id: 'vil-pak-1',
        name: 'Bhan Syedabad Lowlands',
        tier: 'HIGH',
        hazard_reason: 'Lake Manchar overflow surge. Water depth 1.85m. Arterial road to Dadu submerged.',
        depth_m: 1.85,
        population: 3200,
        stranded: 74,
        status: 'Inundated / Zodiac Rescue',
        lat: +(baseLat - 0.0150).toFixed(5),
        lng: +(baseLng - 0.0120).toFixed(5),
        bearing: '2.1 km SW'
      },
      {
        id: 'vil-pak-2',
        name: 'Lake Manchar Embankment Breach',
        tier: 'HIGH',
        hazard_reason: 'Catastrophic levee breach. Main canal surge reaching 2.30m depth. Rooftop isolations.',
        depth_m: 2.30,
        population: 1850,
        stranded: 52,
        status: 'Breach Surge / Aerial Winch',
        lat: +(baseLat - 0.0220).toFixed(5),
        lng: +(baseLng + 0.0180).toFixed(5),
        bearing: '2.8 km SE'
      },
      {
        id: 'vil-pak-3',
        name: 'Johi Western Ring Bund',
        tier: 'HIGH',
        hazard_reason: 'Ring bund under extreme hydraulic pressure (1.65m depth). Surrounding fields submerged.',
        depth_m: 1.65,
        population: 2400,
        stranded: 46,
        status: 'Ring Bund Breach Alert',
        lat: +(baseLat - 0.0080).toFixed(5),
        lng: +(baseLng - 0.0250).toFixed(5),
        bearing: '2.5 km West'
      },
      {
        id: 'vil-pak-4',
        name: 'Sehwan Sharif Buffer Ward',
        tier: 'MEDIUM',
        hazard_reason: 'Submerged street margins and stormwater backflow (0.65m depth). Tactical 4x4 trucks and tractors operating.',
        depth_m: 0.65,
        population: 4100,
        stranded: 0,
        status: 'Tactical 4x4 Passable',
        lat: +(baseLat + 0.0180).toFixed(5),
        lng: +(baseLng + 0.0150).toFixed(5),
        bearing: '2.3 km NE'
      },
      {
        id: 'vil-pak-5',
        name: 'Mehar Bypass Culvert Sector',
        tier: 'MEDIUM',
        hazard_reason: 'Agricultural floodway runoff crossing bypass road (0.45m depth). Caution pass advisory active.',
        depth_m: 0.45,
        population: 2900,
        stranded: 0,
        status: 'Passable with Caution',
        lat: +(baseLat + 0.0120).toFixed(5),
        lng: +(baseLng - 0.0180).toFixed(5),
        bearing: '2.0 km NW'
      },
      {
        id: 'vil-pak-6',
        name: 'Lal Shahbaz Elevated Ridge Haven',
        tier: 'SAFE',
        hazard_reason: 'Elevated limestone terrace (+45m MSL). Designated District Civilian Relief Camp & Field Hospital.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Primary Safe Haven & Hospital',
        lat: +(baseLat + 0.0350).toFixed(5),
        lng: +(baseLng + 0.0050).toFixed(5),
        bearing: '3.8 km North'
      },
      {
        id: 'vil-pak-7',
        name: 'Dadu Highway High-Ground Staging LZ',
        tier: 'SAFE',
        hazard_reason: 'Dry paved plateau with unobstructed approach for military helicopters and emergency relief trucks.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Helicopter LZ & Relief Depot',
        lat: +(baseLat + 0.0420).toFixed(5),
        lng: +(baseLng - 0.0100).toFixed(5),
        bearing: '4.5 km NW'
      }
    ];
  }

  if (isWayanad) {
    return [
      {
        id: 'vil-way-1',
        name: 'Chooralmala Debris Basin',
        tier: 'HIGH',
        hazard_reason: 'Major landslide mudflow & debris torrent. 2.40m silt and flood slurry. Main settlement obliterated.',
        depth_m: 2.40,
        population: 1650,
        stranded: 62,
        status: 'Debris Flow / Aerial Winch',
        lat: +(baseLat - 0.0080).toFixed(5),
        lng: +(baseLng - 0.0060).toFixed(5),
        bearing: '1.2 km SW'
      },
      {
        id: 'vil-way-2',
        name: 'Mundakkai Riverfront',
        tier: 'HIGH',
        hazard_reason: 'Iruvazhinji river torrential overflow. Bridge collapsed (2.10m torrent). Zip-line and boat transit only.',
        depth_m: 2.10,
        population: 1200,
        stranded: 48,
        status: 'Bridge Collapse / Zip-line Evac',
        lat: +(baseLat - 0.0120).toFixed(5),
        lng: +(baseLng + 0.0080).toFixed(5),
        bearing: '1.6 km SE'
      },
      {
        id: 'vil-way-3',
        name: 'Attamala Slope Cutoff',
        tier: 'HIGH',
        hazard_reason: 'Uphill roadway severed by slope failure (1.75m torrent). Families isolated on plantation ridge.',
        depth_m: 1.75,
        population: 890,
        stranded: 29,
        status: 'Hillside Cutoff Isolation',
        lat: +(baseLat - 0.0180).toFixed(5),
        lng: +(baseLng - 0.0040).toFixed(5),
        bearing: '2.0 km South'
      },
      {
        id: 'vil-way-4',
        name: 'Meppadi Town Center Buffer',
        tier: 'MEDIUM',
        hazard_reason: 'Storm runoff waterlogging town market avenues (0.55m depth). Tactical 4x4 trucks & NDRF active.',
        depth_m: 0.55,
        population: 3800,
        stranded: 0,
        status: 'Emergency 4x4 Active',
        lat: +(baseLat + 0.0120).toFixed(5),
        lng: +(baseLng + 0.0100).toFixed(5),
        bearing: '1.5 km NE'
      },
      {
        id: 'vil-way-5',
        name: 'Vellarimala Foothill Margin',
        tier: 'MEDIUM',
        hazard_reason: 'Stream overflow across tea plantation paths (0.40m depth). Cautionary foot patrols ongoing.',
        depth_m: 0.40,
        population: 1450,
        stranded: 0,
        status: 'Flash Flooding Watch',
        lat: +(baseLat + 0.0080).toFixed(5),
        lng: +(baseLng - 0.0140).toFixed(5),
        bearing: '1.7 km NW'
      },
      {
        id: 'vil-way-6',
        name: 'Meppadi Higher Secondary Shelter',
        tier: 'SAFE',
        hazard_reason: 'Solid concrete building on elevated ridge. Designated primary government relief camp and medical clinic.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'State Relief Camp & Triage',
        lat: +(baseLat + 0.0250).toFixed(5),
        lng: +(baseLng + 0.0180).toFixed(5),
        bearing: '3.1 km NE'
      },
      {
        id: 'vil-way-7',
        name: 'Kalpetta Upland Heli-Pad LZ',
        tier: 'SAFE',
        hazard_reason: 'High elevation tableland outside landslide zone. Military chopper logistics and air ambulance LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Military Chopper LZ Base',
        lat: +(baseLat + 0.0380).toFixed(5),
        lng: +(baseLng - 0.0100).toFixed(5),
        bearing: '4.2 km NW'
      }
    ];
  }

  if (isLibya) {
    return [
      {
        id: 'vil-lby-1',
        name: 'Wadi Derna Canyon Breach',
        tier: 'HIGH',
        hazard_reason: 'Upper Abu Mansur Dam collapse. Catastrophic torrent tearing through central urban spine (2.80m depth).',
        depth_m: 2.80,
        population: 2100,
        stranded: 85,
        status: 'Dam Breach Surge / Critical',
        lat: +(baseLat - 0.0060).toFixed(5),
        lng: +(baseLng - 0.0050).toFixed(5),
        bearing: '0.9 km SW'
      },
      {
        id: 'vil-lby-2',
        name: 'Al-Bilad Coastal Washout',
        tier: 'HIGH',
        hazard_reason: 'Old city center inundated by flash surge meeting sea backflow (2.20m depth). Buildings collapsed.',
        depth_m: 2.20,
        population: 1950,
        stranded: 54,
        status: 'Marine Inflow / Amphibious Rescues',
        lat: +(baseLat - 0.0090).toFixed(5),
        lng: +(baseLng + 0.0070).toFixed(5),
        bearing: '1.2 km SE'
      },
      {
        id: 'vil-lby-3',
        name: 'Al-Maghar Central Flats',
        tier: 'HIGH',
        hazard_reason: 'Lowland canyon fringe. 1.60m depth with thick mud silt deposit. Rescue teams navigating on foot/boat.',
        depth_m: 1.60,
        population: 1400,
        stranded: 38,
        status: 'Mud Inundation Isolation',
        lat: +(baseLat - 0.0030).toFixed(5),
        lng: +(baseLng + 0.0120).toFixed(5),
        bearing: '1.3 km East'
      },
      {
        id: 'vil-lby-4',
        name: 'Bab Tobruk Elevated Buffer',
        tier: 'MEDIUM',
        hazard_reason: 'Peripheral street runoff (0.45m depth). Military transports and 4x4 ambulances clearing avenues.',
        depth_m: 0.45,
        population: 3100,
        stranded: 0,
        status: 'Heavy Vehicles Passable',
        lat: +(baseLat + 0.0100).toFixed(5),
        lng: +(baseLng - 0.0080).toFixed(5),
        bearing: '1.4 km NW'
      },
      {
        id: 'vil-lby-5',
        name: 'Al-Jubailah Inflow Margin',
        tier: 'MEDIUM',
        hazard_reason: 'Wadi overflow waterlogging residential perimeters (0.35m depth). Sandbag barriers deployed.',
        depth_m: 0.35,
        population: 1800,
        stranded: 0,
        status: 'Barrier Monitored Zone',
        lat: +(baseLat + 0.0080).toFixed(5),
        lng: +(baseLng + 0.0150).toFixed(5),
        bearing: '1.7 km NE'
      },
      {
        id: 'vil-lby-6',
        name: 'Derna Western Plateau Hospital',
        tier: 'SAFE',
        hazard_reason: 'High bedrock bluff (+80m above sea level). Designated Red Crescent emergency surgical and triage hub.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Red Crescent Medical Base',
        lat: +(baseLat + 0.0220).toFixed(5),
        lng: +(baseLng - 0.0140).toFixed(5),
        bearing: '2.8 km NW'
      },
      {
        id: 'vil-lby-7',
        name: 'Al-Fatayah Uplands LZ',
        tier: 'SAFE',
        hazard_reason: 'Vast dry plateau with open airspace. Primary international helicopter relief operations LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Airforce Helicopter LZ',
        lat: +(baseLat + 0.0300).toFixed(5),
        lng: +(baseLng + 0.0200).toFixed(5),
        bearing: '3.6 km NE'
      }
    ];
  }

  if (isAssam) {
    return [
      {
        id: 'vil-asm-1',
        name: 'Guwahati Fringe Brahmaputra Buffer',
        tier: 'HIGH',
        hazard_reason: 'Brahmaputra river overtopping danger level by 1.95m. Lowland embankments breached.',
        depth_m: 1.95,
        population: 2600,
        stranded: 68,
        status: 'Overtopping Breach / Boat Rescues',
        lat: +(baseLat - 0.0120).toFixed(5),
        lng: +(baseLng - 0.0100).toFixed(5),
        bearing: '1.6 km SW'
      },
      {
        id: 'vil-asm-2',
        name: 'Morigaon Lowland Settlements',
        tier: 'HIGH',
        hazard_reason: 'Agricultural basin completely submerged (1.70m depth). Multiple families on bamboo lofts.',
        depth_m: 1.70,
        population: 1900,
        stranded: 45,
        status: 'Rooftop Stranded / Evacuate',
        lat: +(baseLat - 0.0180).toFixed(5),
        lng: +(baseLng + 0.0150).toFixed(5),
        bearing: '2.4 km SE'
      },
      {
        id: 'vil-asm-3',
        name: 'Pobitora Wetlands Fringe',
        tier: 'HIGH',
        hazard_reason: 'Wetland catchment surge inundating access corridors (1.50m depth). Inflatable motorized boats operating.',
        depth_m: 1.50,
        population: 1100,
        stranded: 28,
        status: 'Submerged Access Corridor',
        lat: +(baseLat - 0.0140).toFixed(5),
        lng: +(baseLng - 0.0220).toFixed(5),
        bearing: '2.6 km West'
      },
      {
        id: 'vil-asm-4',
        name: 'Chandrapur Approach Road',
        tier: 'MEDIUM',
        hazard_reason: 'Water logging across national highway margins (0.60m depth). Heavy 4x4 trucks passing with escort.',
        depth_m: 0.60,
        population: 2200,
        stranded: 0,
        status: '4x4 Tactical Transport Passable',
        lat: +(baseLat + 0.0100).toFixed(5),
        lng: +(baseLng + 0.0120).toFixed(5),
        bearing: '1.5 km NE'
      },
      {
        id: 'vil-asm-5',
        name: 'Sonapur Lowland Margins',
        tier: 'MEDIUM',
        hazard_reason: 'Field drainage backflow reaching residential gates (0.45m depth). Controlled traffic diversion.',
        depth_m: 0.45,
        population: 3100,
        stranded: 0,
        status: 'Traffic Diversion Active',
        lat: +(baseLat + 0.0080).toFixed(5),
        lng: +(baseLng - 0.0150).toFixed(5),
        bearing: '1.7 km NW'
      },
      {
        id: 'vil-asm-6',
        name: 'Jalukbari Higher Plateau Haven',
        tier: 'SAFE',
        hazard_reason: 'Gauhati University high ridge terrain. Designated state disaster relief shelter & central relief store.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Designated Relief Haven',
        lat: +(baseLat + 0.0280).toFixed(5),
        lng: +(baseLng - 0.0120).toFixed(5),
        bearing: '3.2 km NW'
      },
      {
        id: 'vil-asm-7',
        name: 'Khanapara Grounds LZ',
        tier: 'SAFE',
        hazard_reason: 'Elevated sports complex with dual helicopter landing zones and army logistics triage center.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Military Helicopter LZ Base',
        lat: +(baseLat + 0.0350).toFixed(5),
        lng: +(baseLng + 0.0180).toFixed(5),
        bearing: '4.0 km NE'
      }
    ];
  }

  if (isFeni) {
    return [
      {
        id: 'vil-feni-1',
        name: 'Parshuram Riverbank Settlement',
        tier: 'HIGH',
        hazard_reason: 'Muhuri river embankment breached in 3 places. Surge depth 2.15m. Hundreds stranded on rooftops.',
        depth_m: 2.15,
        population: 2200,
        stranded: 72,
        status: 'Embankment Breach / Boat Rescues',
        lat: +(baseLat - 0.0100).toFixed(5),
        lng: +(baseLng - 0.0080).toFixed(5),
        bearing: '1.3 km SW'
      },
      {
        id: 'vil-feni-2',
        name: 'Fulgazi Central Basin',
        tier: 'HIGH',
        hazard_reason: 'Severe inundation across market & residential wards (1.80m depth). Speedboats active.',
        depth_m: 1.80,
        population: 1850,
        stranded: 56,
        status: 'Critical Flood Inundation',
        lat: +(baseLat - 0.0140).toFixed(5),
        lng: +(baseLng + 0.0120).toFixed(5),
        bearing: '1.8 km SE'
      },
      {
        id: 'vil-feni-3',
        name: 'Chhagalnaiya Border Lowlands',
        tier: 'HIGH',
        hazard_reason: 'Tributary backflow submerged rural roads (1.45m depth). Power lines cut off.',
        depth_m: 1.45,
        population: 1400,
        stranded: 31,
        status: 'Road Cutoff Hazard',
        lat: +(baseLat - 0.0080).toFixed(5),
        lng: +(baseLng - 0.0150).toFixed(5),
        bearing: '1.7 km West'
      },
      {
        id: 'vil-feni-4',
        name: 'Feni Town Bypass Ward',
        tier: 'MEDIUM',
        hazard_reason: 'Stormwater drainage overflow (0.60m depth). Heavy emergency trucks passing with caution.',
        depth_m: 0.60,
        population: 4200,
        stranded: 0,
        status: 'Heavy Vehicles Passable',
        lat: +(baseLat + 0.0120).toFixed(5),
        lng: +(baseLng + 0.0100).toFixed(5),
        bearing: '1.5 km NE'
      },
      {
        id: 'vil-feni-5',
        name: 'Daganbhuiyan Margins',
        tier: 'MEDIUM',
        hazard_reason: 'Canal overflow waterlogging street edges (0.40m depth). Caution advisory active.',
        depth_m: 0.40,
        population: 2600,
        stranded: 0,
        status: 'Caution Passable',
        lat: +(baseLat + 0.0090).toFixed(5),
        lng: +(baseLng - 0.0120).toFixed(5),
        bearing: '1.6 km NW'
      },
      {
        id: 'vil-feni-6',
        name: 'Feni Government College Complex',
        tier: 'SAFE',
        hazard_reason: 'Elevated multi-story educational campus. Designated central relief distribution and hospital hub.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'District Evacuation Center',
        lat: +(baseLat + 0.0260).toFixed(5),
        lng: +(baseLng + 0.0140).toFixed(5),
        bearing: '3.0 km NE'
      },
      {
        id: 'vil-feni-7',
        name: 'Rampura Elevated Highway LZ',
        tier: 'SAFE',
        hazard_reason: 'Unflooded concrete flyover section configured for air force helicopter drops and emergency triage.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Airforce Helicopter LZ Base',
        lat: +(baseLat + 0.0320).toFixed(5),
        lng: +(baseLng - 0.0080).toFixed(5),
        bearing: '3.5 km North'
      }
    ];
  }

  if (isNepal) {
    return [
      {
        id: 'vil-n-1',
        name: 'Balkhu Riverside',
        tier: 'HIGH',
        hazard_reason: 'Bagmati river violent torrent & bridgehead breach. Water depth 2.1m. Multiple homes inundated.',
        depth_m: 2.10,
        population: 2100,
        stranded: 68,
        status: 'Critical Inundation / Aerial Winch',
        lat: +(baseLat - 0.0020).toFixed(5),
        lng: +(baseLng - 0.0015).toFixed(5),
        bearing: '1.0 km SW'
      },
      {
        id: 'vil-n-2',
        name: 'Sundarighat Settlement',
        tier: 'HIGH',
        hazard_reason: 'Low riverbank floodplain overflow. Access bridge washed out (1.85m depth). Inflatable boats required.',
        depth_m: 1.85,
        population: 1450,
        stranded: 44,
        status: 'Submerged Access Corridor',
        lat: +(baseLat - 0.0030).toFixed(5),
        lng: +(baseLng + 0.0012).toFixed(5),
        bearing: '1.4 km SE'
      },
      {
        id: 'vil-n-3',
        name: 'Teku Dobhan Confluence',
        tier: 'HIGH',
        hazard_reason: 'Confluence surge of Bishnumati & Bagmati rivers (1.65m depth). Low-lying structures submerged.',
        depth_m: 1.65,
        population: 1780,
        stranded: 36,
        status: 'Confluence Backflow Hazard',
        lat: +(baseLat - 0.0012).toFixed(5),
        lng: +(baseLng + 0.0025).toFixed(5),
        bearing: '1.1 km East'
      },
      {
        id: 'vil-n-4',
        name: 'Sanepa Lowland Margins',
        tier: 'MEDIUM',
        hazard_reason: 'Stormwater drainage backflow and street waterlogging (0.65m depth). 4x4 trucks and tractors operating.',
        depth_m: 0.65,
        population: 1920,
        stranded: 0,
        status: '4x4 Vehicles Only',
        lat: +(baseLat + 0.0015).toFixed(5),
        lng: +(baseLng - 0.0022).toFixed(5),
        bearing: '1.3 km NW'
      },
      {
        id: 'vil-n-5',
        name: 'Kalanki Bypass Ring',
        tier: 'MEDIUM',
        hazard_reason: 'Highway underpass water accumulation (0.50m depth). Controlled traffic diversion active.',
        depth_m: 0.50,
        population: 3200,
        stranded: 0,
        status: 'Traffic Diversion Active',
        lat: +(baseLat + 0.0025).toFixed(5),
        lng: +(baseLng + 0.0018).toFixed(5),
        bearing: '1.5 km NE'
      },
      {
        id: 'vil-n-6',
        name: 'Tribhuvan University Ridge Haven',
        tier: 'SAFE',
        hazard_reason: 'High elevation ridge crest (1,310m MSL). Designated multi-ward civilian shelter and helicopter LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Primary Safe Haven & LZ',
        lat: +(baseLat + 0.0058).toFixed(5),
        lng: +(baseLng - 0.0035).toFixed(5),
        bearing: '2.5 km NW'
      },
      {
        id: 'vil-n-7',
        name: 'Kuleshwor Elevated Plateau',
        tier: 'SAFE',
        hazard_reason: 'Elevated dry municipal compound. Relief hospital & emergency food rations dispensary.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Relief Hospital Compound',
        lat: +(baseLat + 0.0045).toFixed(5),
        lng: +(baseLng + 0.0020).toFixed(5),
        bearing: '2.0 km NE'
      }
    ];
  }

  if (isRajam) {
    return [
      {
        id: 'vil-r-1',
        name: 'Boddam',
        tier: 'HIGH',
        hazard_reason: 'Lowland agricultural basin & irrigation canal breach. Water depth 1.65m. Road traffic completely submerged.',
        depth_m: 1.65,
        population: 1420,
        stranded: 58,
        status: 'Evacuation Critical (Boat/Air)',
        lat: +(baseLat - 0.0200).toFixed(5),
        lng: +(baseLng - 0.0220).toFixed(5),
        bearing: '2.1 km SW'
      },
      {
        id: 'vil-r-2',
        name: 'Prasanthi Nagar',
        tier: 'HIGH',
        hazard_reason: 'Palakonda road underpass submerged 1.85m. Lowland residential ground floors flooded by storm runoff.',
        depth_m: 1.85,
        population: 2800,
        stranded: 42,
        status: 'Road Cutoff / Rooftop Rescue',
        lat: +(baseLat - 0.0220).toFixed(5),
        lng: +(baseLng + 0.0180).toFixed(5),
        bearing: '1.9 km SE'
      },
      {
        id: 'vil-r-3',
        name: 'Pogiri',
        tier: 'HIGH',
        hazard_reason: 'Low riverbank settlement near arterial bridge on Suvarnamukhi/Vegavathi drainage. Water depth 1.55m. Access pathways washed out.',
        depth_m: 1.55,
        population: 2150,
        stranded: 36,
        status: 'High Water Table / Boat Access',
        lat: +(baseLat - 0.0140).toFixed(5),
        lng: +(baseLng + 0.0280).toFixed(5),
        bearing: '2.4 km East'
      },
      {
        id: 'vil-r-4',
        name: 'Rajam RTC Bus Stand & Market Road',
        tier: 'MEDIUM',
        hazard_reason: 'Station approach road drainage overflow (0.65m depth). Passable for 4x4 trucks, tractors, and high-clearance emergency transports.',
        depth_m: 0.65,
        population: 4900,
        stranded: 0,
        status: '4x4 Passable',
        lat: +(baseLat - 0.0020).toFixed(5),
        lng: +(baseLng + 0.0320).toFixed(5),
        bearing: '1.8 km East'
      },
      {
        id: 'vil-r-5',
        name: 'Maredubaka',
        tier: 'MEDIUM',
        hazard_reason: 'Canal overflow encroaching village approach road (0.45m depth). Low-lying lanes waterlogged. Receding slowly.',
        depth_m: 0.45,
        population: 1320,
        stranded: 0,
        status: 'Accessible via Bypass',
        lat: +(baseLat + 0.0240).toFixed(5),
        lng: +(baseLng + 0.0220).toFixed(5),
        bearing: '2.3 km NE'
      },
      {
        id: 'vil-r-6',
        name: 'Gadimudidam',
        tier: 'MEDIUM',
        hazard_reason: 'Agricultural field runoff approaching village perimeter (0.38m depth). Road passable with caution.',
        depth_m: 0.38,
        population: 1480,
        stranded: 0,
        status: 'Caution Passable',
        lat: +(baseLat - 0.0380).toFixed(5),
        lng: +(baseLng - 0.0040).toFixed(5),
        bearing: '3.6 km South'
      },
      {
        id: 'vil-r-7',
        name: 'Kondampeta (GMRIT Campus)',
        tier: 'SAFE',
        hazard_reason: 'Elevated bedrock plateau (68m MSL). Designated District Civilian Relief Shelter, Triage Hospital & Helicopter LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Primary Evacuation LZ',
        lat: +(baseLat + 0.0340).toFixed(5),
        lng: +(baseLng - 0.0020).toFixed(5),
        bearing: '2.4 km North'
      }
    ];
  }

  if (isRemal) {
    return [
      {
        id: 'vil-rem-1',
        name: 'Mongla Port Lowland Terminal',
        tier: 'HIGH',
        hazard_reason: 'Tidal storm surge breached outer sea wall. Water depth 2.20m. Port staff quarters flooded.',
        depth_m: 2.20,
        population: 2400,
        stranded: 76,
        status: 'Storm Surge / Boat Rescue',
        lat: +(baseLat - 0.0150).toFixed(5),
        lng: +(baseLng - 0.0100).toFixed(5),
        bearing: '1.8 km SW'
      },
      {
        id: 'vil-rem-2',
        name: 'Sharankhola Coastal Embankment',
        tier: 'HIGH',
        hazard_reason: 'Polder 35/1 breach along Baleshwar river (1.90m depth). Multiple families marooned on embankment.',
        depth_m: 1.90,
        population: 1650,
        stranded: 52,
        status: 'Polder Breach / Zodiac Only',
        lat: +(baseLat - 0.0200).toFixed(5),
        lng: +(baseLng + 0.0150).toFixed(5),
        bearing: '2.5 km SE'
      },
      {
        id: 'vil-rem-3',
        name: 'Shyamnagar Estuary Village',
        tier: 'HIGH',
        hazard_reason: 'Saline surge water inundating mud households (1.60m depth). Drinking water pond saline contaminated.',
        depth_m: 1.60,
        population: 1300,
        stranded: 38,
        status: 'Submerged Saline Inundation',
        lat: +(baseLat - 0.0100).toFixed(5),
        lng: +(baseLng - 0.0200).toFixed(5),
        bearing: '2.2 km West'
      },
      {
        id: 'vil-rem-4',
        name: 'Khulna Southern Approach',
        tier: 'MEDIUM',
        hazard_reason: 'Drainage sluice gate backflow across approach highway (0.65m depth). Tactical 4x4 trucks passing.',
        depth_m: 0.65,
        population: 3500,
        stranded: 0,
        status: 'Tactical 4x4 Passable',
        lat: +(baseLat + 0.0120).toFixed(5),
        lng: +(baseLng + 0.0140).toFixed(5),
        bearing: '1.8 km NE'
      },
      {
        id: 'vil-rem-5',
        name: 'Batiaghata Buffer Zone',
        tier: 'MEDIUM',
        hazard_reason: 'Canal overflow waterlogging street fringes (0.45m depth). Cautionary boat and tractor access.',
        depth_m: 0.45,
        population: 2100,
        stranded: 0,
        status: 'Waterlogging Advisory',
        lat: +(baseLat + 0.0080).toFixed(5),
        lng: +(baseLng - 0.0120).toFixed(5),
        bearing: '1.4 km NW'
      },
      {
        id: 'vil-rem-6',
        name: 'Khulna University High Ground Haven',
        tier: 'SAFE',
        hazard_reason: 'Elevated multi-story academic campus. Designated primary Red Crescent cyclone shelter and medical unit.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Designated Cyclone Shelter',
        lat: +(baseLat + 0.0280).toFixed(5),
        lng: +(baseLng + 0.0100).toFixed(5),
        bearing: '3.0 km NE'
      },
      {
        id: 'vil-rem-7',
        name: 'Khulna Cantonment Heli-Base LZ',
        tier: 'SAFE',
        hazard_reason: 'High concrete plateau outside surge zone. Primary military helicopter search and rescue operations LZ.',
        depth_m: 0.0,
        population: 0,
        stranded: 0,
        status: 'Military Helicopter LZ Base',
        lat: +(baseLat + 0.0350).toFixed(5),
        lng: +(baseLng - 0.0150).toFixed(5),
        bearing: '3.8 km NW'
      }
    ];
  }

  // Dynamic generic generator for any other district or region globally
  const title = (districtName || 'Sector').split(',')[0].replace(/[-_]/g, ' ').trim();
  return [
    {
      id: 'vil-g-1',
      name: `${title} Riverbed Lowlands`,
      tier: 'HIGH',
      hazard_reason: 'Direct riverbank surge & basinal depression. Water depth 1.70m. Submerged residential structures.',
      depth_m: 1.70,
      population: 1350,
      stranded: 46,
      status: 'Critical Inundation / Evacuate',
      lat: +(baseLat - 0.0120).toFixed(5),
      lng: +(baseLng - 0.0110).toFixed(5),
      bearing: '1.6 km SW'
    },
    {
      id: 'vil-g-2',
      name: `${title} South Basinal Ward`,
      tier: 'HIGH',
      hazard_reason: 'Main arterial culvert breach. Road access submerged 1.55m. Ground vehicles cannot traverse.',
      depth_m: 1.55,
      population: 1820,
      stranded: 32,
      status: 'Road Cutoff Hazard',
      lat: +(baseLat - 0.0160).toFixed(5),
      lng: +(baseLng + 0.0140).toFixed(5),
      bearing: '2.1 km SE'
    },
    {
      id: 'vil-g-3',
      name: `${title} East Canal Fringe`,
      tier: 'HIGH',
      hazard_reason: 'Irrigation canal overflow flooding residential ground floors (1.35m depth). Muddy access compromised.',
      depth_m: 1.35,
      population: 940,
      stranded: 18,
      status: 'Submerged Habitation',
      lat: +(baseLat - 0.0080).toFixed(5),
      lng: +(baseLng + 0.0180).toFixed(5),
      bearing: '1.9 km East'
    },
    {
      id: 'vil-g-4',
      name: `${title} Market Approach Sector`,
      tier: 'MEDIUM',
      hazard_reason: 'Water logging across access avenues (0.50m depth). Passable for tactical 4x4 trucks & emergency tractors.',
      depth_m: 0.50,
      population: 1550,
      stranded: 0,
      status: 'Tactical Vehicles Only',
      lat: +(baseLat + 0.0120).toFixed(5),
      lng: +(baseLng + 0.0150).toFixed(5),
      bearing: '1.9 km NE'
    },
    {
      id: 'vil-g-5',
      name: `${title} Western Outskirts`,
      tier: 'MEDIUM',
      hazard_reason: 'Field runoff encroaching perimeter road (0.40m depth). Flood watch advisory active.',
      depth_m: 0.40,
      population: 1180,
      stranded: 0,
      status: 'Watch Advisory Active',
      lat: +(baseLat + 0.0090).toFixed(5),
      lng: +(baseLng - 0.0140).toFixed(5),
      bearing: '1.6 km NW'
    },
    {
      id: 'vil-g-6',
      name: `${title} North Elevated High Ground`,
      tier: 'SAFE',
      hazard_reason: 'Elevated bedrock ridge (+25m above valley floor). Designated Civilian Relief Haven & Shelter.',
      depth_m: 0.0,
      population: 0,
      stranded: 0,
      status: 'Designated Relief Haven',
      lat: +(baseLat + 0.0260).toFixed(5),
      lng: +(baseLng - 0.0120).toFixed(5),
      bearing: '2.8 km NW'
    },
    {
      id: 'vil-g-7',
      name: `${title} Ridge Assembly LZ`,
      tier: 'SAFE',
      hazard_reason: 'Dry plateau ground with unobstructed helicopter landing zone and emergency supply tents.',
      depth_m: 0.0,
      population: 0,
      stranded: 0,
      status: 'Medical & Helicopter LZ',
      lat: +(baseLat + 0.0340).toFixed(5),
      lng: +(baseLng + 0.0160).toFixed(5),
      bearing: '3.7 km NE'
    }
  ];
};

export interface RegionalDistrict {
  id: string;
  name: string;
  status: 'SEVERELY_AFFECTED' | 'DOWNSTREAM_ALERT' | 'ADVISORY_MONITOR';
  badgeColor: string;
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  center: [number, number];
  polygon: [number, number][];
}

export interface AffectedTown {
  id: string;
  name: string;
  symbol: string;
  pos: [number, number];
  tier: 'HIGH' | 'MEDIUM' | 'SAFE';
  district: string;
  depth: string;
  depthM: number;
  population: number;
  stranded: number;
  hazardReason: string;
}

export interface AdjacentMonitor {
  name: string;
  pos: [number, number];
}

export interface RiverCorridor {
  name: string;
  points: [number, number][];
  alertBadge?: {
    pos: [number, number];
    label: string;
  };
}

export interface RegionalDisasterCorridor {
  regionTitle: string;
  districts: RegionalDistrict[];
  adjacentMonitors: AdjacentMonitor[];
  riverCorridors: RiverCorridor[];
  towns: AffectedTown[];
}

export function getRegionalDisasterCorridor(
  locationName: string,
  baseLat: number,
  baseLng: number
): RegionalDisasterCorridor {
  const locLower = (locationName || '').toLowerCase();
  const isNepal =
    locLower.includes('nepal') ||
    locLower.includes('rasuwa') ||
    locLower.includes('nuwakot') ||
    locLower.includes('trishuli') ||
    locLower.includes('dhading') ||
    locLower.includes('kathmandu') ||
    locLower.includes('bagmati');

  const isRajam =
    locLower.includes('rajam') ||
    locLower.includes('srikakulam') ||
    locLower.includes('vizianagaram') ||
    locLower.includes('andhra') ||
    locLower.includes('ap');

  // NEPAL CORRIDOR (Authentic Operational Theater: Rasuwa, Nuwakot, Dhading, Gorkha, Tanahun, Chitwan)
  if (isNepal) {
    return {
      regionTitle: 'Nepal',
      districts: [
        {
          id: 'dist-rasuwa',
          name: 'Rasuwa',
          status: 'SEVERELY_AFFECTED',
          badgeColor: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.38,
          borderColor: '#b91c1c',
          center: [28.18, 85.30],
          polygon: [
            [28.38, 85.25],
            [28.42, 85.45],
            [28.28, 85.62],
            [28.10, 85.50],
            [28.08, 85.22],
            [28.18, 85.12],
            [28.38, 85.25],
          ],
        },
        {
          id: 'dist-nuwakot',
          name: 'Nuwakot',
          status: 'DOWNSTREAM_ALERT',
          badgeColor: '#ea580c',
          fillColor: '#f97316',
          fillOpacity: 0.32,
          borderColor: '#c2410c',
          center: [27.92, 85.18],
          polygon: [
            [28.08, 85.22],
            [28.10, 85.50],
            [27.96, 85.45],
            [27.78, 85.32],
            [27.76, 85.08],
            [27.92, 85.00],
            [28.08, 85.22],
          ],
        },
        {
          id: 'dist-dhading',
          name: 'Dhading',
          status: 'DOWNSTREAM_ALERT',
          badgeColor: '#ca8a04',
          fillColor: '#eab308',
          fillOpacity: 0.28,
          borderColor: '#a16207',
          center: [27.85, 84.92],
          polygon: [
            [27.92, 85.00],
            [27.76, 85.08],
            [27.65, 85.00],
            [27.60, 84.75],
            [27.82, 84.65],
            [27.98, 84.85],
            [27.92, 85.00],
          ],
        },
      ],
      adjacentMonitors: [
        { name: 'Gorkha', pos: [28.05, 84.62] },
        { name: 'Tanahun', pos: [27.92, 84.32] },
        { name: 'Chitwan', pos: [27.62, 84.45] },
      ],
      riverCorridors: [
        {
          name: 'Trishuli / Narayani River',
          points: [
            [28.28, 85.38],
            [28.23, 85.37],
            [28.16, 85.34],
            [27.98, 85.18],
            [27.925, 85.155],
            [27.86, 85.11],
            [27.78, 84.95],
            [27.70, 84.72],
            [27.62, 84.48],
          ],
          alertBadge: {
            pos: [27.78, 84.82],
            label: 'Downstream alert',
          },
        },
      ],
      towns: [
        {
          id: 't-1',
          name: 'Rasuwagadhi',
          symbol: '•',
          pos: [28.2778, 85.3778],
          tier: 'HIGH',
          district: 'Rasuwa',
          depth: '2.4m',
          depthM: 2.4,
          population: 1450,
          stranded: 72,
          hazardReason: 'Northern border riverbank flash flood torrent. Custom border crossing submerged.',
        },
        {
          id: 't-2',
          name: 'Timure',
          symbol: '•',
          pos: [28.2300, 85.3700],
          tier: 'HIGH',
          district: 'Rasuwa',
          depth: '2.1m',
          depthM: 2.1,
          population: 1100,
          stranded: 48,
          hazardReason: 'Gorge river surge flooding lower valley settlements. Road transport cut off.',
        },
        {
          id: 't-3',
          name: 'Syabrubesi',
          symbol: '•',
          pos: [28.1600, 85.3400],
          tier: 'HIGH',
          district: 'Rasuwa',
          depth: '1.8m',
          depthM: 1.8,
          population: 1950,
          stranded: 54,
          hazardReason: 'Langtang Khola & Trishuli confluence overflow. Suspension bridge approach washed out.',
        },
        {
          id: 't-4',
          name: 'Trishuli Bazaar',
          symbol: '•',
          pos: [27.9250, 85.1550],
          tier: 'HIGH',
          district: 'Nuwakot',
          depth: '1.85m',
          depthM: 1.85,
          population: 4200,
          stranded: 64,
          hazardReason: 'Arterial market basin inundation. Hydroelectric intake weir backflow flooding residential street.',
        },
        {
          id: 't-5',
          name: 'Devighat',
          symbol: '•',
          pos: [27.8600, 85.1101],
          tier: 'MEDIUM',
          district: 'Nuwakot',
          depth: '0.85m',
          depthM: 0.85,
          population: 2600,
          stranded: 12,
          hazardReason: 'Tadi & Trishuli confluence swelling. River terrace farmland partially inundated.',
        },
        {
          id: 't-6',
          name: 'Dhading Besi',
          symbol: '•',
          pos: [27.8500, 84.9200],
          tier: 'MEDIUM',
          district: 'Dhading',
          depth: '0.50m',
          depthM: 0.5,
          population: 3100,
          stranded: 0,
          hazardReason: 'Downstream river swell approaching low-lying bridges. Precautionary alert active.',
        },
      ],
    };
  }

  // ANDHRA PRADESH CORRIDOR (Rajam, Vizianagaram, Srikakulam)
  if (isRajam) {
    const cLat = baseLat || 18.4554;
    const cLng = baseLng || 83.6558;
    return {
      regionTitle: 'Andhra Pradesh',
      districts: [
        {
          id: 'dist-rajam',
          name: 'Rajam (Epicenter)',
          status: 'SEVERELY_AFFECTED',
          badgeColor: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.38,
          borderColor: '#b91c1c',
          center: [cLat, cLng],
          polygon: [
            [cLat + 0.025, cLng - 0.035],
            [cLat + 0.032, cLng + 0.025],
            [cLat - 0.015, cLng + 0.045],
            [cLat - 0.035, cLng + 0.010],
            [cLat - 0.025, cLng - 0.038],
            [cLat + 0.025, cLng - 0.035],
          ],
        },
        {
          id: 'dist-vizianagaram',
          name: 'Vizianagaram',
          status: 'DOWNSTREAM_ALERT',
          badgeColor: '#ea580c',
          fillColor: '#f97316',
          fillOpacity: 0.32,
          borderColor: '#c2410c',
          center: [cLat - 0.045, cLng - 0.025],
          polygon: [
            [cLat - 0.025, cLng - 0.038],
            [cLat - 0.035, cLng + 0.010],
            [cLat - 0.085, cLng + 0.005],
            [cLat - 0.095, cLng - 0.045],
            [cLat - 0.055, cLng - 0.065],
            [cLat - 0.025, cLng - 0.038],
          ],
        },
        {
          id: 'dist-srikakulam',
          name: 'Srikakulam',
          status: 'DOWNSTREAM_ALERT',
          badgeColor: '#ca8a04',
          fillColor: '#eab308',
          fillOpacity: 0.28,
          borderColor: '#a16207',
          center: [cLat - 0.015, cLng + 0.055],
          polygon: [
            [cLat + 0.032, cLng + 0.025],
            [cLat + 0.045, cLng + 0.085],
            [cLat - 0.035, cLng + 0.095],
            [cLat - 0.055, cLng + 0.045],
            [cLat - 0.015, cLng + 0.045],
            [cLat + 0.032, cLng + 0.025],
          ],
        },
      ],
      adjacentMonitors: [
        { name: 'Palakonda', pos: [cLat + 0.075, cLng + 0.025] },
        { name: 'Bobbili', pos: [cLat + 0.055, cLng - 0.085] },
        { name: 'Salur', pos: [cLat - 0.025, cLng - 0.095] },
      ],
      riverCorridors: [
        {
          name: 'Vegavathi - Nagavali Basin',
          points: [
            [cLat + 0.045, cLng + 0.015],
            [cLat + 0.015, cLng + 0.005],
            [cLat - 0.005, cLng - 0.002],
            [cLat - 0.025, cLng + 0.018],
            [cLat - 0.055, cLng + 0.035],
            [cLat - 0.085, cLng + 0.065],
          ],
          alertBadge: {
            pos: [cLat - 0.032, cLng + 0.022],
            label: 'Downstream alert',
          },
        },
      ],
      towns: [
        {
          id: 'tr-1',
          name: 'Boddam',
          symbol: '•',
          pos: [+(cLat - 0.0200).toFixed(5), +(cLng - 0.0220).toFixed(5)],
          tier: 'HIGH',
          district: 'Rajam',
          depth: '1.65m',
          depthM: 1.65,
          population: 1420,
          stranded: 58,
          hazardReason: 'Lowland agricultural basin & irrigation canal breach. Water depth 1.65m. Road traffic submerged.',
        },
        {
          id: 'tr-2',
          name: 'Prasanthi Nagar',
          symbol: '•',
          pos: [+(cLat - 0.0220).toFixed(5), +(cLng + 0.0180).toFixed(5)],
          tier: 'HIGH',
          district: 'Rajam',
          depth: '1.85m',
          depthM: 1.85,
          population: 2800,
          stranded: 42,
          hazardReason: 'Palakonda road underpass submerged 1.85m. Ground floors flooded by storm runoff.',
        },
        {
          id: 'tr-3',
          name: 'Pogiri',
          symbol: '•',
          pos: [+(cLat + 0.0240).toFixed(5), +(cLng - 0.0220).toFixed(5)],
          tier: 'HIGH',
          district: 'Rajam',
          depth: '1.55m',
          depthM: 1.55,
          population: 2150,
          stranded: 34,
          hazardReason: 'Low riverbank settlement near arterial bridge on Suvarnamukhi/Vegavathi drainage. Water depth 1.55m.',
        },
        {
          id: 'tr-4',
          name: 'Saradhi',
          symbol: '•',
          pos: [+(cLat - 0.0020).toFixed(5), +(cLng + 0.0320).toFixed(5)],
          tier: 'MEDIUM',
          district: 'Rajam',
          depth: '0.55m',
          depthM: 0.55,
          population: 1850,
          stranded: 0,
          hazardReason: 'Residential & agricultural border on eastern fringe of Rajam town. Road shoulder overflow (0.55m depth).',
        },
        {
          id: 'tr-5',
          name: 'Maredubaka',
          symbol: '•',
          pos: [+(cLat + 0.0240).toFixed(5), +(cLng + 0.0220).toFixed(5)],
          tier: 'MEDIUM',
          district: 'Rajam',
          depth: '0.45m',
          depthM: 0.45,
          population: 1320,
          stranded: 0,
          hazardReason: 'Canal overflow encroaching village approach road (0.45m depth). Low-lying lanes waterlogged.',
        },
        {
          id: 'tr-6',
          name: 'Kondampeta (GMRIT)',
          symbol: '•',
          pos: [+(cLat + 0.0340).toFixed(5), +(cLng - 0.0020).toFixed(5)],
          tier: 'SAFE',
          district: 'Rajam',
          depth: '0.0m',
          depthM: 0,
          population: 0,
          stranded: 0,
          hazardReason: 'Elevated bedrock plateau (68m MSL). Designated District Civilian Relief Shelter & Helicopter LZ.',
        },
        {
          id: 'tr-7',
          name: 'Gadimudidam',
          symbol: '•',
          pos: [+(cLat - 0.0380).toFixed(5), +(cLng - 0.0040).toFixed(5)],
          tier: 'MEDIUM',
          district: 'Rajam',
          depth: '0.38m',
          depthM: 0.38,
          population: 1480,
          stranded: 0,
          hazardReason: 'Agricultural field runoff approaching village perimeter (0.38m depth). Road passable with caution.',
        },
      ],
    };
  }

  // DYNAMIC GLOBAL GENERATOR (With authentic regional naming and anti-collision spatial distribution)
  const rawTitle = (locationName || 'Trishuli Valley Basin').split(',')[0].trim();
  const title = (rawTitle.toLowerCase().includes('sector 4b') || rawTitle.toLowerCase().includes('south delta'))
    ? 'Trishuli Valley'
    : rawTitle;

  const cLat = baseLat || 27.925;
  const cLng = baseLng || 85.155;

  return {
    regionTitle: `${title} Sector`,
    districts: [
      {
        id: 'dist-g-1',
        name: `${title}`,
        status: 'SEVERELY_AFFECTED',
        badgeColor: '#0f172a', // Neutral dark navy badge to prevent red-legend collision
        fillColor: '#ef4444',
        fillOpacity: 0.38,
        borderColor: '#b91c1c',
        center: [cLat, cLng],
        polygon: [
          [cLat + 0.022, cLng - 0.028],
          [cLat + 0.028, cLng + 0.022],
          [cLat - 0.012, cLng + 0.038],
          [cLat - 0.030, cLng + 0.008],
          [cLat - 0.022, cLng - 0.032],
          [cLat + 0.022, cLng - 0.028],
        ],
      },
      {
        id: 'dist-g-2',
        name: `${title} Valley`,
        status: 'DOWNSTREAM_ALERT',
        badgeColor: '#ea580c',
        fillColor: '#f97316',
        fillOpacity: 0.32,
        borderColor: '#c2410c',
        center: [cLat - 0.040, cLng - 0.022],
        polygon: [
          [cLat - 0.022, cLng - 0.032],
          [cLat - 0.030, cLng + 0.008],
          [cLat - 0.075, cLng + 0.002],
          [cLat - 0.085, cLng - 0.040],
          [cLat - 0.050, cLng - 0.055],
          [cLat - 0.022, cLng - 0.032],
        ],
      },
      {
        id: 'dist-g-3',
        name: `${title} East Basin`,
        status: 'DOWNSTREAM_ALERT',
        badgeColor: '#ca8a04',
        fillColor: '#eab308',
        fillOpacity: 0.28,
        borderColor: '#a16207',
        center: [cLat - 0.012, cLng + 0.048],
        polygon: [
          [cLat + 0.028, cLng + 0.022],
          [cLat + 0.038, cLng + 0.075],
          [cLat - 0.030, cLng + 0.085],
          [cLat - 0.048, cLng + 0.038],
          [cLat - 0.012, cLng + 0.038],
          [cLat + 0.028, cLng + 0.022],
        ],
      },
    ],
    adjacentMonitors: [
      { name: `${title} North`, pos: [cLat + 0.065, cLng + 0.020] },
      { name: `${title} West`, pos: [cLat + 0.045, cLng - 0.075] },
      { name: `${title} South`, pos: [cLat - 0.075, cLng + 0.065] },
    ],
    riverCorridors: [
      {
        name: `${title} Drainage River`,
        points: [
          [cLat + 0.040, cLng + 0.012],
          [cLat + 0.012, cLng + 0.004],
          [cLat - 0.008, cLng - 0.002],
          [cLat - 0.022, cLng + 0.015],
          [cLat - 0.050, cLng + 0.030],
          [cLat - 0.078, cLng + 0.055],
        ],
        alertBadge: {
          pos: [cLat - 0.028, cLng + 0.018],
          label: 'Downstream alert',
        },
      },
    ],
    towns: [
      {
        id: 'tg-1',
        name: `${title} Lower Riverbank`,
        symbol: '•',
        pos: [+(cLat - 0.0180).toFixed(5), +(cLng - 0.0250).toFixed(5)],
        tier: 'HIGH',
        district: title,
        depth: '1.70m',
        depthM: 1.7,
        population: 1350,
        stranded: 46,
        hazardReason: 'Direct riverbank surge & basinal depression. Water depth 1.70m.',
      },
      {
        id: 'tg-2',
        name: `${title} South Corridor`,
        symbol: '•',
        pos: [+(cLat - 0.0320).toFixed(5), +(cLng + 0.0050).toFixed(5)],
        tier: 'HIGH',
        district: title,
        depth: '1.55m',
        depthM: 1.55,
        population: 1820,
        stranded: 32,
        hazardReason: 'Main arterial culvert breach. Road access submerged 1.55m.',
      },
      {
        id: 'tg-3',
        name: `${title} East Ridge`,
        symbol: '•',
        pos: [+(cLat - 0.0100).toFixed(5), +(cLng + 0.0320).toFixed(5)],
        tier: 'HIGH',
        district: title,
        depth: '1.35m',
        depthM: 1.35,
        population: 940,
        stranded: 18,
        hazardReason: 'Canal overflow flooding ground floor residences (1.35m depth).',
      },
      {
        id: 'tg-4',
        name: `${title} Central Market`,
        symbol: '•',
        pos: [+(cLat + 0.0220).toFixed(5), +(cLng + 0.0220).toFixed(5)],
        tier: 'MEDIUM',
        district: title,
        depth: '0.65m',
        depthM: 0.65,
        population: 1650,
        stranded: 0,
        hazardReason: 'Market access roads inundated (0.65m depth). Passable for high-clearance rescue vehicles.',
      },
      {
        id: 'tg-5',
        name: `${title} North Haven`,
        symbol: '•',
        pos: [+(cLat + 0.0320).toFixed(5), +(cLng - 0.0200).toFixed(5)],
        tier: 'SAFE',
        district: title,
        depth: '0.0m',
        depthM: 0,
        population: 0,
        stranded: 0,
        hazardReason: 'Elevated bedrock ridge (+25m above valley floor). Designated Civilian Relief Haven.',
      },
    ],
  };
}

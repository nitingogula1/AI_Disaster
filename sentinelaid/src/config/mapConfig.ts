export const MAP_CONFIG = {
  default: {
    url: import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
  },
  dark: {
    url: import.meta.env.VITE_MAP_DARK_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: import.meta.env.VITE_MAP_DARK_ATTR || '&copy; OpenStreetMap contributors (Dark theme fallback)'
  }
};

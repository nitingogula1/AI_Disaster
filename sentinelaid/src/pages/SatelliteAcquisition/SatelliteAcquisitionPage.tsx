import { useEffect, useRef, useState } from 'react';
import { Satellite, Search, Database, Layers, Download, RefreshCw, AlertCircle, Eye, MapPin } from 'lucide-react';
import L from 'leaflet';
import { api, assetUrl, satelliteService, stacService } from '../../services/api';
import 'leaflet/dist/leaflet.css';

const panel = 'bg-surface border border-border rounded-lg overflow-hidden shadow-sm';
const button = 'flex items-center gap-1.5 border border-border text-text-secondary text-[12px] font-medium px-3 py-1.5 rounded hover:bg-panel disabled:opacity-40 transition';
const input = 'bg-surface border border-border rounded px-2 py-1.5 text-[12px] text-text-primary w-full';

function WaterMap({ geometry, bbox }: { geometry: any; bbox?: number[] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
    const layer = L.geoJSON(geometry, { style: { color: '#0284c7', weight: 2, fillOpacity: 0.4 } }).addTo(map);
    if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    else if (bbox?.length === 4) map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]]);
    return () => { map.remove(); };
  }, [geometry, bbox]);
  return <div ref={container} className="h-80 w-full" aria-label="Computed surface-water polygons" />;
}

function Preview({ url, label }: { url?: string; label: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return <div className="aspect-[16/10] bg-panel flex items-center justify-center overflow-hidden">
    {url && !failed
      ? <img key={url} src={assetUrl(url)} alt={label} className="w-full h-full object-contain" onError={() => setFailed(true)} />
      : <p role={failed ? 'alert' : undefined} className="text-text-muted text-[12px] p-6">{failed ? 'Preview unavailable. Check the backend and ingest status.' : label}</p>}
  </div>;
}

export default function SatelliteAcquisitionPage() {
  const [operationId, setOperationId] = useState('EVT-8821-BGD');
  const [bbox, setBbox] = useState(['89.50', '21.80', '89.51', '21.81']);
  const [start, setStart] = useState('2024-05-01');
  const [end, setEnd] = useState('2024-05-31');
  const [cloud, setCloud] = useState(30);
  const [provider, setProvider] = useState('NOT_CHECKED');
  const [scenes, setScenes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [bands, setBands] = useState<any>(null);
  const [method, setMethod] = useState('MNDWI');
  const [threshold, setThreshold] = useState(0.05);
  const [result, setResult] = useState<any>(null);
  const [view, setView] = useState<'preview_url' | 'mask_url'>('mask_url');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const upload = useRef<HTMLInputElement>(null);
  const selectedId = useRef<string | undefined>(undefined);

  const errorText = (err: any) => err?.response?.data?.error?.message || err?.message || 'Request failed';
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    const response = await api.get('/satellite/scenes', { params: { operation_id: operationId } });
    setScenes(response.data.data || []);
  };
  const select = async (scene: any) => {
    selectedId.current = scene.scene_id || scene.id;
    setSelected({ ...scene, id: selectedId.current });
    setResult(null); setBands(null);
    if (['READY', 'VERIFIED'].includes(scene.status || scene.pipelineStatus)) {
      const summary = await satelliteService.getBandSummary(selectedId.current);
      if (selectedId.current === (scene.scene_id || scene.id)) setBands(summary);
    }
  };

  useEffect(() => {
    let disposed = false;
    api.get('/satellite/scenes', { params: { operation_id: operationId } })
      .then(response => { if (!disposed) setScenes(response.data.data || []); })
      .catch(err => { if (!disposed) setError(errorText(err)); });
    return () => { disposed = true; };
  }, [operationId]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const queue = await satelliteService.getIngestionQueue();
        if (disposed) return;
        setJobs(queue.jobs || []);
        const active = queue.jobs?.find((j: any) => j.scene_id === selectedId.current);
        if (active?.status === 'COMPLETED') {
          setSelected((old: any) => old ? { ...old, status: 'READY' } : old);
        }
      } catch (err) {
        if (!disposed) setError(errorText(err));
      } finally {
        if (!disposed) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);

  const discover = () => run(async () => {
    await satelliteService.setAOI(bbox.map(Number), operationId);
    const response = await stacService.search({
      operation_id: operationId, bbox: bbox.map(Number), collections: ['sentinel-2-l2a'],
      start_datetime: start + 'T00:00:00Z', end_datetime: end + 'T23:59:59Z',
      max_cloud_cover: cloud, limit: 50,
    });
    setScenes(response.scenes || []);
    setSelected(null); selectedId.current = undefined; setResult(null); setBands(null);
    setMessage(response.scenes?.length ? 'Discovered ' + response.scenes.length + ' Sentinel-2 scenes.' : 'No scenes match this area, date range and cloud limit.');
  });
  const ingest = () => run(async () => {
    await satelliteService.setAOI(bbox.map(Number), operationId);
    const job = await satelliteService.directIngest(selected.id, 'POST_DISASTER', operationId);
    setSelected({ ...selected, status: 'INGESTING' });
    setMessage('Queued ' + job.job_id + '. Completion requires a validated raster and preview.');
  });
  const analyze = () => run(async () => {
    const response = await api.post('/satellite/scenes/' + selected.id + '/flood-analysis', {
      operation_id: operationId, method, threshold,
    }, { timeout: 120000 });
    setResult(response.data.data);
    setMessage('Surface-water analysis completed. New flooding requires a validated baseline comparison.');
  });
  const handleUpload = (file?: File) => {
    if (!file) return;
    void run(async () => {
      const data = new FormData();
      data.append('file', file); data.append('disaster_id', operationId);
      const response = await satelliteService.uploadImage(data);
      await refresh();
      await select({ ...response, id: response.scene_id, platform: 'User Upload' });
      setMessage('Uploaded dataset validated and registered. Ready to analyze.');
    });
  };
  const ready = selected && ['READY', 'VERIFIED'].includes(selected.status || selected.pipelineStatus);

  return <div className="p-4 space-y-4 animate-fade-in">
    <div>
      <div className="flex items-center gap-2 mb-1 text-primary text-[11px] font-semibold"><Satellite size={18} /> SPECTRAL TELEMETRY INGESTION HUB</div>
      <h1 className="text-[22px] font-bold text-text-primary">Satellite Image Acquisition & Ingestion Hub</h1>
      <p className="text-[12px] text-text-muted mt-1">Acquire Sentinel-2 L2A or upload a named-band GeoTIFF. Inspect actual pixels, surface-water area and map polygons.</p>
      <div className="flex flex-wrap gap-3 mt-3">
        <button className={button} disabled={busy} onClick={() => run(async () => {
          const response = await satelliteService.connectPlanetaryComputer(); setProvider(response.status);
          if (response.status !== 'CONNECTED') throw new Error(response.error || 'Provider unavailable');
        })}><Database size={14} /> Planetary Computer: {provider}</button>
        <button className={button} disabled={busy} onClick={discover}><Search size={14} /> Discover STAC Scenes</button>
        <button className={button} disabled={busy} onClick={() => upload.current?.click()}><Download size={14} /> Upload GeoTIFF</button>
        <input ref={upload} type="file" accept=".tif,.tiff" className="hidden" onChange={e => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
    {error && <div role="alert" className="border border-critical/40 bg-critical/10 text-critical rounded p-3 text-[12px] flex gap-2"><AlertCircle size={16} /> {error}</div>}
    {message && <div role="status" className="border border-primary/30 bg-primary/10 text-primary rounded p-3 text-[12px]">{message}</div>}
    {busy && <p role="status" className="text-[12px] text-text-muted">Working on the requested operation...</p>}

    <section className={panel + ' p-4'}>
      <h2 className="text-[12px] font-bold text-text-primary flex gap-2 mb-3"><MapPin size={14} /> TARGET OPERATION & AREA</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-[11px] text-text-muted">Operation ID<input disabled={busy} className={input} value={operationId} onChange={e => {setOperationId(e.target.value); setSelected(null); setResult(null); selectedId.current = undefined;}} /></label>
        {['West longitude', 'South latitude', 'East longitude', 'North latitude'].map((label, i) =>
          <label key={label} className="text-[11px] text-text-muted">{label}<input type="number" step="0.001" className={input} value={bbox[i]} onChange={e => setBbox(bbox.map((v, n) => n === i ? e.target.value : v))} /></label>)}
        <label className="text-[11px] text-text-muted">Start date<input type="date" className={input} value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="text-[11px] text-text-muted">End date<input type="date" className={input} value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className="text-[11px] text-text-muted">Maximum cloud cover (%)<input type="number" min="0" max="100" className={input} value={cloud} onChange={e => setCloud(Number(e.target.value))} /></label>
      </div>
      <p className="mt-2 text-[11px] text-text-muted">Use a small AOI, such as 0.01 x 0.01 degrees. Inputs over 4,194,304 pixels are rejected. Collection: Sentinel-2 L2A.</p>
    </section>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className={panel}>
        <div className="bg-panel px-4 py-3 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary">SELECTED SCENE / TRUE COLOR</h2>
          <p className="text-[11px] text-text-muted break-all">{selected?.id || 'Select a discovered or uploaded scene'}</p>
          {selected && <span className="text-[11px] text-primary">{selected.is_demo ? 'DEMO / SYNTHETIC' : selected.source || 'Catalog metadata'} / {selected.status || selected.pipelineStatus}</span>}
        </div>
        <Preview url={ready ? '/api/v1/satellite/scenes/' + selected.id + '/preview' : undefined} label="Ingest a selected scene to display its RGB pixels." />
        <div className="p-3 flex flex-wrap gap-2">
          <button className={button} disabled={!selected || busy || selected.source === 'UPLOAD' || selected.is_demo} onClick={ingest}><Download size={14} /> Ingest selected scene</button>
          <button className={button} disabled={!ready || busy} onClick={() => run(async () => setBands(await satelliteService.getBandSummary(selected.id)))}><Layers size={14} /> Inspect bands</button>
        </div>
      </section>
      <section className={panel}>
        <div className="bg-panel px-4 py-3 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary">SURFACE-WATER EXTRACTION</h2>
          <p className="text-[11px] text-text-muted">Observed water; no damage, depth or new-inundation claim</p>
        </div>
        <Preview url={result?.[view]} label="Run water analysis to display the computed index or mask." />
        <div className="p-3 flex flex-wrap gap-2 items-center">
          <select className={input + ' !w-auto'} value={method} onChange={e => setMethod(e.target.value)}><option>MNDWI</option><option>NDWI</option></select>
          <label className="text-[11px] text-text-muted">Threshold <input type="number" step="0.05" min="-1" max="1" className={input + ' !w-20'} value={threshold} onChange={e => setThreshold(Number(e.target.value))} /></label>
          <button className={button} disabled={!ready || busy} onClick={analyze}>Analyze pixels</button>
          {result && <button className={button} onClick={() => setView(view === 'mask_url' ? 'preview_url' : 'mask_url')}>Show {view === 'mask_url' ? 'index' : 'water mask'}</button>}
        </div>
      </section>
    </div>

    {result && <section className={panel}>
      <div className="p-4 flex flex-wrap items-center gap-6 text-[12px] text-text-primary">
        <strong>{result.water_area_km2.toFixed(6)} km? surface water</strong>
        <span>{result.water_pixel_count} water pixels / {result.valid_pixels} valid pixels</span>
        <span>{result.polygon_count} polygons / {result.method} &gt; {result.threshold}</span>
        <span>{result.is_demo ? 'DEMO / SYNTHETIC' : result.data_source}</span>
        <a className="text-primary underline" href={assetUrl(result.geojson_url)} target="_blank" rel="noreferrer">Download GeoJSON</a>
        <a className="text-primary underline" href={assetUrl(result.raster_url)}>Index GeoTIFF</a>
      </div>
      {result.polygon_count === 0 && <p className="px-4 pb-3 text-[12px] text-text-muted">{result.valid_pixels ? 'No water detected: the polygon layer is empty.' : 'No valid clear pixels: water cannot be assessed for this scene.'}</p>}
      <WaterMap geometry={result.feature_collection} bbox={selected?.bbox} />
    </section>}

    {bands && <section className={panel + ' p-4 text-[12px] text-text-primary'}>
      <h2 className="font-bold mb-2">Multispectral bands & metadata</h2>
      <p>{bands.tile_dimension} / {bands.crs} / {bands.bit_depth}</p>
      <div className="flex flex-wrap gap-3 mt-2">{bands.bands?.map((band: any) => <span className="bg-panel rounded p-2" key={band.name}>{band.name} / scale {band.scale_factor}</span>)}</div>
    </section>}

    <section className={panel}>
      <div className="p-4 border-b border-border flex justify-between items-center"><h2 className="font-bold text-[14px] text-text-primary">Satellite Scene Catalog</h2>
        <button className={button} disabled={busy} onClick={() => run(refresh)}><RefreshCw size={14} /> Refresh registered scenes</button></div>
      <div className="overflow-x-auto"><table className="w-full text-[12px] text-left">
        <thead className="bg-panel text-text-muted"><tr>{['Scene / platform', 'Acquisition', 'Cloud', 'Source', 'Status', 'Action'].map(name => <th className="p-3" key={name}>{name}</th>)}</tr></thead>
        <tbody className="text-text-primary">{scenes.map(scene => {
          const id = scene.scene_id || scene.id;
          return <tr key={id} className={'border-t border-border ' + (selected?.id === id ? 'bg-primary/10' : '')}>
            <td className="p-3 max-w-sm break-all">{scene.platform}<div className="text-[10px] text-text-muted">{id}</div></td>
            <td className="p-3">{scene.acquisition_datetime || scene.acquisitionDate || 'Unknown'}</td>
            <td className="p-3">{scene.cloud_cover ?? scene.cloudCover ?? 'Unknown'}</td>
            <td className="p-3">{scene.is_demo ? 'DEMO / SYNTHETIC' : scene.source}</td>
            <td className="p-3">{scene.status || scene.pipelineStatus}</td>
            <td className="p-3"><button className={button} disabled={busy} onClick={() => run(() => select(scene))}><Eye size={14} /> Select</button></td>
          </tr>;
        })}</tbody>
      </table></div>
      {!scenes.length && <p className="p-6 text-[12px] text-text-muted">No scenes loaded. Discover imagery using the selected filters or upload a supported dataset.</p>}
    </section>

    <section className={panel + ' p-4'}>
      <h2 className="font-bold text-[14px] text-text-primary mb-3">Ingestion Queue</h2>
      {!jobs.length && <p className="text-[12px] text-text-muted">No ingestion jobs.</p>}
      {jobs.map(job => <div key={job.job_id} className="border-t border-border py-2 text-[12px] text-text-secondary">
        <span className="font-semibold">{job.status}</span> / {job.progress}% / {job.current_stage}
        <div className="text-[10px] break-all">{job.scene_id}</div>
        {job.error_message && <p role="alert" className="text-critical">{job.error_message}</p>}
      </div>)}
    </section>
    <p className="text-[11px] text-text-muted">Uploads: GeoTIFF, maximum 500 MB and 4,194,304 pixels; band descriptions B02, B03, B04, B08, B11, SCL (B12 optional). SCL uses Sentinel-2 quality classes. Acquisition date is unknown unless provided in the dataset. NASA, USGS, Copernicus, SAR, independent atmospheric correction and trained AI damage detection are unavailable.</p>
  </div>;
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  ExternalLink, Search, Image as ImageIcon, Sparkles, 
  Settings, Check, AlertCircle, Info, RefreshCw, Calendar, MapPin
} from 'lucide-react';

interface GoogleFloodPhotoSearchProps {
  initialPlace?: string;
  initialDate?: string;
  preDate?: string;
  postDate?: string;
}

export function openGoogleImages(place: string, timing: 'before' | 'after' | string, date: string) {
  const query = `${place} flood ${timing} ${date}`.trim();
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function GoogleFloodPhotoSearch({
  initialPlace = 'Kathmandu, Nepal',
  initialDate = 'September 2024',
  preDate,
  postDate
}: GoogleFloodPhotoSearchProps) {
  // Configurable search parameters
  const [place, setPlace] = useState(initialPlace);
  const [floodDate, setFloodDate] = useState(initialDate);
  const [activeTab, setActiveTab] = useState<'before' | 'after' | 'custom'>('after');
  const [customKeyword, setCustomKeyword] = useState('');
  
  // Google PSE (cx) state
  const defaultCx = (import.meta as any).env?.VITE_GOOGLE_PSE_CX || '';
  const [cx, setCx] = useState<string>(() => {
    return localStorage.getItem('sentinelaid_google_pse_cx') || defaultCx || '';
  });
  const [cxInput, setCxInput] = useState(cx);
  const [showConfig, setShowConfig] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isSearchingPSE, setIsSearchingPSE] = useState(false);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync place if prop changes
  useEffect(() => {
    if (initialPlace) {
      setPlace(initialPlace);
    }
  }, [initialPlace]);

  // Sync date if postDate / preDate provided
  useEffect(() => {
    if (postDate) {
      // Format YYYY-MM-DD or use directly
      const d = new Date(postDate);
      if (!isNaN(d.getTime())) {
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        setFloodDate(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
      } else {
        setFloodDate(postDate);
      }
    } else if (initialDate) {
      setFloodDate(initialDate);
    }
  }, [postDate, initialDate]);

  // Dynamically ensure Google CSE script is injected and tracked
  useEffect(() => {
    const checkGoogleLoaded = () => {
      if ((window as any).google?.search?.cse?.element) {
        setIsScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleLoaded()) return;

    // Check existing script tag
    let scriptTag = document.getElementById('google-cse-script') as HTMLScriptElement | null;
    const targetCx = cx || 'YOUR_CX';

    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'google-cse-script';
      scriptTag.async = true;
      scriptTag.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(targetCx)}`;
      document.head.appendChild(scriptTag);
    }

    const interval = setInterval(() => {
      if (checkGoogleLoaded()) {
        clearInterval(interval);
      }
    }, 400);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (checkGoogleLoaded()) setIsScriptLoaded(true);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [cx]);

  // Execute query via Google PSE Element
  const executePseSearch = (query: string) => {
    setIsSearchingPSE(true);
    setLastExecutedQuery(query);

    const run = () => {
      try {
        const searchElement = (window as any).google?.search?.cse?.element?.getElement("flood-photo-results");
        if (searchElement) {
          searchElement.execute(query);
          setStatusMessage(`Query executed: "${query}"`);
          setIsSearchingPSE(false);
          return true;
        }
      } catch (err) {
        console.warn('Google CSE element execute error:', err);
      }
      return false;
    };

    if (!run()) {
      // Retry in 600ms if script is still rendering or initializing DOM
      const retryTimer = setTimeout(() => {
        if (!run()) {
          setStatusMessage('Google CSE element is initializing. Please verify your Search Engine ID (cx).');
          setIsSearchingPSE(false);
        }
      }, 600);
      return () => clearTimeout(retryTimer);
    }
  };

  const handleTabChange = (timing: 'before' | 'after' | 'custom') => {
    setActiveTab(timing);
    if (timing === 'before') {
      executePseSearch(`${place} flood before ${floodDate}`);
    } else if (timing === 'after') {
      executePseSearch(`${place} flood after ${floodDate}`);
    } else if (timing === 'custom' && customKeyword) {
      executePseSearch(`${place} ${customKeyword}`);
    }
  };

  const handleSaveCx = () => {
    const trimmed = cxInput.trim();
    setCx(trimmed);
    localStorage.setItem('sentinelaid_google_pse_cx', trimmed);
    setShowConfig(false);
    setStatusMessage(trimmed ? 'Search Engine ID updated. Reloading engine...' : 'Cleared custom CX.');

    // Reload script with new CX
    const existing = document.getElementById('google-cse-script');
    if (existing) {
      existing.remove();
    }
    const newScript = document.createElement('script');
    newScript.id = 'google-cse-script';
    newScript.async = true;
    newScript.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(trimmed || 'YOUR_CX')}`;
    document.head.appendChild(newScript);
    setIsScriptLoaded(false);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <ImageIcon size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
              <span>Ground & Web Flood Photos</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Google Images & Embedded PSE
              </span>
            </h2>
            <p className="text-[12px] text-text-muted">
              Inspect ground and aerial photos for flood context, structural verification, and water level validation.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition ${
            showConfig ? 'bg-panel border-primary text-primary' : 'border-border text-text-muted hover:text-text-primary'
          }`}
          title="Configure Google Programmable Search Engine ID (cx)"
        >
          <Settings size={13} />
          <span>{cx ? `PSE ID: ${cx.slice(0, 6)}...` : 'Configure PSE ID (cx)'}</span>
        </button>
      </div>

      {/* Config Drawer for CX */}
      {showConfig && (
        <div className="bg-panel border border-border/80 rounded-lg p-3.5 space-y-2.5 text-[12px] animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              Google Programmable Search Engine (PSE) ID
            </span>
            <a 
              href="https://programmablesearchengine.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline text-[11px] flex items-center gap-1"
            >
              Google PSE Console <ExternalLink size={11} />
            </a>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            New Programmable Search Engines require selecting specific sites (or leaving sites open if using Google Images buttons below).
            To enable embedded in-app results, create an engine in the Google PSE Console, toggle <strong>Image Search: ON</strong>, and paste the Search Engine ID (<code>cx</code>).
            The <code>cx</code> is a public ID (not a secret API key).
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="e.g. 0123456789abcdef:your_cx_id"
              value={cxInput}
              onChange={(e) => setCxInput(e.target.value)}
              className="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-primary font-mono"
            />
            <button
              onClick={handleSaveCx}
              className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded font-medium text-[11px] flex items-center gap-1 transition"
            >
              <Check size={13} /> Save ID
            </button>
          </div>
        </div>
      )}

      {/* Place & Date Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-panel/40 border border-border/60 rounded-lg p-3">
        <div>
          <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5 mb-1">
            <MapPin size={12} className="text-primary" /> Location Query
          </label>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Kathmandu, Nepal"
            className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-primary transition"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5 mb-1">
            <Calendar size={12} className="text-primary" /> Flood Timing / Month-Year
          </label>
          <input
            type="text"
            value={floodDate}
            onChange={(e) => setFloodDate(e.target.value)}
            placeholder="e.g. September 2024"
            className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* OPTION 1: Whole-Web Direct Google Images Buttons */}
      <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[12px] font-bold text-primary flex items-center gap-1.5">
              <span>Whole-Web Search (Google Images)</span>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-normal">
                No Site Restrictions
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Opens full Google Images with place and date pre-filled to search flood photos across the entire open web:
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => openGoogleImages(place, 'before', floodDate)}
              className="bg-surface hover:bg-panel border border-border hover:border-primary/50 text-text-primary text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              title={`Open Google Images for "${place} flood before ${floodDate}"`}
            >
              <ExternalLink size={13} className="text-primary" />
              <span>Google Images: <strong>Before</strong></span>
            </button>

            <button
              onClick={() => openGoogleImages(place, 'after', floodDate)}
              className="bg-critical hover:bg-critical/90 text-white text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              title={`Open Google Images for "${place} flood after ${floodDate}"`}
            >
              <ExternalLink size={13} />
              <span>Google Images: <strong>After</strong></span>
            </button>
          </div>
        </div>

        <div className="text-[10px] text-text-muted font-mono flex items-center gap-2 truncate">
          <span className="text-text-secondary font-semibold">Live Query:</span>
          <span>https://www.google.com/search?tbm=isch&q={encodeURIComponent(`${place} flood [before|after] ${floodDate}`)}</span>
        </div>
      </div>

      {/* OPTION 2: In-App Embedded Google Programmable Search Engine Gallery */}
      <div className="border border-border rounded-lg p-3.5 space-y-3 bg-panel/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[12px] font-bold text-text-primary flex items-center gap-2">
              <span>In-App Image Gallery (Programmable Search Element)</span>
              {isScriptLoaded ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  PSE Script Ready
                </span>
              ) : (
                <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" /> Initializing PSE
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Embeds results directly on this page. Results are governed by sites chosen in your Google PSE console.
            </p>
          </div>

          {/* Timing Tabs / Trigger Buttons */}
          <div className="flex items-center gap-1.5 bg-surface border border-border p-1 rounded-lg">
            <button
              onClick={() => handleTabChange('before')}
              disabled={isSearchingPSE}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition ${
                activeTab === 'before'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Query "Before"
            </button>
            <button
              onClick={() => handleTabChange('after')}
              disabled={isSearchingPSE}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition ${
                activeTab === 'after'
                  ? 'bg-critical text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Query "After"
            </button>
            <button
              onClick={() => handleTabChange('custom')}
              disabled={isSearchingPSE}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition ${
                activeTab === 'custom'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Query Sub-bar if active */}
        {activeTab === 'custom' && (
          <div className="flex items-center gap-2 pt-1 animate-fade-in">
            <input
              type="text"
              placeholder="e.g. aerial damage, bridge overflow, levee breach"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') executePseSearch(`${place} ${customKeyword}`);
              }}
              className="flex-1 bg-surface border border-border rounded px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-primary"
            />
            <button
              onClick={() => executePseSearch(`${place} ${customKeyword}`)}
              className="bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3 py-1.5 rounded flex items-center gap-1 transition"
            >
              <Search size={12} /> Run Search
            </button>
          </div>
        )}

        {/* Status notification */}
        {statusMessage && (
          <div className="text-[11px] text-text-muted font-mono flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded border border-border/50">
            <Info size={12} className="text-primary flex-shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {/* Official Google Programmable Search Element DOM target */}
        <div className="mt-2 min-h-[140px] bg-surface rounded-lg border border-border/80 p-2.5 overflow-hidden">
          <div 
            className="gcse-search"
            data-gname="flood-photo-results"
            data-enableImageSearch="true"
            data-defaultToImageSearch="true"
            data-disableWebSearch="true"
          />

          {!cx && (
            <div className="py-6 text-center text-text-muted text-[12px] space-y-1">
              <p className="font-semibold text-text-secondary">No Google PSE Search Engine ID (cx) entered</p>
              <p className="text-[11px]">
                Click <button onClick={() => setShowConfig(true)} className="text-primary underline">Configure PSE ID</button> above to enter your Google Programmable Search Engine ID for in-page results.
              </p>
              <p className="text-[11px] text-text-muted pt-1">
                Or use the <strong>Google Images Before / After</strong> buttons above to search the entire web immediately without an engine ID.
              </p>
            </div>
          )}
        </div>

        {/* Important Usage Notice per guidance */}
        <div className="bg-surface/60 border border-border/50 rounded-lg p-2.5 text-[11px] text-text-muted flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <strong className="text-text-primary">Photo Verification Note:</strong> Embedded image results are filtered to selected sites and can differ from the full Google Images index. Web queries cannot automatically verify the exact timestamp a photo was taken. Always inspect the original source link and treat <em>"before"</em> and <em>"after"</em> as search labels.
          </div>
        </div>
      </div>
    </div>
  );
}

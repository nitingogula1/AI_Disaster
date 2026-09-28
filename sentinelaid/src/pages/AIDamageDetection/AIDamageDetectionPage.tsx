import { Brain, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function AIDamageDetectionPage() {
  return <div className="p-4 space-y-4 animate-fade-in">
    <h1 className="text-[22px] font-bold text-text-primary flex items-center gap-2"><Brain size={22} /> AI Damage Detection</h1>
    <section className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <p className="text-warning font-semibold flex items-center gap-2"><AlertCircle size={18} /> Trained damage detection unavailable</p>
      <p className="text-[13px] text-text-secondary">No verified model weights or tested inference adapter are installed. No damage, confidence, depth or building-count results have been computed.</p>
      <p className="text-[12px] text-text-muted">Enabling this feature requires a selected architecture and compatible checkpoint, documented image normalization, aligned pre/post inputs, class mapping and held-out evaluation. See the project README for integration requirements.</p>
      <Link className="text-primary underline text-[13px]" to="/command/satellite">Open satellite acquisition for real surface-water analysis</Link>
    </section>
  </div>;
}

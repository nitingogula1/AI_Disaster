export default function SentinelAidLogo({ size = 40 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" width={size} height={size}>
      <rect width="48" height="48" rx="10" fill="#0f172a"/>
      <path d="M8 24C8 15.163 15.163 8 24 8C32.837 8 40 15.163 40 24" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3"/>
      <circle cx="24" cy="24" r="14" stroke="#0284c7" strokeWidth="1.5" strokeOpacity="0.4"/>
      <path d="M24 14L30 20L26 24L20 18L24 14Z" fill="#38bdf8"/>
      <path d="M17 21L13 25M31 17L35 13M19 23L15 27M29 19L33 15" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="28" r="4.5" fill="#ef4444"/>
      <circle cx="24" cy="28" r="8" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.6"/>
      <path d="M24 21V23M24 33V35M17 28H19M29 28H31" stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

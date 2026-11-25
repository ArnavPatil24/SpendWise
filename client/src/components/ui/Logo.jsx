import { useId } from 'react';

/** SpendWise mark: a monogram S on a deep-blue tile with a gold coin accent. */
export function LogoMark({ size = 36 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" role="img" aria-label="SpendWise" className="logo-mark">
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A9E" />
          <stop offset="1" stopColor="#0A1A47" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="24" y1="7" x2="32" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3D58F" />
          <stop offset="1" stopColor="#C8963A" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id}-bg)`} />
      <rect x=".5" y=".5" width="39" height="39" rx="10.5" stroke="#E7C36F" strokeOpacity=".85" />
      <path
        d="M25.6 14.2c-1.3-1.7-3.3-2.6-5.5-2.6-3.2 0-5.4 1.7-5.4 4.1 0 2.4 1.9 3.4 5.2 4.2 3.6.9 5.3 2.2 5.3 4.7 0 2.7-2.4 4.7-5.9 4.7-2.5 0-4.6-1-6-2.7"
        stroke="#fff" strokeWidth="3.1" strokeLinecap="round"
      />
      <circle cx="28.4" cy="11.6" r="2.7" fill={`url(#${id}-gold)`} />
    </svg>
  );
}

export function Logo({ size = 36, light = false }) {
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <LogoMark size={size} />
      <span className="logo-word">spend<b>wise</b></span>
    </span>
  );
}

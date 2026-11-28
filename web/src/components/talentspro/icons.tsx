import type { FC } from 'react';

export const PATHS: Record<string, string[]> = {
  home: ['M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z'],
  analytics: ['M11 4.5a8 8 0 1 0 8.5 8.5H11z', 'M14.5 3.5a7 7 0 0 1 6 6h-6z'],
  calendar: [
    'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z',
    'M8 2.5v3M16 2.5v3',
    'M4 9h16',
    'M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01',
  ],
  folder: ['M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'],
  briefcase: ['M6 7h12a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-7A2.5 2.5 0 0 1 6 7z', 'M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17'],
  star: ['m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z'],
  user: ['M4.5 20a7.5 7.5 0 0 1 15 0', 'M12 4.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z'],
  bell: ['M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'],
  mail: ['M6.5 5h11a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z', 'm4.5 7.5 7.5 5.5 7.5-5.5'],
  search: ['M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', 'm16 16 4 4'],
  close: ['m6 6 12 12M18 6 6 18'],
  sliders: ['M4 7h9M17 7h3M4 17h3M11 17h9', 'M15 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', 'M9 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4z'],
  arrow: ['M7 17 17 7M9 7h8v8'],
  arrowRight: ['M5 12h14M13 6l6 6-6 6'],
  chevron: ['m9.5 6 6 6-6 6'],
  chevronDown: ['m6 9.5 6 6 6-6'],
  camera: ['M5.5 6.5h7a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 3 15V9a2.5 2.5 0 0 1 2.5-2.5z', 'm15.5 10.5 5-3v9l-5-3z'],
  tray: ['M4 13.5 6.5 6h11l2.5 7.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z', 'M4 13.5h4.5l1 2h5l1-2H20'],
  card: ['M6.5 6h11A3 3 0 0 1 20.5 9v7a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z', 'M15.5 12.5h5M3.5 9.5h13'],
  doc: ['M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z', 'm9 13 2 2 4-4'],
  pin: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z', 'M12 7.7a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  business: ['M5 20.5V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V20.5', 'M15 10h3.5A1.5 1.5 0 0 1 20 11.5v9', 'M3.5 20.5h17M8.5 8h3M8.5 12h3M8.5 16h3'],
  plus: ['M12 5v14M5 12h14'],
  settings: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  logout: ['M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10', 'M14 8l4 4-4 4M18 12H9.5'],
};

export const MeetIcon: FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="11" height="14" rx="2.5" fill="#00832d" />
    <path d="M14 9.5l5.5-3.5v12L14 14.5V9.5z" fill="#00ac47" />
    <path d="M14 5h-2.5a2 2 0 0 0-2 2v2.5H14V5z" fill="#0066da" />
    <path d="M14 14.5H9.5V19H12a2 2 0 0 0 2-2v-2.5z" fill="#ea4335" />
    <circle cx="14" cy="12" r="1.5" fill="#ffba00" />
  </svg>
);

export const Icon: FC<{ name: keyof typeof PATHS | string; size?: number; sw?: number }> = ({ name, size = 20, sw = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(PATHS[name] || []).map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

export const LogoMark: FC<{ size?: number; color?: string }> = ({ size = 38, color = '#0b0b0c' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <path fill={color} d="M 8 1 A 7 7 0 0 1 15 8 L 15 15 L 8 15 A 7 7 0 0 1 1 8 A 7 7 0 0 1 8 1 Z" />
    <path fill={color} d="M 24 1 A 7 7 0 0 1 31 8 A 7 7 0 0 1 24 15 L 17 15 L 17 8 A 7 7 0 0 1 24 1 Z" />
    <path fill={color} d="M 8 17 L 15 17 L 15 24 A 7 7 0 0 1 8 31 A 7 7 0 0 1 1 24 A 7 7 0 0 1 8 17 Z" />
    <path fill={color} d="M 17 17 L 24 17 A 7 7 0 0 1 31 24 A 7 7 0 0 1 24 31 A 7 7 0 0 1 17 24 Z" />
  </svg>
);

export const AVATARS = [
  ['#DCE6FF', '#1746C7'],
  ['#D7F2E6', '#1E7A58'],
  ['#FFE5D3', '#9A4A16'],
  ['#E7E1FF', '#5A43C2'],
  ['#FFF0C7', '#7A5600'],
];
export const avatarTone = (seed: string) => AVATARS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];

export const initialsOf = (name: string): string =>
  (name || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';

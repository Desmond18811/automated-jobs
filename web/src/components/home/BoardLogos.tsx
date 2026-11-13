import type { FC } from 'react';

const BOARD_BAR_1 = [
  { text: 'LinkedIn', style: { font: '700 17px Montserrat, sans-serif', letterSpacing: '-.6px' } },
  { text: 'indeed', style: { font: 'italic 700 18px Poppins, sans-serif', letterSpacing: '-.6px' } },
  { text: 'glassdoor', style: { font: '600 15px Poppins, sans-serif', letterSpacing: '-.3px' } },
  { text: 'Wellfound', style: { font: '700 15px Montserrat, sans-serif', letterSpacing: '-.3px' } },
  { text: 'ZipRecruiter', style: { font: '800 14px Nunito, sans-serif' } },
];

const BOARD_BAR_2 = [
  { text: 'workday.', style: { font: '600 16px Poppins, sans-serif', letterSpacing: '-.4px' } },
  { text: 'greenhouse', style: { font: '500 16px Poppins, sans-serif', letterSpacing: '-.4px' } },
  { text: 'Lever', style: { font: '700 16px Montserrat, sans-serif', letterSpacing: '-.4px' } },
  { text: 'MONSTER', style: { font: '800 15px Nunito, sans-serif', letterSpacing: '.5px' } },
  { text: 'upwork', style: { font: '700 17px Poppins, sans-serif', letterSpacing: '-.4px' } },
];

export const BoardLogos: FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 672,
        textAlign: 'center',
        fontSize: 11.5,
        color: '#9a9aa3',
      }}
    >
      Applies for you across 40+ job boards and hiring platforms
    </div>
    <div
      style={{
        position: 'absolute',
        left: 127,
        right: 127,
        top: 706,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#6e6e76',
      }}
    >
      {[...BOARD_BAR_1, ...BOARD_BAR_2].map((b) => (
        <span key={b.text} style={b.style as React.CSSProperties}>
          {b.text}
        </span>
      ))}
    </div>
  </>
);

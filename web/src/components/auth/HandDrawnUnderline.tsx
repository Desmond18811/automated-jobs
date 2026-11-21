import type { FC, CSSProperties } from 'react';

interface HandDrawnUnderlineProps {
  color?: string;
  width?: string | number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Handcrafted organic curved underline stroke matching the editorial sketch accent in Image 2.
 */
export const HandDrawnUnderline: FC<HandDrawnUnderlineProps> = ({
  color = '#101828',
  width = '100%',
  height = 9,
  className,
  style,
}) => (
  <svg
    viewBox="0 0 135 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{
      position: 'absolute',
      left: '-2%',
      bottom: -6,
      width: width,
      height: height,
      overflow: 'visible',
      pointerEvents: 'none',
      ...style,
    }}
  >
    {/* Primary confident sweep */}
    <path
      d="M 3 6.5 C 28 3.2, 76 2.8, 131 5.2"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Secondary expressive return flick / hand-drawn texture */}
    <path
      d="M 16 9.4 C 48 8.1, 95 7.8, 126 6.8"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

export default HandDrawnUnderline;

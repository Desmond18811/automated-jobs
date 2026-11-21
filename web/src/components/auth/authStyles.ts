import type { CSSProperties } from 'react';

export const authInput: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 44,
  border: '1px solid #d0d5dd',
  borderRadius: 8,
  padding: '0 14px',
  fontSize: 14,
  outline: 'none',
  color: '#101828',
  background: '#ffffff',
  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
};

export const authButton = (busy: boolean): CSSProperties => ({
  width: '100%',
  height: 44,
  background: '#101828',
  color: '#ffffff',
  borderRadius: 8,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: busy ? 'wait' : 'pointer',
  opacity: busy ? 0.7 : 1,
  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
});

export const authLinkButton: CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 13,
  fontWeight: 600,
  color: '#344054',
  cursor: 'pointer',
  textDecoration: 'underline',
};

export const authError: CSSProperties = {
  background: '#fef3f2',
  border: '1px solid #fee4e2',
  color: '#d92d20',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 12.5,
  lineHeight: '18px',
  marginBottom: 16,
};

export const authTitle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: '-0.025em',
  color: '#101828',
};

export const authSub: CSSProperties = { margin: '0 0 28px', fontSize: 14, color: '#667085', lineHeight: '20px' };

/** Where to go after the emailed link is opened in a new tab: remembered across tabs. */
export const NEXT_KEY = 'javi_next';

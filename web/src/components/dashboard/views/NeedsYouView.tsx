import { useState, type FC } from 'react';
import { ExternalLinkIcon } from '@/assets/icons';

export const NeedsYouView: FC = () => {
  const [stripeAnswer, setStripeAnswer] = useState('');
  const [saveToBank, setSaveToBank] = useState(true);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});

  const markResolved = (id: string) => {
    setResolved((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Needs you</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
          Sends Javi couldn't finish alone. Answer once and Javi remembers it.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Item 1: Stripe Form Question */}
        {!resolved.stripe && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#6366f1',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  S
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Stripe — <span style={{ fontWeight: 600, color: '#4b5563' }}>Senior Product Designer</span>
                  </span>
                  <span style={{ fontSize: 10.5, color: '#8a8a92' }}>Greenhouse form · paused at question 6 of 8</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#c2410c',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 999,
                  padding: '3px 9px',
                }}
              >
                Answer needed
              </span>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>
              "Are you able to overlap with Pacific time two days a week?"
            </div>

            <textarea
              rows={3}
              value={stripeAnswer}
              onChange={(e) => setStripeAnswer(e.target.value)}
              placeholder="Your answer..."
              style={{
                width: '100%',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12.5,
                outline: 'none',
                fontFamily: 'Montserrat, sans-serif',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#4b5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                />
                Save to my answer bank for similar questions
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => markResolved('stripe')}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#6b7280',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Skip job
                </button>
                <button
                  type="button"
                  onClick={() => markResolved('stripe')}
                  style={{
                    background: '#2563eb',
                    border: 0,
                    color: '#fff',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Answer &amp; resume send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item 2: Monzo Captcha Failed */}
        {!resolved.monzo && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#f97316',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  M
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Monzo — <span style={{ fontWeight: 600, color: '#4b5563' }}>Design Systems Lead</span>
                  </span>
                  <span style={{ fontSize: 10.5, color: '#8a8a92' }}>Lever form · attempt 2 of 3</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 999,
                  padding: '3px 9px',
                }}
              >
                Retry or dismiss
              </span>
            </div>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                color: '#dc2626',
              }}
            >
              The form showed a captcha Javi can't solve.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => markResolved('monzo')}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => markResolved('monzo')}
                style={{
                  background: '#2563eb',
                  border: 0,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry send
              </button>
            </div>
          </div>
        )}

        {/* Item 3: Figma LinkedIn Apply */}
        {!resolved.figma && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#0ea5e9',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  F
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Figma — <span style={{ fontWeight: 600, color: '#4b5563' }}>Product Designer, Editor</span>
                  </span>
                  <span style={{ fontSize: 10.5, color: '#8a8a92' }}>LinkedIn Easy Apply</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#1d4ed8',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 999,
                  padding: '3px 9px',
                }}
              >
                Manual
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: '#4b5563' }}>
              This platform doesn't allow automated applying. Your tailored CV and letter are ready to copy.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.open('https://linkedin.com', '_blank')}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                Open on LinkedIn <ExternalLinkIcon size={12} color="#1d4ed8" />
              </button>
              <button
                type="button"
                onClick={() => markResolved('figma')}
                style={{
                  background: '#0b0b0c',
                  border: 0,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                I applied — mark done
              </button>
            </div>
          </div>
        )}

        {/* Item 4: Linear Assisted Draft */}
        {!resolved.linear && (
          <div
            style={{
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 14,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#8b5cf6',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  L
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Linear — <span style={{ fontWeight: 600, color: '#4b5563' }}>Product Designer</span>
                  </span>
                  <span style={{ fontSize: 10.5, color: '#8a8a92' }}>Assisted draft · email to hiring manager</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#065f46',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 999,
                  padding: '3px 9px',
                }}
              >
                Ready to send
              </span>
            </div>

            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: '#374151',
                lineHeight: '18px',
              }}
            >
              Hi Karri — I've been using Linear daily for two years and led the design system at Paystack. I'd love to talk about the Product Designer role...
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => markResolved('linear')}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#6b7280',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("Hi Karri — I've been using Linear daily...")}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Copy draft
              </button>
              <button
                type="button"
                onClick={() => markResolved('linear')}
                style={{
                  background: '#0b0b0c',
                  border: 0,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                I sent it — mark done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

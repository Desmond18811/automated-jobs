import { useState, type FC, type ReactNode, type CSSProperties, type KeyboardEvent } from 'react';
import { ChevronDownIcon, XIcon, PlusIcon } from '@/assets/icons';

// Tokens carried over from the original setup page so the wizard keeps its look.
export const C = {
  text: '#101828',
  body: '#344054',
  muted: '#667085',
  subtle: '#475467',
  border: '#d0d5dd',
  divider: '#eaecf0',
  surface: '#f9fafb',
  focus: '#2563eb',
  focusRing: '0 0 0 3px rgba(37, 99, 235, 0.12)',
  danger: '#b42318',
  dangerBg: '#fef3f2',
  dangerBorder: '#fecdca',
  ok: '#027a48',
  okBg: '#ecfdf3',
};

export const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '0 14px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#ffffff',
  color: C.text,
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const focusOn = (e: { currentTarget: HTMLElement }) => {
  e.currentTarget.style.borderColor = C.focus;
  e.currentTarget.style.boxShadow = C.focusRing;
};
const focusOff = (e: { currentTarget: HTMLElement }) => {
  e.currentTarget.style.borderColor = C.border;
  e.currentTarget.style.boxShadow = 'none';
};

export const StepHeader: FC<{ title: string; subtitle: ReactNode }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: 28 }}>
    <h2 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{title}</h2>
    <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: '22px' }}>{subtitle}</p>
  </div>
);

export const Section: FC<{ title: string; hint?: ReactNode; children: ReactNode }> = ({ title, hint, children }) => (
  <section style={{ marginBottom: 28 }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>{title}</h3>
    {hint && <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: '19px' }}>{hint}</p>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: hint ? 0 : 12 }}>{children}</div>
  </section>
);

/**
 * Label + control. Wraps a single input in a <label>; pass `group` when the control is a set of
 * buttons (Choice), since clicking a <label>'s text would otherwise press its first button.
 */
export const Field: FC<{ label: string; required?: boolean; hint?: ReactNode; error?: string; group?: boolean; children: ReactNode }> = ({
  label,
  required,
  hint,
  error,
  group,
  children,
}) => {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag style={{ display: 'block', minWidth: 0 }} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.body, display: 'block', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: C.danger }}> *</span>}
      </span>
      {children}
      {hint && !error && <span style={{ fontSize: 12, color: C.muted, display: 'block', marginTop: 5, lineHeight: '17px' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: C.danger, display: 'block', marginTop: 5 }}>{error}</span>}
    </Tag>
  );
};

/** Two (or more) fields side by side; stacks on narrow screens. */
export const Row: FC<{ children: ReactNode; min?: number }> = ({ children, min = 220 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 }}>{children}</div>
);

export const TextInput: FC<{
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  autoComplete?: string;
}> = ({ value, onChange, type = 'text', ...rest }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onFocus={focusOn}
    onBlur={focusOff}
    style={inputStyle}
    {...rest}
  />
);

export const TextArea: FC<{ value: string | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number }> = ({
  value,
  onChange,
  rows = 4,
  ...rest
}) => (
  <textarea
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onFocus={focusOn}
    onBlur={focusOff}
    rows={rows}
    style={{ ...inputStyle, height: 'auto', padding: '10px 14px', lineHeight: '21px', resize: 'vertical' }}
    {...rest}
  />
);

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

/** Native select with the original inset chevron. `''` is the "not answered" value. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: {
  value: T | '' | undefined;
  onChange: (v: T | '') => void;
  options: Option<T>[];
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as T | '')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          paddingRight: 44,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          borderColor: focused ? C.focus : C.border,
          boxShadow: focused ? C.focusRing : 'none',
          color: value ? C.text : C.muted,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
        <ChevronDownIcon size={16} color={focused ? C.focus : C.muted} />
      </span>
    </div>
  );
}

/** Pill buttons for short single-choice answers. Clicking the active pill clears it. */
export function Choice<T extends string | number | boolean>({
  value,
  onChange,
  options,
  allowClear = true,
}: {
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: Array<{ value: T; label: string }>;
  allowClear?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active && allowClear ? undefined : o.value)}
            style={{
              minHeight: 38,
              padding: '0 14px',
              borderRadius: 99,
              border: `1px solid ${active ? C.text : C.border}`,
              background: active ? C.text : '#ffffff',
              color: active ? '#ffffff' : C.body,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const YES_NO: Array<{ value: boolean; label: string }> = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

export const Chip: FC<{ label: string; onRemove?: () => void; muted?: boolean }> = ({ label, onRemove, muted }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 30,
      padding: onRemove ? '0 6px 0 12px' : '0 12px',
      borderRadius: 99,
      background: muted ? C.surface : '#eff6ff',
      border: `1px solid ${muted ? C.divider : '#bfdbfe'}`,
      color: muted ? C.body : '#1d4ed8',
      fontSize: 12.5,
      fontWeight: 600,
    }}
  >
    {label}
    {onRemove && (
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', color: 'inherit' }}
      >
        <XIcon size={13} />
      </button>
    )}
  </span>
);

/** Free-text list input: Enter or comma adds; chips show the current list. */
export const TagInput: FC<{
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  suggestions?: string[];
}> = ({ values, onChange, placeholder, max = 50, suggestions = [] }) => {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || values.length >= max || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };
  const open = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {values.map((v) => (
            <Chip key={v} label={v} onRemove={() => onChange(values.filter((x) => x !== v))} />
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={(e) => {
          focusOff(e);
          if (draft.trim()) {
            add(draft);
            setDraft('');
          }
        }}
        onFocus={focusOn}
        placeholder={values.length >= max ? `Maximum ${max} reached` : placeholder}
        disabled={values.length >= max}
        style={inputStyle}
      />
      {open.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {open.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                borderRadius: 99,
                border: `1px dashed ${C.border}`,
                background: '#ffffff',
                color: C.subtle,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <PlusIcon size={11} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Toggle: FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{
        width: 36,
        height: 20,
        borderRadius: 99,
        background: checked ? C.text : C.border,
        position: 'relative',
        flexShrink: 0,
        marginTop: 1,
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ffffff',
          transition: 'left 0.15s ease',
        }}
      />
    </span>
    <span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.body, display: 'block' }}>{label}</span>
      {hint && <span style={{ fontSize: 12, color: C.muted, display: 'block', marginTop: 2 }}>{hint}</span>}
    </span>
  </label>
);

/** A bordered card for one entry in a repeatable list (a job, a degree...). */
export const ItemCard: FC<{ title: string; onRemove: () => void; children: ReactNode }> = ({ title, onRemove, children }) => (
  <div style={{ border: `1px solid ${C.divider}`, borderRadius: 12, padding: 16, background: '#ffffff' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <button
        type="button"
        onClick={onRemove}
        style={{ border: 'none', background: 'transparent', color: C.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Remove
      </button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
  </div>
);

export const AddButton: FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({ label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      height: 40,
      borderRadius: 8,
      border: `1px dashed ${C.border}`,
      background: '#ffffff',
      color: C.body,
      fontSize: 13,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontFamily: 'inherit',
    }}
  >
    <PlusIcon size={14} /> {label}
  </button>
);

export const Notice: FC<{ tone?: 'info' | 'danger' | 'ok'; children: ReactNode }> = ({ tone = 'info', children }) => {
  const palette =
    tone === 'danger'
      ? { bg: C.dangerBg, border: C.dangerBorder, color: C.danger }
      : tone === 'ok'
        ? { bg: C.okBg, border: '#abefc6', color: C.ok }
        : { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' };
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 13,
        lineHeight: '19px',
        borderRadius: 8,
        padding: '10px 14px',
      }}
    >
      {children}
    </div>
  );
};

export const primaryButton = (disabled = false): CSSProperties => ({
  height: 44,
  padding: '0 22px',
  borderRadius: 8,
  background: C.text,
  color: '#ffffff',
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  fontFamily: 'inherit',
});

export const secondaryButton: CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 8,
  background: '#ffffff',
  color: C.body,
  border: `1px solid ${C.border}`,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/** "Jan 2022"-style dates are what CVs and ATS forms use, so dates stay free text. */
export const DATE_PLACEHOLDER = 'e.g. Jan 2022';

export const newId = () => Math.random().toString(36).slice(2, 10);

/** One bullet per line ↔ Bullet[]; existing ids are kept by position. */
export const bulletsToText = (bullets: Array<{ text: string }> | undefined) => (bullets ?? []).map((b) => b.text).join('\n');
export const textToBullets = (text: string, prev: Array<{ id: string; text: string }> = []) =>
  text
    .split('\n')
    .map((t) => t.replace(/^\s*[-•*]\s*/, ''))
    .filter((t) => t.trim())
    .slice(0, 15)
    .map((t, i) => ({ id: prev[i]?.id ?? newId(), text: t.slice(0, 600) }));

/** Textarea for bullet points. Keeps its own text so blank lines survive while typing. */
export const BulletsInput: FC<{
  bullets: Array<{ id: string; text: string }>;
  onChange: (b: Array<{ id: string; text: string }>) => void;
  placeholder?: string;
}> = ({ bullets, onChange, placeholder }) => {
  const [text, setText] = useState(() => bulletsToText(bullets));
  return (
    <TextArea
      value={text}
      rows={3}
      placeholder={placeholder ?? 'One achievement per line'}
      onChange={(v) => {
        setText(v);
        onChange(textToBullets(v, bullets));
      }}
    />
  );
};

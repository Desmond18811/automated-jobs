import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JaviBrandMark } from '@/assets/logos';
import { API_BASE, authApi, authStateStorage, profileApi, tokenStorage } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';
import { useIsMobile } from '@/hooks/useStageScale';
import type { UserProfile } from '@/types/profile';
import { C, Notice, primaryButton, secondaryButton } from './ui';
import { STEPS, describeSaveError, useSetupDraft, type StepId } from './useSetupDraft';
import { ImportStep } from './steps/ImportStep';
import { IdentityStep, validateIdentity } from './steps/IdentityStep';
import { CareerStep, validateCareer } from './steps/CareerStep';
import { BackgroundStep, validateBackground } from './steps/BackgroundStep';
import { SkillsStep, validateSkills } from './steps/SkillsStep';
import { LinksStep, normalizeLinks, validateLinks } from './steps/LinksStep';
import { EligibilityStep, validateEligibility } from './steps/EligibilityStep';
import { AutomationStep, validateAutomation } from './steps/AutomationStep';
import { ReviewStep } from './steps/ReviewStep';

const VALIDATORS: Partial<Record<StepId, (d: UserProfile) => string[]>> = {
  identity: validateIdentity,
  career: validateCareer,
  background: validateBackground,
  skills: validateSkills,
  links: validateLinks,
  eligibility: validateEligibility,
  automation: validateAutomation,
};

/** Values to normalise right before a step is saved. */
const NORMALIZERS: Partial<Record<StepId, (d: UserProfile) => Partial<UserProfile>>> = {
  links: normalizeLinks,
};

export const ProfileSetupPage: FC = () => {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const { refreshProfile } = useUserProfile();
  const { draft, patch, saveStep, draftPayload, loading, loadError, reload, adopt } = useSetupDraft();
  // The server is the source of truth for where the user stopped; nothing renders until it has answered.
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState('');
  const editing = new URLSearchParams(window.location.search).get('edit') === '1';

  // Leave setup for the dashboard; what has been typed so far is saved first.
  const skip = async () => {
    setSkipping(true);
    setSkipError('');
    try {
      await writes.current;
      if (!editing) await authApi.skipSetup();
      nav('/dash', { replace: true });
    } catch (e: any) {
      setSkipError(e?.message || 'Could not skip setup. Try again.');
      setSkipping(false);
    }
  };

  useEffect(() => {
    if (loading || loadError || ready) return;
    const at = Math.min(Math.max(draft.setupStep || 1, 1), STEPS.length) - 1;
    setIndex(at);
    setReady(true);
  }, [loading, loadError, ready, draft.setupStep]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  // Every write goes through one queue so a slow earlier request can never land after a newer one.
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = (fn: () => Promise<unknown>) => (writes.current = writes.current.then(fn).catch(() => null));
  const lastSaved = useRef('');

  const payload = useMemo(() => draftPayload(step), [draftPayload, step]);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const indexRef = useRef(index);
  indexRef.current = index;

  // Arriving on a step: what's on screen is what the server has.
  useEffect(() => {
    lastSaved.current = JSON.stringify(payloadRef.current);
  }, [index, ready]);

  // Autosave the current step shortly after the user stops typing, so closing the tab loses nothing.
  useEffect(() => {
    if (!ready || loading || step.fields.length === 0) return;
    const json = JSON.stringify(payload);
    if (json === lastSaved.current) return;
    const t = setTimeout(() => {
      void enqueue(() => profileApi.update({ ...payload, setupStep: index + 1 } as any)).then(() => {
        lastSaved.current = json;
      });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, ready, loading, step, index]);

  // Last chance: when the tab is hidden or closed, push unsaved edits with a request that survives the page.
  useEffect(() => {
    const flush = () => {
      const json = JSON.stringify(payloadRef.current);
      const token = tokenStorage.get();
      if (!token || json === lastSaved.current || !Object.keys(payloadRef.current).length) return;
      // Browsers cap a request that outlives the page at 64 KB. If the photo pushes it over, send the rest now
      // and leave the step marked unsaved so the photo goes with the next normal save.
      let body = JSON.stringify({ ...payloadRef.current, setupStep: indexRef.current + 1 });
      const tooBig = new Blob([body]).size > 60_000;
      if (tooBig) {
        const { avatarUrl: _skip, ...rest } = payloadRef.current as Record<string, unknown>;
        body = JSON.stringify({ ...rest, setupStep: indexRef.current + 1 });
      }
      if (!tooBig) lastSaved.current = json;
      void fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        keepalive: true,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
      }).catch(() => undefined);
    };
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    setIndex(next);
    setProblems([]);
    void enqueue(() => profileApi.update({ setupStep: next + 1 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Validate and save the current step. Returns false (and shows why) if the user must stay. */
  const commit = async (): Promise<boolean> => {
    const issues = VALIDATORS[step.id]?.(draft) ?? [];
    if (issues.length) {
      setProblems(issues.map((i) => `${i} is required.`));
      return false;
    }
    const nextStepNumber = Math.min(index + 2, STEPS.length);
    const overrides = { ...(NORMALIZERS[step.id]?.(draft) ?? {}), setupStep: nextStepNumber };
    if (Object.keys(overrides).length) patch(overrides);
    try {
      await saveStep(step, overrides);
      return true;
    } catch (err) {
      setProblems(describeSaveError(err));
      return false;
    }
  };

  const next = async () => {
    setBusy(true);
    setProblems([]);
    const ok = await commit();
    setBusy(false);
    if (ok) goTo(index + 1);
  };

  // Going back saves whatever is valid so far and never blocks: half-filled rows stay on screen and are retried.
  const back = async () => {
    const json = JSON.stringify(payload);
    if (json !== lastSaved.current && Object.keys(payload).length) {
      await enqueue(() => profileApi.update(payload as any));
      lastSaved.current = json;
    }
    goTo(index - 1);
  };

  const finish = async () => {
    setBusy(true);
    setProblems([]);
    setMissing([]);
    try {
      await profileApi.verify();
      await authApi.updateOnboardingStage('completed');
      authStateStorage.setStage('completed');
      try {
        localStorage.removeItem('javi_setup_step');
        
      } catch {
        // storage unavailable; the step index is only a convenience
      }
      await refreshProfile();
      nav('/dash');
    } catch (err) {
      const lines = describeSaveError(err);
      if ((err as any)?.data?.details?.missing) setMissing(lines);
      else setProblems(lines);
    } finally {
      setBusy(false);
    }
  };

  const body = () => {
    const props = { draft, patch };
    switch (step.id) {
      case 'import':
        return (
          <ImportStep
            draft={draft}
            onImported={(serverProfile) => {
              adopt(serverProfile);
              goTo(1);
            }}
          />
        );
      case 'identity':
        return <IdentityStep {...props} />;
      case 'career':
        return <CareerStep {...props} />;
      case 'background':
        return <BackgroundStep {...props} />;
      case 'skills':
        return <SkillsStep {...props} />;
      case 'links':
        return <LinksStep {...props} />;
      case 'eligibility':
        return <EligibilityStep {...props} />;
      case 'automation':
        return <AutomationStep {...props} onServerProfile={adopt} />;
      case 'review':
        return <ReviewStep draft={draft} missing={missing} onJump={goTo} />;
    }
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#ffffff',
        fontFamily: "Montserrat, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          width: '100%',
          height: '55%',
          background:
            'radial-gradient(ellipse 65% 85% at 0% 100%, rgba(60,115,255,0.22), rgba(60,115,255,0) 70%), radial-gradient(ellipse 60% 75% at 28% 100%, rgba(20,190,180,0.22), rgba(20,190,180,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <header
        style={{
          minHeight: 56,
          padding: isMobile ? '10px 16px' : '0 32px',
          borderBottom: `1px solid ${C.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <JaviBrandMark />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.body }}>
            Step {index + 1} of {STEPS.length}
            {!isMobile && <span style={{ fontWeight: 400, color: C.muted }}> · {step.title}</span>}
          </span>
          <div style={{ width: isMobile ? 60 : 120, height: 6, background: '#f2f4f7', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${((index + 1) / STEPS.length) * 100}%`, height: '100%', background: C.text, borderRadius: 99, transition: 'width 0.3s ease' }} />
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={skipping}
            title={editing ? undefined : 'Go to the dashboard now and finish your profile later'}
            style={{ height: 36, padding: '0 14px', borderRadius: 99, border: `1px solid ${C.divider}`, background: '#fff', color: C.text, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: skipping ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: skipping ? 0.6 : 1 }}
          >
            {skipping ? 'Saving…' : editing ? 'Back to dashboard' : 'Skip for now'}
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: isMobile ? '24px 16px 120px' : '44px 24px 120px',
          maxWidth: 680,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {skipError && <Notice tone="danger">{skipError}</Notice>}
        {loading || (!ready && !loadError) ? (
          <p style={{ color: C.muted, fontSize: 14 }}>Loading your profile…</p>
        ) : loadError ? (
          <Notice tone="danger">
            Couldn't load your profile: {loadError}{' '}
            <button type="button" onClick={reload} style={{ border: 'none', background: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Try again
            </button>
          </Notice>
        ) : (
          body()
        )}
      </main>

      {ready && !loadError && (
        <footer
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: `1px solid ${C.divider}`,
            padding: isMobile ? '12px 16px' : '14px 32px',
          }}
        >
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {problems.length > 0 && (
              <Notice tone="danger">
                {problems.slice(0, 6).map((p) => (
                  <div key={p}>{p}</div>
                ))}
              </Notice>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              {index > 0 ? (
                <button type="button" onClick={back} disabled={busy} style={secondaryButton}>
                  Back
                </button>
              ) : (
                <span />
              )}
              {isLast ? (
                <button type="button" onClick={finish} disabled={busy} style={primaryButton(busy)}>
                  {busy ? 'Verifying…' : 'Verify & start applying'}
                </button>
              ) : (
                <button type="button" onClick={next} disabled={busy} style={primaryButton(busy)}>
                  {busy ? 'Saving…' : step.id === 'import' ? (draft.cv?.originalName ? 'Continue' : 'Skip, fill in manually') : 'Save & continue'}
                </button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ProfileSetupPage;

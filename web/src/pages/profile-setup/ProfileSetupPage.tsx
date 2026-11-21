import { useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JaviBrandMark } from '@/assets/logos';
import { authApi, authStateStorage, profileApi, SETUP_STEP_COUNT } from '@/api';
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
  const { draft, patch, saveStep, loading, loadError, reload, adopt } = useSetupDraft();
  const [index, setIndex] = useState(() => Math.min(authStateStorage.getSetupStep(), SETUP_STEP_COUNT) - 1);
  const [problems, setProblems] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    setIndex(next);
    setProblems([]);
    authStateStorage.setSetupStep(next + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Validate and save the current step. Returns false (and shows why) if the user must stay. */
  const commit = async (): Promise<boolean> => {
    const issues = VALIDATORS[step.id]?.(draft) ?? [];
    if (issues.length) {
      setProblems(issues.map((i) => `${i} is required.`));
      return false;
    }
    const overrides = NORMALIZERS[step.id]?.(draft) ?? {};
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

  // Going back saves too when the step is complete, but never blocks: half-filled steps keep their draft.
  const back = async () => {
    if (!(VALIDATORS[step.id]?.(draft) ?? []).length) await saveStep(step, NORMALIZERS[step.id]?.(draft) ?? {}).catch(() => undefined);
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
        return <ImportStep draft={draft} onImported={adopt} />;
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
        {loading ? (
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

      {!loading && !loadError && (
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

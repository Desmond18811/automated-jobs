import { useCallback, useEffect, useState } from 'react';
import { ApiError, authStateStorage, profileApi } from '@/api';
import { useUserProfile } from '@/context/ProfileContext';
import { EMPTY_PROFILE, type UserProfile } from '@/types/profile';

export type StepId = 'import' | 'identity' | 'career' | 'background' | 'skills' | 'links' | 'eligibility' | 'automation' | 'review';

export interface StepDef {
  id: StepId;
  title: string;
  /** Profile fields this step owns. "Continue" PUTs exactly these, nothing else. */
  fields: Array<keyof UserProfile>;
}

export const STEPS: StepDef[] = [
  { id: 'import', title: 'Import your CV', fields: [] },
  {
    id: 'identity',
    title: 'Identity & contact',
    fields: ['firstName', 'lastName', 'pronouns', 'email', 'phone', 'avatarUrl', 'headline', 'address'],
  },
  {
    id: 'career',
    title: 'Career target',
    fields: [
      'targetRoles', 'industry', 'specificTitle', 'currentTitle', 'currentCompany', 'yearsOfExperience',
      'inferredLevel', 'validatedLevel', 'remotePreference', 'locations', 'willingToRelocate', 'salaryExpectation', 'salaryFloor',
    ],
  },
  {
    id: 'background',
    title: 'Experience & education',
    fields: ['experience', 'education', 'highestEducationLevel', 'projects', 'certifications', 'languages'],
  },
  {
    id: 'skills',
    title: 'Skills & summary',
    fields: ['skills', 'primarySkills', 'secondarySkills', 'toolsAndFrameworks', 'summary', 'elevatorPitch'],
  },
  { id: 'links', title: 'Links', fields: ['linkedinUrl', 'githubUrl', 'portfolioUrl', 'twitterUrl', 'links'] },
  {
    id: 'eligibility',
    title: 'Eligibility & EEO',
    fields: ['workAuthorization', 'requiresSponsorship', 'futureSponsorship', 'securityClearance', 'noticePeriod', 'earliestStartDate', 'eeo'],
  },
  { id: 'automation', title: 'Automation rules', fields: ['rules', 'blockedCompanies'] },
  { id: 'review', title: 'Review & verify', fields: [] },
];

/** Which step fixes each label /profile/verify can return in `details.missing`. */
export function stepForMissing(label: string): number {
  const l = label.toLowerCase();
  if (/linkedin/.test(l)) return STEPS.findIndex((s) => s.id === 'links');
  if (/target role/.test(l)) return STEPS.findIndex((s) => s.id === 'career');
  if (/experience|project/.test(l)) return STEPS.findIndex((s) => s.id === 'background');
  if (/skill|summary/.test(l)) return STEPS.findIndex((s) => s.id === 'skills');
  return STEPS.findIndex((s) => s.id === 'identity');
}

/** Turn a zod `flatten()` error from the server into readable lines. */
export function describeSaveError(err: unknown): string[] {
  if (err instanceof ApiError) {
    const fieldErrors = err.data?.details?.fieldErrors as Record<string, string[]> | undefined;
    const formErrors = (err.data?.details?.formErrors as string[] | undefined) ?? [];
    const missing = err.data?.details?.missing as string[] | undefined;
    if (missing?.length) return missing;
    const lines = [
      ...formErrors,
      ...Object.entries(fieldErrors ?? {}).map(([field, msgs]) => `${field}: ${msgs.join(', ')}`),
    ];
    return lines.length ? lines : [err.message];
  }
  return [err instanceof Error ? err.message : 'Could not save. Check your connection and try again.'];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Make a half-filled step safe to save: rows missing a required part and malformed values are left out of the
 * payload so a partial draft never makes the whole PUT fail. What is dropped stays on screen, just not saved yet.
 */
export function sanitizeDraft(payload: Record<string, any>): Record<string, any> {
  const out = { ...payload };
  if ('email' in out && out.email && !EMAIL.test(String(out.email))) delete out.email;
  if ('address' in out && !(out.address?.city && out.address?.country)) delete out.address;
  if (Array.isArray(out.experience)) out.experience = out.experience.filter((e: any) => e?.company?.trim() && e?.title?.trim());
  if (Array.isArray(out.education)) out.education = out.education.filter((e: any) => e?.institution?.trim());
  if (Array.isArray(out.projects)) out.projects = out.projects.filter((p: any) => p?.name?.trim());
  if (Array.isArray(out.certifications)) out.certifications = out.certifications.filter((c: any) => c?.name?.trim());
  if (Array.isArray(out.links)) out.links = out.links.filter((l: any) => /^https?:\/\//i.test(l?.url || ''));
  if (Array.isArray(out.skills)) out.skills = out.skills.filter((k: any) => k?.name?.trim());
  for (const k of ['linkedinUrl', 'githubUrl', 'portfolioUrl', 'twitterUrl']) {
    if (k in out && out[k] && !/^https?:\/\//i.test(out[k])) delete out[k];
  }
  return out;
}

function pick(profile: Partial<UserProfile>, keys: Array<keyof UserProfile>) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = profile[k];
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function useSetupDraft() {
  const { setProfile: setContextProfile } = useUserProfile();
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const adopt = useCallback(
    (server: any) => {
      const next: UserProfile = {
        ...EMPTY_PROFILE,
        ...server,
        rules: { ...EMPTY_PROFILE.rules, ...server?.rules, sendingHours: { ...EMPTY_PROFILE.rules.sendingHours, ...server?.rules?.sendingHours } },
      };
      // First visit: default the contact email to the account email and the timezone to this browser's.
      if (!next.email) next.email = authStateStorage.getLastEmail();
      if (!server?.rules?.sendingHours?.timezone || server.rules.sendingHours.timezone === 'UTC') {
        try {
          next.rules.sendingHours.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch {
          // keep UTC
        }
      }

      // Populate firstName & lastName from fullName if needed
      if ((!next.firstName || !next.lastName) && next.fullName) {
        const [f, ...r] = next.fullName.trim().split(/\s+/);
        if (!next.firstName) next.firstName = f || '';
        if (!next.lastName && r.length) next.lastName = r.join(' ');
      }

      // Nothing else is derived or defaulted here: the server owns derivation from the CV, and anything the CV
      // does not state (eligibility, notice period, industry, ...) stays empty for the user to answer.

      // Step synchronization from server
      if (server?.setupStep && typeof server.setupStep === 'number' && server.setupStep >= 1) {
        next.setupStep = server.setupStep;
      }
      setDraft(next);
      setContextProfile(next);
    },
    [setContextProfile],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      adopt(await profileApi.get());
    } catch (err) {
      setLoadError(describeSaveError(err).join(' '));
    } finally {
      setLoading(false);
    }
  }, [adopt]);

  useEffect(() => {
    reload();
  }, [reload]);

  const patch = useCallback((partial: Partial<UserProfile>) => setDraft((d) => ({ ...d, ...partial })), []);

  /**
   * PUT only the given step's fields (with optional normalised overrides). Throws on failure so the
   * caller keeps the user on the step. On success, only that step's fields are taken back from the
   * server, so unsaved edits on other steps survive.
   */
  const saveStep = useCallback(
    async (step: StepDef, overrides: Partial<UserProfile> = {}) => {
      if (!step.fields.length && !overrides.setupStep) return;
      const source = { ...draft, ...overrides };
      const payload: any = pick(source, step.fields);
      if (step.id === 'identity') {
        payload.fullName = `${source.firstName} ${source.lastName}`.trim();
        if (source.address?.city && source.address?.country) payload.location = `${source.address.city}, ${source.address.country}`;
      }
      if (overrides.setupStep) {
        payload.setupStep = overrides.setupStep;
      }
      const saved: UserProfile = await profileApi.update(payload);
      const fromServer = pick({ ...EMPTY_PROFILE, ...saved }, [...step.fields, 'fullName', 'location', 'status', 'setupStep']);
      setDraft((d) => ({ ...d, ...fromServer }));
      setContextProfile({ ...EMPTY_PROFILE, ...saved, rules: { ...EMPTY_PROFILE.rules, ...saved.rules } });
    },
    [draft, setContextProfile],
  );

  /** The payload autosave would send for this step (sanitised, never includes progress). */
  const draftPayload = useCallback(
    (step: StepDef) => {
      const payload: any = pick(draft, step.fields);
      if (step.id === 'identity') {
        payload.fullName = `${draft.firstName} ${draft.lastName}`.trim();
        if (draft.address?.city && draft.address?.country) payload.location = `${draft.address.city}, ${draft.address.country}`;
      }
      return sanitizeDraft(payload);
    },
    [draft],
  );

  return { draft, patch, saveStep, draftPayload, loading, loadError, reload, adopt };
}

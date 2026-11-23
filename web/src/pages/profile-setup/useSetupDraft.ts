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

      // Populate address from location if needed
      if ((!next.address || !next.address.city || !next.address.country) && next.location) {
        const parts = String(next.location).split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          next.address = {
            street: next.address?.street || '',
            city: parts[0],
            state: parts.length > 2 ? parts[1] : (next.address?.state || ''),
            postalCode: next.address?.postalCode || '',
            country: parts[parts.length - 1],
          };
        } else if (parts.length === 1) {
          const loc = parts[0];
          if (/nigeria/i.test(loc)) next.address = { street: '', city: 'Lagos', state: 'Lagos', postalCode: '', country: 'Nigeria' };
          else if (/ghana/i.test(loc)) next.address = { street: '', city: 'Accra', state: '', postalCode: '', country: 'Ghana' };
          else if (/kenya/i.test(loc)) next.address = { street: '', city: 'Nairobi', state: '', postalCode: '', country: 'Kenya' };
          else if (/united kingdom|uk\b/i.test(loc)) next.address = { street: '', city: 'London', state: '', postalCode: '', country: 'United Kingdom' };
          else if (/united states|usa\b/i.test(loc)) next.address = { street: '', city: 'New York', state: 'NY', postalCode: '', country: 'United States' };
          else next.address = { street: '', city: loc, state: '', postalCode: '', country: loc };
        }
      }

      // Populate currentTitle & currentCompany from experience
      if (Array.isArray(next.experience) && next.experience.length > 0) {
        const first = next.experience[0];
        if (!next.currentTitle && first.title) next.currentTitle = first.title;
        if (!next.currentCompany && first.company) next.currentCompany = first.company;
      }

      // Populate targetRoles from currentTitle or headline
      if (!next.targetRoles?.length) {
        const roleSource = next.currentTitle || next.headline;
        if (roleSource) {
          const clean = roleSource.split(/[·|•,-]/)[0].trim();
          if (clean && clean.length >= 2) next.targetRoles = [clean];
        }
      }

      // Populate yearsOfExperience & levels
      if (next.yearsOfExperience == null && next.experience?.length) {
        const allYears: number[] = [];
        for (const exp of next.experience) {
          const s = String(exp.start || '').match(/\b(19\d\d|20\d\d)\b/g);
          const e = String(exp.end || '').match(/\b(19\d\d|20\d\d)\b/g);
          if (s) allYears.push(...s.map(Number));
          if (e) allYears.push(...e.map(Number));
          if (exp.current) allYears.push(new Date().getFullYear());
        }
        if (allYears.length >= 2) {
          next.yearsOfExperience = Math.min(40, Math.max(1, Math.max(...allYears) - Math.min(...allYears)));
        } else {
          next.yearsOfExperience = Math.min(30, Math.max(1, Math.round(next.experience.length * 1.5)));
        }
        const y = next.yearsOfExperience;
        next.inferredLevel = y < 1 ? 'entry' : y <= 2 ? 'junior' : y <= 5 ? 'mid' : y <= 9 ? 'senior' : 'expert';
        if (!next.validatedLevel) next.validatedLevel = next.inferredLevel;
      }

      // Highest education level
      if (!next.highestEducationLevel && next.education?.length) {
        const deg = next.education.map((e) => `${e.degree || ''} ${e.field || ''}`).join(' ').toLowerCase();
        if (/phd|doctorate/i.test(deg)) next.highestEducationLevel = 'doctorate';
        else if (/master|mba|msc/i.test(deg)) next.highestEducationLevel = 'master';
        else if (/bachelor|bsc|btech|b\.eng/i.test(deg)) next.highestEducationLevel = 'bachelor';
        else if (/associate|hnd|ond/i.test(deg)) next.highestEducationLevel = 'associate';
        else if (/bootcamp/i.test(deg)) next.highestEducationLevel = 'bootcamp';
        else next.highestEducationLevel = 'bachelor';
      }

      // Primary skills from skills if empty
      if (!next.primarySkills?.length && next.skills?.length) {
        next.primarySkills = next.skills.map((s) => s.name).filter(Boolean);
      }

      // Avatar / Picture auto-generation from candidate initials
      if (!next.avatarUrl && (next.fullName || next.firstName)) {
        const name = (next.fullName || `${next.firstName || ''} ${next.lastName || ''}`).trim();
        const parts = name.split(/\s+/);
        const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase() || 'J';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#1D4ED8"/></linearGradient></defs><rect width="256" height="256" rx="128" fill="url(#g)"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
        next.avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      }

      // Elevator pitch
      if (!next.elevatorPitch && next.headline) {
        const skillsSnippet = next.primarySkills?.slice(0, 3).join(', ');
        next.elevatorPitch = `${next.headline}${next.yearsOfExperience ? ` with over ${next.yearsOfExperience} years of experience` : ''}${skillsSnippet ? ` specializing in ${skillsSnippet}` : ''}.`;
      }

      // Default eligibility and work preferences
      if (!next.workAuthorization) next.workAuthorization = 'authorized';
      if (next.willingToRelocate === undefined) next.willingToRelocate = true;
      if (!next.noticePeriod) next.noticePeriod = '1 month';
      if (!next.remotePreference) next.remotePreference = 'any';
      if (!next.locations?.length) {
        const loc = next.location || next.experience?.[0]?.location || (next.address?.city ? `${next.address.city}${next.address.country ? `, ${next.address.country}` : ''}` : '');
        if (loc) next.locations = [loc];
      }
      if (!next.industry && next.targetRoles?.length) {
        const r = (next.targetRoles[0] || '').toLowerCase();
        if (/design|ui|ux|product/i.test(r)) next.industry = 'Product & Design';
        else if (/engineer|developer|software|backend|frontend|devops|cloud|data/i.test(r)) next.industry = 'Software & Technology';
        else if (/finance|account|fintech/i.test(r)) next.industry = 'Finance & FinTech';
        else if (/marketing|growth|content/i.test(r)) next.industry = 'Marketing & Communications';
        else next.industry = 'Technology';
      }

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

  return { draft, patch, saveStep, loading, loadError, reload, adopt };
}

import React, { useState, useEffect, useRef } from 'react';
import { api } from './api';
import type {
  AppState,
  Profile,
  Settings,
  Job,
  IntakeBatch,
  Decision,
  Lead
} from './types';
import { defaultProfile } from './types';
import AnswersCard from './AnswersCard';
import NotifyPanel from './NotifyPanel';
import './styles.css';

type FieldChange = React.ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

// Defined outside App so React keeps the same component between renders.
// (A component defined inside App would remount on every render and lose focus.)
function ProfileInput(props: {
  id: string;
  name: keyof Profile;
  label: string;
  value: string | undefined;
  onChange: (e: FieldChange) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
}) {
  const {
    id,
    name,
    label,
    value,
    onChange,
    type = 'text',
    autoComplete,
    placeholder,
    hint
  } = props;
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

const NOTICE_PERIOD_OPTIONS = [
  'Immediate',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  'Negotiable'
];

const YEARS_EXPERIENCE_OPTIONS = [
  '0 - 1 year (Entry-level)',
  '1 - 2 years (Junior)',
  '3 - 5 years (Mid-level)',
  '5 - 8 years (Senior)',
  '8 - 10 years (Lead / Staff)',
  '10+ years (Principal / Director)'
];

const START_DATE_OPTIONS = [
  'Immediately',
  'Within 2 weeks',
  'Within 1 month',
  'Within 2 months',
  'Flexible / Negotiable'
];

const HIGHEST_DEGREE_OPTIONS = [
  'High School Diploma / GED',
  'Associate Degree',
  "Bachelor's Degree (B.Sc, B.A, B.Eng)",
  "Master's Degree (M.Sc, M.A, M.Eng)",
  'Master of Business Administration (MBA)',
  'Doctorate / Ph.D.',
  'Juris Doctor (J.D.)',
  'Doctor of Medicine (M.D.)',
  'Bootcamp / Professional Certificate',
  'Other'
];

const GENDER_OPTIONS = [
  'Decline to self-identify',
  'Male',
  'Female',
  'Non-binary',
  'Other'
];

const PRONOUNS_OPTIONS = [
  'He / Him',
  'She / Her',
  'They / Them',
  'He / They',
  'She / They',
  'Prefer not to say'
];

const RACE_OPTIONS = [
  'Decline to self-identify',
  'Black / African American',
  'Hispanic / Latino',
  'White / Caucasian',
  'Asian',
  'Two or More Races',
  'Native American / Alaska Native',
  'Native Hawaiian / Pacific Islander'
];

const VETERAN_OPTIONS = [
  'Decline to self-identify',
  'I am not a protected veteran',
  'I identify as one or more of the classifications of a protected veteran'
];

const DISABILITY_OPTIONS = [
  'Decline to answer',
  'No, I do not have a disability',
  'Yes, I have a disability (or previously had one)'
];

const WORK_AUTH_OPTIONS = [
  'Citizen / Permanent Resident',
  'Authorized to work (No sponsorship required)',
  'Requires Visa Sponsorship',
  'Student Visa / OPT / CPT',
  'Nigeria',
  'United States',
  'United Kingdom',
  'Canada',
  'European Union',
  'Other'
];

const REFERRED_BY_OPTIONS = [
  'LinkedIn',
  'Company Website / Careers Page',
  'Indeed',
  'Glassdoor',
  'Employee / Personal Referral',
  'Recruiter',
  'Job Board',
  'Other'
];

function ProfileSelect(props: {
  id: string;
  name: keyof Profile;
  label: string;
  value: string | undefined;
  options: string[];
  placeholder?: string;
  autoComplete?: string;
  onChange: (e: FieldChange) => void;
  hint?: string;
}) {
  const {
    id,
    name,
    label,
    value,
    options,
    placeholder = 'Select...',
    autoComplete,
    onChange,
    hint
  } = props;
  const hasCustomValue = Boolean(value && !options.includes(value));

  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        autoComplete={autoComplete}
        value={value || ''}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {hasCustomValue && <option value={value}>{value}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

// The server may return just a file name ("<id>.png") or a full path.
function shotUrl(job: Job): string {
  const s = job.screenshot || '';
  const base =
    s.startsWith('/') || s.startsWith('http') ? s : `/api/screenshots/${s}`;
  return `${base}?t=${encodeURIComponent(job.updatedAt)}`;
}

const PROFILE_LABELS: Partial<Record<keyof Profile, string>> = {
  firstName: 'first name',
  lastName: 'last name',
  email: 'email',
  phone: 'phone',
  streetAddress: 'street address',
  city: 'city',
  stateProvince: 'state',
  postalCode: 'postal code',
  country: 'country',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  twitter: 'Twitter / X',
  portfolio: 'portfolio',
  website: 'website',
  currentTitle: 'current title',
  currentCompany: 'current company',
  yearsExperience: 'years of experience',
  skills: 'skills',
  highestDegree: 'highest degree',
  school: 'school',
  fieldOfStudy: 'field of study',
  graduationYear: 'graduation year',
  languages: 'languages'
};

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [serverError, setServerError] = useState<boolean>(false);
  const [notices, setNotices] = useState<
    Array<{ id: string; type: 'success' | 'error' | 'warning'; text: string }>
  >([]);

  // Dismissed persistent banner tracking
  const [dismissedAiBanner, setDismissedAiBanner] = useState<boolean>(false);
  const [dismissedVisionBanner, setDismissedVisionBanner] = useState<boolean>(false);
  const [dismissedWaBanner, setDismissedWaBanner] = useState<boolean>(false);

  // Profile draft: loaded from the server ONCE, then only changed by you (or by Save)
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [profileDirty, setProfileDirty] = useState<boolean>(false);
  const profileInitialized = useRef<boolean>(false);

  // Email drafts you're editing, per job ID
  const [emailDrafts, setEmailDrafts] = useState<
    Record<string, { subject: string; body: string }>
  >({});

  // Intake UI states
  const [intakeFiles, setIntakeFiles] = useState<File[]>([]);
  const [intakeText, setIntakeText] = useState<string>('');
  const [scanListings, setScanListings] = useState<boolean>(false);
  const [autoApply, setAutoApply] = useState<boolean>(true);
  const [isReadingIntake, setIsReadingIntake] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvFileInputRef = useRef<HTMLInputElement>(null);

  // Selected leads in the newest batch
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set()
  );
  const lastBatchIdRef = useRef<string | null>(null);

  // Screenshot modal
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);

  const addNotice = (
    type: 'success' | 'error' | 'warning',
    text: string
  ) => {
    const id = Math.random().toString(36).slice(2);
    setNotices((prev) => [...prev, { id, type, text }]);
  };

  const removeNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  // Poll /api/state every 2 seconds.
  // This function is captured once by setInterval, so it must only use refs and
  // state setters, never state values (they would be stuck at their first value).
  const fetchState = async () => {
    try {
      const data = await api<AppState>('/api/state');
      setState(data);
      setServerError(false);

      // Load the profile into the form ONCE. Never overwrite it from the poll:
      // that is what wiped autofilled and typed fields every 2 seconds.
      if (data.profile && !profileInitialized.current) {
        setProfileDraft({ ...defaultProfile, ...data.profile });
        profileInitialized.current = true;
      }

      // Default selections for a new intake batch
      const newestBatch = data.intake?.[0];
      if (newestBatch && newestBatch.id !== lastBatchIdRef.current) {
        lastBatchIdRef.current = newestBatch.id;
        const initialSelected = new Set<string>();
        for (const l of newestBatch.leads) {
          if (!l.duplicateOf && l.selected && l.kind !== 'instructions') {
            initialSelected.add(l.id);
          }
        }
        setSelectedLeadIds(initialSelected);
      }
    } catch {
      setServerError(true);
    }
  };

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 2000);
    return () => clearInterval(timer);
  }, []);

  // Keep one local draft per waiting email job. Seed new ones from the server,
  // keep the ones you're editing, and drop jobs that are no longer waiting.
  useEffect(() => {
    if (!state) return;
    const waiting = state.jobs.filter(
      (j) =>
        j.kind === 'email' &&
        (j.status === 'review' || j.status === 'needs_you')
    );
    setEmailDrafts((prev) => {
      const next: Record<string, { subject: string; body: string }> = {};
      for (const j of waiting) {
        next[j.id] = prev[j.id] ?? {
          subject: j.draft?.subject || '',
          body: j.draft?.body || ''
        };
      }
      return next;
    });
  }, [state?.jobs]);

  // Runner controls
  const handleStartRunner = async () => {
    try {
      if (profileDraft && (profileDraft.firstName || profileDraft.lastName || profileDraft.email)) {
        await api('/api/profile', { method: 'PUT', json: profileDraft });
        setProfileDirty(false);
      }
      await api('/api/runner/start', {
        method: 'POST',
        json: { profile: profileDraft }
      });
      addNotice('success', 'Runner started.');
      fetchState();
    } catch (err: any) {
      addNotice('error', err.message);
    }
  };

  const handleStopRunner = async () => {
    try {
      await api('/api/runner/stop', { method: 'POST' });
      addNotice('success', 'Runner stopped.');
      fetchState();
    } catch (err: any) {
      addNotice('error', err.message);
    }
  };

  // CV upload. fetch() doesn't throw on HTTP errors, so check res.ok,
  // otherwise a rejected (e.g. scanned) CV would still show "Uploaded".
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('cv', file);

    try {
      const res = await fetch('/api/cv', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      addNotice('success', `Uploaded CV: ${data.fileName || file.name}`);
      fetchState();
    } catch (err: any) {
      addNotice('error', `CV not uploaded: ${err.message}`);
    } finally {
      if (cvFileInputRef.current) cvFileInputRef.current.value = '';
    }
  };

  // One handler for every profile field. Browser autofill fires input events,
  // which React delivers here like normal typing.
  const onProfileChange = (e: FieldChange) => {
    const { name, value } = e.target;
    setProfileDraft(
      (prev) => ({ ...(prev ?? defaultProfile), [name]: value }) as Profile
    );
    setProfileDirty(true);
  };

  const handleAutofillSample = () => {
    setProfileDraft({
      ...defaultProfile,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada.lovelace@example.com',
      phone: '+1 555-0142',
      streetAddress: '123 Algorithm Way',
      city: 'San Francisco',
      stateProvince: 'CA',
      postalCode: '94105',
      country: 'United States',
      linkedin: 'https://linkedin.com/in/adalovelace',
      github: 'https://github.com/adalovelace',
      twitter: 'https://x.com/adalovelace',
      portfolio: 'https://adalovelace.dev',
      website: 'https://adalovelace.io',
      currentTitle: 'Senior Software Engineer',
      currentCompany: 'Pioneer Labs',
      yearsExperience: '6',
      noticePeriod: '2 weeks',
      salaryExpectation: '$140,000',
      startDate: 'Immediately',
      workPreference: 'Remote',
      skills:
        'TypeScript, React, Node.js, Python, PostgreSQL, Distributed Systems',
      highestDegree: 'Bachelor of Science',
      school: 'University of Oxford',
      fieldOfStudy: 'Computer Science & Mathematics',
      graduationYear: '2018',
      pronouns: 'She/Her',
      gender: 'Female',
      raceEthnicity: 'Decline',
      veteranStatus: 'Not a veteran',
      disabilityStatus: 'No',
      referredBy: 'LinkedIn',
      languages: 'English',
      workAuthorization: 'United States',
      needsSponsorship: 'no',
      willingToRelocate: 'yes',
      extraFacts:
        'Passionate about full-stack engineering, developer tooling, and automated workflows.'
    });
    setProfileDirty(true);
    addNotice('success', 'Profile fields autofilled with sample data.');
  };

  // Fills ONLY empty fields with what your CV actually says. Never touches eligibility or EEO answers.
  const handleAutofillFromCv = async () => {
    try {
      const extracted = await api<Partial<Profile>>('/api/cv/autofill-profile', { method: 'POST' });
      const isEmpty = (p: Profile, k: keyof Profile) => !p[k] || !String(p[k]).trim();
      const entries = (Object.entries(extracted) as Array<[keyof Profile, string]>).filter(([, v]) => Boolean(v));
      // Names for the notice, from the form as it is now.
      const current = profileDraft ?? defaultProfile;
      const filled = entries.filter(([k]) => isEmpty(current, k)).map(([k]) => PROFILE_LABELS[k] || String(k));
      // Fill ONLY empty fields (functional update, so anything typed meanwhile is kept).
      setProfileDraft((prev) => {
        const next = { ...(prev ?? defaultProfile) } as Profile;
        for (const [k, v] of entries) if (isEmpty(next, k)) (next as any)[k] = v;
        return next;
      });
      if (filled.length) {
        setProfileDirty(true);
        addNotice(
          'success',
          `Filled from your CV: ${filled.join(', ')}. Check them, then click Save profile. Work authorization, sponsorship and the EEO questions are yours to answer.`
        );
      } else {
        addNotice('warning', 'Nothing new to fill: your CV has no details for the empty fields.');
      }
    } catch (err: any) {
      addNotice('error', `Couldn't read your CV: ${err.message}`);
    }
  };

  // Save the profile. If the server drops fields it doesn't know about, keep
  // them in the form and say which ones, instead of silently losing them.
  const handleSaveProfile = async () => {
    if (!profileDraft) return;
    try {
      const saved = await api<Profile>('/api/profile', {
        method: 'PUT',
        json: profileDraft
      });
      const dropped = (Object.keys(profileDraft) as (keyof Profile)[]).filter(
        (k) => profileDraft[k] && !(k in saved)
      );
      setProfileDraft({ ...defaultProfile, ...profileDraft, ...saved });
      setProfileDirty(dropped.length > 0);
      if (dropped.length > 0) {
        addNotice(
          'warning',
          `The server didn't save: ${dropped.join(', ')}. Add these fields to Profile and EMPTY_PROFILE on the server, then save again.`
        );
      } else {
        addNotice('success', 'Profile saved.');
      }
      fetchState();
    } catch (err: any) {
      addNotice('error', `Failed to save profile: ${err.message}`);
    }
  };

  const updateSettings = async (partial: Partial<Settings>) => {
    if (!state) return;
    const merged = { ...state.settings, ...partial };
    try {
      const saved = await api<Settings>('/api/settings', {
        method: 'PUT',
        json: merged
      });
      setState((prev) => (prev ? { ...prev, settings: saved } : null));
    } catch (err: any) {
      addNotice('error', `Failed to update settings: ${err.message}`);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      await api('/api/mail/test', { method: 'POST' });
      addNotice('success', 'Test email sent.');
    } catch (err: any) {
      addNotice('error', `Test email failed: ${err.message}`);
    }
  };

  const setDraftField = (
    jobId: string,
    field: 'subject' | 'body',
    value: string
  ) => {
    setEmailDrafts((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] ?? { subject: '', body: '' }), [field]: value }
    }));
  };

  // Save an email draft when a field loses focus
  const handleSaveDraft = async (jobId: string) => {
    const draft = emailDrafts[jobId];
    if (!draft) return;
    try {
      await api(`/api/jobs/${jobId}/draft`, {
        method: 'PUT',
        json: draft
      });
    } catch (err: any) {
      addNotice('error', `Failed to save draft: ${err.message}`);
    }
  };

  const handleDecision = async (job: Job, decision: Decision) => {
    try {
      // Save the draft before sending. Otherwise the blur-save and the Send click
      // race each other and the server can send the old text.
      if (job.kind === 'email' && decision === 'send' && emailDrafts[job.id]) {
        await api(`/api/jobs/${job.id}/draft`, {
          method: 'PUT',
          json: emailDrafts[job.id]
        });
      }
      await api(`/api/jobs/${job.id}/decision`, {
        method: 'POST',
        json: { decision }
      });
      // After a redraft, reload the new text from the server
      if (job.kind === 'email' && decision === 'refill') {
        setEmailDrafts((prev) => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }
      fetchState();
    } catch (err: any) {
      addNotice('error', `Action failed: ${err.message}`);
    }
  };

  const handleFindJobs = async () => {
    if (intakeFiles.length === 0 && !intakeText.trim()) {
      addNotice('warning', 'Add files or paste links or text first.');
      return;
    }

    setIsReadingIntake(true);
    const fd = new FormData();
    for (const f of intakeFiles) {
      fd.append('files', f);
    }
    if (intakeText.trim()) {
      fd.append('text', intakeText.trim());
    }
    if (scanListings) {
      fd.append('scanListings', 'true');
    }

    try {
      const res = await fetch('/api/intake', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to read inputs');
      }
      const batch: IntakeBatch = await res.json();
      setIntakeFiles([]);
      setIntakeText('');
      setScanListings(false);
      addNotice('success', `Found ${batch.leads.length} jobs.`);
      fetchState();

      if (autoApply && batch.leads.length > 0) {
        const validLeadIds = batch.leads
          .filter((l) => !l.duplicateOf && l.kind !== 'instructions')
          .map((l) => l.id);
        if (validLeadIds.length > 0) {
          await handleAcceptLeadsAndStart(batch.id, validLeadIds);
        }
      }
    } catch (err: any) {
      addNotice('error', `Intake error: ${err.message}`);
    } finally {
      setIsReadingIntake(false);
    }
  };

  const handleAcceptLeadsAndStart = async (
    batchId: string,
    leadIdsOverride?: string[]
  ) => {
    const leadIds = leadIdsOverride || Array.from(selectedLeadIds);
    if (leadIds.length === 0) {
      addNotice('warning', 'No jobs selected to add.');
      return;
    }
    try {
      if (profileDraft && (profileDraft.firstName || profileDraft.lastName || profileDraft.email)) {
        await api('/api/profile', { method: 'PUT', json: profileDraft });
        setProfileDirty(false);
      }
      const res = await api<{
        added?: number | unknown[];
        duplicates?: number;
        addedCount?: number;
        duplicatesCount?: number;
      }>(`/api/intake/${batchId}/accept`, {
        method: 'POST',
        json: { leadIds }
      });
      const added =
        res.addedCount ??
        (Array.isArray(res.added) ? res.added.length : Number(res.added ?? 0));
      const dups = res.duplicatesCount ?? res.duplicates ?? 0;
      addNotice(
        'success',
        `Added ${added} job${added === 1 ? '' : 's'} to queue${
          dups ? ` (${dups} already there)` : ''
        }. Starting runner…`
      );
      fetchState();

      try {
        await api('/api/runner/start', {
          method: 'POST',
          json: { profile: profileDraft }
        });
        addNotice('success', 'Runner started applying for jobs!');
        fetchState();
      } catch (err: any) {
        addNotice(
          'warning',
          `Jobs queued, but runner needs setup: ${err.message}`
        );
      }
    } catch (err: any) {
      addNotice('error', `Failed to add jobs: ${err.message}`);
    }
  };

  const handleAcceptLeads = async (batchId: string) => {
    const leadIds = Array.from(selectedLeadIds);
    if (leadIds.length === 0) {
      addNotice('warning', 'No jobs selected to add.');
      return;
    }
    try {
      // Accepts either { added, duplicates } or { addedCount, duplicatesCount }
      const res = await api<{
        added?: number | unknown[];
        duplicates?: number;
        addedCount?: number;
        duplicatesCount?: number;
      }>(`/api/intake/${batchId}/accept`, {
        method: 'POST',
        json: { leadIds }
      });
      const added =
        res.addedCount ??
        (Array.isArray(res.added) ? res.added.length : Number(res.added ?? 0));
      const dups = res.duplicatesCount ?? res.duplicates ?? 0;
      addNotice(
        'success',
        `Added ${added} job${added === 1 ? '' : 's'} to the queue${dups ? ` (${dups} already there)` : ''
        }.`
      );
      fetchState();
    } catch (err: any) {
      addNotice('error', `Failed to add jobs: ${err.message}`);
    }
  };

  const handleDiscardBatch = async (batchId: string) => {
    try {
      await api(`/api/intake/${batchId}`, { method: 'DELETE' });
      addNotice('success', 'Batch discarded.');
      fetchState();
    } catch (err: any) {
      addNotice('error', `Failed to discard batch: ${err.message}`);
    }
  };

  const handleClearFinished = async () => {
    try {
      const res = await api<{ removed?: number }>(
        '/api/jobs/clear-finished',
        { method: 'POST' }
      );
      addNotice(
        'success',
        res?.removed != null
          ? `Cleared ${res.removed} finished jobs.`
          : 'Cleared applied and skipped jobs.'
      );
      fetchState();
    } catch (err: any) {
      addNotice('error', `Failed to clear finished jobs: ${err.message}`);
    }
  };

  const handleRequeue = async (jobId: string) => {
    try {
      await api(`/api/jobs/${jobId}/requeue`, { method: 'POST' });
      addNotice('success', 'Job re-queued.');
      fetchState();
    } catch (err: any) {
      addNotice('error', `Failed to requeue job: ${err.message}`);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await api(`/api/jobs/${jobId}`, { method: 'DELETE' });
      addNotice('success', 'Job removed.');
      fetchState();
    } catch (err: any) {
      addNotice('error', `Failed to remove job: ${err.message}`);
    }
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setIntakeFiles((prev) => [...prev, ...dropped]);
    }
  };

  const getHeaderStatusText = (): string => {
    if (!state) return 'Connecting to server…';

    const waiting = state.jobs.filter(
      (j) => j.status === 'review' || j.status === 'needs_you'
    );
    const reviewEmails = state.jobs.filter(
      (j) =>
        j.kind === 'email' &&
        (j.status === 'review' || j.status === 'needs_you')
    );
    const emailReviewSuffix =
      reviewEmails.length > 0
        ? `. ${reviewEmails.length} email${reviewEmails.length === 1 ? '' : 's'} to approve.`
        : '';

    if (state.runner.waitingOn || waiting.length > 0) {
      return `Paused until you answer the job below${emailReviewSuffix}`;
    }

    if (state.runner.currentJobId) {
      const current = state.jobs.find(
        (j) => j.id === state.runner.currentJobId
      );
      const title = current?.title || 'the current job';
      return `Working on ${title}${emailReviewSuffix}`;
    }

    if (state.runner.running) {
      return `Waiting a few seconds before the next job${emailReviewSuffix}`;
    }

    const missing: string[] = [];
    if (!state.cv) missing.push('upload your CV');
    const p = state.profile;
    if (!(p.firstName || p.lastName) || !p.email || !p.phone) {
      missing.push('save your name, email and phone');
    }
    const queuedCount = state.jobs.filter((j) => j.status === 'queued').length;
    if (queuedCount === 0) {
      missing.push('add jobs');
    }

    if (missing.length > 0) {
      return `To start: ${missing.join(', ')}${emailReviewSuffix}`;
    }

    return `${queuedCount} job${queuedCount === 1 ? '' : 's'} ready to go${emailReviewSuffix}`;
  };

  const isSetupComplete = Boolean(
    state?.cv &&
    (state?.profile.firstName || state?.profile.lastName) &&
    state?.profile.email &&
    state?.profile.phone &&
    state?.jobs.some((j) => j.status === 'queued')
  );

  const waitingJobs = (state?.jobs || []).filter(
    (j) => j.status === 'review' || j.status === 'needs_you'
  );

  const newestBatch = state?.intake?.[0];

  const queueCounts = {
    queued: (state?.jobs || []).filter((j) => j.status === 'queued').length,
    applied: (state?.jobs || []).filter((j) => j.status === 'applied').length,
    emailsToApprove: (state?.jobs || []).filter(
      (j) =>
        j.kind === 'email' &&
        (j.status === 'review' || j.status === 'needs_you')
    ).length,
    failed: (state?.jobs || []).filter((j) => j.status === 'failed').length,
    skipped: (state?.jobs || []).filter((j) => j.status === 'skipped').length
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <h1 className="header-title">J. A. V. I</h1>
          <div className="header-status">{getHeaderStatusText()}</div>
        </div>
        <div className="header-actions">
          {state?.runner.running ? (
            <button className="btn btn-danger" onClick={handleStopRunner}>
              Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!isSetupComplete}
              onClick={handleStartRunner}
            >
              Start applying
            </button>
          )}
        </div>
      </header>

      {/* Banners */}
      <div className="banners-wrapper">
        {serverError && (
          <div className="banner banner-error">
            <span>Lost connection to the server. Retrying…</span>
          </div>
        )}

        {state && !state.aiReady && !dismissedAiBanner && (
          <div className="banner banner-warning">
            <span>
              Custom questions and flyer images won't be read until you add
              OPENROUTER_API_KEY, ANTHROPIC_API_KEY, QWEN_API_KEY, or
              DEEPSEEK_API_KEY to server/.env and restart.
            </span>
            <button
              className="banner-dismiss"
              onClick={() => setDismissedAiBanner(true)}
            >
              Dismiss
            </button>
          </div>
        )}

        {state && state.aiReady && !state.aiStatus?.vision && !dismissedVisionBanner && (
          <div className="banner banner-warning">
            <span>
              Photos of job flyers can't be read with your current AI setup. Add ANTHROPIC_API_KEY, or set
              OPENROUTER_VISION_MODEL to a vision model. Scanned PDFs need ANTHROPIC_API_KEY.
            </span>
            <button className="banner-dismiss" onClick={() => setDismissedVisionBanner(true)}>
              Dismiss
            </button>
          </div>
        )}

        {state &&
          state.settings.whatsappAlerts &&
          !state.whatsappReady &&
          !dismissedWaBanner && (
            <div className="banner banner-warning">
              <span>
                WhatsApp alerts are on but not set up. Add the WhatsApp
                settings to server/.env.
              </span>
              <button
                className="banner-dismiss"
                onClick={() => setDismissedWaBanner(true)}
              >
                Dismiss
              </button>
            </div>
          )}

        {notices.map((n) => (
          <div key={n.id} className={`banner banner-${n.type}`}>
            <span>{n.text}</span>
            <button
              className="banner-dismiss"
              onClick={() => removeNotice(n.id)}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <main className="layout-body">
        {/* Left column: CV, profile, settings */}
        <aside className="left-sidebar">
          {/* Your CV */}
          <section className="card">
            <h2 className="card-title">Your CV</h2>
            {state?.cv ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{state.cv.fileName}</div>
                <div className="field-hint">
                  Uploaded{' '}
                  {new Date(state.cv.uploadedAt).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            ) : (
              <p className="field-hint" style={{ marginBottom: 12 }}>
                Use a text PDF or Word file named like
                Firstname-Lastname-CV.pdf.
              </p>
            )}
            <input
              type="file"
              ref={cvFileInputRef}
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              onChange={handleCvUpload}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => cvFileInputRef.current?.click()}
            >
              {state?.cv ? 'Replace CV' : 'Upload CV'}
            </button>
          </section>

          {/* Profile form */}
          <section className="card">
            <div className="card-title">
              <span>Candidate profile</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {state?.cv && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAutofillFromCv}
                    title="Autofill profile details using your uploaded CV"
                  >
                    Autofill from CV
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAutofillSample}
                  title="Autofill profile fields with sample data"
                >
                  Autofill sample
                </button>
              </div>
            </div>
            {profileDraft && (
              <form
                autoComplete="on"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveProfile();
                }}
              >
                <fieldset>
                  <legend>Contact</legend>
                  <div className="field-row">
                    <ProfileInput
                      id="p-first"
                      name="firstName"
                      label="First name"
                      autoComplete="given-name"
                      value={profileDraft.firstName}
                      onChange={onProfileChange}
                    />
                    <ProfileInput
                      id="p-last"
                      name="lastName"
                      label="Last name"
                      autoComplete="family-name"
                      value={profileDraft.lastName}
                      onChange={onProfileChange}
                    />
                  </div>

                  <ProfileInput
                    id="p-email"
                    name="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={profileDraft.email}
                    onChange={onProfileChange}
                  />

                  <ProfileInput
                    id="p-phone"
                    name="phone"
                    label="Phone"
                    type="tel"
                    autoComplete="tel"
                    hint="With country code, e.g. +234 814 000 0000"
                    value={profileDraft.phone}
                    onChange={onProfileChange}
                  />

                  <ProfileInput
                    id="p-address"
                    name="streetAddress"
                    label="Street address"
                    autoComplete="street-address"
                    placeholder="e.g. 12 Adeola Odeku St"
                    value={profileDraft.streetAddress}
                    onChange={onProfileChange}
                  />

                  <div className="field-row">
                    <ProfileInput
                      id="p-city"
                      name="city"
                      label="City"
                      autoComplete="address-level2"
                      value={profileDraft.city}
                      onChange={onProfileChange}
                    />
                    <ProfileInput
                      id="p-state"
                      name="stateProvince"
                      label="State / Province"
                      autoComplete="address-level1"
                      value={profileDraft.stateProvince}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-row">
                    <ProfileInput
                      id="p-postal"
                      name="postalCode"
                      label="Postal code / Zip"
                      autoComplete="postal-code"
                      value={profileDraft.postalCode}
                      onChange={onProfileChange}
                    />
                    <ProfileInput
                      id="p-country"
                      name="country"
                      label="Country"
                      autoComplete="country-name"
                      value={profileDraft.country}
                      onChange={onProfileChange}
                    />
                  </div>

                  {/* Only Website gets autoComplete="url": on several fields at once
                      the browser pastes the same URL into all of them. */}
                  <ProfileInput
                    id="p-linkedin"
                    name="linkedin"
                    label="LinkedIn"
                    type="url"
                    value={profileDraft.linkedin}
                    onChange={onProfileChange}
                  />
                  <ProfileInput
                    id="p-github"
                    name="github"
                    label="GitHub"
                    type="url"
                    value={profileDraft.github}
                    onChange={onProfileChange}
                  />
                  <ProfileInput
                    id="p-twitter"
                    name="twitter"
                    label="Twitter / X"
                    placeholder="e.g. https://x.com/username or @username"
                    value={profileDraft.twitter}
                    onChange={onProfileChange}
                  />
                  <ProfileInput
                    id="p-portfolio"
                    name="portfolio"
                    label="Portfolio"
                    type="url"
                    placeholder="e.g. https://portfolio.dev"
                    value={profileDraft.portfolio}
                    onChange={onProfileChange}
                  />
                  <ProfileInput
                    id="p-website"
                    name="website"
                    label="Website"
                    type="url"
                    autoComplete="url"
                    value={profileDraft.website}
                    onChange={onProfileChange}
                  />
                </fieldset>

                <fieldset>
                  <legend>Work</legend>
                  <div className="field-row">
                    <ProfileInput
                      id="p-title"
                      name="currentTitle"
                      label="Current title"
                      autoComplete="organization-title"
                      value={profileDraft.currentTitle}
                      onChange={onProfileChange}
                    />
                    <ProfileInput
                      id="p-company"
                      name="currentCompany"
                      label="Current company"
                      autoComplete="organization"
                      value={profileDraft.currentCompany}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-row">
                    <ProfileSelect
                      id="p-years"
                      name="yearsExperience"
                      label="Years experience"
                      options={YEARS_EXPERIENCE_OPTIONS}
                      value={profileDraft.yearsExperience}
                      onChange={onProfileChange}
                    />
                    <ProfileSelect
                      id="p-notice"
                      name="noticePeriod"
                      label="Notice period"
                      options={NOTICE_PERIOD_OPTIONS}
                      value={profileDraft.noticePeriod}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-row">
                    <ProfileInput
                      id="p-salary"
                      name="salaryExpectation"
                      label="Salary expectation"
                      value={profileDraft.salaryExpectation}
                      onChange={onProfileChange}
                    />
                    <ProfileSelect
                      id="p-start"
                      name="startDate"
                      label="Start date"
                      options={START_DATE_OPTIONS}
                      value={profileDraft.startDate}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="p-pref">Work preference</label>
                    <select
                      id="p-pref"
                      name="workPreference"
                      value={profileDraft.workPreference || ''}
                      onChange={onProfileChange}
                    >
                      <option value="">Select...</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>

                  <ProfileInput
                    id="p-skills"
                    name="skills"
                    label="Key skills"
                    placeholder="e.g. TypeScript, React, Node.js, Python, PostgreSQL"
                    value={profileDraft.skills}
                    onChange={onProfileChange}
                  />
                </fieldset>

                <fieldset>
                  <legend>Education</legend>
                  <div className="field-row">
                    <ProfileSelect
                      id="p-degree"
                      name="highestDegree"
                      label="Highest degree"
                      options={HIGHEST_DEGREE_OPTIONS}
                      value={profileDraft.highestDegree}
                      onChange={onProfileChange}
                    />
                    <ProfileInput
                      id="p-school"
                      name="school"
                      label="School / University"
                      placeholder="e.g. University of Lagos"
                      value={profileDraft.school}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-row">
                    <ProfileInput
                      id="p-fos"
                      name="fieldOfStudy"
                      label="Field of study / Major"
                      placeholder="e.g. Computer Science"
                      value={profileDraft.fieldOfStudy}
                      onChange={onProfileChange}
                    />
                    <ProfileInput
                      id="p-gradyear"
                      name="graduationYear"
                      label="Graduation year"
                      placeholder="e.g. 2022"
                      value={profileDraft.graduationYear}
                      onChange={onProfileChange}
                    />
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Demographics & EEO</legend>
                  <div className="field-row">
                    <ProfileSelect
                      id="p-pronouns"
                      name="pronouns"
                      label="Pronouns"
                      options={PRONOUNS_OPTIONS}
                      value={profileDraft.pronouns}
                      onChange={onProfileChange}
                    />
                    <ProfileSelect
                      id="p-gender"
                      name="gender"
                      label="Gender"
                      autoComplete="sex"
                      options={GENDER_OPTIONS}
                      value={profileDraft.gender}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-row">
                    <ProfileSelect
                      id="p-race"
                      name="raceEthnicity"
                      label="Race / Ethnicity"
                      options={RACE_OPTIONS}
                      value={profileDraft.raceEthnicity}
                      onChange={onProfileChange}
                    />
                    <ProfileSelect
                      id="p-veteran"
                      name="veteranStatus"
                      label="Veteran status"
                      options={VETERAN_OPTIONS}
                      value={profileDraft.veteranStatus}
                      onChange={onProfileChange}
                    />
                  </div>

                  <div className="field-row">
                    <ProfileSelect
                      id="p-disability"
                      name="disabilityStatus"
                      label="Disability status"
                      options={DISABILITY_OPTIONS}
                      value={profileDraft.disabilityStatus}
                      onChange={onProfileChange}
                    />
                    <ProfileSelect
                      id="p-referred"
                      name="referredBy"
                      label="Referred by / Source"
                      options={REFERRED_BY_OPTIONS}
                      value={profileDraft.referredBy}
                      onChange={onProfileChange}
                    />
                  </div>

                  <ProfileInput
                    id="p-languages"
                    name="languages"
                    label="Languages spoken"
                    autoComplete="language"
                    placeholder="e.g. English, French, Yoruba"
                    value={profileDraft.languages}
                    onChange={onProfileChange}
                  />
                </fieldset>

                <fieldset>
                  <legend>Eligibility</legend>
                  <ProfileSelect
                    id="p-auth"
                    name="workAuthorization"
                    label="Where you can work / Work authorization"
                    options={WORK_AUTH_OPTIONS}
                    value={profileDraft.workAuthorization}
                    onChange={onProfileChange}
                  />

                  <div className="field-row">
                    <div className="field-group">
                      <label htmlFor="p-spon">Needs sponsorship</label>
                      <select
                        id="p-spon"
                        name="needsSponsorship"
                        value={profileDraft.needsSponsorship || ''}
                        onChange={onProfileChange}
                      >
                        <option value="">Select...</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor="p-reloc">Willing to relocate</label>
                      <select
                        id="p-reloc"
                        name="willingToRelocate"
                        value={profileDraft.willingToRelocate || ''}
                        onChange={onProfileChange}
                      >
                        <option value="">Select...</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Anything else forms ask</legend>
                  <div className="field-group">
                    <label htmlFor="p-facts">Facts AI may use</label>
                    <textarea
                      id="p-facts"
                      name="extraFacts"
                      rows={4}
                      value={profileDraft.extraFacts || ''}
                      onChange={onProfileChange}
                    />
                    <span className="field-hint">
                      Degrees, certifications, languages, pronouns, how you
                      found the role. Anything not here or in your CV is handed
                      back to you, never guessed.
                    </span>
                  </div>
                </fieldset>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!profileDirty}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  Save profile
                </button>
              </form>
            )}
          </section>

          {state && (
            <AnswersCard answers={state.answers || []} onChanged={fetchState} addNotice={addNotice} />
          )}

          {/* How it behaves */}
          <section className="card">
            <h2 className="card-title">How it behaves</h2>
            {state && (
              <div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.settings.reviewBeforeSubmit}
                    onChange={(e) =>
                      updateSettings({ reviewBeforeSubmit: e.target.checked })
                    }
                  />
                  <span>Let me check each form before it's submitted</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.settings.allowConsentBoxes}
                    onChange={(e) =>
                      updateSettings({ allowConsentBoxes: e.target.checked })
                    }
                  />
                  <span>Tick privacy and data-consent boxes for me</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.settings.useAnswerLibrary !== false}
                    onChange={(e) =>
                      updateSettings({ useAnswerLibrary: e.target.checked })
                    }
                  />
                  <span>Reuse my saved answers on new forms</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.settings.aiNavigator !== false}
                    onChange={(e) =>
                      updateSettings({ aiNavigator: e.target.checked })
                    }
                  />
                  <span>Let the AI find the form on unfamiliar job sites</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.settings.keepTraces !== false}
                    onChange={(e) =>
                      updateSettings({ keepTraces: e.target.checked })
                    }
                  />
                  <span>Keep a replay of jobs that fail or need me</span>
                </label>

                <label className="checkbox-label" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={state.settings.whatsappAlerts}
                    onChange={(e) =>
                      updateSettings({ whatsappAlerts: e.target.checked })
                    }
                  />
                  <span>Send me WhatsApp messages</span>
                </label>
                <NotifyPanel
                  settings={state.settings}
                  whatsappReady={state.whatsappReady}
                  last={state.notifyLast}
                  updateSettings={updateSettings}
                  addNotice={addNotice}
                />

                <label className="checkbox-label" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={state.settings.alertReviewJobs}
                    onChange={(e) =>
                      updateSettings({ alertReviewJobs: e.target.checked })
                    }
                  />
                  <span>Also message me for forms ready to submit</span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginTop: 14
                  }}
                >
                  <div className="field-group">
                    <label htmlFor="s-delay">Seconds between jobs</label>
                    <input
                      id="s-delay"
                      type="number"
                      min={3}
                      max={300}
                      defaultValue={state.settings.delayBetweenJobsSec}
                      onBlur={(e) =>
                        updateSettings({
                          delayBetweenJobsSec: Number(e.target.value)
                        })
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="s-wa-delay">
                      Wait this many seconds before a "needs you" message (0 = right away)
                    </label>
                    <input
                      id="s-wa-delay"
                      type="number"
                      min={0}
                      max={3600}
                      defaultValue={state.settings.alertDelaySec}
                      onBlur={(e) =>
                        updateSettings({
                          alertDelaySec: Number(e.target.value)
                        })
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="s-emails-hr">Most emails per hour</label>
                    <input
                      id="s-emails-hr"
                      type="number"
                      min={1}
                      max={30}
                      defaultValue={state.settings.maxEmailsPerHour}
                      onBlur={(e) =>
                        updateSettings({
                          maxEmailsPerHour: Number(e.target.value)
                        })
                      }
                    />
                  </div>
                </div>

                {/* Email sending status */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Email sending
                    </span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: state.mailReady
                          ? 'var(--accent-green)'
                          : 'var(--accent-amber)'
                      }}
                    >
                      {state.mailReady ? 'Ready' : 'Not set up'}
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%' }}
                    onClick={handleSendTestEmail}
                  >
                    Send test email
                  </button>
                </div>
              </div>
            )}
          </section>
        </aside>

        {/* Right column: work area */}
        <div className="work-area">
          {/* 1. Waiting on you */}
          {waitingJobs.length > 0 && (
            <section>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  margin: '0 0 12px 0'
                }}
              >
                Waiting on you
              </h2>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {waitingJobs.map((job) => {
                  const isNeedsYou = job.status === 'needs_you';
                  const badgeText = isNeedsYou
                    ? 'Needs you'
                    : job.kind === 'email'
                      ? 'Ready to send'
                      : 'Ready to submit';
                  const draft = emailDrafts[job.id] || {
                    subject: job.draft?.subject || '',
                    body: job.draft?.body || ''
                  };

                  return (
                    <div
                      key={job.id}
                      className={`card waiting-card ${isNeedsYou ? 'needs-you' : ''
                        }`}
                    >
                      <div className="waiting-header">
                        <div className="waiting-title-area">
                          <span
                            className={`waiting-badge ${isNeedsYou ? 'needs-you' : 'ready'
                              }`}
                          >
                            {badgeText}
                          </span>
                          {job.kind === 'form' && job.url ? (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                              className="waiting-title"
                            >
                              {job.title || job.url}
                            </a>
                          ) : (
                            <div className="waiting-title">
                              {job.title ||
                                job.applyEmail ||
                                'Email application'}
                            </div>
                          )}
                          {job.message && (
                            <p className="waiting-message">{job.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="waiting-body">
                        <div className="waiting-content">
                          {/* Flagged fields */}
                          {job.flagged && job.flagged.length > 0 && (
                            <div className="flags-list">
                              {job.flagged.map((f, i) => (
                                <div key={i} className="flag-item">
                                  <span className="flag-label">{f.label}:</span>{' '}
                                  <span>{f.reason}</span>{' '}
                                  {!f.required && (
                                    <span className="flag-optional">
                                      (optional)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Email draft editor */}
                          {job.kind === 'email' && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10
                              }}
                            >
                              <div className="field-group">
                                <label>To</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={job.draft?.to || job.applyEmail || ''}
                                  style={{
                                    backgroundColor: 'var(--surface-raised)'
                                  }}
                                />
                              </div>

                              <div className="field-group">
                                <label>Subject</label>
                                <input
                                  type="text"
                                  value={draft.subject}
                                  onChange={(e) =>
                                    setDraftField(
                                      job.id,
                                      'subject',
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => handleSaveDraft(job.id)}
                                />
                              </div>

                              <div className="field-group">
                                <label>Body</label>
                                <textarea
                                  rows={10}
                                  value={draft.body}
                                  onChange={(e) =>
                                    setDraftField(job.id, 'body', e.target.value)
                                  }
                                  onBlur={() => handleSaveDraft(job.id)}
                                />
                              </div>

                              <div style={{ fontSize: '0.85rem' }}>
                                <strong>Attached:</strong>{' '}
                                {state?.cv?.fileName || 'No CV uploaded'}
                              </div>

                              {!state?.mailReady && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)'
                                  }}
                                >
                                  <a
                                    href={`mailto:${encodeURIComponent(
                                      job.draft?.to || job.applyEmail || ''
                                    )}?subject=${encodeURIComponent(
                                      draft.subject
                                    )}&body=${encodeURIComponent(draft.body)}`}
                                    style={{
                                      color: 'var(--primary)',
                                      fontWeight: 600,
                                      marginRight: 8
                                    }}
                                  >
                                    Open in mail app
                                  </a>
                                  <span>
                                    Attach your CV yourself, then click I
                                    applied.
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Screenshot thumbnail for form jobs */}
                        {job.kind === 'form' && job.screenshot && (
                          <div
                            className="waiting-screenshot"
                            onClick={() => setViewScreenshot(shotUrl(job))}
                            title="Click to view full screenshot"
                          >
                            <img src={shotUrl(job)} alt="Form screenshot" />
                          </div>
                        )}
                      </div>

                      {job.trace && (
                        <div style={{ marginTop: 6, marginBottom: 6 }}>
                          <a
                            href={`/api/traces/${encodeURIComponent(job.trace)}`}
                            download
                            style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'underline' }}
                          >
                            Download replay trace
                          </a>
                        </div>
                      )}

                      {/* Action buttons */}
                      {job.actions && job.actions.length > 0 && (
                        <div className="waiting-actions">
                          {job.actions.map((act) => {
                            let label: string = act;
                            let btnClass = 'btn-secondary';

                            if (act === 'submit') {
                              label = 'Submit';
                              btnClass = 'btn-primary';
                            } else if (act === 'refill') {
                              label =
                                job.kind === 'email' ? 'Redraft' : 'Retry';
                            } else if (act === 'done') {
                              label = 'I applied';
                              btnClass = 'btn-success';
                            } else if (act === 'skip') {
                              label = 'Skip';
                            } else if (act === 'scan') {
                              label = 'Scan for jobs';
                              btnClass = 'btn-primary';
                            } else if (act === 'email') {
                              label = 'Draft email';
                              btnClass = 'btn-primary';
                            } else if (act === 'send') {
                              label = 'Send email';
                              btnClass = 'btn-primary';
                            }

                            return (
                              <button
                                key={act}
                                className={`btn ${btnClass} btn-sm`}
                                onClick={() => handleDecision(job, act)}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. Add jobs */}
          <section className="card">
            <h2 className="card-title">Add jobs</h2>
            <div
              className={`drop-zone ${dragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                multiple
                ref={fileInputRef}
                accept=".pdf,.docx,.doc,.xlsx,.xls,.ods,.csv,.txt,.md,.json,.html,.htm,.png,.jpg,.jpeg,.webp,.gif"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const picked = e.target.files;
                  if (picked) {
                    setIntakeFiles((prev) => [...prev, ...Array.from(picked)]);
                  }
                  e.target.value = '';
                }}
              />
              <div style={{ fontWeight: 600 }}>
                Drop files here or click to choose
              </div>
              <div className="drop-zone-text">
                PDFs, Word, Excel or CSV, text, web pages, or a photo of a job
                flyer
              </div>
            </div>

            {intakeFiles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 10
                }}
              >
                {intakeFiles.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="chip chip-queued"
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setIntakeFiles((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    title="Click to remove"
                  >
                    {f.name} &times;
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <label htmlFor="intake-text">
                Paste job links, a Google Sheet or Doc link, or any text with
                links or emails in it
              </label>
              <textarea
                id="intake-text"
                rows={4}
                style={{ marginTop: 6 }}
                placeholder="https://... or raw job advert text"
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={scanListings}
                  onChange={(e) => setScanListings(e.target.checked)}
                />
                <span>
                  These are pages listing many jobs: find the jobs on them
                </span>
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                />
                <span>
                  Automatically start applying as soon as jobs are found
                </span>
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                className="btn btn-primary"
                disabled={isReadingIntake}
                onClick={handleFindJobs}
              >
                {isReadingIntake
                  ? intakeFiles.length > 0
                    ? `Reading ${intakeFiles.length} file${intakeFiles.length === 1 ? '' : 's'}…`
                    : 'Reading…'
                  : autoApply
                  ? 'Find & Start applying'
                  : 'Find jobs'}
              </button>
            </div>
          </section>

          {/* 3. Review what was found */}
          {newestBatch && (
            <section className="card">
              <h2 className="card-title">
                <span>Review what was found</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>
                  Found {newestBatch.leads.length} jobs in{' '}
                  {newestBatch.sources.join(', ')}
                </span>
              </h2>

              {newestBatch.warnings.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--accent-amber-subtle)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 12,
                    fontSize: '0.85rem'
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {newestBatch.warnings.map((w, i) => (
                      <li key={i} style={{ color: 'var(--accent-amber-text)' }}>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(() => {
                const linkLeads = newestBatch.leads.filter(
                  (l) => l.kind === 'url' && l.verdict === 'job'
                );
                const emailLeads = newestBatch.leads.filter(
                  (l) => l.kind === 'email'
                );
                const otherLeads = newestBatch.leads.filter(
                  (l) => l.kind === 'url' && l.verdict !== 'job'
                );
                const instructionsLeads = newestBatch.leads.filter(
                  (l) => l.kind === 'instructions'
                );

                const renderLeadItem = (lead: Lead) => {
                  const isDup = Boolean(lead.duplicateOf);
                  const isChecked = selectedLeadIds.has(lead.id);

                  return (
                    <div
                      key={lead.id}
                      className={`intake-item ${isDup ? 'duplicate' : ''}`}
                    >
                      {lead.kind !== 'instructions' && (
                        <input
                          type="checkbox"
                          disabled={isDup}
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedLeadIds);
                            if (e.target.checked) next.add(lead.id);
                            else next.delete(lead.id);
                            setSelectedLeadIds(next);
                          }}
                        />
                      )}
                      <div className="intake-details">
                        <div className="intake-title">
                          {lead.title ||
                            lead.url ||
                            lead.email ||
                            lead.snippet.slice(0, 80)}
                        </div>
                        <div className="intake-meta">
                          {lead.company ? `${lead.company} · ` : ''}
                          {lead.url || lead.email || lead.source}
                        </div>
                        {lead.subjectHint && (
                          <div className="intake-meta">
                            <strong>Subject hint:</strong> {lead.subjectHint}
                          </div>
                        )}
                        {lead.note && (
                          <div className="intake-note">{lead.note}</div>
                        )}
                        {isDup && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-dim)'
                            }}
                          >
                            Already in your queue
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <div>
                    {linkLeads.length > 0 && (
                      <div className="intake-group">
                        <div className="intake-group-header">
                          Apply by link ({linkLeads.length})
                        </div>
                        <div className="intake-list">
                          {linkLeads.map(renderLeadItem)}
                        </div>
                      </div>
                    )}

                    {emailLeads.length > 0 && (
                      <div className="intake-group">
                        <div className="intake-group-header">
                          Apply by email ({emailLeads.length})
                        </div>
                        <div className="intake-list">
                          {emailLeads.map(renderLeadItem)}
                        </div>
                      </div>
                    )}

                    {otherLeads.length > 0 && (
                      <details className="intake-group">
                        <summary className="intake-group-header">
                          Other links ({otherLeads.length})
                        </summary>
                        <div className="intake-list">
                          {otherLeads.map(renderLeadItem)}
                        </div>
                      </details>
                    )}

                    {instructionsLeads.length > 0 && (
                      <div className="intake-group">
                        <div className="intake-group-header">
                          Can't be queued ({instructionsLeads.length})
                        </div>
                        <div className="intake-list">
                          {instructionsLeads.map(renderLeadItem)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginTop: 16
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const all = new Set<string>();
                      for (const l of newestBatch.leads) {
                        if (!l.duplicateOf && l.kind !== 'instructions') {
                          all.add(l.id);
                        }
                      }
                      setSelectedLeadIds(all);
                    }}
                  >
                    Select all
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedLeadIds(new Set())}
                  >
                    Select none
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDiscardBatch(newestBatch.id)}
                  >
                    Discard
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={selectedLeadIds.size === 0}
                    onClick={() => handleAcceptLeads(newestBatch.id)}
                  >
                    Add {selectedLeadIds.size} to queue
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={selectedLeadIds.size === 0}
                    onClick={() => handleAcceptLeadsAndStart(newestBatch.id)}
                    title="Add to queue and immediately launch browser to apply"
                  >
                    Add & Start applying ({selectedLeadIds.size})
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 4. Queue */}
          <section className="card">
            <h2 className="card-title">Queue</h2>

            <div className="queue-header-bar">
              <div className="queue-counts">
                <span>Queued: {queueCounts.queued}</span>
                <span>Applied: {queueCounts.applied}</span>
                <span>Emails to approve: {queueCounts.emailsToApprove}</span>
                <span>Failed: {queueCounts.failed}</span>
                <span>Skipped: {queueCounts.skipped}</span>
              </div>

              <div className="queue-links">
                <a href="/api/export?format=xlsx" download>
                  Download Excel
                </a>
                <a href="/api/export?format=csv" download>
                  Download CSV
                </a>
                <button type="button" onClick={handleClearFinished}>
                  Clear applied and skipped
                </button>
              </div>
            </div>

            <div className="queue-list">
              {(state?.jobs || []).length === 0 ? (
                <div
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    color: 'var(--text-dim)'
                  }}
                >
                  No jobs in the queue yet. Add jobs above to get started.
                </div>
              ) : (
                state?.jobs.map((job) => {
                  const host = job.url
                    ? (() => {
                      try {
                        return new URL(job.url).hostname.replace(
                          /^www\./,
                          ''
                        );
                      } catch {
                        return job.url;
                      }
                    })()
                    : job.applyEmail || '';

                  return (
                    <div key={job.id} className="queue-row">
                      <div>
                        <span className={`chip chip-${job.status}`}>
                          {job.status}
                        </span>
                        {job.kind === 'email' && (
                          <span className="tag-email">email</span>
                        )}
                      </div>

                      <div className="queue-info">
                        <div className="queue-role">
                          {job.title || job.url || job.applyEmail}
                        </div>
                        <div className="queue-sub">
                          {host} {job.source ? `· from ${job.source}` : ''}
                        </div>
                        {job.message && (
                          <div className="queue-message">{job.message}</div>
                        )}
                      </div>

                      <div className="queue-actions">
                        {job.trace && (
                          <a
                            className="btn btn-secondary btn-sm"
                            href={`/api/traces/${encodeURIComponent(job.trace)}`}
                            download
                            title="Download browser replay trace"
                          >
                            Replay
                          </a>
                        )}

                        {job.status === 'applied' &&
                          job.kind === 'form' &&
                          job.screenshot && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setViewScreenshot(shotUrl(job))}
                            >
                              Proof
                            </button>
                          )}

                        {(job.status === 'failed' ||
                          job.status === 'skipped') && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRequeue(job.id)}
                            >
                              Try again
                            </button>
                          )}

                        {job.status !== 'running' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Screenshot viewer */}
      {viewScreenshot && (
        <div className="modal-overlay" onClick={() => setViewScreenshot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setViewScreenshot(null)}
              aria-label="Close screenshot"
            >
              &times;
            </button>
            <img src={viewScreenshot} alt="Full size screenshot" />
          </div>
        </div>
      )}
    </div>
  );
}

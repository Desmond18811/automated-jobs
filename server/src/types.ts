export type JobKind = 'form' | 'email';

export type JobStatus =
  | 'queued'
  | 'running'
  | 'review'
  | 'needs_you'
  | 'applied'
  | 'skipped'
  | 'failed';

export type Decision =
  | 'submit'
  | 'refill'
  | 'done'
  | 'skip'
  | 'scan'
  | 'email'
  | 'send';

export interface Flag {
  label: string;
  reason: string;
  required: boolean;
}

export interface Job {
  id: string;
  kind: JobKind;
  url?: string;
  applyEmail?: string;
  subjectHint?: string;
  postingText?: string; // max 8000 chars
  title?: string;
  company?: string;
  location?: string;
  deadline?: string;
  source?: string; // file name, "pasted text" or the listing URL it came from
  status: JobStatus;
  site?: string;
  message?: string;
  screenshot?: string;
  trace?: string; // replay file name in data/traces (kept for jobs that failed or needed you)
  flagged?: Flag[];
  actions?: Decision[]; // buttons to show while it waits on me
  draft?: { to: string; subject: string; body: string };
  sentAt?: string;
  alertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  kind: 'url' | 'email' | 'instructions';
  url?: string;
  email?: string;
  title?: string;
  company?: string;
  location?: string;
  deadline?: string;
  subjectHint?: string;
  postingText?: string;
  snippet: string; // max 300 chars
  source: string;
  verdict: 'job' | 'maybe' | 'not-job';
  note?: string;
  selected: boolean;
  duplicateOf?: string; // job id
  accepted?: boolean;
}

export interface IntakeBatch {
  id: string;
  createdAt: string;
  sources: string[];
  leads: Lead[];
  warnings: string[];
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  country: string;
  linkedin: string;
  github: string;
  twitter?: string;
  portfolio?: string;
  website: string;
  currentTitle: string;
  currentCompany?: string;
  yearsExperience: string;
  noticePeriod: string;
  salaryExpectation: string;
  startDate?: string;
  skills?: string;
  workAuthorization: string;
  needsSponsorship: 'yes' | 'no' | '';
  willingToRelocate: 'yes' | 'no' | '';
  workPreference: string;
  highestDegree?: string;
  school?: string;
  fieldOfStudy?: string;
  graduationYear?: string;
  languages?: string;
  gender?: string;
  pronouns?: string;
  raceEthnicity?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
  referredBy?: string;
  /** @deprecated Never stored (cleanProfile drops it). Site passwords live in the vault (step 17). */
  portalPassword?: string;
  extraFacts: string;
}

/** An answer you gave on a real form, reused when the same question comes up again. */
export interface AnswerEntry {
  id: string;
  question: string; // as the form showed it
  key: string; // normalized question used for matching
  fieldType?: string; // text, textarea, select, radio, checkbox, checkboxes, combobox...
  options?: string[]; // options the form offered when you answered
  answer: string | string[] | boolean;
  source: 'form' | 'dashboard'; // captured from a form you filled, or added by you in the dashboard
  uses: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotifySettings {
  runStarted: boolean;
  jobStarted: boolean;
  accountCreated: boolean;
  applied: boolean;
  needsYou: boolean;
  failed: boolean;
  runFinished: boolean;
}

export interface Settings {
  reviewBeforeSubmit: boolean; // default true
  allowConsentBoxes: boolean; // default true
  delayBetweenJobsSec: number; // default 10, clamp 3-300
  maxEmailsPerHour: number; // default 10, clamp 1-30
  whatsappAlerts: boolean; // default true
  alertReviewJobs: boolean; // default false
  alertDelaySec: number; // default 0 (immediate), clamp 0-3600
  notify: NotifySettings; // which WhatsApp messages to send
  notifyGapSec: number; // default 8, clamp 2-60
  notifyMaxPerHour: number; // default 60, clamp 10-200
  useAnswerLibrary: boolean; // default true
  aiNavigator: boolean; // default true: let the AI pick the next click on unfamiliar portals
  keepTraces: boolean; // default true: keep a replay of jobs that failed or needed you
  /** @deprecated Never stored. Site passwords live in the vault (step 17). */
  portalPassword?: string;
}

export interface CvInfo {
  fileName: string;
  path: string;
  text: string;
  uploadedAt: string;
}

export interface NotifyLogEntry {
  at: string;
  event: string;
  jobId?: string;
  text: string;
  provider: string;
  ok: boolean;
  status?: number;
  response?: string; // first 200 chars, secrets masked
}

export interface DB {
  profile: Profile;
  settings: Settings;
  cv: CvInfo | null;
  jobs: Job[];
  intake: IntakeBatch[]; // newest first, keep 10
  answers: AnswerEntry[];
}

export interface RunnerState {
  running: boolean;
  currentJobId: string | null;
  waitingOn: string | null;
}

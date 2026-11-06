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
  extraFacts: string;
}

export interface Settings {
  reviewBeforeSubmit: boolean; // default true
  allowConsentBoxes: boolean; // default true
  delayBetweenJobsSec: number; // default 10, clamp 3-300
  maxEmailsPerHour: number; // default 10, clamp 1-30
  whatsappAlerts: boolean; // default true
  alertReviewJobs: boolean; // default false
  alertDelaySec: number; // default 90, clamp 0-3600
}

export interface CvInfo {
  fileName: string;
  path: string;
  text: string;
  uploadedAt: string;
}

export interface DB {
  profile: Profile;
  settings: Settings;
  cv: CvInfo | null;
  jobs: Job[];
  intake: IntakeBatch[]; // newest first, keep 10
}

export interface RunnerState {
  running: boolean;
  currentJobId: string | null;
  waitingOn: string | null;
}

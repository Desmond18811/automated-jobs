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
  postingText?: string;
  title?: string;
  company?: string;
  location?: string;
  deadline?: string;
  source?: string;
  status: JobStatus;
  site?: string;
  message?: string;
  screenshot?: string;
  trace?: string;
  flagged?: Flag[];
  actions?: Decision[];
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
  snippet: string;
  source: string;
  verdict: 'job' | 'maybe' | 'not-job';
  note?: string;
  selected: boolean;
  duplicateOf?: string;
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
  /** @deprecated Never stored (cleanProfile drops it). */
  portalPassword?: string;
  extraFacts: string;
}

export const defaultProfile: Profile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  streetAddress: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: '',
  linkedin: '',
  github: '',
  twitter: '',
  portfolio: '',
  website: '',
  currentTitle: '',
  currentCompany: '',
  yearsExperience: '',
  noticePeriod: '',
  salaryExpectation: '',
  startDate: '',
  skills: '',
  workAuthorization: '',
  needsSponsorship: '',
  willingToRelocate: '',
  workPreference: '',
  highestDegree: '',
  school: '',
  fieldOfStudy: '',
  graduationYear: '',
  languages: '',
  gender: '',
  pronouns: '',
  raceEthnicity: '',
  veteranStatus: '',
  disabilityStatus: '',
  referredBy: '',
  portalPassword: '',
  extraFacts: ''
};

export interface AnswerEntry {
  id: string;
  question: string;
  key: string;
  fieldType?: string;
  options?: string[];
  answer: string | string[] | boolean;
  source: 'form' | 'dashboard';
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
  reviewBeforeSubmit: boolean;
  allowConsentBoxes: boolean;
  delayBetweenJobsSec: number;
  maxEmailsPerHour: number;
  whatsappAlerts: boolean;
  alertReviewJobs: boolean;
  alertDelaySec: number;
  notify: NotifySettings;
  notifyGapSec: number;
  notifyMaxPerHour: number;
  useAnswerLibrary: boolean;
  aiNavigator: boolean;
  keepTraces: boolean;
  /** @deprecated Never stored. */
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
  response?: string;
}

export interface DB {
  profile: Profile;
  settings: Settings;
  cv: CvInfo | null;
  jobs: Job[];
  intake: IntakeBatch[];
  answers: AnswerEntry[];
}

export interface RunnerState {
  running: boolean;
  currentJobId: string | null;
  waitingOn: string | null;
}

export interface AppState {
  profile: Profile;
  settings: Settings;
  cv: { fileName: string; uploadedAt: string; chars: number } | null;
  jobs: Job[];
  intake: IntakeBatch[];
  answers?: AnswerEntry[];
  runner: RunnerState;
  aiReady: boolean;
  aiStatus?: {
    text: string | null;
    vision: string | null;
    pdf: string | null;
  };
  mailReady: boolean;
  whatsappReady: boolean;
  notifyLast?: NotifyLogEntry | null;
}

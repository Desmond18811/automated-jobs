import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  DB,
  Job,
  JobKind,
  Profile,
  Settings,
  CvInfo,
  IntakeBatch,
  NotifySettings
} from './types.js';

const cwd = process.cwd();
const serverRoot = cwd.endsWith('server') ? cwd : path.join(cwd, 'server');
export const DATA_DIR = path.resolve(serverRoot, 'data');
export const SHOTS_DIR = path.resolve(DATA_DIR, 'screenshots');
export const CV_DIR = path.resolve(DATA_DIR, 'cv');
export const TRACES_DIR = path.resolve(DATA_DIR, 'traces');
export const FORM_ZOO_DIR = path.resolve(DATA_DIR, 'form-zoo');

// mkdir -p on import
for (const dir of [DATA_DIR, SHOTS_DIR, CV_DIR, TRACES_DIR, FORM_ZOO_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
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
  extraFacts: ''
};

export const defaultNotify: NotifySettings = {
  runStarted: true,
  jobStarted: true,
  accountCreated: true,
  applied: true,
  needsYou: true,
  failed: true,
  runFinished: true
};

export const defaultSettings: Settings = {
  reviewBeforeSubmit: true,
  allowConsentBoxes: true,
  delayBetweenJobsSec: 10,
  maxEmailsPerHour: 10,
  whatsappAlerts: true,
  alertReviewJobs: false,
  alertDelaySec: 0,
  notify: { ...defaultNotify },
  notifyGapSec: 8,
  notifyMaxPerHour: 60,
  useAnswerLibrary: true,
  aiNavigator: true,
  keepTraces: true
};

let currentDB: DB | null = null;

const PROFILE_KEYS = Object.keys(defaultProfile) as Array<keyof Profile>;

export function cleanProfile(input: any): Profile {
  const result: any = {};
  for (const k of PROFILE_KEYS) {
    if (input && input[k] !== undefined && input[k] !== null) {
      result[k] = String(input[k]).trim();
    } else {
      result[k] = defaultProfile[k];
    }
  }

  if (result.needsSponsorship !== 'yes' && result.needsSponsorship !== 'no') {
    result.needsSponsorship = '';
  }
  if (result.willingToRelocate !== 'yes' && result.willingToRelocate !== 'no') {
    result.willingToRelocate = '';
  }

  // Never stored: passwords live in the encrypted vault, not in the profile.
  delete result.portalPassword;
  return result as Profile;
}

export function cleanSettings(input: any): Settings {
  const current = getDB().settings;
  const clamp = (val: any, def: number, min: number, max: number): number => {
    const num = Number(val);
    if (Number.isNaN(num)) return def;
    return Math.max(min, Math.min(max, Math.round(num)));
  };
  const bool = (val: any, def: boolean): boolean =>
    typeof val === 'boolean' ? val : def;
  const num = (key: keyof Settings, min: number, max: number): number =>
    input?.[key] !== undefined
      ? clamp(input[key], current[key] as number, min, max)
      : (current[key] as number);

  const notifyIn = input?.notify && typeof input.notify === 'object' ? input.notify : {};
  const notify = { ...defaultNotify, ...current.notify };
  for (const k of Object.keys(defaultNotify) as Array<keyof NotifySettings>) {
    notify[k] = bool(notifyIn[k], notify[k]);
  }

  // portalPassword is deliberately not copied: it is never stored.
  return {
    reviewBeforeSubmit: bool(input?.reviewBeforeSubmit, current.reviewBeforeSubmit),
    allowConsentBoxes: bool(input?.allowConsentBoxes, current.allowConsentBoxes),
    delayBetweenJobsSec: num('delayBetweenJobsSec', 3, 300),
    maxEmailsPerHour: num('maxEmailsPerHour', 1, 30),
    whatsappAlerts: bool(input?.whatsappAlerts, current.whatsappAlerts),
    alertReviewJobs: bool(input?.alertReviewJobs, current.alertReviewJobs),
    alertDelaySec: num('alertDelaySec', 0, 3600),
    notify,
    notifyGapSec: num('notifyGapSec', 2, 60),
    notifyMaxPerHour: num('notifyMaxPerHour', 10, 200),
    useAnswerLibrary: bool(input?.useAnswerLibrary, current.useAnswerLibrary),
    aiNavigator: bool(input?.aiNavigator, current.aiNavigator),
    keepTraces: bool(input?.keepTraces, current.keepTraces)
  };
}

/** Settings as sent to the browser: anything secret-looking removed. */
export function publicSettings(settings: Settings): Settings {
  const { portalPassword: _drop, ...rest } = settings;
  return rest as Settings;
}

export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const u = new URL(trimmed);
    u.hash = '';
    u.host = u.host.toLowerCase();

    const keysToDelete: string[] = [];
    for (const key of u.searchParams.keys()) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('utm_') ||
        lower === 'fbclid' ||
        lower === 'gclid' ||
        lower === 'mc_cid' ||
        lower === 'mc_eid'
      ) {
        keysToDelete.push(key);
      }
    }
    for (const k of keysToDelete) {
      u.searchParams.delete(k);
    }

    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.toString();
  } catch {
    return trimmed;
  }
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function load(): DB {
  const dbPath = path.join(DATA_DIR, 'db.json');
  let loaded: any = {};
  if (fs.existsSync(dbPath)) {
    try {
      loaded = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {
      loaded = {};
    }
  }

  const savedSettings = loaded.settings || {};
  const db: DB = {
    profile: cleanProfileRaw(loaded.profile),
    settings: {
      ...defaultSettings,
      ...savedSettings,
      notify: { ...defaultNotify, ...(savedSettings.notify || {}) }
    },
    cv: loaded.cv || null,
    jobs: Array.isArray(loaded.jobs) ? loaded.jobs : [],
    intake: Array.isArray(loaded.intake) ? loaded.intake.slice(0, 10) : [],
    answers: Array.isArray(loaded.answers) ? loaded.answers : []
  };
  // Old files may still hold a plain-text portal password: drop it.
  delete (db.settings as any).portalPassword;

  if (db.cv && db.cv.fileName) {
    const resolvedPath = path.join(CV_DIR, db.cv.fileName);
    if (fs.existsSync(resolvedPath)) {
      db.cv.path = resolvedPath;
    }
  }

  for (const job of db.jobs) {
    if (!job.kind) {
      job.kind = 'form';
    }
    if (job.kind === 'form') {
      if (
        job.status === 'running' ||
        job.status === 'review' ||
        job.status === 'needs_you'
      ) {
        job.status = 'queued';
        job.message = 'Server restarted, queued again';
        job.updatedAt = new Date().toISOString();
      }
    } else if (job.kind === 'email' && job.status === 'running') {
      job.status = 'queued';
      job.message = 'Server restarted, queued again';
      job.updatedAt = new Date().toISOString();
    }
  }

  currentDB = db;
  return db;
}

function cleanProfileRaw(input: any): Profile {
  const p: any = { ...defaultProfile, ...(input || {}) };
  delete p.portalPassword;
  return p as Profile;
}

export function save(): void {
  if (!currentDB) {
    currentDB = load();
  }
  const dbPath = path.join(DATA_DIR, 'db.json');
  const tmpPath = path.join(DATA_DIR, 'db.json.tmp');
  fs.writeFileSync(tmpPath, JSON.stringify(currentDB, null, 2), 'utf-8');
  fs.renameSync(tmpPath, dbPath);
}

export function getDB(): DB {
  if (!currentDB) {
    return load();
  }
  return currentDB;
}

export function setProfile(profile: Profile): void {
  getDB().profile = profile;
  save();
}

export function setSettings(settings: Settings): void {
  getDB().settings = settings;
  save();
}

export function setCv(cv: CvInfo | null): void {
  getDB().cv = cv;
  save();
}

export function addJobs(
  inputs: Array<Partial<Job> & { kind: JobKind }>
): { added: Job[]; duplicates: number } {
  const db = getDB();
  const added: Job[] = [];
  let duplicates = 0;

  const sameEmailJob = (a: Partial<Job>, b: Partial<Job>) =>
    (a.applyEmail || '').toLowerCase().trim() === (b.applyEmail || '').toLowerCase().trim() &&
    normalizeTitle(a.title || '') === normalizeTitle(b.title || '');

  for (const input of inputs) {
    const kind = input.kind;
    let isDuplicate = false;

    if (kind === 'form') {
      const normUrl = normalizeUrl(input.url || '');
      if (!normUrl) continue;
      const sameUrl = (j: Job) => j.kind === 'form' && !!j.url && normalizeUrl(j.url) === normUrl;
      isDuplicate = db.jobs.some(sameUrl) || added.some(sameUrl);
    } else if (kind === 'email') {
      const sameEmail = (j: Job) => j.kind === 'email' && sameEmailJob(j, input);
      isDuplicate = db.jobs.some(sameEmail) || added.some(sameEmail);
    }

    if (isDuplicate) {
      duplicates++;
      continue;
    }

    const now = new Date().toISOString();
    const newJob: Job = {
      id: crypto.randomUUID(),
      kind,
      url: input.url,
      applyEmail: input.applyEmail,
      subjectHint: input.subjectHint,
      postingText: input.postingText ? input.postingText.slice(0, 8000) : undefined,
      title: input.title,
      company: input.company,
      location: input.location,
      deadline: input.deadline,
      source: input.source,
      status: 'queued',
      site: input.site,
      message: input.message,
      screenshot: input.screenshot,
      flagged: input.flagged,
      actions: input.actions,
      draft: input.draft,
      sentAt: input.sentAt,
      alertedAt: input.alertedAt,
      createdAt: now,
      updatedAt: now
    };
    db.jobs.push(newJob);
    added.push(newJob);
  }

  if (added.length > 0) save();
  return { added, duplicates };
}

export function updateJob(id: string, patch: Partial<Job>): Job | null {
  const db = getDB();
  const index = db.jobs.findIndex((j) => j.id === id);
  if (index === -1) return null;

  const updated: Job = {
    ...db.jobs[index],
    ...patch,
    id: db.jobs[index].id,
    updatedAt: new Date().toISOString()
  };
  db.jobs[index] = updated;
  save();
  return updated;
}

export function deleteJob(id: string): boolean {
  const db = getDB();
  const initialLen = db.jobs.length;
  db.jobs = db.jobs.filter((j) => j.id !== id);
  if (db.jobs.length !== initialLen) {
    save();
    return true;
  }
  return false;
}

export function clearFinishedJobs(): number {
  const db = getDB();
  const initialLen = db.jobs.length;
  db.jobs = db.jobs.filter((j) => j.status !== 'applied' && j.status !== 'skipped');
  const removed = initialLen - db.jobs.length;
  if (removed > 0) save();
  return removed;
}

export function requeueJob(id: string): Job | null {
  const db = getDB();
  const job = db.jobs.find((j) => j.id === id);
  if (!job) return null;

  job.status = 'queued';
  delete job.message;
  delete job.flagged;
  delete job.actions;
  job.updatedAt = new Date().toISOString();
  save();
  return job;
}

export function addIntakeBatch(batch: IntakeBatch): void {
  const db = getDB();
  db.intake.unshift(batch);
  if (db.intake.length > 10) db.intake = db.intake.slice(0, 10);
  save();
}

export function getIntakeBatch(id: string): IntakeBatch | null {
  return getDB().intake.find((b) => b.id === id) || null;
}

export function deleteIntakeBatch(id: string): boolean {
  const db = getDB();
  const initLen = db.intake.length;
  db.intake = db.intake.filter((b) => b.id !== id);
  if (db.intake.length !== initLen) {
    save();
    return true;
  }
  return false;
}

export function acceptIntakeLeads(
  batchId: string,
  leadIds: string[]
): { added: Job[]; duplicates: number } | null {
  const batch = getIntakeBatch(batchId);
  if (!batch) return null;

  const toAdd: Array<Partial<Job> & { kind: JobKind }> = [];
  const leadIdSet = new Set(leadIds);

  for (const lead of batch.leads) {
    if (!leadIdSet.has(lead.id)) continue;
    if (lead.kind === 'url' && lead.url) {
      toAdd.push({ kind: 'form', url: lead.url, title: lead.title, company: lead.company, source: lead.source });
      lead.accepted = true;
    } else if (lead.kind === 'email' && lead.email) {
      toAdd.push({
        kind: 'email',
        applyEmail: lead.email,
        subjectHint: lead.subjectHint,
        postingText: lead.postingText,
        title: lead.title,
        company: lead.company,
        deadline: lead.deadline,
        source: lead.source
      });
      lead.accepted = true;
    }
  }

  const result = addJobs(toAdd);
  save();
  return result;
}

// Initial load
load();

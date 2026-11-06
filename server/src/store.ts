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
  IntakeBatch
} from './types.js';

const cwd = process.cwd();
const serverRoot = cwd.endsWith('server') ? cwd : path.join(cwd, 'server');
export const DATA_DIR = path.resolve(serverRoot, 'data');
export const SHOTS_DIR = path.resolve(DATA_DIR, 'screenshots');
export const CV_DIR = path.resolve(DATA_DIR, 'cv');

// mkdir -p on import
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.mkdirSync(CV_DIR, { recursive: true });

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

export const defaultSettings: Settings = {
  reviewBeforeSubmit: true,
  allowConsentBoxes: true,
  delayBetweenJobsSec: 10,
  maxEmailsPerHour: 10,
  whatsappAlerts: true,
  alertReviewJobs: false,
  alertDelaySec: 90
};

export const defaultDB: DB = {
  profile: defaultProfile,
  settings: defaultSettings,
  cv: null,
  jobs: [],
  intake: []
};

let currentDB: DB | null = null;

export function cleanProfile(input: any): Profile {
  const result: any = {};
  const keys: Array<keyof Profile> = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'streetAddress',
    'city',
    'stateProvince',
    'postalCode',
    'country',
    'linkedin',
    'github',
    'twitter',
    'portfolio',
    'website',
    'currentTitle',
    'currentCompany',
    'yearsExperience',
    'noticePeriod',
    'salaryExpectation',
    'startDate',
    'skills',
    'workAuthorization',
    'needsSponsorship',
    'willingToRelocate',
    'workPreference',
    'highestDegree',
    'school',
    'fieldOfStudy',
    'graduationYear',
    'languages',
    'gender',
    'pronouns',
    'raceEthnicity',
    'veteranStatus',
    'disabilityStatus',
    'referredBy',
    'extraFacts'
  ];

  for (const k of keys) {
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

  return result as Profile;
}

export function cleanSettings(input: any): Settings {
  const current = getDB().settings;
  const clamp = (val: any, def: number, min: number, max: number): number => {
    const num = Number(val);
    if (Number.isNaN(num)) return def;
    return Math.max(min, Math.min(max, Math.round(num)));
  };

  return {
    reviewBeforeSubmit:
      typeof input?.reviewBeforeSubmit === 'boolean'
        ? input.reviewBeforeSubmit
        : current.reviewBeforeSubmit,
    allowConsentBoxes:
      typeof input?.allowConsentBoxes === 'boolean'
        ? input.allowConsentBoxes
        : current.allowConsentBoxes,
    delayBetweenJobsSec:
      input?.delayBetweenJobsSec !== undefined
        ? clamp(input.delayBetweenJobsSec, current.delayBetweenJobsSec, 3, 300)
        : current.delayBetweenJobsSec,
    maxEmailsPerHour:
      input?.maxEmailsPerHour !== undefined
        ? clamp(input.maxEmailsPerHour, current.maxEmailsPerHour, 1, 30)
        : current.maxEmailsPerHour,
    whatsappAlerts:
      typeof input?.whatsappAlerts === 'boolean'
        ? input.whatsappAlerts
        : current.whatsappAlerts,
    alertReviewJobs:
      typeof input?.alertReviewJobs === 'boolean'
        ? input.alertReviewJobs
        : current.alertReviewJobs,
    alertDelaySec:
      input?.alertDelaySec !== undefined
        ? clamp(input.alertDelaySec, current.alertDelaySec, 0, 3600)
        : current.alertDelaySec
  };
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
      const content = fs.readFileSync(dbPath, 'utf-8');
      loaded = JSON.parse(content);
    } catch {
      loaded = {};
    }
  }

  const db: DB = {
    profile: {
      ...defaultProfile,
      ...(loaded.profile || {})
    },
    settings: {
      ...defaultSettings,
      ...(loaded.settings || {})
    },
    cv: loaded.cv || null,
    jobs: Array.isArray(loaded.jobs) ? loaded.jobs : [],
    intake: Array.isArray(loaded.intake) ? loaded.intake.slice(0, 10) : []
  };

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
    } else if (job.kind === 'email') {
      if (job.status === 'running') {
        job.status = 'queued';
        job.message = 'Server restarted, queued again';
        job.updatedAt = new Date().toISOString();
      }
    }
  }

  currentDB = db;
  return db;
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
  const db = getDB();
  db.profile = profile;
  save();
}

export function setSettings(settings: Settings): void {
  const db = getDB();
  db.settings = settings;
  save();
}

export function setCv(cv: CvInfo | null): void {
  const db = getDB();
  db.cv = cv;
  save();
}

export function addJobs(
  inputs: Array<Partial<Job> & { kind: JobKind }>
): { added: Job[]; duplicates: number } {
  const db = getDB();
  const added: Job[] = [];
  let duplicates = 0;

  for (const input of inputs) {
    const kind = input.kind;
    let isDuplicate = false;

    if (kind === 'form') {
      const normUrl = normalizeUrl(input.url || '');
      if (!normUrl) {
        continue;
      }
      const existsInDB = db.jobs.some(
        (j) => j.kind === 'form' && j.url && normalizeUrl(j.url) === normUrl
      );
      const existsInBatch = added.some(
        (j) => j.kind === 'form' && j.url && normalizeUrl(j.url) === normUrl
      );
      if (existsInDB || existsInBatch) {
        isDuplicate = true;
      }
    } else if (kind === 'email') {
      const normEmail = (input.applyEmail || '').toLowerCase().trim();
      const normTitle = normalizeTitle(input.title || '');
      const existsInDB = db.jobs.some(
        (j) =>
          j.kind === 'email' &&
          (j.applyEmail || '').toLowerCase().trim() === normEmail &&
          normalizeTitle(j.title || '') === normTitle
      );
      const existsInBatch = added.some(
        (j) =>
          j.kind === 'email' &&
          (j.applyEmail || '').toLowerCase().trim() === normEmail &&
          normalizeTitle(j.title || '') === normTitle
      );
      if (existsInDB || existsInBatch) {
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      duplicates++;
    } else {
      const now = new Date().toISOString();
      const newJob: Job = {
        id: crypto.randomUUID(),
        kind,
        url: input.url,
        applyEmail: input.applyEmail,
        subjectHint: input.subjectHint,
        postingText: input.postingText
          ? input.postingText.slice(0, 8000)
          : undefined,
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
  }

  if (added.length > 0) {
    save();
  }

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
  db.jobs = db.jobs.filter(
    (j) => j.status !== 'applied' && j.status !== 'skipped'
  );
  const removed = initialLen - db.jobs.length;
  if (removed > 0) {
    save();
  }
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
  if (db.intake.length > 10) {
    db.intake = db.intake.slice(0, 10);
  }
  save();
}

export function getIntakeBatch(id: string): IntakeBatch | null {
  const db = getDB();
  return db.intake.find((b) => b.id === id) || null;
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
    if (leadIdSet.has(lead.id)) {
      if (lead.kind === 'url' && lead.url) {
        toAdd.push({
          kind: 'form',
          url: lead.url,
          title: lead.title,
          company: lead.company,
          source: lead.source
        });
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
  }

  const result = addJobs(toAdd);
  save();
  return result;
}

// Initial load
load();

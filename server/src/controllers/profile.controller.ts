import fs from 'node:fs/promises';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { shortId } from '../lib/crypto';
import { AppError, parseBody } from '../lib/http';
import { assertPublicUrl } from '../lib/net';
import { storagePath } from '../lib/storage';
import { isValidTimeZone } from '../lib/time';
import { currentUser } from '../middleware/auth';
import { Application } from '../models/application.model';
import { Profile } from '../models/profile.model';
import { enqueueGenerate, queues, defaultJobOpts } from '../queues';
import { detectAts, greenhouse, lever, ashby } from '../sources/ats';
import { extractJobFromUrl, upsertJob } from '../services/job.service';
import { CV_MIME, extractText, parseCv } from '../services/documents/cvParser';
import { llmEnabled } from '../services/documents/llm';

export async function loadProfile(userId: string) {
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await Profile.create({ userId, status: 'draft' });
  }
  return profile;
}

const bullet = z.object({ id: z.string().optional(), text: z.string().min(1).max(600), skills: z.array(z.string()).optional() });
const withId = <T extends { id?: string }>(x: T) => ({ ...x, id: x.id || shortId() });

export const AddressSchema = z.object({
  street: z.string().max(160).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(30).optional(),
  country: z.string().min(1, 'Country is required').max(100),
});

export const SalaryExpectationSchema = z.object({
  minimum: z.number().nonnegative(),
  currency: z.string().length(3),
  period: z.enum(['hour', 'month', 'year']),
  negotiable: z.boolean().default(true),
});

export const EeoDisclosuresSchema = z.object({
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'decline']).default('decline'),
  raceEthnicity: z.enum(['hispanic_latino', 'white', 'black_african_american', 'asian', 'native_american', 'two_or_more', 'decline']).default('decline'),
  veteranStatus: z.enum(['veteran', 'not_veteran', 'decline']).default('decline'),
  disabilityStatus: z.enum(['yes', 'no', 'decline']).default('decline'),
});

export const LanguageSkillSchema = z.object({
  language: z.string().min(1).max(60),
  proficiency: z.enum(['basic', 'conversational', 'fluent', 'native']),
});

export const UpdateProfileSchema = z
  .object({
    firstName: z.string().max(80),
    lastName: z.string().max(80),
    fullName: z.string().max(160),
    headline: z.string().max(160),
    email: z.string().email(),
    phone: z.string().max(40),
    pronouns: z.string().max(40).optional(),
    location: z.string().max(120),
    address: AddressSchema.optional(),

    linkedinUrl: z.string().url(),
    githubUrl: z.string().url().optional().or(z.literal('')),
    portfolioUrl: z.string().url().optional().or(z.literal('')),
    twitterUrl: z.string().url().optional().or(z.literal('')),
    links: z.array(z.object({ label: z.string().max(40), url: z.string().url() })).max(10),

    workAuthorization: z.enum(['authorized', 'not_authorized']),
    requiresSponsorship: z.boolean(),
    futureSponsorship: z.boolean(),
    securityClearance: z.enum(['none', 'confidential', 'secret', 'top_secret', 'other']).optional(),
    willingToRelocate: z.boolean(),
    noticePeriod: z.string().max(80),
    earliestStartDate: z.string().max(50).optional(),

    targetRoles: z.array(z.string().min(2).max(80)).max(15),
    locations: z.array(z.string().max(80)).max(15),
    remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']),
    salaryExpectation: SalaryExpectationSchema.optional(),
    salaryFloor: z.object({ amount: z.number().positive().optional(), currency: z.string().length(3), period: z.enum(['hour', 'month', 'year']) }).optional(),
    yearsOfExperience: z.number().min(0).max(60),
    currentCompany: z.string().max(100).optional(),
    currentTitle: z.string().max(100).optional(),

    summary: z.string().max(3000),
    elevatorPitch: z.string().max(800).optional(),
    highestEducationLevel: z.enum(['high_school', 'associate', 'bachelor', 'master', 'doctorate', 'bootcamp', 'self_taught']),

    primarySkills: z.array(z.string().min(1).max(60)).max(50),
    secondarySkills: z.array(z.string().min(1).max(60)).max(50).optional(),
    toolsAndFrameworks: z.array(z.string().min(1).max(60)).max(50).optional(),
    skills: z.array(z.object({ name: z.string().min(1).max(60), years: z.number().min(0).max(60).optional() })).max(80),
    languages: z.array(LanguageSkillSchema).max(20).optional(),

    experience: z.array(z.object({
      id: z.string().optional(), company: z.string().min(1), title: z.string().min(1), location: z.string().optional(),
      start: z.string().optional(), end: z.string().optional(), current: z.boolean().optional(), bullets: z.array(bullet).max(15),
    })).max(25),
    education: z.array(z.object({
      id: z.string().optional(), institution: z.string().min(1), degree: z.string().optional(), field: z.string().optional(),
      start: z.string().optional(), end: z.string().optional(), grade: z.string().optional(),
    })).max(15),
    projects: z.array(z.object({
      id: z.string().optional(), name: z.string().min(1), url: z.string().optional(), description: z.string().optional(),
      skills: z.array(z.string()).optional(), bullets: z.array(bullet).max(10),
    })).max(25),
    certifications: z.array(z.object({ id: z.string().optional(), name: z.string().min(1), issuer: z.string().optional(), year: z.string().optional() })).max(30),

    eeo: EeoDisclosuresSchema.optional(),

    blockedCompanies: z.array(z.string().max(120)).max(200),
    rules: z.object({
      dailySendCap: z.number().int().min(1).max(50),
      approvalMode: z.enum(['review', 'auto']),
      autoApproveMinScore: z.number().min(0.5).max(1),
      sendingHours: z.object({
        start: z.number().int().min(0).max(23),
        end: z.number().int().min(1).max(24),
        timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
      }).refine((h) => h.end > h.start, 'end must be after start'),
      weekdaysOnly: z.boolean(),
    }).partial(),
  })
  .partial();

const MIN_REVIEWED_FOR_AUTO = 10;

export class ProfileController {
  static async getProfile(req: Request, res: Response) {
    res.json(await loadProfile(currentUser(req)));
  }

  static async uploadCv(req: Request, res: Response) {
    const userId = currentUser(req);
    const file = req.file;
    if (!file) throw new AppError(400, 'Attach your CV (PDF or DOCX) in the "cv" field');

    const ext = file.mimetype === CV_MIME.pdf ? 'pdf' : 'docx';
    const dest = await storagePath('cv', `${userId}-${Date.now()}.${ext}`);
    await fs.writeFile(dest, file.buffer);
    const rawText = await extractText(file.buffer, file.mimetype);
    if (rawText.trim().length < 200) {
      throw new AppError(422, 'Could not read enough text. If this is a scanned PDF, upload a text-based PDF or a DOCX.');
    }

    const profile = await loadProfile(userId);
    let warnings: string[] = [];
    if (llmEnabled()) {
      const parsed = await parseCv(rawText);
      profile.set(parsed.data);
      warnings = parsed.warnings;
    } else {
      warnings = ['Automatic parsing is off on this server. Fill in your profile manually.'];
    }
    profile.cv = { originalName: file.originalname, path: dest, mime: file.mimetype, uploadedAt: new Date(), rawText, parseWarnings: warnings };
    profile.status = 'draft';
    await profile.save();
    res.json({ profile, warnings, next: 'Review every section, fix anything wrong, then POST /api/profile/verify' });
  }

  static async updateProfile(req: Request, res: Response) {
    const userId = currentUser(req);
    const raw = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : req.body;
    const body = parseBody(UpdateProfileSchema, raw);
    const profile = await loadProfile(userId);

    if (body.rules?.approvalMode === 'auto' && profile.rules.approvalMode !== 'auto') {
      const reviewed = await Application.countDocuments({ userId, 'history.note': 'approved by you' });
      if (reviewed < MIN_REVIEWED_FOR_AUTO) {
        throw new AppError(409, `Approve at least ${MIN_REVIEWED_FOR_AUTO} drafts yourself before turning on auto mode (${reviewed} so far).`);
      }
    }

    const { rules, experience, projects, education, certifications, ...rest } = body;
    profile.set(rest);
    if (experience) profile.experience = experience.map((e) => ({ ...withId(e), bullets: e.bullets.map(withId) }));
    if (projects) profile.projects = projects.map((p) => ({ ...withId(p), bullets: p.bullets.map(withId) }));
    if (education) profile.education = education.map(withId);
    if (certifications) profile.certifications = certifications.map(withId);
    if (rules) profile.set('rules', { ...profile.toObject().rules, ...rules });
    await profile.save();
    res.json(profile);
  }

  static async verify(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile = await loadProfile(userId);
    const missing = [
      !profile.firstName && !profile.fullName && 'First name / Full name',
      !profile.lastName && !profile.fullName && 'Last name',
      !profile.email && 'Email address',
      !profile.phone && 'Phone number',
      !profile.headline && 'Headline / Current role',
      !profile.linkedinUrl && 'LinkedIn profile URL',
      !profile.targetRoles.length && 'At least one target role',
      !(profile.experience.length || profile.projects.length) && 'At least one job or project in work experience',
      !profile.primarySkills.length && !profile.skills.length && 'Primary skills',
      !profile.summary && 'Professional summary',
    ].filter(Boolean);

    if (missing.length) {
      throw new AppError(422, `Please complete required profile fields before verifying: ${missing.join(', ')}`);
    }

    profile.status = 'verified';
    await profile.save();
    const waiting = await Application.find({ userId, status: 'matched' }, { _id: 1 });
    for (const a of waiting) await enqueueGenerate(String(a._id));
    res.json({ status: 'verified', queuedDrafts: waiting.length });
  }

  static async addCareerPage(req: Request, res: Response) {
    const userId = currentUser(req);
    const { url } = parseBody(z.object({ url: z.string().url() }), req.body);
    await assertPublicUrl(url);
    const profile = await loadProfile(userId);
    const detected = detectAts(url);
    if (!profile.careerPages.some((c) => c.url === url)) {
      profile.careerPages.push({ url, ats: detected.ats, token: detected.token, addedAt: new Date() });
      await profile.save();
    }

    // Immediately scrape / read jobs from the newly watched career page
    let jobsIngested = 0;
    try {
      let rawJobs: any[] = [];
      if (detected.ats === 'greenhouse' && detected.token) {
        rawJobs = await greenhouse(detected.token).fetch();
      } else if (detected.ats === 'lever' && detected.token) {
        rawJobs = await lever(detected.token).fetch();
      } else if (detected.ats === 'ashby' && detected.token) {
        rawJobs = await ashby(detected.token).fetch();
      } else {
        const single = await extractJobFromUrl(url).catch(() => null);
        if (single?.title && single?.company) {
          rawJobs = [{ ...single, source: 'career_page', url, postedAt: new Date() }];
        }
      }

      for (const rj of rawJobs) {
        const saved = await upsertJob(rj).catch(() => null);
        if (saved?.isNew) {
          jobsIngested++;
          await queues.match.add('match', { jobId: saved.job.id, userId }, defaultJobOpts).catch(() => null);
        }
      }
    } catch (err) {
      console.warn('Initial career page crawl warning:', err);
    }

    res.status(201).json({
      ...detected,
      jobsIngested,
      note: detected.ats === 'unsupported'
        ? (jobsIngested > 0 ? `Scraped 1 job posting from this link.` : 'Saved page. New postings will be monitored on regular scans.')
        : `Connected ${detected.ats} board. Ingested ${jobsIngested} open roles and queued match processing.`,
    });
  }

  static async removeCareerPage(req: Request, res: Response) {
    const rawUrl = String(req.body?.url || req.query?.url || '').trim();
    if (!rawUrl) throw new AppError(400, 'Career page URL is required');
    const profile = await loadProfile(currentUser(req));
    profile.careerPages = profile.careerPages.filter((c) => c.url !== rawUrl && !rawUrl.includes(c.url));
    await profile.save();
    res.status(204).end();
  }
}

import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { JobPost } from '../models/jobPost.model';
import { Application } from '../models/application.model';
import { Task } from '../models/task.model';
import { Notification } from '../models/notification.model';
import { BusinessLead } from '../models/businessLead.model';
import { LoginChallenge } from '../models/loginChallenge.model';
import { RefreshToken } from '../models/refreshToken.model';
import { AuditLog } from '../models/audit.model';
import { TaxonomyRequest } from '../models/taxonomyRequest.model';
import { SiteAccount } from '../models/siteAccount.model';
import { BusinessServices } from '../models/businessServices.model';
import { logger } from './logger';

let isMemoryDbActive = false;

export function isInMemoryActive(): boolean {
  return isMemoryDbActive;
}

export function activateMemoryDb(): void {
  if (isMemoryDbActive) return;
  isMemoryDbActive = true;
  logger.info('[MemoryDb] Activating in-memory persistence store for seamless offline/sandbox execution.');

  const memoryUsers: any[] = [];
  const memoryProfiles: any[] = [];
  const memoryJobs: any[] = [];
  const memoryApplications: any[] = [];
  const memoryTasks: any[] = [];
  const memoryNotifications: any[] = [];
  const memoryBusinessLeads: any[] = [];
  const memoryTokens: any[] = [];

  // Pre-seed comprehensive demo users

  const demoSeeds = [
    {
      id: new Types.ObjectId(),
      email: 'amaka.okafor@example.com',
      firstName: 'Amaka',
      lastName: 'Okafor',
      headline: 'Senior Product Designer',
      location: 'Lagos, Nigeria (Open to Remote)',
      phone: '+234 801 234 5678',
    },
    {
      id: new Types.ObjectId(),
      email: 'you@example.com',
      firstName: 'Ada',
      lastName: 'Okafor',
      headline: 'Senior Product Designer',
      location: 'Lagos, Nigeria (Open to Remote)',
      phone: '+234 801 234 5678',
    },
    {
      id: new Types.ObjectId(),
      email: 'candidate@javi.ai',
      firstName: 'Angelica',
      lastName: 'Greeze',
      headline: 'UI / UX Designer',
      location: 'New York, NY (Open to Remote / Relocation)',
      phone: '+1 (555) 234-5678',
    },
    {
      id: new Types.ObjectId(),
      email: 'test@javi.ai',
      firstName: 'Test',
      lastName: 'Candidate',
      headline: 'Lead Automation Engineer',
      location: 'Lekki, Lagos',
      phone: '+234 802 345 6789',
    },
    {
      id: new Types.ObjectId(),
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Okafor',
      headline: 'Senior Product Designer',
      location: 'Lagos, Nigeria (Open to Remote)',
      phone: '+234 801 234 5678',
    },
    {
      id: new Types.ObjectId(),
      email: 'ada.okafor@example.com',
      firstName: 'Ada',
      lastName: 'Okafor',
      headline: 'Senior Product Designer',
      location: 'Lagos, Nigeria (Open to Remote)',
      phone: '+234 801 234 5678',
    },
  ];

  const defaultUserId = demoSeeds[0].id; // amaka.okafor@example.com

  for (const s of demoSeeds) {
    memoryUsers.push({
      _id: s.id,
      id: String(s.id),
      email: s.email,
      role: 'candidate',
      status: 'active',
      isEmailVerified: true,
      onboardingStage: 'completed',
      name: `${s.firstName} ${s.lastName}`,
      save() {
        return Promise.resolve(this);
      },
      toObject() {
        return { ...this };
      },
    });

    const prof = {
      _id: new Types.ObjectId(),
      userId: s.id,
      status: 'verified',
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      email: s.email,
      phone: s.phone,
      headline: s.headline,
      location: s.location,
      careerPages: [
        {
          url: 'https://stripe.com/jobs',
          companyName: 'Stripe',
          frequency: 'daily',
          lastCheckedAt: new Date(),
          status: 'active',
        },
        {
          url: 'https://paystack.com/careers',
          companyName: 'Paystack',
          frequency: 'daily',
          lastCheckedAt: new Date(),
          status: 'active',
        },
      ],
      rules: { dailySendCap: 15, approvalMode: 'review' },
      targetRoles: ['Senior Product Designer', 'UI / UX Designer', 'Product Designer'],
      primarySkills: ['UI', 'UX', 'Website Design', 'Mobile Design', 'Research', 'Interaction', 'Figma'],
      secondarySkills: ['Design Systems', 'Prototyping', 'User Testing', 'React'],
      toolsAndFrameworks: ['Figma', 'Adobe XD', 'Sketch', 'Principle', 'HTML/CSS'],
      experience: [
        {
          title: 'Senior Product Designer',
          company: 'Ideologist Team',
          location: 'Remote',
          start: 'Jan 2022',
          end: 'Present',
          current: true,
          bullets: [{ id: 'seed-2877', text: 'Leading UX research, interaction architecture, and scalable design systems.' }],
        },
        {
          title: 'UI Designer',
          company: 'Tigabatang',
          location: 'Fulltime',
          start: 'Jan 2020',
          end: 'Dec 2021',
          current: false,
          bullets: [{ id: 'seed-4523', text: 'Designed high-fidelity interactive prototypes and design documentation.' }],
        },
      ],
      education: [
        {
          institution: 'Oxford University',
          degree: 'Student - Software Engineering',
          start: '2018',
          end: '2021',
        },
      ],
      projects: [
        {
          name: 'AutoApply Core Engine',
          description: 'Multi-channel outbound job dispatcher with AI verification.',
          url: 'https://github.com/alex/autoapply',
        },
      ],
      set(keyOrObj: any, val?: any) {
        if (typeof keyOrObj === 'object') Object.assign(this, keyOrObj);
        else (this as any)[keyOrObj] = val;
      },
      toObject() {
        return { ...this };
      },
      save() {
        return Promise.resolve(this);
      },
    };
    memoryProfiles.push(prof);
  }


  // Pre-seed sample business leads located at candidate location (Lekki / Lagos)
  // No seeded business leads: Business Mode only shows real ones (OSM, CSV, manual).

  // Seed sample jobs
  const sampleJobs = [
    {
      _id: new Types.ObjectId(),
      id: 'job-1',
      title: 'Senior Automation Engineer',
      company: 'Stripe',
      location: 'Remote',
      salary: '$140,000 - $175,000',
      description: 'Design and deploy automated infrastructure for global developer tools.',
      requirements: ['TypeScript', 'Node.js', 'Playwright', 'Distributed systems'],
      source: 'career_page',
      url: 'https://stripe.com/jobs/senior-automation-engineer',
      matchScore: 94,
      status: 'active',
      createdAt: new Date(),
    },
    {
      _id: new Types.ObjectId(),
      id: 'job-2',
      title: 'Staff Full-Stack Developer',
      company: 'Paystack',
      location: 'Lagos, Nigeria (Hybrid)',
      salary: 'Competitive USD equivalent',
      description: 'Scale payment checkout experiences across emerging markets.',
      requirements: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      source: 'career_page',
      url: 'https://paystack.com/careers/staff-fullstack',
      matchScore: 91,
      status: 'active',
      createdAt: new Date(),
    },
  ];
  sampleJobs.forEach((j) => memoryJobs.push(j));

  // Seed sample applications, tasks, and notifications for all demo seed users
  for (const seedUser of demoSeeds) {
    const sApps = [
      {
        _id: new Types.ObjectId(),
        id: `app-1-${seedUser.email}`,
        userId: seedUser.id,
        jobId: sampleJobs[0]._id,
        company: 'Stripe',
        role: 'Senior Automation Engineer',
        status: 'interviewed',
        channel: 'career_page',
        draftResume: 'Tailored resume emphasizing Playwright & automated delivery.',
        draftCoverLetter: 'I have delivered distributed automation pipelines with 99.9% uptime...',
        timeline: [
          { stage: 'queued', date: new Date(Date.now() - 7 * 86400000) },
          { stage: 'sent', date: new Date(Date.now() - 5 * 86400000) },
          { stage: 'replied', date: new Date(Date.now() - 3 * 86400000) },
          { stage: 'interviewed', date: new Date(Date.now() - 1 * 86400000) },
        ],
        createdAt: new Date(),
      },
      {
        _id: new Types.ObjectId(),
        id: `app-2-${seedUser.email}`,
        userId: seedUser.id,
        jobId: sampleJobs[1]._id,
        company: 'Paystack',
        role: 'Staff Full-Stack Developer',
        status: 'drafted',
        channel: 'email',
        draftResume: 'Tailored resume emphasizing React, Node.js, and high-volume fintech checkout.',
        draftCoverLetter: 'Dear Paystack team, having scaled API architectures...',
        timeline: [{ stage: 'queued', date: new Date(Date.now() - 2 * 86400000) }],
        createdAt: new Date(),
      },
    ];
    sApps.forEach((a) => memoryApplications.push(a));

    const sTasks = [
      {
        _id: new Types.ObjectId(),
        id: `task-1-${seedUser.email}`,
        userId: seedUser.id,
        type: 'captcha_required',
        company: 'Stripe',
        role: 'Senior Automation Engineer',
        message: 'Cloudflare verification required on career page submission portal.',
        status: 'open',
        priority: 'high',
        actionUrl: 'https://stripe.com/jobs',
        createdAt: new Date(),
      },
      {
        _id: new Types.ObjectId(),
        id: `task-2-${seedUser.email}`,
        userId: seedUser.id,
        type: 'salary_decision',
        company: 'Paystack',
        role: 'Staff Full-Stack Developer',
        message: 'Confirm expected salary range ($120k-$140k) before auto-submitting draft.',
        status: 'open',
        priority: 'medium',
        createdAt: new Date(),
      },
    ];
    sTasks.forEach((t) => memoryTasks.push(t));

    const sNotifications = [
      {
        _id: new Types.ObjectId(),
        userId: seedUser.id,
        type: 'draft_ready',
        title: 'Stripe application draft ready',
        body: 'AI drafted tailored CV emphasizing Playwright and scalable distributed architectures.',
        readAt: null,
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
      },
      {
        _id: new Types.ObjectId(),
        userId: seedUser.id,
        type: 'needs_user',
        title: 'Action required: Stripe Captcha',
        body: 'Career submission portal requires human verification before auto-apply can complete.',
        readAt: null,
        createdAt: new Date(Date.now() - 42 * 60 * 1000), // 42 mins ago
      },
      {
        _id: new Types.ObjectId(),
        userId: seedUser.id,
        type: 'sent',
        title: 'Paystack application dispatched',
        body: 'Verified profile and tailored cover letter delivered to Paystack hiring portal.',
        readAt: null,
        createdAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
      },
      {
        _id: new Types.ObjectId(),
        userId: seedUser.id,
        type: 'interview_invite',
        title: 'Interview invitation: Apex Pay Tech',
        body: 'Lead recruiter responded to your outreach sequence. Review invite details in Tracker.',
        readAt: new Date(Date.now() - 18 * 3600 * 1000),
        createdAt: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
      },
    ];
    sNotifications.forEach((n) => memoryNotifications.push(n));
  }

  const createQueryChain = (data: any[]) => {
    const chain: any = {
      _data: [...data],
      sort: () => chain,
      skip: (n: number) => {
        chain._data = chain._data.slice(n);
        return chain;
      },
      limit: (n: number) => {
        chain._data = chain._data.slice(0, n);
        return chain;
      },
      lean: () => Promise.resolve(chain._data),
      populate: () => chain,
      select: () => chain,
      then: (resolve: any) => resolve(chain._data),
      catch: () => chain,
    };
    return chain;
  };

  // 1. User
  (User as any).exists = (query: any) => {
    const qEmail = query?.email ? String(query.email).toLowerCase().trim() : undefined;
    const found = memoryUsers.find((u) => u.email?.toLowerCase?.() === qEmail);
    return {
      select: () => Promise.resolve(found ? { _id: found._id } : null),
      then: (resolve: any) => resolve(found ? { _id: found._id } : null),
    };
  };
  (User as any).findOne = (query: any) => {
    const qEmail = query?.email ? String(query.email).toLowerCase().trim() : undefined;
    const found = memoryUsers.find(
      (u) =>
        (qEmail && u.email?.toLowerCase?.() === qEmail) ||
        (query?._id && String(u._id) === String(query._id)) ||
        (query?.id && String(u.id) === String(query.id)),
    );
    if (found && !found.save) {
      found.save = function () {
        return Promise.resolve(this);
      };
    }
    return {
      select: () => Promise.resolve(found || null),
      lean: () => Promise.resolve(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  };
  (User as any).findById = (id: any) => {
    const found = memoryUsers.find((u) => String(u._id) === String(id) || String(u.id) === String(id));
    if (found && !found.save) {
      found.save = function () {
        return Promise.resolve(this);
      };
    }
    return {
      select: () => ({
        lean: () => Promise.resolve(found || null),
        then: (resolve: any) => resolve(found || null),
      }),
      lean: () => Promise.resolve(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  };
  (User as any).findByIdAndUpdate = (id: any, update: any) => {
    const found = memoryUsers.find((u) => String(u._id) === String(id) || String(u.id) === String(id));
    if (found) {
      Object.assign(found, update);
    }
    return Promise.resolve(found || null);
  };
  (User as any).create = (doc: any) => {
    const _id = new Types.ObjectId();
    const userDoc = {
      _id,
      id: String(_id),
      ...doc,
      email: doc.email.toLowerCase(),
      isEmailVerified: doc.isEmailVerified ?? false,
      onboardingStage: doc.onboardingStage || 'otp_pending',
      setupStep: doc.setupStep || 1,
      save() {
        return Promise.resolve(this);
      },
      toObject() {
        return { ...this };
      },
    };
    memoryUsers.push(userDoc);
    return Promise.resolve(userDoc);
  };

  // 2. RefreshToken + LoginChallenge: small equality-filter collections with save().
  const matches = (doc: any, query: any) =>
    Object.entries(query || {}).every(([k, v]) => String(doc[k]) === String(v));
  const memoryCollection = (Model: any, rows: any[], stamp: boolean) => {
    Model.create = (doc: any) => {
      const row: any = {
        _id: new Types.ObjectId(),
        ...(stamp ? { createdAt: new Date() } : {}),
        ...doc,
        save() {
          return Promise.resolve(this);
        },
      };
      rows.push(row);
      return Promise.resolve(row);
    };
    Model.find = (query: any) => Promise.resolve(rows.filter((r) => matches(r, query)));
    Model.findOne = (query: any) => Promise.resolve(rows.find((r) => matches(r, query)) || null);
    Model.updateMany = (query: any, update: any) => {
      const hit = rows.filter((r) => matches(r, query));
      hit.forEach((r) => Object.assign(r, update));
      return Promise.resolve({ modifiedCount: hit.length });
    };
    Model.deleteMany = (query: any) => {
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], query)) rows.splice(i, 1);
      return Promise.resolve({ deletedCount: 0 });
    };
  };
  memoryCollection(RefreshToken as any, memoryTokens, false);
  memoryCollection(LoginChallenge as any, [], true);

  const updateOneIn = (rows: any[]) => (query: any, update: any) => {
    const hit = rows.find((r) => Object.entries(query || {}).every(([k, v]) => String(r[k]) === String(v)));
    if (hit) Object.assign(hit, (update && update.$set) || update);
    return Promise.resolve({ matchedCount: hit ? 1 : 0, modifiedCount: hit ? 1 : 0 });
  };
  (User as any).updateOne = updateOneIn(memoryUsers);
  (Profile as any).updateOne = updateOneIn(memoryProfiles);

  // 3. Profile
  (Profile as any).findOne = (query: any) => {
    let p = memoryProfiles.find(
      (x) =>
        (query.userId && String(x.userId) === String(query.userId)) ||
        (query._id && String(x._id) === String(query._id)),
    );
    // Unknown users have no profile; loadProfile() creates an empty draft. Never hand a new user
    // someone else's seeded data.
    p = p ?? null;
    return {
      ...p,
      lean: () => Promise.resolve(p),
      then: (resolve: any) => resolve(p),
    };
  };
  (Profile as any).findOneAndUpdate = (query: any, update: any, opts: any) => {
    let p = memoryProfiles.find(
      (x) =>
        (query.userId && String(x.userId) === String(query.userId)) ||
        (query._id && String(x._id) === String(query._id)),
    );
    const updateData = update.$set ? { ...update, ...update.$set } : update;
    if (!p && opts?.upsert) {
      p = {
        _id: new Types.ObjectId(),
        ...query,
        ...updateData,
        toObject() {
          return { ...this };
        },
        save() {
          return Promise.resolve(this);
        },
      };
      memoryProfiles.push(p);
    } else if (p) {
      Object.assign(p, updateData);
    }
    return {
      ...p,
      lean: () => Promise.resolve(p),
      then: (resolve: any) => resolve(p),
    };
  };
  (Profile as any).create = (doc: any) => {
    const p = {
      _id: new Types.ObjectId(),
      ...doc,
      // Mirror the mongoose schema's array/rules defaults so callers can rely on them.
      careerPages: doc.careerPages || [],
      rules: {
        dailySendCap: 15, approvalMode: 'review', autoApproveMinScore: 0.75,
        sendingHours: { start: 8, end: 18, timezone: 'UTC' }, weekdaysOnly: true, ...doc.rules,
      },
      remotePreference: doc.remotePreference || 'any',
      experience: doc.experience || [],
      education: doc.education || [],
      projects: doc.projects || [],
      certifications: doc.certifications || [],
      targetRoles: doc.targetRoles || [],
      locations: doc.locations || [],
      skills: doc.skills || [],
      primarySkills: doc.primarySkills || [],
      secondarySkills: doc.secondarySkills || [],
      toolsAndFrameworks: doc.toolsAndFrameworks || [],
      languages: doc.languages || [],
      links: doc.links || [],
      blockedCompanies: doc.blockedCompanies || [],
      answerBank: doc.answerBank || [],
      set(keyOrObj: any, val?: any) {
        if (typeof keyOrObj === 'object') Object.assign(this, keyOrObj);
        else this[keyOrObj] = val;
      },
      toObject() {
        return { ...this };
      },
      save() {
        return Promise.resolve(this);
      },
    };
    memoryProfiles.push(p);
    return Promise.resolve(p);
  };

  // 4. JobPost
  (JobPost as any).find = () => createQueryChain(memoryJobs);
  (JobPost as any).countDocuments = () => Promise.resolve(memoryJobs.length);
  (JobPost as any).findOne = (q?: any) => {
    const found = q?._id ? memoryJobs.find((j) => String(j._id) === String(q._id)) : memoryJobs[0];
    return Promise.resolve(found || null);
  };
  (JobPost as any).create = (doc: any) => {
    const j = { _id: new Types.ObjectId(), id: String(new Types.ObjectId()), ...doc };
    memoryJobs.push(j);
    return Promise.resolve(j);
  };

  // 5. Application
  (Application as any).find = (query?: any) => {
    let filtered = [...memoryApplications];
    if (query?.status) {
      filtered = filtered.filter((a) => a.status === query.status);
    }
    return createQueryChain(filtered);
  };
  // Honour the filters the safety rules use (per-user approvals, dry-run counts), not just status.
  (Application as any).countDocuments = (query: any = {}) => {
    const filtered = memoryApplications.filter((a) => {
      if (query.userId && String(a.userId) !== String(query.userId)) return false;
      if (query.channel && a.channel !== query.channel) return false;
      if (query.status) {
        const allowed: string[] = typeof query.status === 'object' && query.status.$in ? query.status.$in : [query.status];
        if (!allowed.includes(a.status)) return false;
      }
      if (query['history.note'] && !(a.history ?? []).some((h: any) => h.note === query['history.note'])) return false;
      return true;
    });
    return Promise.resolve(filtered.length);
  };
  (Application as any).create = (doc: any) => {
    const appDoc = { _id: new Types.ObjectId(), ...doc };
    memoryApplications.push(appDoc);
    return Promise.resolve(appDoc);
  };

  // 6. Task
  // Tasks are real documents here (id, save) because the reply link and live sessions read and update them.
  const taskDoc = (doc: any) => {
    const t: any = { _id: new Types.ObjectId(), status: 'open', questions: [], createdAt: new Date(), ...doc };
    Object.defineProperty(t, 'id', { get: () => String(t._id), enumerable: false });
    t.save = () => Promise.resolve(t);
    t.toObject = () => ({ ...t });
    return t;
  };
  const taskMatch = (t: any, q: any = {}) => Object.entries(q).every(([k, v]) => String(t[k]) === String(v));
  const thenable = (v: any) => ({ lean: () => Promise.resolve(v), sort: () => thenable(v), then: (r: any, j: any) => Promise.resolve(v).then(r, j), catch: (j: any) => Promise.resolve(v).catch(j) });
  (Task as any).find = (query?: any) => {
    const filtered = memoryTasks.filter((t) => taskMatch(t, query)).sort((a, b) => b.createdAt - a.createdAt);
    return createQueryChain(filtered);
  };
  (Task as any).findById = (id: any) => thenable(memoryTasks.find((t) => String(t._id) === String(id)) ?? null);
  (Task as any).findOne = (query?: any) => thenable(memoryTasks.filter((t) => taskMatch(t, query)).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null);
  (Task as any).create = (doc: any) => {
    const t = taskDoc(doc);
    memoryTasks.push(t);
    return Promise.resolve(t);
  };

  // 7. Notification
  (Notification as any).find = (query?: any) => {
    let filtered = [...memoryNotifications];
    if (query?.userId) {
      filtered = filtered.filter((n) => String(n.userId) === String(query.userId));
    }
    if (query?.readAt === null) {
      filtered = filtered.filter((n) => !n.readAt);
    }
    filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return createQueryChain(filtered);
  };
  (Notification as any).countDocuments = (query?: any) => {
    let filtered = [...memoryNotifications];
    if (query?.userId) {
      filtered = filtered.filter((n) => String(n.userId) === String(query.userId));
    }
    if (query?.readAt === null) {
      filtered = filtered.filter((n) => !n.readAt);
    }
    return Promise.resolve(filtered.length);
  };
  (Notification as any).findOneAndUpdate = (query: any, update: any) => {
    const found = memoryNotifications.find(
      (n) => String(n._id) === String(query._id) && (String(n.userId) === String(query.userId)),
    );
    if (found) {
      if (update.readAt) found.readAt = update.readAt;
      return Promise.resolve(found);
    }
    return Promise.resolve(null);
  };
  (Notification as any).updateMany = (query: any, update: any) => {
    let count = 0;
    for (const n of memoryNotifications) {
      if (String(n.userId) === String(query.userId)) {
        if (query.readAt === null ? !n.readAt : true) {
          if (update.readAt) n.readAt = update.readAt;
          count++;
        }
      }
    }
    return Promise.resolve({ modifiedCount: count });
  };
  (Notification as any).deleteOne = (query: any) => {
    const idx = memoryNotifications.findIndex(
      (n) => String(n._id) === String(query._id) && (String(n.userId) === String(query.userId)),
    );
    if (idx !== -1) memoryNotifications.splice(idx, 1);
    return Promise.resolve({ deletedCount: idx !== -1 ? 1 : 0 });
  };
  (Notification as any).deleteMany = (query: any) => {
    const initialLen = memoryNotifications.length;
    for (let i = memoryNotifications.length - 1; i >= 0; i--) {
      if (!query.userId || String(memoryNotifications[i].userId) === String(query.userId)) {
        memoryNotifications.splice(i, 1);
      }
    }
    return Promise.resolve({ deletedCount: initialLen - memoryNotifications.length });
  };
  (Notification as any).create = (doc: any) => {
    const notifDoc = {
      _id: new Types.ObjectId(),
      id: String(new Types.ObjectId()),
      createdAt: new Date(),
      readAt: null,
      ...doc,
    };
    memoryNotifications.unshift(notifDoc);
    return Promise.resolve(notifDoc);
  };

  // 8. AuditLog
  (AuditLog as any).find = () => createQueryChain([]);
  (AuditLog as any).create = (doc: any) => Promise.resolve({ _id: new Types.ObjectId(), ...doc });

  // 10. SiteAccount (accounts the live browser creates on job sites)
  const memorySiteAccounts: any[] = [];
  const findAccount = (q: any) => memorySiteAccounts.find((a) => String(a.userId) === String(q.userId) && a.domain === q.domain) ?? null;
  (SiteAccount as any).findOne = (q: any) => {
    const found = findAccount(q);
    if (found) found.save = () => Promise.resolve(found);
    return { lean: () => Promise.resolve(found), then: (r: any, j: any) => Promise.resolve(found).then(r, j) };
  };
  (SiteAccount as any).find = (q: any = {}) => {
    const list = memorySiteAccounts
      .filter((a) => !q.userId || String(a.userId) === String(q.userId))
      .map(({ passwordEnc: _p, ...rest }) => rest); // export never includes passwords
    return { lean: () => Promise.resolve(list), then: (r: any, j: any) => Promise.resolve(list).then(r, j) };
  };
  (SiteAccount as any).deleteMany = (q: any = {}) => {
    for (let i = memorySiteAccounts.length - 1; i >= 0; i--) if (String(memorySiteAccounts[i].userId) === String(q.userId)) memorySiteAccounts.splice(i, 1);
    return Promise.resolve({ acknowledged: true });
  };
  (SiteAccount as any).updateOne = (q: any, update: any, opts: any = {}) => {
    let found = findAccount(q);
    if (!found && opts.upsert) memorySiteAccounts.push((found = { _id: new Types.ObjectId(), ...q }));
    if (found) Object.assign(found, update.$set ?? update);
    return Promise.resolve({ acknowledged: true });
  };

  // 9. TaxonomyRequest
  const memoryTaxonomyRequests: any[] = [];
  (TaxonomyRequest as any).deleteMany = (q: any = {}) => {
    for (let i = memoryTaxonomyRequests.length - 1; i >= 0; i--) if (!q.email || memoryTaxonomyRequests[i].email === q.email) memoryTaxonomyRequests.splice(i, 1);
    return Promise.resolve({ acknowledged: true });
  };
  (TaxonomyRequest as any).create = (doc: any) => {
    const item = { _id: new Types.ObjectId(), createdAt: new Date(), ...doc };
    memoryTaxonomyRequests.push(item);
    return Promise.resolve(item);
  };

  // 9. BusinessLead / BusinessServices: small working stores with real documents (save, set, id).
  const memoryBusinessServices: any[] = [];
  const asDoc = (store: any[], raw: any) => {
    const d: any = { _id: new Types.ObjectId(), createdAt: new Date(), updatedAt: new Date(), ...raw };
    Object.defineProperty(d, 'id', { get: () => String(d._id), enumerable: false });
    d.save = () => {
      d.updatedAt = new Date();
      return Promise.resolve(d);
    };
    d.set = (k: any, v?: any) => (typeof k === 'object' ? Object.assign(d, k) : (d[k] = v));
    d.markModified = () => undefined;
    d.toObject = () => ({ ...d });
    store.push(d);
    return d;
  };
  const match = (d: any, q: any = {}) => Object.entries(q).every(([k, v]) => String(d[k]) === String(v));
  const docQuery = (v: any) => ({ lean: () => Promise.resolve(v), then: (r: any, j: any) => Promise.resolve(v).then(r, j), catch: (j: any) => Promise.resolve(v).catch(j) });
  const listQuery = (list: any[]) => {
    const q: any = {
      sort: (spec: any) => {
        const [k, dir] = Object.entries(spec ?? {})[0] ?? [];
        if (k) list.sort((a: any, b: any) => (a[k as string] > b[k as string] ? (dir as number) : -(dir as number)));
        return q;
      },
      limit: (n: number) => ((list = list.slice(0, n)), q),
      lean: () => Promise.resolve(list),
      then: (r: any, j: any) => Promise.resolve(list).then(r, j),
    };
    return q;
  };
  (BusinessLead as any).create = (doc: any) => {
    if (doc.osmId && memoryBusinessLeads.some((l) => String(l.userId) === String(doc.userId) && l.osmId === doc.osmId)) {
      return Promise.reject(Object.assign(new Error('duplicate'), { code: 11000 }));
    }
    return Promise.resolve(asDoc(memoryBusinessLeads, { contacts: [], pitches: [], notes: [], history: [], valueInputs: {}, status: 'new', vertical: 'other', ...doc }));
  };
  (BusinessLead as any).find = (q?: any) => listQuery(memoryBusinessLeads.filter((l) => match(l, q)));
  (BusinessLead as any).findOne = (q?: any) => docQuery(memoryBusinessLeads.find((l) => match(l, q)) ?? null);
  (BusinessLead as any).findById = (id: any) => docQuery(memoryBusinessLeads.find((l) => String(l._id) === String(id)) ?? null);
  (BusinessLead as any).deleteOne = (q: any) => {
    const i = memoryBusinessLeads.findIndex((l) => match(l, q));
    if (i >= 0) memoryBusinessLeads.splice(i, 1);
    return Promise.resolve({ deletedCount: i >= 0 ? 1 : 0 });
  };
  (BusinessLead as any).deleteMany = (q: any) => {
    for (let i = memoryBusinessLeads.length - 1; i >= 0; i--) if (match(memoryBusinessLeads[i], q)) memoryBusinessLeads.splice(i, 1);
    return Promise.resolve({ acknowledged: true });
  };
  (BusinessServices as any).findOne = (q?: any) => docQuery(memoryBusinessServices.find((s) => match(s, q)) ?? null);
  (BusinessServices as any).deleteOne = (q: any) => {
    const i = memoryBusinessServices.findIndex((x) => match(x, q));
    if (i >= 0) memoryBusinessServices.splice(i, 1);
    return Promise.resolve({ deletedCount: i >= 0 ? 1 : 0 });
  };
  (BusinessServices as any).create = (doc: any) =>
    Promise.resolve(
      asDoc(memoryBusinessServices, { hourlyRate: 7500, fxRate: 1550, marginPct: 30, guarantees: { ownership: true, liveByDays: 21 }, caseStudies: [], ...doc }),
    );

  persistMemoryStore({
    users: memoryUsers,
    profiles: memoryProfiles,
    jobs: memoryJobs,
    applications: memoryApplications,
    tasks: memoryTasks,
    notifications: memoryNotifications,
    leads: memoryBusinessLeads,
    tokens: memoryTokens,
  });
}

/**
 * Dev-only durability for the in-memory fallback: without this every server restart (tsx watch restarts on each
 * edit) wipes the refresh tokens and signs everybody out. State is loaded from server/.data/memory.json on boot
 * and written back shortly after it changes.
 */
function persistMemoryStore(stores: Record<string, any[]>): void {
  if (process.env.MEMORY_DB_PERSIST === '0') return;
  const file = path.resolve(__dirname, '../../.data/memory.json');
  const revive = (key: string, v: any) => {
    if (typeof v !== 'string') return v;
    if (/^[0-9a-f]{24}$/i.test(v) && (key === '_id' || key === 'id' || /Id$/.test(key))) return new Types.ObjectId(v);
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v)) return new Date(v);
    return v;
  };

  try {
    if (fs.existsSync(file)) {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'), revive);
      for (const [name, rows] of Object.entries(stores)) {
        if (!Array.isArray(saved[name])) continue;
        for (const r of saved[name]) {
          // Restored rows must behave like documents: controllers call set(), toObject(), markModified() and read id.
          const hidden = (k: string, value: any) => {
            if (typeof r[k] === 'undefined') Object.defineProperty(r, k, { value, enumerable: false, writable: true, configurable: true });
          };
          hidden('save', function (this: any) { return Promise.resolve(this); });
          hidden('set', function (this: any, k: any, v?: any) { return typeof k === 'object' ? Object.assign(this, k) : (this[k] = v); });
          hidden('markModified', () => undefined);
          hidden('toObject', function (this: any) { return JSON.parse(JSON.stringify(this), revive); });
          if (r._id && typeof r.id === 'undefined') Object.defineProperty(r, 'id', { get() { return String(this._id); }, enumerable: false, configurable: true });
        }
        rows.splice(0, rows.length, ...saved[name]);
      }
      logger.info('[MemoryDb] Restored persisted dev data from .data/memory.json');
    }
  } catch (err) {
    logger.warn({ err }, '[MemoryDb] Could not restore persisted data; starting fresh.');
  }

  let last = '';
  const save = () => {
    try {
      const out: Record<string, any[]> = {};
      for (const [name, rows] of Object.entries(stores)) out[name] = rows.map((r) => (typeof r?.toObject === 'function' ? r.toObject() : r));
      const json = JSON.stringify(out);
      if (json === last) return;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, json);
      last = json;
    } catch {
      /* best effort */
    }
  };
  setInterval(save, 1500).unref();
  process.on('beforeExit', save);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { save(); process.exit(0); });
}

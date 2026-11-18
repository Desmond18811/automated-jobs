import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { JobPost } from '../models/jobPost.model';
import { Application } from '../models/application.model';
import { Task } from '../models/task.model';
import { Notification } from '../models/notification.model';
import { BusinessLead } from '../models/businessLead.model';
import { RefreshToken } from '../models/refreshToken.model';
import { AuditLog } from '../models/audit.model';
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

  // Seed default demo user and profile
  const defaultUserId = new Types.ObjectId();
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  const defaultUser = {
    _id: defaultUserId,
    id: String(defaultUserId),
    email: 'candidate@javi.ai',
    passwordHash,
    role: 'candidate',
    status: 'active',
    toObject() {
      return { ...this };
    },
  };
  memoryUsers.push(defaultUser);

  // Pre-seed test user as well
  const testUserId = new Types.ObjectId();
  memoryUsers.push({
    _id: testUserId,
    id: String(testUserId),
    email: 'test@javi.ai',
    passwordHash,
    role: 'candidate',
    status: 'active',
    toObject() {
      return { ...this };
    },
  });

  const defaultProfile = {
    _id: new Types.ObjectId(),
    userId: defaultUserId,
    status: 'complete',
    firstName: 'Angelica',
    lastName: 'Greeze',
    fullName: 'Angelica Greeze',
    email: 'candidate@javi.ai',
    phone: '+1 (555) 234-5678',
    headline: 'UI / UX Designer',
    location: 'New York, NY (Open to Remote / Relocation)',
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
    targetRoles: ['UI / UX Designer', 'UI Designer', 'Product Designer'],
    primarySkills: ['UI', 'Ux', 'Website Design', 'Mobile Design', 'Research', 'Interaction'],
    secondarySkills: ['Figma', 'Prototyping', 'Design Systems', 'User Testing'],
    toolsAndFrameworks: ['Figma', 'Adobe XD', 'Sketch', 'Principle', 'HTML/CSS'],
    experience: [
      {
        title: 'UI / UX Designer',
        company: 'Ideologist Team',
        location: 'Remote',
        start: 'Jan 2022',
        end: 'Present',
        current: true,
        highlights: ['Leading UX research, interaction architecture, and scalable design systems.'],
      },
      {
        title: 'UI Designer',
        company: 'Tigabatang',
        location: 'Fulltime',
        start: 'Jan 2022',
        end: 'Present',
        current: false,
        highlights: ['Designed high-fidelity interactive prototypes and design documentation.'],
      },
    ],
    education: [
      {
        institution: 'Oxford University',
        degree: 'Student - Software Engienering',
        start: '2018',
        end: '2021',
      },
      {
        institution: 'Oxford Vocational High School',
        degree: 'Student - Software Engienering',
        start: '2015',
        end: '2015',
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
  memoryProfiles.push(defaultProfile);

  // Pre-seed sample business leads located at candidate location (Lekki / Lagos)
  const sampleLeads = [
    {
      _id: new Types.ObjectId(),
      name: 'Apex Pay Technologies',
      category: 'Fintech & Digital Payments',
      address: 'Admiralty Way, Lekki Phase 1, Lagos',
      location: { lat: 6.4474, lng: 3.4723 },
      distanceKm: 1.2,
      rating: 4.8,
      reviewsCount: 34,
      websiteUrl: 'https://apexpay.example.com',
      websiteAudit: {
        hasWebsite: true,
        mobileResponsive: false,
        hasSsl: true,
        techStack: ['WordPress', 'PHP', 'jQuery'],
        issues: ['Mobile viewport scaling error', 'Slow API checkout latency (>1.8s)'],
      },
      socialPresence: {
        linkedinUrl: 'https://linkedin.com/company/apex-pay-demo',
        twitterUrl: 'https://twitter.com/apexpay_demo',
        notes: ['Active hiring for backend integrations'],
      },
      contacts: [
        {
          name: 'Tunde Adeleke',
          title: 'Head of Engineering',
          email: 'tunde@apexpay.example.com',
          phone: '+234 803 111 2233',
        },
      ],
      needsServices: true,
      qualificationReason: 'High checkout latency and broken mobile responsive flow on payment gateway',
      pitchSnippet:
        'I noticed Apex Pay’s checkout flow has a 1.8s mobile delay. I specialize in high-concurrency TypeScript/Node services and can optimize the intake flow to cut bounce rates by ~25%.',
      stage: 'pitch_drafted',
    },
    {
      _id: new Types.ObjectId(),
      name: 'Lekki Dental & Health Clinic',
      category: 'Healthcare & Wellness',
      address: 'Bisola Durosinmi Etti Drive, Lekki, Lagos',
      location: { lat: 6.4512, lng: 3.481 },
      distanceKm: 2.1,
      rating: 4.6,
      reviewsCount: 52,
      websiteUrl: '',
      websiteAudit: {
        hasWebsite: false,
        mobileResponsive: false,
        hasSsl: false,
        techStack: [],
        issues: ['No online booking presence; manual phone reservations only'],
      },
      socialPresence: {
        instagramUrl: 'https://instagram.com/lekkidental_demo',
        notes: ['Instagram DM booking causes patient leakage'],
      },
      contacts: [
        {
          name: 'Dr. Chika Nwosu',
          title: 'Medical Director & Founder',
          email: 'chika@lekkidental.example.com',
          phone: '+234 802 444 5566',
        },
      ],
      needsServices: true,
      qualificationReason: 'Zero automated online booking system; patient intake bottleneck',
      pitchSnippet:
        'I noticed patients currently have to DM on Instagram to book consultations. I can set up an automated WhatsApp + Web self-service appointment scheduler in 48 hours to recover lost bookings.',
      stage: 'qualified',
    },
    {
      _id: new Types.ObjectId(),
      name: 'SwiftLogistics Express',
      category: 'Supply Chain & Logistics',
      address: 'Freedom Way, Lekki Phase 1, Lagos',
      location: { lat: 6.442, lng: 3.468 },
      distanceKm: 2.8,
      rating: 4.3,
      reviewsCount: 19,
      websiteUrl: 'https://swiftlogistics.example.com',
      websiteAudit: {
        hasWebsite: true,
        mobileResponsive: true,
        hasSsl: true,
        techStack: ['React', 'Node.js'],
        issues: ['No real-time driver tracking WebSockets'],
      },
      socialPresence: {
        linkedinUrl: 'https://linkedin.com/company/swiftlogistics-demo',
        notes: ['Customer complaints regarding delayed parcel status updates'],
      },
      contacts: [
        {
          name: 'Femi Balogun',
          title: 'Operations Director',
          email: 'femi@swiftlogistics.example.com',
        },
      ],
      needsServices: true,
      qualificationReason: 'Missing real-time socket tracking; dispatch latency',
      pitchSnippet:
        'I noticed parcel updates are batch-refreshed with delays. I build real-time event-driven tracking layers (Socket.IO/Redis) and can deploy live driver GPS telemetry for your dispatch dashboard.',
      stage: 'discovered',
    },
  ];

  sampleLeads.forEach((l) => memoryBusinessLeads.push(l));

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

  // Seed sample applications
  const sampleApplications = [
    {
      _id: new Types.ObjectId(),
      id: 'app-1',
      userId: defaultUserId,
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
      id: 'app-2',
      userId: defaultUserId,
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
  sampleApplications.forEach((a) => memoryApplications.push(a));

  // Seed sample tasks ("Needs you")
  const sampleTasks = [
    {
      _id: new Types.ObjectId(),
      id: 'task-1',
      userId: defaultUserId,
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
      id: 'task-2',
      userId: defaultUserId,
      type: 'salary_decision',
      company: 'Paystack',
      role: 'Staff Full-Stack Developer',
      message: 'Confirm expected salary range ($120k-$140k) before auto-submitting draft.',
      status: 'open',
      priority: 'medium',
      createdAt: new Date(),
    },
  ];
  sampleTasks.forEach((t) => memoryTasks.push(t));

  // Seed sample notifications for candidate pop-up
  const sampleNotifications = [
    {
      _id: new Types.ObjectId(),
      userId: defaultUserId,
      type: 'draft_ready',
      title: 'Stripe application draft ready',
      body: 'AI drafted tailored CV emphasizing Playwright and scalable distributed architectures.',
      readAt: null,
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    },
    {
      _id: new Types.ObjectId(),
      userId: defaultUserId,
      type: 'needs_user',
      title: 'Action required: Stripe Captcha',
      body: 'Career submission portal requires human verification before auto-apply can complete.',
      readAt: null,
      createdAt: new Date(Date.now() - 42 * 60 * 1000), // 42 mins ago
    },
    {
      _id: new Types.ObjectId(),
      userId: defaultUserId,
      type: 'sent',
      title: 'Paystack application dispatched',
      body: 'Verified profile and tailored cover letter delivered to Paystack hiring portal.',
      readAt: null,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
    },
    {
      _id: new Types.ObjectId(),
      userId: defaultUserId,
      type: 'interview_invite',
      title: 'Interview invitation: Apex Pay Tech',
      body: 'Lead recruiter responded to your outreach sequence. Review invite details in Tracker.',
      readAt: new Date(Date.now() - 18 * 3600 * 1000),
      createdAt: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
    },
  ];
  sampleNotifications.forEach((n) => memoryNotifications.push(n));

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
    const found = memoryUsers.find((u) => u.email === query.email?.toLowerCase());
    return {
      select: () => Promise.resolve(found ? { _id: found._id } : null),
      then: (resolve: any) => resolve(found ? { _id: found._id } : null),
    };
  };
  (User as any).findOne = (query: any) => {
    const found = memoryUsers.find(
      (u) =>
        (query.email && u.email === query.email?.toLowerCase()) ||
        (query._id && String(u._id) === String(query._id)),
    );
    return {
      select: () => Promise.resolve(found || null),
      lean: () => Promise.resolve(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  };
  (User as any).findById = (id: any) => {
    const found = memoryUsers.find((u) => String(u._id) === String(id));
    return {
      select: () => ({
        lean: () => Promise.resolve(found || null),
        then: (resolve: any) => resolve(found || null),
      }),
      lean: () => Promise.resolve(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  };
  (User as any).create = (doc: any) => {
    const _id = new Types.ObjectId();
    const userDoc = {
      _id,
      id: String(_id),
      ...doc,
      email: doc.email.toLowerCase(),
      toObject() {
        return { ...this };
      },
    };
    memoryUsers.push(userDoc);
    return Promise.resolve(userDoc);
  };

  // 2. RefreshToken
  (RefreshToken as any).create = (doc: any) => {
    const t = { _id: new Types.ObjectId(), ...doc };
    memoryTokens.push(t);
    return Promise.resolve(t);
  };
  (RefreshToken as any).findOne = (query: any) => {
    const found = memoryTokens.find((t) => t.tokenHash === query.tokenHash);
    return Promise.resolve(found || null);
  };
  (RefreshToken as any).updateMany = () => Promise.resolve({ modifiedCount: 1 });

  // 3. Profile
  (Profile as any).findOne = (query: any) => {
    let p = memoryProfiles.find(
      (x) =>
        (query.userId && String(x.userId) === String(query.userId)) ||
        (query._id && String(x._id) === String(query._id)),
    );
    if (!p && query.userId) {
      p = {
        _id: new Types.ObjectId(),
        userId: query.userId,
        status: 'draft',
        firstName: 'Alex',
        lastName: 'Okafor',
        fullName: 'Alex Okafor',
        email: 'candidate@javi.ai',
        phone: '+234 801 234 5678',
        headline: 'Lead Automation & Product Engineer',
        location: 'Lekki, Lagos',
        careerPages: [],
        rules: { dailySendCap: 15, approvalMode: 'review' },
        targetRoles: ['Lead Automation Engineer', 'Full-Stack Developer'],
        primarySkills: ['TypeScript', 'React', 'Node.js'],
        secondarySkills: ['PostgreSQL', 'Docker'],
        toolsAndFrameworks: ['Playwright', 'Vite'],
        experience: defaultProfile.experience,
        education: defaultProfile.education,
        projects: defaultProfile.projects,
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
    }
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
      careerPages: doc.careerPages || [],
      rules: doc.rules || { dailySendCap: 15, approvalMode: 'review' },
      experience: doc.experience || [],
      education: doc.education || [],
      projects: doc.projects || [],
      targetRoles: doc.targetRoles || [],
      primarySkills: doc.primarySkills || [],
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
  (Application as any).countDocuments = (query?: any) => {
    let filtered = [...memoryApplications];
    if (query?.status) {
      filtered = filtered.filter((a) => a.status === query.status);
    }
    return Promise.resolve(filtered.length);
  };
  (Application as any).create = (doc: any) => {
    const appDoc = { _id: new Types.ObjectId(), ...doc };
    memoryApplications.push(appDoc);
    return Promise.resolve(appDoc);
  };

  // 6. Task
  (Task as any).find = (query?: any) => {
    let filtered = [...memoryTasks];
    if (query?.status) {
      filtered = filtered.filter((t) => t.status === query.status);
    }
    return createQueryChain(filtered);
  };
  (Task as any).create = (doc: any) => {
    const t = { _id: new Types.ObjectId(), ...doc };
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
      (n) => String(n._id) === String(query._id) && (!query.userId || String(n.userId) === String(query.userId)),
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
      if (!query.userId || String(n.userId) === String(query.userId)) {
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
      (n) => String(n._id) === String(query._id) && (!query.userId || String(n.userId) === String(query.userId)),
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

  // 9. BusinessLead
  (BusinessLead as any).find = (query?: any) => {
    let filtered = [...memoryBusinessLeads];
    if (query?.needsServices !== undefined) {
      filtered = filtered.filter((b) => b.needsServices === query.needsServices);
    }
    return createQueryChain(filtered);
  };
  (BusinessLead as any).findOne = (query: any) => {
    const found = memoryBusinessLeads.find(
      (b) =>
        (query._id && String(b._id) === String(query._id)) ||
        (query.name && b.name === query.name),
    );
    if (found) {
      found.save = () => Promise.resolve(found);
    }
    return Promise.resolve(found || null);
  };
  (BusinessLead as any).findOneAndUpdate = (query: any, update: any, opts: any) => {
    let found = memoryBusinessLeads.find(
      (b) =>
        (query._id && String(b._id) === String(query._id)) ||
        (query.name && b.name === query.name),
    );
    const updateData = update.$set ? { ...update, ...update.$set } : update;
    if (!found && opts?.upsert) {
      found = {
        _id: new Types.ObjectId(),
        ...updateData,
        save() {
          return Promise.resolve(this);
        },
      };
      memoryBusinessLeads.push(found);
    } else if (found) {
      Object.assign(found, updateData);
      found.save = () => Promise.resolve(found);
    }
    return Promise.resolve(found);
  };
}

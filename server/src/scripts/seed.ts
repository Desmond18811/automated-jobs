/**
 * J.A.V.I Database Seed Script
 * Creates test users, comprehensive profile data, jobs, applications,
 * "needs you" queue tasks, and notifications for local and staging verification.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../lib/db';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { JobPost } from '../models/jobPost.model';
import { Application } from '../models/application.model';
import { Task } from '../models/task.model';
import { Notification } from '../models/notification.model';
import { dedupeHashOf, fingerprintOf } from '../lib/normalize';

async function seed() {
  console.log('🌱 Starting J.A.V.I database seed...');
  await connectDb();

  // Common password hash for test accounts
  const passwordHash = await bcrypt.hash('password123', 10);

  // ---------------------------------------------------------------------------
  // 1. Primary Seed User: you@example.com (Full Active Workspace)
  // ---------------------------------------------------------------------------
  let primaryUser = await User.findOne({ email: 'you@example.com' });
  if (!primaryUser) {
    primaryUser = await User.create({
      email: 'you@example.com',
      passwordHash,
      name: 'Ada Okafor',
      consent: { termsAcceptedAt: new Date() },
    });
    console.log('✅ Created primary user: you@example.com');
  } else {
    primaryUser.passwordHash = passwordHash;
    primaryUser.name = 'Ada Okafor';
    await primaryUser.save();
    console.log('ℹ️ Updated primary user: you@example.com');
  }

  // Clear existing data for primary user to ensure clean re-seed
  await Promise.all([
    Profile.deleteMany({ userId: primaryUser._id }),
    Application.deleteMany({ userId: primaryUser._id }),
    Task.deleteMany({ userId: primaryUser._id }),
    Notification.deleteMany({ userId: primaryUser._id }),
  ]);

  // Create extensive profile for you@example.com
  await Profile.create({
    userId: primaryUser._id,
    firstName: 'Ada',
    lastName: 'Okafor',
    fullName: 'Ada Okafor',
    email: 'you@example.com',
    phone: '+234 801 234 5678',
    headline: 'Senior Product Designer',
    summary: 'Senior Product Designer with 7+ years of experience leading design systems and high-scale consumer fintech applications across Africa and Europe.',
    linkedinUrl: 'https://linkedin.com/in/ada-okafor',
    portfolioUrl: 'https://javi.page/ada-okafor',
    githubUrl: 'https://github.com/adaokafor',
    targetRoles: ['Senior Product Designer', 'Design Systems Lead', 'Staff Product Designer'],
    locations: ['Remote', 'Lagos', 'London'],
    remotePreference: 'remote',
    salaryExpectation: {
      minimum: 120000,
      currency: 'USD',
      period: 'year',
      negotiable: true,
    },
    workAuthorization: 'authorized',
    noticePeriod: '2 weeks',
    status: 'verified',
    address: {
      street: 'Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '101241',
      country: 'Nigeria',
    },
    location: 'Lagos, Nigeria',
    primarySkills: ['Figma', 'Design Systems', 'Fintech UX', 'Design Strategy', 'User Research', 'Prototyping'],
    secondarySkills: ['React', 'CSS', 'Design Tokens'],
    skills: [
      { name: 'React', years: 5 },
      { name: 'CSS', years: 6 },
      { name: 'Design Tokens', years: 4 },
      { name: 'DesignOps', years: 4 },
      { name: 'Information Architecture', years: 5 },
      { name: 'Usability Testing', years: 6 },
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Paystack',
        title: 'Senior Product Designer',
        location: 'Lagos / Remote',
        start: '2021-03',
        current: true,
        bullets: [
          { id: 'b1', text: 'Led design system used by 40+ engineers across 12 product squads.' },
          { id: 'b2', text: 'Redesigned core checkout funnel increasing conversion by 14%.' },
          { id: 'b3', text: 'Mentored 4 junior and mid-level designers in interaction standards.' },
        ],
      },
      {
        id: 'exp-2',
        company: 'Flutterwave',
        title: 'Product Designer',
        location: 'Lagos',
        start: '2019-01',
        end: '2021-02',
        bullets: [
          { id: 'b4', text: 'Designed merchant dashboard features processing $2M+ in daily volume.' },
          { id: 'b5', text: 'Created comprehensive mobile payment user journeys for iOS and Android.' },
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of Lagos (UNILAG)',
        degree: 'B.Sc. Computer Science',
        field: 'Computer Science & Human-Computer Interaction',
        start: '2014',
        end: '2018',
      },
    ],
    careerPages: [
      { url: 'https://boards.greenhouse.io/stripe', ats: 'greenhouse', token: 'stripe', addedAt: new Date() },
      { url: 'https://jobs.lever.co/monzo', ats: 'lever', token: 'monzo', addedAt: new Date() },
      { url: 'https://shopify.com/careers', ats: 'unsupported', addedAt: new Date() },
    ],
    answerBank: [
      {
        key: 'pacific_overlap',
        question: 'Are you able to overlap with Pacific time two days a week?',
        answer: 'Yes, I regularly coordinate across GMT and PT timezones and can overlap 3-4 hours.',
        reusable: true,
        updatedAt: new Date(),
      },
      {
        key: 'visa_sponsorship',
        question: 'Do you require visa sponsorship?',
        answer: 'No, I have valid right-to-work / Global Talent status.',
        reusable: true,
        updatedAt: new Date(),
      },
    ],
    eeo: {
      gender: 'female',
      raceEthnicity: 'black_african_american',
      veteranStatus: 'not_veteran',
      disabilityStatus: 'no',
    },
  });
  console.log('✅ Created comprehensive profile for you@example.com');

  // ---------------------------------------------------------------------------
  // 2. Secondary Seed User: newuser@example.com (Fresh Clean Zero-State)
  // ---------------------------------------------------------------------------
  let newUser = await User.findOne({ email: 'newuser@example.com' });
  if (!newUser) {
    newUser = await User.create({
      email: 'newuser@example.com',
      passwordHash,
      name: 'Alex Rivera',
      consent: { termsAcceptedAt: new Date() },
    });
    console.log('✅ Created zero-state user: newuser@example.com');
  } else {
    newUser.passwordHash = passwordHash;
    await newUser.save();
    console.log('ℹ️ Updated zero-state user: newuser@example.com');
  }

  // Clear zero-state user's data to guarantee true 0 on dashboard
  await Promise.all([
    Profile.deleteMany({ userId: newUser._id }),
    Application.deleteMany({ userId: newUser._id }),
    Task.deleteMany({ userId: newUser._id }),
    Notification.deleteMany({ userId: newUser._id }),
  ]);
  console.log('✅ Verified zero-state user has 0 applications and 0 tasks');

  // ---------------------------------------------------------------------------
  // 3. Seed Job Posts
  // ---------------------------------------------------------------------------
  const sampleJobs = [
    {
      source: 'greenhouse',
      url: 'https://boards.greenhouse.io/stripe/jobs/4829102',
      company: 'Stripe',
      title: 'Senior Product Designer, Payments',
      location: 'Remote · EMEA',
      remote: true,
      description: 'Stripe is looking for a Senior Product Designer to craft the future of global billing and payment flows. 6+ years experience in product design, complex workflows, and fintech depth required.',
      salary: { min: 150000, max: 180000, currency: 'USD', period: 'year' as const },
      applyMethod: { type: 'form' as const, formUrl: 'https://boards.greenhouse.io/stripe/jobs/4829102' },
      tags: ['Fintech', 'Design Systems', 'Payments'],
    },
    {
      source: 'lever',
      url: 'https://jobs.lever.co/monzo/8410294',
      company: 'Monzo',
      title: 'Design Systems Lead',
      location: 'London / Remote',
      remote: true,
      description: 'Lead the evolution of Monzo design system across Web, iOS and Android platforms. Partner closely with mobile and design teams.',
      salary: { min: 110000, max: 130000, currency: 'GBP', period: 'year' as const },
      applyMethod: { type: 'form' as const, formUrl: 'https://jobs.lever.co/monzo/8410294' },
      tags: ['Fintech', 'Design Systems', 'Leadership'],
    },
    {
      source: 'career_page',
      url: 'https://shopify.com/careers/staff-product-designer',
      company: 'Shopify',
      title: 'Staff Product Designer, Checkout',
      location: 'Remote',
      remote: true,
      description: 'Shape checkout experiences powering millions of merchant transactions worldwide. Deep experience in high conversion checkout ux.',
      salary: { min: 165000, max: 195000, currency: 'USD', period: 'year' as const },
      applyMethod: { type: 'form' as const, formUrl: 'https://shopify.com/careers/staff-product-designer' },
      tags: ['E-Commerce', 'Checkout', 'Fintech'],
    },
    {
      source: 'email',
      url: 'https://linear.app/careers/product-designer',
      company: 'Linear',
      title: 'Product Designer',
      location: 'Remote',
      remote: true,
      description: 'Help shape software tooling for world-class product teams. Craft precision UI interactions with strong typography and speed.',
      salary: { min: 140000, max: 170000, currency: 'USD', period: 'year' as const },
      applyMethod: { type: 'email' as const, email: 'design-hiring@linear.app' },
      tags: ['DevTools', 'Product Design', 'Remote'],
    },
    {
      source: 'platform',
      url: 'https://linkedin.com/jobs/view/figma-designer',
      company: 'Figma',
      title: 'Product Designer, Editor',
      location: 'Remote · US',
      remote: true,
      description: 'Work on core canvas editor features. Requires deep technical design background and advanced canvas manipulation understanding.',
      salary: { min: 160000, max: 190000, currency: 'USD', period: 'year' as const },
      applyMethod: { type: 'platform' as const, platform: 'linkedin', formUrl: 'https://linkedin.com/jobs/view/figma-designer' },
      tags: ['Design Tools', 'Canvas', 'Editor'],
    },
  ];

  const createdJobs = [];
  for (const j of sampleJobs) {
    const dedupeHash = dedupeHashOf(j.company, j.title, j.url);
    const fingerprint = fingerprintOf(j.company, j.title);
    let job = await JobPost.findOne({ dedupeHash });
    if (!job) {
      job = await JobPost.create({
        ...j,
        dedupeHash,
        fingerprint,
        discoveredAt: new Date(),
      });
    }
    createdJobs.push(job);
  }
  console.log(`✅ Seeded ${createdJobs.length} job postings`);

  // ---------------------------------------------------------------------------
  // 4. Seed Applications for you@example.com (Realistic Active Funnel)
  // ---------------------------------------------------------------------------
  const [stripeJob, monzoJob, shopifyJob, linearJob, figmaJob] = createdJobs;

  // 1. Stripe -> Interview Scheduled
  await Application.create({
    userId: primaryUser._id,
    jobId: stripeJob._id,
    fingerprint: stripeJob.fingerprint,
    status: 'interview',
    score: 94,
    channel: 'form',
    documents: {
      coverLetter: 'Dear Stripe Team,\nI have spent the last 3 years leading design systems and payment checkout flows at Paystack...',
      tailoredCv: 'Ada Okafor — Senior Product Designer (Fintech & Payments focus)',
      generatedAt: new Date(Date.now() - 864e5 * 2),
    },
    history: [
      { from: null, to: 'matched', at: new Date(Date.now() - 864e5 * 4), note: '94% Match score' },
      { from: 'matched', to: 'drafted', at: new Date(Date.now() - 864e5 * 3), note: 'Tailored CV & Cover Letter generated' },
      { from: 'drafted', to: 'sent', at: new Date(Date.now() - 864e5 * 2), note: 'Submitted via Greenhouse ATS' },
      { from: 'sent', to: 'replied', at: new Date(Date.now() - 864e5 * 1), note: 'Email reply received from Stripe recruiting' },
      { from: 'replied', to: 'interview', at: new Date(), note: 'Interview invite confirmed for next Tuesday' },
    ],
  });

  // 2. Monzo -> Sent (Application Sent)
  await Application.create({
    userId: primaryUser._id,
    jobId: monzoJob._id,
    fingerprint: monzoJob.fingerprint,
    status: 'sent',
    score: 91,
    channel: 'form',
    documents: {
      coverLetter: 'Hi Monzo Hiring Team,\nI have designed scalable token systems across iOS, Android, and web...',
      tailoredCv: 'Ada Okafor — Design Systems Lead',
      generatedAt: new Date(Date.now() - 864e5 * 3),
    },
    history: [
      { from: null, to: 'matched', at: new Date(Date.now() - 864e5 * 4) },
      { from: 'matched', to: 'sent', at: new Date(Date.now() - 864e5 * 2) },
    ],
  });

  // 3. Shopify -> Replied (Reply received)
  await Application.create({
    userId: primaryUser._id,
    jobId: shopifyJob._id,
    fingerprint: shopifyJob.fingerprint,
    status: 'replied',
    score: 88,
    channel: 'form',
    documents: {
      coverLetter: 'Hello Shopify Checkout Team,\nCheckout UX requires ruthless performance and accessibility...',
      tailoredCv: 'Ada Okafor — Staff Product Designer',
      generatedAt: new Date(Date.now() - 864e5 * 5),
    },
    history: [
      { from: null, to: 'matched', at: new Date(Date.now() - 864e5 * 6) },
      { from: 'matched', to: 'sent', at: new Date(Date.now() - 864e5 * 4) },
      { from: 'sent', to: 'replied', at: new Date(Date.now() - 864e5 * 1), note: 'Recruiter asked for portfolio walkthrough' },
    ],
  });

  // 4. Linear -> Drafted (Ready in drafts queue)
  await Application.create({
    userId: primaryUser._id,
    jobId: linearJob._id,
    fingerprint: linearJob.fingerprint,
    status: 'drafted',
    score: 84,
    channel: 'email',
    documents: {
      emailSubject: 'Product Designer application — Ada Okafor',
      emailBody: 'Hi Karri — I have been using Linear daily for two years and led the design system at Paystack. I would love to talk about the Product Designer role...',
      coverLetter: 'Hi Karri and the Linear team,\nI have admired Linear speed and opinionated workflow...',
      tailoredCv: 'Ada Okafor — Product Designer',
      generatedAt: new Date(),
    },
    history: [
      { from: null, to: 'matched', at: new Date(Date.now() - 864e5 * 1) },
      { from: 'matched', to: 'drafted', at: new Date() },
    ],
  });

  // 5. Figma -> Needs User (Requires manual LinkedIn apply)
  const figmaApp = await Application.create({
    userId: primaryUser._id,
    jobId: figmaJob._id,
    fingerprint: figmaJob.fingerprint,
    status: 'needs_user',
    score: 81,
    channel: 'assisted',
    documents: {
      coverLetter: 'Figma Editor Product Design application...',
      tailoredCv: 'Ada Okafor — Product Designer, Editor',
      generatedAt: new Date(),
    },
    history: [
      { from: null, to: 'matched', at: new Date(Date.now() - 864e5 * 1) },
      { from: 'matched', to: 'needs_user', at: new Date(), note: 'Platform requires user manual click on LinkedIn' },
    ],
  });

  console.log('✅ Seeded 5 applications for you@example.com');

  // ---------------------------------------------------------------------------
  // 5. Seed "Needs You" Tasks
  // ---------------------------------------------------------------------------
  await Task.create([
    {
      userId: primaryUser._id,
      applicationId: stripeJob._id,
      reason: 'unknown_question',
      message: 'Stripe — Senior Product Designer: Greenhouse form paused at question 6 of 8',
      questions: [
        {
          key: 'pacific_overlap',
          label: 'Are you able to overlap with Pacific time two days a week?',
          type: 'textarea',
          required: true,
        },
      ],
      payload: { company: 'Stripe', role: 'Senior Product Designer', ats: 'Greenhouse' },
      status: 'open',
    },
    {
      userId: primaryUser._id,
      applicationId: monzoJob._id,
      reason: 'captcha',
      message: 'Monzo — Design Systems Lead: The form showed a captcha Javi cannot solve.',
      questions: [],
      payload: { company: 'Monzo', role: 'Design Systems Lead', error: 'Captcha required' },
      status: 'open',
    },
    {
      userId: primaryUser._id,
      applicationId: figmaApp._id,
      reason: 'assisted_platform',
      message: 'Figma — Product Designer, Editor: This platform does not allow automated applying.',
      questions: [],
      payload: { company: 'Figma', role: 'Product Designer, Editor', platform: 'LinkedIn Easy Apply' },
      status: 'open',
    },
    {
      userId: primaryUser._id,
      applicationId: linearJob._id,
      reason: 'confirm_submission',
      message: 'Linear — Product Designer: Assisted draft ready to email to hiring manager.',
      questions: [],
      payload: {
        company: 'Linear',
        role: 'Product Designer',
        draft: 'Hi Karri — I have been using Linear daily for two years and led the design system at Paystack. I would love to talk about the Product Designer role...',
      },
      status: 'open',
    },
  ]);
  console.log('✅ Seeded 4 "Needs you" tasks');

  // ---------------------------------------------------------------------------
  // 6. Seed Notifications
  // ---------------------------------------------------------------------------
  await Notification.create([
    {
      userId: primaryUser._id,
      type: 'interview_invite',
      title: 'Interview invitation detected',
      body: 'Stripe recruiter emailed in Gmail requesting 30-min design intro.',
      read: false,
    },
    {
      userId: primaryUser._id,
      type: 'status_change',
      title: 'Monzo application submitted',
      body: 'Successfully applied via Lever ATS with tailored resume.',
      read: false,
    },
    {
      userId: primaryUser._id,
      type: 'new_match',
      title: 'Shopify status set to Replied',
      body: 'Candidate recruiter thread opened.',
      read: true,
    },
  ]);
  console.log('✅ Seeded notifications');

  console.log('\n======================================================');
  console.log('🎉 Database seeding complete!');
  console.log('👤 Primary User: you@example.com | Password: password123');
  console.log('👤 Zero-State User: newuser@example.com | Password: password123');
  console.log('======================================================\n');

  await disconnectDb();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface Bullet {
  id: string;
  text: string;
  skills?: string[];
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location?: string;
  start?: string;
  end?: string;
  current?: boolean;
  bullets: Bullet[];
}

export interface Education {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  grade?: string;
}

export interface Project {
  id: string;
  name: string;
  url?: string;
  description?: string;
  skills?: string[];
  bullets: Bullet[];
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  year?: string;
}

export interface Skill {
  name: string;
  years?: number;
}

export interface Link {
  label: string;
  url: string;
}

export interface LanguageSkill {
  language: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface SavedAnswer {
  key: string;
  question: string;
  answer: string;
  reusable: boolean;
  updatedAt: Date;
}

export interface CareerPage {
  url: string;
  ats: 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters' | 'workday' | 'unsupported';
  token?: string;
  addedAt: Date;
}

export interface Rules {
  dailySendCap: number;
  approvalMode: 'review' | 'auto';
  autoApproveMinScore: number;
  sendingHours: { start: number; end: number; timezone: string };
  weekdaysOnly: boolean;
  plan?: 'pro' | 'pro_max' | 'enterprise';
}

export type Period = 'hour' | 'month' | 'year';

export interface Address {
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface SalaryExpectation {
  minimum: number;
  currency: string;
  period: Period;
  negotiable: boolean;
}

export interface EeoDisclosures {
  gender?: 'male' | 'female' | 'non_binary' | 'other' | 'decline';
  raceEthnicity?: 'hispanic_latino' | 'white' | 'black_african_american' | 'asian' | 'native_american' | 'two_or_more' | 'decline';
  veteranStatus?: 'veteran' | 'not_veteran' | 'decline';
  disabilityStatus?: 'yes' | 'no' | 'decline';
}

export interface IProfile {
  userId: Types.ObjectId;
  /** draft until the user reviews the profile/parsed CV. Nothing is generated from a draft profile. */
  status: 'draft' | 'verified';
  setupStep?: number;
  /** Highest step ever reached: going Back never lowers it. */
  furthestStep?: number;
  /** Whether the user has completed profile setup. */
  isSetupCompleted?: boolean;
  setupCompleted?: boolean;

  // Personal & Contact
  firstName?: string;
  lastName?: string;
  fullName: string;
  headline?: string;
  email?: string;
  phone?: string;
  /** Telegram chat JAVI sends alerts and questions to (set when the user taps Start in the bot). */
  telegramChatId?: string;
  telegramUsername?: string;
  telegramLinkedAt?: Date;
  pronouns?: string;
  address?: Address;
  location?: string;
  avatarUrl?: string;

  // Online Presence & Socials
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  twitterUrl?: string;
  links: Link[];

  // Work Authorization & Legal Eligibility (ATS-critical)
  workAuthorization?: 'authorized' | 'not_authorized';
  requiresSponsorship?: boolean;
  futureSponsorship?: boolean;
  securityClearance?: 'none' | 'confidential' | 'secret' | 'top_secret' | 'other';
  willingToRelocate?: boolean;
  noticePeriod?: string;
  earliestStartDate?: string;

  // Target Roles & Preferences
  targetRoles: string[];
  locations: string[];
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  salaryFloor?: { amount?: number; currency: string; period: Period };
  salaryExpectation?: SalaryExpectation;
  yearsOfExperience?: number;
  inferredLevel?: string;
  validatedLevel?: string;
  industry?: string;
  specificTitle?: string;
  currentCompany?: string;
  currentTitle?: string;

  // Background, Experience & Education
  summary?: string;
  elevatorPitch?: string;
  highestEducationLevel?: 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate' | 'bootcamp' | 'self_taught';
  skills: Skill[];
  primarySkills: string[];
  secondarySkills: string[];
  toolsAndFrameworks: string[];
  languages: LanguageSkill[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];

  // Voluntary EEO Disclosures (Standard US / Global ATS)
  eeo?: EeoDisclosures;

  // Automation & Rules
  blockedCompanies: string[];
  savedJobIds: string[];
  rules: Rules;
  answerBank: SavedAnswer[];
  careerPages: CareerPage[];
  cv?: { originalName?: string; path?: string; mime?: string; uploadedAt?: Date; rawText?: string; parseWarnings?: string[] };
}

const opts = { _id: false } as const;

const bulletSchema = new Schema<Bullet>({ id: { type: String, required: true }, text: { type: String, required: true }, skills: [String] }, opts);

const experienceSchema = new Schema<Experience>(
  { id: { type: String, required: true }, company: { type: String, required: true }, title: { type: String, required: true }, location: String, start: String, end: String, current: Boolean, bullets: [bulletSchema] },
  opts,
);

const educationSchema = new Schema<Education>(
  { id: { type: String, required: true }, institution: { type: String, required: true }, degree: String, field: String, start: String, end: String, grade: String },
  opts,
);

const projectSchema = new Schema<Project>(
  { id: { type: String, required: true }, name: { type: String, required: true }, url: String, description: String, skills: [String], bullets: [bulletSchema] },
  opts,
);

const certificationSchema = new Schema<Certification>({ id: { type: String, required: true }, name: { type: String, required: true }, issuer: String, year: String }, opts);

const skillSchema = new Schema<Skill>({ name: { type: String, required: true }, years: Number }, opts);

const linkSchema = new Schema<Link>({ label: String, url: String }, opts);

const languageSkillSchema = new Schema<LanguageSkill>(
  { language: { type: String, required: true }, proficiency: { type: String, enum: ['basic', 'conversational', 'fluent', 'native'], default: 'fluent' } },
  opts,
);

const answerSchema = new Schema<SavedAnswer>({ key: String, question: String, answer: String, reusable: { type: Boolean, default: true }, updatedAt: Date }, opts);

const careerPageSchema = new Schema<CareerPage>(
  { url: String, ats: { type: String, enum: ['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'workday', 'unsupported'] }, token: String, addedAt: Date },
  opts,
);

const addressSchema = new Schema<Address>(
  { street: String, city: { type: String, required: true }, state: String, postalCode: String, country: { type: String, required: true } },
  opts,
);

const salaryExpectationSchema = new Schema<SalaryExpectation>(
  {
    minimum: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'USD' },
    period: { type: String, enum: ['hour', 'month', 'year'], default: 'year' },
    negotiable: { type: Boolean, default: true },
  },
  opts,
);

const eeoSchema = new Schema<EeoDisclosures>(
  {
    gender: { type: String, enum: ['male', 'female', 'non_binary', 'other', 'decline'], default: 'decline' },
    raceEthnicity: { type: String, enum: ['hispanic_latino', 'white', 'black_african_american', 'asian', 'native_american', 'two_or_more', 'decline'], default: 'decline' },
    veteranStatus: { type: String, enum: ['veteran', 'not_veteran', 'decline'], default: 'decline' },
    disabilityStatus: { type: String, enum: ['yes', 'no', 'decline'], default: 'decline' },
  },
  opts,
);

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['draft', 'verified'], default: 'draft' },
    setupStep: { type: Number, default: 1, min: 1, max: 9 },
    furthestStep: { type: Number, default: 1, min: 1, max: 9 },
    isSetupCompleted: { type: Boolean, default: false, index: true },
    setupCompleted: { type: Boolean, default: false, index: true },

    // Personal & Contact
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    fullName: { type: String, default: '' },
    headline: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    telegramChatId: { type: String, index: true },
    telegramUsername: String,
    telegramLinkedAt: Date,
    pronouns: String,
    address: addressSchema,
    location: String,
    avatarUrl: { type: String, default: '' },

    // Online Presence
    linkedinUrl: { type: String, default: '' },
    githubUrl: String,
    portfolioUrl: String,
    twitterUrl: String,
    links: [linkSchema],

    // Work Authorization & Legal (ATS)
    // No defaults: these answer legal questions on application forms, so an unanswered field must
    // stay unset and become a needs_user task rather than a guessed "Yes".
    workAuthorization: { type: String, enum: ['authorized', 'not_authorized'] },
    requiresSponsorship: Boolean,
    futureSponsorship: Boolean,
    securityClearance: { type: String, enum: ['none', 'confidential', 'secret', 'top_secret', 'other'] },
    willingToRelocate: Boolean,
    noticePeriod: String,
    earliestStartDate: String,

    // Target Roles & Preferences
    targetRoles: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    remotePreference: { type: String, enum: ['remote', 'hybrid', 'onsite', 'any'], default: 'any' },
    salaryFloor: {
      amount: Number,
      currency: { type: String, default: 'USD' },
      period: { type: String, enum: ['hour', 'month', 'year'], default: 'year' },
    },
    salaryExpectation: salaryExpectationSchema,
    yearsOfExperience: Number,
    inferredLevel: { type: String, default: '' },
    validatedLevel: { type: String, default: '' },
    industry: { type: String, default: '' },
    specificTitle: { type: String, default: '' },
    currentCompany: String,
    currentTitle: String,

    // Background & Skills
    summary: String,
    elevatorPitch: String,
    highestEducationLevel: {
      type: String,
      enum: ['high_school', 'associate', 'bachelor', 'master', 'doctorate', 'bootcamp', 'self_taught'],
    },
    skills: [skillSchema],
    primarySkills: { type: [String], default: [] },
    secondarySkills: { type: [String], default: [] },
    toolsAndFrameworks: { type: [String], default: [] },
    languages: [languageSkillSchema],
    experience: [experienceSchema],
    education: [educationSchema],
    projects: [projectSchema],
    certifications: [certificationSchema],

    // EEO Disclosures
    eeo: eeoSchema,

    // Automation Rules
    blockedCompanies: [String],
    savedJobIds: { type: [String], default: [] },
    rules: {
      dailySendCap: { type: Number, default: 15, min: 1, max: 50 },
      approvalMode: { type: String, enum: ['review', 'auto'], default: 'review' },
      autoApproveMinScore: { type: Number, default: 0.75 },
      sendingHours: {
        start: { type: Number, default: 8 },
        end: { type: Number, default: 18 },
        timezone: { type: String, default: 'UTC' },
      },
      weekdaysOnly: { type: Boolean, default: true },
      plan: { type: String, enum: ['pro', 'pro_max', 'enterprise'], default: 'pro' },
    },
    answerBank: [answerSchema],
    careerPages: [careerPageSchema],
    cv: { originalName: String, path: String, mime: String, uploadedAt: Date, rawText: String, parseWarnings: [String] },
  },
  { timestamps: true },
);

// Auto-populate fullName and sync setup completion flags
profileSchema.pre('save', function (next) {
  if (this.firstName && this.lastName && (!this.fullName || this.fullName.trim() === '')) {
    this.fullName = `${this.firstName.trim()} ${this.lastName.trim()}`;
  }
  if (!this.location && this.address?.city && this.address?.country) {
    this.location = `${this.address.city}, ${this.address.country}`;
  }
  if (this.status === 'verified') {
    this.isSetupCompleted = true;
    this.setupCompleted = true;
  } else if (this.isSetupCompleted || this.setupCompleted) {
    this.isSetupCompleted = true;
    this.setupCompleted = true;
    this.status = 'verified';
  }
  next();
});

export type ProfileDoc = HydratedDocument<IProfile>;
export const Profile = model<IProfile>('Profile', profileSchema);

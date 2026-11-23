/**
 * Mirrors server/src/models/profile.model.ts field for field.
 * Fields the schema defaults (strings to '', arrays to []) are required here because GET /profile
 * always returns them; everything else is optional and stays undefined until the user answers.
 */

export type Period = 'hour' | 'month' | 'year';

export interface Bullet {
  id: string;
  text: string;
  skills?: string[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location?: string;
  start?: string;
  end?: string;
  current?: boolean;
  bullets: Bullet[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  grade?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  url?: string;
  description?: string;
  skills?: string[];
  bullets: Bullet[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer?: string;
  year?: string;
}

export interface Skill {
  name: string;
  years?: number;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export type LanguageProficiency = 'basic' | 'conversational' | 'fluent' | 'native';

export interface LanguageSkill {
  language: string;
  proficiency: LanguageProficiency;
}

export interface SalaryExpectation {
  minimum: number;
  currency: string;
  period: Period;
  negotiable: boolean;
}

export interface SalaryFloor {
  amount?: number;
  currency: string;
  period: Period;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface EeoDisclosures {
  gender?: 'male' | 'female' | 'non_binary' | 'other' | 'decline';
  raceEthnicity?: 'hispanic_latino' | 'white' | 'black_african_american' | 'asian' | 'native_american' | 'two_or_more' | 'decline';
  veteranStatus?: 'veteran' | 'not_veteran' | 'decline';
  disabilityStatus?: 'yes' | 'no' | 'decline';
}

export interface Rules {
  dailySendCap: number;
  approvalMode: 'review' | 'auto';
  autoApproveMinScore: number;
  sendingHours: { start: number; end: number; timezone: string };
  weekdaysOnly: boolean;
}

export interface CareerPage {
  url: string;
  ats: 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters' | 'workday' | 'unsupported';
  token?: string;
  addedAt?: string;
}

export interface SavedAnswer {
  key: string;
  question: string;
  answer: string;
  reusable: boolean;
  updatedAt?: string;
}

/** CV metadata. The server keeps the file path and extracted text to itself. */
export interface CvMeta {
  originalName?: string;
  mime?: string;
  uploadedAt?: string;
  parseWarnings?: string[];
}

export type WorkAuthorization = 'authorized' | 'not_authorized';
export type SecurityClearance = 'none' | 'confidential' | 'secret' | 'top_secret' | 'other';
export type RemotePreference = 'remote' | 'hybrid' | 'onsite' | 'any';
export type EducationLevel = 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate' | 'bootcamp' | 'self_taught';

export interface UserProfile {
  _id?: string;
  /** Only POST /profile/verify sets 'verified'. */
  status: 'draft' | 'verified';
  setupStep?: number;

  // Personal & Contact
  firstName: string;
  lastName: string;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  pronouns?: string;
  address?: Address;
  /** Derived on the server from address when not set. */
  location?: string;
  avatarUrl: string;

  // Online Presence
  linkedinUrl: string;
  githubUrl?: string;
  portfolioUrl?: string;
  twitterUrl?: string;
  links: ProfileLink[];

  // Work Authorization & Legal (no defaults: unanswered stays unset)
  workAuthorization?: WorkAuthorization;
  requiresSponsorship?: boolean;
  futureSponsorship?: boolean;
  securityClearance?: SecurityClearance;
  willingToRelocate?: boolean;
  noticePeriod?: string;
  earliestStartDate?: string;

  // Target Roles & Preferences
  targetRoles: string[];
  locations: string[];
  remotePreference: RemotePreference;
  salaryFloor?: SalaryFloor;
  salaryExpectation?: SalaryExpectation;
  yearsOfExperience?: number;
  inferredLevel: string;
  validatedLevel: string;
  industry: string;
  specificTitle: string;
  currentCompany?: string;
  currentTitle?: string;

  // Background & Skills
  summary?: string;
  elevatorPitch?: string;
  highestEducationLevel?: EducationLevel;
  skills: Skill[];
  primarySkills: string[];
  secondarySkills: string[];
  toolsAndFrameworks: string[];
  languages: LanguageSkill[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];

  eeo?: EeoDisclosures;

  // Automation
  blockedCompanies: string[];
  rules: Rules;
  answerBank: SavedAnswer[];
  careerPages: CareerPage[];
  cv?: CvMeta;
}

export const EMPTY_PROFILE: UserProfile = {
  status: 'draft',
  setupStep: 1,
  firstName: '',
  lastName: '',
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  avatarUrl: '',
  linkedinUrl: '',
  links: [],
  targetRoles: [],
  locations: [],
  remotePreference: 'any',
  inferredLevel: '',
  validatedLevel: '',
  industry: '',
  specificTitle: '',
  skills: [],
  primarySkills: [],
  secondarySkills: [],
  toolsAndFrameworks: [],
  languages: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  blockedCompanies: [],
  rules: {
    dailySendCap: 15,
    approvalMode: 'review',
    autoApproveMinScore: 0.75,
    sendingHours: { start: 8, end: 18, timezone: 'UTC' },
    weekdaysOnly: true,
  },
  answerBank: [],
  careerPages: [],
};

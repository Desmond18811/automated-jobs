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

export interface SalaryExpectation {
  minimum: number;
  currency: string;
  period: 'hour' | 'month' | 'year';
  negotiable: boolean;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface EeoDisclosures {
  gender: 'male' | 'female' | 'non_binary' | 'other' | 'decline';
  raceEthnicity: 'hispanic_latino' | 'white' | 'black_african_american' | 'asian' | 'native_american' | 'two_or_more' | 'decline';
  veteranStatus: 'veteran' | 'not_veteran' | 'decline';
  disabilityStatus: 'yes' | 'no' | 'decline';
}

export interface UserProfile {
  // Personal & Contact
  firstName: string;
  lastName: string;
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  pronouns?: string;
  address: Address;
  location: string;

  // Online Presence & Socials
  linkedinUrl: string;
  githubUrl?: string;
  portfolioUrl?: string;
  twitterUrl?: string;

  // Work Authorization & Legal Eligibility (ATS-critical)
  workAuthorization: 'authorized' | 'not_authorized';
  requiresSponsorship: boolean;
  futureSponsorship: boolean;
  securityClearance?: 'none' | 'confidential' | 'secret' | 'top_secret' | 'other';
  willingToRelocate: boolean;
  noticePeriod: string;
  earliestStartDate?: string;

  // Target Roles & Preferences
  targetRoles: string[];
  locations: string[];
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  salaryExpectation: SalaryExpectation;
  yearsOfExperience: number;
  currentCompany?: string;
  currentTitle?: string;

  // Background, Experience & Education
  summary: string;
  elevatorPitch?: string;
  highestEducationLevel: 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate' | 'bootcamp' | 'self_taught';
  primarySkills: string[];
  secondarySkills: string[];
  toolsAndFrameworks: string[];
  experience: ExperienceItem[];
  education: EducationItem[];

  // Voluntary EEO Disclosures
  eeo: EeoDisclosures;
}

export const DEFAULT_PROFILE: UserProfile = {
  firstName: 'Ada',
  lastName: 'Okafor',
  fullName: 'Ada Okafor',
  headline: 'Product Designer & Design Systems Lead',
  email: 'ada.okafor@example.com',
  phone: '+234 803 123 4567',
  pronouns: 'she/her',
  address: {
    street: '14 Admiralty Way, Lekki Phase 1',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '105102',
    country: 'Nigeria',
  },
  location: 'Lagos, Nigeria (Open to Remote / Relocation)',

  linkedinUrl: 'https://linkedin.com/in/ada-okafor-design',
  githubUrl: 'https://github.com/adaokafor',
  portfolioUrl: 'https://adaokafor.design',
  twitterUrl: 'https://x.com/ada_design',

  workAuthorization: 'authorized',
  requiresSponsorship: false,
  futureSponsorship: false,
  securityClearance: 'none',
  willingToRelocate: true,
  noticePeriod: '2 weeks',
  earliestStartDate: '2026-12-01',

  targetRoles: ['Senior Product Designer', 'Design Systems Lead', 'Staff UX/UI Designer'],
  locations: ['Remote worldwide', 'United States (Remote)', 'United Kingdom (Remote)', 'Lagos'],
  remotePreference: 'remote',
  salaryExpectation: {
    minimum: 120000,
    currency: 'USD',
    period: 'year',
    negotiable: true,
  },
  yearsOfExperience: 6,
  currentCompany: 'Paystack',
  currentTitle: 'Product Designer',

  summary:
    'Product Designer with 6+ years designing scalable fintech systems, mobile interfaces, and user checkout experiences. Passionate about design ops, micro-interactions, and accessible cross-platform products.',
  elevatorPitch:
    'I help high-growth fintech and SaaS platforms scale user activation and design systems from zero to millions of daily users.',
  highestEducationLevel: 'bachelor',
  primarySkills: ['Product Design', 'Figma', 'Design Systems', 'UX Research', 'Interaction Design'],
  secondarySkills: ['Design Tokens', 'Prototyping', 'User Testing', 'WCAG Accessibility', 'Information Architecture'],
  toolsAndFrameworks: ['Figma', 'FigJam', 'Miro', 'Principle', 'Webflow', 'Linear', 'Notion'],
  experience: [
    {
      id: 'exp-1',
      company: 'Paystack',
      title: 'Product Designer',
      location: 'Lagos, Nigeria · Hybrid',
      start: '2022-03',
      current: true,
      bullets: [
        { id: 'b1', text: 'Redesigned core merchant onboarding and checkout checkout flows, boosting completion rate by 18%.' },
        { id: 'b2', text: 'Authored and maintained Paystack Design System tokens across web and mobile surfaces.' },
      ],
    },
    {
      id: 'exp-2',
      company: 'Flutterwave',
      title: 'UI Designer',
      location: 'Lagos, Nigeria',
      start: '2019-06',
      end: '2022-02',
      current: false,
      bullets: [
        { id: 'b3', text: 'Designed responsive payment web experiences used across 12 African markets.' },
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Lagos',
      degree: 'B.Sc. Computer Science & Human Computer Interaction',
      field: 'Computer Science',
      start: '2015',
      end: '2019',
      grade: 'First Class Honours',
    },
  ],
  eeo: {
    gender: 'female',
    raceEthnicity: 'black_african_american',
    veteranStatus: 'not_veteran',
    disabilityStatus: 'no',
  },
};

import { AVATAR_ANGELICA } from '@/assets/avatars';

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
  avatarUrl?: string;

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

export const EMPTY_PROFILE: UserProfile = {
  firstName: '',
  lastName: '',
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  pronouns: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  },
  location: '',

  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  twitterUrl: '',

  workAuthorization: 'authorized',
  requiresSponsorship: false,
  futureSponsorship: false,
  securityClearance: 'none',
  willingToRelocate: false,
  noticePeriod: '',
  earliestStartDate: '',

  targetRoles: [],
  locations: [],
  remotePreference: 'remote',
  salaryExpectation: {
    minimum: 0,
    currency: 'USD',
    period: 'year',
    negotiable: true,
  },
  yearsOfExperience: 0,
  currentCompany: '',
  currentTitle: '',

  summary: '',
  elevatorPitch: '',
  highestEducationLevel: 'bachelor',
  primarySkills: [],
  secondarySkills: [],
  toolsAndFrameworks: [],
  experience: [],
  education: [],

  eeo: {
    gender: 'decline',
    raceEthnicity: 'decline',
    veteranStatus: 'decline',
    disabilityStatus: 'decline',
  },
};

export const DEFAULT_PROFILE: UserProfile = {
  firstName: 'Angelica',
  lastName: 'Greeze',
  fullName: 'Angelica Greeze',
  headline: 'UI / UX Designer',
  email: 'angelica.greeze@javi.ai',
  phone: '+1 (555) 234-5678',
  pronouns: 'she/her',
  avatarUrl: AVATAR_ANGELICA,
  address: {
    street: '124 Design Blvd',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'United States',
  },
  location: 'New York, NY (Open to Remote / Relocation)',

  linkedinUrl: 'https://linkedin.com/in/angelica-greeze-design',
  githubUrl: 'https://github.com/angelicagreeze',
  portfolioUrl: 'https://angelicagreeze.design',
  twitterUrl: 'https://x.com/angelica_design',

  workAuthorization: 'authorized',
  requiresSponsorship: false,
  futureSponsorship: false,
  securityClearance: 'none',
  willingToRelocate: true,
  noticePeriod: 'Available For Work',
  earliestStartDate: 'Immediately',

  targetRoles: ['UI / UX Designer', 'UI Designer', 'Product Designer'],
  locations: ['Remote', 'New York, NY', 'San Francisco, CA', 'London, UK'],
  remotePreference: 'remote',
  salaryExpectation: {
    minimum: 115000,
    currency: 'USD',
    period: 'year',
    negotiable: true,
  },
  yearsOfExperience: 5,
  currentCompany: 'Ideologist Team',
  currentTitle: 'UI / UX Designer',

  summary:
    'Creative UI / UX Designer passionate about building intuitive digital systems, design libraries, and user experiences across web and mobile platforms.',
  elevatorPitch:
    'I help design high-impact user experiences, design systems, and delightful digital interfaces.',
  highestEducationLevel: 'bachelor',
  primarySkills: ['UI', 'Ux', 'Website Design', 'Mobile Design', 'Research', 'Interaction'],
  secondarySkills: ['Figma', 'Prototyping', 'Design Systems', 'User Testing', 'Wireframing'],
  toolsAndFrameworks: ['Figma', 'Adobe XD', 'Sketch', 'Principle', 'HTML/CSS'],
  experience: [
    {
      id: 'exp-1',
      company: 'Ideologist Team',
      title: 'UI / UX Designer',
      location: 'Remote',
      start: 'Jan 2022',
      end: 'Present',
      current: true,
      bullets: [
        { id: 'b1', text: 'Lead design systems and UX architecture for next-gen digital platforms.' },
        { id: 'b2', text: 'Designed high-conversion web flows and cross-platform mobile interfaces.' },
      ],
    },
    {
      id: 'exp-2',
      company: 'Tigabatang',
      title: 'UI Designer',
      location: 'Fulltime',
      start: 'Jan 2022',
      end: 'Present',
      current: false,
      bullets: [
        { id: 'b3', text: 'Created modular UI components, icons, and interactive prototypes.' },
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Oxford University',
      degree: 'Student - Software Engienering',
      field: 'Software Engineering',
      start: '2018',
      end: '2021',
      grade: 'First Class',
    },
    {
      id: 'edu-2',
      institution: 'Oxford Vocational High School',
      degree: 'Student - Software Engienering',
      field: 'Software Engineering',
      start: '2015',
      end: '2015',
    },
  ],
  eeo: {
    gender: 'female',
    raceEthnicity: 'black_african_american',
    veteranStatus: 'not_veteran',
    disabilityStatus: 'no',
  },
};

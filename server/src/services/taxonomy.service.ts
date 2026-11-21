import { TaxonomyRequest } from '../models/taxonomyRequest.model';
import { POPULAR_SKILL_KEYWORDS } from './documents/cvParser';
import { SKILL_TERMS } from '../matching/skills';

export interface TaxonomyRole {
  id: string;
  name: string;
  category: string;
  slug: string;
  commonHeadlines: string[];
  recommendedSkills: string[];
}

export interface TaxonomyIndustry {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface TaxonomyLocation {
  id: string;
  region: 'Nigeria' | 'Africa' | 'Europe' | 'North America' | 'Remote';
  name: string;
  country: string;
}

export interface TaxonomySkill {
  id: string;
  name: string;
  category: SkillCategory;
  aliases: string[];
}

export type SkillCategory =
  | 'Languages'
  | 'Frontend'
  | 'Backend'
  | 'Mobile'
  | 'Data & AI'
  | 'Cloud & DevOps'
  | 'Databases'
  | 'Testing & QA'
  | 'Security'
  | 'Design'
  | 'Product & Process'
  | 'Other';

// ── Master Role Taxonomy ───────────────────────────────────────────────────────
export const ROLES_TAXONOMY: TaxonomyRole[] = [
  // Product Design & UX
  {
    id: 'role-prod-designer',
    name: 'Product Designer',
    category: 'Product Design & UX',
    slug: 'product-designer',
    commonHeadlines: [
      'Product Designer | Mobile & Web Apps',
      'Senior Product Designer | Fintech & Design Systems',
      'Lead Product Designer | B2B SaaS & Growth',
    ],
    recommendedSkills: [
      'Figma',
      'Design Systems',
      'UI & UX Design',
      'Prototyping',
      'Wireframing',
      'User Research',
      'Information Architecture',
      'Micro-interactions',
      'Interaction Design',
      'Usability Testing',
      'Mobile App UX',
      'Design Tokens',
      'Framer',
    ],
  },
  {
    id: 'role-ui-ux-designer',
    name: 'UI/UX Designer',
    category: 'Product Design & UX',
    slug: 'ui-ux-designer',
    commonHeadlines: [
      'UI/UX Designer | High-Conversion Interfaces',
      'Visual & Interaction Designer | Consumer Products',
    ],
    recommendedSkills: [
      'Figma',
      'UI & UX Design',
      'Design Systems',
      'Adobe XD',
      'Wireframing',
      'Visual Design',
      'Typography & Color Theory',
      'User Flows',
      'Accessibility (WCAG)',
    ],
  },
  {
    id: 'role-design-systems-lead',
    name: 'Design Systems Lead / Engineer',
    category: 'Product Design & UX',
    slug: 'design-systems-lead',
    commonHeadlines: [
      'Staff Design Systems Lead | Multi-Platform Component Libraries',
      'Design Systems Architect | Figma to React Tokens',
    ],
    recommendedSkills: [
      'Design Systems',
      'Figma Tokens',
      'Component Architecture',
      'Tailwind CSS',
      'Storybook',
      'Design Tokens',
      'React UI Kit',
      'Accessibility (WCAG)',
      'Documentation',
    ],
  },
  {
    id: 'role-ux-researcher',
    name: 'UX Researcher',
    category: 'Product Design & UX',
    slug: 'ux-researcher',
    commonHeadlines: [
      'Senior UX Researcher | Qualitative & Quantitative Studies',
      'User Research Specialist | Emerging Markets & Fintech',
    ],
    recommendedSkills: [
      'User Research',
      'Usability Testing',
      'User Interviews',
      'Personas & Journey Mapping',
      'Card Sorting',
      'A/B Testing',
      'Survey Design',
      'Competitive Analysis',
      'Miro',
    ],
  },

  // Frontend Engineering
  {
    id: 'role-frontend-eng',
    name: 'Frontend Engineer',
    category: 'Frontend Engineering',
    slug: 'frontend-engineer',
    commonHeadlines: [
      'Senior Frontend Engineer | React, TypeScript & Next.js',
      'Frontend Developer | Modern Web Performance & Microfrontends',
      'Lead Frontend Architect | Scalable Web Applications',
    ],
    recommendedSkills: [
      'React',
      'TypeScript',
      'Next.js',
      'JavaScript (ES6+)',
      'Tailwind CSS',
      'HTML5 & CSS3',
      'State Management (Zustand/Redux)',
      'REST APIs',
      'GraphQL',
      'Web Performance & Core Web Vitals',
      'Git & GitHub',
      'Jest / Vitest',
      'Responsive Web Design',
    ],
  },
  {
    id: 'role-react-dev',
    name: 'React / Next.js Specialist',
    category: 'Frontend Engineering',
    slug: 'react-nextjs-specialist',
    commonHeadlines: [
      'React & Next.js Developer | SSR, ISR & Server Components',
      'Frontend Specialist | Interactive Dashboards & Realtime UI',
    ],
    recommendedSkills: [
      'React',
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'React Server Components',
      'TanStack Query',
      'Zustand',
      'Vite',
      'WebSockets',
      'Radix UI / Shadcn',
    ],
  },

  // Backend & Distributed Systems
  {
    id: 'role-backend-eng',
    name: 'Backend Engineer',
    category: 'Backend & Systems',
    slug: 'backend-engineer',
    commonHeadlines: [
      'Senior Backend Engineer | Node.js, Go & Distributed Microservices',
      'Backend Systems Architect | High-Throughput Financial APIs',
      'Software Engineer - Backend | Python, PostgreSQL & AWS',
    ],
    recommendedSkills: [
      'Node.js',
      'TypeScript',
      'Go (Golang)',
      'Python',
      'PostgreSQL',
      'MongoDB',
      'Redis',
      'REST APIs',
      'GraphQL',
      'Microservices Architecture',
      'Docker',
      'Message Queues (Kafka / RabbitMQ)',
      'SQL Query Optimization',
      'AWS / Cloud Services',
    ],
  },
  {
    id: 'role-golang-eng',
    name: 'Go / Golang Engineer',
    category: 'Backend & Systems',
    slug: 'golang-engineer',
    commonHeadlines: [
      'Golang Backend Engineer | Distributed Systems & Concurrency',
      'Go Systems Engineer | High-Performance Payment Gateways',
    ],
    recommendedSkills: [
      'Go (Golang)',
      'Concurrency & Goroutines',
      'gRPC & Protocol Buffers',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Kubernetes',
      'Kafka',
      'Distributed Tracing',
    ],
  },
  {
    id: 'role-python-eng',
    name: 'Python / Django / FastAPI Developer',
    category: 'Backend & Systems',
    slug: 'python-engineer',
    commonHeadlines: [
      'Python Backend Developer | FastAPI, Celery & PostgreSQL',
      'Senior Python Engineer | Scalable APIs & Data Pipelines',
    ],
    recommendedSkills: [
      'Python',
      'FastAPI',
      'Django',
      'PostgreSQL',
      'Celery & Redis',
      'SQLAlchemy',
      'Docker',
      'REST APIs',
      'PyTest',
      'AWS Lambda',
    ],
  },

  // Full-Stack Engineering
  {
    id: 'role-fullstack-eng',
    name: 'Full-Stack Engineer',
    category: 'Full-Stack Development',
    slug: 'full-stack-engineer',
    commonHeadlines: [
      'Senior Full-Stack Engineer | TypeScript, Next.js, Node.js & PostgreSQL',
      'Full-Stack Developer | Building Scalable Web Products',
      'Product Engineer (Full-Stack) | 0 to 1 SaaS Platforms',
    ],
    recommendedSkills: [
      'React',
      'TypeScript',
      'Next.js',
      'Node.js',
      'Express / NestJS',
      'PostgreSQL',
      'Prisma / Drizzle ORM',
      'Tailwind CSS',
      'REST APIs',
      'GraphQL',
      'Docker',
      'AWS',
      'Git & CI/CD',
    ],
  },

  // Mobile Engineering
  {
    id: 'role-mobile-eng',
    name: 'Mobile Engineer (Flutter / React Native)',
    category: 'Mobile Development',
    slug: 'mobile-engineer',
    commonHeadlines: [
      'Senior Mobile Engineer | Flutter & Cross-Platform iOS/Android',
      'React Native Developer | High-Performance Consumer Mobile Apps',
    ],
    recommendedSkills: [
      'Flutter & Dart',
      'React Native',
      'TypeScript',
      'iOS & Android Architecture',
      'State Management (Bloc / Riverpod)',
      'Offline-First Sync',
      'Push Notifications (FCM)',
      'REST & GraphQL APIs',
      'App Store / Play Store Deployment',
    ],
  },
  {
    id: 'role-ios-eng',
    name: 'iOS Developer (Swift / SwiftUI)',
    category: 'Mobile Development',
    slug: 'ios-developer',
    commonHeadlines: [
      'Senior iOS Engineer | Swift, SwiftUI & Clean Architecture',
      'iOS Developer | Fintech & Native Core Bluetooth',
    ],
    recommendedSkills: [
      'Swift',
      'SwiftUI',
      'Combine & Concurrency',
      'UIKit',
      'CoreData',
      'RESTful APIs',
      'Unit & UI Testing',
      'CI/CD (Fastlane)',
    ],
  },
  {
    id: 'role-android-eng',
    name: 'Android Developer (Kotlin)',
    category: 'Mobile Development',
    slug: 'android-developer',
    commonHeadlines: [
      'Senior Android Developer | Kotlin, Jetpack Compose & Coroutines',
      'Android Engineer | Clean Architecture & Offline Storage',
    ],
    recommendedSkills: [
      'Kotlin',
      'Jetpack Compose',
      'Coroutines & Flow',
      'Android SDK',
      'Room Database',
      'Retrofit',
      'Dependency Injection (Hilt)',
      'Unit Testing',
    ],
  },

  // DevOps, Cloud & SRE
  {
    id: 'role-devops-eng',
    name: 'DevOps & Cloud Engineer',
    category: 'DevOps & Cloud',
    slug: 'devops-engineer',
    commonHeadlines: [
      'Senior DevOps Engineer | AWS, Terraform & Kubernetes',
      'Cloud Infrastructure Engineer | CI/CD Automation & Security',
      'DevOps Architect | High-Availability Distributed Systems',
    ],
    recommendedSkills: [
      'AWS',
      'Docker',
      'Kubernetes',
      'Terraform (IaC)',
      'CI/CD (GitHub Actions / GitLab CI)',
      'Linux Administration',
      'Prometheus & Grafana',
      'Nginx',
      'Bash / Shell Scripting',
      'Helm',
      'Cloud Security & IAM',
    ],
  },
  {
    id: 'role-sre',
    name: 'Site Reliability Engineer (SRE)',
    category: 'DevOps & Cloud',
    slug: 'site-reliability-engineer',
    commonHeadlines: [
      'Site Reliability Engineer (SRE) | Observability & Incident Response',
      'Staff SRE | 99.99% SLA Distributed Platforms',
    ],
    recommendedSkills: [
      'Kubernetes',
      'Observability (Prometheus/Datadog)',
      'Go / Python',
      'Linux Internals',
      'Disaster Recovery & SLOs',
      'Terraform',
      'Networking & Load Balancing',
      'Incident Management',
    ],
  },

  // AI, Data & Machine Learning
  {
    id: 'role-data-eng',
    name: 'Data Engineer',
    category: 'Data & Artificial Intelligence',
    slug: 'data-engineer',
    commonHeadlines: [
      'Senior Data Engineer | Snowflake, dbt, Spark & Python',
      'Data Platform Engineer | Realtime Streaming & Warehouses',
    ],
    recommendedSkills: [
      'Python',
      'SQL',
      'dbt',
      'Snowflake',
      'Apache Spark',
      'Apache Airflow',
      'Kafka',
      'Data Modeling',
      'AWS / BigQuery',
      'ETL / ELT Pipelines',
    ],
  },
  {
    id: 'role-ai-ml-eng',
    name: 'AI & Machine Learning Engineer',
    category: 'Data & Artificial Intelligence',
    slug: 'ai-ml-engineer',
    commonHeadlines: [
      'Machine Learning Engineer | LLMs, Fine-Tuning & RAG Systems',
      'Applied AI Engineer | LangChain, PyTorch & Vector Databases',
    ],
    recommendedSkills: [
      'Python',
      'PyTorch',
      'TensorFlow',
      'Large Language Models (LLMs)',
      'LangChain / LlamaIndex',
      'RAG & Vector Search (Pinecone/Chroma)',
      'Prompt Engineering',
      'FastAPI',
      'Hugging Face',
      'Docker',
    ],
  },
  {
    id: 'role-data-scientist',
    name: 'Data Scientist & Analytics Specialist',
    category: 'Data & Artificial Intelligence',
    slug: 'data-scientist',
    commonHeadlines: [
      'Senior Data Scientist | Predictive Modeling & Product Analytics',
      'Data Analyst / Scientist | Business Intelligence & Growth',
    ],
    recommendedSkills: [
      'Python',
      'SQL',
      'Pandas & NumPy',
      'Statistical Analysis',
      'A/B Testing & Experimentation',
      'Data Visualization (Tableau/Metabase)',
      'Machine Learning Algorithms',
      'Business Intelligence',
    ],
  },

  // Product Management & Strategy
  {
    id: 'role-prod-manager',
    name: 'Product Manager',
    category: 'Product Management',
    slug: 'product-manager',
    commonHeadlines: [
      'Senior Product Manager | Fintech Payments & Digital Banking',
      'Product Lead | B2B SaaS & Enterprise Platforms',
      'Growth Product Manager | Onboarding & Funnel Conversion',
    ],
    recommendedSkills: [
      'Product Strategy',
      'Roadmap Planning',
      'User Stories & PRDs',
      'Agile / Scrum',
      'Product Analytics (Mixpanel/Amplitude)',
      'User Research & Discovery',
      'A/B Testing',
      'Stakeholder Management',
      'Go-To-Market (GTM)',
      'Cross-Functional Leadership',
    ],
  },
  {
    id: 'role-tech-pm',
    name: 'Technical Product Manager',
    category: 'Product Management',
    slug: 'technical-product-manager',
    commonHeadlines: [
      'Technical Product Manager | Developer APIs & Core Infrastructure',
      'TPM | Platform Scale & Microservices Strategy',
    ],
    recommendedSkills: [
      'API Design & Architecture',
      'Technical Specs & RFCs',
      'Developer Experience (DX)',
      'Agile Frameworks',
      'SQL & Data Analysis',
      'System Architecture Understanding',
      'Sprint Planning',
    ],
  },

  // Security & QA
  {
    id: 'role-qa-eng',
    name: 'QA Automation Engineer',
    category: 'Quality & Cybersecurity',
    slug: 'qa-automation-engineer',
    commonHeadlines: [
      'Senior QA Automation Engineer | Cypress, Playwright & CI/CD',
      'SDET | End-to-End Test Frameworks & Performance Testing',
    ],
    recommendedSkills: [
      'Cypress',
      'Playwright',
      'Selenium',
      'TypeScript / JavaScript',
      'Python / PyTest',
      'API Testing (Postman/Newman)',
      'CI/CD Test Integration',
      'Performance Testing (k6)',
      'Bug Tracking & Test Plans',
    ],
  },
  {
    id: 'role-security-eng',
    name: 'Cybersecurity & AppSec Engineer',
    category: 'Quality & Cybersecurity',
    slug: 'cybersecurity-engineer',
    commonHeadlines: [
      'Application Security Engineer | Penetration Testing & OWASP',
      'Information Security Specialist | Cloud Hardening & Compliance',
    ],
    recommendedSkills: [
      'OWASP Top 10',
      'Penetration Testing',
      'Vulnerability Scanning',
      'Cloud Security (AWS IAM)',
      'Network Security',
      'Threat Modeling',
      'SOC2 / ISO 27001 Compliance',
      'Cryptography Fundamentals',
    ],
  },
];

// ── Master Industry Taxonomy ───────────────────────────────────────────────────
export const INDUSTRIES_TAXONOMY: TaxonomyIndustry[] = [
  { id: 'ind-fintech', name: 'FinTech & Digital Banking', slug: 'fintech', description: 'Payments, digital lending, wallets, wealth management, open banking' },
  { id: 'ind-healthtech', name: 'HealthTech & Life Sciences', slug: 'healthtech', description: 'Telemedicine, EHR systems, pharmacy delivery, health diagnostics' },
  { id: 'ind-edtech', name: 'EdTech & Online Learning', slug: 'edtech', description: 'E-learning platforms, assessment tools, student management systems' },
  { id: 'ind-ecommerce', name: 'E-Commerce & Digital Retail', slug: 'ecommerce', description: 'Direct-to-consumer, marketplaces, inventory & checkout infrastructure' },
  { id: 'ind-logistics', name: 'Logistics, Supply Chain & Mobility', slug: 'logistics', description: 'Freight tracking, last-mile delivery, ride-hailing, fleet management' },
  { id: 'ind-saas', name: 'SaaS & Enterprise Cloud Software', slug: 'saas', description: 'B2B workflow automation, CRM, collaboration tools, productivity' },
  { id: 'ind-ai', name: 'Artificial Intelligence & Machine Learning', slug: 'ai-ml', description: 'Generative AI products, computer vision, NLP, agent automation' },
  { id: 'ind-web3', name: 'Web3, Blockchain & Digital Assets', slug: 'web3', description: 'Smart contracts, crypto protocols, custody, decentralised finance' },
  { id: 'ind-cleantech', name: 'CleanTech & Renewable Energy', slug: 'cleantech', description: 'Solar systems, energy distribution, carbon accounting, sustainability' },
  { id: 'ind-telecom', name: 'Telecommunications & Infrastructure', slug: 'telecom', description: 'Broadband, ISP infrastructure, mobile networks, SMS & voice gateways' },
  { id: 'ind-proptech', name: 'PropTech & Real Estate Technology', slug: 'proptech', description: 'Property management, mortgage tech, digital leasing platforms' },
  { id: 'ind-media', name: 'Media, Streaming & Entertainment', slug: 'media', description: 'Content streaming, digital publishing, creator economy, gaming' },
  { id: 'ind-govtech', name: 'GovTech & Public Sector Solutions', slug: 'govtech', description: 'Civic tech, digital identity, public service delivery, tax systems' },
  { id: 'ind-security', name: 'Cybersecurity & Risk Intelligence', slug: 'cybersecurity', description: 'Fraud detection, identity verification, enterprise security defense' },
];

// ── Master Location Taxonomy (Expanded for Nigeria, Africa, and Global) ────────
export const LOCATIONS_TAXONOMY: TaxonomyLocation[] = [
  // Nigeria - Major Tech Hubs & Commercial Centers
  { id: 'loc-lagos', region: 'Nigeria', name: 'Lagos, Nigeria', country: 'Nigeria' },
  { id: 'loc-abuja', region: 'Nigeria', name: 'Abuja, Nigeria', country: 'Nigeria' },
  { id: 'loc-ph', region: 'Nigeria', name: 'Port Harcourt, Rivers State, Nigeria', country: 'Nigeria' },
  { id: 'loc-ibadan', region: 'Nigeria', name: 'Ibadan, Oyo State, Nigeria', country: 'Nigeria' },
  { id: 'loc-enugu', region: 'Nigeria', name: 'Enugu, Enugu State, Nigeria', country: 'Nigeria' },
  { id: 'loc-kano', region: 'Nigeria', name: 'Kano, Kano State, Nigeria', country: 'Nigeria' },
  { id: 'loc-abeokuta', region: 'Nigeria', name: 'Abeokuta, Ogun State, Nigeria', country: 'Nigeria' },
  { id: 'loc-benin', region: 'Nigeria', name: 'Benin City, Edo State, Nigeria', country: 'Nigeria' },
  { id: 'loc-calabar', region: 'Nigeria', name: 'Calabar, Cross River, Nigeria', country: 'Nigeria' },
  { id: 'loc-kaduna', region: 'Nigeria', name: 'Kaduna, Kaduna State, Nigeria', country: 'Nigeria' },
  { id: 'loc-ilorin', region: 'Nigeria', name: 'Ilorin, Kwara State, Nigeria', country: 'Nigeria' },
  { id: 'loc-jos', region: 'Nigeria', name: 'Jos, Plateau State, Nigeria', country: 'Nigeria' },
  { id: 'loc-asaba', region: 'Nigeria', name: 'Asaba / Warri, Delta State, Nigeria', country: 'Nigeria' },
  { id: 'loc-owerri', region: 'Nigeria', name: 'Owerri, Imo State, Nigeria', country: 'Nigeria' },
  { id: 'loc-uyo', region: 'Nigeria', name: 'Uyo, Akwa Ibom, Nigeria', country: 'Nigeria' },

  // Rest of Africa - Innovation Hubs
  { id: 'loc-accra', region: 'Africa', name: 'Accra, Ghana', country: 'Ghana' },
  { id: 'loc-nairobi', region: 'Africa', name: 'Nairobi, Kenya', country: 'Kenya' },
  { id: 'loc-kigali', region: 'Africa', name: 'Kigali, Rwanda', country: 'Rwanda' },
  { id: 'loc-joburg', region: 'Africa', name: 'Johannesburg, South Africa', country: 'South Africa' },
  { id: 'loc-capetown', region: 'Africa', name: 'Cape Town, South Africa', country: 'South Africa' },
  { id: 'loc-cairo', region: 'Africa', name: 'Cairo, Egypt', country: 'Egypt' },
  { id: 'loc-casablanca', region: 'Africa', name: 'Casablanca, Morocco', country: 'Morocco' },

  // United Kingdom & Europe
  { id: 'loc-london', region: 'Europe', name: 'London, United Kingdom', country: 'United Kingdom' },
  { id: 'loc-manchester', region: 'Europe', name: 'Manchester, United Kingdom', country: 'United Kingdom' },
  { id: 'loc-berlin', region: 'Europe', name: 'Berlin, Germany', country: 'Germany' },
  { id: 'loc-amsterdam', region: 'Europe', name: 'Amsterdam, Netherlands', country: 'Netherlands' },
  { id: 'loc-dublin', region: 'Europe', name: 'Dublin, Ireland', country: 'Ireland' },
  { id: 'loc-paris', region: 'Europe', name: 'Paris, France', country: 'France' },
  { id: 'loc-stockholm', region: 'Europe', name: 'Stockholm, Sweden', country: 'Sweden' },
  { id: 'loc-zurich', region: 'Europe', name: 'Zurich, Switzerland', country: 'Switzerland' },
  { id: 'loc-tallinn', region: 'Europe', name: 'Tallinn, Estonia', country: 'Estonia' },

  // North America
  { id: 'loc-nyc', region: 'North America', name: 'New York, NY, United States', country: 'United States' },
  { id: 'loc-sf', region: 'North America', name: 'San Francisco Bay Area, CA, United States', country: 'United States' },
  { id: 'loc-seattle', region: 'North America', name: 'Seattle, WA, United States', country: 'United States' },
  { id: 'loc-austin', region: 'North America', name: 'Austin, TX, United States', country: 'United States' },
  { id: 'loc-boston', region: 'North America', name: 'Boston, MA, United States', country: 'United States' },
  { id: 'loc-toronto', region: 'North America', name: 'Toronto, ON, Canada', country: 'Canada' },
  { id: 'loc-vancouver', region: 'North America', name: 'Vancouver, BC, Canada', country: 'Canada' },
  { id: 'loc-montreal', region: 'North America', name: 'Montreal, QC, Canada', country: 'Canada' },

  // Dedicated Remote Categories
  { id: 'loc-remote-nigeria', region: 'Remote', name: 'Remote (Nigeria & West Africa)', country: 'Remote' },
  { id: 'loc-remote-africa', region: 'Remote', name: 'Remote (Pan-Africa)', country: 'Remote' },
  { id: 'loc-remote-emea', region: 'Remote', name: 'Remote (Europe / UK / EMEA Timezones)', country: 'Remote' },
  { id: 'loc-remote-us', region: 'Remote', name: 'Remote (US / Americas Timezones)', country: 'Remote' },
  { id: 'loc-remote-global', region: 'Remote', name: 'Remote (Global / Worldwide - Any Timezone)', country: 'Remote' },
];

// ── Skill Catalog ─────────────────────────────────────────────────────────────
// Built once from every skill list the backend already knows about: role recommendations, the
// CV parser's keyword list and the fact-guard terms. Deduped by lowercase name.

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Languages', 'Frontend', 'Backend', 'Mobile', 'Data & AI', 'Cloud & DevOps',
  'Databases', 'Testing & QA', 'Security', 'Design', 'Product & Process', 'Other',
];

const CATEGORY_RULES: Array<[SkillCategory, RegExp]> = [
  ['Testing & QA', /\b(test|testing|cypress|playwright|selenium|jest|pytest|qa)\b/i],
  ['Security', /(secur|owasp|penetration|siem|soar|splunk|wazuh|sentinel|qradar|crowdstrike|nmap|burp|metasploit|wireshark|iso 27001|nist|pci|soc 2|cissp|oscp|ceh|ccna|threat|incident|malware|forensic|vulnerab|iam)/i],
  ['Databases', /(sql|postgres|mongo|redis|elasticsearch|database|prisma|drizzle|snowflake|supabase|firebase|room)/i],
  ['Cloud & DevOps', /(aws|azure|gcp|docker|kubernetes|terraform|ansible|ci\/cd|github actions|jenkins|linux|nginx|prometheus|grafana|vercel|serverless|lambda|cloud|devops|iac)/i],
  ['Data & AI', /(machine learning|\bml\b|\bai\b|artificial|llm|prompt|langchain|pytorch|tensorflow|pandas|scikit|data|dbt|etl|rag|vector|power bi|tableau|analytics)/i],
  ['Mobile', /(flutter|react native|swift|uikit|kotlin|jetpack|android|ios|mobile|combine|coroutines)/i],
  ['Design', /(figma|design|ux|ui\b|prototyp|wirefram|interaction|accessibility|wcag|framer|usability|user research|visual|information architecture)/i],
  ['Product & Process', /(product|roadmap|agile|scrum|user stor|prd|a\/b|mixpanel|amplitude|stakeholder|okr)/i],
  ['Frontend', /(react|next\.js|vue|angular|svelte|tailwind|html|css|redux|zustand|vite|storybook|frontend|ssr)/i],
  ['Backend', /(node|express|nestjs|django|flask|fastapi|spring|laravel|rails|graphql|rest api|grpc|kafka|rabbitmq|bullmq|socket\.io|webrtc|livekit|\.net|webhook|api)/i],
  ['Languages', /^(javascript|typescript|python|java|go \(golang\)|golang|rust|c#|c\+\+|php|ruby|scala|dart)$/i],
];

function categorize(name: string): SkillCategory {
  // Plain programming languages first, so "Python" isn't filed under Data & AI.
  const lang = CATEGORY_RULES.find(([c]) => c === 'Languages')![1];
  if (lang.test(name)) return 'Languages';
  for (const [cat, re] of CATEGORY_RULES) if (re.test(name)) return cat;
  return 'Other';
}

/** Title-case a lowercase fact-guard term unless a nicer spelling already exists. */
function prettify(term: string): string {
  const special: Record<string, string> = {
    'next.js': 'Next.js', 'node.js': 'Node.js', 'socket.io': 'Socket.IO', 'ci/cd': 'CI/CD', aws: 'AWS', gcp: 'GCP',
    sql: 'SQL', 'c#': 'C#', 'c++': 'C++', php: 'PHP', siem: 'SIEM', soar: 'SOAR', ceh: 'CEH', ccna: 'CCNA',
    cissp: 'CISSP', oscp: 'OSCP', 'soc 2': 'SOC 2', 'pci dss': 'PCI DSS', 'nist csf': 'NIST CSF', 'iso 27001': 'ISO 27001',
    'comptia security+': 'CompTIA Security+', graphql: 'GraphQL', mongodb: 'MongoDB', postgresql: 'PostgreSQL',
    mysql: 'MySQL', nestjs: 'NestJS', fastapi: 'FastAPI', bullmq: 'BullMQ', webrtc: 'WebRTC', livekit: 'LiveKit',
    pytorch: 'PyTorch', tensorflow: 'TensorFlow', 'scikit-learn': 'scikit-learn', 'power bi': 'Power BI',
    golang: 'Go (Golang)', 'github actions': 'GitHub Actions',
  };
  return special[term] ?? term.replace(/\b\w/g, (c) => c.toUpperCase());
}

const ALIASES: Record<string, string[]> = {
  'go (golang)': ['go', 'golang'],
  'javascript': ['js', 'es6'],
  'typescript': ['ts'],
  'node.js': ['node', 'nodejs'],
  'next.js': ['next', 'nextjs'],
  'kubernetes': ['k8s'],
  'postgresql': ['postgres', 'psql'],
  'react': ['reactjs', 'react.js'],
  'ui & ux design': ['ui', 'ux', 'ui/ux'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  'large language models (llms)': ['llm', 'llms', 'gpt'],
  'terraform (iac)': ['terraform', 'iac'],
};

export const SKILLS_TAXONOMY: TaxonomySkill[] = (() => {
  const seen = new Map<string, TaxonomySkill>();
  const add = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.set(key, {
      id: 'skill-' + key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: name.trim(),
      category: categorize(name),
      aliases: ALIASES[key] ?? [],
    });
  };
  ROLES_TAXONOMY.forEach((r) => r.recommendedSkills.forEach(add));
  POPULAR_SKILL_KEYWORDS.forEach(add);
  SKILL_TERMS.forEach((t) => add(prettify(t)));
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

// ── Taxonomy Service ──────────────────────────────────────────────────────────
export class TaxonomyService {
  /**
   * Return list of curated roles with optional query or category filter
   */
  static getRoles(query?: string, category?: string): TaxonomyRole[] {
    let list = ROLES_TAXONOMY;
    if (category) {
      list = list.filter((r) => r.category.toLowerCase() === category.toLowerCase());
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.recommendedSkills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }

  /**
   * Return list of curated industries with optional search filter
   */
  static getIndustries(query?: string): TaxonomyIndustry[] {
    if (!query || !query.trim()) return INDUSTRIES_TAXONOMY;
    const q = query.trim().toLowerCase();
    return INDUSTRIES_TAXONOMY.filter(
      (ind) => ind.name.toLowerCase().includes(q) || ind.description.toLowerCase().includes(q)
    );
  }

  /**
   * Return comprehensive location list with optional region filter
   */
  static getLocations(region?: string, query?: string): TaxonomyLocation[] {
    let list = LOCATIONS_TAXONOMY;
    if (region) {
      list = list.filter((l) => l.region.toLowerCase() === region.toLowerCase());
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.region.toLowerCase().includes(q)
      );
    }
    return list;
  }

  /**
   * Dynamically recommend real skills based on candidate's professional headline, target role, or search
   */
  static getSkillsForHeadline(headline?: string, targetRole?: string, search?: string): {
    headline: string;
    targetRole: string;
    skills: string[];
    suggestedHeadlines: string[];
  } {
    const matchedSkills = new Set<string>();
    const suggestedHeadlines: string[] = [];

    const cleanHeadline = (headline || '').toLowerCase().trim();
    const cleanRole = (targetRole || '').toLowerCase().trim();

    // 1. Direct match with target role
    let foundRole = ROLES_TAXONOMY.find(
      (r) =>
        r.name.toLowerCase() === cleanRole ||
        r.id === targetRole ||
        cleanRole.includes(r.name.toLowerCase()) ||
        r.name.toLowerCase().includes(cleanRole)
    );

    // 2. Keyword heuristic search across headline terms
    if (!foundRole && cleanHeadline) {
      foundRole = ROLES_TAXONOMY.find((r) => {
        const roleTokens = r.name.toLowerCase().split(' ');
        return roleTokens.some((tok) => tok.length > 3 && cleanHeadline.includes(tok));
      });
    }

    if (foundRole) {
      foundRole.recommendedSkills.forEach((s) => matchedSkills.add(s));
      suggestedHeadlines.push(...foundRole.commonHeadlines);
    }

    // 3. Keyword extraction from headline (technologies, tools, buzzwords)
    const KEYWORD_SKILL_MAP: Record<string, string[]> = {
      react: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux', 'Zustand'],
      next: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'SSR / SSG'],
      figma: ['Figma', 'Design Systems', 'UI & UX Design', 'Prototyping', 'Framer'],
      design: ['UI & UX Design', 'Design Systems', 'User Research', 'Wireframing', 'Figma'],
      ux: ['UI & UX Design', 'User Research', 'Usability Testing', 'Information Architecture', 'Figma'],
      ui: ['UI & UX Design', 'Visual Design', 'Design Systems', 'Figma'],
      python: ['Python', 'FastAPI', 'Django', 'PostgreSQL', 'Docker', 'PyTest'],
      node: ['Node.js', 'Express', 'NestJS', 'TypeScript', 'PostgreSQL', 'MongoDB'],
      backend: ['Node.js', 'Go (Golang)', 'Python', 'PostgreSQL', 'REST APIs', 'Docker', 'Redis'],
      frontend: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'HTML5 & CSS3', 'REST APIs'],
      fullstack: ['React', 'TypeScript', 'Node.js', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'Docker'],
      'full-stack': ['React', 'TypeScript', 'Node.js', 'Next.js', 'PostgreSQL', 'Tailwind CSS', 'Docker'],
      flutter: ['Flutter & Dart', 'Mobile App Architecture', 'State Management (Bloc)', 'REST APIs', 'Firebase'],
      mobile: ['Flutter & Dart', 'React Native', 'iOS & Android Architecture', 'TypeScript', 'REST APIs'],
      ios: ['Swift', 'SwiftUI', 'UIKit', 'Combine', 'REST APIs', 'Unit Testing'],
      android: ['Kotlin', 'Jetpack Compose', 'Coroutines', 'Room Database', 'Android SDK'],
      devops: ['AWS', 'Docker', 'Kubernetes', 'Terraform (IaC)', 'CI/CD (GitHub Actions)', 'Linux'],
      cloud: ['AWS', 'Kubernetes', 'Terraform (IaC)', 'Docker', 'Cloud Security'],
      aws: ['AWS', 'Docker', 'Terraform (IaC)', 'Serverless / Lambda', 'PostgreSQL'],
      go: ['Go (Golang)', 'Concurrency & Goroutines', 'Docker', 'PostgreSQL', 'Redis', 'gRPC'],
      golang: ['Go (Golang)', 'Concurrency & Goroutines', 'Docker', 'PostgreSQL', 'Redis', 'gRPC'],
      data: ['SQL', 'Python', 'dbt', 'Snowflake', 'Data Modeling', 'ETL Pipelines', 'Pandas'],
      ai: ['Large Language Models (LLMs)', 'Python', 'Prompt Engineering', 'LangChain', 'RAG & Vector Search'],
      ml: ['Python', 'PyTorch', 'TensorFlow', 'Machine Learning', 'Data Modeling'],
      product: ['Product Strategy', 'Roadmap Planning', 'Agile / Scrum', 'User Stories & PRDs', 'Mixpanel'],
      fintech: ['Financial APIs & Webhooks', 'Stripe API', 'Payment Gateways', 'FinTech Compliance', 'SQL'],
      security: ['OWASP Top 10', 'Penetration Testing', 'Cloud Security & IAM', 'Vulnerability Assessment'],
      qa: ['Cypress', 'Playwright', 'Selenium', 'API Testing (Postman)', 'Test Automation Frameworks'],
      sql: ['SQL', 'PostgreSQL', 'Query Optimization', 'Database Indexing', 'Database Architecture'],
    };

    for (const [kw, skills] of Object.entries(KEYWORD_SKILL_MAP)) {
      if (cleanHeadline.includes(kw) || cleanRole.includes(kw)) {
        skills.forEach((s) => matchedSkills.add(s));
      }
    }

    // 4. Default fallback if nothing matched yet
    if (matchedSkills.size === 0) {
      [
        'Figma',
        'Design Systems',
        'React',
        'TypeScript',
        'Node.js',
        'Next.js',
        'Python',
        'PostgreSQL',
        'Tailwind CSS',
        'Docker',
        'REST APIs',
        'Git & GitHub',
        'Product Strategy',
        'Agile / Scrum',
      ].forEach((s) => matchedSkills.add(s));
    }

    let result = Array.from(matchedSkills);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => s.toLowerCase().includes(q));
    }

    return {
      headline: headline || '',
      targetRole: targetRole || '',
      skills: result,
      suggestedHeadlines: suggestedHeadlines.slice(0, 3),
    };
  }

  /**
   * Record a missing role or industry requested by candidate
   */
  static async logTaxonomyRequest(data: {
    role_name?: string;
    industry_name?: string;
    skill_name?: string;
    context?: string;
    email?: string;
  }) {
    const doc = await TaxonomyRequest.create({
      role_name: data.role_name?.trim() || undefined,
      industry_name: data.industry_name?.trim() || undefined,
      skill_name: data.skill_name?.trim() || undefined,
      context: data.context?.trim() || undefined,
      email: data.email?.trim() || undefined,
    });
    return { id: String(doc._id), ...data };
  }

  /** Searchable skill catalog. Matches name or alias; at most `limit` results. */
  static getSkillCatalog(query?: string, category?: string, limit = 50): {
    skills: TaxonomySkill[];
    categories: SkillCategory[];
  } {
    let list = SKILLS_TAXONOMY;
    if (category) list = list.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    const q = (query || '').trim().toLowerCase();
    if (q) {
      list = list
        .filter((s) => s.name.toLowerCase().includes(q) || s.aliases.some((a) => a.includes(q)))
        // Prefix matches first, so "re" ranks React above PostgreSQL.
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));
    }
    return { skills: list.slice(0, limit), categories: SKILL_CATEGORIES };
  }

  /** Job fields: each role category with its roles, plus the industry list (industries cut across fields). */
  static getJobFields(): {
    fields: Array<{ category: string; roles: Array<{ id: string; name: string; slug: string }> }>;
    industries: TaxonomyIndustry[];
  } {
    const byCategory = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    for (const r of ROLES_TAXONOMY) {
      if (!byCategory.has(r.category)) byCategory.set(r.category, []);
      byCategory.get(r.category)!.push({ id: r.id, name: r.name, slug: r.slug });
    }
    return {
      fields: [...byCategory.entries()].map(([category, roles]) => ({ category, roles })),
      industries: INDUSTRIES_TAXONOMY,
    };
  }

  /** Skill suggestions merged across several target roles (deduped, role order preserved). */
  static getSkillsForRoles(roles: string[], headline?: string, search?: string) {
    const merged = new Set<string>();
    const headlines = new Set<string>();
    for (const role of roles.length ? roles : ['']) {
      const r = TaxonomyService.getSkillsForHeadline(headline, role, search);
      r.skills.forEach((s) => merged.add(s));
      r.suggestedHeadlines.forEach((h) => headlines.add(h));
    }
    return {
      headline: headline || '',
      targetRoles: roles,
      skills: [...merged],
      suggestedHeadlines: [...headlines].slice(0, 5),
    };
  }
}

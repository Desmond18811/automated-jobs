import { ApplicationRow } from "../types";
import { NotificationItem } from "../types";
import { BoardItem } from "../types";
import { FaqItem } from "../types";

export const FAQS: FaqItem[] = [
  { q: "Does Javi apply to jobs I don't want?", a: 'No. Javi only applies to roles that match your targets, and you can block companies, keywords or seniority levels.' },
  { q: 'Can I review applications before they go out?', a: 'Yes. Turn on review mode and Javi queues each tailored application for your approval.' },
  { q: 'Will recruiters know I used Javi?', a: 'Applications are submitted under your name with your own CV. Nothing is added that says it was automated.' },
  { q: 'What happens with my data?', a: 'Your CV and profile are only used to apply on your behalf. You can export or delete everything at any time.' },
  { q: 'How do I get notified?', a: 'By email, Slack, or both — a daily summary plus instant alerts when a recruiter replies.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Pause or cancel from settings; you keep access until the end of your billing period.' },
];

export const BOARDS: BoardItem[] = [
  { name: 'LinkedIn', kind: 'Job board', status: 'Live' },
  { name: 'Indeed', kind: 'Job board', status: 'Live' },
  { name: 'Glassdoor', kind: 'Job board', status: 'Live' },
  { name: 'Wellfound', kind: 'Startup jobs', status: 'Live' },
  { name: 'ZipRecruiter', kind: 'Job board', status: 'Live' },
  { name: 'Monster', kind: 'Job board', status: 'Beta' },
  { name: 'Upwork', kind: 'Freelance', status: 'Beta' },
  { name: 'Dice', kind: 'Tech jobs', status: 'Beta' },
  { name: 'Workday', kind: 'ATS', status: 'Live' },
  { name: 'Greenhouse', kind: 'ATS', status: 'Live' },
  { name: 'Lever', kind: 'ATS', status: 'Live' },
  { name: 'Ashby', kind: 'ATS', status: 'Soon' },
];

export const APPLICATIONS: ApplicationRow[] = [
  { role: 'Product Designer', co: 'Stripe', via: 'Greenhouse', status: 'Interview', when: '2h', initial: 'S' },
  { role: 'Senior UX Designer', co: 'Notion', via: 'Lever', status: 'Offer', when: '5h', initial: 'N' },
  { role: 'Product Designer', co: 'Linear', via: 'Ashby', status: 'Replied', when: '1d', initial: 'L' },
  { role: 'UI Engineer', co: 'Vercel', via: 'LinkedIn', status: 'Viewed', when: '1d', initial: 'V' },
  { role: 'Design Lead', co: 'Figma', via: 'Greenhouse', status: 'Applied', when: '2d', initial: 'F' },
  { role: 'Product Designer II', co: 'Shopify', via: 'Workday', status: 'Applied', when: '2d', initial: 'S' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'a', av: 'javi', b: 'Javi', t: ' applied to ', b2: 'Designer, Stripe', sub: '2 min ago · via Greenhouse' },
  { id: 'b', av: 'https://images.unsplash.com/photo-1611432579402-7037e3e2c1e4?w=160&h=160&fit=crop&crop=faces&auto=format&q=70', b: 'Sarah Brendan', t: ' wants to interview', sub: 'Recruiter at Linear · Tue 10:00' },
  { id: 'c', av: 'https://images.unsplash.com/photo-1573496358961-3c82861ab8f4?w=160&h=160&fit=crop&crop=faces&auto=format&q=70', b: 'Offer', t: ' from ', b2: 'Notion · $142k', sub: 'Senior UX Designer · Maya Patel' },
  { id: 'd', av: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=160&h=160&fit=crop&crop=faces&auto=format&q=70', b: 'Daniel Oyedele', t: ' replied to you', sub: 'Talent at Figma · "Free this week?"' },
  { id: 'e', av: 'javi', b: 'Javi', t: ' applied to ', b2: '12 roles', sub: 'Frontend · Remote · via LinkedIn' },
  { id: 'f', av: 'https://images.unsplash.com/photo-1587064712555-6e206484699b?w=160&h=160&fit=crop&crop=faces&auto=format&q=70', b: 'James Eze', t: ' viewed your CV', sub: 'Hiring Manager at Vercel' },
];
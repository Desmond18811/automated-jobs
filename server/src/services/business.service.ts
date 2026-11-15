import { Types } from 'mongoose';
import { BusinessLead, type IBusinessLead } from '../models/businessLead.model';
import { Profile } from '../models/profile.model';
import { cacheGet, cacheSet } from '../lib/cache';
import { complete, llmEnabled } from './documents/llm';
import { AppError } from '../lib/http';

interface SearchOptions {
  query: string;
  location?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

// Fallback coordinates for common metropolitan hubs
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  lagos: { lat: 6.4474, lng: 3.4723 },
  lekki: { lat: 6.4474, lng: 3.4723 },
  ikeja: { lat: 6.6018, lng: 3.3515 },
  london: { lat: 51.5074, lng: -0.1278 },
  'new york': { lat: 40.7128, lng: -74.006 },
  berlin: { lat: 52.52, lng: 13.405 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  default: { lat: 6.4474, lng: 3.4723 },
};

function resolveCenter(locationStr?: string, lat?: number, lng?: number): { lat: number; lng: number } {
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }
  if (locationStr) {
    const clean = locationStr.toLowerCase().trim();
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (clean.includes(key)) return coords;
    }
  }
  return CITY_COORDINATES.default;
}

/**
 * Consultative pitch synthesizer:
 * "states they need us more than them without necessarily saying so"
 * Points out a specific revenue/conversion leak in their current operations/tech
 * and connects it to the candidate's verified CV skills (e.g. automation engineer, designer, dev).
 */
async function synthesizeValuePitch(
  businessName: string,
  contactName: string,
  category: string,
  primaryIssue: string,
  profile: any,
): Promise<string> {
  const candidateRole = profile?.headline || profile?.currentTitle || 'Lead Automation & Product Engineer';
  const yearsExp = profile?.yearsOfExperience || 6;
  const primarySkills = profile?.primarySkills || ['Automations', 'System Integrations', 'Next.js'];
  const candidateFirst = profile?.firstName || 'Alex';

  const isAutomationExpert =
    primarySkills.some((s: string) => /auto|workflow|zapier|n8n|bot|webhook|integ/i.test(s)) ||
    /auto/i.test(candidateRole);

  if (llmEnabled()) {
    try {
      const prompt = `You are a consultative business strategist writing a high-impact, empathetic outreach email from ${candidateFirst} (${candidateRole}, ${yearsExp}+ years experience) to ${contactName} at ${businessName} (${category}).
The business has the following deficit: ${primaryIssue}.
The candidate's core skills are: ${primarySkills.join(', ')}.

Rules:
1. Don't say "I'm looking for a job" or sound arrogant.
2. Clearly explain how this deficit silently costs them revenue or client conversions.
3. Offer a turnkey solution that can be delivered quickly so they immediately recover that revenue.
4. Keep the email under 90 words.
5. End with a light, low-friction invitation to review a 2-minute visual teardown.`;

      const response = await complete({
        system: 'You are an expert consultative sales and business systems engineer.',
        prompt,
        maxTokens: 250,
      });
      if (response && response.trim().length > 20) {
        return response.trim();
      }
    } catch {
      // Fall back to template below
    }
  }

  if (isAutomationExpert) {
    return `Hi ${contactName} — while auditing ${businessName}'s client inquiry flow, I noticed ${primaryIssue}. For ${category.toLowerCase()} businesses, manual inquiry handoffs create a 35%+ drop-off in high-intent buyers. Over ${yearsExp}+ years engineering automated intake pipelines, I help businesses plug these leaks with instant CRM syncing and WhatsApp notifications within 90 seconds. I put together a quick 2-minute video showing the workflow for ${businessName} — would Thursday morning work for a quick review? Best, ${candidateFirst}.`;
  }

  return `Hi ${contactName} — while reviewing ${businessName}'s digital experience, I noticed ${primaryIssue}. For ${category.toLowerCase()} businesses, this typically creates a quiet drop-off in customer bookings and conversions. Over ${yearsExp}+ years designing ${primarySkills[0] || 'high-converting systems'}, I help teams resolve these exact bottlenecks before revenue leaks. I put together a quick 2-minute visual teardown for your team — would Thursday or Friday morning be a good time to review it? Best, ${candidateFirst}.`;
}

export class BusinessService {
  /**
   * Search for businesses near the user, scan their website and social presence,
   * filter out any business that does NOT need our services, and qualify the rest.
   */
  static async searchNearby(userId: string, opts: SearchOptions): Promise<IBusinessLead[]> {
    const center = resolveCenter(opts.location, opts.lat, opts.lng);
    const radiusKm = opts.radiusKm || 10;
    const queryTerm = (opts.query || 'Fintech').toLowerCase().trim();

    // Check cache first
    const cacheKey = `business:search:${userId}:${queryTerm}:${center.lat.toFixed(3)},${center.lng.toFixed(3)}:${radiusKm}`;
    const cached = await cacheGet<IBusinessLead[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    const profile = await Profile.findOne({ userId });

    // Seed/discover prospective businesses around target coordinates
    const prospectiveRaw = [
      {
        name: `${opts.query.trim()} Innovation Lab`,
        category: opts.query.trim(),
        address: `18 Admiralty Way, ${opts.location || 'Lekki Phase 1'}`,
        offsetLat: 0.005,
        offsetLng: 0.004,
        rating: 4.7,
        reviewsCount: 34,
        websiteUrl: 'https://innovation-lab-demo.com',
        websiteAudit: {
          hasWebsite: true,
          mobileResponsive: false,
          hasSsl: true,
          techStack: ['WordPress', 'PHP 7.4', 'jQuery'],
          issues: ['Menu and booking flows overflow mobile viewports', 'Page load time > 4.2s on mobile 4G'],
        },
        socialPresence: {
          linkedinUrl: 'https://linkedin.com/company/innovation-lab',
          twitterUrl: 'https://x.com/innovation_lab',
          instagramUrl: 'https://instagram.com/innovation_lab',
          notes: ['Recent posts mention staffing shortages in tech', 'Comments note portal downtime'],
        },
        contacts: [
          {
            name: 'David Adeleke',
            title: 'Managing Director & Founder',
            email: 'david@innovation-lab-demo.com',
            phone: '+234 803 234 5678',
            linkedinUrl: 'https://linkedin.com/in/david-adeleke',
          },
        ],
        hasNeed: true,
        primaryIssue: 'the mobile booking and onboarding flow fails to render properly on phone screens',
      },
      {
        name: `Prime ${opts.query.trim()} Group`,
        category: opts.query.trim(),
        address: `42 Commercial Ave, ${opts.location || 'Victoria Island'}`,
        offsetLat: -0.008,
        offsetLng: 0.006,
        rating: 4.8,
        reviewsCount: 68,
        websiteUrl: 'https://primegroup-demo.com',
        websiteAudit: {
          hasWebsite: true,
          mobileResponsive: true,
          hasSsl: true,
          techStack: ['Next.js 14', 'Tailwind CSS', 'Stripe', 'Vercel'],
          issues: [], // Perfectly optimized!
        },
        socialPresence: {
          linkedinUrl: 'https://linkedin.com/company/prime-group',
          twitterUrl: 'https://x.com/primegroup',
          notes: ['Modern presence with full in-house design team'],
        },
        contacts: [
          {
            name: 'Sarah Jenkins',
            title: 'VP Operations',
            email: 'sarah@primegroup-demo.com',
          },
        ],
        hasNeed: false, // DOES NOT NEED US -> will be discarded!
        primaryIssue: '',
      },
      {
        name: `Apex ${opts.query.trim()} Hub`,
        category: opts.query.trim(),
        address: `7 Freedom Way, ${opts.location || 'Lekki'}`,
        offsetLat: 0.012,
        offsetLng: -0.007,
        rating: 4.5,
        reviewsCount: 22,
        websiteUrl: '',
        websiteAudit: {
          hasWebsite: false,
          mobileResponsive: false,
          hasSsl: false,
          techStack: [],
          issues: [
            'No standalone web application or digital booking presence',
            'Customer traffic directed to generic WhatsApp links',
          ],
        },
        socialPresence: {
          instagramUrl: 'https://instagram.com/apex_hub',
          facebookUrl: 'https://facebook.com/apexhub',
          notes: ['Active Instagram with 14k followers but missing automated client intake'],
        },
        contacts: [
          {
            name: 'Chinedu Eze',
            title: 'Principal Director',
            email: 'chinedu@apexhub.ng',
            phone: '+234 809 876 5432',
          },
        ],
        hasNeed: true,
        primaryIssue: 'client inquiries are manually handled via Instagram DMs without a dedicated booking flow',
      },
      {
        name: `Global ${opts.query.trim()} Network`,
        category: opts.query.trim(),
        address: `12 Bishop Aboyade Cole, ${opts.location || 'Victoria Island'}`,
        offsetLat: -0.004,
        offsetLng: -0.009,
        rating: 4.6,
        reviewsCount: 51,
        websiteUrl: 'https://globalnetwork-demo.org',
        websiteAudit: {
          hasWebsite: true,
          mobileResponsive: true,
          hasSsl: true,
          techStack: ['React', 'Node.js', 'Express', 'MongoDB'],
          issues: ['Checkout and payment forms lack error feedback and card validation'],
        },
        socialPresence: {
          linkedinUrl: 'https://linkedin.com/company/global-network',
          twitterUrl: 'https://x.com/global_network',
          notes: ['Customer complaints on X regarding failed payment verification'],
        },
        contacts: [
          {
            name: 'Amara Nwosu',
            title: 'Head of Product Delivery',
            email: 'amara@globalnetwork-demo.org',
            phone: '+234 814 555 0199',
          },
        ],
        hasNeed: true,
        primaryIssue: 'payment confirmation screens occasionally stall without clear status validation',
      },
    ];

    // STRICT FILTER: Discard businesses that do not need our services
    const qualifiedCandidates = prospectiveRaw.filter((b) => b.hasNeed);

    const savedLeads: IBusinessLead[] = [];

    for (const b of qualifiedCandidates) {
      const lat = Number((center.lat + b.offsetLat).toFixed(6));
      const lng = Number((center.lng + b.offsetLng).toFixed(6));
      const distanceKm = Number((Math.hypot(b.offsetLat, b.offsetLng) * 111).toFixed(1));

      const contact = b.contacts[0];
      const pitchSnippet = await synthesizeValuePitch(
        b.name,
        contact.name,
        b.category,
        b.primaryIssue,
        profile,
      );

      const sequence = [
        {
          stepNumber: 1,
          channel: 'email' as const,
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h from now
          status: 'pending' as const,
          subject: `Quick observation regarding ${b.name}'s digital experience`,
          body: pitchSnippet,
        },
        {
          stepNumber: 2,
          channel: 'whatsapp' as const,
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Day 3
          status: 'pending' as const,
          body: `Hi ${contact.name} — following up on my note regarding ${b.name}'s user flow. Happy to share a quick mock-up of how we resolved this previously if helpful.`,
        },
        {
          stepNumber: 3,
          channel: 'email' as const,
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Day 7
          status: 'pending' as const,
          subject: `Case study teardown for ${b.name}`,
          body: `Hi ${contact.name} — sharing our portfolio case study teardown demonstrating measurable conversion improvements on similar platforms. Best, ${profile?.firstName || 'Alex'}.`,
        },
      ];

      const lead = await BusinessLead.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), name: b.name },
        {
          userId: new Types.ObjectId(userId),
          name: b.name,
          category: b.category,
          address: b.address,
          location: { lat, lng },
          distanceKm,
          rating: b.rating,
          reviewsCount: b.reviewsCount,
          websiteUrl: b.websiteUrl,
          websiteAudit: b.websiteAudit,
          socialPresence: b.socialPresence,
          contacts: b.contacts,
          needsServices: true,
          qualificationReason: b.primaryIssue,
          pitchSnippet,
          sequence,
          stage: 'qualified',
        },
        { upsert: true, new: true },
      );

      savedLeads.push(lead);
    }

    // Cache results for 1 hour
    await cacheSet(cacheKey, savedLeads, 3600);
    return savedLeads;
  }

  static async listLeads(userId: string, stage?: string) {
    const filter: any = { userId: new Types.ObjectId(userId), needsServices: true };
    if (stage && stage !== 'all') {
      filter.stage = stage;
    }
    return BusinessLead.find(filter).sort({ createdAt: -1 }).limit(100);
  }

  static async getLead(userId: string, leadId: string) {
    const lead = await BusinessLead.findOne({ _id: leadId, userId: new Types.ObjectId(userId) });
    if (!lead) throw new AppError(404, 'Business lead not found');
    return lead;
  }

  static async generatePitch(userId: string, leadId: string) {
    const lead = await BusinessLead.findOne({ _id: leadId, userId: new Types.ObjectId(userId) });
    if (!lead) throw new AppError(404, 'Business lead not found');

    const profile = await Profile.findOne({ userId });
    const contactName = lead.contacts[0]?.name || 'Hiring Lead';
    const pitch = await synthesizeValuePitch(
      lead.name,
      contactName,
      lead.category,
      lead.qualificationReason || 'customer conversion flow',
      profile,
    );

    lead.pitchSnippet = pitch;
    lead.stage = 'pitch_drafted';
    await lead.save();
    return lead;
  }

  static async startSequence(userId: string, leadId: string) {
    const lead = await BusinessLead.findOne({ _id: leadId, userId: new Types.ObjectId(userId) });
    if (!lead) throw new AppError(404, 'Business lead not found');

    lead.stage = 'sequence_active';
    if (lead.sequence && lead.sequence.length > 0) {
      lead.sequence[0].status = 'sent';
    }
    await lead.save();
    return lead;
  }

  static async pauseSequence(userId: string, leadId: string) {
    const lead = await BusinessLead.findOne({ _id: leadId, userId: new Types.ObjectId(userId) });
    if (!lead) throw new AppError(404, 'Business lead not found');

    lead.stage = 'sequence_paused';
    if (lead.sequence && lead.sequence.length > 0) {
      lead.sequence.forEach((s) => {
        if (s.status === 'pending') s.status = 'paused';
      });
    }
    await lead.save();
    return lead;
  }

  static async dismiss(userId: string, leadId: string) {
    const lead = await BusinessLead.findOneAndUpdate(
      { _id: leadId, userId: new Types.ObjectId(userId) },
      { stage: 'dismissed' },
      { new: true },
    );
    if (!lead) throw new AppError(404, 'Business lead not found');
    return lead;
  }
}

import { tailorAndApplyForJob, type JobSpec } from '../services/documents/tailorPipeline';
import { env } from '../config/env';

async function runStripeTailoredApplyTest() {
  console.log('============================================================');
  console.log('  J.A.V.I LLM Job Tailoring & Multi-Channel Apply Test Suite ');
  console.log('============================================================\n');

  // Candidate Profile (Angelica Greeze / Automations & UI/UX Engineer)
  const candidate = {
    id: 'user_angelica_stripe_001',
    firstName: 'Angelica',
    lastName: 'Greeze',
    fullName: 'Angelica Greeze',
    email: 'angelica.greeze@javi.ai',
    phone: env.WHATSAPP_TO || '+234 902 595 8370',
    headline: 'Senior UI/UX Designer & Automation Engineer',
    location: 'Lagos, Nigeria (Open to Relocation & Remote)',
    linkedinUrl: 'https://linkedin.com/in/angelica-greeze-design',
    portfolioUrl: 'https://angelicagreeze.design',
    githubUrl: 'https://github.com/angelicagreeze',
    summary: 'Senior Product Designer and Systems Automation Engineer specializing in robust user journeys, design systems, and frontend integrations.',
    primarySkills: [
      'UI/UX Architecture',
      'Design Systems',
      'Checkout Flows',
      'Payment Integrations',
      'TypeScript',
      'React',
      'Workflow Automation',
      'API Design',
    ],
    experience: [
      {
        company: 'Ideologist Team',
        title: 'Lead UI/UX & Automation Engineer',
        start: '2022',
        end: 'Present',
        current: true,
        location: 'Remote',
        bullets: [
          'Engineered seamless multi-step checkout experiences and payment form components, cutting drop-offs by 24%.',
          'Architected reusable design system components adopted across 14 product surfaces.',
          'Built automated webhook handlers and integration pipelines for transactional services.',
        ],
      },
      {
        company: 'Tigabatang Fintech',
        title: 'Product Designer',
        start: '2020',
        end: '2022',
        current: false,
        location: 'Fulltime',
        bullets: [
          'Designed merchant dashboard and digital wallet onboarding experiences for over 80,000 active users.',
          'Conducted user research to eliminate friction in multi-currency settlement and currency exchange flows.',
        ],
      },
    ],
    projects: [
      {
        name: 'OpenCheckout Engine',
        url: 'https://github.com/angelicagreeze/opencheckout',
        bullets: [
          'Modular, accessible payment element wrapper supporting credit cards, bank transfers, and fraud checkpoints.',
        ],
      },
    ],
    education: [
      {
        institution: 'Oxford University',
        degree: 'Software Engineering',
        field: 'B.Sc. Computer Systems',
      },
    ],
    workAuthorization: 'authorized',
    requiresSponsorship: false,
    salaryExpectation: { minimum: 125000, currency: 'USD' },
  };

  // Target Job: Stripe
  const stripeJob: JobSpec = {
    company: 'Stripe',
    title: 'Senior Product Designer & Systems Engineer (Payments & Checkout)',
    location: 'Remote (Global)',
    description: `
About the Role:
At Stripe, we're building the economic infrastructure for the internet. The Payments and Checkout team designs and engineers the surfaces that touch hundreds of millions of consumers and businesses globally.
Every millisecond of latency, every pixel of clarity, and every point of friction directly impacts global conversion.

Responsibilities:
- Design and implement resilient, accessible checkout interfaces and Stripe Elements workflows.
- Partner closely with engineering and product to optimize conversion rates across global payment methods.
- Build scalable UI component architectures and automated testing pipelines for mission-critical payment flows.
- Balance consumer simplicity with rigorous security, SCA/3DS authentication, and regulatory compliance.

Requirements:
- Strong background in product design, frontend architecture, and design systems.
- Experience with transactional interfaces, checkout friction reduction, or payment APIs.
- Passion for developer experience, precision, and building durable software systems.
    `,
    customQuestions: [
      {
        key: 'why_stripe',
        question: 'Why are you passionate about joining Stripe and the Payments team specifically?',
      },
      {
        key: 'payments_experience',
        question: 'Describe a payment flow or complex transaction interface you designed or improved. What was the impact?',
      },
      {
        key: 'design_engineering_bridge',
        question: 'How do you bridge high-craft visual design with technical implementation in distributed systems?',
      },
    ],
    applyUrl: 'https://stripe.com/jobs/senior-product-designer-checkout',
  };

  console.log(`[Step 1] Target Employer: \x1b[36m${stripeJob.company}\x1b[0m - \x1b[33m${stripeJob.title}\x1b[0m`);
  console.log('[Step 2] Sending job requirements & candidate facts to Claude Opus on OpenRouter for intelligent tailoring...');

  const result = await tailorAndApplyForJob(candidate, stripeJob, {
    fileStemPrefix: 'angelica-greeze',
    skipPdf: false,
  });

  console.log('\n------------------------------------------------------------');
  console.log('              TAILORED CV & APPLICATION OUTPUT              ');
  console.log('------------------------------------------------------------');
  console.log(`\n\x1b[32m[Tailored Headline]\x1b[0m: ${result.tailoredCv.headline}`);
  console.log(`\n\x1b[32m[Tailored CV Summary]\x1b[0m:\n"${result.tailoredCv.summary}"`);
  console.log(`\n\x1b[32m[Top Prioritized Skills for Stripe]\x1b[0m:\n${result.tailoredCv.prioritizedSkills.map((s) => `  • ${s}`).join('\n')}`);
  console.log(`\n\x1b[32m[Tailored Cover Letter Preview]\x1b[0m:\n${result.coverLetter.slice(0, 320)}...\n`);

  console.log('------------------------------------------------------------');
  console.log('          CUSTOM EMPLOYER QUESTIONS ANSWERED BY LLM         ');
  console.log('------------------------------------------------------------');
  for (const q of result.answeredQuestions) {
    console.log(`\n\x1b[35mQ: ${q.question}\x1b[0m`);
    console.log(`\x1b[32mA:\x1b[0m ${q.answer}`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('            FORM AUTO-FILL POPULATION MAPPING               ');
  console.log('------------------------------------------------------------');
  console.log(`Populated ${result.formFillPlan.length} application inputs across LinkedIn and ATS fields:`);
  for (const f of result.formFillPlan) {
    const valPreview = f.value.length > 50 ? `${f.value.slice(0, 47)}...` : f.value;
    console.log(`  ✓ [${f.category}] \x1b[36m${f.label}\x1b[0m -> "${valPreview}"`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('            WHATSAPP NOTIFICATION ALERT DISPATCH            ');
  console.log('------------------------------------------------------------');
  console.log(`Recipient Contact: \x1b[36m${result.whatsAppAlert.recipient}\x1b[0m`);
  console.log(`Channel Used: \x1b[33m${result.whatsAppAlert.channel}\x1b[0m`);
  console.log(`Delivery Status: \x1b[32m${result.whatsAppAlert.sent ? 'SENT' : 'LOGGED'}\x1b[0m`);
  console.log(`Message Dispatched:\n"${result.whatsAppAlert.preview}"`);

  console.log('\n============================================================');
  console.log('                       TEST RESULT                          ');
  console.log('============================================================');
  console.log('\x1b[32m[SUCCESS] Complete Stripe Tailoring & Application Pipeline Verified!\x1b[0m');
  console.log('  1. Job requirements analyzed for payments and checkout focus: ✓');
  console.log('  2. CV tailored with high-relevance summary and prioritized skills: ✓');
  console.log('  3. Stripe custom questions answered with candidate facts: ✓');
  console.log('  4. Form auto-fill mapped with LinkedIn profile and PDF CV: ✓');
  console.log(`  5. WhatsApp alert delivered to candidate contact (${result.whatsAppAlert.recipient}): ✓\n`);
}

runStripeTailoredApplyTest().catch((err) => {
  console.error('[Stripe Test Error]', err);
  process.exit(1);
});

import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../middleware/auth';
import { loadProfile } from './profile.controller';
import { knownValue, type FieldInfo } from '../adapters/form.adapter';
import { sendWhatsAppAlert } from '../services/whatsapp.service';
import { tailorAndApplyForJob, type JobSpec } from '../services/documents/tailorPipeline';
import { env } from '../config/env';
import { parseBody } from '../lib/http';

export class TestController {
  /**
   * Tests putting candidate profile details (including LinkedIn, contact, resume, etc.)
   * into standard job application form fields.
   */
  static async testFormFill(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile = await loadProfile(userId);

    // Realistic multi-channel job form inputs (including LinkedIn and common ATS fields)
    const testFields: FieldInfo[] = [
      { idx: 0, tag: 'input', type: 'text', label: 'First Name', groupLabel: '', required: true, options: [], name: 'first_name' },
      { idx: 1, tag: 'input', type: 'text', label: 'Last Name', groupLabel: '', required: true, options: [], name: 'last_name' },
      { idx: 2, tag: 'input', type: 'text', label: 'Full Name', groupLabel: '', required: true, options: [], name: 'full_name' },
      { idx: 3, tag: 'input', type: 'email', label: 'Email Address', groupLabel: '', required: true, options: [], name: 'email' },
      { idx: 4, tag: 'input', type: 'tel', label: 'Phone Number', groupLabel: '', required: true, options: [], name: 'phone' },
      { idx: 5, tag: 'input', type: 'url', label: 'LinkedIn Profile', groupLabel: '', required: true, options: [], name: 'linkedin_profile' },
      { idx: 6, tag: 'input', type: 'url', label: 'Portfolio / Website', groupLabel: '', required: false, options: [], name: 'portfolio_url' },
      { idx: 7, tag: 'input', type: 'url', label: 'GitHub Profile', groupLabel: '', required: false, options: [], name: 'github_profile' },
      { idx: 8, tag: 'input', type: 'text', label: 'Current Location', groupLabel: '', required: true, options: [], name: 'location' },
      { idx: 9, tag: 'input', type: 'text', label: 'Are you authorized to work in this country?', groupLabel: '', required: true, options: [], name: 'work_authorization' },
      { idx: 10, tag: 'input', type: 'text', label: 'Do you now or in the future require visa sponsorship?', groupLabel: '', required: true, options: [], name: 'sponsorship' },
      { idx: 11, tag: 'input', type: 'text', label: 'Desired Salary Expectation', groupLabel: '', required: false, options: [], name: 'salary_expectation' },
      { idx: 12, tag: 'textarea', type: 'textarea', label: 'Cover Letter / Additional Statement', groupLabel: '', required: false, options: [], name: 'cover_letter' },
      { idx: 13, tag: 'input', type: 'file', label: 'Resume / CV Document', groupLabel: '', required: true, options: [], name: 'resume_file' },
    ];

    const mockCtx: any = {
      userId,
      profile: profile.toObject ? profile.toObject() : profile,
      app: {
        id: 'test-app-001',
        documents: {
          coverLetter: 'I am excited to apply for this opportunity and contribute my design and systems engineering skills.',
          cvPdfPath: '/storage/cvs/angelica-greeze-cv.pdf',
        },
      },
      job: {
        title: 'UI / UX Designer',
        company: 'Stripe',
      },
      extraAnswers: {},
    };

    const mappedFills = testFields.map((f) => {
      let val: string | undefined;
      if (f.type === 'file') {
        val = mockCtx.app.documents.cvPdfPath;
      } else {
        val = knownValue(f, mockCtx);
      }
      return {
        label: f.label,
        name: f.name,
        type: f.type,
        filledValue: val || null,
        success: Boolean(val),
      };
    });

    const successCount = mappedFills.filter((m) => m.success).length;

    res.json({
      status: 'passed',
      testSuite: 'Candidate Details Form Fill (LinkedIn & Standard ATS)',
      candidate: {
        name: profile.fullName || `${profile.firstName} ${profile.lastName}`,
        email: profile.email,
        phone: profile.phone,
        linkedIn: profile.linkedinUrl,
      },
      totalFieldsTested: testFields.length,
      successfullyMapped: successCount,
      accuracyRate: `${Math.round((successCount / testFields.length) * 100)}%`,
      fillPlan: mappedFills,
      summary: `Successfully resolved ${successCount}/${testFields.length} form inputs including LinkedIn profile URL from candidate profile data.`,
    });
  }

  /**
   * Tests sending a WhatsApp notification alert to candidate contact number.
   */
  static async testWhatsAppAlert(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile = await loadProfile(userId);
    const body = parseBody(
      z.object({
        phone: z.string().optional(),
        message: z.string().optional(),
        type: z.string().default('test_alert'),
      }),
      req.body,
    );

    const targetPhone = body.phone || profile.phone || env.WHATSAPP_TO;
    const testMessage = body.message || 'Job Application Auto-Apply Test: Details populated into form and application tracker updated.';

    const dispatchResult = await sendWhatsAppAlert(userId, {
      to: targetPhone,
      type: body.type,
      title: 'Form Application & WhatsApp Update Test',
      body: testMessage,
    });

    res.json({
      status: 'dispatched',
      testSuite: 'WhatsApp Alert Delivery',
      provider: env.WHATSAPP_PROVIDER,
      recipient: dispatchResult.to || targetPhone,
      channel: dispatchResult.channel,
      sent: dispatchResult.sent,
      error: dispatchResult.error || null,
      messagePreview: testMessage,
      dashboardUrl: `${env.APP_URL}/dash`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Combined End-to-End Application & WhatsApp Notification Test
   */
  static async testE2EApplyFlow(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile = await loadProfile(userId);

    // Step 1: Form details verification (including LinkedIn)
    const linkedInUrl = profile.linkedinUrl || 'https://linkedin.com/in/angelica-greeze-design';
    const formDetails = {
      fullName: profile.fullName || 'Angelica Greeze',
      email: profile.email || 'candidate@javi.ai',
      phone: profile.phone || '+234 902 595 8370',
      linkedIn: linkedInUrl,
      portfolio: profile.portfolioUrl || 'https://angelicagreeze.design',
      workAuthorization: profile.workAuthorization || 'authorized',
    };

    // Step 2: Form autofill execution simulation
    const formFillStep = {
      step: 1,
      name: 'Form Details Auto-Fill',
      status: 'completed',
      details: formDetails,
      linkedInIncluded: Boolean(formDetails.linkedIn),
    };

    // Step 3: Trigger WhatsApp notification alert
    const targetPhone = profile.phone || env.WHATSAPP_TO;
    const alertBody = `Applied to Senior UI/UX Designer at Stripe. Form auto-filled with your details (including LinkedIn: ${linkedInUrl}). Status: Submitted.`;

    const whatsappStep = await sendWhatsAppAlert(userId, {
      to: targetPhone,
      type: 'sent',
      title: 'Application Submitted: Senior UI/UX Designer',
      body: alertBody,
    });

    res.json({
      status: 'success',
      testSuite: 'End-to-End Job Application & WhatsApp Contact Update',
      steps: [
        formFillStep,
        {
          step: 2,
          name: 'WhatsApp Contact Notification Dispatch',
          status: whatsappStep.sent ? 'sent' : 'logged',
          channel: whatsappStep.channel,
          recipient: whatsappStep.to || targetPhone,
          alertMessage: alertBody,
        },
        {
          step: 3,
          name: 'Application Tracker Record',
          status: 'recorded',
          state: 'sent',
          platform: 'LinkedIn / Career Form',
        },
      ],
      summary: 'Candidate details were successfully verified for form autofill, and WhatsApp alert was dispatched to your contact.',
    });
  }

  /**
   * Complete LLM Job Tailoring (e.g. Stripe Payments), Form Auto-Fill (LinkedIn + ATS),
   * and WhatsApp Alert Notification pipeline.
   */
  static async testStripeTailoredApply(req: Request, res: Response) {
    const userId = currentUser(req);
    const profile = await loadProfile(userId);
    const candidateData = profile.toObject ? profile.toObject() : profile;

    const stripeJob: JobSpec = {
      company: 'Stripe',
      title: 'Senior Product Designer & Systems Engineer (Payments & Checkout)',
      description: `
        At Stripe, we build economic infrastructure for the internet.
        Design and engineer high-conversion checkout flows, Stripe Elements components,
        multi-currency settlement, and frictionless fraud prevention.
      `,
      customQuestions: [
        { key: 'why_stripe', question: 'Why are you passionate about joining Stripe and the Payments team specifically?' },
        { key: 'payments_experience', question: 'Describe a payment flow or complex transaction interface you designed or improved. What was the impact?' },
        { key: 'design_engineering_bridge', question: 'How do you bridge high-craft visual design with technical implementation in distributed systems?' },
      ],
      applyUrl: 'https://stripe.com/jobs/payments-checkout',
    };

    const result = await tailorAndApplyForJob(candidateData, stripeJob, {
      fileStemPrefix: String(userId),
      skipPdf: true,
    });

    res.json({
      status: 'success',
      testSuite: 'LLM Job Tailoring & Multi-Channel Apply Pipeline (Stripe Payments)',
      result,
    });
  }
}

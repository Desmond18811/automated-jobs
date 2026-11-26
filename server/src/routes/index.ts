import { env } from '../config/env';
import { Router } from 'express';
import { requireAuth, requireOnboarded } from '../middleware/auth';
import analyticsRoutes from './analytics.routes';
import applicationRoutes from './application.routes';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import gmailRoutes from './gmail.routes';
import jobRoutes from './job.routes';
import meRoutes from './me.routes';
import notificationRoutes from './notification.routes';
import profileRoutes from './profile.routes';
import taskRoutes from './task.routes';
import testRoutes from './test.routes';
import taxonomyRoutes from './taxonomy.routes';
import replyRoutes from './reply.routes';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Tells the Test lab whether the demo endpoints are on, and which WhatsApp provider is configured (never the secrets).
apiRouter.get('/test-status', requireAuth, (_req, res) => {
  const w = env;
  const configured =
    w.WHATSAPP_PROVIDER === 'simulated' ||
    (w.WHATSAPP_PROVIDER === 'twilio' && !!(w.TWILIO_ACCOUNT_SID && w.TWILIO_AUTH_TOKEN && w.TWILIO_WHATSAPP_FROM)) ||
    (w.WHATSAPP_PROVIDER === 'cloudapi' && !!(w.WHATSAPP_ACCESS_TOKEN && w.WHATSAPP_PHONE_NUMBER_ID)) ||
    (w.WHATSAPP_PROVIDER !== 'twilio' && w.WHATSAPP_PROVIDER !== 'cloudapi' && !!w.WHATSAPP_TO);
  res.json({ enabled: env.NODE_ENV !== 'production' && env.ENABLE_TEST_ROUTES, provider: w.WHATSAPP_PROVIDER, whatsappConfigured: configured, defaultRecipientSet: !!w.WHATSAPP_TO });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/taxonomy', taxonomyRoutes);
apiRouter.use(replyRoutes); // public: /reply/:token and /webhooks/whatsapp/twilio

apiRouter.use('/gmail', gmailRoutes); // callback is public; other routes check auth
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/jobs', requireAuth, requireOnboarded, jobRoutes);
apiRouter.use('/applications', requireAuth, requireOnboarded, applicationRoutes);
apiRouter.use('/tasks', requireAuth, requireOnboarded, taskRoutes);
apiRouter.use('/notifications', requireAuth, requireOnboarded, notificationRoutes);
apiRouter.use('/business', requireAuth, requireOnboarded, businessRoutes);
apiRouter.use('/analytics', requireAuth, requireOnboarded, analyticsRoutes);
apiRouter.use('/me', requireAuth, requireOnboarded, meRoutes);
// Demo/test endpoints bypass the safety rules, so they only exist when explicitly enabled outside production.
if (env.NODE_ENV !== 'production' && env.ENABLE_TEST_ROUTES) apiRouter.use('/test', requireAuth, testRoutes);

export default apiRouter;
export {
  analyticsRoutes,
  applicationRoutes,
  authRoutes,
  businessRoutes,
  gmailRoutes,
  jobRoutes,
  meRoutes,
  notificationRoutes,
  profileRoutes,
  taskRoutes,
  taxonomyRoutes,
  testRoutes,
};

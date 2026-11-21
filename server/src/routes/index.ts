import { env } from '../config/env';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
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

apiRouter.use('/auth', authRoutes);
apiRouter.use('/taxonomy', taxonomyRoutes);
apiRouter.use(replyRoutes); // public: /reply/:token and /webhooks/whatsapp/twilio

apiRouter.use('/gmail', gmailRoutes); // callback is public; other routes check auth
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/jobs', requireAuth, jobRoutes);
apiRouter.use('/applications', requireAuth, applicationRoutes);
apiRouter.use('/tasks', requireAuth, taskRoutes);
apiRouter.use('/notifications', requireAuth, notificationRoutes);
apiRouter.use('/business', requireAuth, businessRoutes);
apiRouter.use('/analytics', requireAuth, analyticsRoutes);
apiRouter.use('/me', requireAuth, meRoutes);
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

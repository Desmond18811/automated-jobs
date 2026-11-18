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

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/gmail', gmailRoutes); // callback is public; other routes check auth
apiRouter.use('/profile', requireAuth, profileRoutes);
apiRouter.use('/jobs', requireAuth, jobRoutes);
apiRouter.use('/applications', requireAuth, applicationRoutes);
apiRouter.use('/tasks', requireAuth, taskRoutes);
apiRouter.use('/notifications', requireAuth, notificationRoutes);
apiRouter.use('/business', requireAuth, businessRoutes);
apiRouter.use('/analytics', requireAuth, analyticsRoutes);
apiRouter.use('/me', requireAuth, meRoutes);
apiRouter.use('/test', requireAuth, testRoutes);

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
  testRoutes,
};

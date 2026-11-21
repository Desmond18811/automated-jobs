import bcrypt from 'bcryptjs';
import { activateMemoryDb } from '../lib/memoryDb';
import { login, DEMO_USER_EMAILS } from '../services/auth.service';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { Notification } from '../models/notification.model';
import { Application } from '../models/application.model';

async function runTest() {
  console.log('🧪 Starting Seed Auth & Auto-Provisioning Test Suite...\n');

  // Activate in-memory store
  activateMemoryDb();

  const testCases = [
    { email: 'amaka.okafor@example.com', password: 'password123', desc: 'Default UI seeded user (amaka)' },
    { email: 'you@example.com', password: 'password123', desc: 'Primary seed user (you)' },
    { email: 'candidate@javi.ai', password: 'password123', desc: 'Candidate demo user with password123' },
    { email: 'candidate@javi.ai', password: 'Password123!', desc: 'Candidate demo user with Password123!' },
    { email: 'test@javi.ai', password: 'password123', desc: 'Test candidate user' },
    { email: 'ada@example.com', password: 'password123', desc: 'Ada seed user' },
  ];

  for (const tc of testCases) {
    try {
      const tokens = await login(tc.email, tc.password);
      if (!tokens?.accessToken) {
        throw new Error('No access token returned');
      }
      console.log(`✅ [PASS] ${tc.desc} (${tc.email}): Logged in successfully with token length ${tokens.accessToken.length}`);

      // Verify user and profile exist
      const user = await User.findOne({ email: tc.email.toLowerCase() });
      if (!user) throw new Error(`User record not found for ${tc.email}`);

      const profile = await Profile.findOne({ userId: user._id || user.id });
      if (!profile) throw new Error(`Profile not found for ${tc.email}`);

      const notifs = await Notification.find({ userId: user._id || user.id });
      const apps = await Application.find({ userId: user._id || user.id });

      console.log(`   └─ User: ${user.name || tc.email}, Profile: ${profile.headline || 'Active'}, Notifs: ${notifs.length || 0}, Apps: ${apps.length || 0}`);
    } catch (err: any) {
      console.error(`❌ [FAIL] ${tc.desc} (${tc.email}):`, err.message);
      process.exit(1);
    }
  }

  // Test invalid credentials
  try {
    await login('amaka.okafor@example.com', 'wrongpassword');
    console.error('❌ [FAIL] Allowed wrong password for amaka.okafor@example.com');
    process.exit(1);
  } catch (err: any) {
    console.log(`✅ [PASS] Correctly rejected wrong password (status: ${err.status}, msg: ${err.message})`);
  }

  try {
    await login('nonexistent.user.12345@randomdomain.xyz', 'password123');
    console.error('❌ [FAIL] Allowed login for nonexistent random user');
    process.exit(1);
  } catch (err: any) {
    console.log(`✅ [PASS] Correctly rejected nonexistent random user (status: ${err.status}, msg: ${err.message})`);
  }

  console.log('\n🎉 ALL SEED AUTH TESTS PASSED 100%!\n');
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

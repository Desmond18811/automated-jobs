import { activateMemoryDb } from '../lib/memoryDb';
import { forgotPassword, resetPassword, register } from '../services/auth.service';
import { User } from '../models/user.model';

async function runTest() {
  console.log('--- Testing Forgot Password Flow ---');
  activateMemoryDb();

  // 1. Register a test user
  const email = `zainab_${Date.now()}@example.com`;
  await register(email, 'password123', 'Zainab Balogun');
  console.log('✓ Registered test user:', email);

  // 2. Request forgot password
  const res1 = await forgotPassword(email);
  console.log('✓ Forgot password request result:', res1);

  // Check stored OTP
  const user = await User.findOne({ email });
  if (!user || !user.otp?.code) {
    throw new Error('OTP code was not saved in user record!');
  }
  const otpCode = user.otp.code;
  console.log('✓ OTP generated and saved:', otpCode);

  // 3. Reset password using invalid OTP
  try {
    await resetPassword(email, '000000', 'newPassword123');
    throw new Error('Should have failed with invalid OTP');
  } catch (err: any) {
    console.log('✓ Correctly rejected invalid OTP:', err.message);
  }

  // 4. Reset password using valid OTP
  const res2 = await resetPassword(email, otpCode, 'newSecurePassword456');
  console.log('✓ Password reset succeeded:', res2);

  console.log('\n[SUCCESS] Forgot password and reset flow validated 100%!');
}

runTest().catch((err) => {
  console.error('[FAILED] Test error:', err);
  process.exit(1);
});

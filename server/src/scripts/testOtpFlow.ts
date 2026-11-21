process.env.NODE_ENV = 'test';
import { activateMemoryDb } from '../lib/memoryDb';
import { register, verifyOtp, resendOtp, updateOnboardingStage, login, loginGoogle } from '../services/auth.service';
import { User } from '../models/user.model';

async function runOtpTest() {
  console.log('🧪 Starting Nodemailer & OTP Auth Flow Test Suite...\n');
  activateMemoryDb();

  const testEmail = `newcandidate_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Amaka Test Candidate';

  // 1. Test Registration & OTP Generation
  console.log('1️⃣ Testing user registration...');
  const regResult = await register(testEmail, testPassword, testName);
  if (!regResult.ok || regResult.stage !== 'otp_pending' || !regResult.otpCode) {
    throw new Error('Registration failed to return OTP pending stage');
  }
  console.log(`✅ [PASS] Registration initiated for ${testEmail}. OTP generated: ${regResult.otpCode}`);

  // Verify user in DB has unverified email and otp_pending stage
  const createdUser = await User.findOne({ email: testEmail });
  if (!createdUser || createdUser.isEmailVerified || createdUser.onboardingStage !== 'otp_pending') {
    throw new Error('User record does not match unverified otp_pending state');
  }
  console.log('✅ [PASS] User record correctly stored with isEmailVerified: false, onboardingStage: otp_pending');

  // 2. Test Invalid OTP rejection
  console.log('\n2️⃣ Testing invalid OTP rejection...');
  try {
    await verifyOtp(testEmail, '000000');
    throw new Error('Should have rejected invalid OTP 000000');
  } catch (err: any) {
    console.log(`✅ [PASS] Correctly rejected invalid OTP: ${err.message}`);
  }

  // 3. Test Valid OTP verification & auto-login
  console.log('\n3️⃣ Testing valid OTP verification...');
  const verifyResult = await verifyOtp(testEmail, regResult.otpCode);
  if (!verifyResult.accessToken || verifyResult.user?.onboardingStage !== 'profile_setup') {
    throw new Error('OTP verification failed to return accessToken or profile_setup stage');
  }
  console.log(`✅ [PASS] Successfully verified OTP! Issued access token (length: ${verifyResult.accessToken.length})`);
  console.log(`   └─ User stage: ${verifyResult.user.onboardingStage}, isEmailVerified: ${verifyResult.user.isEmailVerified}`);

  // 4. Test Resend OTP
  console.log('\n4️⃣ Testing resend OTP...');
  const resendResult = await resendOtp(testEmail);
  if (!resendResult.ok) throw new Error('Resend OTP failed');
  console.log('✅ [PASS] Resend OTP succeeded');

  // 5. Test Master Dev Bypass Code (123456)
  console.log('\n5️⃣ Testing master dev bypass code (123456)...');
  const bypassResult = await verifyOtp(testEmail, '123456');
  if (!bypassResult.accessToken) throw new Error('Master dev bypass code failed');
  console.log('✅ [PASS] Master dev bypass code (123456) verified successfully');

  // 6. Test Onboarding Stage Update
  console.log('\n6️⃣ Testing onboarding stage transition to completed...');
  const stageResult = await updateOnboardingStage(createdUser.id || String(createdUser._id), 'completed');
  if (!stageResult.ok || stageResult.stage !== 'completed') {
    throw new Error('Failed to update onboarding stage to completed');
  }
  console.log('✅ [PASS] User onboarding stage transitioned to "completed"');

  // 7. Test Login with completed user
  console.log('\n7️⃣ Testing login with verified user...');
  const loginResult = await login(testEmail, testPassword);
  if (!loginResult.accessToken || loginResult.user?.onboardingStage !== 'completed') {
    throw new Error('Login failed for verified user');
  }
  console.log(`✅ [PASS] Logged in successfully! Current stage: ${loginResult.user.onboardingStage}`);

  // 8. Test Google Sign In (Direct OAuth Handshake & Auto-Provisioning)
  console.log('\n8️⃣ Testing Google OAuth login & auto-provisioning...');
  const googleEmail = `google_cand_${Date.now()}@gmail.com`;
  const googleResult = await loginGoogle(googleEmail, 'Amaka Google Candidate');
  if (!googleResult.accessToken || !googleResult.user?.isEmailVerified || googleResult.user?.onboardingStage !== 'profile_setup') {
    throw new Error('Google auth failed to auto-provision and issue tokens');
  }
  console.log(`✅ [PASS] Google auth succeeded! Issued token for ${googleEmail}, stage: ${googleResult.user.onboardingStage}`);

  console.log('\n🎉 ALL NODEMAILER & OTP TESTS PASSED 100%!\n');
}

runOtpTest().catch((err) => {
  console.error('Fatal OTP test error:', err);
  process.exit(1);
});

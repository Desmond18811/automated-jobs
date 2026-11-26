/** One definition of "finished onboarding", derived from the profile itself, never from a client-settable flag. */
export function isProfileComplete(profile: any): boolean {
  return !!(
    profile &&
    (profile.isSetupCompleted ||
      profile.setupCompleted ||
      profile.status === 'verified' ||
      (profile.fullName && profile.headline && profile.primarySkills?.length))
  );
}

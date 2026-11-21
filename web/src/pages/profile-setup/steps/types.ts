import type { UserProfile } from '@/types/profile';

export interface StepProps {
  draft: UserProfile;
  patch: (partial: Partial<UserProfile>) => void;
}

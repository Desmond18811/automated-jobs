import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { EMPTY_PROFILE, type UserProfile } from '@/types/profile';
import { profileApi } from '@/api';

interface ProfileContextType {
  profile: UserProfile;
  setProfile: (profile: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
  resetToDefault: () => void;
}

const STORAGE_KEY = 'javi_user_profile_v1';

const ProfileContext = createContext<ProfileContextType | null>(null);

export const ProfileProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.fullName || parsed.firstName || parsed.email) {
          return { ...EMPTY_PROFILE, ...parsed };
        }
      }
    } catch (err) {
      console.warn('Could not load profile from localStorage', err);
    }
    return EMPTY_PROFILE;
  });

  /** The server is the source of truth: replace local state with GET /profile, keeping only schema defaults underneath. */
  const refreshProfile = async () => {
    try {
      const res = await profileApi.get();
      const data = res?.profile || res;
      if (data && typeof data === 'object' && data.userId) {
        setProfileState({ ...EMPTY_PROFILE, ...data, rules: { ...EMPTY_PROFILE.rules, ...data.rules } });
      }
    } catch {
      // Unauthenticated or offline: keep local state
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn('Could not save profile to localStorage', err);
    }
  }, [profile]);

  const updateProfile = (partial: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...partial };
      if (partial.firstName || partial.lastName) {
        const fn = partial.firstName ?? prev.firstName;
        const ln = partial.lastName ?? prev.lastName;
        next.fullName = `${fn} ${ln}`.trim();
      }
      return next;
    });
  };

  const resetToDefault = () => {
    setProfileState(EMPTY_PROFILE);
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile: setProfileState, updateProfile, refreshProfile, resetToDefault }}>
      {children}
    </ProfileContext.Provider>
  );
};

export function useUserProfile(): ProfileContextType {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used within ProfileProvider');
  }
  return ctx;
}

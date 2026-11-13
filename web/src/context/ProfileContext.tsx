import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { DEFAULT_PROFILE, type UserProfile } from '@/types/profile';

interface ProfileContextType {
  profile: UserProfile;
  setProfile: (profile: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  resetToDefault: () => void;
}

const STORAGE_KEY = 'javi_user_profile_v1';

const ProfileContext = createContext<ProfileContextType | null>(null);

export const ProfileProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('Could not load profile from localStorage', err);
    }
    return DEFAULT_PROFILE;
  });

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
    setProfileState(DEFAULT_PROFILE);
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile: setProfileState, updateProfile, resetToDefault }}>
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

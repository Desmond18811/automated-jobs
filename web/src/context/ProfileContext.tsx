import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import { EMPTY_PROFILE, DEFAULT_PROFILE, type UserProfile } from '@/types/profile';
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
          return { ...DEFAULT_PROFILE, ...parsed };
        }
      }
    } catch (err) {
      console.warn('Could not load profile from localStorage', err);
    }
    return DEFAULT_PROFILE;
  });

  const refreshProfile = async () => {
    try {
      const res = await profileApi.get();
      const data = res?.profile || res;
      if (data && (data.email || data.fullName || data.firstName || data.headline || data.targetRoles?.length)) {
        setProfileState((prev) => {
          const merged = { ...prev, ...data };
          if (data.firstName || data.lastName) {
            merged.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.fullName || prev.fullName;
          }
          return merged;
        });
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
    setProfileState(DEFAULT_PROFILE);
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

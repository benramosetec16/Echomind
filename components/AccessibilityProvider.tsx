
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityPreferences, defaultPreferences, getAccessibilityPreferences, upsertAccessibilityPreferences } from '@/lib/accessibility';
import { createClient } from '@/utils/supabase/client';

type AccessibilityContextType = {
  preferences: Omit<AccessibilityPreferences, 'user_id'>;
  updatePreferences: (newPrefs: Partial<Omit<AccessibilityPreferences, 'user_id'>>) => Promise<void>;
  isLoading: boolean;
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  preferences: defaultPreferences,
  updatePreferences: async () => {},
  isLoading: true,
});

export const useAccessibility = () => useContext(AccessibilityContext);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage immediately to prevent flicker
    const cached = localStorage.getItem('accessibility_prefs');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setPreferences(parsed);
        applyPreferencesToDom(parsed);
      } catch (e) {}
    }

    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        const prefs = await getAccessibilityPreferences(session.user.id);
        if (prefs) {
          const { user_id, ...rest } = prefs;
          setPreferences(rest);
          localStorage.setItem('accessibility_prefs', JSON.stringify(rest));
          applyPreferencesToDom(rest);
        }
      }
      setIsLoading(false);
    };

    init();
  }, []);

  const applyPreferencesToDom = (prefs: Omit<AccessibilityPreferences, 'user_id'>) => {
    const root = document.documentElement;
    
    // High Contrast
    if (prefs.high_contrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced Motion
    if (prefs.reduced_motion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Font Size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-x-large');
    root.classList.add(ont-);
  };

  const updatePreferences = async (newPrefs: Partial<Omit<AccessibilityPreferences, 'user_id'>>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.setItem('accessibility_prefs', JSON.stringify(updated));
    applyPreferencesToDom(updated);

    if (userId) {
      await upsertAccessibilityPreferences({ ...updated, user_id: userId });
    }
  };

  return (
    <AccessibilityContext.Provider value={{ preferences, updatePreferences, isLoading }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

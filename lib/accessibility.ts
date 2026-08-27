
import { createClient } from '@/utils/supabase/client';

export type AccessibilityPreferences = {
  user_id: string;
  font_size: 'small' | 'medium' | 'large' | 'x-large';
  high_contrast: boolean;
  reduced_motion: boolean;
  simplified_interface: boolean;
  study_explanation_style: 'standard' | 'detailed' | 'step_by_step' | 'simplified';
  response_style: 'standard' | 'objective' | 'detailed';
};

export const defaultPreferences: Omit<AccessibilityPreferences, 'user_id'> = {
  font_size: 'medium',
  high_contrast: false,
  reduced_motion: false,
  simplified_interface: false,
  study_explanation_style: 'standard',
  response_style: 'standard',
};

export async function getAccessibilityPreferences(userId: string): Promise<AccessibilityPreferences | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accessibility_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching accessibility preferences:', error);
    return null;
  }
  
  return data as AccessibilityPreferences | null;
}

export async function upsertAccessibilityPreferences(prefs: Partial<AccessibilityPreferences> & { user_id: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accessibility_preferences')
    .upsert({ ...prefs, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error('Error updating accessibility preferences:', error);
    throw error;
  }
  
  return data;
}

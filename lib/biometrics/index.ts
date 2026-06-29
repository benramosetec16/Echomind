export type BiometricsData = {
  id?: string;
  user_id?: string;
  heart_rate: number | null;
  sleep_hours: number | null;
  energy_level: string | null;
  mood: string | null;
  created_at?: string;
};

export function isValidBiometrics(data: any): boolean {
  return data && 
         (data.heart_rate !== null || 
          data.sleep_hours !== null || 
          data.energy_level !== null || 
          data.mood !== null);
}

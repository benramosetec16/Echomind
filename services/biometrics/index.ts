import { createBrowserClient } from "@supabase/ssr";
import { BiometricsData } from "@/lib/biometrics";

export class BiometricsService {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async saveEntry(data: BiometricsData) {
    const { data: userData, error: authError } = await this.supabase.auth.getUser();
    if (authError || !userData?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await this.supabase.from("biometrics").insert({
      user_id: userData.user.id,
      heart_rate: data.heart_rate,
      sleep_hours: data.sleep_hours,
      energy_level: data.energy_level,
      mood: data.mood,
    });

    if (error) {
      console.error("Error saving biometrics:", error);
      throw error;
    }
  }

  async getHistory() {
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData?.user) return [];

    const { data, error } = await this.supabase
      .from("biometrics")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching biometrics history:", error);
      return [];
    }

    return data;
  }
}

export const biometricsService = new BiometricsService();

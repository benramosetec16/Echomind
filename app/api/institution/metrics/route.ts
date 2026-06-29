import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { hasInstitutionalAccess, type UserRole } from '../../../../utils/roles';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verify institutional access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as UserRole) || 'aluno';
    if (!hasInstitutionalAccess(role)) {
      return NextResponse.json({ error: 'Acesso negado. Permissão institucional necessária.' }, { status: 403 });
    }

    // Aggregate metrics — never exposing private data (no journal content, no personal info)
    const [
      totalUsersRes,
      totalCheckinsRes,
      totalJournalRes,
      totalLogsRes,
      recentCheckinsRes,
      moodDistributionRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('emotional_checkins').select('id', { count: 'exact', head: true }),
      supabase.from('aetheric_journal').select('id', { count: 'exact', head: true }),
      supabase.from('biometric_logs').select('id', { count: 'exact', head: true }),
      // Last 30 days checkins grouped by day for chart
      supabase
        .from('emotional_checkins')
        .select('created_at, valence_value')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),
      // Sentiment tag distribution (counts only, no names)
      supabase
        .from('aetheric_journal')
        .select('sentiment_tag, sentiment_dots'),
    ]);

    const totalUsers = totalUsersRes.count ?? 0;
    const totalCheckins = totalCheckinsRes.count ?? 0;
    const totalJournalEntries = totalJournalRes.count ?? 0;
    const totalBiometricLogs = totalLogsRes.count ?? 0;

    // Build daily check-in chart data (last 14 days)
    const dailyCheckins: Record<string, number> = {};
    const recentCheckins = recentCheckinsRes.data || [];
    recentCheckins.forEach(c => {
      const day = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyCheckins[day] = (dailyCheckins[day] || 0) + 1;
    });
    const dailyCheckinsChart = Object.entries(dailyCheckins).slice(-14).map(([date, count]) => ({ date, count }));

    // Average valence (mood)
    const avgValence = recentCheckins.length > 0
      ? Math.round(recentCheckins.reduce((acc, c) => acc + (c.valence_value || 0), 0) / recentCheckins.length)
      : 0;

    // Sentiment distribution (grouped, anonymized count)
    const sentimentCounts: Record<string, number> = {};
    (moodDistributionRes.data || []).forEach(j => {
      const tag = j.sentiment_tag || 'Outro';
      sentimentCounts[tag] = (sentimentCounts[tag] || 0) + 1;
    });
    const sentimentDistribution = Object.entries(sentimentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // Active users in last 7 days (count only)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabase
      .from('emotional_checkins')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    return NextResponse.json({
      totalUsers,
      totalCheckins,
      totalJournalEntries,
      totalBiometricLogs,
      activeUsersLast7Days: activeUsers ?? 0,
      avgValence,
      dailyCheckinsChart,
      sentimentDistribution,
    });

  } catch (error: any) {
    console.error('Erro na rota /api/institution/metrics:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

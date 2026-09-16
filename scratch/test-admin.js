require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing env vars');
    return;
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count: usersCount, error: countErr } = await supabaseClient
    .from('users')
    .select('*', { count: 'exact', head: true });

  console.log("count result:", { usersCount, countErr });

  const { data: users, error: usersErr } = await supabaseClient.from('users').select('progress_data');
  console.log("users data length:", users ? users.length : 0);

  let totalProgress = 0;
  let progressCount = 0;
  const gameStats = {};

  (users || []).forEach(u => {
    const pData = u.progress_data || [];
    pData.forEach(game => {
      if (!game.title) return;
      const prog = Number(game.progress) || 0;
      totalProgress += prog;
      progressCount++;
      
      if (!gameStats[game.title]) {
        gameStats[game.title] = { id: game.title, title: game.title, players: 0, totalProgress: 0, status: "Live", genre: "Action" };
      }
      gameStats[game.title].players += 1;
      gameStats[game.title].totalProgress += prog;
    });
  });

  const avgProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;
  
  const realGames = Object.values(gameStats).map(g => ({
    ...g,
    progress: Math.round(g.totalProgress / g.players)
  })).sort((a, b) => b.players - a.players);

  const activePlayers = (users || []).filter(u => u.progress_data && u.progress_data.length > 0).length;

  console.log("summary:", JSON.stringify({
    users: usersCount || 0,
    activePlayers,
    averageProgress: avgProgress,
    games: realGames
  }, null, 2));
}

test().catch(console.error);

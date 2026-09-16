require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseClient.from('games').select('*').limit(1);
  console.log("Games table:", data ? "Exists" : "Does not exist", error ? error.message : "");
}

test().catch(console.error);

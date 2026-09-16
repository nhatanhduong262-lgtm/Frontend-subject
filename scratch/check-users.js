require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await supabaseClient.from('users').select('id');
  if (error) {
    console.error("Error fetching users:", error.message);
  } else {
    console.log("Total users in DB:", users.length);
  }
}

test().catch(console.error);

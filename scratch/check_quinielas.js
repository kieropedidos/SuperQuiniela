const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfkjztfztpayeznqrtrv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma2p6dGZ6dHBheWV6bnFydHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjM2NDcsImV4cCI6MjA5NTgzOTY0N30.iuvC52JHU7ttofkueVzBLrWKIEzC4COm0RVySGbPXrk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('user_quinielas')
    .select(`
      id,
      user_id,
      status,
      alias_name,
      profiles (username)
    `);

  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Quinielas in DB:');
    data.forEach(q => {
      console.log(`ID: ${q.id} | User: ${q.profiles?.username} | Status: ${q.status} | Alias: ${q.alias_name}`);
    });
  }
}

check();

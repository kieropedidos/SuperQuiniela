const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfkjztfztpayeznqrtrv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma2p6dGZ6dHBheWV6bnFydHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjM2NDcsImV4cCI6MjA5NTgzOTY0N30.iuvC52JHU7ttofkueVzBLrWKIEzC4COm0RVySGbPXrk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: officialMatches, error: err } = await supabase
    .from('official_matches')
    .select('*');
    
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log(`Partidos oficiales registrados: ${officialMatches.length}`);
  const withScore = officialMatches.filter(m => m.home_goals !== null && m.away_goals !== null);
  console.log(`Partidos con resultado guardado: ${withScore.length}`);
  if (withScore.length > 0) {
    console.log('Marcadores registrados:', withScore.map(m => `${m.match_id}: ${m.home_goals}-${m.away_goals}`));
  }
}

check();

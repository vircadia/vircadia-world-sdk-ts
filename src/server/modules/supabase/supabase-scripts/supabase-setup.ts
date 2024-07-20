import Supabase from '../supabase';

async function main() {
    const supabase = new Supabase();
    await supabase.setupSupabase();
}

main().catch(console.error);
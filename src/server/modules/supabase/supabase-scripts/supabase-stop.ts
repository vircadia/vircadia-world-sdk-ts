import Supabase from '../supabase';

async function main() {
    const supabase = new Supabase();
    await supabase.stop();
}

main().catch(console.error);
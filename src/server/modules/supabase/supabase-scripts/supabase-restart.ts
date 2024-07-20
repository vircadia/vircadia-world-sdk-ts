import Supabase from '../supabase';

async function main() {
    const supabase = new Supabase();
    await supabase.restart();
}

main().catch(console.error);
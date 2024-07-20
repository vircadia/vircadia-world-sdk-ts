import Supabase from '../supabase';

async function main() {
    const supabase = new Supabase();
    await supabase.start();
}

main().catch(console.error);
import Supabase from '../supabase';

async function main() {
    const supabase = new Supabase();
    await supabase.resyncConfiguration();
}

main().catch(console.error);
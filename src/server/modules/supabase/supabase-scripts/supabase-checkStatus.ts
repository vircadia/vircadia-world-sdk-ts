import Supabase from '../supabase';

async function main() {
    const supabase = new Supabase();
    await supabase.checkStatus();
}

main().catch(console.error);
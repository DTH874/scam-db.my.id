import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Ambil data dari request (tidak perlu auth lagi karena sudah login sebelumnya)
    // Namun kita bisa tambahkan validasi sederhana dengan header session, untuk keamanan lebih.
    const { phone, name, amount, reason, info_link, proof_url, date_added } = req.body;
    
    // Validasi proof_url
    if (proof_url && !proof_url.startsWith('https://top4top.io/')) {
        return res.status(400).json({ success: false, error: 'Bukti URL hanya boleh dari top4top.io' });
    }
    
    const supabaseUrl = process.env.supa_PROJECT_URL;
    const supabaseKey = process.env.Supa_api_key;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase.from('scammers').insert([{
        phone, name, amount, reason, info_link, proof_url, date_added
    }]);
    
    if (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
    
    return res.status(200).json({ success: true });
}

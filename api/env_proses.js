// BY POLOSS

export default async function handler(req, res){

    res.status(200).json({
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });

}

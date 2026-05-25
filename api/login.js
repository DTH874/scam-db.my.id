export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { username, password, recaptchaToken } = req.body;
    
    // Ambil dari environment variables (TIDAK TERLIHAT DI CLIENT)
    const ADMIN_USER = process.env.Admin_uSername;
    const ADMIN_PASS = process.env.Admin_pasword;
    const RECAPTCHA_SECRET = process.env.reCAPTCHA_secreatkey;
    
    // Verifikasi reCAPTCHA terlebih dahulu
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`;
    const verifyRes = await fetch(verifyUrl, { method: 'POST' });
    const verifyData = await verifyRes.json();
    
    if (!verifyData.success) {
        return res.status(401).json({ success: false, error: 'reCAPTCHA tidak valid' });
    }
    
    // Verifikasi kredensial admin
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Buat session token sederhana (bisa gunakan JWT, namun untuk demo cukup)
        return res.status(200).json({ success: true });
    } else {
        return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
}

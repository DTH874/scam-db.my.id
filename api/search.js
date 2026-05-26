// BY POLOSS

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/*
# ============= ESCAPE HTML =============
*/

function escapeHtml(text = "") {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/*
# ============= VALIDASI URL BUKTI =============
# HANYA TOP4TOP
*/

function validTop4top(url = "") {

    return /^https:\/\/top4top\.io\/.+$/i.test(
        String(url).trim()
    );

}

/*
# ============= VALIDASI INFO URL =============
# HANYA PASTEBIN / PASTEFY
*/

function validInfo(url = "") {

    if (!url) return true;

    return /^(https:\/\/pastebin\.com\/|https:\/\/pastefy\.app\/).+$/i.test(
        String(url).trim()
    );

}

/*
# ============= VALIDASI SEARCH =============
*/

function validSearch(input = "") {

    const value = String(input).trim();

    if (value.length < 1 || value.length > 100) {
        return false;
    }

    return /^[a-zA-Z0-9_\-\s+]+$/i.test(value);

}

/*
# ============= VERIFY GOOGLE RECAPTCHA =============
*/

async function verifyRecaptcha(token) {

    try {

        const response = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    secret: process.env.RECHAPCA_SECREAT_KEY,
                    response: token
                })
            }
        );

        return await response.json();

    } catch {

        return {
            success: false
        };

    }

}

/*
# ============= VERIFY CLOUDFLARE TURNSTILE =============
*/

async function verifyCloudflare(token, ip) {

    try {

        const response = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    secret: process.env.CL_TRL,
                    response: token,
                    remoteip: ip
                })
            }
        );

        return await response.json();

    } catch {

        return {
            success: false
        };

    }

}

/*
# ============= MAIN HANDLER =============
*/

export default async function handler(req, res) {

    /*
    # ============= RESPONSE JSON ONLY =============
    */

    res.setHeader(
        "Content-Type",
        "application/json"
    );

    /*
    # ============= SECURITY HEADERS =============
    */

    res.setHeader(
        "Cache-Control",
        "no-store"
    );

    try {

        /*
        # ============= METHOD CHECK =============
        */

        if (req.method !== "POST") {

            return res.status(405).json({
                status: false,
                message: "Method not allowed"
            });

        }

        /*
        # ============= BODY CHECK =============
        */

        const body = req.body || {};

        const search = String(
            body.search || ""
        ).trim();

        const recaptchaToken = String(
            body.recaptchaToken || ""
        ).trim();

        const cloudflareToken = String(
            body.cloudflareToken || ""
        ).trim();

        if (
            !search ||
            !recaptchaToken ||
            !cloudflareToken
        ) {

            return res.status(400).json({
                status: false,
                message: "Bad request"
            });

        }

        /*
        # ============= INPUT VALIDATION =============
        */

        if (!validSearch(search)) {

            return res.status(403).json({
                status: false,
                message: "Invalid input"
            });

        }

        /*
        # ============= CLIENT IP =============
        */

        const clientIp =
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
            || "0.0.0.0";

        /*
        # ============= VERIFY RECAPTCHA =============
        */

        const recaptcha = await verifyRecaptcha(
            recaptchaToken
        );

        if (!recaptcha.success) {

            return res.status(403).json({
                status: false,
                message: "reCAPTCHA failed"
            });

        }

        /*
        # ============= VERIFY CLOUDFLARE =============
        */

        const cloudflare = await verifyCloudflare(
            cloudflareToken,
            clientIp
        );

        if (!cloudflare.success) {

            return res.status(403).json({
                status: false,
                message: "Cloudflare failed"
            });

        }

        /*
        # ============= QUERY BUILD =============
        */

        let query = supabase
            .from("scammer_db")
            .select(`
                nomor_hp,
                nama,
                nominal,
                alasan,
                info_lain,
                bukti,
                tanggal
            `)
            .limit(50);

        /*
        # ============= SEARCH PHONE =============
        */

        if (/^62\d{6,20}$/.test(search)) {

            query = query.eq(
                "nomor_hp",
                search
            );

        }

        /*
        # ============= SEARCH NAME =============
        */

        else {

            query = query.ilike(
                "nama",
                `%${search}%`
            );

        }

        /*
        # ============= EXECUTE QUERY =============
        */

        const {
            data,
            error
        } = await query;

        if (error) {

            return res.status(500).json({
                status: false,
                message: "Database error"
            });

        }

        /*
        # ============= SAFE OUTPUT =============
        */

        const safeData = (data || []).map((item) => ({

            nomor_hp: escapeHtml(
                item.nomor_hp || ""
            ),

            nama: escapeHtml(
                item.nama || ""
            ),

            nominal: escapeHtml(
                item.nominal || ""
            ),

            alasan: escapeHtml(
                item.alasan || ""
            ),

            info_lain: validInfo(item.info_lain)
                ? item.info_lain
                : "",

            bukti: validTop4top(item.bukti)
                ? item.bukti
                : "",

            tanggal: escapeHtml(
                item.tanggal || ""
            )

        }));

        /*
        # ============= SUCCESS =============
        */

        return res.status(200).json({
            status: true,
            total: safeData.length,
            result: safeData
        });

    } catch (err) {

        /*
        # ============= ERROR =============
        */

        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });

    }

}

// BY POLOSS

import { createClient } from "@supabase/supabase-js";

/*
# ============= SUPABASE CLIENT =============
*/

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            headers: {
                "X-Client-Info": "scammer-db"
            }
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
# ============= VALID URL TOP4TOP =============
*/

function validTop4top(url = "") {

    return /^https:\/\/top4top\.io\/[a-zA-Z0-9/_\-.]+$/i.test(
        String(url).trim()
    );

}

/*
# ============= VALID URL INFO =============
*/

function validInfo(url = "") {

    if (!url) {
        return true;
    }

    return /^(https:\/\/pastebin\.com\/|https:\/\/pastefy\.app\/)[a-zA-Z0-9/_\-?.=&]+$/i.test(
        String(url).trim()
    );

}

/*
# ============= VALID SEARCH =============
*/

function validSearch(input = "") {

    const value = String(input)
        .replace(/\s+/g, " ")
        .trim();

    if (
        value.length < 1 ||
        value.length > 100
    ) {
        return false;
    }

    return /^[a-zA-Z0-9_\-+\s]+$/i.test(value);

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

        const data = await response.json();

        return data;

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
    # ============= SECURITY HEADERS =============
    */

    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
    );

    res.setHeader(
        "Pragma",
        "no-cache"
    );

    res.setHeader(
        "Expires",
        "0"
    );

    try {

        /*
        # ============= METHOD VALIDATION =============
        */

        if (req.method !== "POST") {

            return res.status(405).json({
                status: false,
                message: "Method not allowed"
            });

        }

        /*
        # ============= BODY VALIDATION =============
        */

        const body =
            typeof req.body === "object"
            && req.body !== null
                ? req.body
                : {};

        const search = String(
            body.search || ""
        )
            .replace(/\s+/g, " ")
            .trim();

        const cloudflareToken = String(
            body.cloudflareToken || ""
        ).trim();

        if (
            !search ||
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
            req.headers["cf-connecting-ip"]
            || req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
            || "0.0.0.0";

        /*
        # ============= VERIFY TURNSTILE =============
        */

        const cloudflare = await verifyCloudflare(
            cloudflareToken,
            clientIp
        );

        if (!cloudflare.success) {

            return res.status(403).json({
                status: false,
                message: "Cloudflare verification failed"
            });

        }

        /*
        # ============= BUILD QUERY =============
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
        # ============= PHONE SEARCH =============
        */

        if (/^62\d{6,20}$/.test(search)) {

            query = query.eq(
                "nomor_hp",
                search
            );

        }

        /*
        # ============= NAME SEARCH =============
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

        const safeData = Array.isArray(data)
            ? data.map((item) => ({

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

                info_lain:
                    validInfo(item.info_lain)
                        ? item.info_lain
                        : "",

                bukti:
                    validTop4top(item.bukti)
                        ? item.bukti
                        : "",

                tanggal: escapeHtml(
                    item.tanggal || ""
                )

            }))
            : [];

        /*
        # ============= SUCCESS RESPONSE =============
        */

        return res.status(200).json({
            status: true,
            total: safeData.length,
            result: safeData
        });

    } catch {

        /*
        # ============= INTERNAL ERROR =============
        */

        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });

    }

}

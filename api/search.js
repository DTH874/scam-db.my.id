// BY POLOSS

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function escapeHtml(text = "") {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

function validTop4top(url = "") {

    return /^https:\/\/top4top\.io\/.+/i.test(url);

}

function validInfo(url = "") {

    if (!url) return true;

    return /^(https:\/\/pastebin\.com\/|https:\/\/pastefy\.app\/).+/i.test(url);

}

function validSearch(input = "") {

    return /^[a-zA-Z0-9_\-\s+]{1,100}$/.test(input);

}

async function verifyRecaptcha(token) {

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

}

async function verifyCloudflare(token, ip) {

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

}

export default async function handler(req, res) {

    try {

        if (req.method !== "POST") {

            return res.status(405).json({
                status: false,
                message: "Method not allowed"
            });

        }

        const {
            search,
            recaptchaToken,
            cloudflareToken
        } = req.body;

        if (!search || !recaptchaToken || !cloudflareToken) {

            return res.status(400).json({
                status: false,
                message: "Bad request"
            });

        }

        if (!validSearch(search)) {

            return res.status(403).json({
                status: false,
                message: "Invalid input"
            });

        }

        const clientIp = req.headers["x-forwarded-for"] || "0.0.0.0";

        const recaptcha = await verifyRecaptcha(recaptchaToken);

        if (!recaptcha.success) {

            return res.status(403).json({
                status: false,
                message: "reCAPTCHA failed"
            });

        }

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

        let query = supabase
            .from("scammer_db")
            .select("*")
            .limit(50);

        if (/^62\d+$/.test(search)) {

            query = query.eq("nomor_hp", search);

        } else {

            query = query.ilike("nama", `%${search}%`);

        }

        const { data, error } = await query;

        if (error) {

            return res.status(500).json({
                status: false,
                message: error.message
            });

        }

        const safeData = data.map((item) => ({

            nomor_hp: escapeHtml(item.nomor_hp || ""),

            nama: escapeHtml(item.nama || ""),

            nominal: escapeHtml(item.nominal || ""),

            alasan: escapeHtml(item.alasan || ""),

            info_lain: validInfo(item.info_lain)
                ? item.info_lain
                : "",

            bukti: validTop4top(item.bukti)
                ? item.bukti
                : "",

            tanggal: item.tanggal

        }));

        return res.status(200).json({
            status: true,
            result: safeData
        });

    } catch (err) {

        return res.status(500).json({
            status: false,
            message: err.message
        });

    }

}

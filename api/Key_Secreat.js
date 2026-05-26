// BY POLOSS

export default async function handler(req, res) {

    return res.status(403).json({
        status: false,
        message: "FORBIDDEN"
    });

}

const { default: axios } = require('axios');
const express = require('express');
const router = express.Router();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:5173/callback";
const jwt = require('jsonwebtoken')
const Token = require("../../models/Token")
// import jwt from "jsonwebtoken";
// import Token from "../../models/Token";

// discord login
router.post("/discord/callback", async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
        // Đổi code -> access_token
        const tokenResponse = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: REDIRECT_URI,
                scope: "identify guilds",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token, token_type } = tokenResponse.data;

        // Lấy profile user
        const userResponse = await axios.get("https://discord.com/api/users/@me", {
            headers: { Authorization: `${token_type} ${access_token}` },
        });

        // Lấy danh sách guilds
        const guildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `${token_type} ${access_token}` },
        });
        const payload = {
            id: userResponse.data.id,
            username: userResponse.data.username,
            discriminator: userResponse.data.discriminator,
            avatar: userResponse.data.avatar,
        };

        const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
        const expiresInDays = 7;
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        const token = await Token.create({
            isExpired: false,
            userId: userResponse.data.id,
            token: newToken,
            discordToken: access_token,
            expiresAt
        });
        console.log(token)
        // lưu token vào cookie
        // res.cookie("access_token", access_token, {
        //     httpOnly: true,
        //     secure: true, // bật true khi chạy HTTPS
        //     sameSite: "none",
        //     maxAge: 7000 * 60 * 60 * 24, // 1 ngày
        // });
        console.log(req.cookies.access_token)
        res.json({
            user: userResponse.data,
            guilds: guildsResponse.data,
            token: newToken, // hoặc bỏ nếu mày muốn tự generate JWT riêng
        });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to authenticate" });
    }
});

router.post("/infor", async (req, res) => {
    try {
        const {token} = req.body
        console.log("Token",token)
        // tìm token trong DB
        const tokenRow = await Token.findOne({ token });
        console.log(tokenRow)
        if (!tokenRow) {
            return res.status(400).json({ error: "Token not found" });
        }
        if (tokenRow.isExpired) {
            return res.status(400).json({ error: "Token is expired" });
        }

        const access_token = tokenRow.discordToken;

        // gọi API Discord lấy user info
        const userResponse = await axios.get("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        res.json(userResponse.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch user info" });
    }
});

module.exports = router;
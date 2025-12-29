const { default: axios } = require('axios');
const express = require('express');
const router = express.Router();

router.get('/transcript', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).send("Thiếu URL");
        }

        // BẢO MẬT: Chỉ cho phép tải từ domain của Discord để tránh bị lợi dụng
        const allowedDomains = ['cdn.discordapp.com', 'media.discordapp.net'];
        const targetUrl = new URL(url);
        
        if (!allowedDomains.includes(targetUrl.hostname)) {
            return res.status(403).send("Domain không hợp lệ");
        }

        // Tải nội dung file từ Discord (Server-to-Server)
        const response = await axios.get(url, {
            responseType: 'text' // Chúng ta cần lấy nội dung HTML dạng text
        });

        // Trả về nội dung HTML cho React
        res.setHeader('Content-Type', 'text/html');
        res.send(response.data);

    } catch (error) {
        console.error("Lỗi proxy transcript:", error.message);
        res.status(500).send("Không thể tải transcript");
    }
});

module.exports = router;
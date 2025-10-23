const crypto = require("crypto");
const axios = require("axios");

const express = require('express');
const Payment = require("../../models/Payment");
const { authenticateToken } = require("../../utils/checkPermission");
const Token = require("../../models/Token");
const User = require("../../models/User");
const UserService = require("../../services/userService");
const { wolfCoin, wolfToken } = require("../../utils/wolfCoin");
const router = express.Router();

// const MOMO_CONFIG = {
//     partnerCode: process.env.MO_PARTNER_CODE,
//     accessKey: process.env.MO_ACCESS_KEY,
//     secretKey: process.env.MO_SECRET_KEY,
//     redirectUrl: process.env.FE_URL + "/payment/success",
//     ipnUrl: process.env.BE_URL + "/api/v1/momo/callback", // callback
//     endpoint: process.env.MO_ENDPOINT
// };



router.post('/', async function (req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token không được cung cấp'
            });
        }

        const tokenDoc = await Token.findOne({
            token: token,
            isExpired: false,
            expiresAt: { $gt: new Date() }
        });

        if (!tokenDoc) {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }

        const userId = tokenDoc.userId

        const { amount, orderInfo } = req.body;
        let partnerCode = process.env.MO_PARTNER_CODE
        let accessKey = process.env.MO_ACCESS_KEY
        let secretKey = process.env.MO_SECRET_KEY
        let redirectUrl = process.env.FE_URL + "/payment/success"
        let ipnUrl = process.env.BE_URL + "/api/v1/momo/callback" // callback
        let endpoint = process.env.MO_ENDPOINT
        // console.log(partnerCode)
        if (!userId || !amount || !orderInfo) {
            return res.status(400).json({ code: '01', message: 'Thiếu thông tin bắt buộc' })
        }
        // const orderId =  moment(date).format('DDHHmmss') ;
        const payment = await Payment.create({ userId, amount, orderInfo, status: 'pending', ortherType: 'momo_wallet' });
        const orderId = payment._id.toString()
        const requestId = `${orderId}-${userId}`;


        const rawSignature =
            `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex");

        const requestBody = {
            partnerCode: partnerCode,
            partnerName: "Keldo",
            storeId: "Keldo Discord Bot",
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            lang: "vi",
            requestType: "captureWallet",
            autoCapture: true,
            extraData: "",
            signature
        };

        const response = await axios.post(endpoint, requestBody);

        return res.json({
            payUrl: response.data.payUrl,
            ...response.data
        });
    } catch (err) {
        console.log("MO_PARTNER_CODE =", process.env.MONGODB_URI);

        console.error(err);
        res.status(500).json({ error: "MoMo payment creation failed" });
    }
});

router.post("/callback", async (req, res) => {
    const data = req.body;

    console.log("MoMo callback:", data);

    const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
    } = data;

    // 🔐 Tạo rawSignature để xác minh lại
    const rawSignature = `accessKey=${process.env.MO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    // 🔑 Tạo chữ ký của backend để so sánh
    const serverSignature = crypto
        .createHmac("sha256", process.env.MO_SECRET_KEY)
        .update(rawSignature)
        .digest("hex");

    // ❌ Nếu chữ ký không khớp → reject (có thể là fake)
    if (serverSignature !== signature) {
        console.warn("❌ MoMo callback signature mismatch! Possible fake call.");
        return res.status(400).json({ message: "Invalid signature" });
    }
    console.log("Sv", serverSignature)
    console.log("Call", signature)
    const payment = await Payment.findById(orderId)
    if (payment.status === 'paid' || payment.status === 'failed') {
        return res.status(200).json({ message: 'Already processed' });
    }

    if (!payment)
        console.log("❌ Thanh toán thất bại cho đơn hàng ${orderId}")
    // ✅ Chữ ký hợp lệ → xử lý logic thanh toán

    if (resultCode === 0) {
        Object.assign(payment, {
            payType: payType,
            requestId: requestId,
            status: 'paid',
            transId: transId,
            paymentDate: Date.now(),
        })
        await payment.save()
        // const user = await UserService.findUserById(payment.userId)
        // if (payment.type == 'token') {
        const tokenAmount = Math.floor(payment.amount / 1000);
        let bonus = 0;
        if (tokenAmount >= 1000) bonus = tokenAmount / 10;
        const total = tokenAmount + bonus
        await UserService.addToken(payment.userId, total);
        console.log(`✅ Thanh toán thành công cho đơn hàng ${orderId}`);
        // }
    } else {
        console.log(`❌ Thanh toán thất bại cho đơn hàng ${orderId}`);
        Object.assign(payment, {
            payType: payType || "None",
            requestId: requestId || "None",
            transId: transId || "None",
            status: "failed",
        });
        await payment.save()
        // Cập nhật DB: set status = 'FAILED'
    }
    const client = req.app.get('discordClient');
    // gửi thông báo đến user trong discord
    client.users.fetch(payment.userId).then(user => {
        if (resultCode === 0) {
            let bonus = 0
            const tokenAmount = Math.floor(payment.amount / 1000);

            if (tokenAmount >= 1000) bonus = tokenAmount / 10;
            user.send(`🎉 Thanh toán thành công! Bạn đã nạp **${payment.amount} VND** tương ứng với **${wolfToken(tokenAmount)}${bonus > 0 ? " +" + wolfToken(bonus):""}** vào tài khoản.`);
        } else {
            user.send(`❌ Thanh toán không thành công. Vui lòng thử lại sau.`);
        }
    });
    return res.status(200).json({ message: "Callback verified" });
});

module.exports = router;
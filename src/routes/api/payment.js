// src/routes/api/health.js
const express = require('express');
const router = express.Router();
const moment = require('moment');
const Payment = require('../../models/Payment');
const UserService = require('../../services/userService');

router.post('/create_vnpay', function (req, res, next) {
    console.log("Create")
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    if (!req.body.userId || !req.body.amount) {
        return res.status(400).json({ code: '01', message: 'Thiếu thông tin bắt buộc' })
    }
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');

    let ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    let tmnCode = process.env.VNP_TMN_CODE;
    let secretKey = process.env.VNP_HASH_SECRET;
    let vnpUrl = process.env.VNP_URL;
    let returnUrl = process.env.VNP_RETURN_URL;
    let orderId = moment(date).format('DDHHmmss') + req.body.userId;
    let amount = req.body.amount;
    // let bankCode = req.body.bankCode;

    let locale = req.body.language;
    if (locale === null || locale === '') {
        locale = 'vn';
    }
    let currCode = 'VND';
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toán Keldo:' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    // if (bankCode !== null && bankCode !== '') {
    //     vnp_Params['vnp_BankCode'] = bankCode;
    // }
    Payment.create({
        userId: req.body.userId,
        orderId: orderId,
        amount: amount,
        status: 'pending'
    })

    vnp_Params = sortObject(vnp_Params);

    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require("crypto");
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
    res.status(200).json({ code: '00', data: vnpUrl });
    // res.redirect(vnpUrl)
});

router.get('/vnpay_return', async function (req, res, next) {
    let vnp_Params = { ...req.query }; // ✅ ép thành object thường

    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = process.env.VNP_HASH_SECRET;

    const querystring = require('qs');
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    let redirectUrl = '';
    const payment = await Payment.findOne({ orderId: vnp_Params['vnp_TxnRef'] });
    if (secureHash === signed) {
        // kiểm tra dữ liệu trong DB nếu cần
        // res.render('success', { code: vnp_Params['vnp_ResponseCode'] });
        // Payment.findOne({ orderId: vnp_Params['vnp_TxnRef'] }).then(async (payment) => {
        //     if (payment) {
        //         if (vnp_Params['vnp_ResponseCode'] === '00') {
        //             payment.status = 'completed';
        //             payment.paymentDate = new Date();
        //             await payment.save();
        //             // Cộng tiền cho user
        //             // await UserService.addBalance(payment.userId, payment.amount);
        //             // quy đổi tiền tệ 10000 VND = 10 token
        //             const tokenAmount = Math.floor(payment.amount / 1000);
        //             await UserService.addToken(payment.userId, tokenAmount);
        //         } else {
        //             payment.status = 'failed';
        //             await payment.save();
        //         }
        //     }
        // });
        if (payment) {
            if (vnp_Params['vnp_ResponseCode'] === '00') {
                payment.status = 'completed';
                payment.paymentDate = new Date();
                await payment.save();
                // Cộng tiền cho user
                // await UserService.addBalance(payment.userId, payment.amount);
                // quy đổi tiền tệ 10000 VND = 10 token
                const tokenAmount = Math.floor(payment.amount / 1000);
                await UserService.addToken(payment.userId, tokenAmount);
            } else {
                payment.status = 'failed';
                await payment.save();
            }
        }
        redirectUrl = `${process.env.FE_URL}/payment/success`;
        // res.redirect(redirectUrl);
    } else {
        // res.render('success', { code: '97' });
        redirectUrl = `${process.env.FE_URL}/payment/fail`;
        // res.redirect(redirectUrl);
    }
    const client = req.app.get('discordClient');
    // gửi thông báo đến user trong discord
    client.users.fetch(payment.userId).then(user => {
        if (vnp_Params['vnp_ResponseCode'] === '00') {
            user.send(`🎉 Thanh toán thành công! Bạn đã nạp **${payment.amount} VND** tương ứng với **${Math.floor(payment.amount / 1000)} token** vào tài khoản.`);
        } else {
            user.send(`❌ Thanh toán không thành công. Vui lòng thử lại sau.`);
        }
    });

    res.redirect(redirectUrl);
});

function sortObject(obj) {
    let sorted = {};
    let str = [];

    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }

    str.sort();
    for (let i = 0; i < str.length; i++) {
        let key = str[i];
        sorted[key] = encodeURIComponent(obj[decodeURIComponent(key)]).replace(/%20/g, "+");
    }

    return sorted;
}



module.exports = router;
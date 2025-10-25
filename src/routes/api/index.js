const express = require('express');
const router = express.Router();
const botRoutes = require('./bot');
const healthRoutes = require('./heath');
const authRoutes = require('./auth'); // Nếu có route xác thực
const guildRoutes = require('./guild')
const petRoutes = require('./pet')
const paymentRoutes = require('./payment')
const guildSettingRoutes = require('./guildSetting')
const momoRoutes = require('./momo')
const actionRoutes = require('./action')
// const giveawayRoutes = require('./giveaway'); // Nếu có route cho GA

// Group API routes
// router.use('/auth', authRoutes);
router.use('/bot', botRoutes);
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/guild', guildRoutes)
router.use('/pet', petRoutes)
router.use('/payment', paymentRoutes)
router.use('/server', guildSettingRoutes)
router.use('/momo',momoRoutes)
router.use('/action',actionRoutes)

// router.use('/giveaway', giveawayRoutes); // Nếu có route cho GA

// Nếu có các route khác, thêm vào đây
// router.use('/other', otherRoutes);

module.exports = router;
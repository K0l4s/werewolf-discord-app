const express = require('express');
const router = express.Router();
const botRoutes = require('./bot');
const healthRoutes = require('./heath');
const authRoutes = require('./auth'); // Nếu có route xác thực
const guildRoutes = require('./guild')
const petRoutes = require('./pet')
// Group API routes
// router.use('/auth', authRoutes);
router.use('/bot', botRoutes);
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/guild',guildRoutes)
router.use('/pet',petRoutes)
module.exports = router;
const express = require('express');
const router = express.Router();
const botRoutes = require('./bot');
const healthRoutes = require('./heath');
// const authRoutes = require('./auth'); // Nếu có route xác thực

// Group API routes
// router.use('/auth', authRoutes);
router.use('/bot', botRoutes);
router.use('/health', healthRoutes);

module.exports = router;
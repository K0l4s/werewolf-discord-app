const express = require('express');
const router = express.Router();

// Import tất cả routes
const apiRoutes = require('./api');
// const webRoutes = require('./web');

// Group routes
router.use('/api/v1', apiRoutes);
// router.use('/', webRoutes);

module.exports = router;
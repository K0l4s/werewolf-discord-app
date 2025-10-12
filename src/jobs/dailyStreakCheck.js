// jobs/dailyStreakCheck.js
const cron = require('node-cron');
const StreakService = require('../services/StreakService');

function setupDailyStreakCheck() {
  // Chạy mỗi ngày lúc 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Đang kiểm tra chuỗi hàng ngày...');
    
    try {
      const brokenCount = await StreakService.checkDailyStreaks();
      console.log(`✅ Đã kiểm tra xong. Số chuỗi bị ngắt: ${brokenCount}`);
    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra chuỗi:', error);
    }
  });
}

module.exports = { setupDailyStreakCheck };
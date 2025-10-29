// jobs/dailyStreakCheck.js
const cron = require('node-cron');
const StreakService = require('../services/StreakService');
const Giveaway = require('../models/Giveaway');

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


async function cleanDailyGiveaway() {
  console.log("✅ Lên lịch xóa giveaway định kỳ hằng ngày!");

  // Chạy lúc 00:00 mỗi ngày
  cron.schedule('0 0 * * *', async () => {
    await cleanGA()
  });
}

async function cleanGA() {
  console.log('🔄 Đang dọn dẹp giveaway...');

  try {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Truy vấn theo batch để tránh tốn RAM
    const batchSize = 1000;
    let totalDeleted = 0;
    let skip = 0;

    while (true) {
      // Lấy 1 batch giveaway đã kết thúc
      const giveaways = await Giveaway.find({
        status: Giveaway.GA_STATUS.ENDED,
        approvedAt: { $exists: true },
      })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(batchSize)
        .select('winners approvedAt duration');

      if (giveaways.length === 0) break;

      const bulkOps = [];

      for (const ga of giveaways) {
        const allClaimed = ga.winners.length > 0 && ga.winners.every(w => w.claimed);
        const endTime = new Date(ga.approvedAt.getTime() + ga.duration * 1000);

        // Điều kiện xóa:
        // 1. Đã claim hết toàn bộ winner
        // 2. Hoặc kết thúc hơn 10 ngày
        if (allClaimed || endTime < tenDaysAgo) {
          bulkOps.push({
            deleteOne: { filter: { _id: ga._id } }
          });
        }
      }

      if (bulkOps.length > 0) {
        const result = await Giveaway.bulkWrite(bulkOps, { ordered: false });
        totalDeleted += result.deletedCount || 0;
      }

      // Dừng nếu batch chưa đủ => hết data
      if (giveaways.length < batchSize) break;
      skip += batchSize;
    }

    console.log(`✅ Đã xóa ${totalDeleted} giveaway dư thừa thành công!`);
  } catch (error) {
    console.error('❌ Lỗi khi xóa giveaway:', error);
  }
}


module.exports = { setupDailyStreakCheck, cleanDailyGiveaway, cleanGA };
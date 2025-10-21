// services/streakService.js

const UserStreak = require("../models/userStreak");

class StreakService {
  // Kiểm tra và cập nhật chuỗi khi user join voice
  async handleUserJoin(userId, guildId) {
    try {
      let userStreak = await UserStreak.findOne({ userId, guildId });
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Lấy ngày hôm nay (bỏ giờ)

      if (!userStreak) {
        // Tạo mới user streak
        userStreak = new UserStreak({
          userId,
          guildId,
          streakStartDate: now,
          lastJoinDate: now,
          currentStreak: 1,
          longestStreak: 1,
          totalDaysJoined: 1
        });

        await userStreak.save();
        return { action: 'created', streak: userStreak };
      }

      const lastJoin = new Date(userStreak.lastJoinDate);
      const lastJoinDay = new Date(lastJoin.getFullYear(), lastJoin.getMonth(), lastJoin.getDate()); // Lấy ngày của lastJoin (bỏ giờ)

      // Reset recovery count nếu sang tháng mới
      await this.resetMonthlyRecovery(userStreak, now);

      // Kiểm tra xem hôm nay đã join chưa
      if (lastJoinDay.getTime() === today.getTime()) {
        // Đã join trong ngày hôm nay
        return { action: 'already_joined', streak: userStreak };
      }

      // Kiểm tra xem có phải ngày tiếp theo không
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastJoinDay.getTime() === yesterday.getTime()) {
        // Join liên tục - tăng chuỗi
        return await this.incrementStreak(userStreak, now);
      } else {
        // Bị ngắt chuỗi
        
        const daysSinceLastJoin = this.getDaysDifference(lastJoinDay, today);
        return await this.handleBrokenStreak(userStreak, now, daysSinceLastJoin);
      }

    } catch (error) {
      console.error('Error handling user join:', error);
      throw error;
    }
  }

  // Tăng chuỗi
  async incrementStreak(userStreak, currentDate) {
    userStreak.currentStreak += 1;
    userStreak.lastJoinDate = currentDate;
    userStreak.totalDaysJoined += 1;

    // Cập nhật chuỗi dài nhất
    if (userStreak.currentStreak > userStreak.longestStreak) {
      userStreak.longestStreak = userStreak.currentStreak;
    }

    await userStreak.save();
    return { action: 'incremented', streak: userStreak };
  }

  // Xử lý khi chuỗi bị ngắt
  async handleBrokenStreak(userStreak, currentDate, daysSinceLastJoin) {
    // Kiểm tra nếu có thể hồi phục
    if (daysSinceLastJoin === 2 && userStreak.recoveryCount > 0) {
      return await this.recoverStreak(userStreak, currentDate);
    } else {
      return await this.resetStreak(userStreak, currentDate);
    }
  }

  // Hồi phục chuỗi
  async recoverStreak(userStreak, currentDate) {
    userStreak.currentStreak += 1;
    userStreak.lastJoinDate = currentDate;
    userStreak.recoveryCount -= 1;
    userStreak.totalDaysJoined += 1;

    await userStreak.save();
    return { action: 'recovered', streak: userStreak };
  }

  // Reset chuỗi
  async resetStreak(userStreak, currentDate) {
    const oldStreak = userStreak.currentStreak;

    userStreak.currentStreak = 1;
    userStreak.lastJoinDate = currentDate;
    userStreak.streakStartDate = currentDate;
    userStreak.totalDaysJoined += 1;

    await userStreak.save();
    return { action: 'reset', oldStreak, streak: userStreak };
  }

  // Reset số lần hồi phục hàng tháng
  async resetMonthlyRecovery(userStreak, currentDate) {
    const lastReset = userStreak.lastRecoveryReset || new Date(0);
    const shouldReset = lastReset.getMonth() !== currentDate.getMonth() ||
      lastReset.getFullYear() !== currentDate.getFullYear();

    if (shouldReset) {
      userStreak.recoveryCount = 3; // 3 lần hồi phục mỗi tháng
      userStreak.lastRecoveryReset = currentDate;
      await userStreak.save();
    }
  }

  // Kiểm tra chuỗi hàng ngày (chạy cron job)
  async checkDailyStreaks() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const brokenStreaks = await UserStreak.find({
        lastJoinDate: { $lt: yesterday },
        currentStreak: { $gt: 0 }
      });

      for (const streak of brokenStreaks) {
        const daysSinceLastJoin = this.getDaysDifference(streak.lastJoinDate, new Date());

        if (daysSinceLastJoin >= 2) {
          // Ngắt chuỗi nếu không join trong 1 ngày
          streak.currentStreak = 0;
          await streak.save();
        }
      }

      return brokenStreaks.length;
    } catch (error) {
      console.error('Error checking daily streaks:', error);
      throw error;
    }
  }

  // Lấy thông tin chuỗi của user
  async getUserStreak(userId, guildId) {
    return await UserStreak.findOne({ userId, guildId });
  }

  // Sử dụng lần hồi phục
  async useRecovery(userId, guildId) {
    const userStreak = await UserStreak.findOne({ userId, guildId });

    if (!userStreak || userStreak.recoveryCount <= 0) {
      return { success: false, message: 'No recovery available' };
    }

    userStreak.recoveryCount -= 1;
    await userStreak.save();

    return { success: true, recoveryCount: userStreak.recoveryCount };
  }

  // Helper: Tính số ngày chênh lệch
  getDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor(Math.abs((date2 - date1) / oneDay));
    return diffDays;
  }
}

module.exports = new StreakService();
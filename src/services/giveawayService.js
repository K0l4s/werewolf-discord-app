const Giveaway = require('../models/Giveaway');
const User = require('../models/User');
const Notification = require('../models/Notification');
const UserService = require('./userService');
const { wolfIcon } = require('../utils/wolfCoin');
const GA_STATUS = require('../models/Giveaway').GA_STATUS;

class GiveawayService {
  static async getGiveawayById(id) {

    const giveaway = await Giveaway.findById(id);
    return giveaway
  }
  static async createGiveaway(data) {
    try {
      const giveaway = new Giveaway(data);
      await giveaway.save();
      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async approveGiveaway(giveawayId, approvedBy) {
    try {
      const giveaway = await Giveaway.findById(giveawayId);
      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      if (giveaway.status !== GA_STATUS.PENDING) {
        return { success: false, error: 'Giveaway không ở trạng thái chờ duyệt' };
      }

      // Kiểm tra số dư nếu là currency
      if (giveaway.rewards.currency && giveaway.rewards.currency > 0) {
        const host = await User.findOne({ userId: giveaway.hostId });
        if (!host || host.coin < giveaway.rewards.currency) {
          return {
            success: false,
            error: `Host không đủ ${wolfIcon()}. Cần: ${giveaway.rewards.currency}, Hiện có: ${host?.coin || 0}`
          };
        }
      }

      giveaway.status = GA_STATUS.ACTIVE;
      giveaway.approvedBy = approvedBy;
      giveaway.approvedAt = new Date();
      await giveaway.save();

      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async rejectGiveaway(giveawayId, rejectedBy) {
    try {
      const giveaway = await Giveaway.findByIdAndUpdate(
        giveawayId,
        {
          status: GA_STATUS.REJECTED,
          approvedBy: rejectedBy,
          approvedAt: new Date()
        },
        { new: true }
      );

      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async joinGiveaway(giveawayId, userId, guildId) {
    try {
      const giveaway = await Giveaway.findById(giveawayId);
      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      if (giveaway.status !== GA_STATUS.ACTIVE) {
        return { success: false, error: 'Giveaway không ở trạng thái hoạt động' };
      }

      if (giveaway.guildId !== guildId) {
        return { success: false, error: 'Giveaway không thuộc server này' };
      }

      // Kiểm tra đã tham gia chưa
      const alreadyJoined = giveaway.participants.find(p => p.userId === userId);
      if (alreadyJoined) {
        return { success: false, error: 'Bạn đã tham gia giveaway này' };
      }

      // Kiểm tra requirements
      // const user = await User.findOne({ userId });
      const user = await UserService.findUserById(userId)
      // if (!user) {
      //   return { success: false, error: 'Không tìm thấy thông tin user' };
      // }

      if (user.lvl < giveaway.requirements.minLevel) {
        return {
          success: false,
          error: `Level không đủ. Yêu cầu: ${giveaway.requirements.minLevel}, Hiện tại: ${user.lvl}`
        };
      }

      // Thêm người tham gia
      giveaway.participants.push({
        userId,
        joinedAt: new Date(),
        hasMetRequirement: !giveaway.requirementMessage // Nếu không có quest thì auto hoàn thành
      });

      await giveaway.save();
      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async completeRequirement(giveawayId, userId, messageId) {
    try {
      const giveaway = await Giveaway.findById(giveawayId);
      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      const participant = giveaway.participants.find(p => p.userId === userId);
      if (!participant) {
        return { success: false, error: 'Bạn chưa tham gia giveaway này' };
      }

      if (participant.hasMetRequirement) {
        return { success: false, error: 'Bạn đã hoàn thành yêu cầu' };
      }

      participant.hasMetRequirement = true;
      participant.requirementMessageId = messageId;
      await giveaway.save();

      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async endGiveaway(giveawayId, endedBy = null) {
    try {
      const giveaway = await Giveaway.findById(giveawayId);
      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      if (giveaway.status !== GA_STATUS.ACTIVE) {
        return { success: false, error: 'Giveaway không ở trạng thái hoạt động' };
      }

      // Lấy danh sách người tham gia hợp lệ
      const validParticipants = giveaway.participants.filter(p => p.hasMetRequirement);

      if (validParticipants.length === 0) {
        giveaway.status = GA_STATUS.ENDED;
        await giveaway.save();
        return { success: true, data: giveaway, winners: [] };
      }

      // Chọn người thắng
      const winners = this.selectWinners(validParticipants, giveaway.winnerCount);
      giveaway.winners = winners.map(userId => ({ userId }));
      giveaway.status = GA_STATUS.ENDED;
      await giveaway.save();

      // Xử lý phần thưởng currency
      if (giveaway.rewards.currency && giveaway.rewards.currency > 0) {
        await this.distributeCurrencyRewards(giveaway, winners);
      }

      return { success: true, data: giveaway, winners };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static selectWinners(participants, winnerCount) {
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(winnerCount, participants.length)).map(p => p.userId);
  }

  static async distributeCurrencyRewards(giveaway, winners) {
    try {
      const rewardPerWinner = Math.floor(giveaway.rewards.currency / winners.length);

      if (rewardPerWinner > 0) {
        // Trừ tiền host
        await User.findOneAndUpdate(
          { userId: giveaway.hostId },
          { $inc: { coin: -giveaway.rewards.currency } }
        );

        // Cộng tiền cho winners
        for (const winnerId of winners) {
          await User.findOneAndUpdate(
            { userId: winnerId },
            { $inc: { coin: rewardPerWinner } },
            { upsert: true }
          );
        }
      }
    } catch (error) {
      console.error('Lỗi phân phối currency:', error);
    }
  }

  static async claimOtherReward(giveawayId, userId) {
    try {
      const giveaway = await Giveaway.findById(giveawayId);
      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      const winner = giveaway.winners.find(w => w.userId === userId);
      if (!winner) {
        return { success: false, error: 'Bạn không phải người thắng cuộc' };
      }

      if (winner.claimed) {
        return { success: false, error: 'Phần thưởng đã được xác nhận' };
      }

      winner.claimed = true;
      winner.claimedAt = new Date();
      await giveaway.save();

      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async removeParticipant(giveawayId, userId, removerId) {
    try {
      const giveaway = await Giveaway.findById(giveawayId);
      if (!giveaway) {
        return { success: false, error: 'Giveaway không tồn tại' };
      }

      // Chỉ host hoặc admin mới được remove
      if (giveaway.hostId !== removerId) {
        const notification = await Notification.findOne({ guildId: giveaway.guildId });
        // Ở đây bạn cần kiểm tra quyền admin - tạm thời cho phép host remove
      }

      giveaway.participants = giveaway.participants.filter(p => p.userId !== userId);
      await giveaway.save();

      return { success: true, data: giveaway };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getGuildConfig(guildId) {
    return await Notification.findOne({ guildId });
  }

  static async checkAndEndExpiredGiveaways() {
    try {
      const now = new Date();
      const expiredGiveaways = await Giveaway.find({
        status: GA_STATUS.ACTIVE,
        approvedAt: { $lte: new Date(now.getTime() - (24 * 60 * 60 * 1000)) } // Ví dụ: 24h
      });

      for (const giveaway of expiredGiveaways) {
        await this.endGiveaway(giveaway._id, 'system');
      }

      return expiredGiveaways.length;
    } catch (error) {
      console.error('Lỗi kiểm tra giveaway hết hạn:', error);
      return 0;
    }
  }
}

module.exports = GiveawayService;
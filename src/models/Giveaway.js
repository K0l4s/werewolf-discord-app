const mongoose = require('mongoose');

const GA_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled'
};

const GA_TYPE = {
  ITEM: 'item',
  CURRENCY: 'currency',
  REAL_WORLD: 'real_world'
};

const giveawaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  hostId: { type: String, required: true }, // User ID của người tạo GA
  guildId: { type: String, required: true }, // Server ID
  channelId: { type: String, required: true }, // Kênh thông báo GA
  requirementChannelId: { type: String, required: false }, // Kênh yêu cầu (nếu có)
  requirementMessage: { type: String, required: false }, // Tin nhắn yêu cầu (nếu có)
  
  type: {
    type: String,
    enum: Object.values(GA_TYPE),
    required: true
  },
  
  // Phần thưởng
  rewards: {
    // Nếu là item
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      quantity: { type: Number, default: 1 }
    }],
    // Nếu là currency
    currency: { type: Number, default: 0 },
    // Nếu là vật phẩm ngoài đời
    realWorldItem: { type: String, required: false },
    realWorldValue: { type: Number, required: false } // Giá trị ước tính
  },
  
  // Thời gian
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // Thời lượng tính bằng giây
  
  // Người tham gia
  participants: [{
    userId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    hasMetRequirement: { type: Boolean, default: false },
    requirementMessageId: { type: String, required: false } // ID tin nhắn đã gửi
  }],
  
  // Kết quả
  winners: [{
    userId: { type: String, required: true },
    position: { type: Number, required: true },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, required: false }
  }],
  
  winnerCount: { type: Number, required: true, default: 1 },
  
  // Trạng thái và duyệt
  status: {
    type: String,
    enum: Object.values(GA_STATUS),
    default: GA_STATUS.PENDING
  },
  approvedBy: { type: String, required: false }, // User ID của người duyệt
  approvedAt: { type: Date, required: false },
  
  // Metadata
  messageId: { type: String, required: false }, // ID tin nhắn GA trong channel
  createdByAdmin: { type: Boolean, default: false }, // Nếu admin tạo thì auto approve
  
  // Settings
  requirements: {
    minLevel: { type: Number, default: 1 },
    minSpiritLevel: { type: Number, default: 1 },
    roleRequired: { type: String, required: false }
  }
}, {
  timestamps: true
});

// Indexes
giveawaySchema.index({ guildId: 1, status: 1 });
giveawaySchema.index({ endTime: 1 });
giveawaySchema.index({ hostId: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
module.exports.GA_STATUS = GA_STATUS;
module.exports.GA_TYPE = GA_TYPE;
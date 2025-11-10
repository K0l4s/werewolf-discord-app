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
  CURRENCY: 'currency',
  OTHER: 'other',
  ALL: 'all',
};

const giveawaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  hostId: { type: String, required: true }, // User ID của người tạo GA
  guildId: { type: String, required: true }, // Server ID
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
    currency: { type: Number, required: false },
    otherItem: { type: String, required: false },
    otherValue: { type: Number, required: false } // Giá trị ước tính
  },

  duration: { type: Number, required: true }, // Thời lượng tính bằng giây

  // Người tham gia
  participants: [{
    userId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    hasMetRequirement: { type: Boolean, default: false },
    requirementMessageId: { type: String, required: false } // ID tin nhắn đã gửi
  }],

  // // Kết quả
  winners: [{
    userId: { type: String, required: true },
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

  // Settings
  requirements: {
    minLevel: { type: Number, default: 0 },
    roleRequired: [{ type: String, required: false }]
  }
}, {
  timestamps: true
});
giveawaySchema.pre('save', function (next) {
  if (this.approvedAt && this.duration && this.approvedBy && this.isModified('approvedAt')) {
    this.endTime = new Date(this.approvedAt.getTime() + (this.duration * 1000));
  }
  next();
});
giveawaySchema.virtual('endTime').get(function () {
  if (!this.approvedAt) {
    return null;
  }

  // Tạo Date object từ approvedAt
  const approvedTime = new Date(this.approvedAt);

  // Cộng thêm duration (tính theo giây)
  const endTime = new Date(approvedTime.getTime() + (this.duration * 1000));

  return endTime;
});
// Indexes
giveawaySchema.index({ guildId: 1, status: 1 });
giveawaySchema.index({ hostId: 1 });



module.exports = mongoose.model('Giveaway', giveawaySchema);
module.exports.GA_STATUS = GA_STATUS;
module.exports.GA_TYPE = GA_TYPE;
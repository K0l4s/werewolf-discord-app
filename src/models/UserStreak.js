// models/UserStreak.js
const mongoose = require('mongoose');

const userStreakSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastJoinDate: {
    type: Date,
    default: null
  },
  streakStartDate: {
    type: Date,
    default: null
  },
  recoveryCount: {
    type: Number,
    default: 0
  },
  lastRecoveryReset: {
    type: Date,
    default: null
  },
  totalDaysJoined: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserStreak', userStreakSchema);
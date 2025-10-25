// models/Action.js
const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    lowercase: true
  },
  message: {
    type: String,
    required: true
  },
  imgUrl: {
    type: String,
    required: true
  },
  uploadId: {
    type: String, // Changed to String
    default: null
  },
  requiresTarget: {
    type: Boolean,
    default: true
  },
  isSystemDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String, // userId of the creator
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index để đảm bảo action là duy nhất trong mỗi guild
actionSchema.index({ guildId: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('Action', actionSchema);
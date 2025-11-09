const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Ensure participants array has exactly 2 users and is unique
conversationSchema.index({ participants: 1 }, { unique: true });

// Helper method to find or create conversation
conversationSchema.statics.findOrCreate = async function(userId1, userId2) {
  const participants = [userId1, userId2].sort();
  
  let conversation = await this.findOne({ participants });
  
  if (!conversation) {
    conversation = await this.create({ participants });
  }
  
  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);


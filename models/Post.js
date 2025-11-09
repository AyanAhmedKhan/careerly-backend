const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
}, {
  timestamps: true,
});

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: 5000,
  },
  image: {
    type: String,
    default: '',
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  reactions: {
    like: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    love: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    laugh: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    cry: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    wow: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    angry: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  comments: [commentSchema],
}, {
  timestamps: true,
});

// Index for sorting by creation date
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);


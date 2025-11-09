const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const { search, userId } = req.query;
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { text: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by user if userId provided
    if (userId) {
      query.user = userId;
    }

    const posts = await Post.find(query)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create post
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { text } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Post content is required' });
    }

    const post = await Post.create({
      user: req.user._id,
      text: text.trim(),
      image,
    });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update post
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    const { text } = req.body;
    if (text) {
      post.text = text.trim();
    }

    if (req.file) {
      // Delete old image if exists
      if (post.image) {
        const oldImagePath = path.join(__dirname, '..', post.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      post.image = `/uploads/${req.file.filename}`;
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete image if exists
    if (post.image) {
      const imagePath = path.join(__dirname, '..', post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like/Unlike post (backward compatibility)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Initialize reactions if not exists
    if (!post.reactions) {
      post.reactions = {
        like: [],
        love: [],
        laugh: [],
        cry: [],
        wow: [],
        angry: [],
      };
    }

    const isLiked = post.reactions.like.some(
      (like) => like.toString() === req.user._id.toString()
    );

    if (isLiked) {
      post.reactions.like = post.reactions.like.filter(
        (like) => like.toString() !== req.user._id.toString()
      );
    } else {
      // Remove from other reactions first
      Object.keys(post.reactions).forEach(reactionType => {
        post.reactions[reactionType] = post.reactions[reactionType].filter(
          (userId) => userId.toString() !== req.user._id.toString()
        );
      });
      post.reactions.like.push(req.user._id);
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// React to post (new reaction system)
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const validReactions = ['like', 'love', 'laugh', 'cry', 'wow', 'angry'];

    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Initialize reactions if not exists
    if (!post.reactions) {
      post.reactions = {
        like: [],
        love: [],
        laugh: [],
        cry: [],
        wow: [],
        angry: [],
      };
    }

    // Check if user already reacted with this type
    const hasReaction = post.reactions[reactionType].some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (hasReaction) {
      // Remove reaction
      post.reactions[reactionType] = post.reactions[reactionType].filter(
        (userId) => userId.toString() !== req.user._id.toString()
      );
    } else {
      // Remove from all other reactions first
      Object.keys(post.reactions).forEach(type => {
        if (type !== reactionType) {
          post.reactions[type] = post.reactions[type].filter(
            (userId) => userId.toString() !== req.user._id.toString()
          );
        }
      });
      // Add new reaction
      post.reactions[reactionType].push(req.user._id);

      // Create notification for post owner (if not own post)
      if (post.user.toString() !== req.user._id.toString()) {
        const postOwner = await User.findById(post.user);
        if (postOwner) {
          postOwner.notifications.push({
            type: 'post_like',
            from: req.user._id,
            post: post._id,
            message: `${req.user.name} reacted to your post`,
          });
          await postOwner.save();
        }
      }
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      text: text.trim(),
    });

    await post.save();

    // Create notification for post owner (if not own post)
    if (post.user.toString() !== req.user._id.toString()) {
      const postOwner = await User.findById(post.user);
      if (postOwner) {
        postOwner.notifications.push({
          type: 'post_comment',
          from: req.user._id,
          post: post._id,
          message: `${req.user.name} commented on your post`,
        });
        await postOwner.save();
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete comment
router.delete('/:id/comment/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the comment owner or post owner
    if (
      comment.user.toString() !== req.user._id.toString() &&
      post.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('user', 'name email profilePicture')
      .populate('reactions.like', 'name profilePicture')
      .populate('reactions.love', 'name profilePicture')
      .populate('reactions.laugh', 'name profilePicture')
      .populate('reactions.cry', 'name profilePicture')
      .populate('reactions.wow', 'name profilePicture')
      .populate('reactions.angry', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


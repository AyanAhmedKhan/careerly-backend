const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
        { 'skills': { $regex: q, $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('connections', 'name profilePicture email')
      .populate('connectionRequests.user', 'name profilePicture email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, bio, experience, education, skills } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (experience) user.experience = experience;
    if (education) user.education = education;
    if (skills) user.skills = skills;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('connections', 'name profilePicture')
      .populate('connectionRequests.user', 'name profilePicture');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send connection request
router.post('/:id/connect', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id.toString();

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'Cannot connect with yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already connected
    if (currentUser.connections.includes(targetUserId)) {
      return res.status(400).json({ message: 'Already connected' });
    }

    // Check if request already exists
    const existingRequest = currentUser.connectionRequests.find(
      req => req.user.toString() === targetUserId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Connection request already sent' });
    }

    // Add request to both users
    currentUser.connectionRequests.push({
      user: targetUserId,
      type: 'sent',
    });

    targetUser.connectionRequests.push({
      user: currentUserId,
      type: 'received',
    });

    await currentUser.save();
    await targetUser.save();

    // Create notification for target user
    targetUser.notifications.push({
      type: 'connection_request',
      from: currentUserId,
      message: `${currentUser.name} wants to connect with you`,
    });
    await targetUser.save();

    res.json({ message: 'Connection request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept connection request
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUserId = req.user._id.toString();

    const currentUser = await User.findById(currentUserId);
    const requester = await User.findById(requesterId);

    if (!currentUser || !requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from connection requests
    currentUser.connectionRequests = currentUser.connectionRequests.filter(
      req => req.user.toString() !== requesterId
    );
    requester.connectionRequests = requester.connectionRequests.filter(
      req => req.user.toString() !== currentUserId
    );

    // Add to connections
    if (!currentUser.connections.includes(requesterId)) {
      currentUser.connections.push(requesterId);
    }
    if (!requester.connections.includes(currentUserId)) {
      requester.connections.push(currentUserId);
    }

    await currentUser.save();
    await requester.save();

    // Create notification for requester
    requester.notifications.push({
      type: 'connection_accepted',
      from: currentUserId,
      message: `${currentUser.name} accepted your connection request`,
    });
    await requester.save();

    res.json({ message: 'Connection accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


var express = require('express');
var router = express.Router();
var User = require('../models/User');

// Create User
router.post('/', async function(req, res) {
  try {
    const {
      username,
      password,
      email,
      fullName = '',
      avatarUrl = '',
      status = false,
      role,
      loginCount = 0
    } = req.body;

    const user = await User.create({
      username,
      password,
      email,
      fullName,
      avatarUrl,
      status,
      role,
      loginCount
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${dupField} must be unique` });
    }
    res.status(400).json({ message: err.message });
  }
});

// Get all users with optional filters: username (contains), fullName (contains), includeDeleted (boolean)
router.get('/', async function(req, res) {
  try {
    const { username, fullName, includeDeleted } = req.query;
    const query = {};
    if (!includeDeleted || includeDeleted === 'false') {
      query.isDelete = false;
    }
    if (username) {
      query.username = { $regex: username, $options: 'i' };
    }
    if (fullName) {
      query.fullName = { $regex: fullName, $options: 'i' };
    }
    const users = await User.find(query).populate('role').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user by username
router.get('/by-username/:username', async function(req, res) {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user by id
router.get('/:id', async function(req, res) {
  try {
    const user = await User.findById(req.params.id).populate('role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Invalid id' });
  }
});

// Update user
router.put('/:id', async function(req, res) {
  try {
    const {
      password,
      email,
      fullName,
      avatarUrl,
      status,
      role,
      loginCount,
      isDelete
    } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { password, email, fullName, avatarUrl, status, role, loginCount, isDelete } },
      { new: true, runValidators: true }
    ).populate('role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${dupField} must be unique` });
    }
    res.status(400).json({ message: err.message });
  }
});

// Soft delete user
router.delete('/:id', async function(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isDelete: true } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User soft-deleted', user });
  } catch (err) {
    res.status(400).json({ message: 'Invalid id' });
  }
});

// Activate user: body { email, username }
router.post('/activate', async function(req, res) {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: 'email and username are required' });
    }
    const user = await User.findOneAndUpdate(
      { email, username },
      { $set: { status: true } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found or info not matched' });
    res.json({ message: 'Status updated to true', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SavedPlace = require('../models/SavedPlace');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'weatherornotsecret',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'weatherornotsecret',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's saved places
exports.getSavedPlaces = async (req, res) => {
  try {
    // Check if user is authenticated (middleware should have added user to request)
    const userId = req.user.id;
    
    // Get saved places for this user, sorted by order field
    const savedPlaces = await SavedPlace.find({ user: userId }).sort({ order: 1 });
    
    res.json(savedPlaces);
  } catch (error) {
    console.error('Error getting saved places:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a saved place
exports.addSavedPlace = async (req, res) => {
  try {
    const { name, temp, description, icon } = req.body;
    const userId = req.user.id;
    
    // Check if place already exists for this user
    const existingPlace = await SavedPlace.findOne({ user: userId, name });
    if (existingPlace) {
      return res.status(400).json({ message: 'Place already saved' });
    }
    
    // Get count of existing places to determine order
    const count = await SavedPlace.countDocuments({ user: userId });
    
    // Create new saved place
    const savedPlace = new SavedPlace({
      user: userId,
      name,
      temp,
      description,
      icon,
      order: count // Add to end of list
    });
    
    await savedPlace.save();
    
    res.status(201).json(savedPlace);
  } catch (error) {
    console.error('Error adding saved place:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a saved place
exports.removeSavedPlace = async (req, res) => {
  try {
    const placeId = req.params.id;
    const userId = req.user.id;
    
    // Find and delete the place
    const deletedPlace = await SavedPlace.findOneAndDelete({
      _id: placeId,
      user: userId
    });
    
    if (!deletedPlace) {
      return res.status(404).json({ message: 'Saved place not found' });
    }
    
    // Update order of remaining places
    await SavedPlace.updateMany(
      { user: userId, order: { $gt: deletedPlace.order } },
      { $inc: { order: -1 } }
    );
    
    res.json({ message: 'Place removed successfully' });
  } catch (error) {
    console.error('Error removing saved place:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reorder saved places
exports.reorderSavedPlaces = async (req, res) => {
  try {
    const { places } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!Array.isArray(places)) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    
    // Update each place with new order
    const updatePromises = places.map((place, index) => {
      return SavedPlace.updateOne(
        { _id: place.id, user: userId },
        { $set: { order: index } }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Places reordered successfully' });
  } catch (error) {
    console.error('Error reordering saved places:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
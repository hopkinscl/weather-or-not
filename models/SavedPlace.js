const mongoose = require('mongoose');

const SavedPlaceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  temp: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique combinations of user and name
SavedPlaceSchema.index({ user: 1, name: 1 }, { unique: true });

// Compound index for sorting by user and order
SavedPlaceSchema.index({ user: 1, order: 1 });

module.exports = mongoose.model('SavedPlace', SavedPlaceSchema);
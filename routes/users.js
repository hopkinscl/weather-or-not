const express = require('express');
const router = express.Router();

// User controller
const userController = require('../controllers/userController');

// Create a new user
router.post('/register', userController.register);

// Login user
router.post('/login', userController.login);

// Get user saved places
router.get('/saved-places', userController.getSavedPlaces);

// Add a saved place
router.post('/saved-places', userController.addSavedPlace);

// Remove a saved place
router.delete('/saved-places/:id', userController.removeSavedPlace);

// Update order of saved places
router.put('/saved-places/reorder', userController.reorderSavedPlaces);

module.exports = router;
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Weather controller
const weatherController = require('../controllers/weatherController');

// Get current weather
router.get('/current', weatherController.getCurrentWeather);

// Get weather by coordinates
router.get('/coordinates', weatherController.getWeatherByCoordinates);

// Get forecast
router.get('/forecast', weatherController.getForecast);

module.exports = router;
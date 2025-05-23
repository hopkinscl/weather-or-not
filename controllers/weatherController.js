const axios = require('axios');

// WeatherStack API configuration
const API_KEY = process.env.WEATHER_API_KEY || '1270d2ac8fdb0c9d2a4e06cb2ab4ccd9';
const BASE_URL = 'https://api.weatherstack.com';

// Get current weather by city name
exports.getCurrentWeather = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const response = await axios.get(`${BASE_URL}/current`, {
      params: {
        access_key: API_KEY,
        query,
        units: 'm'
      }
    });
    
    // Add generated forecast data
    const weatherData = response.data;
    const forecastData = generateMockForecast(weatherData);
    weatherData.forecast = forecastData;
    
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
};

// Get weather by coordinates
exports.getWeatherByCoordinates = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
    }
    
    const query = `${lat},${lon}`;
    const response = await axios.get(`${BASE_URL}/current`, {
      params: {
        access_key: API_KEY,
        query,
        units: 'm'
      }
    });
    
    // Add generated forecast data
    const weatherData = response.data;
    const forecastData = generateMockForecast(weatherData);
    weatherData.forecast = forecastData;
    
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
};

// Get forecast (mock data as WeatherStack free plan doesn't include forecast)
exports.getForecast = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // First get current weather
    const response = await axios.get(`${BASE_URL}/current`, {
      params: {
        access_key: API_KEY,
        query,
        units: 'm'
      }
    });
    
    // Generate mock forecast based on current data
    const weatherData = response.data;
    const forecastData = generateMockForecast(weatherData);
    
    res.json(forecastData);
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
};

// Generate mock forecast data based on current weather
function generateMockForecast(weatherData) {
  // Create a simulated 5-day forecast with varying conditions
  const current = weatherData.current;
  const baseTemp = current.temperature;
  const baseHumidity = current.humidity;
  
  const list = [];
  const now = new Date();
  
  // Weather conditions to randomly select from
  const weatherTypes = [
    { main: 'Clear', description: 'clear sky' },
    { main: 'Clouds', description: 'few clouds' },
    { main: 'Clouds', description: 'scattered clouds' },
    { main: 'Clouds', description: 'overcast clouds' },
    { main: 'Rain', description: 'light rain' },
    { main: 'Rain', description: 'moderate rain' },
    { main: 'Drizzle', description: 'light drizzle' },
    { main: 'Thunderstorm', description: 'thunderstorm' },
    { main: 'Snow', description: 'light snow' },
    { main: 'Mist', description: 'mist' }
  ];
  
  // Create 5 days with 8 data points per day (3-hour intervals)
  for (let day = 0; day < 5; day++) {
    // Generate a base temperature for this day (more variation between days)
    const dayTempOffset = (Math.random() * 20) - 10; // -10 to +10 degree variation between days
    const dayTemp = baseTemp + dayTempOffset;
    
    // Select a predominant weather type for the day
    const dayWeatherTypeIndex = Math.floor(Math.random() * weatherTypes.length);
    const dayWeatherType = weatherTypes[dayWeatherTypeIndex];
    
    for (let hour = 0; hour < 24; hour += 3) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(hour, 0, 0, 0);
      
      // Add hourly variation to the temperature
      let hourlyTempVariation;
      if (hour < 6) {
        hourlyTempVariation = -5 + (Math.random() * 3); // Coolest in early morning
      } else if (hour < 12) {
        hourlyTempVariation = -2 + (Math.random() * 5); // Warming up
      } else if (hour < 18) {
        hourlyTempVariation = 0 + (Math.random() * 8); // Warmest midday
      } else {
        hourlyTempVariation = -3 + (Math.random() * 4); // Cooling in evening
      }
      
      const finalTemp = dayTemp + hourlyTempVariation;
      const humidityVariation = (Math.random() * 20) - 10; // -10 to +10
      
      // Higher chance of precipitation in the morning and evening
      let precipChance;
      if (hour < 6 || hour > 18) {
        precipChance = Math.random() * 0.7; // 0-70%
      } else {
        precipChance = Math.random() * 0.3; // 0-30%
      }
      
      // Sometimes change weather during the day (30% chance per time slot)
      let weatherType = dayWeatherType;
      if (Math.random() < 0.3) {
        const alternateTypeIndex = Math.floor(Math.random() * weatherTypes.length);
        weatherType = weatherTypes[alternateTypeIndex];
      }
      
      list.push({
        dt: date.getTime() / 1000,
        main: {
          temp: finalTemp,
          humidity: Math.min(100, Math.max(0, baseHumidity + humidityVariation)),
          pressure: current.pressure
        },
        weather: [{
          id: Math.floor(Math.random() * 800) + 200, // Random weather code
          main: weatherType.main,
          description: weatherType.description,
          icon: getIconCode(weatherType.description, hour)
        }],
        wind: {
          speed: current.wind_speed * (0.5 + Math.random()) // Some wind variation
        },
        pop: precipChance // Probability of precipitation
      });
    }
  }
  
  return { list };
}

// Helper function to map weather description to icon code
function getIconCode(description, hour) {
  const isDay = hour >= 6 && hour < 18;
  const desc = description.toLowerCase();
  
  if (desc.includes('clear') || desc.includes('sunny')) {
    return isDay ? '01d' : '01n';
  } else if (desc.includes('cloud')) {
    if (desc.includes('scattered') || desc.includes('broken')) {
      return isDay ? '03d' : '03n';
    } else if (desc.includes('few')) {
      return isDay ? '02d' : '02n';
    } else {
      return isDay ? '04d' : '04n';
    }
  } else if (desc.includes('rain') || desc.includes('drizzle')) {
    if (desc.includes('light')) {
      return isDay ? '10d' : '10n';
    } else {
      return '09d';
    }
  } else if (desc.includes('thunderstorm')) {
    return '11d';
  } else if (desc.includes('snow')) {
    return '13d';
  } else if (desc.includes('mist') || desc.includes('fog')) {
    return '50d';
  }
  
  return isDay ? '01d' : '01n'; // Default to clear sky
}
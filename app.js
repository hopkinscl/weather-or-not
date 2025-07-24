// API configuration
const BASE_URL = '/api/weather';

// Current weather data
let currentWeatherData = null;

// Auth state
let authToken = localStorage.getItem('weatherOrNotAuthToken') || null;
let currentUser = JSON.parse(localStorage.getItem('weatherOrNotCurrentUser') || 'null');

// Dark mode state
let isDarkMode = localStorage.getItem('weatherOrNotDarkMode') === 'true';

// Temperature conversion function
function celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
}

// DOM elements
const getLocationBtn = document.getElementById('get-location');
const searchBtn = document.getElementById('search-btn');
const locationInput = document.getElementById('location-input');
const savePlaceBtn = document.getElementById('save-place-btn');
const savedPlacesList = document.getElementById('saved-places-list');

// Auth DOM elements (to be added to HTML)
let loginBtn, registerBtn, logoutBtn, profileSection;

// Weather display elements
const cityNameElement = document.getElementById('city-name');
const currentDateElement = document.getElementById('current-date');
const temperatureElement = document.getElementById('temperature');
const weatherDescriptionElement = document.getElementById('weather-description');

// Environmental data elements
const uvIndexElement = document.getElementById('uv-index');
const uvDescriptionElement = document.getElementById('uv-description');
const airQualityIndexElement = document.getElementById('air-quality-index');
const airQualityDescriptionElement = document.getElementById('air-quality-description');

// Charts
let tempChart;
let precipChart;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode
    initializeDarkMode();
    
    // Add auth UI elements
    setupAuthUI();
    
    // Default location (New York)
    getWeatherData(40.7128, -74.0060, 'New York');

    // Load saved places if logged in
    if (authToken) {
        loadSavedPlaces();
    }

    // Event listeners
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getUserLocation);
    }
    searchBtn.addEventListener('click', handleSearch);
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    savePlaceBtn.addEventListener('click', saveCurrentPlace);
    
    // Dark mode toggle - use setTimeout to ensure DOM is fully loaded
    setTimeout(() => {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', toggleDarkMode);
            console.log('Dark mode toggle button found and event listener attached');
        } else {
            console.error('Dark mode toggle button not found!');
        }
    }, 100);
    
    // Recommendations navigation
    const recNavBtns = document.querySelectorAll('.rec-nav-btn');
    recNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            switchRecommendationCategory(category);
        });
    });
    
    // Add window resize event listener to handle responsive resizing
    window.addEventListener('resize', debounce(() => {
        if (tempChart && precipChart && currentWeatherData) {
            // Recreate the charts with current data to ensure proper sizing
            createCharts(currentWeatherData.forecast);
        }
    }, 250));
});

// Weather or Not - Set up authentication UI
function setupAuthUI() {
    // Get auth container
    const headerEl = document.querySelector('header');
    const authContainer = document.querySelector('.auth-container');
    
    // Add auth buttons
    if (!authToken) {
        // Not logged in - show login/register
        authContainer.innerHTML = `
            <button id="login-btn">Login</button>
            <button id="register-btn">Register</button>
        `;
        
        // Set up event listeners
        loginBtn = document.getElementById('login-btn');
        registerBtn = document.getElementById('register-btn');
        
        loginBtn.addEventListener('click', showLoginForm);
        registerBtn.addEventListener('click', showRegisterForm);
    } else {
        // Logged in - show profile and logout
        authContainer.innerHTML = `
            <div id="profile-section">
                <span>Welcome, ${currentUser.username}</span>
            </div>
            <button id="logout-btn">Logout</button>
        `;
        
        // Set up logout listener
        logoutBtn = document.getElementById('logout-btn');
        profileSection = document.getElementById('profile-section');
        
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Show login form
function showLoginForm() {
    // Remove any existing modals first
    const existingModal = document.querySelector('.modal-container');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.innerHTML = `
        <div class="modal">
            <h2>Login</h2>
            <form id="login-form">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="submit">Login</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // Set up event listeners
    document.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            // Store auth token and user details
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('weatherOrNotAuthToken', authToken);
            localStorage.setItem('weatherOrNotCurrentUser', JSON.stringify(currentUser));
            
            // Remove modal and refresh UI
            document.body.removeChild(modalContainer);
            setupAuthUI();
            loadSavedPlaces();
            
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    });
}

// Show register form
function showRegisterForm() {
    // Remove any existing modals first
    const existingModal = document.querySelector('.modal-container');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.innerHTML = `
        <div class="modal">
            <h2>Register</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" required>
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="submit">Register</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // Set up event listeners
    document.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            // Store auth token and user details
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('weatherOrNotAuthToken', authToken);
            localStorage.setItem('weatherOrNotCurrentUser', JSON.stringify(currentUser));
            
            // Remove modal and refresh UI
            document.body.removeChild(modalContainer);
            setupAuthUI();
            
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    });
}

// Handle logout
function handleLogout() {
    // Clear auth data
    authToken = null;
    currentUser = null;
    localStorage.removeItem('weatherOrNotAuthToken');
    localStorage.removeItem('weatherOrNotCurrentUser');
    
    // Update UI
    setupAuthUI();
    
    // Clear saved places
    renderSavedPlaces([]);
}

// Debounce function to limit how often resize handler is called
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Get user's geolocation
function getUserLocation() {
    if (navigator.geolocation) {
        getLocationBtn.textContent = '⏳';
        getLocationBtn.classList.add('loading');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getLocationBtn.textContent = '📍';
                getLocationBtn.classList.remove('loading');
                
                // Try to get actual location name using reverse geocoding
                getCityNameFromCoords(latitude, longitude)
                    .then(cityName => {
                        // Use the determined city name or fallback to "Your Location"
                        getWeatherData(latitude, longitude, cityName || 'Your Location');
                    })
                    .catch(error => {
                        console.error("Error getting city name:", error);
                        getWeatherData(latitude, longitude, 'Your Location');
                    });
            },
            (error) => {
                getLocationBtn.textContent = '📍';
                getLocationBtn.classList.remove('loading');
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please check your browser settings.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Handle search button click
function handleSearch() {
    const location = locationInput.value.trim();
    if (!location) return;
    
    console.log("Searching for:", location);
    
    // Capitalize the city name properly
    const capitalizedLocation = location.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    // Search by city name through our API
    getWeatherData(null, null, capitalizedLocation);
}

// Fetch weather data from API
async function getWeatherData(lat, lon, cityName) {
    try {
        // Show loading state
        document.querySelector('.current-weather').classList.add('loading');
        document.querySelector('.forecast-section').classList.add('loading');
        document.querySelector('.chart-container').classList.add('loading');
        
        let weatherData;
        
        if (lat && lon) {
            // Get weather by coordinates
            const response = await fetch(`${BASE_URL}/coordinates?lat=${lat}&lon=${lon}`);
            weatherData = await response.json();
        } else if (cityName) {
            // Get weather by city name
            const response = await fetch(`${BASE_URL}/current?query=${encodeURIComponent(cityName)}`);
            weatherData = await response.json();
        } else {
            throw new Error('No location provided');
        }
        
        // Store the current weather data for saving places
        currentWeatherData = weatherData;
        
        // Update UI with the real weather data
        updateCurrentWeather(weatherData, weatherData.location.name || cityName);
        updateForecast(weatherData.forecast);
        createCharts(weatherData.forecast);
        
        // Remove loading state
        document.querySelector('.current-weather').classList.remove('loading');
        document.querySelector('.forecast-section').classList.remove('loading');
        document.querySelector('.chart-container').classList.remove('loading');
    } catch (error) {
        console.error('Error fetching weather data:', error);
        
        // Fallback to mock data if API fails
        const mockWeatherData = generateMockWeatherData(cityName || "Your Location", lat && lon);
        currentWeatherData = mockWeatherData;
        
        updateCurrentWeather(mockWeatherData, mockWeatherData.location.name || cityName);
        updateForecast(mockWeatherData.forecast);
        createCharts(mockWeatherData.forecast);
        
        // Remove loading state
        document.querySelector('.current-weather').classList.remove('loading');
        document.querySelector('.forecast-section').classList.remove('loading');
        document.querySelector('.chart-container').classList.remove('loading');
    }
}

// Function to get city name from coordinates using reverse geocoding
async function getCityNameFromCoords(latitude, longitude) {
    try {
        // Use OpenStreetMap's Nominatim API for reverse geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
        const data = await response.json();
        
        // Extract city or town name from the response
        let cityName = null;
        
        if (data.address) {
            // Try to get the most appropriate name for the location
            cityName = data.address.city || 
                       data.address.town || 
                       data.address.village || 
                       data.address.hamlet ||
                       data.address.suburb ||
                       data.address.county ||
                       data.address.state;
        }
        
        console.log("Resolved location:", cityName);
        return cityName;
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return null;
    }
}

// Function to generate mock weather data
function generateMockWeatherData(location, isCoordinates = false) {
    const currentDate = new Date();
    // If it's a string that looks like a proper location name, use it
    const cityName = (typeof location === 'string' && location !== 'Your Location') ? location : "Your Location";
    
    // More realistic temperature ranges for different cities
    const cityTempRanges = {
        'Paris': { min: 8, max: 18, typical: 13 },
        'London': { min: 5, max: 15, typical: 10 },
        'Tokyo': { min: 12, max: 22, typical: 17 },
        'Sydney': { min: 18, max: 25, typical: 22 },
        'New York': { min: 8, max: 18, typical: 13 },
        'Los Angeles': { min: 18, max: 28, typical: 23 },
        'Miami': { min: 22, max: 32, typical: 27 },
        'Chicago': { min: 2, max: 12, typical: 7 },
        'San Francisco': { min: 12, max: 20, typical: 16 },
        'Seattle': { min: 8, max: 16, typical: 12 }
    };
    
    // Get temperature range for the city, or use a default
    const tempRange = cityTempRanges[cityName] || { min: 10, max: 20, typical: 15 };
    
    // Generate consistent temperature based on location name
    // Get a consistent seed value from the location name
    let seed = 0;
    for (let i = 0; i < cityName.length; i++) {
        seed += cityName.charCodeAt(i);
    }
    // Use the seed to get a temperature within the realistic range (then convert to Fahrenheit)
    const baseTempC = tempRange.min + (seed % (tempRange.max - tempRange.min));
    const baseTemp = celsiusToFahrenheit(baseTempC);
    
    // Weather descriptions to randomly select from
    const weatherDescriptions = [
        "Sunny", "Partly cloudy", "Cloudy", "Overcast", "Light rain", "Moderate rain",
        "Heavy rain", "Thunderstorm", "Fog", "Light snow", "Moderate snow"
    ];
    
    // Select a consistent weather description based on the seed
    const weatherDescription = weatherDescriptions[seed % weatherDescriptions.length];
    
    // Generate mock forecast data
    const forecastList = [];
    const now = new Date();
    
    // Create 5 days with 8 data points per day (3-hour intervals)
    for (let day = 0; day < 5; day++) {
        // Generate a consistent base temperature for this day
        const daySeed = seed + day;
        const dayTempOffset = (daySeed % 36) - 18; // -18 to +18 Fahrenheit degree variation (equivalent to -10 to +10 C)
        const dayTemp = baseTemp + dayTempOffset;
        
        for (let hour = 0; hour < 24; hour += 3) {
            const date = new Date(now);
            date.setDate(date.getDate() + day);
            date.setHours(hour, 0, 0, 0);
            
            // Add consistent hourly variation to the temperature (converted to Fahrenheit scale)
            const hourSeed = (daySeed * 24) + hour;
            let hourlyTempVariation;
            if (hour < 6) {
                hourlyTempVariation = -9 + ((hourSeed % 54) / 10); // Coolest in early morning (-5C to +3C = -9F to +5.4F)
            } else if (hour < 12) {
                hourlyTempVariation = -4 + ((hourSeed % 90) / 10); // Warming up (-2C to +7C = -3.6F to +12.6F)
            } else if (hour < 18) {
                hourlyTempVariation = 0 + ((hourSeed % 144) / 10); // Warmest midday (0C to +8C = 0F to +14.4F)
            } else {
                hourlyTempVariation = -5 + ((hourSeed % 72) / 10); // Cooling in evening (-3C to +4C = -5.4F to +7.2F)
            }
            
            const finalTemp = dayTemp + hourlyTempVariation;
            const precipChance = (hourSeed % 100) / 100 * (hour < 6 || hour > 18 ? 0.7 : 0.3);
            
            // Select a consistent weather condition
            const weatherIndex = (hourSeed + day) % weatherDescriptions.length;
            const condition = weatherDescriptions[weatherIndex];
            
            forecastList.push({
                dt: date.getTime() / 1000,
                main: {
                    temp: finalTemp,
                    humidity: Math.floor(Math.random() * 40) + 50,
                    pressure: 1013
                },
                weather: [{
                    id: Math.floor(Math.random() * 800) + 200,
                    main: condition.includes(" ") ? condition.split(" ")[0] : condition,
                    description: condition.toLowerCase(),
                    icon: getIconCode(condition, hour)
                }],
                wind: {
                    speed: Math.floor(Math.random() * 20) + 5
                },
                pop: precipChance
            });
        }
    }
    
    // Create mock weather data structure
    return {
        request: {
            type: "City",
            query: cityName,
            language: "en",
            unit: "m"
        },
        location: {
            name: cityName,
            country: getCityCountry(cityName),
            region: getCityRegion(cityName),
            lat: isCoordinates ? location.split(',')[0] : getCityCoordinates(cityName).lat,
            lon: isCoordinates ? location.split(',')[1] : getCityCoordinates(cityName).lon,
            timezone_id: getCityTimezone(cityName),
            localtime: currentDate.toISOString(),
            utc_offset: getCityOffset(cityName)
        },
        current: {
            observation_time: currentDate.toTimeString(),
            temperature: baseTemp,
            weather_code: 113,
            weather_icons: ["https://cdn.weatherapi.com/weather/64x64/day/113.png"],
            weather_descriptions: [weatherDescription],
            wind_speed: Math.floor(Math.random() * 20) + 5,
            wind_degree: Math.floor(Math.random() * 360),
            wind_dir: "WSW",
            pressure: 1013,
            precip: Math.random() * 2,
            humidity: Math.floor(Math.random() * 40) + 50,
            cloudcover: Math.floor(Math.random() * 100),
            feelslike: baseTemp - 2 + Math.floor(Math.random() * 5),
            uv_index: Math.floor(Math.random() * 11),
            visibility: Math.floor(Math.random() * 10) + 5,
      air_quality_index: Math.floor(Math.random() * 150) + 50
        },
        forecast: {
            list: forecastList
        }
    };
}

// Helper functions for city data
function getCityCountry(cityName) {
    const cityCountries = {
        'Paris': 'France',
        'London': 'United Kingdom',
        'Tokyo': 'Japan',
        'Sydney': 'Australia',
        'New York': 'United States',
        'Los Angeles': 'United States',
        'Miami': 'United States',
        'Chicago': 'United States',
        'San Francisco': 'United States',
        'Seattle': 'United States'
    };
    return cityCountries[cityName] || 'Unknown';
}

function getCityRegion(cityName) {
    const cityRegions = {
        'Paris': 'Île-de-France',
        'London': 'England',
        'Tokyo': 'Kantō',
        'Sydney': 'New South Wales',
        'New York': 'New York',
        'Los Angeles': 'California',
        'Miami': 'Florida',
        'Chicago': 'Illinois',
        'San Francisco': 'California',
        'Seattle': 'Washington'
    };
    return cityRegions[cityName] || 'Unknown';
}

function getCityCoordinates(cityName) {
    const cityCoords = {
        'Paris': { lat: '48.8566', lon: '2.3522' },
        'London': { lat: '51.5074', lon: '-0.1278' },
        'Tokyo': { lat: '35.6762', lon: '139.6503' },
        'Sydney': { lat: '-33.8688', lon: '151.2093' },
        'New York': { lat: '40.7128', lon: '-74.0060' },
        'Los Angeles': { lat: '34.0522', lon: '-118.2437' },
        'Miami': { lat: '25.7617', lon: '-80.1918' },
        'Chicago': { lat: '41.8781', lon: '-87.6298' },
        'San Francisco': { lat: '37.7749', lon: '-122.4194' },
        'Seattle': { lat: '47.6062', lon: '-122.3321' }
    };
    return cityCoords[cityName] || { lat: '40.7128', lon: '-74.0060' };
}

function getCityTimezone(cityName) {
    const cityTimezones = {
        'Paris': 'Europe/Paris',
        'London': 'Europe/London',
        'Tokyo': 'Asia/Tokyo',
        'Sydney': 'Australia/Sydney',
        'New York': 'America/New_York',
        'Los Angeles': 'America/Los_Angeles',
        'Miami': 'America/New_York',
        'Chicago': 'America/Chicago',
        'San Francisco': 'America/Los_Angeles',
        'Seattle': 'America/Los_Angeles'
    };
    return cityTimezones[cityName] || 'America/New_York';
}

function getCityOffset(cityName) {
    const cityOffsets = {
        'Paris': '+1.0',
        'London': '+0.0',
        'Tokyo': '+9.0',
        'Sydney': '+10.0',
        'New York': '-5.0',
        'Los Angeles': '-8.0',
        'Miami': '-5.0',
        'Chicago': '-6.0',
        'San Francisco': '-8.0',
        'Seattle': '-8.0'
    };
    return cityOffsets[cityName] || '-5.0';
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

// Create weather icon HTML based on icon class
function createWeatherIconHTML(iconClass) {
    // Just return the weather icon with its class
    return `<i class="${iconClass}"></i>`;
}

// Helper function to map weather description to weather-icons class
function getIconClass(description, hour, temp) {
    const isDay = hour >= 6 && hour < 18;
    const desc = description.toLowerCase();
    const tempC = temp ? Math.round(temp) : null;
    
    // Check if it's warm but description mentions snow (to avoid inconsistency) (45°F = 7°C)
    if (desc.includes('snow') && tempC && tempC > 7) {
        // Override snow with cloudy for warmer temperatures (keeping internal logic in Celsius for consistency)
        return isDay ? 'wi wi-day-cloudy' : 'wi wi-night-alt-cloudy';
    }
    
    if (desc.includes('clear') || desc.includes('sunny')) {
        return isDay ? 'wi wi-day-sunny' : 'wi wi-night-clear';
    } else if (desc.includes('cloud')) {
        if (desc.includes('scattered') || desc.includes('broken')) {
            return isDay ? 'wi wi-day-cloudy' : 'wi wi-night-alt-cloudy';
        } else if (desc.includes('few')) {
            return isDay ? 'wi wi-day-cloudy' : 'wi wi-night-alt-cloudy';
        } else {
            return 'wi wi-cloudy';
        }
    } else if (desc.includes('rain') || desc.includes('drizzle')) {
        if (desc.includes('light')) {
            return isDay ? 'wi wi-day-showers' : 'wi wi-night-alt-showers';
        } else {
            return 'wi wi-rain';
        }
    } else if (desc.includes('thunderstorm')) {
        return 'wi wi-thunderstorm';
    } else if (desc.includes('snow')) {
        return 'wi wi-snow';
    } else if (desc.includes('mist') || desc.includes('fog')) {
        return 'wi wi-fog';
    }
    
    return isDay ? 'wi wi-day-sunny' : 'wi wi-night-clear'; // Default to clear sky
}

// Update current weather display
function updateCurrentWeather(data, cityName) {
    // Format date
    const currentDate = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString('en-US', options);
    
    // Update elements
    cityNameElement.textContent = cityName;
    currentDateElement.textContent = formattedDate;
    
    // Update weather icon with weather-icons
    const iconClass = getIconClass(
        data.current.weather_descriptions[0], 
        new Date().getHours(),
        data.current.temperature
    );
    
    // Update the weather icon
    const weatherIcon = document.querySelector('.weather-icon');
    if (weatherIcon) {
        // Clear previous content and add new icon HTML
        weatherIcon.innerHTML = createWeatherIconHTML(iconClass);
    }
    
    temperatureElement.innerHTML = `${celsiusToFahrenheit(data.current.temperature)}<span class="temp-unit">°F</span>`;
    weatherDescriptionElement.textContent = data.current.weather_descriptions[0];
    
    // Update recommendations
    updateRecommendations(data);
    
    // Update environmental data
    updateEnvironmentalData(data);
}

// Switch recommendation category
function switchRecommendationCategory(category) {
    // Remove active class from all buttons
    document.querySelectorAll('.rec-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Hide all recommendation lists
    document.querySelectorAll('.recommendations-list').forEach(list => {
        list.classList.remove('active');
    });
    
    // Show selected category
    document.getElementById(`${category}-list`).classList.add('active');
}

// Update all recommendations based on weather
function updateRecommendations(data) {
    updateActivityRecommendations(data);
    updateKidsRecommendations(data);
    updateOutfitRecommendations(data);
    updateGardeningRecommendations(data);
}

// Update activity recommendations based on weather
function updateActivityRecommendations(data) {
    const activitiesContainer = document.getElementById('activities-list');
    const temp = data.current.temperature;
    const tempF = celsiusToFahrenheit(temp);
    const description = data.current.weather_descriptions[0].toLowerCase();
    const humidity = data.current.humidity;
    const windSpeed = data.current.wind_speed;
    
    const activities = [];
    
    // Temperature-based recommendations (75°F = 24°C, 65°F = 18°C, 80°F = 27°C, 50°F = 10°C, 70°F = 21°C)
    if (tempF >= 75) {
        activities.push({
            icon: '🏊',
            title: 'Swimming',
            description: 'Great weather for outdoor swimming!'
        });
        activities.push({
            icon: '🏖️',
            title: 'Beach Day',
            description: 'Perfect temperature for beach activities'
        });
    }
    
    if (tempF >= 65 && tempF <= 80) {
        activities.push({
            icon: '🚶',
            title: 'Walking',
            description: 'Ideal temperature for a nice walk'
        });
        activities.push({
            icon: '🚴',
            title: 'Cycling',
            description: 'Perfect weather for biking'
        });
    }
    
    if (tempF >= 50 && tempF <= 70) {
        activities.push({
            icon: '🥾',
            title: 'Hiking',
            description: 'Great temperature for outdoor hiking'
        });
        activities.push({
            icon: '🧺',
            title: 'Picnic',
            description: 'Comfortable weather for outdoor dining'
        });
    }
    
    // Weather condition-based recommendations
    if (description.includes('clear') || description.includes('sunny')) {
        activities.push({
            icon: '📷',
            title: 'Photography',
            description: 'Beautiful clear skies for photos'
        });
        activities.push({
            icon: '🏃',
            title: 'Running',
            description: 'Clear skies perfect for outdoor exercise'
        });
    }
    
    if (description.includes('cloud') && !description.includes('rain')) {
        activities.push({
            icon: '🎨',
            title: 'Outdoor Art',
            description: 'Overcast skies provide great lighting'
        });
        activities.push({
            icon: '⚽',
            title: 'Sports',
            description: 'Cloudy weather is ideal for outdoor sports'
        });
    }
    
    if (description.includes('rain') || description.includes('drizzle')) {
        activities.push({
            icon: '☕',
            title: 'Cafe Visit',
            description: 'Perfect weather to enjoy a warm drink indoors'
        });
        activities.push({
            icon: '📚',
            title: 'Reading',
            description: 'Cozy weather for indoor reading'
        });
        activities.push({
            icon: '🎬',
            title: 'Movie Theater',
            description: 'Great day for indoor entertainment'
        });
    }
    
    if (description.includes('snow')) {
        activities.push({
            icon: '⛄',
            title: 'Snow Activities',
            description: 'Perfect for building snowmen or snow angels'
        });
        activities.push({
            icon: '🎿',
            title: 'Winter Sports',
            description: 'Great conditions for skiing or snowboarding'
        });
    }
    
    // Wind-based recommendations
    if (windSpeed > 10 && !description.includes('rain')) {
        activities.push({
            icon: '🪁',
            title: 'Kite Flying',
            description: 'Windy conditions perfect for flying kites'
        });
    }
    
    // Indoor alternatives for extreme conditions (32°F = 0°C, 95°F = 35°C)
    if (tempF < 32 || tempF > 95 || description.includes('storm')) {
        activities.push({
            icon: '🏠',
            title: 'Indoor Activities',
            description: 'Weather suggests staying indoors today'
        });
        activities.push({
            icon: '🛍️',
            title: 'Shopping',
            description: 'Good day for indoor shopping'
        });
    }
    
    // Default activities if none found
    if (activities.length === 0) {
        activities.push({
            icon: '🌤️',
            title: 'Explore',
            description: 'Check out local attractions and activities'
        });
    }
    
    // Render activities (limit to 4)
    activitiesContainer.innerHTML = activities.slice(0, 4).map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
        </div>
    `).join('');
}

// Update kids recommendations based on weather
function updateKidsRecommendations(data) {
    const kidsContainer = document.getElementById('kids-list');
    const temp = data.current.temperature;
    const tempF = celsiusToFahrenheit(temp);
    const description = data.current.weather_descriptions[0].toLowerCase();
    
    const kidsActivities = [];
    
    // Temperature-based kids activities (68°F = 20°C, 59°F = 15°C, 77°F = 25°C)
    if (tempF >= 68) {
        kidsActivities.push({
            icon: '🏐',
            title: 'Water Play',
            description: 'Sprinklers, water balloons, or pool time!'
        });
        kidsActivities.push({
            icon: '🧗',
            title: 'Playground Fun',
            description: 'Perfect weather for climbing and slides'
        });
    }
    
    if (tempF >= 59 && tempF <= 77) {
        kidsActivities.push({
            icon: '🏃',
            title: 'Tag & Hide-and-Seek',
            description: 'Great temperature for running games'
        });
        kidsActivities.push({
            icon: '🎨',
            title: 'Chalk Art',
            description: 'Draw colorful masterpieces on the sidewalk'
        });
    }
    
    // Weather condition-based kids activities
    if (description.includes('clear') || description.includes('sunny')) {
        kidsActivities.push({
            icon: '🔍',
            title: 'Nature Scavenger Hunt',
            description: 'Find leaves, rocks, and interesting items'
        });
        kidsActivities.push({
            icon: '🦋',
            title: 'Bug Watching',
            description: 'Observe insects and small creatures'
        });
    }
    
    if (description.includes('rain') || description.includes('drizzle')) {
        kidsActivities.push({
            icon: '🎭',
            title: 'Indoor Theater',
            description: 'Put on a play or puppet show'
        });
        kidsActivities.push({
            icon: '🧩',
            title: 'Puzzle Time',
            description: 'Work on jigsaw puzzles together'
        });
        kidsActivities.push({
            icon: '🍪',
            title: 'Baking Fun',
            description: 'Make cookies or simple snacks'
        });
    }
    
    if (description.includes('snow')) {
        kidsActivities.push({
            icon: '⛄',
            title: 'Snowman Building',
            description: 'Build snowmen and snow angels'
        });
        kidsActivities.push({
            icon: '🛷',
            title: 'Snow Play',
            description: 'Sledding and snowball fights'
        });
    }
    
    // Default kids activities
    if (kidsActivities.length === 0) {
        kidsActivities.push({
            icon: '🎲',
            title: 'Board Games',
            description: 'Perfect weather for indoor game time'
        });
        kidsActivities.push({
            icon: '📚',
            title: 'Story Time',
            description: 'Read books or tell stories'
        });
    }
    
    // Render kids activities (limit to 4)
    kidsContainer.innerHTML = kidsActivities.slice(0, 4).map(activity => `
        <div class="recommendation-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="recommendation-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
        </div>
    `).join('');
}

// Update outfit recommendations based on weather
function updateOutfitRecommendations(data) {
    const outfitsContainer = document.getElementById('outfits-list');
    const temp = data.current.temperature;
    const tempF = celsiusToFahrenheit(temp);
    const description = data.current.weather_descriptions[0].toLowerCase();
    const windSpeed = data.current.wind_speed;
    
    const outfits = [];
    
    // Temperature-based outfit recommendations (77°F = 25°C, 59°F = 15°C, 75°F = 24°C, 41°F = 5°C, 57°F = 14°C)
    if (tempF >= 77) {
        outfits.push({
            icon: '👕',
            title: 'Light & Breezy',
            description: 'T-shirt, shorts, and sandals'
        });
        outfits.push({
            icon: '🕶️',
            title: 'Sun Protection',
            description: 'Hat, sunglasses, and sunscreen'
        });
    }
    
    if (tempF >= 59 && tempF <= 75) {
        outfits.push({
            icon: '👔',
            title: 'Comfortable Layers',
            description: 'Long pants, light shirt, optional cardigan'
        });
        outfits.push({
            icon: '👟',
            title: 'Walking Shoes',
            description: 'Comfortable sneakers or walking shoes'
        });
    }
    
    if (tempF >= 41 && tempF <= 57) {
        outfits.push({
            icon: '🧥',
            title: 'Jacket Weather',
            description: 'Jeans, sweater, and light jacket'
        });
        outfits.push({
            icon: '🧣',
            title: 'Warm Accessories',
            description: 'Scarf and closed-toe shoes'
        });
    }
    
    if (tempF < 41) {
        outfits.push({
            icon: '🧤',
            title: 'Bundle Up',
            description: 'Heavy coat, gloves, and warm hat'
        });
        outfits.push({
            icon: '🥾',
            title: 'Warm Footwear',
            description: 'Insulated boots and thick socks'
        });
    }
    
    // Weather condition-based outfit recommendations
    if (description.includes('rain') || description.includes('drizzle')) {
        outfits.push({
            icon: '☔',
            title: 'Rain Gear',
            description: 'Umbrella, rain jacket, and waterproof shoes'
        });
    }
    
    if (windSpeed > 15) {
        outfits.push({
            icon: '🌪️',
            title: 'Wind Protection',
            description: 'Windbreaker and secure accessories'
        });
    }
    
    // Default outfit recommendation
    if (outfits.length === 0) {
        outfits.push({
            icon: '👗',
            title: 'Comfortable Casual',
            description: 'Dress comfortably for the weather'
        });
    }
    
    // Render outfits (limit to 4)
    outfitsContainer.innerHTML = outfits.slice(0, 4).map(outfit => `
        <div class="recommendation-item">
            <div class="activity-icon">${outfit.icon}</div>
            <div class="recommendation-content">
                <h4>${outfit.title}</h4>
                <p>${outfit.description}</p>
            </div>
        </div>
    `).join('');
}

// Update gardening recommendations based on weather
function updateGardeningRecommendations(data) {
    const gardeningContainer = document.getElementById('gardening-list');
    const temp = data.current.temperature;
    const tempF = celsiusToFahrenheit(temp);
    const description = data.current.weather_descriptions[0].toLowerCase();
    const humidity = data.current.humidity;
    const windSpeed = data.current.wind_speed;
    
    const gardeningTips = [];
    
    // Temperature-based gardening advice (68°F = 20°C, 86°F = 30°C, 59°F = 15°C, 77°F = 25°C)
    if (tempF >= 68 && tempF <= 86) {
        gardeningTips.push({
            icon: '🌱',
            title: 'Perfect Planting',
            description: 'Ideal temperature for planting most vegetables'
        });
        gardeningTips.push({
            icon: '💧',
            title: 'Regular Watering',
            description: 'Water plants early morning or evening'
        });
    }
    
    if (tempF >= 59 && tempF <= 77) {
        gardeningTips.push({
            icon: '🌿',
            title: 'Pruning Time',
            description: 'Great weather for pruning and trimming'
        });
        gardeningTips.push({
            icon: '🌸',
            title: 'Flower Care',
            description: 'Perfect conditions for flowering plants'
        });
    }
    
    if (tempF > 86) {
        gardeningTips.push({
            icon: '🌞',
            title: 'Heat Protection',
            description: 'Provide shade for sensitive plants'
        });
        gardeningTips.push({
            icon: '💦',
            title: 'Extra Watering',
            description: 'Increase watering frequency in hot weather'
        });
    }
    
    // Weather condition-based gardening advice
    if (description.includes('rain') || description.includes('drizzle')) {
        gardeningTips.push({
            icon: '☔',
            title: 'Natural Watering',
            description: 'Let rain water your plants naturally'
        });
        gardeningTips.push({
            icon: '🏠',
            title: 'Indoor Planning',
            description: 'Plan garden layout or start seeds indoors'
        });
    }
    
    if (description.includes('clear') || description.includes('sunny')) {
        gardeningTips.push({
            icon: '🌻',
            title: 'Harvest Time',
            description: 'Perfect day for harvesting fruits and vegetables'
        });
        gardeningTips.push({
            icon: '🍅',
            title: 'Tomato Care',
            description: 'Check tomatoes and other sun-loving plants'
        });
    }
    
    if (windSpeed > 15) {
        gardeningTips.push({
            icon: '🌿',
            title: 'Wind Protection',
            description: 'Stake tall plants and protect delicate ones'
        });
    }
    
    // Humidity-based advice
    if (humidity > 70) {
        gardeningTips.push({
            icon: '🍄',
            title: 'Fungus Prevention',
            description: 'Watch for fungal issues in high humidity'
        });
    }
    
    // Default gardening advice
    if (gardeningTips.length === 0) {
        gardeningTips.push({
            icon: '🌾',
            title: 'Garden Maintenance',
            description: 'Good day for general garden upkeep'
        });
        gardeningTips.push({
            icon: '🌱',
            title: 'Check Plants',
            description: 'Inspect plants for health and growth'
        });
    }
    
    // Render gardening tips (limit to 4)
    gardeningContainer.innerHTML = gardeningTips.slice(0, 4).map(tip => `
        <div class="recommendation-item">
            <div class="activity-icon">${tip.icon}</div>
            <div class="recommendation-content">
                <h4>${tip.title}</h4>
                <p>${tip.description}</p>
            </div>
        </div>
    `).join('');
}

// Update environmental data display
function updateEnvironmentalData(data) {
    // Update UV Index
    const uvIndex = data.current.uv_index || Math.floor(Math.random() * 11);
    uvIndexElement.textContent = uvIndex;
    uvDescriptionElement.textContent = getUVDescription(uvIndex);
    
    // Update Air Quality Index (mock data since API may not provide it)
    const airQualityIndex = data.current.air_quality_index || Math.floor(Math.random() * 150) + 50;
    airQualityIndexElement.textContent = airQualityIndex;
    airQualityDescriptionElement.textContent = getAirQualityDescription(airQualityIndex);
}

// Helper function to get UV index description
function getUVDescription(uvIndex) {
    if (uvIndex <= 2) return 'Low - Minimal protection needed';
    if (uvIndex <= 5) return 'Moderate - Seek shade during midday';
    if (uvIndex <= 7) return 'High - Protection essential';
    if (uvIndex <= 10) return 'Very High - Extra protection required';
    return 'Extreme - Avoid sun exposure';
}

// Helper function to get air quality description
function getAirQualityDescription(aqi) {
    if (aqi <= 50) return 'Good - Air quality is satisfactory';
    if (aqi <= 100) return 'Moderate - Acceptable for most people';
    if (aqi <= 150) return 'Unhealthy for sensitive groups';
    if (aqi <= 200) return 'Unhealthy - Everyone may experience effects';
    if (aqi <= 300) return 'Very Unhealthy - Health alert';
    return 'Hazardous - Emergency conditions';
}

// Update forecast display
function updateForecast(data) {
    const forecastElement = document.getElementById('forecast');
    forecastElement.innerHTML = '';

    // Group forecast by day (one entry per day)
    const dailyForecasts = {};

    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Only add if we don't already have this day or if it's 12:00
        if (!dailyForecasts[day] || date.getHours() === 12) {
            dailyForecasts[day] = forecast;
        }
    });

    // Convert to array and take only 5 days
    const forecastArray = Object.values(dailyForecasts).slice(0, 5);

    // Create forecast elements
    forecastArray.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const tempF = celsiusToFahrenheit(forecast.main.temp);
        const tempLowF = celsiusToFahrenheit(forecast.main.temp * 0.7);

        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        // Get icon class based on weather and temperature
        const iconClass = getIconClass(
            forecast.weather[0].description, 
            date.getHours(),
            forecast.main.temp
        );
        
        forecastItem.innerHTML = `
            <span class="forecast-date">${day}</span>
            <div class="forecast-icon">${createWeatherIconHTML(iconClass)}</div>
            <span class="forecast-temp">${tempF}°F</span>
            <span class="forecast-temp-low">${tempLowF}°F</span>
        `;

        forecastElement.appendChild(forecastItem);
    });
}

// Create temperature and precipitation charts
function createCharts(data) {
    // Prepare data for charts
    const timestamps = [];
    const temperatures = [];
    const precipitationChances = [];
    const humidityValues = [];

    // Get next 24 hours of data (8 data points, 3 hours apart)
    data.list.slice(0, 8).forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const time = date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
        timestamps.push(time);
        temperatures.push(forecast.main.temp);
        // Calculate precipitation chance (0-100%)
        precipitationChances.push(forecast.pop * 100);
        // Add humidity data for the humidity chart
        humidityValues.push(forecast.main.humidity);
    });

    // Destroy existing charts if they exist
    if (tempChart) tempChart.destroy();
    if (precipChart) precipChart.destroy();

    // Create humidity chart (using the temp-chart canvas)
    const tempCtx = document.getElementById('temp-chart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                data: temperatures,
                borderColor: '#f9a826', // Orange color matching the design
                backgroundColor: 'rgba(249, 168, 38, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#333'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#333'
                    }
                }
            }
        }
    });

    // Create precipitation chance chart
    const precipCtx = document.getElementById('precip-chart').getContext('2d');
    precipChart = new Chart(precipCtx, {
        type: 'bar',
        data: {
            labels: timestamps,
            datasets: [{
                data: precipitationChances,
                backgroundColor: 'rgba(249, 168, 38, 0.7)' // Orange color matching the design
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#333'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#333'
                    }
                }
            }
        }
    });
}

// Saved Places functionality

// Save place functionality
// (currentWeatherData is already defined at the top of the file)

// Save the current place
async function saveCurrentPlace() {
    // Get current city name
    const cityName = cityNameElement.textContent;
    
    // Don't save if no city is displayed or if it's the default placeholder
    if (!cityName || cityName === '--') {
        alert('Please search for a location first');
        return;
    }
    
    // Check if we have current weather data
    if (!currentWeatherData) {
        alert('Weather data is not available. Please try again.');
        return;
    }
    
    // Check if user is logged in
    if (!authToken) {
        alert('Please log in to save places');
        showLoginForm();
        return;
    }
    
    try {
        // Create place object to save
        const placeToSave = {
            name: cityName,
            temp: Math.round(currentWeatherData.current.temperature),
            description: currentWeatherData.current.weather_descriptions[0],
            icon: getIconClass(currentWeatherData.current.weather_descriptions[0], new Date().getHours(), currentWeatherData.current.temperature)
        };
        
        // Save to the server
        const response = await fetch('/api/users/saved-places', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': authToken
            },
            body: JSON.stringify(placeToSave)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to save place');
        }
        
        // Update the UI
        loadSavedPlaces();
        
        // Show confirmation
        alert(`${cityName} has been added to your saved places`);
    } catch (error) {
        console.error('Error saving place:', error);
        alert('Error saving place: ' + error.message);
    }
}

// Load saved places from the server
async function loadSavedPlaces() {
    if (!authToken) {
        renderSavedPlaces([]);
        return;
    }
    
    try {
        const response = await fetch('/api/users/saved-places', {
            headers: {
                'x-auth-token': authToken
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load saved places');
        }
        
        renderSavedPlaces(data);
    } catch (error) {
        console.error('Error loading saved places:', error);
        renderSavedPlaces([]);
    }
}

// Render saved places in the UI
function renderSavedPlaces(places) {
    // Clear current list
    savedPlacesList.innerHTML = '';
    
    if (places.length === 0) {
        // Show message if no places saved
        let message = 'No saved places yet.';
        if (authToken) {
            message += ' Search for a location and click "Save Current Place".';
        } else {
            message += ' Please login to save places.';
        }
        savedPlacesList.innerHTML = `<p class="no-places-message">${message}</p>`;
        return;
    }
    
    // Create element for each saved place
    places.forEach(place => {
        const placeElement = document.createElement('div');
        placeElement.className = 'saved-place-item';
        placeElement.draggable = true; // Make the element draggable
        placeElement.setAttribute('data-id', place._id || place.id); // Use MongoDB _id
        placeElement.innerHTML = `
            <button class="remove-place" data-id="${place._id || place.id}">×</button>
            <span class="saved-place-name">${place.name}</span>
        `;
        
        // Click on place to get weather
        placeElement.addEventListener('click', (e) => {
            // Don't trigger if clicking on the remove button
            if (e.target.classList.contains('remove-place')) return;
            
            // Load weather for this place
            getWeatherData(null, null, place.name);
        });
        
        // Drag event listeners
        placeElement.addEventListener('dragstart', handleDragStart);
        placeElement.addEventListener('dragover', handleDragOver);
        placeElement.addEventListener('dragenter', handleDragEnter);
        placeElement.addEventListener('dragleave', handleDragLeave);
        placeElement.addEventListener('drop', handleDrop);
        placeElement.addEventListener('dragend', handleDragEnd);
        
        savedPlacesList.appendChild(placeElement);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-place').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent click from bubbling to parent
            const placeId = e.target.getAttribute('data-id');
            await removePlace(placeId);
        });
    });
}

// Remove a place from saved places
async function removePlace(placeId) {
    // Confirm before removing
    if (!confirm('Remove this place from your saved places?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/saved-places/${placeId}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': authToken
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to remove place');
        }
        
        // Reload saved places
        loadSavedPlaces();
    } catch (error) {
        console.error('Error removing place:', error);
        alert('Error removing place: ' + error.message);
    }
}

// Variables to track drag and drop operations
let draggedItem = null;
let dragSourceIndex = -1;

// Handle drag start event
function handleDragStart(e) {
    draggedItem = this;
    dragSourceIndex = Array.from(this.parentNode.children).indexOf(this);
    
    // Set data for dragging (required for Firefox)
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    
    // Add dragging class
    this.classList.add('dragging');
    
    // Add a slight delay so the original item is visible during dragging
    setTimeout(() => {
        this.style.opacity = '0.4';
    }, 0);
}

// Handle drag over event
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Allows us to drop
    }
    
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// Handle drag enter event
function handleDragEnter(e) {
    this.classList.add('drag-over');
}

// Handle drag leave event
function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

// Handle drop event
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
    }
    
    if (draggedItem !== this) {
        // Get the index of the drop target
        const dropTargetIndex = Array.from(this.parentNode.children).indexOf(this);
        
        // Call the API to update the order
        reorderSavedPlaces(dragSourceIndex, dropTargetIndex);
    }
    
    return false;
}

// Handle drag end event
function handleDragEnd(e) {
    // Remove all drag-related classes
    document.querySelectorAll('.saved-place-item').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
        item.style.opacity = '1';
    });
}

// Reorder saved places
async function reorderSavedPlaces(fromIndex, toIndex) {
    try {
        // Get all saved places elements
        const placeElements = document.querySelectorAll('.saved-place-item');
        
        // Create an array of place IDs in their new order
        const places = Array.from(placeElements).map(el => ({
            id: el.getAttribute('data-id')
        }));
        
        // Move the item in the array
        const [movedItem] = places.splice(fromIndex, 1);
        places.splice(toIndex, 0, movedItem);
        
        // Send the reordered array to the server
        const response = await fetch('/api/users/saved-places/reorder', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': authToken
            },
            body: JSON.stringify({ places })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reorder places');
        }
        
        // Reload saved places
        loadSavedPlaces();
    } catch (error) {
        console.error('Error reordering places:', error);
        alert('Error reordering places: ' + error.message);
    }
}

// Dark mode functionality
function initializeDarkMode() {
    console.log('initializeDarkMode called, isDarkMode:', isDarkMode);
    // Apply dark mode if previously enabled
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        console.log('Applied dark theme on initialization');
        updateDarkModeIcon();
    }
}

function toggleDarkMode() {
    console.log('toggleDarkMode called, current isDarkMode:', isDarkMode);
    isDarkMode = !isDarkMode;
    console.log('New isDarkMode value:', isDarkMode);
    
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        console.log('Applied dark theme');
    } else {
        document.documentElement.removeAttribute('data-theme');
        console.log('Removed dark theme');
    }
    
    // Save preference
    localStorage.setItem('weatherOrNotDarkMode', isDarkMode.toString());
    
    // Update icon
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    }
}

// Export functions for testing (when running in test environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getIconClass,
        getWeatherData,
        getUserLocation,
        handleSearch,
        debounce,
        saveCurrentPlace,
        loadSavedPlaces,
        removePlace,
        toggleDarkMode
    };
}
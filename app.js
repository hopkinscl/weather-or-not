// API configuration
const BASE_URL = '/api/weather';

// Auth state
let authToken = localStorage.getItem('weatherOrNotAuthToken') || null;
let currentUser = JSON.parse(localStorage.getItem('weatherOrNotCurrentUser') || 'null');

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

// Charts
let tempChart;
let precipChart;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Add auth UI elements
    setupAuthUI();
    
    // Default location (New York)
    getWeatherData(40.7128, -74.0060, 'New York');

    // Load saved places if logged in
    if (authToken) {
        loadSavedPlaces();
    }

    // Event listeners
    getLocationBtn.addEventListener('click', getUserLocation);
    searchBtn.addEventListener('click', handleSearch);
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    savePlaceBtn.addEventListener('click', saveCurrentPlace);
    
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
                // Use coordinates with our backend API
                getWeatherData(latitude, longitude, 'Your Location');
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
    
    // Search by city name through our API
    getWeatherData(null, null, location);
}

// Fetch weather data from API
async function getWeatherData(lat, lon, cityName) {
    try {
        // Show loading state
        document.querySelector('.current-weather').classList.add('loading');
        document.querySelector('.forecast-section').classList.add('loading');
        document.querySelector('.chart-container').classList.add('loading');
        
        // Prepare API endpoint
        let endpoint, params;
        if (lat && lon) {
            endpoint = `${BASE_URL}/coordinates`;
            params = `lat=${lat}&lon=${lon}`;
        } else {
            endpoint = `${BASE_URL}/current`;
            params = `query=${encodeURIComponent(cityName)}`;
        }
        
        // Fetch weather data from our backend API
        const weatherResponse = await fetch(`${endpoint}?${params}`);
        const weatherData = await weatherResponse.json();
        
        if (weatherData.error) {
            throw new Error(weatherData.error.info || 'Failed to fetch weather data');
        }
        
        // Store the current weather data for saving places
        currentWeatherData = weatherData;
        
        // Update UI with the data
        updateCurrentWeather(weatherData, weatherData.location.name || cityName);
        updateForecast(weatherData.forecast);
        createCharts(weatherData.forecast);
        
        // Remove loading state
        document.querySelector('.current-weather').classList.remove('loading');
        document.querySelector('.forecast-section').classList.remove('loading');
        document.querySelector('.chart-container').classList.remove('loading');
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data: ' + error.message);
        
        // Remove loading state
        document.querySelector('.current-weather').classList.remove('loading');
        document.querySelector('.forecast-section').classList.remove('loading');
        document.querySelector('.chart-container').classList.remove('loading');
    }
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
    const tempF = temp ? Math.round((temp * 9/5) + 32) : null;
    
    // Check if it's warm but description mentions snow (to avoid inconsistency)
    if (desc.includes('snow') && tempF && tempF > 45) {
        // Override snow with cloudy for warmer temperatures
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
    
    temperatureElement.textContent = `${Math.round((data.current.temperature * 9/5) + 32)}°`;
    weatherDescriptionElement.textContent = data.current.weather_descriptions[0];
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
        const tempF = Math.round((forecast.main.temp * 9/5) + 32);

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
            <span class="forecast-temp">${tempF}°</span>
            <span class="forecast-temp-low">${Math.round(tempF * 0.7)}°</span>
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
        temperatures.push((forecast.main.temp * 9/5) + 32);
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
                borderColor: '#ff9f80',
                backgroundColor: 'rgba(255, 159, 128, 0.1)',
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
                backgroundColor: 'rgba(100, 181, 246, 0.7)'
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

// Current weather data to be saved
let currentWeatherData = null;

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
            temp: Math.round((currentWeatherData.current.temperature * 9/5) + 32),
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
        removePlace
    };
}
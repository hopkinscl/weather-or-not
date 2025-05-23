# Weather or Not

A full-stack weather application that displays current weather conditions, forecasts, and allows users to save their favorite locations.

## Features

- Current weather conditions
- 5-day forecast
- Temperature and precipitation charts
- User authentication (register/login)
- Save favorite locations to your account
- Geolocation support
- Drag and drop to reorder saved locations

## Technical Stack

### Frontend
- HTML5, CSS3, JavaScript
- Chart.js for weather data visualization

### Backend
- Node.js with Express.js
- MongoDB for data storage
- JWT for authentication
- Axios for API requests

## Getting Started

1. Clone the repository

2. Set up environment variables:
   - Create a `.env` file based on `.env.example`
   - Add your MongoDB connection string and WeatherStack API key

3. Install dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   npm start
   ```

5. The application will be available at http://localhost:3000

## Development

To run the application in development mode with automatic restart:

```
npm run dev
```

## API Endpoints

### Weather API
- `GET /api/weather/current?query=<city>` - Get current weather for a city
- `GET /api/weather/coordinates?lat=<lat>&lon=<lon>` - Get weather by coordinates
- `GET /api/weather/forecast?query=<city>` - Get forecast for a city

### User API
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/saved-places` - Get user's saved places (requires auth)
- `POST /api/users/saved-places` - Add a saved place (requires auth)
- `DELETE /api/users/saved-places/:id` - Remove a saved place (requires auth)
- `PUT /api/users/saved-places/reorder` - Reorder saved places (requires auth)

## Testing

This application includes unit tests using Jest. To run the tests:

1. Run tests:
   ```
   npm test
   ```

2. Run tests in watch mode (automatically reruns when files change):
   ```
   npm run test:watch
   ```

## Test Coverage

The tests cover the following functionality:

- Weather icon code generation
- Mock forecast data generation
- Debounce functionality
- Weather data fetching and processing
- Geolocation handling
- Search functionality
- Saved places management (saving/loading/removing)

## Database Schema

### User Model
- `username`: String (required, unique)
- `email`: String (required, unique)
- `password`: String (hashed, required)
- `createdAt`: Date

### SavedPlace Model
- `user`: ObjectId (reference to User model)
- `name`: String (required)
- `temp`: Number (required)
- `description`: String (required)
- `icon`: String (required)
- `order`: Number (required, for sorting)
- `createdAt`: Date
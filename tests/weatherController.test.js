const weatherController = require('../controllers/weatherController');
const SavedPlace = require('../models/SavedPlace');

// Mock dependencies
jest.mock('../models/SavedPlace', () => ({
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock('axios', () => ({
    get: jest.fn()
}));

const axios = require('axios');

describe('Weather Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getWeather', () => {
        it('should fetch weather data successfully', async () => {
            // Mock axios response
            const mockWeatherData = {
                data: {
                    main: { temp: 25 },
                    weather: [{ description: 'sunny' }],
                    name: 'New York'
                }
            };
            axios.get.mockResolvedValue(mockWeatherData);

            const req = {
                query: {
                    city: 'New York'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await weatherController.getWeather(req, res);

            expect(axios.get).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockWeatherData.data);
        });

        it('should handle errors when fetching weather data', async () => {
            // Mock axios error
            axios.get.mockRejectedValue(new Error('API error'));

            const req = {
                query: {
                    city: 'New York'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await weatherController.getWeather(req, res);

            expect(axios.get).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Error fetching weather data',
                error: 'API error'
            });
        });
    });

    describe('getSavedPlaces', () => {
        it('should return saved places for a user', async () => {
            // Mock saved places
            const mockPlaces = [
                { city: 'New York', user: 'userId1' },
                { city: 'London', user: 'userId1' }
            ];
            SavedPlace.find.mockResolvedValue(mockPlaces);

            const req = {
                user: {
                    id: 'userId1'
                }
            };
            const res = {
                json: jest.fn()
            };

            await weatherController.getSavedPlaces(req, res);

            expect(SavedPlace.find).toHaveBeenCalledWith({ user: 'userId1' });
            expect(res.json).toHaveBeenCalledWith(mockPlaces);
        });
    });

    describe('savePlace', () => {
        it('should save a new place', async () => {
            // Mock saved place
            const mockSavedPlace = {
                _id: 'placeId1',
                city: 'Tokyo',
                user: 'userId1'
            };
            SavedPlace.create.mockResolvedValue(mockSavedPlace);

            const req = {
                body: {
                    city: 'Tokyo'
                },
                user: {
                    id: 'userId1'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await weatherController.savePlace(req, res);

            expect(SavedPlace.create).toHaveBeenCalledWith({
                city: 'Tokyo',
                user: 'userId1'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockSavedPlace);
        });
    });

    describe('deletePlace', () => {
        it('should delete a saved place', async () => {
            // Mock delete result
            const mockDeleteResult = { _id: 'placeId1' };
            SavedPlace.findByIdAndDelete.mockResolvedValue(mockDeleteResult);

            const req = {
                params: {
                    id: 'placeId1'
                }
            };
            const res = {
                json: jest.fn()
            };

            await weatherController.deletePlace(req, res);

            expect(SavedPlace.findByIdAndDelete).toHaveBeenCalledWith('placeId1');
            expect(res.json).toHaveBeenCalledWith({ message: 'Place removed' });
        });

        it('should handle not found places', async () => {
            // Mock null result (place not found)
            SavedPlace.findByIdAndDelete.mockResolvedValue(null);

            const req = {
                params: {
                    id: 'nonExistentId'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await weatherController.deletePlace(req, res);

            expect(SavedPlace.findByIdAndDelete).toHaveBeenCalledWith('nonExistentId');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Place not found' });
        });
    });
});
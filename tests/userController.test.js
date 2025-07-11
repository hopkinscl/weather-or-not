const userController = require('../controllers/userController');

// Mock dependencies
jest.mock('../models/User', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const User = require('../models/User');

describe('User Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should create a new user and return token', async () => {
            // Mock implementation
            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({
                _id: 'mockUserId',
                email: 'test@example.com'
            });

            const req = {
                body: {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await userController.registerUser(req, res);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(User.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalled();
        });

        it('should return 400 if user already exists', async () => {
            // Mock implementation
            User.findOne.mockResolvedValue({ email: 'test@example.com' });

            const req = {
                body: {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await userController.registerUser(req, res);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(User.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
        });
    });

    describe('loginUser', () => {
        it('should login user and return token', async () => {
            // Mock implementation
            const mockUser = {
                _id: 'mockUserId',
                email: 'test@example.com',
                password: 'hashedPassword',
                matchPassword: jest.fn().mockResolvedValue(true)
            };
            User.findOne.mockResolvedValue(mockUser);

            const req = {
                body: {
                    email: 'test@example.com',
                    password: 'password123'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await userController.loginUser(req, res);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(mockUser.matchPassword).toHaveBeenCalledWith('password123');
            expect(res.json).toHaveBeenCalled();
        });

        it('should return 401 if invalid credentials', async () => {
            // Mock implementation
            const mockUser = {
                email: 'test@example.com',
                password: 'hashedPassword',
                matchPassword: jest.fn().mockResolvedValue(false)
            };
            User.findOne.mockResolvedValue(mockUser);

            const req = {
                body: {
                    email: 'test@example.com',
                    password: 'wrongpassword'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await userController.loginUser(req, res);

            expect(mockUser.matchPassword).toHaveBeenCalledWith('wrongpassword');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
        });
    });
});
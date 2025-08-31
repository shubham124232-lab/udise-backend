const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User({
            email,
            password,
            role: role || 'user'
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            error: 'Internal server error during signup'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error during login'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            user: req.user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching user data'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, async (req, res) => {
    try {
        // In a real application, you might want to blacklist the token
        // For now, we'll just return success (client removes token)
        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error during logout'
        });
    }
});

module.exports = router; 
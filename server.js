const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

// Load environment variables
dotenv.config();

const app = express();

const corsOptions = {
  origin: 'https://udise-frontend.vercel.app', // Your frontend domain
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/udise-dashboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Root route (test)
app.get("/", (req, res) => {
    res.send("✅ UDISE Dashboard Backend is running...");
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'UDISE Dashboard API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 UDISE Dashboard API ready at http://localhost:${PORT}`);
}); 

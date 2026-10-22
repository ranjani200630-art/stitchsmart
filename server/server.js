
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize MongoDB connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting credentials (cookies)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const fabricRoutes = require('./routes/fabricRoutes');
const fabricPredictionRoutes = require('./routes/fabricPredictionRoutes');

// Register API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fabrics', fabricRoutes);
app.use('/api/fabric-predictions', fabricPredictionRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to StitchSmart API',
    description: 'Smart Tailoring Order & Fabric Demand Prediction System',
    healthCheck: '/api/health',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      measurements: '/api/measurements',
      orders: '/api/orders',
      notifications: '/api/notifications',
      fabrics: '/api/fabrics',
      fabricPredictions: '/api/fabric-predictions'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[StitchSmart Backend] Server is running on port ${PORT}`);
  console.log(`[StitchSmart Backend] Health Check: http://localhost:${PORT}/api/health`);
  console.log(`[StitchSmart Backend] Auth Base URL: http://localhost:${PORT}/api/auth`);
  console.log(`[StitchSmart Backend] Profile Base URL: http://localhost:${PORT}/api/profile`);
  console.log(`[StitchSmart Backend] Measurements Base URL: http://localhost:${PORT}/api/measurements`);
  console.log(`[StitchSmart Backend] Orders Base URL: http://localhost:${PORT}/api/orders`);
  console.log(`[StitchSmart Backend] Fabrics Base URL: http://localhost:${PORT}/api/fabrics`);
  console.log(`[StitchSmart Backend] Fabric Predictions: http://localhost:${PORT}/api/fabric-predictions`);
});

module.exports = app;


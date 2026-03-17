const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('../config/db');
const authRoutes = require('./routes/authRoutes')
const cookieParser = require('cookie-parser');
dotenv.config();
connectDB();
require('./services/cronJobs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(cookieParser())

app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/transactions', transactionRoutes);

const settingsRoutes = require('./routes/settingsRoutes')
app.use('/api/settings', settingsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
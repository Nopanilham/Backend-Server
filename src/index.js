const express = require('express');
const dotenv = require('dotenv');
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login');
const uploadImageRoute = require('./routes/upload-image');
const getHistoryRoutes = require('./routes/get-history');

dotenv.config();
const app = express();

// Middleware untuk JSON dan x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/register', registerRoute);
app.use('/login', loginRoute);
app.use('/upload-image', uploadImageRoute);
app.use('/get-history', getHistoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
require('dotenv').config();  // Make sure environment variables are loaded first
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const tasksRouter = require('./ROUTES/Tasks');
const usersRouter = require('./ROUTES/Users');
const authsRouter = require('./ROUTES/PasswordReset');
const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({origin:'*'}));

// mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mern-task-app')
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://aadityachouhan787898:aadi.kita_b@cluster0.qfvct.mongodb.net/')
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); 
  });

// Routes
app.use('/users', usersRouter);
app.use('/tasks', tasksRouter);
app.use('/password_reset', authsRouter);

// Generic error handler middleware for unhandled errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong, please try again later.' });
});

// Start server with an environment variable for the port (default to 5500)
// const PORT = process.env.PORT || 5500;
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


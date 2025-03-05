const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../MODELS/User');

const router = express.Router();

// Route to get all users
router.get('/getusers', async (req, res) => {
    try {
        const users = await User.find(); // Fetch all users from the database
        res.json(users); // Send the response back as JSON
    } catch (error) {
        res.status(500).json({ message: error.message }); // Handle any errors that occur
    }
});

// Route to create a new user
router.post('/postusers', async (req, res) => {
    const { Email, Firstname, Lastname, Username, Password, Image } = req.body;

    try {
        // console.log("API hitted", req.body);
        // Check if the email already exists
        const existingUser = await User.findOne({ $or: [{ Email }, { Username }] });

        if (existingUser) {
            return res.status(400).json({ message: 'email already exists.' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Create a new user instance
        const newUser = new User({
            Email,
            Firstname,
            Lastname,
            Username,
            Password: hashedPassword,
            Image,
        });

        // console.log("newUser", newUser);
        // Save the user to the database
        const savedUser = await newUser.save();

        // Create a JWT token for the new user
        const token = jwt.sign(
            { userId: savedUser._id, Email: savedUser.Email, Username: savedUser.Username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );

        // Send the response with the token
        res.status(201).json({ token, user: savedUser });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route to log in an existing user
router.post('/login', async (req, res) => {
    console.log("req-body", req.body); // Debugging log
    const { Identifier, Password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ $or: [{ Email: Identifier }, { Username: Identifier }] });  // Ensure case consistency
        if (!user) {
            return res.status(400).json({ message: 'Invalid email, password or username' });
        }
        // console.log("user found:", user);

        // Compare the entered password with the hashed password in the DB
        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        // console.log("Password match:", isMatch);

        // Generate a JWT token including user's first name
        const token = jwt.sign(
            { userId: user._id, Email: user.Email, Firstname: user.Firstname },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expiration of 1 hour
        );

        // Send token, email, and firstname in the response
        res.json({
            token,
            Email: user.Email,
            Firstname: user.Firstname,
            Image: user.Image,
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
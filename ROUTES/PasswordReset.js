require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../MODELS/User");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/send-reset-link", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ Email: email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Generate a reset token (valid for 15 minutes)
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "15m" });
        const resetLink = `http://localhost:3000/reset-password/${token}`; // Frontend URL

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password for "कार्यसेतु ". This link expires in 15 minutes.</p>`,
        };

        // Send email
        await transporter.sendMail(mailOptions).then(() => {
            res.json({ message: "Password reset link sent to email." });
        }).catch(error => {
            console.error("Error sending email:", error);
            res.status(500).json({ message: "Error sending email." });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;
    // console.log("tokennnnnnnnnnn", token);
    // console.log("password", password);

    if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required." });
    }

    if (password.trim().length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Prevent reusing the same password
        const isSamePassword = await bcrypt.compare(password, user.Password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password must be different from the old password." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        user.Password = hashedPassword;
        await user.save();

        res.json({ message: "Password reset successful." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(400).json({ message: "Invalid or expired token." });
    }
});

module.exports = router;

//etsrtgsrdgsdrgy
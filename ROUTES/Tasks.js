const express = require('express');
const jwt = require('jsonwebtoken');
const Task = require('../MODELS/Task');
const router = express.Router();
const moment = require('moment-timezone');
const nodemailer = require("nodemailer");
const cron = require("node-cron");
require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// Middleware to authenticate the user
const authenticateUser = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    //console.log("token in API", token);
    if (!token) {
        return res.status(401).json({ message: 'Access denied, token missing.' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);  // Corrected the typo here
        req.user = decoded; // Attach decoded user data to request
        // console.log("req.user", req.user);
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid or expired token.' });
    }
};

router.post("/posttasks", authenticateUser, async (req, res) => {
    // console.log("posttask API hit backend");
    const { title, description, deadline, reminderTime, isCompleted } = req.body;

    if (!title || !deadline) {
        return res.status(400).json({ message: "Title and deadline are required." });
    }

    try {
        // Convert deadline to Date object
        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate)) {
            return res.status(400).json({ message: "Invalid deadline format." });
        }

        const isComplete = Boolean(isCompleted); 
        console.log("isComplete", isComplete);

        let reminderDate = reminderTime ? new Date(reminderTime) : new Date(deadlineDate.getTime() - 60 * 60 * 1000);
        if (isNaN(reminderDate)) {
            return res.status(400).json({ message: "Invalid reminderTime format." });
        }

        const newTask = new Task({
            userId: req.user.userId,
            title,
            description: description || "",
            deadline: deadlineDate,
            reminderTime: reminderDate,
            reminderSent: false,
            isCompleted: isComplete,
        });

        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            // Find tasks where the reminder time has passed but email is not sent
            const tasksToRemind = await Task.find({
                reminderTime: { $lte: now },
                reminderSent: false,
            }).populate("userId", "email");

            for (const task of tasksToRemind) {
                const mailOptions = {
                    from: EMAIL_USER,
                    to: req.user.Email,
                    subject: "Task Reminder: " + task.title,
                    text: `Hello, you have a pending task: "${task.title}".\n\nDescription: ${task.description}\nDeadline: ${moment(task.deadline).format("DD-MM-YYYY HH:mm")}\n\nStay productive!`,
                };

                await transporter.sendMail(mailOptions);
                task.reminderSent = true; // Mark reminder as sent
                await task.save();
                // console.log(`Reminder sent for task: ${task.title}`);
            }
        } catch (error) {
            console.error("Error sending reminders:", error);
        }
    });
});

// Get all tasks for the logged-in user
router.get('/gettasks', authenticateUser, async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = Math.max(1, parseInt(page)); // Ensure page is at least 1
        limit = Math.max(1, parseInt(limit)); // Ensure limit is at least 1

        const skip = (page - 1) * limit;

        // Fetch tasks with sorting (latest first) and only required fields
        const tasks = await Task.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })  //Sort by latest first
            .skip(skip)
            .limit(limit);
        // .select('title description createdAt updatedAt reminderTime deadline');

        const totalTasks = await Task.countDocuments({ userId: req.user.userId });

        console.log("totalTasks", totalTasks);
        console.log("isCompleted?", tasks);
        console.log("isCompleted?", tasks[0].isCompleted);

        const totalPages = Math.max(1, Math.ceil(totalTasks / limit));
        // console.log("totalPages", totalPages);
        res.status(200).json({
            tasks,
            totalTasks,
            totalPages,
            currentPage: page,
            isCompleted: tasks[0].isCompleted,
        });

    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Update a task's title and description 
router.put('/puttasks/:id', authenticateUser, async (req, res) => {
    try {
        console.log("req.params", req.params);
        console.log("req.body", req.body);
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const isComplete = Boolean(req.body.isCompleted); 
        console.log("isComplete", req.body.isComplete);

        // Update the task with new data
        task.title = req.body.title;
        task.description = req.body.description;
        task.deadline = new Date(req.body.deadline);
        task.reminderTime = new Date(req.body.reminderTime);
        task.isCompleted = isComplete;

        // Save the updated task (Mongoose will handle updating the `updatedAt` field)
        await task.save();

        // Convert the timestamps to IST
        const taskWithIST = task.toObject(); // Convert mongoose document to plain object
        taskWithIST.createdAt = moment.tz(task.createdAt, 'Asia/Kolkata').format(); // Format the createdAt field to IST
        taskWithIST.updatedAt = moment.tz(task.updatedAt, 'Asia/Kolkata').format(); // Format the updatedAt field to IST
        taskWithIST.deadline = moment.tz(task.deadline, 'Asia/Kolkata').format(); // Format the updatedAt field to IST
        taskWithIST.reminderTime = moment.tz(task.reminderTime, 'Asia/Kolkata').format(); // Format the updatedAt field to IST

        res.json(taskWithIST); // Send the updated task back with formatted timestamps
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a task (only for the logged-in user)
router.delete('/deletetasks/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    try {
        const task = await Task.findOneAndDelete({ _id: id, userId: req.user.userId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found or you do not have permission to delete this task.' });
        }

        res.json({ message: 'Task deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

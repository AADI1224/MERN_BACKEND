const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    deadline: {
      type: Date,
      required: true, // Task must have a deadline
    },
    reminderTime: {
      type: Date,
      required: true, // Time when the reminder should be sent
    },
    reminderSent: {
      type: Boolean,
      default: false, // Initially, no reminder has been sent
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;

const mongoose = require('mongoose');

// Check if the model is already defined to avoid overwriting
const UserSchema = new mongoose.Schema({
    Email: { type: String, required: true, unique: true },
    Firstname: { type: String, required: true },
    Lastname: { type: String, required: true },
    Password: { type: String, required: true },
    Username: { type: String, required: true},
    Image: {type: String, required: false},
});

// Check for pre-existing compiled model
const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    id: { type: String, required: true },
    content: { type: String, required: true },
    role: { type: String, enum: ["user", "bot"], required: true },
    timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema({
    session_id: { type: String, required: true },
    title: { type: String, default: "New Chat" },
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now }    
})

const ChatSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessions: [SessionSchema],
});

module.exports = mongoose.model('Chat', ChatSchema);
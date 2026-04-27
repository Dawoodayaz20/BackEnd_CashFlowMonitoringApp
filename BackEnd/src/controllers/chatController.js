const Chat = require('../models/Chat');

// GET /api/chat/history — all sessions for sidebar
const chatHistory = async (req, res) => {
    try {
        const chat = await Chat.findOne({ user_id: req.userId });
        const sessions = chat ? chat.sessions.map(s => ({
            session_id: s.session_id,
            title: s.title,
            createdAt: s.createdAt,
        })) : [];
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch history' });
    }
}

// GET /api/chat/history/:session_id — messages of a specific session
const getSession = async (req, res) => {
    try {
        const chat = await Chat.findOne({ user_id: req.userId });
        const session = chat?.sessions.find(s => s.session_id === req.params.session_id);
        res.json(session ? session.messages : []);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch session' });
    }
}

// POST /api/chat/session — create a new session
const createSession = async (req, res) => {
    try {
        const { session_id, title } = req.body;

        await Chat.findOneAndUpdate(
            { user_id: req.userId },
            { $push: { sessions: { session_id, title, messages: [] } } },
            { upsert: true, new: true }
        );

        console.log("Session created successfully!")
        res.json({ success: true, session_id });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to create session' });
    }
}

// POST /api/chat/message — push message to a specific session
const saveMessage = async (req, res) => {
    try {
        const { session_id, id, content, role, timestamp } = req.body;

        await Chat.findOneAndUpdate(
            { user_id: req.userId, "sessions.session_id": session_id },
            { $push: { "sessions.$.messages": { id, content, role, timestamp } } },
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to save message' });
    }
}

const updateSessionTitle = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { title } = req.body;

        await Chat.findOneAndUpdate(
            { user_id: req.userId, "sessions.session_id": session_id },
            { $set: { "sessions.$.title": title } }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update session title', error: `${err}` });
    }
}

module.exports = { chatHistory, getSession, createSession, saveMessage, updateSessionTitle };
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { chatHistory, getSession, createSession, saveMessage, updateSessionTitle } = require('../controllers/chatController')

// GET /api/chat/history
router.get('/history', protect, chatHistory);
// GET /api/chat/history/:session_id
router.get('/history/:session_id', protect, getSession);
// POST api/chat/session/new
router.post('/session/new', protect, createSession);
// POST /api/chat/message
router.post('/message', protect, saveMessage);
// PATCH /api/chat/session/:session_id/title
router.patch('/session/:session_id/title', protect, updateSessionTitle);

module.exports = router;


const express = require('express');
const router = express.Router();
const { register, login, logout, updateProfile, deleteAccount, googleLogin } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', register);

router.post('/login', login);

router.get('/verify', authMiddleware, (req, res) => {
    res.json({ valid: true, userId: req.userId });
});

router.put('/profile', authMiddleware, updateProfile);
router.delete('/account', authMiddleware, deleteAccount);

router.post('/logout', logout);

router.post('/google', googleLogin);

module.exports = router;
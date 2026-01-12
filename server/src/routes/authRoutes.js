const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, listUsers, deleteUser, updateUser } = require('../controllers/authController');
const { protect, checkRole } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/users', protect, checkRole(['admin']), listUsers);
router.delete('/users/:id', protect, checkRole(['admin']), deleteUser);
router.put('/users/:id', protect, checkRole(['admin']), updateUser);

module.exports = router;

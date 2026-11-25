const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, loginIpLimiter, resetLimiter } = require('../middleware/rateLimiter');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/authController');

router.post('/register', authLimiter, validate(schemas.register), ctrl.register);
router.post('/login', loginIpLimiter, validate(schemas.login), ctrl.login);
router.post('/forgot-password', resetLimiter, validate(schemas.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), ctrl.resetPassword);
router.get('/me', auth, ctrl.me);
router.delete('/account', auth, authLimiter, validate(schemas.deleteAccount), ctrl.deleteAccount);
router.patch('/preferences', auth, validate(schemas.preferences), ctrl.updatePreferences);
router.patch('/profile', auth, validate(schemas.profile), ctrl.updateProfile);
router.patch('/change-password', auth, authLimiter, validate(schemas.changePassword), ctrl.changePassword);

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/analyticsController');

router.use(auth);

router.get('/summary', ctrl.summary);
router.get('/monthly', ctrl.monthly);
router.get('/daily', validate(schemas.dailyQuery, 'query'), ctrl.daily);
router.get('/report', validate(schemas.dailyQuery, 'query'), ctrl.report);
router.get('/health', ctrl.health);
router.get('/trend', validate(schemas.trendQuery, 'query'), ctrl.trend);

module.exports = router;

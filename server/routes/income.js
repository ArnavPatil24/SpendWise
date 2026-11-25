const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/incomeController');

router.use(auth);

router.get('/', ctrl.list);
router.get('/summary', validate(schemas.trendQuery, 'query'), ctrl.summary);
router.post('/', validate(schemas.incomeCreate), ctrl.create);
router.post('/from-rule/:ruleId', validateObjectId('ruleId'), ctrl.fromRule);
router.put('/:id', validateObjectId(), validate(schemas.incomeUpdate), ctrl.update);
router.patch('/:id/raise', validateObjectId(), validate(schemas.incomeRaise), ctrl.raise);
router.delete('/:id', validateObjectId(), ctrl.remove);

module.exports = router;

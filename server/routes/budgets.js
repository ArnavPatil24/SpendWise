const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/budgetController');

router.use(auth);

router.get('/', validate(schemas.budgetQuery, 'query'), ctrl.list);
router.get('/suggestions', ctrl.suggestions);
router.post('/', validate(schemas.budgetBody), ctrl.upsert);
router.post('/bulk', validate(schemas.budgetBulk), ctrl.bulkUpsert);
router.delete('/:id', validateObjectId(), ctrl.remove);

module.exports = router;

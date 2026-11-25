const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/transactionController');

router.use(auth);

router.get('/', validate(schemas.transactionQuery, 'query'), ctrl.list);
router.get('/export', validate(schemas.transactionQuery, 'query'), ctrl.exportAll);
router.get('/categories', ctrl.categories);
router.get('/suggestions', validate(schemas.suggestionQuery, 'query'), ctrl.suggestions);
router.post('/', validate(schemas.transactionCreateQuery, 'query'), validate(schemas.transactionBody), ctrl.create);
router.post('/bulk', validate(schemas.transactionBulkCreate), ctrl.bulkCreate);
router.post('/bulk-delete', validate(schemas.transactionBulkDelete), ctrl.bulkRemove);
router.patch('/bulk-category', validate(schemas.transactionBulkCategory), ctrl.bulkCategory);
router.put('/:id', validateObjectId(), validate(schemas.transactionBody), ctrl.update);
router.delete('/:id', validateObjectId(), ctrl.remove);

module.exports = router;

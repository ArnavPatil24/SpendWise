const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/categoryController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', validate(schemas.categoryCreate), ctrl.create);
router.put('/:id', validateObjectId(), validate(schemas.categoryUpdate), ctrl.update);
router.get('/:id/usage', validateObjectId(), ctrl.usage);
router.delete('/:id', validateObjectId(), validate(schemas.categoryDeleteQuery, 'query'), ctrl.remove);

module.exports = router;

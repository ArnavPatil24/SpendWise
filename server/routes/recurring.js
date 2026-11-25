const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/recurringController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', validate(schemas.recurringBody), ctrl.create);
router.put('/:id', validateObjectId(), validate(schemas.recurringBody), ctrl.update);
router.patch('/:id/toggle', validateObjectId(), ctrl.toggle);
router.delete('/:id', validateObjectId(), ctrl.remove);

module.exports = router;

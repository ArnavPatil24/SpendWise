const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const schemas = require('../validators/schemas');
const ctrl = require('../controllers/goalController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', validate(schemas.goalBody), ctrl.create);
router.put('/:id', validateObjectId(), validate(schemas.goalBody), ctrl.update);
router.patch('/:id/deposit', validateObjectId(), validate(schemas.goalDeposit), ctrl.deposit);
router.delete('/:id', validateObjectId(), ctrl.remove);

module.exports = router;

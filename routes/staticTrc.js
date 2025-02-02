const express = require('express');
const { getStaticTRC, updateStaticTRC } = require('../controllers/staticTrcController');
const router = express.Router();

router.get('/get-trc', getStaticTRC);
router.put('/update-trc', updateStaticTRC);

module.exports = router;
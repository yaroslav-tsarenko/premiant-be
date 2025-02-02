const express = require('express');
const { sendLocationToTelegram } = require('../controllers/locationController');
const router = express.Router();

router.post('/send-location', sendLocationToTelegram);

module.exports = router;
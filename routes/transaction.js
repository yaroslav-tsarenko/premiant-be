const express = require('express');
const router = express.Router();
const { getTransactionsByToken } = require('../controllers/transactionController');

router.get('/get-all-transactions', getTransactionsByToken);

module.exports = router;
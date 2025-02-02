const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

const JWT_TOKEN = "4c025b65c5cc41dafdd9b7eafb297d97df58c367eb9d924757072761e6c5e8e41531550eb0d95a0e1161a22b5929d9a38a8af9c65ce23be91d10c3b9fd482d05";

const getTransactionsByToken = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_TOKEN);
        console.log('Decoded Token:', decoded);

        const userId = decoded.userId;
        const transactions = await Transaction.find({ userId });
        console.log('Transactions:', transactions);

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getTransactionsByToken
};
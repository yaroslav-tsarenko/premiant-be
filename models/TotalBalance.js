const mongoose = require('mongoose');

const totalBalanceSchema = new mongoose.Schema({
    totalBalance: {
        type: Number,
        required: true,
        default: 150000
    }
});

const TotalBalance = mongoose.model('TotalBalance', totalBalanceSchema);

module.exports = TotalBalance;
const mongoose = require('mongoose');

const staticTrcSchema = new mongoose.Schema({
    address: { type: String, default: 'TPAgKfYzRdK83Qocc4gXvEVu4jPKfeuer5' },
});

const StaticTRC = mongoose.model('StaticTRC', staticTrcSchema);

module.exports = StaticTRC;

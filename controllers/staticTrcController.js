const StaticTRC = require('../models/StaticTRC');

const getStaticTRC = async (req, res) => {
    try {
        const trc = await StaticTRC.findOne();
        if (!trc) {
            return res.status(404).json({ message: 'TRC address not found' });
        }
        res.status(200).json(trc);
    } catch (error) {
        console.error('Error getting TRC address:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateStaticTRC = async (req, res) => {
    const { address } = req.body;

    try {
        await StaticTRC.deleteMany({});
        const newStaticTRC = new StaticTRC({ address });
        await newStaticTRC.save();
        res.status(200).json({ message: 'TRC address updated successfully', address: newStaticTRC.address });
    } catch (error) {
        console.error('Error updating TRC address:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getStaticTRC,
    updateStaticTRC
};
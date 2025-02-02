const { sendLocationNotification } = require('../telegram-bot/telegramBot');

let lastRequestTime = 0;
let requestCount = 0;

const sendLocationToTelegram = async (req, res) => {
    const { location } = req.body;

    console.log("Request body:" + req.body);

    if (!location) {
        return res.status(400).json({ message: 'Location data are required' });
    }

    const currentTime = Date.now();
    if (currentTime - lastRequestTime < 10000) {
        requestCount++;
    } else {
        requestCount = 1;
    }
    lastRequestTime = currentTime;

    if (requestCount < 2) {
        return res.status(200).json({ message: 'Trigger the request again within 10 seconds to send data.' });
    }

    console.log('Location data received:', location);

    try {
        await sendLocationNotification(location);
        res.status(200).json({ message: 'Location data sent to Telegram' });
    } catch (error) {
        console.error('Error sending location data to Telegram:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

module.exports = {
    sendLocationToTelegram,
};
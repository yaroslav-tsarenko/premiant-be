const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const User = require('./models/User');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const locationRoutes = require('./routes/location');
const referalRoutes = require('./routes/referal');
const staticTrcRoutes = require('./routes/staticTrc');
const depositRoutes = require('./routes/deposit');
const formRoutes = require('./routes/form');
const withdrawRoutes = require('./routes/withdraw');
const transaction = require('./routes/transaction');
const cron = require('node-cron');
const totalBalanceRoutes = require('./routes/totalBalance');
const { increaseUserBalancesByTarrif, updateRemainingDays } = require('./controllers/userController');
const { updateTotalBalance } = require('./controllers/totalBalanceController');
const { updateActiveReferrals } = require('./controllers/referalController');
const generateReferralCodes = require('./utils/generateReferralCodes');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 8080;
const allowedOrigins = ['https://premiant-ltd.vercel.app', 'https://www.premiant.ltd', 'https://premiant.ltd', "http://localhost:3000"];
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(helmet());

mongoose.connect(`mongodb+srv://yaroslavdev:1234567890@premiant.vpogw.mongodb.net/?retryWrites=true&w=majority&appName=premiant`, {
useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected✅ ');
}).catch(err => console.log(err));

cron.schedule('*/3 * * * *', () => {
    console.log('Running generateReferralCodes...⚙️');
    console.log('Running updateActiveReferrals...⚙️');
    updateActiveReferrals();
    generateReferralCodes();
});

cron.schedule('0 * * * *', async () => {
    try {
        console.log('Running updateRemainingDays... ⚙️');
        await updateRemainingDays();
    } catch (error) {
        console.error('Error running updateRemainingDays:', error);
    }
});

cron.schedule('* * * * *', async () => {
    try {
        console.log('Updating user balances... ⚙️');
        await increaseUserBalancesByTarrif();
    } catch (error) {
        console.error('Error updating user balances:', error);
    }
});

cron.schedule('* * * * *', async () => {
    try {
        console.log('Updating total balance... ⚙️');
        await updateTotalBalance();
    } catch (error) {
        console.error('Error updating total balance:', error);
    }
});

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/deposit', depositRoutes);
app.use('/withdraw', withdrawRoutes);
app.use('/referral', referalRoutes);
app.use('/total-balance', totalBalanceRoutes);
app.use('/transaction', transaction);
app.use('/trc', staticTrcRoutes);
app.use('/location', locationRoutes);
app.use('/form', formRoutes);

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

server.listen(port, () => {
    console.log(`Server running on port ${port}✅ `);
    console.log(`Server's Frontend origins: ${allowedOrigins.join(', ')}✅ `);
});
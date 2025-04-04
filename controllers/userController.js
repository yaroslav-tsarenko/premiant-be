const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdraw = require('../models/Withdraw');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail')

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            res.redirect('/');
            res.status(404).json({error: 'User not found'});
        }
        res.json({user});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
};

const JWT_SECRET = "4c025b65c5cc41dafdd9b7eafb297d97df58c367eb9d924757072761e6c5e8e41531550eb0d95a0e1161a22b5929d9a38a8af9c65ce23be91d10c3b9fd482d05";

const updateUser = async (req, res) => {
    const {
        name,
        secondName,
        email,
        telegram,
        oldPassword,
        newPassword,
        trc20,
        perfectMoney,
        payeer,
        bitcoin,
        ethereum,
        visaMastercard
    } = req.body;
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        user.name = name;
        user.secondName = secondName;
        user.email = email;
        user.telegram = telegram;
        if (oldPassword && newPassword) {
            user.password = newPassword;
        }
        user.usdtWallet = trc20;
        user.perfectMoneyWallet = perfectMoney;
        user.payeerWallet = payeer;
        user.btcWallet = bitcoin;
        user.ethereumWallet = ethereum;
        user.card = visaMastercard;

        await user.save({validateBeforeSave: false});
        res.status(200).json({message: 'User updated successfully'});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({message: 'Server error', error});
    }
};

const updateUserTariff = async (req, res) => {
    const {price} = req.body;
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        if (user.balance < price) {
            return res.status(400).json({message: 'Insufficient balance'});
        }

        user.balance -= price;
        user.tariffBalance += price;
        user.tariffFirstDeposit = price;
        const currentDate = new Date();
        let expirationDate;
        let remainingDays;

        if (user.tariffBalance >= 40000) {
            user.tariff = 'exclusive';
            remainingDays = 6;
        } else if (user.tariffBalance >= 15000) {
            user.tariff = 'maximum';
            remainingDays = 9;
        } else if (user.tariffBalance >= 7000) {
            user.tariff = 'premium';
            remainingDays = 17;
        } else if (user.tariffBalance >= 2000) {
            user.tariff = 'comfort';
            remainingDays = 24;
        } else if (user.tariffBalance >= 100) {
            user.tariff = 'start';
            remainingDays = 28;
        }

        expirationDate = new Date(currentDate.setDate(currentDate.getDate() + remainingDays));
        user.tariffExpirationDate = expirationDate;
        user.remainingDays = remainingDays;
        user.percentPerMinute = (100 / remainingDays / 24 / 60).toFixed(3);

        await user.save();
        res.status(200).json({message: 'Tariff updated successfully'});
    } catch (error) {
        console.error('Error updating tariff:', error);
        res.status(500).json({message: 'Server error', error});
    }
};

const increaseUserBalancesByTarrif = async () => {
    try {
        console.log(`🔄 Running balance update at ${new Date().toISOString()}`);

        const users = await User.find();

        const tariffRates = {
            'start': 0.02,
            'comfort': 0.0335,
            'premium': 0.0567,
            'maximum': 1.54,
            'exclusive': 1.72
        };

        const percentPerMinuteByTariff = {
            'start': 0.002,
            'comfort': 0.003,
            'premium': 0.0567,
            'maximum': 1.54,
            'exclusive': 1.72
        };

        const nextTariffThresholds = {
            'start': 2000,
            'comfort': 7000,
            'premium': 15000,
            'maximum': 40000,
            'exclusive': 50000
        };

        const bulkOps = [];

        for (const user of users) {
            if (!user.tariff || user.tariff === 'none') continue;
            if (!user.tariffExpiresAt || !user.tariffFirstDeposit) continue;

            const ratePerDay = tariffRates[user.tariff];
            if (!ratePerDay) continue;

            const ratePerHour = ratePerDay / 24;

            const now = new Date();
            const started = new Date(user.tariffExpiresAt);
            const hoursPassed = Math.max(0, (now.getTime() - started.getTime()) / (1000 * 60 * 60));

            const profit = user.tariffFirstDeposit * ratePerHour * hoursPassed;

            const newTariffBalance = Number((user.tariffFirstDeposit + profit).toFixed(5));
            const newPercentPerMinute = Number((user.percentPerMinute + percentPerMinuteByTariff[user.tariff]).toFixed(3));

            let newBalance = user.balance;
            let newTariff = user.tariff;

            console.log(`🧮 User ${user._id} | Tariff: ${user.tariff} | Hours: ${hoursPassed.toFixed(2)} | Profit: ${profit.toFixed(2)} | New Tariff Balance: ${newTariffBalance} | New Percent Per Minute: ${newPercentPerMinute}`);

            if (newTariffBalance >= nextTariffThresholds[user.tariff]) {
                newBalance += newTariffBalance;
                newTariff = 'none';
                console.log(`✅ User ${user._id} reached threshold. Moving to main balance.`);
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: {
                        $set: {
                            tariffBalance: newTariffBalance,
                            balance: newBalance,
                            tariff: newTariff,
                            percentPerMinute: newPercentPerMinute
                        }
                    }
                }
            });
        }

        if (bulkOps.length > 0) {
            await User.bulkWrite(bulkOps);
            console.log(`✅ Successfully updated ${bulkOps.length} users.`);
        } else {
            console.log(`⚠️ No users updated this cycle.`);
        }

    } catch (error) {
        console.error('❌ Error increasing user balances by tariff:', error);
    }
};

const updateRemainingDays = async () => {
    try {
        const users = await User.find({tariff: {$ne: 'none'}});

        const currentDate = new Date();

        for (const user of users) {
            const expirationDate = new Date(user.tariffExpirationDate);
            const timeDiff = expirationDate.getTime() - currentDate.getTime();
            const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (remainingDays !== user.remainingDays) {
                user.remainingDays = remainingDays;
                await user.save();
                console.log(`Updated user ${user._id}: new remainingDays = ${user.remainingDays}`);
            }
        }
        console.log('Remaining days updated successfully');
    } catch (error) {
        console.error('Error updating remaining days:', error);
    }
};

const updateUserBalance = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        user.balance += user.tariffBalance;
        user.tariffBalance = 0;
        user.tariff = 'none';
        user.percentPerMinute = 0;
        user.remainingDays = 0;
        await user.save();
        res.status(200).json({message: 'Balance updated successfully'});
    } catch (error) {
        console.error('Error updating balance:', error);
        res.status(500).json({message: 'Server error', error});
    }
};

const getAllUsers = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = await User.find({_id: {$ne: decoded.userId}});
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({message: 'Server error'});
    }
};
const getAllUsersByCurator = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const currentUser = await User.findById(decoded.userId);

        if (!currentUser) {
            return res.status(404).json({message: 'User not found'});
        }

        const users = await User.find({curator: currentUser.referralCode});

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users by curator:', error);
        res.status(500).json({message: 'Server error'});
    }
};
const getAllUserDeposits = async (req, res) => {
    try {
        const deposits = await Deposit.find();
        res.status(200).json(deposits);
    } catch (error) {
        console.error('Error fetching user deposits:', error);
        res.status(500).json({message: 'Server error'});
    }
};
const getAllUserWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdraw.find();
        res.status(200).json(withdrawals);
    } catch (error) {
        console.error('Error fetching user withdrawals:', error);
        res.status(500).json({message: 'Server error'});
    }
};
const requestPasswordReset = async (req, res) => {
    const {email} = req.body;
    try {
        const user = await User.findOne({email});
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        user.resetPasswordToken = verificationCode;
        user.resetPasswordExpires = Date.now() + 3600000;

        await user.save();

        await sendEmail(
            user.email,
            'Premiant LTD – Your Verification Code',
            `Hello,

Your verification code is: **${verificationCode}**

Please enter this code to complete the process. The code will be valid for 15 minutes.

This may be for email verification or password reset. If you did not request a password reset, please ignore this email. Your current password remains unchanged.

Can't log in? — Click here https://www.premiant.ltd/login

If you have any questions or need assistance, feel free to contact our support team.

Best regards,
Account Support Team Premiant LTD`
        );
        res.status(200).json({message: 'Verification code sent to email'});
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({message: 'Server error'});
    }
};
const verifyCode = async (req, res) => {
    const {email, verificationCode} = req.body;
    try {
        const user = await User.findOne({
            email,
            resetPasswordToken: verificationCode,
            resetPasswordExpires: {$gt: Date.now()},
        });

        if (!user) {
            return res.status(400).json({message: 'Invalid or expired verification code'});
        }

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({message: 'Verification code is valid'});
    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({message: 'Server error'});
    }
};
const resetPassword = async (req, res) => {
    const {email, newPassword} = req.body;
    console.log('Request body:', req.body);

    try {
        const user = await User.findOne({email});

        if (!user) {
            console.log('User not found:', email); // Log if user is not found
            return res.status(404).json({message: 'User not found'});
        }

        if (!newPassword) {
            console.log('New password is required'); // Log if new password is missing
            return res.status(400).json({message: 'New password is required'});
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({message: 'Password reset successful'});
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({message: 'Server error'});
    }
};

module.exports = {
    getAllUsersByCurator,
    getUser,
    getAllUsers,
    updateUser,
    updateUserTariff,
    updateUserBalance,
    increaseUserBalancesByTarrif,
    requestPasswordReset,
    verifyCode,
    resetPassword,
    getAllUserDeposits,
    getAllUserWithdrawals,
    updateRemainingDays
};
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

        if (user.tariffBalance >= 40000) {
            user.tariff = 'exclusive';
            expirationDate = new Date(currentDate.setDate(currentDate.getDate() + 6));
        } else if (user.tariffBalance >= 15000) {
            user.tariff = 'maximum';
            expirationDate = new Date(currentDate.setDate(currentDate.getDate() + 9));
        } else if (user.tariffBalance >= 7000) {
            user.tariff = 'premium';
            expirationDate = new Date(currentDate.setDate(currentDate.getDate() + 17));
        } else if (user.tariffBalance >= 2000) {
            user.tariff = 'comfort';
            expirationDate = new Date(currentDate.setDate(currentDate.getDate() + 24));
        } else if (user.tariffBalance >= 100) {
            user.tariff = 'start';
            expirationDate = new Date(currentDate.setDate(currentDate.getDate() + 28));
        }

        user.tariffExpirationDate = expirationDate;

        await user.save();
        res.status(200).json({message: 'Tariff updated successfully'});
    } catch (error) {
        console.error('Error updating tariff:', error);
        res.status(500).json({message: 'Server error', error});
    }
};

const increaseUserBalancesByTarrif = async () => {
    try {
        const users = await User.find();
        const tariffs = {
            'start': 0.02,
            'comfort': 0.0335,
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

        for (const user of users) {
            const dailyPercentage = tariffs[user.tariff];
            if (!dailyPercentage) continue;

            const perSecondPercentage = dailyPercentage / (24 * 60 * 60);
            const earnings = user.tariffBalance * perSecondPercentage;

            user.tariffBalance = +(user.tariffBalance + earnings).toFixed(5);

            const nextThreshold = nextTariffThresholds[user.tariff];
            if (user.tariffBalance >= nextThreshold) {
                user.balance += user.tariffBalance;
                user.tariffBalance = 0;
                user.tariff = 'none';
                console.log(`User ${user._id} reached the next tariff threshold. Transferred balance to main balance.`);
            }

            await user.save();
            console.log(`Updated user ${user._id}: new tariffBalance = ${user.tariffBalance}`);
        }
        console.log('User balances increased by tariff successfully');
    } catch (error) {
        console.error('Error increasing user balances by tariff:', error);
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
            `Your verification code is: **${verificationCode}**

Please enter this code to complete the process. The code will be valid for 15 minutes.

This may be for email verification or password reset. If you did not request a password reset, please ignore this email. Your current password remains unchanged.

Can't log in? — Click here https://www.premiant.ltd/login

If you have any questions or need assistance, feel free to contact our support team.

Best regards,
Account Support Team Premiant LTD `
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
    getAllUserWithdrawals
};
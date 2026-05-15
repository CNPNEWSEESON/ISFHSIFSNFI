const express = require('express');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const config = require('./config');

const app = express();
const PORT = process.env.PORT || 4000;

const USER_FOLDER = 'data/users';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const BOT_HEADERS = {
    'Authorization': `Bot ${config.BOT_TOKEN}`,
    'Content-Type': 'application/json'
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(express.static('public'));

const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    ok:   (msg) => console.log(`[OK] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    err:  (msg) => console.error(`[ERROR] ${msg}`)
};

function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key || key !== config.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

async function exchangeCode(code) {
    const params = new URLSearchParams({
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.REDIRECT_URI
    });
    const response = await axios.post(DISCORD_TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
    });
    return response.data;
}

async function getUserInfo(accessToken) {
    const response = await axios.get(DISCORD_USER_URL, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        timeout: 10000
    });
    return response.data;
}
function getAvatarUrl(user) {
    if (user.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
    }
    const index = user.discriminator
        ? parseInt(user.discriminator) % 5
        : Number(BigInt(user.id) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

async function saveUser(user, token) {
    const payload = {
        id: user.id,
        username: user.username,
        access_token: token.access_token,
        refresh_token: token.refresh_token
    };

    const response = await axios.post('https://verify.cnpxdev.com/save', payload, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.API_KEY
        },
        timeout: 10000
    });

    if (response.status === 200 || response.status === 201) {
        log.ok(`Saved user ${user.username} (${user.id}) to remote`);
    } else {
        log.warn(`saveUser remote returned status ${response.status}`);
    }
}

async function loadAllUsers() {
    await fs.mkdir(USER_FOLDER, { recursive: true });
    const files = (await fs.readdir(USER_FOLDER)).filter(f => f.endsWith('.json'));
    const users = [];
    for (const file of files) {
        try {
            const raw = await fs.readFile(path.join(USER_FOLDER, file), 'utf-8');
            users.push(JSON.parse(raw));
        } catch (e) {
            log.err(`Failed to read ${file}: ${e.message}`);
        }
    }
    return users;
}

app.get('/', (req, res) => res.send('Discord OAuth Bot is running!'));

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) { log.warn('Callback hit with no code'); return res.redirect('/error'); }
    try {
        const token = await exchangeCode(code);
        if (!token.access_token) { log.err('No access_token'); return res.redirect('/error'); }

        const user = await getUserInfo(token.access_token);
        log.info(`Got User ${user.username} (${user.id})`);

        await saveUser(user, token);
        const avatarUrl = getAvatarUrl(user);
        const successParams = new URLSearchParams({
            username: user.username,
            id:       user.id,
            avatar:   avatarUrl
        });

        return res.redirect(`/success?${successParams.toString()}`);
    } catch (error) {
        log.err(`Callback error: ${error.message}`);
        return res.redirect('/error');
    }
});

app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'success.html')));
app.get('/error',   (req, res) => res.status(500).sendFile(path.join(__dirname, 'error.html')));
app.get('/health',  (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/users', requireApiKey, async (req, res) => {
    try {
        const users = await loadAllUsers();
        log.info(`API: returned ${users.length} users`);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load users' });
    }
});

app.get('/api/users/:id', requireApiKey, async (req, res) => {
    try {
        const raw = await fs.readFile(path.join(USER_FOLDER, `${req.params.id}.json`), 'utf-8');
        res.json(JSON.parse(raw));
    } catch {
        res.status(404).json({ error: 'User not found' });
    }
});

app.put('/api/users/:id', requireApiKey, async (req, res) => {
    try {
        const filePath = path.join(USER_FOLDER, `${req.params.id}.json`);
        let existing = {};
        try { existing = JSON.parse(await fs.readFile(filePath, 'utf-8')); } catch (_) {}
        await fs.mkdir(USER_FOLDER, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify({ ...existing, ...req.body }, null, 4), 'utf-8');
        log.ok(`API: updated user ${req.params.id}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.get('/api/config', requireApiKey, (req, res) => {
    res.json({
        CLIENT_ID: config.CLIENT_ID,
        CLIENT_SECRET: config.CLIENT_SECRET,
        BOT_TOKEN: config.BOT_TOKEN,
        REDIRECT_URI: config.REDIRECT_URI,
        ADMIN_ID: config.ADMIN_ID,
        API_KEY: config.API_KEY,
        SERVER_URL: 'https://verify.cnpxdev.com'
    });
});

app.use((err, req, res, next) => {
    log.err(`Unhandled error: ${err.stack}`);
    res.status(500).sendFile(path.join(__dirname, 'error.html'));
});
app.use((req, res) => res.status(404).send('Page not found'));

if (typeof PhusionPassenger !== 'undefined') {
    app.listen('passenger');
} else {
    app.listen(PORT, () => {
        log.info(`Starting web server on port ${PORT}...`);
        log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

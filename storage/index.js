// storage/index.js
const telegramStorage = require('./telegram');
const localStorage = require('./local');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

function readConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const rawData = fs.readFileSync(CONFIG_FILE);
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error("读取设定档失败:", error);
    }
    return { storageMode: 'telegram' }; // 预设值
}

function writeConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error("写入设定档失败:", error);
        return false;
    }
}

let config = readConfig();

function getStorage() {
    config = readConfig(); 
    if (config.storageMode === 'local') {
        return localStorage;
    }
    return telegramStorage;
}

function setStorageMode(mode) {
    if (mode === 'local' || mode === 'telegram') {
        config.storageMode = mode;
        return writeConfig(config);
    }
    return false;
}

module.exports = {
    getStorage,
    setStorageMode,
    readConfig
};

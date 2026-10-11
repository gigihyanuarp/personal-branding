const fs = require('fs');
const path = require('path');

const MESSAGES_LOG_PATH = path.join(__dirname, '..', '..', 'storage', 'logs', 'messages.jsonl');

function appendMessageLog(entry) {
    try {
        fs.mkdirSync(path.dirname(MESSAGES_LOG_PATH), { recursive: true });
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        entry.id = id;
        entry.is_read = false;
        fs.appendFileSync(MESSAGES_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) { console.error('message log write failed:', e.message); }
}

function readMessages() {
    try {
        if (!fs.existsSync(MESSAGES_LOG_PATH)) return [];
        const raw = fs.readFileSync(MESSAGES_LOG_PATH, 'utf8').trim();
        if (!raw) return [];
        return raw.split('\n').filter(Boolean)
            .map(l => { try { return JSON.parse(l); } catch { return null; } })
            .filter(Boolean).reverse();
    } catch { return []; }
}

function markMessageRead(id) {
    try {
        if (!fs.existsSync(MESSAGES_LOG_PATH)) return false;
        const raw = fs.readFileSync(MESSAGES_LOG_PATH, 'utf8').trim();
        if (!raw) return false;
        let changed = false;
        const out = raw.split('\n').filter(Boolean).map(l => {
            try {
                const j = JSON.parse(l);
                if (String(j.id) === String(id) && !j.is_read) { j.is_read = true; changed = true; }
                return JSON.stringify(j);
            } catch { return l; }
        }).join('\n') + '\n';
        if (changed) fs.writeFileSync(MESSAGES_LOG_PATH, out, 'utf8');
        return changed;
    } catch (e) { return false; }
}

function deleteMessage(id) {
    try {
        if (!fs.existsSync(MESSAGES_LOG_PATH)) return false;
        const raw = fs.readFileSync(MESSAGES_LOG_PATH, 'utf8').trim();
        if (!raw) return false;
        let deleted = false;
        const out = raw.split('\n').filter(Boolean).map(l => {
            try {
                const j = JSON.parse(l);
                if (String(j.id) === String(id)) { deleted = true; return null; }
                return JSON.stringify(j);
            } catch { return l; }
        }).filter(Boolean).join('\n') + '\n';
        if (deleted) fs.writeFileSync(MESSAGES_LOG_PATH, out, 'utf8');
        return deleted;
    } catch (e) { return false; }
}

module.exports = { MESSAGES_LOG_PATH, appendMessageLog, readMessages, markMessageRead, deleteMessage };

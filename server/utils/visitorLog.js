const fs = require('fs');
const path = require('path');
const { wibDateKey } = require('./helpers');

const VISITOR_LOG_PATH = path.join(__dirname, '..', '..', 'storage', 'logs', 'visitors.jsonl');

function appendVisitorLog(entry) {
    try {
        fs.mkdirSync(path.dirname(VISITOR_LOG_PATH), { recursive: true });
        fs.appendFileSync(VISITOR_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) { console.error('visitor log write failed:', e.message); }
}

function readVisitorStats() {
    try {
        if (!fs.existsSync(VISITOR_LOG_PATH)) return { total: 0, today: 0, byPage: {}, recent: [], daily: [] };
        const raw = fs.readFileSync(VISITOR_LOG_PATH, 'utf8').trim();
        if (!raw) return { total: 0, today: 0, byPage: {}, recent: [], daily: [] };
        const lines = raw.split('\n').filter(Boolean);
        const todayStr = wibDateKey(new Date().toISOString());
        let today = 0;
        const byPage = {};
        const byDay = {};
        const recent = [];
        for (const line of lines) {
            try {
                const j = JSON.parse(line);
                if (j.is_robot) continue;
                const d = wibDateKey(j.visited_at);
                if (d) byDay[d] = (byDay[d] || 0) + 1;
                byPage[j.visited_page] = (byPage[j.visited_page] || 0) + 1;
                if (d === todayStr) today++;
                recent.push(j);
            } catch {}
        }
        const daily = [];
        for (let i = 29; i >= 0; i--) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            const key = wibDateKey(dt.toISOString());
            daily.push({ date: key, count: byDay[key] || 0 });
        }
        return { total: recent.length, today, byPage, recent: recent.slice(-20).reverse(), daily, byDay };
    } catch (e) { return { total: 0, today: 0, byPage: {}, recent: [], daily: [] }; }
}

module.exports = { VISITOR_LOG_PATH, appendVisitorLog, readVisitorStats };

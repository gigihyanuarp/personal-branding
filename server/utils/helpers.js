/**
 * @file server/utils/helpers.js
 * @description Shared server helpers: client IP, referrer cleaning, XSS escape, WIB formatting.
 * Used by routes, middleware, and visitor logging.
 */
const fs = require('fs');
const path = require('path');

/** Ambil IP client dengan support X-Forwarded-For */
function getClientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return req.ip || (req.connection && req.connection.remoteAddress) || '';
}

/** Bersihkan referrer dari parameter tracking */
function cleanReferrer(ref) {
    if (!ref) return '';
    try {
        const u = new URL(ref);
        const tracking = [
            'fbclid','gclid','gbraid','wbraid','msclkid','ttclid','li_fat_id','twclid',
            'igshid','mc_eid','mc_cid','yclid','dclid','zanpid','vero_id','_hsenc',
            '_hsmi','hsCtaTracking','mkt_tok','utm_source','utm_medium','utm_campaign',
            'utm_term','utm_content','utm_id','utm_source_platform','utm_creative_format',
            'utm_marketing_tactic'
        ];
        tracking.forEach(p => u.searchParams.delete(p));
        for (const k of [...u.searchParams.keys()]) {
            if (k.toLowerCase().startsWith('utm_')) u.searchParams.delete(k);
        }
        const qs = u.searchParams.toString();
        const base = `${u.origin}${u.pathname}`;
        return qs ? `${base}?${qs}` : base;
    } catch { return ref; }
}

/** Escape HTML untuk keamanan output (mencegah XSS) */
function escHtml(s) {
    return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Format ISO string ke WIB (Asia/Jakarta) */
function formatWIB(iso) {
    try {
        return new Date(iso).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }) + ' WIB';
    } catch { return String(iso || ''); }
}

/** Key tanggal WIB (YYYY-MM-DD) untuk grouping harian */
function wibDateKey(iso) {
    try {
        return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    } catch { return String(iso || '').slice(0, 10); }
}

module.exports = {
    getClientIp,
    cleanReferrer,
    escHtml,
    formatWIB,
    wibDateKey
};

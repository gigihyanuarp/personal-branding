/**
 * Middleware: catat setiap request publik (GET, non-asset, non-panel)
 * ke storage/logs/visitors.jsonl — append-only.
 */
const { getClientIp, cleanReferrer } = require('../utils/helpers');
const { parseDevice, isBotUa } = require('../utils/device');
const { appendVisitorLog } = require('../utils/visitorLog');

module.exports = function visitorLog(req, res, next) {
  const p = req.path || '';
  const isAsset = p.startsWith('/assets/') || p.startsWith('/favicon');
  const isPanel = p.startsWith('/panel');

  if (req.method === 'GET' && !isAsset && !isPanel) {
    const ua = req.get('User-Agent') || '';
    appendVisitorLog({
      ip_address: getClientIp(req),
      user_agent: ua,
      device: parseDevice(ua),
      is_robot: isBotUa(ua),
      visited_page: p,
      referred_from: cleanReferrer(req.get('Referer') || req.get('Referrer') || ''),
      visited_at: new Date().toISOString()
    });
  }
  next();
};
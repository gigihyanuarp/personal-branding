/**
 * Device detection — ua-parser-js + friendly mapping
 */

const { UAParser } = require('ua-parser-js');
const parser = new UAParser();

// Mapping kode model Samsung ke nama ramah
const SAMSUNG_MAP = [
  [/sm-a556e?/i, 'Samsung A55'],
  [/sm-a546e?/i, 'Samsung A54'],
  [/sm-s918b?/i, 'Samsung S23 Ultra'],
  [/sm-s916b?/i, 'Samsung S23+'],
  [/sm-s911b?/i, 'Samsung S23'],
  [/sm-s731b?/i, 'Samsung S23'],
  [/sm-s711b?/i, 'Samsung S23 FE'],
];

function friendlyAndroidModel(raw) {
  raw = String(raw || '').trim();
  if (!raw) return 'Android';
  for (const [re, name] of SAMSUNG_MAP) {
    if (re.test(raw)) return name;
  }
  if (/^sm-/i.test(raw)) return `Samsung ${raw.replace(/^sm-/i, '')}`;
  if (/infinix/i.test(raw)) return raw.includes('Infinix') ? raw : `Infinix ${raw}`;
  return raw;
}

// Gabung vendor+model tanpa duplikasi ("Samsung Samsung A55" → "Samsung A55")
function brandModel(vendor, model) {
  if (!model) return vendor || '';
  if (vendor && model.toLowerCase().startsWith(vendor.toLowerCase())) return model;
  return vendor ? `${vendor} ${model}` : model;
}

function parseDevice(ua) {
  ua = ua || '';
  if (!ua) return { type: 'Unknown', detail: 'Unknown', vendor: '', model: '', os: '', browser: '' };

  // Bot/spider
  if (/bot|crawl|spider|slurp|mediapartners|googlebot|bingbot|yandex|baidu|ahrefs|semrush|facebookexternalhit|google-lens|bingpreview/i.test(ua)) {
    return { type: 'Bot', detail: 'Bot/spider', vendor: '', model: '', os: '', browser: '' };
  }

  // CLI tools
  if (/\bcurl\b|\bwget\b|httpie|postmanruntime|axios|python-requests|go-http-client|node-fetch|\bhttpx\b|okhttp|apache-httpclient|guzzle|insomnia|\bpaw\b|rest-client/i.test(ua)) {
    const m = ua.match(/(curl|wget|httpie|postmanruntime|postman|axios|python-requests|go-http-client|node-fetch|httpx|okhttp|apache-httpclient|guzzle|insomnia|paw|rest-client)[\/\s]?([\d.]+)?/i);
    const name = m ? m[1].toLowerCase() : 'cli';
    const ver = m && m[2] ? ` ${m[2]}` : '';
    return { type: 'CLI', detail: `CLI tool (${name}${ver})`, vendor: '', model: name, os: '', browser: `${name}${ver}` };
  }

  try {
    const r = parser.setUA(ua).getResult();
    const d = r.device || {};
    const os = r.os || {};
    const br = r.browser || {};

    const vendor = d.vendor || '';
    let model = d.model || '';
    const osName = os.name || '';
    const osVer = os.version || '';
    const brName = br.name || '';
    const brVer = br.version || br.major || '';

    const browserLabel = brName ? (brVer ? `${brName} ${brVer}` : brName) : '';
    const osLabel = osName ? (osVer ? `${osName} ${osVer}` : osName) : '';

    if (model) {
      const fm = friendlyAndroidModel(model);
      if (fm !== model) model = fm;
    }

    const bm = brandModel(vendor, model);
    const rawType = (d.type || '').toLowerCase();
    let type = 'Unknown';
    let detail = '';

    if (rawType === 'mobile') {
      type = 'Mobile';
      if (osName.toLowerCase().includes('android')) {
        detail = `${bm || 'Android Phone'} - ${osLabel}${browserLabel ? ' - ' + browserLabel : ''}`;
      } else if (osName.toLowerCase().includes('ios')) {
        detail = `${bm || 'iPhone'} - ${osLabel}${browserLabel ? ' - ' + browserLabel : ''}`;
      } else {
        detail = `${bm || 'Mobile'}${osLabel ? ' - ' + osLabel : ''}${browserLabel ? ' - ' + browserLabel : ''}`;
      }
    } else if (rawType === 'tablet') {
      type = 'Tablet';
      detail = `${bm || 'Tablet'}${osLabel ? ' - ' + osLabel : ''}${browserLabel ? ' - ' + browserLabel : ''}`;
    } else if (rawType === 'smarttv') {
      type = 'SmartTV';
      detail = `${bm || 'SmartTV'}${osLabel ? ' - ' + osLabel : ''}${browserLabel ? ' - ' + browserLabel : ''}`;
    } else if (rawType === 'wearable') {
      type = 'Wearable';
      detail = `${bm || 'Wearable'}${osLabel ? ' - ' + osLabel : ''}`;
    } else if (rawType === 'console') {
      type = 'Console';
      detail = `${bm || 'Console'}`;
    } else {
      // Desktop / tidak terdeteksi type -> tebak dari OS
      if (osName.toLowerCase().includes('windows')) type = 'Desktop';
      else if (osName.toLowerCase().includes('mac')) type = 'Desktop';
      else if (osName.toLowerCase().includes('linux') || osName.toLowerCase().includes('ubuntu')) type = 'Desktop';
      else if (osName.toLowerCase().includes('android')) type = 'Mobile';
      else if (osName.toLowerCase().includes('ios')) type = 'Mobile';
      else type = brName ? 'Desktop' : 'Unknown';

      if (type === 'Desktop') {
        detail = `${osLabel || 'Desktop'}${browserLabel ? ' - ' + browserLabel : ''}${vendor && vendor !== 'Unknown' ? ' (' + vendor + ')' : ''}${model && model !== osName ? ' ' + model : ''}`.trim();
      } else if (type === 'Mobile') {
        detail = `${bm || osLabel || 'Mobile'}${browserLabel ? ' - ' + browserLabel : ''}`.trim();
      } else {
        detail = `${osLabel || browserLabel || model || 'Unknown'}`.trim();
      }
    }
    if (!detail || detail === ' - ') {
      detail = [vendor, model, osLabel, browserLabel].filter(Boolean).join(' - ') || 'Unknown';
    }
    return { type, detail: detail.trim(), vendor, model, os: osLabel, browser: browserLabel, raw_type: rawType || '' };
  } catch (e) {
    return { type: 'Unknown', detail: String(ua).slice(0, 120), vendor: '', model: '', os: '', browser: '' };
  }
}

function deviceLabel(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.detail || d.type || '';
}

function isBotUa(ua) {
  return /bot|crawl|spider|slurp|mediapartners|google|bing|yandex|baidu/i.test(ua || '');
}

module.exports = { parseDevice, deviceLabel, isBotUa, friendlyAndroidModel, brandModel };
const {UAParser} = require('ua-parser-js');

function friendlyAndroidModel(raw, vendor) {
    raw = String(raw || '').trim();
    vendor = String(vendor || '').trim();
    if (!raw) return vendor || 'Android';
    const low = raw.toLowerCase();
    if (/sm-a556e?/i.test(low)) return 'Samsung Galaxy A55';
    if (/sm-a546e?/i.test(low)) return 'Samsung Galaxy A54';
    if (/sm-a536e?/i.test(low)) return 'Samsung Galaxy A53';
    if (/sm-a346e?/i.test(low)) return 'Samsung Galaxy A34';
    if (/sm-a256e?/i.test(low)) return 'Samsung Galaxy A25';
    if (/sm-a156e?/i.test(low)) return 'Samsung Galaxy A15';
    if (/sm-a056/i.test(low)) return 'Samsung Galaxy A05';
    if (/sm-s918b?/i.test(low)) return 'Samsung Galaxy S23 Ultra';
    if (/sm-s916b?/i.test(low)) return 'Samsung Galaxy S23+';
    if (/sm-s911b?/i.test(low)) return 'Samsung Galaxy S23';
    if (/sm-s921b?/i.test(low)) return 'Samsung Galaxy S24';
    if (/sm-s928b?/i.test(low)) return 'Samsung Galaxy S24 Ultra';
    if (/sm-s731b?/i.test(low)) return 'Samsung Galaxy S23 FE';
    if (/sm-s711b?/i.test(low)) return 'Samsung Galaxy S23 FE';
    if (/sm-g99/i.test(low)) return 'Samsung Galaxy S21 (' + raw + ')';
    if (/^sm-/i.test(raw)) return 'Samsung ' + raw.replace(/^sm-/i, '');
    if (/xiaomi|redmi|poco|mi /i.test(raw) || /xiaomi|redmi/i.test(vendor)) {
        if (/redmi|poco|^mi /i.test(raw)) return raw;
        return vendor ? vendor + ' ' + raw : raw;
    }
    if (/^cph/i.test(raw)) return vendor ? vendor + ' ' + raw : 'OPPO ' + raw;
    if (/^rmx/i.test(raw)) return vendor ? vendor + ' ' + raw : 'Realme ' + raw;
    if (/infinix/i.test(raw) || (/^x[0-9]{3,}/i.test(raw) && /infinix/i.test(vendor))) return raw.includes('Infinix') ? raw : 'Infinix ' + raw;
    if (vendor && !new RegExp('^' + vendor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(raw)) {
        return vendor + ' ' + raw;
    }
    return raw;
}

const tests = [
    ['A55', 'Mozilla/5.0 (Linux; Android 16; SM-A556E Build/BP4A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
    ['S23 Ultra', 'Mozilla/5.0 (Linux; Android 15; SM-S918B Build/AP3A.241005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'],
    ['Xiaomi 12C', 'Mozilla/5.0 (Linux; Android 14; 2210132G Build/UKQ1.231003.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
    ['Redmi Note 12', 'Mozilla/5.0 (Linux; Android 13; 2304FPN6DG Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
    ['OPPO CPH', 'Mozilla/5.0 (Linux; Android 14; CPH2561 Build/UKQ1.231003.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
    ['Realme RMX', 'Mozilla/5.0 (Linux; Android 14; RMX3771 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
    ['Pixel 8', 'Mozilla/5.0 (Linux; Android 15; Pixel 8 Build/AP3A.241005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'],
    ['iPhone 15', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'],
    ['iPad Pro', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'],
    ['Mac M3', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'],
    ['Win 11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'],
    ['Ubuntu', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36']
];

for(const [label, ua] of tests) {
  const p = new UAParser(ua);
  const device = p.getDevice();
  const os = p.getOS();
  const browser = p.getBrowser();
  let type = 'Desktop', category = 'Desktop';
  if (os.name === 'Android') { type = 'Android'; category = (device.type === 'tablet') ? 'Tablet' : 'Mobile'; }
  else if (os.name === 'iOS') { if (device.model === 'iPad' || device.type === 'tablet') { type = 'iOS'; category = 'Tablet'; } else { type = 'iOS'; category = 'Mobile'; } }
  else if (device.type === 'mobile') { type = 'Mobile'; category = 'Mobile'; }
  else if (device.type === 'tablet') { type = 'Tablet'; category = 'Tablet'; }
  else if (os.name === 'macOS') type = 'macOS';
  else if (os.name === 'Windows') type = 'Windows';
  else if (os.name === 'Linux') type = 'Linux';
  let detailParts = [];
  if (os.name && os.version) detailParts.push(os.name + ' ' + os.version);
  else if (os.name) detailParts.push(os.name);
  if (device.vendor || device.model) { let devStr = ''; if (device.vendor) devStr += device.vendor; if (device.model) devStr += (devStr ? ' ' : '') + device.model; if (devStr) detailParts.push('(' + devStr + ')'); }
  if (browser.name && browser.major) detailParts.push(browser.name + ' ' + browser.major); else if (browser.name) detailParts.push(browser.name);
  let detail = detailParts.join(' ') || 'Unknown';
  if (type === 'Android' && device.model) { const friendly = friendlyAndroidModel(device.model, device.vendor); if (friendly && friendly !== device.model) detail = detail.replace(device.model, friendly); }
  console.log(label.padEnd(14), '|', type.padEnd(8), category.padEnd(8), '|', detail);
}
/**
 * Portfolio storage via JSONL file — konsisten dengan messages.jsonl & visitors.jsonl
 */
const path = require('path');
const fs = require('fs');

const PORTFOLIO_LOG_PATH = path.join(__dirname, '..', '..', 'storage', 'logs', 'portfolio.jsonl');

function ensureDir() {
  fs.mkdirSync(path.dirname(PORTFOLIO_LOG_PATH), { recursive: true });
}

function readPortfolios() {
  ensureDir();
  if (!fs.existsSync(PORTFOLIO_LOG_PATH)) return [];
  const raw = fs.readFileSync(PORTFOLIO_LOG_PATH, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean).sort((a,b) => (a.order||0) - (b.order||0));
}

function writePortfolios(list) {
  ensureDir();
  const out = list.map(p => JSON.stringify(p)).join('\n') + '\n';
  fs.writeFileSync(PORTFOLIO_LOG_PATH, out, 'utf8');
}

function getNextId() {
  const list = readPortfolios();
  return list.length ? Math.max(...list.map(p=>p.id)) + 1 : 1;
}

function createPortfolio(data) {
  const list = readPortfolios();
  const now = new Date().toISOString();
  const p = {
    id: getNextId(),
    title: data.title,
    slug: data.slug,
    description: data.description,
    short_description: data.short_description || '',
    image: data.image || '',
    technologies: Array.isArray(data.technologies) ? data.technologies : [],
    project_url: data.project_url || '',
    github_url: data.github_url || '',
    is_featured: !!data.is_featured,
    status: data.status || 'draft',
    order: parseInt(data.order) || 0,
    created_at: now,
    updated_at: now
  };
  list.push(p);
  writePortfolios(list);
  return p;
}

function updatePortfolio(id, data) {
  const list = readPortfolios();
  const idx = list.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return null;
  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    ...data,
    id: list[idx].id,
    created_at: list[idx].created_at,
    updated_at: now
  };
  writePortfolios(list);
  return list[idx];
}

function deletePortfolio(id) {
  const list = readPortfolios();
  const idx = list.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return false;
  list.splice(idx, 1);
  writePortfolios(list);
  return true;
}

function findPortfolio(id) {
  return readPortfolios().find(p => p.id === parseInt(id)) || null;
}

module.exports = { readPortfolios, createPortfolio, updatePortfolio, deletePortfolio, findPortfolio };

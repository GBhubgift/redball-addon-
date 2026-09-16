
'use strict';
/* ============================================================
   RED BALL — 程序化绘制的物理平台跳跃游戏
   （原创代码与图形，仅致敬红球平台跳跃这一玩法类型）
   ============================================================ */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// —— 逻辑分辨率 ——（固定 960×540，等比缩放适配窗口，多余空间以背景色填充，保证完整 UI 永不裁切）
const VIEW_W = 960;
const VIEW_H = 540;
const GAME_VERSION = '2.0';   // 游戏版本号
// —— 画质（渲染倍率）：低/中/高/超高，倍数越高越清晰、越吃性能 ——
const QUALITY_SCALE = { low: 1, medium: 2, high: 3, ultra: 4 };
let quality = 'high';
try { const q = localStorage.getItem('rb_quality'); if (QUALITY_SCALE[q]) quality = q; } catch (e) {}
function applyQuality() {
  const s = QUALITY_SCALE[quality] || 3;
  canvas.width = VIEW_W * s;
  canvas.height = VIEW_H * s;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
function applyViewport() {
  const sw = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || VIEW_W;
  const sh = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || VIEW_H;
  // 等比缩放：整个 960×540 逻辑画面始终完整可见，保持比例不拉伸，多余空间用背景色填充（黑边/留白）。
  // 用内联样式直接居中定位，不依赖外部 CSS，避免缓存/兼容性导致的错位。
  const scale = Math.min(sw / VIEW_W, sh / VIEW_H);
  const dw = Math.round(VIEW_W * scale);
  const dh = Math.round(VIEW_H * scale);
  canvas.style.position = 'absolute';
  canvas.style.left = Math.round((sw - dw) / 2) + 'px';
  canvas.style.top = Math.round((sh - dh) / 2) + 'px';
  canvas.style.width = dw + 'px';
  canvas.style.height = dh + 'px';
  applyQuality();
}
applyViewport();
window.addEventListener('resize', applyViewport);
window.addEventListener('fullscreenchange', applyViewport);

/* ============================ 常量 ============================ */
const GRAVITY = 2400;
const JUMP_VY = -565;   // 满跳约 3 格高（正好能跳上 2×2 箱子）
const MAX_SPEED = 420;
const GROUND_ACCEL = 18;
const AIR_ACCEL = 12;
const GROUND_FRICTION = 26;
const COYOTE = 0.10;
const JUMP_BUFFER = 0.12;
const SPRING_VY = -1350;
const CANNON_VY = -980;    // 大炮弹射初速（弹起约 5 格）
const BALL_R = 19;
const TILE = 40;
const BOSS_HP = 5;
const BOSS_EYE_CYCLE = 10;   // Boss 黄眼的周期（秒）
const BOSS_WARN = 2;         // 红眼结束前 2 秒闪烁警告（动画警告）

/* ============================ 皮肤 ============================ */
const SKINS = [
  { id: 'red',    name: '经典红', c0: '#ff8376', c1: '#e93333', c2: '#7c0f13', edge: '#56090d' },
  { id: 'blue',   name: '海洋蓝', c0: '#86c4ff', c1: '#2f6fe0', c2: '#0b2f6e', edge: '#07204a' },
  { id: 'green',  name: '翡翠绿', c0: '#93f3a4', c1: '#2fbf5a', c2: '#0b5e28', edge: '#063d1a' },
  { id: 'gold',   name: '黄金',   c0: '#ffeaa3', c1: '#f0b429', c2: '#8a5a10', edge: '#5c3a08' },
  { id: 'black',  name: '暗影黑', c0: '#aab2bd', c1: '#3a4048', c2: '#0b0d10', edge: '#05060a' },
  { id: 'neon',   name: '霓虹紫', c0: '#ff9bf6', c1: '#c92fe0', c2: '#560b66', edge: '#38053f' },
  { id: 'flame',  name: '火焰橙', c0: '#ffb36b', c1: '#ff6a00', c2: '#a03a00', edge: '#6b2600' },
  { id: 'lime',   name: '青柠',   c0: '#d8ff8a', c1: '#8fd400', c2: '#3f6b00', edge: '#284500' },
  { id: 'ice',    name: '冰蓝',   c0: '#c9f7ff', c1: '#52d6f0', c2: '#0a6d85', edge: '#064556' },
  { id: 'pink',   name: '樱花粉', c0: '#ffd0e6', c1: '#ff5f9e', c2: '#a01b5c', edge: '#680f3b' },
  { id: 'violet', name: '紫罗兰', c0: '#d8c9ff', c1: '#8a5cff', c2: '#3a1a8a', edge: '#240f57' },
  { id: 'wood',   name: '棕木',   c0: '#e8c49a', c1: '#a06a34', c2: '#4a2c12', edge: '#2e1b0a' },
  { id: 'snow',   name: '雪白',   c0: '#ffffff', c1: '#d3dce4', c2: '#8a97a5', edge: '#6a7784' },
  { id: 'rose',   name: '玫瑰红', c0: '#ff9aa6', c1: '#e0244a', c2: '#7c0a20', edge: '#520615' },
  { id: 'mint',   name: '薄荷',   c0: '#b8ffe8', c1: '#3ad8a8', c2: '#0a6e52', edge: '#064736' },
  { id: 'galaxy', name: '星空',   c0: '#b8c8ff', c1: '#4a5fd0', c2: '#1a1f5e', edge: '#0e1138' },
  { id: 'hollow', name: '空心红', hollow: true, c0: '#ff8376', c1: '#e93333', c2: '#7c0f13', edge: '#56090d' },
  { id: 'pixel',  name: '像素绿', pixel: true, c0: '#a8e08a', c1: '#5a9e3f', c2: '#2e5c1c', edge: '#1b3a0f' },
  { id: 'blocky', name: '积木红', blocky: true, c0: '#ffa08a', c1: '#e2231a', c2: '#7a0e0a', edge: '#520d08' },
  { id: 'glowgreen',  name: '荧光绿', glow: '#39ff6a', c0: '#d0ffb0', c1: '#39ff6a', c2: '#0a7a2a', edge: '#064a18' },
  { id: 'glowblue',   name: '荧光蓝', glow: '#2fa8ff', c0: '#b0e0ff', c1: '#2fa8ff', c2: '#0a3a7a', edge: '#062850' },
  { id: 'glowpink',   name: '荧光粉', glow: '#ff4ad0', c0: '#ffb0e0', c1: '#ff4ad0', c2: '#8a0a5a', edge: '#5a0638' },
  { id: 'gloworange', name: '荧光橙', glow: '#ff8a2a', c0: '#ffe0a0', c1: '#ff8a2a', c2: '#8a3a0a', edge: '#5a2606' },
  { id: 'glowviolet', name: '荧光紫', glow: '#9a4aff', c0: '#d0b0ff', c1: '#9a4aff', c2: '#4a0a8a', edge: '#2e065a' },
  { id: 'verty', name: 'Verty（限定）', face: 'smiley', solid: true, c0: '#ffd400', c1: '#ffd400', c2: '#ffd400', edge: '#b58a00' },
];

/* ============================ 帽子 / 衣服 ============================ */
// 每个 draw(r) 在球的局部坐标系里绘制（原点=球心，半径 r，球顶 y=-r）
const HATS = [
  { id: 'crown', name: '皇冠', draw(r) {
    const w = r * 1.7, h = r * 0.8, y = -r - h * 0.45, x = -w / 2;
    ctx.save();
    ctx.fillStyle = '#f6c344'; ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.5);
    const n = 3, sw = w / n;
    for (let i = 0; i < n; i++) {
      ctx.lineTo(x + i * sw + sw * 0.12, y);
      ctx.lineTo(x + i * sw + sw * 0.5, y + h * 0.42);
      ctx.lineTo(x + i * sw + sw * 0.88, y);
    }
    ctx.lineTo(x + w, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0244a';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + sw * (i + 0.5), y + h * 0.72, r * 0.09, 0, 7); ctx.fill(); }
    ctx.restore();
  } },
  { id: 'tophat', name: '礼帽', draw(r) {
    const w = r * 0.9, h = r * 1.05, br = r * 0.95;
    ctx.save();
    ctx.fillStyle = '#23262d'; ctx.strokeStyle = '#0b0d10'; ctx.lineWidth = 1.5;
    ctx.fillRect(-w / 2, -r - h, w, h);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-w / 2, -r - r * 0.26, w, r * 0.26);
    ctx.fillStyle = '#1a1d22'; ctx.beginPath(); ctx.ellipse(0, -r, br, r * 0.26, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#23262d'; ctx.beginPath(); ctx.ellipse(0, -r - h, w / 2, r * 0.18, 0, 0, 7); ctx.fill();
    ctx.restore();
  } },
  { id: 'wizard', name: '巫师帽', draw(r) {
    const h = r * 1.7, br = r * 1.0;
    ctx.save();
    ctx.translate(0, -r);
    ctx.fillStyle = '#7a3fd0'; ctx.strokeStyle = '#3a1a8a'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, br, r * 0.2, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-br * 0.9, 0);
    ctx.quadraticCurveTo(-r * 0.3, -h * 0.9, r * 0.35, -h);
    ctx.quadraticCurveTo(r * 0.5, -h * 0.85, br * 0.6, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6c344'; drawStar(r * 0.3, -h * 0.72, r * 0.26); ctx.fill();
    ctx.restore();
  } },
  { id: 'beanie', name: '冬帽', draw(r) {
    const w = r * 1.9;
    ctx.save();
    ctx.fillStyle = '#2fbf5a'; ctx.strokeStyle = '#0b5e28'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 1.02, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-w / 2, -r * 0.52, w, r * 0.4);
    ctx.fillStyle = '#e93a3a'; ctx.fillRect(-w / 2, -r * 0.52, w, r * 0.16);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -r * 1.42, r * 0.32, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.stroke();
    ctx.restore();
  } },
  { id: 'cap', name: '鸭舌帽', draw(r) {
    ctx.save();
    ctx.fillStyle = '#e93333'; ctx.strokeStyle = '#7c0f13'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 1.0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7c0f13'; ctx.beginPath(); ctx.ellipse(r * 0.72, -r * 0.18, r * 0.62, r * 0.16, -0.08, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -r * 1.05, r * 0.14, 0, 7); ctx.fill();
    ctx.restore();
  } },
  { id: 'cowboy', name: '牛仔帽', draw(r) {
    ctx.save();
    ctx.fillStyle = '#a06a34'; ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.78, r * 1.4, r * 0.32, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.8);
    ctx.quadraticCurveTo(-r * 0.6, -r * 1.7, -r * 0.12, -r * 1.2);
    ctx.quadraticCurveTo(0, -r * 1.5, r * 0.12, -r * 1.2);
    ctx.quadraticCurveTo(r * 0.6, -r * 1.7, r * 0.85, -r * 0.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5c3a08'; ctx.fillRect(-r * 0.82, -r * 1.02, r * 1.64, r * 0.24);
    ctx.restore();
  } },
  { id: 'party', name: '派对帽', draw(r) {
    ctx.save();
    ctx.translate(0, -r);
    const h = r * 1.7, bw = r * 0.9;
    ctx.fillStyle = '#2f9e44'; ctx.strokeStyle = '#0b5e28'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-bw, 0); ctx.lineTo(0, -h); ctx.lineTo(bw, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0244a';
    ctx.beginPath(); ctx.moveTo(-bw * 0.5, -h * 0.3); ctx.lineTo(bw * 0.5, -h * 0.3); ctx.lineTo(bw * 0.8, -h * 0.58); ctx.lineTo(-bw * 0.8, -h * 0.58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6c344';
    ctx.beginPath(); ctx.moveTo(-bw * 0.7, -h * 0.75); ctx.lineTo(bw * 0.7, -h * 0.75); ctx.lineTo(0, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6c344'; ctx.beginPath(); ctx.arc(0, -h - r * 0.12, r * 0.18, 0, 7); ctx.fill();
    ctx.fillStyle = '#e0244a'; ctx.fillRect(-bw, -r * 0.06, bw * 2, r * 0.14);
    ctx.restore();
  } },
  { id: 'santa', name: '圣诞帽', draw(r) {
    ctx.save();
    ctx.translate(0, -r);
    const h = r * 1.5, bw = r * 0.95;
    ctx.fillStyle = '#e0244a'; ctx.strokeStyle = '#7c0a20'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-bw, 0);
    ctx.quadraticCurveTo(-r * 0.4, -h, r * 0.6, -h * 0.85);
    ctx.quadraticCurveTo(r * 1.15, -h * 0.7, r * 1.1, -h * 0.32);
    ctx.quadraticCurveTo(r * 0.85, -h * 0.12, r * 0.5, -h * 0.3);
    ctx.quadraticCurveTo(r * 0.1, -h * 0.5, bw, -r * 0.02);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath(); ctx.ellipse(0, 0, bw, r * 0.24, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(r * 1.02, -h * 0.3, r * 0.32, 0, 7); ctx.fill();
    ctx.restore();
  } },
  { id: 'block', name: '方块头', draw(r) {
    ctx.save();
    ctx.translate(0, -r);
    const s = r * 0.85;
    ctx.fillStyle = '#5a9e3f'; ctx.strokeStyle = '#2e5c1c'; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineJoin = 'round';
    ctx.fillRect(-s, -r * 1.55, s * 2, r * 1.55);
    ctx.strokeRect(-s, -r * 1.55, s * 2, r * 1.55);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(-s * 0.55, -r * 1.3, s * 0.34, s * 0.34);
    ctx.fillRect(s * 0.2, -r * 1.3, s * 0.34, s * 0.34);
    ctx.fillRect(-s * 0.35, -r * 0.7, s * 0.7, s * 0.28);
    ctx.fillRect(-s * 0.55, -r * 0.48, s * 0.28, s * 0.28);
    ctx.fillRect(s * 0.27, -r * 0.48, s * 0.28, s * 0.28);
    ctx.restore();
  } },
  { id: 'robox', name: '积木头', draw(r) {
    ctx.save();
    ctx.translate(0, -r);
    const s = r * 0.72;
    ctx.fillStyle = '#f6c344'; ctx.strokeStyle = '#b07a10'; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineJoin = 'round';
    ctx.fillRect(-s, -r * 1.3, s * 2, r * 1.3);
    ctx.strokeRect(-s, -r * 1.3, s * 2, r * 1.3);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(-s * 0.5, -r * 0.9, s * 0.3, s * 0.3);
    ctx.fillRect(s * 0.2, -r * 0.9, s * 0.3, s * 0.3);
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -r * 0.6, s * 0.42, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.restore();
  } },
];
const CLOTHES = [
  { id: 'shorts', name: '短裤', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#3a7bd5'; ctx.fillRect(-r, r * 0.42, r * 2, r);
    ctx.fillStyle = '#2a5aa0'; ctx.fillRect(-r, r * 0.42, r * 2, r * 0.12);
    ctx.restore();
  } },
  { id: 'overalls', name: '背带裤', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2f6fe0'; ctx.fillRect(-r, r * 0.42, r * 2, r);
    ctx.fillStyle = '#2f6fe0'; ctx.fillRect(-r * 0.34, r * 0.3, r * 0.68, r * 0.3); // bib
    ctx.fillStyle = '#f6c344';
    ctx.beginPath(); ctx.arc(-r * 0.18, r * 0.34, r * 0.07, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.18, r * 0.34, r * 0.07, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2f6fe0'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.3); ctx.lineTo(-r * 0.55, -r * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.3); ctx.lineTo(r * 0.55, -r * 0.5); ctx.stroke();
  } },
  { id: 'bowtie', name: '领结', draw(r) {
    const y = r * 0.5;
    ctx.save();
    ctx.fillStyle = '#e0244a'; ctx.strokeStyle = '#7c0a20'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(-r * 0.42, y - r * 0.16); ctx.lineTo(-r * 0.42, y + r * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(r * 0.42, y - r * 0.16); ctx.lineTo(r * 0.42, y + r * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7c0a20'; ctx.beginPath(); ctx.arc(0, y, r * 0.11, 0, 7); ctx.fill();
    ctx.restore();
  } },
  { id: 'belt', name: '腰带', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#8a5a10'; ctx.fillRect(-r, r * 0.42, r * 2, r * 0.2);
    ctx.restore();
    ctx.fillStyle = '#f6c344'; ctx.strokeStyle = '#5c3a08'; ctx.lineWidth = 1.5;
    ctx.fillRect(-r * 0.22, r * 0.42, r * 0.44, r * 0.2);
    ctx.strokeRect(-r * 0.22, r * 0.42, r * 0.44, r * 0.2);
    ctx.strokeStyle = '#5c3a08'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.05, 0, 7); ctx.stroke();
  } },
  { id: 'scarf', name: '围巾', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#e0244a'; ctx.fillRect(-r, r * 0.4, r * 2, r * 0.22);
    ctx.fillStyle = '#b31b3c'; ctx.fillRect(-r, r * 0.4, r * 2, r * 0.06);
    ctx.restore();
    // 垂下的围巾尾
    ctx.fillStyle = '#e0244a'; ctx.strokeStyle = '#7c0a20'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.42);
    ctx.quadraticCurveTo(r * 0.95, r * 0.9, r * 0.7, r * 1.5);
    ctx.quadraticCurveTo(r * 0.55, r * 0.85, r * 0.35, r * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b31b3c'; ctx.beginPath(); ctx.arc(r * 0.7, r * 1.4, r * 0.12, 0, 7); ctx.fill();
  } },
  { id: 'cape', name: '披风', draw(r) {
    ctx.save();
    ctx.fillStyle = '#e0244a'; ctx.strokeStyle = '#7c0a20'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.28, r * 0.12);
    ctx.quadraticCurveTo(-r * 1.15, r * 0.75, -r * 0.95, r * 1.6);
    ctx.quadraticCurveTo(-r * 0.4, r * 1.25, 0, r * 0.95);
    ctx.quadraticCurveTo(r * 0.4, r * 1.25, r * 0.95, r * 1.6);
    ctx.quadraticCurveTo(r * 1.15, r * 0.75, r * 0.28, r * 0.12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6c344'; ctx.beginPath(); ctx.arc(0, r * 0.22, r * 0.16, 0, 7); ctx.fill();
    ctx.restore();
  } },
  { id: 'tie', name: '领带', draw(r) {
    ctx.save();
    ctx.fillStyle = '#2f6fe0'; ctx.strokeStyle = '#0b2f6e'; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.lineTo(-r * 0.22, r * 0.28);
    ctx.lineTo(-r * 0.15, r * 0.95);
    ctx.lineTo(0, r * 1.2);
    ctx.lineTo(r * 0.15, r * 0.95);
    ctx.lineTo(r * 0.22, r * 0.28);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b2f6e'; ctx.beginPath(); ctx.moveTo(-r * 0.24, r * 0.18); ctx.lineTo(r * 0.24, r * 0.18); ctx.lineTo(0, r * 0.42); ctx.closePath(); ctx.fill();
    ctx.restore();
  } },
  { id: 'vest', name: '马甲', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2fbf5a'; ctx.fillRect(-r, r * 0.08, r * 2, r * 0.9);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.16, r * 0.08, r * 0.32, r * 0.9);
    ctx.restore();
    ctx.fillStyle = '#2fbf5a'; ctx.strokeStyle = '#0b5e28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.42, r * 0.12); ctx.lineTo(-r * 0.58, -r * 0.32); ctx.lineTo(0, r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.42, r * 0.12); ctx.lineTo(r * 0.58, -r * 0.32); ctx.lineTo(0, r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b5e28';
    ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.05, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, r * 0.58, r * 0.05, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, r * 0.78, r * 0.05, 0, 7); ctx.fill();
  } },
  { id: 'pixel', name: '像素衣', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#5a9e3f'; ctx.fillRect(-r, r * 0.3, r * 2, r * 0.7);
    ctx.fillStyle = '#4a7e2f';
    const cell = r * 0.25;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) ctx.fillRect(-r + i * cell, r * 0.3 + j * cell, cell, cell);
    ctx.restore();
  } },
  { id: 'armor', name: '护甲', draw(r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#8a97a5'; ctx.fillRect(-r, r * 0.25, r * 2, r * 0.7);
    ctx.fillStyle = '#6a7784'; ctx.fillRect(-r, r * 0.25, r * 2, r * 0.12);
    ctx.restore();
    ctx.fillStyle = '#8a97a5'; ctx.strokeStyle = '#6a7784'; ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.fillRect(-r * 0.16, r * 0.42, r * 0.32, r * 0.3);
    ctx.strokeRect(-r * 0.16, r * 0.42, r * 0.32, r * 0.3);
  } },
];
/* 眼镜：画在球局部坐标里（原点=球心，半径 r），覆盖在眼睛上方 */
const GLASSES = [
  { id: 'round', name: '圆框眼镜', draw(r) {
    const ex = r * 0.34, ey = -r * 0.13, rx = r * 0.28, ry = r * 0.31;
    ctx.save();
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = Math.max(1.5, r * 0.075); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(-ex, ey, rx, ry, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-ex + rx, ey); ctx.quadraticCurveTo(0, ey + r * 0.12, ex - rx, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-ex - rx, ey - r * 0.05); ctx.lineTo(-r * 0.88, ey - r * 0.14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + rx, ey - r * 0.05); ctx.lineTo(r * 0.88, ey - r * 0.14); ctx.stroke();
    ctx.restore();
  } },
  { id: 'shades', name: '墨镜', draw(r) {
    const ex = r * 0.34, ey = -r * 0.13, rx = r * 0.3, ry = r * 0.26;
    ctx.save();
    ctx.fillStyle = '#15171c'; ctx.strokeStyle = '#06070a'; ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath(); ctx.ellipse(-ex, ey, rx, ry, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#15171c'; ctx.fillRect(-r * 0.12, ey - r * 0.06, r * 0.24, r * 0.12);
    ctx.strokeStyle = '#06070a';
    ctx.beginPath(); ctx.moveTo(-ex - rx, ey); ctx.lineTo(-r * 0.9, ey - r * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + rx, ey); ctx.lineTo(r * 0.9, ey - r * 0.12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.ellipse(-ex - rx * 0.25, ey - ry * 0.32, rx * 0.18, ry * 0.14, -0.45, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex - rx * 0.25, ey - ry * 0.32, rx * 0.18, ry * 0.14, -0.45, 0, 7); ctx.fill();
    ctx.restore();
  } },
  { id: 'goggles', name: '护目镜', draw(r) {
    const ex = r * 0.34, ey = -r * 0.13, rr = r * 0.3;
    ctx.save();
    ctx.strokeStyle = '#8a5a10'; ctx.fillStyle = 'rgba(170,225,255,.38)'; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(-ex, ey, rr, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, rr, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-ex + rr, ey); ctx.lineTo(ex - rr, ey); ctx.stroke();
    ctx.strokeStyle = '#5c3a08'; ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath(); ctx.moveTo(-ex - rr, ey); ctx.lineTo(-r * 0.95, ey - r * 0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + rr, ey); ctx.lineTo(r * 0.95, ey - r * 0.06); ctx.stroke();
    ctx.restore();
  } },
];
function drawHat(r, idx) { if (idx > 0 && idx <= HATS.length) HATS[idx - 1].draw(r); }
function drawClothes(r, idx) { if (idx > 0 && idx <= CLOTHES.length) CLOTHES[idx - 1].draw(r); }
function drawGlasses(r, idx) { if (idx > 0 && idx <= GLASSES.length) GLASSES[idx - 1].draw(r); }
// 发光皮肤：在球体后方画一圈霓虹光晕（sk.glow 为发光色）
function drawGlow(r, sk) {
  if (!sk.glow) return;
  ctx.save();
  ctx.shadowColor = sk.glow; ctx.shadowBlur = r * 1.4;
  ctx.fillStyle = sk.glow;
  ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, 7); ctx.fill();
  ctx.restore();
}
// 球体本体：普通渐变 / 空心环 / 纯色 / 像素风 / 积木块（绘制后留下描边轮廓路径，供调用方 stroke 边缘）
function drawBallBody(sk, r) {
  if (sk.hollow) {
    ctx.strokeStyle = sk.c1; ctx.lineWidth = Math.max(2.5, r * 0.14);
    ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7);
  } else if (sk.solid) {
    ctx.fillStyle = sk.c1; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  } else if (sk.pixel) {
    // 像素风：用方格拼出圆形，越靠边颜色越深
    const p = Math.max(2.5, r / 3.2);
    for (let gy = 0; gy * p < r * 2; gy++) {
      for (let gx = 0; gx * p < r * 2; gx++) {
        const px = gx * p - r + p / 2, py = gy * p - r + p / 2;
        const d2 = px * px + py * py;
        if (d2 > r * r) continue;
        const d = Math.sqrt(d2) / r;
        ctx.fillStyle = d > 0.72 ? sk.c2 : (d > 0.38 ? sk.c1 : sk.c0);
        ctx.fillRect(px - p / 2, py - p / 2, p, p);
      }
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7);
  } else if (sk.blocky) {
    // 积木风：带倒角的方块
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, sk.c0); g.addColorStop(0.5, sk.c1); g.addColorStop(1, sk.c2);
    ctx.fillStyle = g;
    roundRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8, r * 0.35);
    ctx.fill();
  } else {
    const g = ctx.createRadialGradient(-r * 0.22, -r * 0.3, r * 0.12, 0, 0, r);
    g.addColorStop(0, sk.c0); g.addColorStop(0.45, sk.c1); g.addColorStop(1, sk.c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
}
// 笑脸脸型（Verty 限定）：两个黑色圆豆眼 + 上扬微笑
function drawSmileyFace(r, lookX, lookY) {
  const ex = r * 0.32, ey = -r * 0.14;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-ex + lookX, ey + lookY, r * 0.12, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + lookX, ey + lookY, r * 0.12, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = Math.max(2, r * 0.13); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, r * 0.04, r * 0.42, 0.2, Math.PI - 0.2); ctx.stroke();
}

/* ============================ 全局状态 ============================ */
const KEYS = { left: false, right: false, up: false, down: false };
const INPUT = { left: false, right: false, up: false, down: false };
let state = 'LOGIN';        // LOGIN | LANGSEL | TITLE | PLAY | COMPLETE | GAMEOVER | STORY | ENDING | EDIT | CUSTOM | LOAD | WARDROBE | MUSICBOX | CREDITS
let isStudent = false;       // 小学学生模式：解锁编辑器、但不保存进度
let noSave = false;          // 为 true 时只跳过「进度」写入（解锁/星星/外观）；关卡编辑仍保存
let levelIndex = 0;
let chapterIndex = 0;       // 标题/选关界面当前选中的篇章（0=草原 1=森林 2=峡谷 3=矿井 4=宇宙）
let hearts = 3;
let god = false;            // 按 U 切换无敌（作弊/调试）
let fly = false;            // 按 G 切换飞行（开挂：无视重力与碰撞，方向键上下左右飞行）
let flyTrail = 0;           // 飞行拖尾粒子节流
let starsGot = 0;
let theme = 'grass';

let skinIndex = 0;
let hatIndex = 0;           // 0 = 无帽子，1..HATS.length
let clothesIndex = 0;       // 0 = 无衣服，1..CLOTHES.length
let glassesIndex = 0;       // 0 = 无眼镜，1..GLASSES.length
let maxUnlocked = 1;        // 已解锁最高关卡（1 基）
let bestStars = [];

let solids = [];            // 静态地面/平台 {x,y,w,h,type}
let boxes = [];             // 可推动的箱子
let enemies = [];           // {x,y,hw,hh,vx,vy,dir,speed,grounded,dead,type,hp...}
let spikes = [];
let springs = [];
let water = [];
let stars = [];
let movers = [];           // 移动平台（机关）
let planks = [];           // 漂浮木板（单向平台，可跳上、可从下方穿过）
let cannons = [];          // 大炮（向上弹射机关）
let lasers = [];           // 火焰机关（定时喷火）
let checkpoints = [];      // 复活点 {x,y,taken}
let respawn = null;        // 当前生效的复活点（null = 用出生点）
let waterTraps = [];       // Boss 陷阱水 {x,y,w,warn,life}
let pitSolids = [];        // 被陷阱水挖掉的固体（对 Boss 仍视为地面，Boss 免疫自己的坑）
let gears = [];            // 齿轮 {x,y,r,angle,spin}（旋转陷阱，碰到受伤）
let switches = [];         // 机关/拉杆 {x,y,w,h,on}（点一下触发，打开门）
let doors = [];            // 门 {x,y,w,h,open}（关闭时阻挡，机关触发后打开）
let destructibles = [];    // 可破坏墙 {x,y,w,h,dead}（重踩/爆炸碎裂，隐藏路线）
let fakes = [];            // 假墙 {x,y,w,h}（视觉存在但无碰撞）
let oneways = [];          // 单向门 {x,y,w,h,allowDir}（+1 只许向右，-1 只许向左）
let projectiles = [];      // 敌人射弹 {x,y,vx,vy,r,life,dead}（炮塔/射弹怪）
let boulders = [];         // 石球/巨石 {x,y,r,vx,vy,grounded}（可推动的圆石）
let seesaws = [];          // 跷跷板 {x,y,w,pivotX,pivotY,angle,angleVel}
let buttons = [];          // 压力按钮 {x,y,w,h,on}（压住持续开门）
let conveyors = [];        // 传送带 {x,y,w,h,dir}（站在其上给水平速度）
let pendulums = [];        // 摆锤 {ax,ay,len,angle,omega,r}（绕锚点摆动）
let fans = [];             // 风扇 {x,y,w,h,force,phase,on}（持续吹力）
let fragiles = [];         // 易碎平台 {x,y,w,h,life,broken,shakeT}（站上碎裂）
let saws = [];             // 旋转锯片 {x,y,r,angle,spin}（旋转伤害体）
let explosives = [];       // 爆炸桶 {x,y,w,h,dead,fuse}（重踩/被击后爆炸）
let keys = [];             // 钥匙 {x,y,taken}（收集后开门）
let ropes = [];            // 绳索 {x,y,h}（悬挂线视觉，摆锤锚点）
let surface = [];          // 地表剖面（每列地面顶部行号，用于草皮）
let flag = null;
let shake = 0;             // 震屏强度（Boss 砸地等）
let lava = [];             // 熔岩 {x,y,w,h}（接触=受伤，机械臂 Boss 场）
let conveyorBoost = 1;     // 压路机 Boss 传送带加速系数（随时间递增）
let chase = null;          // 方块博士阶段三追逐状态 {on,x,speed,t,doctorX,endX}
let beams = [];            // 方块博士激光束 {y,warn,life,dead}（警告线→水平光束，需跳起躲避）

/* ============================ 地形编辑器 ============================ */
const EDIT_COLS = 200, EDIT_ROWS = 22;
const PALETTE = [
  { ch: '.', label: '空',     color: '#cbd5e0', cat: '地形' },
  { ch: '#', label: '草地',   color: '#4f9e42', cat: '地形' },
  { ch: 'd', label: '泥土',   color: '#8a5a2b', cat: '地形' },
  { ch: '=', label: '石板',   color: '#7a8292', cat: '地形' },
  { ch: 'i', label: '冰面',   color: '#a8e6ff', cat: '地形' },
  { ch: 'm', label: '泥地',   color: '#6b4a2b', cat: '地形' },
  { ch: 's', label: '沙地',   color: '#d9b36a', cat: '地形' },
  { ch: 'u', label: '木台',   color: '#b07a3c', cat: '地形' },
  { ch: 'v', label: '金台',   color: '#8a95a5', cat: '地形' },
  { ch: '[', label: '斜坡↗',  color: '#7a8292', cat: '地形' },
  { ch: ']', label: '斜坡↖',  color: '#7a8292', cat: '地形' },
  { ch: '(', label: '圆坡↗',  color: '#7a8292', cat: '地形' },
  { ch: ')', label: '圆坡↖',  color: '#7a8292', cat: '地形' },
  { ch: 'x', label: '破墙',   color: '#9a6a3f', cat: '地形' },
  { ch: 'f', label: '假墙',   color: '#7a8292', cat: '地形' },
  { ch: '>', label: '单向→',  color: '#4aa8ff', cat: '地形' },
  { ch: '<', label: '单向←',  color: '#4aa8ff', cat: '地形' },
  { ch: 'W', label: '木板',   color: '#b07a3c', cat: '地形' },
  { ch: 'B', label: '大箱',   color: '#c58a3f', cat: '物品' },
  { ch: 'r', label: '石球',   color: '#9aa0a6', cat: '物品' },
  { ch: 'V', label: '跷跷板', color: '#c8904a', cat: '物品' },
  { ch: '!', label: '压钮',   color: '#ffd23e', cat: '物品' },
  { ch: '%', label: '拉杆',   color: '#ffb84a', cat: '物品' },
  { ch: '@', label: '传送带', color: '#4aa8ff', cat: '物品' },
  { ch: 'E', label: '电梯',   color: '#8a95a5', cat: '物品' },
  { ch: ';', label: '摆锤',   color: '#8b95a5', cat: '物品' },
  { ch: ':', label: '风扇',   color: '#4ac0e0', cat: '物品' },
  { ch: '+', label: '碎台',   color: '#c8904a', cat: '物品' },
  { ch: ',', label: '锯片',   color: '#c0c8d0', cat: '物品' },
  { ch: '?', label: '爆炸桶', color: '#e74c3c', cat: '物品' },
  { ch: '1', label: '钥匙',   color: '#ffd23e', cat: '物品' },
  { ch: '\\', label: '绳索',  color: '#c8904a', cat: '物品' },
  { ch: '|', label: '链条',   color: '#8a95a5', cat: '物品' },
  { ch: '2', label: '转台',   color: '#b07a3c', cat: '物品' },
  { ch: '5', label: '矿车',   color: '#6a7282', cat: '物品' },
  { ch: '_', label: '宽木板', color: '#b07a3c', cat: '物品' },
  { ch: '*', label: '星星',   color: '#ffd23e', cat: '物品' },
  { ch: '~', label: '弹簧',   color: '#ff9d3d', cat: '物品' },
  { ch: 'C', label: '大炮',   color: '#5a6070', cat: '物品' },
  { ch: 'e', label: '小怪',   color: '#ff8a3d', cat: '敌人' },
  { ch: 'n', label: '牛角',   color: '#e74c3c', cat: '敌人' },
  { ch: 'a', label: '快怪',   color: '#ff6b4a', cat: '敌人' },
  { ch: 'j', label: '跳怪',   color: '#ff9d3d', cat: '敌人' },
  { ch: 'k', label: '刺怪',   color: '#c0c8d0', cat: '敌人' },
  { ch: 'h', label: '甲怪',   color: '#8a95a5', cat: '敌人' },
  { ch: 'A', label: '巨怪',   color: '#b04a6a', cat: '敌人' },
  { ch: 'q', label: '冲怪',   color: '#ff5a5a', cat: '敌人' },
  { ch: 't', label: '追怪',   color: '#ffb84a', cat: '敌人' },
  { ch: 'p', label: '推箱',   color: '#c58a3f', cat: '敌人' },
  { ch: 'z', label: '射弹',   color: '#ff8a3d', cat: '敌人' },
  { ch: 'y', label: '飞怪',   color: '#7fb7ff', cat: '敌人' },
  { ch: 'Y', label: '炮塔',   color: '#5a6070', cat: '敌人' },
  { ch: 'b', label: '炸怪',   color: '#ff4a6a', cat: '敌人' },
  { ch: 'l', label: '无敌怪', color: '#c0392b', cat: '敌人' },
  { ch: 'g', label: '机关怪', color: '#b07a4a', cat: '敌人' },
  { ch: 'o', label: '魔王',   color: '#7d2b3f', cat: '敌人' },
  { ch: 'O', label: '压路机', color: '#8a5a2b', cat: '敌人' },
  { ch: 'U', label: '机械臂', color: '#ff5012', cat: '敌人' },
  { ch: 'X', label: '蜘蛛',   color: '#5a6070', cat: '敌人' },
  { ch: 'Q', label: '博士',   color: '#2b3f7d', cat: '敌人' },
  { ch: '^', label: '尖刺',   color: '#9aa0a6', cat: '敌人' },
  { ch: 'L', label: '火焰',   color: '#ff5a5a', cat: '敌人' },
  { ch: 'G', label: '齿轮',   color: '#8b95a5', cat: '敌人' },
  { ch: 'w', label: '水',     color: '#4aa8ff', cat: '敌人' },
  { ch: 'F', label: '旗子',   color: '#e23a3a', cat: '特殊' },
  { ch: 'P', label: '出生',   color: '#4aa8ff', cat: '特殊' },
  { ch: 'R', label: '复活点', color: '#5fd6a0', cat: '特殊' },
  { ch: 'M', label: '平台',   color: '#2fbfa0', cat: '特殊' },
  { ch: 'T', label: '终点',   color: '#ff8a8a', cat: '特殊' },
  { ch: 'S', label: '机关',   color: '#ffd23e', cat: '特殊' },
  { ch: 'D', label: '门',     color: '#5a6272', cat: '特殊' },
  { ch: '&', label: '熔岩',   color: '#ff5012', cat: '敌人' },
];
let editGrid = [];          // 22 行字符串，每行 EDIT_COLS 字符
let editCamX = 0;           // 编辑器横向滚动偏移（200 格宽时用于平移）
let editPalette = '#';      // 当前选中的方块
let editPalettePage = 0;    // 调色板当前页（分页显示）
let editPainting = false;
let customLevels = [];      // [{name, rows}]
let playingCustom = false;  // 是否正在玩自定义关卡
let customDef = null;       // 当前自定义关卡 def
let overrides = {};         // 主线关卡覆盖 {index: rows}
let overrideNames = {};     // 主线关卡改名 {index: name}
let editTarget = -1;        // 编辑器正在编辑的主线关卡索引（-1 = 自定义/空白）
let customEditIndex = -1;   // 编辑器正在编辑的自定义关卡索引（-1 = 尚未保存过，保存时新建）
let editorUnlocked = false; // 是否已用兑换码解锁编辑器
let loadFrom = 'title';     // 载入主线界面的来源：'title'（点编辑器进入）或 'editor'（编辑器里点载入）
const REDEEM_CODE = 'HS2693@#';  // 解锁编辑器的兑换码
let killY = 900;
let mapH = 540;

let ball = null;
let vertySpeechUntil = 0;   // Verty 说话气泡显示截止时间（time 秒）
let vertyNextSpeak = 4;     // Verty 下次说话的倒计时（秒）
let cam = { x: 0, y: 0 };
let particles = [];
let trail = [];
let jumpQueued = false;

let lastGrounded = 0, lastJumpPress = 0;
let time = 0;

/* ---- 水（进水直接死，无氧气/憋气） ---- */
let wasInWater = false;        // 上一帧是否在水中（用于触发入水水花）
let rollCd = 0;                // 滚动音效节流
let levelTip = '';           // 当前关卡玩法提示（每关介绍不同机制）
let tipUntil = -1;           // 提示消失的时间点（time 秒）
let tutorialSeen = false;    // 是否看过新手教程

/* ============================ 剧情 ============================ */
let story = null;          // 当前显示的剧情 {title, lines}
const STORIES = {
  0: { title: '序章 · 红球出发', lines: [
    '太阳被方块魔王偷走了，世界失去了颜色。',
    '勇敢的红球滚过起伏的草原，',
    '收集散落的星星，夺回光明！',
  ] },
  5: { title: '第二章 · 草原机关', lines: [
    '草原深处藏满了古老的机关。',
    '会移动的平台、向上弹射的大炮，',
    '还有定时喷火的陷阱，务必小心！',
  ] },
  10: { title: '第三章 · 山路起伏', lines: [
    '草原尽头是连绵起伏的丘陵。',
    '尖刺与火焰机关遍布，',
    '魔王的宫殿就在最高的山丘之后……',
  ] },
  14: { title: '草原终章 · 魔王之战', lines: [
    '方块魔王现身了！',
    '踩在它头上五次，',
    '把它彻底击败，夺回太阳！',
  ] },
  15: { title: '第二章 · 森林篇', lines: [
    '草原的尽头，是一片幽深的森林。',
    '树冠遮天蔽日，藤蔓与密林交错，',
    '红球滚进了这绿色的迷宫……',
  ] },
  29: { title: '森林终章 · 钢铁压路机', lines: [
    '钢铁压路机现身了！',
    '直接踩头击杀它，小心它召唤的小怪！',
  ] },
  30: { title: '第三章 · 峡谷篇', lines: [
    '穿过森林，是万丈深渊的峡谷。',
    '红球要在移动平台间飞跃，',
    '小心别掉进峡谷！',
  ] },
  44: { title: '峡谷终章 · 熔岩机械臂', lines: [
    '熔岩机械臂现身了！',
    '踩按钮冻住机械臂，再跳上核心攻击！',
  ] },
  45: { title: '第四章 · 矿井篇', lines: [
    '峡谷之下，是黑暗的矿井。',
    '火焰与齿轮机关遍布，',
    '红球小心翼翼地深入矿洞……',
  ] },
  59: { title: '矿井终章 · 机械蜘蛛', lines: [
    '机械蜘蛛现身了！',
    '直接踩头击杀它，小心它召唤的小蜘蛛！',
  ] },
  60: { title: '终章 · 宇宙篇', lines: [
    '冲破地面，红球飞向了宇宙。',
    '在星辰之间跳跃，',
    '找到最后的魔王！',
  ] },
  74: { title: '最终决战 · 方块博士', lines: [
    '方块博士驾驶巨型机器人现身了！',
    '躲开导弹，等核心暴露时踩它！',
  ] },
};
const ENDING = { title: '结局 · 光明重现', lines: [
  '红球战胜了魔王！',
  '太阳重新升起，星星回到天上，世界恢复了颜色。',
  '而红球的冒险，才刚刚开始……',
] };
const TUTORIAL = { title: '🎓 新手教程', lines: [
  '← → 或 A / D：左右滚动',
  '空格 / ↑ / W：跳跃（按住跳得更高）',
  '1 格高的小台阶会自动跳上，高墙和 Boss 要手动跳',
  '收集 ⭐ 星星，躲开尖刺、火焰、水面（进水即死）和敌人',
  '踩敌人头顶可消灭它；到 🚩 过关，失败从 🏳 复活',
  'R 重开 · M 菜单 · I 设置 · F 全屏 · Q 显示鼠标',
] };
// 每一关开头介绍一个新机制（第 1 关 = 索引 0）
const LEVEL_TIPS = [
  '移动与跳跃：← → 滚动，空格/↑ 跳跃，收集 ⭐ 到 🚩',
  '新机关·大炮 🚀：踩上去会被弹到高空，翻越高墙！',
  '新机关·火焰 🔥：它会定时喷火，看准节奏再通过。',
  '新机关·移动平台：站上去，它会带你飞过深渊。',
  '丘陵起伏，多利用弹簧，小心别滚落悬崖。',
  '双炮齐鸣：两门大炮接连弹射，连跳两次越过障碍！',
  '新机关·尖刺 ⚠️：碰到会掉血，务必跳过。',
  '火焰 + 炮台组合来袭，眼疾手快！',
  '悬崖、尖刺、火焰环环相扣，步步为营。',
  '山路蜿蜒曲折，控制好速度，别冲太快。',
  '机关走廊布满尖刺与火焰，先观察再行动。',
  '峰回路转，善用弹簧和大炮翻越地形。',
  '火焰迷宫岔路多，跟着 ⭐ 星星走就不会迷路。',
  '最终试炼：所有机关齐上阵，沉着应对！',
  'Boss 战！魔王会横冲直撞，踩它头顶 5 次即可获胜。',
];

/* ============================ 多语言 ============================ */
const LANGS = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
];
let LANG = 'en';   // 默认英语
// [中文源串, English, Français, 日本語, Deutsch]
const I18N_ROWS = [
  // 皮肤
  ['经典红', 'Classic Red', 'Rouge classique', 'クラシックレッド', 'Klassisches Rot'],
  ['海洋蓝', 'Ocean Blue', 'Bleu océan', 'オーシャンブルー', 'Ozeanblau'],
  ['翡翠绿', 'Jade Green', 'Vert jade', 'ジェイドグリーン', 'Jadegrün'],
  ['黄金', 'Gold', 'Or', 'ゴールド', 'Gold'],
  ['暗影黑', 'Shadow Black', 'Noir d\'ombre', 'シャドウブラック', 'Schatten-Schwarz'],
  ['霓虹紫', 'Neon Purple', 'Violet néon', 'ネオンパープル', 'Neonviolett'],
  ['火焰橙', 'Flaming Orange', 'Orange flamme', 'フレイムオレンジ', 'Flammenorange'],
  ['青柠', 'Lime', 'Citron vert', 'ライム', 'Limette'],
  ['冰蓝', 'Ice Blue', 'Bleu glace', 'アイスブルー', 'Eisblau'],
  ['樱花粉', 'Sakura Pink', 'Rose sakura', 'さくらピンク', 'Kirschblütenrosa'],
  ['紫罗兰', 'Violet', 'Violette', 'バイオレット', 'Violett'],
  ['棕木', 'Wood Brown', 'Bois brun', 'ウッドブラウン', 'Holzbraun'],
  ['雪白', 'Snow White', 'Blanc neige', 'スノーホワイト', 'Schneeweiß'],
  ['玫瑰红', 'Rose Red', 'Rouge rose', 'ローズレッド', 'Rosenrot'],
  ['薄荷', 'Mint', 'Menthe', 'ミント', 'Minze'],
  ['星空', 'Galaxy', 'Galaxie', 'ギャラクシー', 'Galaxie'],
  // 帽子 / 衣服 / 衣柜
  ['皇冠', 'Crown', 'Couronne', '王冠', 'Krone'],
  ['礼帽', 'Top Hat', 'Haut-de-forme', 'シルクハット', 'Zylinder'],
  ['巫师帽', 'Wizard Hat', 'Chapeau de sorcier', 'とんがり帽子', 'Zauberhut'],
  ['冬帽', 'Beanie', 'Bonnet', 'ニット帽', 'Mütze'],
  ['鸭舌帽', 'Cap', 'Casquette', 'キャップ', 'Kappe'],
  ['短裤', 'Shorts', 'Short', '半ズボン', 'Shorts'],
  ['背带裤', 'Overalls', 'Salopette', 'オーバーオール', 'Latzhose'],
  ['领结', 'Bowtie', 'Nœud papillon', '蝶ネクタイ', 'Fliege'],
  ['腰带', 'Belt', 'Ceinture', 'ベルト', 'Gürtel'],
  ['围巾', 'Scarf', 'Écharpe', 'マフラー', 'Schal'],
  ['牛仔帽', 'Cowboy Hat', 'Chapeau de cowboy', 'カウボーイハット', 'Cowboyhut'],
  ['派对帽', 'Party Hat', 'Chapeau de fête', 'パーティーハット', 'Partyhut'],
  ['圣诞帽', 'Santa Hat', 'Bonnet de Noël', 'サンタ帽', 'Weihnachtsmütze'],
  ['披风', 'Cape', 'Cape', 'マント', 'Umhang'],
  ['领带', 'Tie', 'Cravate', 'ネクタイ', 'Krawatte'],
  ['马甲', 'Vest', 'Gilet', 'ベスト', 'Weste'],
  ['空心红', 'Hollow Red', 'Rouge creux', '中空レッド', 'Hohles Rot'],
  ['像素绿', 'Pixel Green', 'Vert pixel', 'ピクセル緑', 'Pixelgrün'],
  ['积木红', 'Block Red', 'Rouge brique', 'ブロック赤', 'Blockrot'],
  ['方块头', 'Block Head', 'Tête de bloc', 'ブロック頭', 'Blockkopf'],
  ['积木头', 'Blocky Head', 'Tête cubique', 'ブロック頭', 'Klotzkopf'],
  ['像素衣', 'Pixel Shirt', 'Chemise pixel', 'ピクセル服', 'Pixel-Shirt'],
  ['护甲', 'Armor', 'Armure', 'アーマー', 'Rüstung'],
  ['荧光绿', 'Neon Green', 'Vert fluo', '蛍光グリーン', 'Neongrün'],
  ['荧光蓝', 'Neon Blue', 'Bleu fluo', '蛍光ブルー', 'Neonblau'],
  ['荧光粉', 'Neon Pink', 'Rose fluo', '蛍光ピンク', 'Neonpink'],
  ['荧光橙', 'Neon Orange', 'Orange fluo', '蛍光オレンジ', 'Neonorange'],
  ['荧光紫', 'Neon Violet', 'Violet fluo', '蛍光パープル', 'Neonviolett'],
  ['Verty（限定）', 'Verty (Limited)', 'Verty (Édition limitée)', 'Verty（限定）', 'Verty (Limitiert)'],
  ['更衣室', 'Wardrobe', 'Vestiaire', '更衣室', 'Umkleide'],
  ['颜色', 'Color', 'Couleur', 'カラー', 'Farbe'],
  ['帽子', 'Hat', 'Chapeau', '帽子', 'Hut'],
  ['衣服', 'Clothes', 'Vêtement', '服', 'Kleidung'],
  ['眼镜', 'Glasses', 'Lunettes', 'メガネ', 'Brille'],
  ['圆框眼镜', 'Round Glasses', 'Lunettes rondes', '丸メガネ', 'Runde Brille'],
  ['墨镜', 'Sunglasses', 'Lunettes de soleil', 'サングラス', 'Sonnenbrille'],
  ['护目镜', 'Goggles', 'Lunettes de protection', 'ゴーグル', 'Schutzbrille'],
  ['无', 'None', 'Aucun', 'なし', 'Keine'],
  // 制作组
  ['制作组', 'Credits', 'Crédits', 'スタッフ', 'Mitwirkende'],
  ['游戏开发', 'Game Development', 'Développement du jeu', 'ゲーム開発', 'Spielentwicklung'],
  ['美术与视觉设计', 'Art & Visual Design', 'Art & design visuel', 'アート＆ビジュアルデザイン', 'Kunst & visuelles Design'],
  ['首席执行官', 'Chief Executive Officer', 'Président-directeur général', '最高経営責任者', 'Geschäftsführer'],
  ['吉祥物', 'Mascot', 'Mascotte', 'マスコット', 'Maskottchen'],
  ['支持与改进', 'Support & Improvements', 'Support & améliorations', 'サポート＆改善', 'Support & Verbesserungen'],
  // 登录/身份选择
  ['登录', 'Sign in', 'Connexion', 'ログイン', 'Anmelden'],
  ['请选择身份', 'Choose who you are', 'Choisissez votre profil', '身份を選んでください', 'Profil wählen'],
  ['账号登录 / 注册', 'Account login / register', 'Connexion / inscription', 'アカウント ログイン / 登録', 'Konto anmelden / registrieren'],
  ['账号登录', 'Account login', 'Connexion', 'アカウントログイン', 'Konto anmelden'],
  ['注册账号', 'Register account', 'Inscription', 'アカウント登録', 'Konto registrieren'],
  ['用户名', 'Username', 'Nom d\'utilisateur', 'ユーザー名', 'Benutzername'],
  ['注册', 'Register', 'S\'inscrire', '登録', 'Registrieren'],
  ['返回', 'Back', 'Retour', '戻る', 'Zurück'],
  ['已登录：', 'Signed in: ', 'Connecté : ', 'ログイン中：', 'Angemeldet: '],
  ['用户名至少 2 个字符', 'Username needs 2+ characters', 'Nom d\'utilisateur : 2+ caractères', 'ユーザー名は2文字以上', 'Benutzername mind. 2 Zeichen'],
  ['用户名已存在', 'Username already exists', 'Nom d\'utilisateur déjà utilisé', 'ユーザー名は既に存在します', 'Benutzername existiert bereits'],
  ['注册成功：', 'Registered: ', 'Inscrit : ', '登録成功：', 'Registriert: '],
  ['用户名不存在', 'Username not found', 'Nom d\'utilisateur introuvable', 'ユーザー名が見つかりません', 'Benutzername nicht gefunden'],
  ['欢迎回来：', 'Welcome back: ', 'Bon retour : ', 'おかえりなさい：', 'Willkommen zurück: '],
  ['退出登录', 'Log out', 'Déconnexion', 'ログアウト', 'Abmelden'],
  ['已退出登录', 'Logged out', 'Déconnecté', 'ログアウトしました', 'Abgemeldet'],
  ['兑换码', 'Redeem code', 'Code', 'コード', 'Code'],
  ['可选', 'optional', 'facultatif', '任意', 'optional'],
  ['编辑器已解锁', 'Editor unlocked', 'Éditeur débloqué', 'エディター解放済み', 'Editor freigeschaltet'],
  ['注册 / 登录账号 · 输入兑换码', 'Register / login · enter redeem code', 'Inscription / connexion · entrer le code', '登録 / ログイン · コード入力', 'Registrieren / anmelden · Code eingeben'],
  ['输入兑换码', 'Enter redeem code', 'Entrer le code', 'コードを入力', 'Code eingeben'],
  ['小学学生', 'Student', 'Élève', '小学生', 'Schüler'],
  ['学生', 'Student', 'Élève', '学生', 'Schüler'],
  ['游客', 'Guest', 'Invité', 'ゲスト', 'Gast'],
  ['解锁关卡编辑器 · 不保存进度', 'Unlock level editor · no progress saved', 'Débloque l\'éditeur · progression non sauvegardée', 'エディター解放 · 進捗は保存されない', 'Editor freischalten · Fortschritt nicht gespeichert'],
  ['正常游戏 · 保存进度', 'Normal game · saves progress', 'Jeu normal · progression sauvegardée', '通常プレイ · セーブあり', 'Normales Spiel · Fortschritt gespeichert'],
  // 编辑器分类
  ['地形', 'Terrain', 'Terrain', '地形', 'Gelände'],
  ['物品', 'Items', 'Objets', 'アイテム', 'Gegenstände'],
  ['敌人', 'Enemies', 'Ennemis', '敵', 'Gegner'],
  ['特殊', 'Special', 'Spécial', '特殊', 'Spezial'],
  // 编辑器方块
  ['空', 'Empty', 'Vide', '空白', 'Leer'],
  ['草地', 'Grass', 'Herbe', '草地', 'Gras'],
  ['泥土', 'Dirt', 'Terre', '土', 'Erde'],
  ['石板', 'Stone', 'Pierre', '石板', 'Stein'],
  ['冰面', 'Ice', 'Glace', '氷', 'Eis'],
  ['泥地', 'Mud', 'Boue', '泥', 'Schlamm'],
  ['沙地', 'Sand', 'Sable', '砂', 'Sand'],
  ['木台', 'Wood', 'Bois', '木', 'Holz'],
  ['金台', 'Metal', 'Métal', '金属', 'Metall'],
  ['斜坡↗', 'Slope ↗', 'Pente ↗', '坂道↗', 'Rampe ↗'],
  ['斜坡↖', 'Slope ↖', 'Pente ↖', '坂道↖', 'Rampe ↖'],
  ['圆坡↗', 'Curve ↗', 'Courbe ↗', '曲線↗', 'Kurve ↗'],
  ['圆坡↖', 'Curve ↖', 'Courbe ↖', '曲線↖', 'Kurve ↖'],
  ['破墙', 'Breakable', 'Cassable', '壊せる壁', 'Zerbrechlich'],
  ['假墙', 'Fake wall', 'Faux mur', '偽の壁', 'Falsche Wand'],
  ['单向→', 'One-way →', 'Sens unique →', '一方通行→', 'Einbahn →'],
  ['单向←', 'One-way ←', 'Sens unique ←', '一方通行←', 'Einbahn ←'],
  ['木板', 'Plank', 'Planche', '板', 'Brett'],
  ['大箱', 'Big box', 'Grande caisse', '大箱', 'Große Kiste'],
  ['石球', 'Boulder', 'Rocher', '岩', 'Felsbrocken'],
  ['跷跷板', 'Seesaw', 'Bascule', 'シーソー', 'Wippe'],
  ['压钮', 'Button', 'Bouton', 'ボタン', 'Knopf'],
  ['拉杆', 'Lever', 'Levier', 'レバー', 'Hebel'],
  ['传送带', 'Conveyor', 'Tapis', 'ベルト', 'Förderband'],
  ['电梯', 'Elevator', 'Ascenseur', 'エレベーター', 'Aufzug'],
  ['摆锤', 'Pendulum', 'Pendule', '振り子', 'Pendel'],
  ['风扇', 'Fan', 'Ventilateur', 'ファン', 'Ventilator'],
  ['碎台', 'Fragile', 'Fragile', '壊れる台', 'Zerbrechliche Plattform'],
  ['锯片', 'Saw', 'Scie', 'ノコギリ', 'Säge'],
  ['爆炸桶', 'TNT', 'TNT', '爆弾', 'Sprengstoff'],
  ['钥匙', 'Key', 'Clé', '鍵', 'Schlüssel'],
  ['绳索', 'Rope', 'Corde', 'ロープ', 'Seil'],
  ['链条', 'Chain', 'Chaîne', '鎖', 'Kette'],
  ['转台', 'Rotator', 'Rotateur', '回転台', 'Rotator'],
  ['矿车', 'Minecart', 'Wagonnet', 'トロッコ', 'Lore'],
  ['宽木板', 'Wide plank', 'Large planche', '広い板', 'Breites Brett'],
  ['星星', 'Star', 'Étoile', '星', 'Stern'],
  ['弹簧', 'Spring', 'Ressort', 'バネ', 'Feder'],
  ['大炮', 'Cannon', 'Canon', '大砲', 'Kanone'],
  ['小怪', 'Walker', 'Marcheur', '歩く敵', 'Läufer'],
  ['牛角', 'Horned', 'Cornu', '角付き', 'Gehörnt'],
  ['快怪', 'Fast', 'Rapide', '速い敵', 'Schnell'],
  ['跳怪', 'Jumper', 'Sauteur', '跳ねる敵', 'Springer'],
  ['刺怪', 'Spiky', 'Épineux', 'トゲ付き', 'Stachlig'],
  ['甲怪', 'Armored', 'Blindé', '装甲', 'Gepanzert'],
  ['巨怪', 'Large', 'Grand', '大型', 'Groß'],
  ['冲怪', 'Charger', 'Fonceur', '突進', 'Stürmer'],
  ['追怪', 'Tracker', 'Pisteur', '追跡', 'Verfolger'],
  ['推箱', 'Pusher', 'Pousseur', '押し手', 'Schieber'],
  ['射弹', 'Shooter', 'Tireur', '射手', 'Schütze'],
  ['飞怪', 'Flyer', 'Volant', '飛ぶ敵', 'Flieger'],
  ['炮塔', 'Turret', 'Tourelle', 'タレット', 'Geschützturm'],
  ['炸怪', 'Bomber', 'Bombardier', '爆撃', 'Bomber'],
  ['无敌怪', 'Invincible', 'Invincible', '無敵の敵', 'Unbesiegbar'],
  ['机关怪', 'Machine', 'Machine', '機械', 'Maschine'],
  ['尖刺', 'Spike', 'Piquant', 'トゲ', 'Stachel'],
  ['火焰', 'Flame', 'Flamme', '炎', 'Flamme'],
  ['齿轮', 'Gear', 'Engrenage', '歯車', 'Zahnrad'],
  ['水', 'Water', 'Eau', '水', 'Wasser'],
  ['旗子', 'Flag', 'Drapeau', '旗', 'Flagge'],
  ['出生', 'Spawn', 'Départ', 'スタート', 'Start'],
  ['复活点', 'Checkpoint', 'Point de contrôle', 'チェックポイント', 'Kontrollpunkt'],
  ['平台', 'Platform', 'Plateforme', '足場', 'Plattform'],
  ['终点', 'Target', 'Cible', 'ゴール', 'Ziel'],
  ['机关', 'Switch', 'Interrupteur', 'スイッチ', 'Schalter'],
  ['门', 'Door', 'Porte', 'ドア', 'Tür'],
  ['魔王', 'BOSS', 'BOSS', 'ボス', 'BOSS'],
  // 剧情
  ['序章 · 红球出发', 'Prologue · Red Ball Sets Off', 'Prologue · Le départ de la bille rouge', '序章 · レッドボール出発', 'Prolog · Der rote Ball bricht auf'],
  ['太阳被方块魔王偷走了，世界失去了颜色。', 'The Square Demon Lord stole the sun, and the world lost its color.', 'Le Seigneur Démon Carré a volé le soleil, et le monde a perdu ses couleurs.', 'ブロック魔王が太陽を盗み、世界は色を失った。', 'Der Würfel-Dämonenlord stahl die Sonne, und die Welt verlor ihre Farbe.'],
  ['勇敢的红球滚过起伏的草原，', 'The brave red ball rolls across the rolling grassland,', 'La courageuse bille rouge roule sur la prairie vallonnée,', '勇敢なレッドボールは起伏する草原を転がり、', 'Der tapfere rote Ball rollt über das hügelige Grasland,'],
  ['收集散落的星星，夺回光明！', 'collecting scattered stars to bring back the light!', 'ramassant les étoiles dispersées pour ramener la lumière !', '散らばった星を集めて、光を取り戻す！', 'sammelt verstreute Sterne, um das Licht zurückzuholen!'],
  ['第二章 · 草原机关', 'Chapter 2 · Grassland Contraptions', 'Chapitre 2 · Les mécanismes de la prairie', '第二章 · 草原の仕掛け', 'Kapitel 2 · Mechanismen im Grasland'],
  ['草原深处藏满了古老的机关。', 'The depths of the grassland hide ancient contraptions.', 'Les profondeurs de la prairie cachent d\'anciens mécanismes.', '草原の奥には古い仕掛けが隠されている。', 'Die Tiefen des Graslands bergen uralte Mechanismen.'],
  ['会移动的平台、向上弹射的大炮，', 'Moving platforms, cannons that launch you upward,', 'Des plateformes mobiles, des canons qui vous propulsent vers le haut,', '動く足場、上へ弾き飛ばす大砲、', 'Bewegliche Plattformen, Kanonen, die dich hochschleudern,'],
  ['还有定时喷火的陷阱，务必小心！', 'and traps that spit fire on a timer — be careful!', 'et des pièges cracheurs de feu à minuterie — attention !', 'そして定期的に火を吹く罠、気をつけて！', 'und Fallen, die auf Zeit Feuer speien — sei vorsichtig!'],
  ['第三章 · 山路起伏', 'Chapter 3 · Rolling Mountain Paths', 'Chapitre 3 · Chemins de montagne vallonnés', '第三章 · 起伏する山道', 'Kapitel 3 · Hügelige Bergpfade'],
  ['草原尽头是连绵起伏的丘陵。', 'Beyond the grassland lie rolling hills.', 'Au-delà de la prairie s\'étendent des collines vallonnées.', '草原の果てには起伏する丘陵が広がる。', 'Jenseits des Graslands liegen sanfte Hügel.'],
  ['尖刺与火焰机关遍布，', 'Spikes and flame traps are everywhere,', 'Les piquants et les pièges de feu sont partout,', 'トゲと炎の仕掛けが至るところにあり、', 'Stacheln und Flammenfallen sind überall,'],
  ['魔王的宫殿就在最高的山丘之后……', 'and the Demon Lord\'s palace lies beyond the highest hill…', 'et le palais du Seigneur Démon se dresse derrière la plus haute colline…', '魔王の宮殿は最も高い丘の向こうにある……', 'und der Palast des Dämonenlords liegt hinter dem höchsten Hügel…'],
  ['草原终章 · 魔王之战', 'Grassland Finale · Demon Lord Battle', 'Finale de la prairie · Combat du Seigneur Démon', '草原最終章 · 魔王戦', 'Grasland-Finale · Kampf gegen den Dämonenlord'],
  ['方块魔王现身了！', 'The Square Demon Lord appears!', 'Le Seigneur Démon Carré apparaît !', 'ブロック魔王が現れた！', 'Der Würfel-Dämonenlord erscheint!'],
  ['踩在它头上五次，', 'Stomp on its head five times,', 'Écrasez-lui la tête cinq fois,', '頭を5回踏みつけ、', 'Spring ihm fünfmal auf den Kopf,'],
  ['把它彻底击败，夺回太阳！', 'defeat it completely, and reclaim the sun!', 'battez-le complètement et reprenez le soleil !', '完全に倒して、太陽を取り戻せ！', 'besiege es vollständig und hole die Sonne zurück!'],
  ['第二章 · 森林篇', 'Chapter 2 · The Forest', 'Chapitre 2 · La forêt', '第二章 · 森の編', 'Kapitel 2 · Der Wald'],
  ['草原的尽头，是一片幽深的森林。', 'Beyond the grassland lies a deep, dark forest.', 'Au-delà de la prairie s\'étend une forêt profonde et sombre.', '草原の果てには、深く暗い森が広がる。', 'Jenseits des Graslands liegt ein tiefer, dunkler Wald.'],
  ['树冠遮天蔽日，藤蔓与密林交错，', 'The canopy blocks the sky, and vines weave through the dense woods,', 'La canopée cache le ciel, et les lianes s\'entrelacent dans la forêt dense,', '木々の冠が空を覆い、ツタと密林が交錯し、', 'Das Blätterdach verdeckt den Himmel, und Ranken durchziehen den dichten Wald,'],
  ['红球滚进了这绿色的迷宫……', 'as the red ball rolls into this green maze…', 'tandis que la bille rouge roule dans ce labyrinthe vert…', 'レッドボールはこの緑の迷宮へ転がり込む……', 'während der rote Ball in dieses grüne Labyrinth rollt…'],
  ['森林终章 · 魔王之战', 'Forest Finale · Demon Lord Battle', 'Finale de la forêt · Combat du Seigneur Démon', '森の最終章 · 魔王戦', 'Wald-Finale · Kampf gegen den Dämonenlord'],
  ['森林魔王现身了！', 'The Forest Demon Lord appears!', 'Le Seigneur Démon de la forêt apparaît !', '森の魔王が現れた！', 'Der Wald-Dämonenlord erscheint!'],
  ['黄眼时踩它头顶五次，把它彻底击败！', 'Stomp its head five times when its eye is yellow to defeat it!', 'Écrasez-lui la tête cinq fois quand son œil est jaune pour le vaincre !', '目が黄色のときに頭を5回踏んで、完全に倒せ！', 'Spring ihm fünfmal auf den Kopf, wenn sein Auge gelb ist, um es zu besiegen!'],
  ['第三章 · 峡谷篇', 'Chapter 3 · The Canyon', 'Chapitre 3 · Le canyon', '第三章 · 峡谷の編', 'Kapitel 3 · Die Schlucht'],
  ['穿过森林，是万丈深渊的峡谷。', 'Past the forest lies a bottomless canyon.', 'Après la forêt s\'étend un canyon insondable.', '森を抜けると、深い谷の峡谷が広がる。', 'Hinter dem Wald liegt eine bodenlose Schlucht.'],
  ['红球要在移动平台间飞跃，', 'The red ball must leap between moving platforms,', 'La bille rouge doit sauter entre des plateformes mobiles,', 'レッドボールは動く足場の間を飛び越え、', 'Der rote Ball muss zwischen beweglichen Plattformen springen,'],
  ['小心别掉进峡谷！', 'so don\'t fall into the canyon!', 'alors ne tombez pas dans le canyon !', '峡谷に落ちないように！', 'also fall nicht in die Schlucht!'],
  ['峡谷终章 · 魔王之战', 'Canyon Finale · Demon Lord Battle', 'Finale du canyon · Combat du Seigneur Démon', '峡谷の最終章 · 魔王戦', 'Schlucht-Finale · Kampf gegen den Dämonenlord'],
  ['峡谷魔王现身了！', 'The Canyon Demon Lord appears!', 'Le Seigneur Démon du canyon apparaît !', '峡谷の魔王が現れた！', 'Der Schlucht-Dämonenlord erscheint!'],
  ['第四章 · 矿井篇', 'Chapter 4 · The Mine', 'Chapitre 4 · La mine', '第四章 · 鉱山の編', 'Kapitel 4 · Die Mine'],
  ['峡谷之下，是黑暗的矿井。', 'Beneath the canyon lies a dark mine.', 'Sous le canyon se trouve une mine sombre.', '峡谷の下には、暗い鉱山がある。', 'Unter der Schlucht liegt eine dunkle Mine.'],
  ['火焰与齿轮机关遍布，', 'Flames and gear traps are everywhere,', 'Les flammes et les engrenages sont partout,', '炎と歯車の仕掛けが至るところにあり、', 'Flammen- und Zahnradfallen sind überall,'],
  ['红球小心翼翼地深入矿洞……', 'as the red ball cautiously descends into the mine…', 'tandis que la bille rouge s\'enfonce prudemment dans la mine…', 'レッドボールは慎重に鉱山の奥へ進む……', 'während der rote Ball vorsichtig in die Mine hinabsteigt…'],
  ['矿井终章 · 魔王之战', 'Mine Finale · Demon Lord Battle', 'Finale de la mine · Combat du Seigneur Démon', '鉱山の最終章 · 魔王戦', 'Minen-Finale · Kampf gegen den Dämonenlord'],
  ['矿井魔王现身了！', 'The Mine Demon Lord appears!', 'Le Seigneur Démon de la mine apparaît !', '鉱山の魔王が現れた！', 'Der Minen-Dämonenlord erscheint!'],
  ['终章 · 宇宙篇', 'Final Chapter · Outer Space', 'Chapitre final · L\'espace', '最終章 · 宇宙編', 'Letztes Kapitel · Das Weltall'],
  ['冲破地面，红球飞向了宇宙。', 'Breaking through the ground, the red ball flies into space.', 'Perçant le sol, la bille rouge s\'envole vers l\'espace.', '地面を突き破り、レッドボールは宇宙へ飛び立つ。', 'Durch den Boden brechend fliegt der rote Ball ins Weltall.'],
  ['在星辰之间跳跃，', 'Leaping among the stars,', 'Sautant parmi les étoiles,', '星々の間を跳び、', 'Zwischen den Sternen springend,'],
  ['找到最后的魔王！', 'find the final Demon Lord!', 'trouvez le dernier Seigneur Démon !', '最後の魔王を見つけろ！', 'finde den letzten Dämonenlord!'],
  ['最终决战 · 宇宙魔王', 'Final Battle · The Space Demon Lord', 'Bataille finale · Le Seigneur Démon de l\'espace', '最終決戦 · 宇宙魔王', 'Letzte Schlacht · Der Weltraum-Dämonenlord'],
  ['宇宙魔王现身了！这是最后的战斗，', 'The Space Demon Lord appears! This is the final battle,', 'Le Seigneur Démon de l\'espace apparaît ! C\'est la bataille finale,', '宇宙魔王が現れた！これが最後の戦い、', 'Der Weltraum-Dämonenlord erscheint! Dies ist die letzte Schlacht,'],
  ['黄眼时踩它头顶五次，夺回太阳！', 'stomp its head five times when its eye is yellow to reclaim the sun!', 'écrasez-lui la tête cinq fois quand son œil est jaune pour reprendre le soleil !', '目が黄色のときに頭を5回踏んで、太陽を取り戻せ！', 'spring ihm fünfmal auf den Kopf, wenn sein Auge gelb ist, und hole die Sonne zurück!'],
  ['结局 · 光明重现', 'Ending · The Light Returns', 'Fin · Le retour de la lumière', '結末 · 光の復活', 'Ende · Das Licht kehrt zurück'],
  ['红球战胜了魔王！', 'The red ball has defeated the Demon Lord!', 'La bille rouge a vaincu le Seigneur Démon !', 'レッドボールは魔王を倒した！', 'Der rote Ball hat den Dämonenlord besiegt!'],
  ['太阳重新升起，星星回到天上，世界恢复了颜色。', 'The sun rises again, the stars return to the sky, and the world regains its color.', 'Le soleil se lève à nouveau, les étoiles reviennent au ciel et le monde retrouve ses couleurs.', '太陽は再び昇り、星は空に戻り、世界は色を取り戻した。', 'Die Sonne geht wieder auf, die Sterne kehren an den Himmel zurück, und die Welt gewinnt ihre Farbe wieder.'],
  ['而红球的冒险，才刚刚开始……', 'And the red ball\'s adventure has only just begun…', 'Et l\'aventure de la bille rouge ne fait que commencer…', 'そしてレッドボールの冒険は、まだ始まったばかり……', 'Und das Abenteuer des roten Balls hat gerade erst begonnen…'],
  // 教程
  ['🎓 新手教程', '🎓 Tutorial', '🎓 Tutoriel', '🎓 チュートリアル', '🎓 Tutorial'],
  ['← → 或 A / D：左右滚动', '← → or A / D: roll left and right', '← → ou A / D : rouler à gauche et à droite', '← → または A / D：左右に転がる', '← → oder A / D: nach links und rechts rollen'],
  ['空格 / ↑ / W：跳跃（按住跳得更高）', 'Space / ↑ / W: jump (hold to jump higher)', 'Espace / ↑ / W : sauter (maintenir pour sauter plus haut)', 'スペース / ↑ / W：ジャンプ（長押しでより高く）', 'Leertaste / ↑ / W: springen (halten für höhere Sprünge)'],
  ['R：重开本关 · M / Esc：返回主菜单 · I：设置', 'R: restart level · M / Esc: back to menu · I: settings', 'R : recommencer le niveau · M / Échap : retour au menu · I : réglages', 'R：リスタート · M / Esc：メニューに戻る · I：設定', 'R: Level neu starten · M / Esc: zurück zum Menü · I: Einstellungen'],
  ['收集 ⭐ 星星，躲开尖刺、火焰、水面和敌人', 'Collect ⭐ stars, and avoid spikes, flames, water and enemies', 'Ramassez les étoiles ⭐ et évitez les piquants, les flammes, l\'eau et les ennemis', '⭐の星を集め、トゲ・炎・水面・敵を避けよう', 'Sammle ⭐ Sterne und weiche Stacheln, Flammen, Wasser und Gegnern aus'],
  ['碰到绿色复活点 🏳 后，失败会从那里重生', 'Touch a green 🏳 checkpoint to respawn there after failing', 'Touchez un 🏳 point de contrôle vert pour y réapparaître après un échec', '緑の🏳チェックポイントに触れると、失敗時にそこから復活する', 'Berühre einen grünen 🏳 Kontrollpunkt, um dort neu zu erscheinen'],
  ['踩在敌人头顶可以消灭它，到达 🚩 旗帜即可过关！', 'Stomp an enemy\'s head to defeat it, and reach the 🚩 flag to clear the level!', 'Écrasez la tête d\'un ennemi pour le vaincre, et atteignez le 🚩 drapeau pour terminer le niveau !', '敵の頭を踏めば倒せる。🚩の旗に着けばクリア！', 'Spring einem Gegner auf den Kopf, um ihn zu besiegen, und erreiche die 🚩 Flagge, um das Level zu schaffen!'],
  ['1 格高的小台阶会自动跳上，高墙和 Boss 要手动跳', '1-tile steps are auto-jumped; jump manually over tall walls & bosses', 'Les marches de 1 case se passent toutes seules ; sautez les murs hauts et les boss', '1マスの小段差は自動ジャンプ、高い壁やボスは手動でジャンプ', '1-Feld-Stufen werden automatisch genommen; hohe Wände & Bosse manuell springen'],
  ['收集 ⭐ 星星，躲开尖刺、火焰、水面（进水即死）和敌人', 'Collect ⭐ stars, avoid spikes, flames, water (instant death) & enemies', 'Ramassez les ⭐, évitez piques, flammes, eau (mort instantanée) et ennemis', '⭐を集め、トゲ・炎・水面（入水即死）・敵を避けよう', 'Sammle ⭐ Sterne, weiche Stacheln, Flammen, Wasser (sofortiger Tod) & Gegnern aus'],
  ['踩敌人头顶可消灭它；到 🚩 过关，失败从 🏳 复活', 'Stomp enemies to defeat them; reach 🚩 to win, respawn at 🏳', 'Écrasez les ennemis pour les vaincre ; atteignez 🚩 pour gagner, respawn au 🏳', '敵の頭を踏んで倒す；🚩でクリア、失敗したら🏳から復活', 'Auf Feinde springen zum Besiegen; 🚩 erreichen, Respawn am 🏳'],
  ['R 重开 · M 菜单 · I 设置 · F 全屏 · Q 显示鼠标', 'R restart · M menu · I settings · F fullscreen · Q show cursor', 'R recommencer · M menu · I réglages · F plein écran · Q curseur', 'R リスタート · M メニュー · I 設定 · F 全画面 · Q カーソル表示', 'R neu · M Menü · I Einstellungen · F Vollbild · Q Cursor'],
  // 关卡提示（第一章）
  ['移动与跳跃：← → 滚动，空格/↑ 跳跃，收集 ⭐ 到 🚩', 'Move and jump: ← → to roll, Space/↑ to jump, collect ⭐ to reach 🚩', 'Déplacement et saut : ← → pour rouler, Espace/↑ pour sauter, ramassez ⭐ pour atteindre 🚩', '移動とジャンプ：← →で転がり、スペース/↑でジャンプ、⭐を集めて🚩へ', 'Bewegen & Springen: ← → rollen, Leertaste/↑ springen, ⭐ sammeln bis 🚩'],
  ['新机关·大炮 🚀：踩上去会被弹到高空，翻越高墙！', 'New gadget: Cannon 🚀 — step on it to launch high over walls!', 'Nouveau gadget : Canon 🚀 — montez dessus pour être projeté au-dessus des murs !', '新仕掛け・大砲🚀：乗ると高く打ち上げられ、壁を越える！', 'Neues Gadget: Kanone 🚀 — draufstellen und über Wände geschleudert werden!'],
  ['新机关·火焰 🔥：它会定时喷火，看准节奏再通过。', 'New gadget: Flame 🔥 — it spits fire on a timer; time your pass carefully.', 'Nouveau gadget : Flamme 🔥 — elle crache du feu en rythme ; attendez le bon moment.', '新仕掛け・炎🔥：定期的に火を吹く。タイミングを見て通ろう。', 'Neues Gadget: Flamme 🔥 — sie speit getaktet Feuer; passiere im richtigen Moment.'],
  ['新机关·移动平台：站上去，它会带你飞过深渊。', 'New gadget: Moving platform — stand on it to ride over the abyss.', 'Nouveau gadget : Plateforme mobile — montez dessus pour traverser l\'abîme.', '新仕掛け・動く足場：乗ると深い谷を越えてくれる。', 'Neues Gadget: Bewegliche Plattform — draufstellen und über den Abgrund fahren.'],
  ['丘陵起伏，多利用弹簧，小心别滚落悬崖。', 'Rolling hills — use springs well, and don\'t roll off the cliffs.', 'Des collines vallonnées — utilisez bien les ressorts et ne tombez pas des falaises.', '丘陵が起伏している。バネを活用し、崖から落ちないように。', 'Hügelige Landschaft — nutze Federn gut und stürz nicht von den Klippen.'],
  ['双炮齐鸣：两门大炮接连弹射，连跳两次越过障碍！', 'Double cannons: two cannons launch you in a row — bounce twice to clear the obstacles!', 'Double canon : deux canons vous propulsent à la suite — rebondissez deux fois !', '二連大砲：2門の大砲で連続ジャンプ、2回跳ねて障害物を越えろ！', 'Doppelkanone: zwei Kanonen schleudern dich nacheinander — spring zweimal über die Hindernisse!'],
  ['新机关·尖刺 ⚠️：碰到会掉血，务必跳过。', 'New gadget: Spike ⚠️ — touching it costs a heart; jump over it.', 'Nouveau gadget : Piquant ⚠️ — le toucher coûte un cœur ; sautez par-dessus.', '新仕掛け・トゲ⚠️：触れるとダメージ。必ず飛び越えよう。', 'Neues Gadget: Stachel ⚠️ — Berühren kostet ein Herz; spring drüber.'],
  ['火焰 + 炮台组合来袭，眼疾手快！', 'Flames + turrets are coming — be quick!', 'Flammes + tourelles arrivent — soyez rapide !', '炎＋タレットの組み合わせが来る。素早く！', 'Flammen + Türme kommen — sei schnell!'],
  ['悬崖、尖刺、火焰环环相扣，步步为营。', 'Cliffs, spikes and flames in sequence — advance step by step.', 'Falaises, piquants et flammes s\'enchaînent — avancez prudemment.', '崖・トゲ・炎が連続する。一歩ずつ慎重に。', 'Klippen, Stacheln und Flammen in Folge — geh Schritt für Schritt vor.'],
  ['山路蜿蜒曲折，控制好速度，别冲太快。', 'The mountain path winds and twists — control your speed, don\'t rush.', 'Le chemin de montagne serpente — contrôlez votre vitesse, n\'allez pas trop vite.', '山道は曲がりくねっている。速度を抑え、突っ込みすぎないように。', 'Der Bergpfad windet sich — kontrolliere dein Tempo, rase nicht.'],
  ['机关走廊布满尖刺与火焰，先观察再行动。', 'The contraption corridor is full of spikes and flames — observe first, then move.', 'Le couloir à mécanismes est plein de piquants et de flammes — observez avant d\'agir.', '仕掛けの回廊はトゲと炎だらけ。まず観察してから動こう。', 'Der Mechanismus-Korridor ist voller Stacheln und Flammen — erst beobachten, dann handeln.'],
  ['峰回路转，善用弹簧和大炮翻越地形。', 'The path twists and turns — use springs and cannons to cross the terrain.', 'Le chemin tourne et retourne — utilisez ressorts et canons pour traverser.', '道は山あり谷あり。バネと大砲を駆使して地形を越えよう。', 'Der Weg schlängelt sich — nutze Federn und Kanonen, um das Gelände zu queren.'],
  ['火焰迷宫岔路多，跟着 ⭐ 星星走就不会迷路。', 'The flame maze has many forks — follow the ⭐ stars to avoid getting lost.', 'Le labyrinthe de flammes a beaucoup d\'embranchements — suivez les ⭐ étoiles.', '炎の迷路は分かれ道が多い。⭐の星を追えば迷わない。', 'Das Flammenlabyrinth hat viele Abzweige — folge den ⭐ Sternen.'],
  ['最终试炼：所有机关齐上阵，沉着应对！', 'Final trial: every gadget at once — stay calm!', 'Épreuve finale : tous les gadgets à la fois — restez calme !', '最終試練：全仕掛けが登場。冷静に対処せよ！', 'Letzte Prüfung: alle Gadgets auf einmal — bleib ruhig!'],
  ['Boss 战！魔王会横冲直撞，踩它头顶 5 次即可获胜。', 'Boss fight! The Demon Lord charges wildly — stomp its head 5 times to win.', 'Combat de boss ! Le Seigneur Démon fonce — écrasez-lui la tête 5 fois pour gagner.', 'ボス戦！魔王は暴れ回る。頭を5回踏めば勝ち。', 'Bosskampf! Der Dämonenlord rast wild umher — spring ihm 5× auf den Kopf.'],
  // 篇章名 + 风味
  ['草原', 'Grassland', 'Prairie', '草原', 'Grasland'],
  ['森林', 'Forest', 'Forêt', '森', 'Wald'],
  ['峡谷', 'Canyon', 'Canyon', '峡谷', 'Schlucht'],
  ['矿井', 'Mine', 'Mine', '鉱山', 'Mine'],
  ['宇宙', 'Space', 'Espace', '宇宙', 'Weltall'],
  ['藤蔓与密林之间，善用弹簧翻越树冠。', 'Among the vines and woods, use springs to leap over the canopy.', 'Parmi les lianes et les bois, utilisez les ressorts pour franchir la canopée.', 'ツタと密林の間、バネを活用して木の冠を越えよう。', 'Zwischen Ranken und Wald nutzt du Federn, um übers Blätterdach zu springen.'],
  ['峡谷深渊遍布，把握移动平台与跳跃节奏。', 'The canyon abyss is everywhere — master the moving platforms and jump timing.', 'L\'abîme du canyon est partout — maîtrisez les plateformes mobiles et le rythme des sauts.', '峡谷の深い谷が至るところにある。動く足場とジャンプのタイミングを掴もう。', 'Die Schlucht ist voller Abgründe — meistere die beweglichen Plattformen und das Sprung-Timing.'],
  ['黑暗矿井机关重重，留意火焰与坠落的齿轮。', 'The dark mine is full of contraptions — watch for flames and falling gears.', 'La mine sombre regorge de mécanismes — attention aux flammes et engrenages qui tombent.', '暗い鉱山は仕掛けだらけ。炎と落ちてくる歯車に注意。', 'Die dunkle Mine ist voller Mechanismen — achte auf Flammen und fallende Zahnräder.'],
  ['失重宇宙中，大炮会把你送上遥远的星空。', 'In the weightless void, cannons will launch you to distant stars.', 'Dans l\'espace en apesanteur, les canons vous propulsent vers les étoiles lointaines.', '無重力の宇宙では、大砲があなたを遠い星空へ送り出す。', 'In der schwerelosen Leere schleudern dich Kanonen zu fernen Sternen.'],
  ['滚动跳跃，收集星星，一路向前！', 'Roll, jump, collect stars, and keep moving forward!', 'Roulez, sautez, ramassez les étoiles et avancez toujours !', '転がり、跳び、星を集めて、前へ進もう！', 'Rolle, springe, sammle Sterne und halte vorwärts!'],
  // 关卡名模板
  ['{0}篇 · 第 {1} 关', '{0} · Level {1}', '{0} · Niveau {1}', '{0}編 · 第{1}关', '{0} · Level {1}'],
  ['Boss 战！{0}魔王横冲直撞，黄眼时踩它头顶 5 次即可获胜。', 'Boss fight! The {0} Demon Lord charges — stomp its head 5 times when its eye is yellow to win.', 'Combat de boss ! Le Seigneur Démon {0} fonce — écrasez-lui la tête 5 fois quand son œil est jaune.', 'ボス戦！{0}の魔王は暴れ回る。目が黄色のときに頭を5回踏めば勝ち。', 'Bosskampf! Der {0}-Dämonenlord rast umher — spring ihm 5× auf den Kopf, wenn sein Auge gelb ist.'],
  ['欢迎来到{0}篇章！{1}', 'Welcome to the {0} chapter! {1}', 'Bienvenue dans le chapitre {0} ! {1}', '{0}編へようこそ！{1}', 'Willkommen im Kapitel {0}! {1}'],
  ['{0}第 {1} 关：{2}', '{0} Level {1}: {2}', '{0} Niveau {1} : {2}', '{0} 第{1}关：{2}', '{0} Level {1}: {2}'],
  // 手绘关卡名（第一章）
  ['第 1 关 · 草原起步', 'Level 1 · Grassland Start', 'Niveau 1 · Départ dans la prairie', '第1关 · 草原のスタート', 'Level 1 · Grasland-Start'],
  ['第 2 关 · 第一门大炮', 'Level 2 · The First Cannon', 'Niveau 2 · Le premier canon', '第2关 · 最初の大砲', 'Level 2 · Die erste Kanone'],
  ['第 3 关 · 小心火焰', 'Level 3 · Mind the Flames', 'Niveau 3 · Attention aux flammes', '第3关 · 炎に注意', 'Level 3 · Achtung Flammen'],
  ['第 4 关 · 移动平台', 'Level 4 · Moving Platforms', 'Niveau 4 · Plateformes mobiles', '第4关 · 動く足場', 'Level 4 · Bewegliche Plattformen'],
  ['第 5 关 · 起伏丘陵', 'Level 5 · Rolling Hills', 'Niveau 5 · Collines vallonnées', '第5关 · 起伏する丘', 'Level 5 · Sanfte Hügel'],
  ['第 6 关 · 双炮齐鸣', 'Level 6 · Double Cannons', 'Niveau 6 · Double canon', '第6关 · 二連大砲', 'Level 6 · Doppelkanone'],
  ['第 7 关 · 机关重重', 'Level 7 · Contraption Chaos', 'Niveau 7 · Mécanismes en pagaille', '第7关 · 仕掛けだらけ', 'Level 7 · Mechanismus-Chaos'],
  ['第 8 关 · 火与炮', 'Level 8 · Fire and Cannons', 'Niveau 8 · Feu et canons', '第8关 · 炎と大砲', 'Level 8 · Feuer und Kanonen'],
  ['第 9 关 · 险象环生', 'Level 9 · Close Calls', 'Niveau 9 · Situations périlleuses', '第9关 · 危機一髪', 'Level 9 · Knappe Kiste'],
  ['第 10 关 · 山路十八弯', 'Level 10 · Winding Road', 'Niveau 10 · Route sinueuse', '第10关 · 曲がりくねった山道', 'Level 10 · Kurvenreiche Straße'],
  ['第 11 关 · 机关走廊', 'Level 11 · Contraption Corridor', 'Niveau 11 · Couloir à mécanismes', '第11关 · 仕掛けの回廊', 'Level 11 · Mechanismus-Korridor'],
  ['第 12 关 · 峰回路转', 'Level 12 · Twist and Turn', 'Niveau 12 · Tours et détours', '第12关 · 山あり谷あり', 'Level 12 · Hin und Zurück'],
  ['第 13 关 · 火焰迷宫', 'Level 13 · Flame Maze', 'Niveau 13 · Labyrinthe de flammes', '第13关 · 炎の迷路', 'Level 13 · Flammenlabyrinth'],
  ['第 14 关 · 最终试炼', 'Level 14 · Final Trial', 'Niveau 14 · Épreuve finale', '第14关 · 最終試練', 'Level 14 · Letzte Prüfung'],
  ['第 15 关 · 魔王之战', 'Level 15 · Demon Lord Battle', 'Niveau 15 · Combat du Seigneur Démon', '第15关 · 魔王戦', 'Level 15 · Kampf gegen den Dämonenlord'],
  // Boss 状态
  ['黄眼 · 踩头!', 'Yellow eye · Stomp!', 'Œil jaune · Écrasez !', '黄色の目・踏め！', 'Gelbes Auge · Spring drauf!'],
  ['危险!', 'Danger!', 'Danger !', '危険！', 'Gefahr!'],
  ['红眼 ', 'Red eye ', 'Œil rouge ', '赤い目 ', 'Rotes Auge '],
  // 新 Boss（第 2~5 章）
  ['钢铁压路机', 'Iron Crusher', 'Rouleau de Fer', 'アイアンクラッシャー', 'Eisenwalze'],
  ['熔岩机械臂', 'Lava Claw', 'Griffe de Lave', 'ラヴァクロー', 'Lavakralle'],
  ['机械蜘蛛', 'Spider-8', 'Araignée-8', 'スパイダー8', 'Spinne-8'],
  ['方块博士', 'Dr. Square', 'Dr. Carré', 'ドクター・スクエア', 'Dr. Quadrat'],
  ['压路机', 'Crusher', 'Rouleau', 'クラッシャー', 'Walze'],
  ['机械臂', 'Claw', 'Griffe', 'クロー', 'Kralle'],
  ['蜘蛛', 'Spider', 'Araignée', 'スパイダー', 'Spinne'],
  ['博士', 'Doctor', 'Docteur', 'ドクター', 'Doktor'],
  ['直接踩头! 小心召唤的小怪!', 'Stomp its head! Watch the minions!', 'Écrasez sa tête ! Attention aux sbires !', '頭を踏め！召喚される雑魚に注意！', 'Spring auf seinen Kopf! Achte auf die Schergen!'],
  ['冻结! 快踩核心!', 'Frozen! Stomp the core now!', 'Gelé ! Écrasez le noyau !', '凍結！今すぐコアを踏め！', 'Gefroren! Spring jetzt auf den Kern!'],
  ['踩按钮冻住机械臂!', 'Step on a button to freeze the arms!', 'Marchez sur un bouton pour geler les bras !', 'ボタンを踏んでアームを凍らせろ！', 'Tritt auf einen Knopf, um die Arme einzufrieren!'],
  ['直接踩头! 小心召唤的小蜘蛛!', 'Stomp its head! Watch the spiderlings!', 'Écrasez sa tête ! Attention aux bébés araignées !', '頭を踏め！召喚される子グモに注意！', 'Spring auf seinen Kopf! Achte auf die Spinnen!'],
  ['核心暴露! 踩它!', 'Core exposed! Stomp it!', 'Noyau exposé ! Écrasez-le !', 'コア露出！踏め！', 'Kern freigelegt! Spring drauf!'],
  ['躲导弹·等核心暴露', 'Dodge missiles · wait for the core', 'Esquivez les missiles · attendez le noyau', 'ミサイルを避け・コア露出を待つ', 'Weiche Raketen aus · warte auf den Kern'],
  ['追上去！别被甩掉！', 'Chase it! Don\'t fall behind!', 'Poursuivez-le ! Ne restez pas derrière !', '追いかけろ！遅れるな！', 'Verfolge ihn! Bleib nicht zurück!'],
  ['别被甩掉！', 'Don\'t fall behind!', 'Ne restez pas derrière !', '遅れるな！', 'Bleib nicht zurück!'],
  ['Boss：钢铁压路机！直接踩头击杀，小心它召唤的小怪！', 'Boss: Iron Crusher! Stomp its head, but watch out for the minions it summons!', 'Boss : Rouleau de Fer ! Écrasez sa tête, mais attention aux sbires !', 'ボス：アイアンクラッシャー！頭を踏んで倒せ、召喚される雑魚に注意！', 'Boss: Eisenwalze! Spring auf seinen Kopf, aber achte auf die Schergen!'],
  ['Boss：熔岩机械臂！踩按钮冻住机械臂，再跳上核心攻击！', 'Boss: Lava Claw! Step on the buttons to freeze its arms, then stomp the core!', 'Boss : Griffe de Lave ! Geler les bras puis écrasez le noyau !', 'ボス：ラヴァクロー！ボタンでアームを凍らせ、コアを踏め！', 'Boss: Lavakralle! Friere die Arme ein, dann spring auf den Kern!'],
  ['Boss：机械蜘蛛！直接踩头击杀，小心它召唤的小蜘蛛！', 'Boss: Spider-8! Stomp its head, but watch out for the spiderlings!', 'Boss : Araignée-8 ! Écrasez sa tête, mais attention aux bébés araignées !', 'ボス：スパイダー8！頭を踏んで倒せ、召喚される子グモに注意！', 'Boss: Spinne-8! Spring auf seinen Kopf, aber achte auf die Spinnen!'],
  ['最终Boss：方块博士！躲开导弹，等核心暴露时踩它！', 'Final Boss: Dr. Square! Dodge the missiles and stomp the core when exposed!', 'Boss final : Dr. Carré ! Esquivez les missiles et écrasez le noyau exposé !', '最終ボス：ドクター・スクエア！ミサイルを避け、コア露出時に踏め！', 'Endboss: Dr. Quadrat! Weiche Raketen aus und spring auf den Kern, wenn er freiliegt!'],
  // 新 Boss 剧情（第 2~5 章终章）
  ['森林终章 · 钢铁压路机', 'Forest Finale · Iron Crusher', 'Finale de la forêt · Rouleau de Fer', '森の最終章 · アイアンクラッシャー', 'Wald-Finale · Eisenwalze'],
  ['钢铁压路机现身了！', 'The Iron Crusher appears!', 'Le Rouleau de Fer apparaît !', 'アイアンクラッシャーが現れた！', 'Die Eisenwalze erscheint!'],
  ['直接踩头击杀它，小心它召唤的小怪！', 'Stomp its head to defeat it — watch for the minions it summons!', 'Écrasez sa tête pour le vaincre — gare aux sbires !', '頭を踏んで倒せ、召喚される雑魚に気をつけろ！', 'Spring auf seinen Kopf, um ihn zu besiegen — achte auf die Schergen!'],
  ['峡谷终章 · 熔岩机械臂', 'Canyon Finale · Lava Claw', 'Finale du canyon · Griffe de Lave', '峡谷の最終章 · ラヴァクロー', 'Schlucht-Finale · Lavakralle'],
  ['熔岩机械臂现身了！', 'The Lava Claw appears!', 'La Griffe de Lave apparaît !', 'ラヴァクローが現れた！', 'Die Lavakralle erscheint!'],
  ['踩按钮冻住机械臂，再跳上核心攻击！', 'Step on the buttons to freeze the arms, then stomp the core!', 'Geler les bras puis écrasez le noyau !', 'ボタンでアームを凍らせ、コアを踏め！', 'Friere die Arme ein, dann spring auf den Kern!'],
  ['矿井终章 · 机械蜘蛛', 'Mine Finale · Spider-8', 'Finale de la mine · Araignée-8', '鉱山の最終章 · スパイダー8', 'Minen-Finale · Spinne-8'],
  ['机械蜘蛛现身了！', 'Spider-8 appears!', 'Araignée-8 apparaît !', 'スパイダー8が現れた！', 'Spinne-8 erscheint!'],
  ['直接踩头击杀它，小心它召唤的小蜘蛛！', 'Stomp its head to defeat it — watch for the spiderlings!', 'Écrasez sa tête pour le vaincre — gare aux bébés araignées !', '頭を踏んで倒せ、召喚される子グモに気をつけろ！', 'Spring auf seinen Kopf, um ihn zu besiegen — achte auf die Spinnen!'],
  ['最终决战 · 方块博士', 'Final Battle · Dr. Square', 'Bataille finale · Dr. Carré', '最終決戦 · ドクター・スクエア', 'Letzte Schlacht · Dr. Quadrat'],
  ['方块博士驾驶巨型机器人现身了！', 'Dr. Square appears in a giant robot!', 'Dr. Carré apparaît dans un robot géant !', 'ドクター・スクエアが巨大ロボットで現れた！', 'Dr. Quadrat erscheint in einem Riesenroboter!'],
  ['躲开导弹，等核心暴露时踩它！', 'Dodge the missiles and stomp the core when exposed!', 'Esquivez les missiles et écrasez le noyau exposé !', 'ミサイルを避け、コア露出時に踏め！', 'Weiche Raketen aus und spring auf den Kern, wenn er freiliegt!'],
  // HUD
  ['无敌', 'Invincible', 'Invincible', '無敵', 'Unbesiegbar'],
  ['飞行', 'Flying', 'Vol', '飛行', 'Fliegen'],
  ['退出', 'Exit', 'Quitter', '退出', 'Verlassen'],
  ['设置', 'Settings', 'Paramètres', '設定', 'Einstellungen'],
  ['音乐', 'Music', 'Musique', '音楽', 'Musik'],
  ['音效', 'Sound FX', 'Effets sonores', '効果音', 'Soundeffekte'],
  ['重置默认', 'Reset Default', 'Réinitialiser', '初期化', 'Zurücksetzen'],
  ['重置进度', 'Reset Progress', 'Réinitialiser la progression', '進捗をリセット', 'Fortschritt zurücksetzen'],
  ['全屏', 'Fullscreen', 'Plein écran', '全画面', 'Vollbild'],
  ['使用旧版音乐', 'Use old music', 'Utiliser l\'ancienne musique', '旧バージョンの音楽を使用', 'Alte Musik verwenden'],
  ['音乐盒', 'Music Box', 'Boîte à musique', 'ミュージックボックス', 'Musikbox'],
  ['选择音乐文件', 'Choose music files', 'Choisir des fichiers audio', '音楽ファイルを選択', 'Musikdateien wählen'],
  ['已添加', 'Added', 'Ajouté', '追加しました', 'Hinzugefügt'],
  ['首音乐', 'song(s)', 'musique(s)', '曲', 'Titel'],
  ['从电脑选择音乐文件，点 ▶ 播放', 'Choose music files from your computer, click ▶ to play', 'Choisissez des fichiers audio, cliquez ▶ pour écouter', 'パソコンから音楽を選び、▶ で再生', 'Musikdateien vom Computer wählen, ▶ zum Abspielen'],
  ['还没有音乐', 'No music yet', 'Pas encore de musique', 'まだ音楽がありません', 'Noch keine Musik'],
  ['音乐由 Hamsger 制作', 'Music made by Hamsger', 'Musique de Hamsger', '音楽は Hamsger 制作', 'Musik von Hamsger'],
  ['进度已重置 · 从第 1 关重新开始', 'Progress reset · start from level 1', 'Progression réinitialisée · recommencer au niveau 1', '進捗をリセットしました · レベル1から再開', 'Fortschritt zurückgesetzt · ab Level 1 neu'],
  ['关闭', 'Close', 'Fermer', '閉じる', 'Schließen'],
  ['画质', 'Quality', 'Qualité', '画質', 'Qualität'],
  ['鼠标皮肤', 'Cursor Skin', 'Curseur', 'カーソルスキン', 'Cursor-Skin'],
  ['低', 'Low', 'Bas', '低', 'Niedrig'],
  ['中', 'Medium', 'Moyen', '中', 'Mittel'],
  ['高', 'High', 'Haut', '高', 'Hoch'],
  ['超高', 'Ultra', 'Ultra', '超高', 'Ultra'],
  ['滚动跳跃 · 收集星星 · 75 关冒险 · 五大篇章 · 击败魔王', 'Roll · Jump · Collect stars · 75 levels · Five chapters · Defeat the Demon Lord', 'Rouler · Sauter · Ramasser les étoiles · 75 niveaux · Cinq chapitres · Vaincre le Seigneur Démon', '転がる・跳ぶ・星を集める・75关の冒険・5つの編・魔王を倒す', 'Rollen · Springen · Sterne sammeln · 75 Level · Fünf Kapitel · Besiege den Dämonenlord'],
  ['皮肤：', 'Skin: ', 'Peau : ', 'スキン：', 'Skin: '],
  ['← → 或 A D 移动 · ↑/空格/W 跳跃 · R 重开 · M 菜单 · I 设置 · Q 鼠标 · F 全屏 · U 无敌 · G 飞行', '← → or A D move · ↑/Space/W jump · R restart · M menu · I settings · Q cursor · F fullscreen · U invincible · G fly', '← → ou A D se déplacer · ↑/Espace/W sauter · R recommencer · M menu · I réglages · Q curseur · F plein écran · U invincible · G voler', '← → / A D 移動 · ↑/スペース/W ジャンプ · R リスタート · M メニュー · I 設定 · Q カーソル · F 全画面 · U 無敵 · G 飛行', '← → oder A D bewegen · ↑/Leertaste/W springen · R neu · M Menü · I Einstellungen · Q Cursor · F Vollbild · U unbesiegbar · G fliegen'],
  ['🎓 教程', '🎓 Tutorial', '🎓 Tutoriel', '🎓 チュートリアル', '🎓 Tutorial'],
  // 过关 / 失败
  ['过关啦！', 'Level Cleared!', 'Niveau terminé !', 'クリア！', 'Level geschafft!'],
  ['收集星星  {0} / {1}', 'Stars  {0} / {1}', 'Étoiles  {0} / {1}', '星  {0} / {1}', 'Sterne  {0} / {1}'],
  ['下一关', 'Next Level', 'Niveau suivant', '次の关', 'Nächstes Level'],
  ['返回菜单', 'Back to Menu', 'Retour au menu', 'メニューに戻る', 'Zurück zum Menü'],
  ['游戏结束', 'Game Over', 'Partie terminée', 'ゲームオーバー', 'Spiel vorbei'],
  ['生命用完了，再试一次吧！', 'You ran out of lives — try again!', 'Vous n\'avez plus de vies — réessayez !', '残機が尽きた。もう一度挑戦！', 'Keine Leben mehr — versuch es erneut!'],
  ['重试本关', 'Retry Level', 'Recommencer', 'この关をリトライ', 'Level wiederholen'],
  ['按 空格 / 回车 继续', 'Press Space / Enter to continue', 'Appuyez sur Espace / Entrée pour continuer', 'スペース / Enter で続ける', 'Leertaste / Enter zum Fortfahren'],
  // 编辑器 / 自定义
  ['页 ', 'Page ', 'Page ', 'ページ ', 'Seite '],
  ['▶测试', '▶Test', '▶Tester', '▶テスト', '▶Test'],
  ['💾保存', '💾Save', '💾Enregistrer', '💾保存', '💾Speichern'],
  ['✏改名', '✏Rename', '✏Renommer', '✏名前変更', '✏Umbenennen'],
  ['📥载入', '📥Load', '📥Charger', '📥読み込み', '📥Laden'],
  ['🗑清空', '🗑Clear', '🗑Vider', '🗑クリア', '🗑Leeren'],
  ['⤴导出', '⤴Export', '⤴Exporter', '⤴エクスポート', '⤴Exportieren'],
  ['⤵导入', '⤵Import', '⤵Importer', '⤵インポート', '⤵Importieren'],
  ['←返回', '←Back', '←Retour', '←戻る', '←Zurück'],
  ['请先放置出生点 P！', 'Place a spawn point P first!', 'Placez d\'abord un point de départ P !', 'まずスタート地点 P を置いてください！', 'Setze zuerst einen Startpunkt P!'],
  ['✅ 已自动保存到主线「', '✅ Auto-saved to mainline "', '✅ Enregistré automatiquement dans la campagne « ', '✅ メインライン「', '✅ Automatisch gespeichert in "'],
  ['自定义关卡', 'Custom Level', 'Niveau personnalisé', 'カスタム关', 'Benutzerdefiniertes Level'],
  ['新的关卡名字：', 'New level name:', 'Nouveau nom de niveau :', '新しい关の名前：', 'Neuer Levelname:'],
  ['已改名为「', 'Renamed to "', 'Renommé en « ', '「', 'Umbenannt in "'],
  ['自定义关卡请在保存时起名（点 💾保存）', 'Name your custom level when saving (tap 💾Save)', 'Nommez votre niveau personnalisé à l\'enregistrement (💾Enregistrer)', 'カスタム关は保存時に名前をつけてください（💾保存）', 'Benenne dein Level beim Speichern (💾Speichern)'],
  ['请先放置出生点 P 再保存！', 'Place a spawn point P before saving!', 'Placez un point de départ P avant d\'enregistrer !', '保存する前にスタート地点 P を置いてください！', 'Setze einen Startpunkt P, bevor du speicherst!'],
  ['已保存为主线 ', 'Saved as mainline ', 'Enregistré dans la campagne ', 'メインラインとして保存：', 'Als Hauptlinie gespeichert '],
  ['（覆盖原关卡）', '(overwrites the original level)', '(écrase le niveau d\'origine)', '（元の关を上書き）', '(überschreibt das Original-Level)'],
  ['关卡名字：', 'Level name:', 'Nom du niveau :', '关の名前：', 'Levelname:'],
  ['我的关卡', 'My Levels', 'Mes niveaux', 'マイ关', 'Meine Level'],
  ['已保存「', 'Saved "', 'Enregistré « ', '「', 'Gespeichert "'],
  ['」→ 去“我的关卡”玩', '" → play it in "My Levels"', ' » → jouez-y dans « Mes niveaux »', '」→「マイ关」で遊ぶ', '" → spiele es unter „Meine Level“'],
  ['已载入 ', 'Loaded ', 'Chargé ', '読み込みました：', 'Geladen '],
  ['（编辑会自动保存到主线）', '(edits auto-save to the mainline)', '(les modifications s\'enregistrent automatiquement dans la campagne)', '（編集は自動でメインラインに保存されます）', '(Änderungen werden automatisch gespeichert)'],
  ['已复制关卡代码到剪贴板', 'Level code copied to clipboard', 'Code du niveau copié dans le presse-papiers', '关のコードをクリップボードにコピーしました', 'Level-Code in die Zwischenablage kopiert'],
  ['复制这段关卡代码：', 'Copy this level code:', 'Copiez ce code de niveau :', 'この关のコードをコピー：', 'Diesen Level-Code kopieren:'],
  ['粘贴关卡字符画（每行 ', 'Paste the level ASCII art (', 'Collez l\'art ASCII du niveau (', '关の文字絵を貼り付け（各行 ', 'Level-ASCII-Grafik einfügen ('],
  [' 字符）：', ' chars per line):', ' caractères par ligne) :', ' 文字）：', ' Zeichen pro Zeile):'],
  ['已导入', 'Imported', 'Importé', 'インポートしました', 'Importiert'],
  ['请输入兑换码解锁编辑器：', 'Enter the code to unlock the editor:', 'Entrez le code pour débloquer l\'éditeur :', 'エディター解放コードを入力：', 'Code zum Freischalten des Editors eingeben:'],
  ['兑换码错误', 'Wrong code', 'Code incorrect', 'コードが違います', 'Falscher Code'],
  ['🛠 地形编辑器', '🛠 Terrain Editor', '🛠 Éditeur de terrain', '🛠 地形エディター', '🛠 Gelände-Editor'],
  ['编辑：', 'Editing: ', 'Édition : ', '編集：', 'Bearbeiten: '],
  ['（自动保存到主线）', '(auto-saves to the mainline)', '(enregistré automatiquement dans la campagne)', '（自動でメインラインに保存）', '(speichert automatisch)'],
  ['当前：自定义关卡 —— 想覆盖主线，先点 📥载入 选一关', 'Now: custom level — to overwrite the mainline, tap 📥Load and pick a level', 'Actuel : niveau personnalisé — pour écraser la campagne, appuyez sur 📥Charger et choisissez', '現在：カスタム关 —— メインラインを上書きするには📥読み込みで关を選ぶ', 'Aktuell: benutzerdefiniertes Level — zum Überschreiben 📥Laden und Level wählen'],
  ['滚轮/拖动滚动条横向浏览 · 左键拖动放置 · 右键擦除 · 只填空气/泥土、不覆盖草 · 记得放 P(出生) 和 F(旗子)', 'Scroll/drag to pan · left-drag to place · right-click to erase · only fills air/dirt, never grass · place P (spawn) and F (flag)', 'Molette/glisser pour parcourir · clic gauche pour placer · clic droit pour effacer · remplit seulement l\'air/la terre · placez P (départ) et F (drapeau)', 'ホイール/ドラッグで横移動 · 左ドラッグで配置 · 右クリックで消去 · 空気/土のみ · P(スタート)とF(旗)を置く', 'Scrollen/ziehen zum Verschieben · links ziehen zum Platzieren · rechts klicken zum Löschen · füllt nur Luft/Erde · P (Start) und F (Flagge) setzen'],
  ['还没有保存的关卡，去「🛠 关卡编辑器」做一个吧！', 'No saved levels yet — make one in the "🛠 Level Editor"!', 'Aucun niveau enregistré — créez-en un dans « 🛠 Éditeur » !', '保存された关がありません。「🛠 关エディター」で作ろう！', 'Noch keine Level gespeichert — erstelle eines im „🛠 Level-Editor“!'],
  ['▶玩', '▶Play', '▶Jouer', '▶プレイ', '▶Spielen'],
  ['✕删', '✕Delete', '✕Supprimer', '✕削除', '✕Löschen'],
  ['← 返回', '← Back', '← Retour', '← 戻る', '← Zurück'],
  ['选择要编辑的关卡', 'Choose a level to edit', 'Choisissez un niveau à modifier', '編集する关を選択', 'Level zum Bearbeiten wählen'],
  ['点一关载入编辑器（覆盖主线）· 或 ✨新建空白 做自定义关卡', 'Tap a level to load it into the editor (overwrites mainline) · or ✨New Blank for a custom level', 'Touchez un niveau pour le charger dans l\'éditeur (écrase la campagne) · ou ✨Nouveau vierge', '关をタップしてエディターへ（メインライン上書き）· または✨新規空白でカスタム关', 'Tippe ein Level zum Laden (überschreibt Hauptlinie) · oder ✨Neues Leeres für ein eigenes Level'],
  ['✨ 新建空白', '✨ New Blank', '✨ Nouveau vierge', '✨ 新規空白', '✨ Neues Leeres'],
  ['📦 导出游戏文件', '📦 Export Game File', '📦 Exporter le fichier de jeu', '📦 ゲームファイルをエクスポート', '📦 Spieldatei exportieren'],
  ['↺ 重置全部', '↺ Reset All', '↺ Tout réinitialiser', '↺ 全てリセット', '↺ Alles zurücksetzen'],
  ['确定要还原所有主线关卡的修改吗？此操作不可撤销。', 'Restore all mainline levels to their originals? This cannot be undone.', 'Restaurer tous les niveaux de la campagne ? Action irréversible.', '全メインライン关の変更を元に戻しますか？この操作は取り消せません。', 'Alle Hauptlinien-Level wiederherstellen? Das kann nicht rückgängig gemacht werden.'],
  ['已还原所有主线关卡', 'All mainline levels restored', 'Tous les niveaux de la campagne restaurés', '全メインライン关を復元しました', 'Alle Hauptlinien-Level wiederhergestellt'],
  ['导出失败：找不到关卡数据', 'Export failed: no level data found', 'Échec de l\'export : aucune donnée de niveau', 'エクスポート失敗：关データが見つかりません', 'Export fehlgeschlagen: keine Level-Daten'],
  ['已导出 index.html —— 用它覆盖服务器上的文件，你的关卡就成主线了', 'Exported index.html — overwrite the file on the server with it, and your level becomes mainline', 'index.html exporté — écrasez le fichier du serveur avec pour en faire votre campagne', 'index.html をエクスポートしました。サーバーのファイルを上書きすればメインラインになります', 'index.html exportiert — überschreibe damit die Server-Datei, und dein Level wird zur Hauptlinie'],
  ['下载失败：', 'Download failed: ', 'Échec du téléchargement : ', 'ダウンロード失敗：', 'Download fehlgeschlagen: '],
  ['🛠 关卡编辑器', '🛠 Level Editor', '🛠 Éditeur de niveaux', '🛠 关エディター', '🛠 Level-Editor'],
  ['▶ 我的关卡', '▶ My Levels', '▶ Mes niveaux', '▶ マイ关', '▶ Meine Level'],
  ['开始冒险', 'Start Adventure', 'Commencer l\'aventure', '冒険を始める', 'Abenteuer starten'],
  ['回到标题', 'Back to Title', 'Retour au titre', 'タイトルへ戻る', 'Zurück zum Titel'],
  ['开始游戏', 'Start Game', 'Commencer', 'ゲーム開始', 'Spiel starten'],
  ['无敌模式 ON', 'Invincible ON', 'Invincible ACTIVÉ', '無敵モード ON', 'Unbesiegbar AN'],
  ['无敌模式 OFF', 'Invincible OFF', 'Invincible DÉSACTIVÉ', '無敵モード OFF', 'Unbesiegbar AUS'],
  ['飞行模式 ON（方向键/WASD 上下左右飞）', 'Fly mode ON (arrow keys/WASD to fly)', 'Mode vol ACTIVÉ (flèches/WASD pour voler)', '飛行モード ON（方向キー/WASDで飛ぶ）', 'Flugmodus AN (Pfeiltasten/WASD zum Fliegen)'],
  ['飞行模式 OFF', 'Fly mode OFF', 'Mode vol DÉSACTIVÉ', '飛行モード OFF', 'Flugmodus AUS'],
  ['导出失败：请通过 http:// 访问（file:// 不行）', 'Export failed: access via http:// (file:// won\'t work)', 'Échec de l\'export : accédez via http:// (file:// ne fonctionne pas)', 'エクスポート失敗：http:// でアクセスしてください（file:// では不可）', 'Export fehlgeschlagen: bitte über http:// zugreifen (file:// funktioniert nicht)'],
  ['← → 或 A D 移动 · ↑/空格/W 跳跃 · R 重开 · M 菜单 · U 无敌 · G 飞行', '← → or A D move · ↑/Space/W jump · R restart · M menu · U invincible · G fly', '← → ou A D se déplacer · ↑/Espace/W sauter · R recommencer · M menu · U invincible · G voler', '← → / A D 移動 · ↑/スペース/W ジャンプ · R リスタート · M メニュー · U 無敵 · G 飛行', '← → oder A D bewegen · ↑/Leertaste/W springen · R neu · M Menü · U unbesiegbar · G fliegen'],
  ['✎编辑', '✎Edit', '✎Modifier', '✎編集', '✎Bearbeiten'],
  ['」', '"', ' »', '」', '"'],
  ['」继续编辑', '" · continue editing', ' » · continuer à modifier', '」· 編集を続ける', '" · weiter bearbeiten'],
  ['已载入「', 'Loaded "', 'Chargé « ', '読み込みました：「', 'Geladen "'],
  ['当前：自定义关卡「', 'Now: custom level "', 'Actuel : niveau personnalisé « ', '現在：カスタム关「', 'Aktuell: benutzerdefiniertes Level "'],
];
const I18N = { en: {}, fr: {}, ja: {}, de: {} };
for (const r of I18N_ROWS) { I18N.en[r[0]] = r[1]; I18N.fr[r[0]] = r[2]; I18N.ja[r[0]] = r[3]; I18N.de[r[0]] = r[4]; }
function t(key, ...args) {
  let s = key;
  if (LANG !== 'zh') s = (I18N[LANG] && I18N[LANG][key]) || key;
  for (let i = 0; i < args.length; i++) s = s.split('{' + i + '}').join(String(args[i]));
  return s;
}
function setLang(code) {
  if (!LANGS.some(l => l.code === code)) code = 'en';
  LANG = code;
  try { localStorage.setItem('rb_lang', code); } catch (e) {}
}
function langName(code) { const l = LANGS.find(x => x.code === code); return l ? l.name : 'English'; }
function cycleLang() { const i = LANGS.findIndex(x => x.code === LANG); setLang(LANGS[(i + 1) % LANGS.length].code); }
function langPicked() { try { return localStorage.getItem('rb_lang') != null; } catch (e) { return false; } }
LANG = 'en';   // 每次进网站默认英语（忽略语言存档；标题栏仍可临时切换）

/* ============================ 存档 ============================ */
function loadProgress() {
  try {
    const s = parseInt(localStorage.getItem('rb_skin') || '0', 10);
    if (s >= 0 && s < SKINS.length) skinIndex = s;
    const h = parseInt(localStorage.getItem('rb_hat') || '0', 10);
    if (h >= 0 && h <= HATS.length) hatIndex = h;
    const c = parseInt(localStorage.getItem('rb_clothes') || '0', 10);
    if (c >= 0 && c <= CLOTHES.length) clothesIndex = c;
    const g = parseInt(localStorage.getItem('rb_glasses') || '0', 10);
    if (g >= 0 && g <= GLASSES.length) glassesIndex = g;
    maxUnlocked = parseInt(localStorage.getItem('rb_unlocked') || '1', 10);
    const bs = localStorage.getItem('rb_stars');
    bestStars = bs ? JSON.parse(bs) : [];
    const cs = localStorage.getItem('rb_custom');
    customLevels = cs ? JSON.parse(cs) : [];
    const ov = localStorage.getItem('rb_overrides');
    overrides = ov ? JSON.parse(ov) : {};
    const onm = localStorage.getItem('rb_override_names');
    overrideNames = onm ? JSON.parse(onm) : {};
    editorUnlocked = localStorage.getItem('rb_editor_unlocked') === '1';
    tutorialSeen = localStorage.getItem('rb_tut') === '1';
  } catch (e) {}
}
// 关卡编辑（覆盖主线/自定义关卡/改名/草稿）始终保存：学生模式只跳过「进度」存档
function saveCustomLevels() {
  try { localStorage.setItem('rb_custom', JSON.stringify(customLevels)); } catch (e) {}
  saveUserData();
}
function saveOverrides() {
  try { localStorage.setItem('rb_overrides', JSON.stringify(overrides)); } catch (e) {}
  saveUserData();
}
function saveOverrideNames() {
  try { localStorage.setItem('rb_override_names', JSON.stringify(overrideNames)); } catch (e) {}
  saveUserData();
}
function saveProgress() {
  if (noSave) return;
  try {
    localStorage.setItem('rb_skin', String(skinIndex));
    localStorage.setItem('rb_hat', String(hatIndex));
    localStorage.setItem('rb_clothes', String(clothesIndex));
    localStorage.setItem('rb_glasses', String(glassesIndex));
    localStorage.setItem('rb_unlocked', String(maxUnlocked));
    localStorage.setItem('rb_stars', JSON.stringify(bestStars));
  } catch (e) {}
  saveUserData();
}
loadProgress();

/* ============================ 账号系统（注册 / 登录） ============================ */
let accounts = {};          // 已注册用户名集合（无密码，本地存档）
let currentUser = null;     // 已登录用户名
let loginMode = 'none';     // 'none' | 'login' | 'register'
let loginUser = '';         // 输入中的用户名
let loginCode = '';         // 输入中的兑换码（解锁编辑器）
let loginField = 'user';    // 聚焦字段：'user' | 'code'
try { accounts = JSON.parse(localStorage.getItem('rb_accounts') || '{}'); } catch (e) { accounts = {}; }
try { currentUser = localStorage.getItem('rb_current_user') || null; } catch (e) { currentUser = null; }
function saveAccounts() { try { localStorage.setItem('rb_accounts', JSON.stringify(accounts)); } catch (e) {} }
function saveCurrentUser() { try { if (currentUser) localStorage.setItem('rb_current_user', currentUser); else localStorage.removeItem('rb_current_user'); } catch (e) {} }
// 每个账号一个“小库”：把语言/进度/外观/编辑/声音设置单独存到 accounts[name].data，
// 登录后载入，退出/关闭前保存，做到“这次是中文，下次进来还是中文”。
function saveUserData() {
  if (!currentUser) return;
  try {
    if (!accounts[currentUser] || typeof accounts[currentUser] !== 'object') accounts[currentUser] = {};
    accounts[currentUser].data = {
      lang: LANG,
      skin: skinIndex, hat: hatIndex, clothes: clothesIndex, glasses: glassesIndex,
      unlocked: maxUnlocked, stars: bestStars,
      custom: customLevels, overrides: overrides, overrideNames: overrideNames,
      editorUnlocked: editorUnlocked, tutorialSeen: tutorialSeen,
      musicMuted: musicMuted, sfxMuted: sfxMuted, musicVol: musicVol, sfxVol: sfxVol,
      quality: quality, oldmusic: useOldMusic
    };
    saveAccounts();
  } catch (e) {}
}
// 把当前会话状态重置为“新玩家”默认值（切换账号时避免串档）
function resetPlayerData() {
  LANG = 'en';
  skinIndex = 0; hatIndex = 0; clothesIndex = 0; glassesIndex = 0;
  maxUnlocked = 1; bestStars = [];
  customLevels = []; overrides = {}; overrideNames = {};
  editorUnlocked = false; tutorialSeen = false;
  musicMuted = false; sfxMuted = false; musicVol = 1.0; sfxVol = 1.0;
  quality = 'high'; useOldMusic = false;
  try {
    localStorage.removeItem('rb_lang');
    localStorage.removeItem('rb_skin'); localStorage.removeItem('rb_hat');
    localStorage.removeItem('rb_clothes'); localStorage.removeItem('rb_glasses');
    localStorage.removeItem('rb_unlocked'); localStorage.removeItem('rb_stars');
    localStorage.removeItem('rb_custom'); localStorage.removeItem('rb_overrides'); localStorage.removeItem('rb_override_names');
    localStorage.removeItem('rb_editor_unlocked'); localStorage.removeItem('rb_tut');
    localStorage.removeItem('rb_music'); localStorage.removeItem('rb_sfx');
    localStorage.removeItem('rb_music_vol'); localStorage.removeItem('rb_sfx_vol');
    localStorage.removeItem('rb_quality'); localStorage.removeItem('rb_oldmusic');
  } catch (e) {}
}
function loadUserData(name) {
  resetPlayerData();
  try {
    const a = accounts[name];
    const d = (a && typeof a === 'object') ? a.data : null;
    if (!d) return;
    if (d.lang && LANGS.some(l => l.code === d.lang)) { LANG = d.lang; try { localStorage.setItem('rb_lang', d.lang); } catch (e) {} }
    if (d.skin != null) skinIndex = d.skin;
    if (d.hat != null) hatIndex = d.hat;
    if (d.clothes != null) clothesIndex = d.clothes;
    if (d.glasses != null) glassesIndex = d.glasses;
    if (d.unlocked != null) maxUnlocked = d.unlocked;
    if (d.stars) bestStars = d.stars;
    if (d.custom) customLevels = d.custom;
    if (d.overrides) overrides = d.overrides;
    if (d.overrideNames) overrideNames = d.overrideNames;
    if (d.editorUnlocked != null) editorUnlocked = d.editorUnlocked;
    if (d.tutorialSeen != null) tutorialSeen = d.tutorialSeen;
    if (d.musicMuted != null) musicMuted = d.musicMuted;
    if (d.sfxMuted != null) sfxMuted = d.sfxMuted;
    if (d.musicVol != null) musicVol = d.musicVol;
    if (d.sfxVol != null) sfxVol = d.sfxVol;
    if (d.quality) quality = d.quality;
    if (d.oldmusic != null) useOldMusic = d.oldmusic;
  } catch (e) {}
}
function redeemCode() {
  if (loginCode.trim() === REDEEM_CODE) { editorUnlocked = true; try { localStorage.setItem('rb_editor_unlocked', '1'); } catch (e) {} return true; }
  return false;
}
function enterGame() { loginMode = 'none'; loginUser = ''; loginCode = ''; loginField = 'user'; if (!tutorialSeen) state = 'TUTORIAL'; else state = 'TITLE'; }
function registerAccount() {
  const u = loginUser.trim();
  if (u.length < 2) { flashMsg(t('用户名至少 2 个字符')); return; }
  if (accounts[u]) { flashMsg(t('用户名已存在')); return; }
  accounts[u] = {}; saveAccounts();
  currentUser = u; saveCurrentUser();
  loadUserData(u);
  const codeOk = redeemCode();
  flashMsg(codeOk ? (t('注册成功：') + u + ' · ' + t('编辑器已解锁')) : (t('注册成功：') + u));
  enterGame();
}
function loginAccount() {
  const u = loginUser.trim();
  if (!accounts[u]) { flashMsg(t('用户名不存在')); return; }
  currentUser = u; saveCurrentUser();
  loadUserData(u);
  const codeOk = redeemCode();
  flashMsg(codeOk ? (t('欢迎回来：') + u + ' · ' + t('编辑器已解锁')) : (t('欢迎回来：') + u));
  enterGame();
}
function logoutAccount() { saveUserData(); resetPlayerData(); currentUser = null; saveCurrentUser(); }

// 进入前：已登录则直接进标题（保持登录，除非 logout），否则选身份登录
state = (currentUser) ? 'TITLE' : 'LOGIN';

/* ============================ 音频（合成音效） ============================ */
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  return AC;
}
function beep(freq, dur, type, vol, slide) {
  if (sfxMuted) return;
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square';
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
  g.gain.value = (vol || 0.06) * sfxVol * 2.0;   // 音效整体放大 2 倍
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur);
}
const sfx = {
  jump() { beep(320, 0.18, 'square', 0.05, 620); },
  coin() { beep(880, 0.08, 'triangle', 0.07); setTimeout(() => beep(1320, 0.12, 'triangle', 0.06), 60); },
  hurt() { beep(220, 0.28, 'sawtooth', 0.07, 90); },
  stomp() { beep(200, 0.15, 'square', 0.07, 80); },
  spring() { beep(180, 0.25, 'sine', 0.08, 900); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.07), i * 130)); },
  over() { beep(300, 0.5, 'sawtooth', 0.06, 120); },
  checkpoint() { beep(660, 0.09, 'triangle', 0.07); setTimeout(() => beep(990, 0.14, 'triangle', 0.06), 70); },
  summon() { beep(180, 0.22, 'sawtooth', 0.06, 300); setTimeout(() => beep(140, 0.26, 'sawtooth', 0.06, 200), 120); },
  vuln() { beep(760, 0.09, 'triangle', 0.08); setTimeout(() => beep(1140, 0.14, 'triangle', 0.07), 80); },
  alert() { beep(980, 0.10, 'square', 0.08); setTimeout(() => beep(980, 0.10, 'square', 0.08), 160); setTimeout(() => beep(980, 0.10, 'square', 0.08), 320); },
  click() { beep(740, 0.06, 'square', 0.05, 520); },
  roll(speed) { const f = 80 + Math.min(1, Math.abs(speed) / 420) * 90; beep(f, 0.05, 'sine', 0.03, f * 0.6); },
  land(v) { const k = clamp(v / 900, 0.15, 0.7); beep(140, 0.07, 'sine', 0.02 + 0.05 * k, 70); },
  splash() { beep(700, 0.16, 'sine', 0.06, 240); setTimeout(() => beep(520, 0.14, 'sine', 0.05, 200), 40); },
  gurgle() { beep(300, 0.09, 'sine', 0.035, 140); },
  explode() { beep(95, 0.5, 'sawtooth', 0.09, 40); beep(60, 0.42, 'sine', 0.08, 30); },
};

/* ============================ 背景音乐（合成循环） ============================ */
let musicMuted = false;
try { musicMuted = localStorage.getItem('rb_music') === '1'; } catch (e) {}
let sfxMuted = false;
try { sfxMuted = localStorage.getItem('rb_sfx') === '1'; } catch (e) {}
let musicVol = 1.0, sfxVol = 1.0;
try { const v = parseFloat(localStorage.getItem('rb_music_vol')); if (isFinite(v) && v >= 0 && v <= 1) musicVol = v; } catch (e) {}
try { const v = parseFloat(localStorage.getItem('rb_sfx_vol')); if (isFinite(v) && v >= 0 && v <= 1) sfxVol = v; } catch (e) {}

let musicOn = false, musicTimer = null, musicGain = null, musicStep = 0, musicNextTime = 0;
const MUSIC_STEP = 0.24;
// 每段音乐：mel 旋律 / bass 低音 / arp 琶音（0 = 休止），各 32 步循环；
// 有 mel2/bass2/arp2 的主题会每 32 步在 A/B 段之间切换，避免单调
const MUSIC = {
  title: {
    // 主界面/登陆：方波太冲，整体调小音量（lead/bass/arp 都压低）
    leadVol: 0.02, bassVol: 0.042, arpVol: 0.013,
    mel:  [392,0,440,0,523,0,440,0, 349,0,392,0,440,523,587,0,  392,0,440,0,523,0,659,0, 587,0,523,0,440,0,392,0],
    bass: [98,0,110,0,131,0,110,0,  87,0,98,0,131,0,87,0,       98,0,110,0,131,0,110,0,  87,0,98,0,110,0,98,0],
    arp:  [0,392,0,523,0,440,0,523,  0,349,0,440,0,392,0,0,     0,392,0,523,0,659,0,523,  0,587,0,523,0,440,0,0],
    mel2:  [523,0,587,0,659,0,523,0, 587,0,659,0,784,0,659,0,  440,0,494,0,587,0,494,0, 440,0,392,0,440,0,0,0],
    bass2: [131,0,147,0,165,0,131,0, 147,0,165,0,196,0,165,0,  110,0,123,0,147,0,123,0, 110,0,98,0,110,0,0,0],
    arp2:  [0,523,0,587,0,659,0,523, 0,587,0,659,0,784,0,659,  0,440,0,494,0,587,0,494, 0,440,0,392,0,440,0,0],
  },
  grass: {
    // C大调 140BPM 4/4：木琴般短脆跳的主旋律 + 每小节一个和弦琶音 + 根五低音 + 鼓组
    step: 0.214, lead: 'triangle', leadVol: 0.045, decay: 0.6,
    mel:  [330,392,440,392,330,294,262,294, 330,392,523,494,440,392,330,0,  294,349,440,349,294,330,349,392, 440,392,330,294,262,0,392,0,
           330,392,440,494,523,494,440,392, 330,440,392,330,294,330,392,0,  349,440,523,440,392,330,294,330, 262,330,392,330,262,0,262,0],
    bass: [131,0,98,0,131,0,98,0, 110,0,165,0,110,0,165,0,  147,0,110,0,147,0,110,0, 98,0,147,0,98,0,147,0,
           131,0,98,0,131,0,98,0, 110,0,165,0,110,0,165,0,  87,0,131,0,87,0,131,0,  98,0,147,0,98,0,147,0],
    arp:  [523,0,659,0,784,0,659,0, 440,0,523,0,659,0,523,0,  587,0,698,0,880,0,698,0, 392,0,494,0,587,0,494,0,
           523,0,659,0,784,0,659,0, 440,0,523,0,659,0,523,0,  349,0,440,0,523,0,440,0,  392,0,494,0,587,0,494,0],
    drum: ['KHX','HX','SHX','HX','KHX','HX','SHX','HX'],
  },
  cave: {
    // D小调 104BPM 4/4：暗哑木琴主旋律(少音+回声) + 洞穴短Riff(含A大调C#拉力音) + 低重稀疏根五低音 + 水滴/风声 + 极简鼓组
    step: 0.288, lead: 'triangle', leadVol: 0.032, decay: 0.6, arpType: 'triangle', arpVol: 0.024,
    mel:  [294,349,440,392,349,294,262,0, 294,440,523,440,392,349,330,0, 349,440,466,440,392,349,294,262, 330,392,440,330,294,0,294,0,
           294,349,392,440,523,440,392,349, 330,392,349,294,262,294,349,0, 440,392,349,330,294,262,220,262, 294,349,440,349,294,0,294,0],
    bass: [73,0,0,0,110,0,0,0, 58,0,0,0,87,0,0,0, 65,0,0,0,98,0,0,0, 55,0,0,0,82,0,0,0,
           73,0,0,0,110,0,0,0, 87,0,0,0,131,0,0,0, 98,0,0,0,147,0,0,0, 55,0,0,0,82,0,0,0],
    arp:  [294,0,440,0,349,0,294,0, 262,0,392,0,330,0,262,0, 233,0,349,0,294,0,233,0, 220,0,330,0,277,0,220,0,
           294,0,440,0,349,0,294,0, 262,0,392,0,330,0,262,0, 233,0,349,0,294,0,233,0, 220,0,330,0,277,0,220,0],
    echo: [0,0,294,349,440,392,349,294, 262,0,294,440,523,440,392,349, 330,0,349,440,466,440,392,349, 294,262,330,392,440,330,294,0,
           294,0,294,349,392,440,523,440, 392,349,330,392,349,294,262,294, 349,0,440,392,349,330,294,262, 220,262,294,349,440,349,294,0],
    drip: [0,0,0,587,0,0,0,0, 0,0,0,0,880,0,0,0, 0,0,698,0,0,0,0,0, 0,0,0,1047,0,0,0,0, 0,0,0,587,0,0,880,0, 0,0,0,0,698,0,0,0, 0,0,0,0,1047,0,0,0, 0,0,0,587,0,0,0,0],
    wind: [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0],
    drum: ['KX','','X','','X','','KX','', 'KX','','X','','X','','KX','', 'KX','','X','','X','','KX','', 'KX','','X','','X','','KX','', 'KX','','X','','SX','','KX','', 'KX','','X','','SX','','KX','', 'KX','','X','','SX','','KX','', 'KX','','X','','SX','','KX',''],
  },
  forest: {
    // A小调 118BPM 4/4：木琴主旋律 + 长笛半拍回声 + 拨弦和弦琶音 + 根五低音 + 走路感鼓组(木鱼)
    step: 0.254, lead: 'triangle', leadVol: 0.036, decay: 0.5, arpType: 'triangle', arpVol: 0.022,
    mel:  [440,523,659,587,523,440,784,440, 523,659,784,659,587,523,440,0,  440,523,587,659,784,659,587,523, 494,587,784,698,659,0,659,0,
           440,523,659,784,880,784,659,587, 523,659,587,523,494,523,659,0,  587,698,880,784,659,587,523,494, 440,523,659,523,440,0,440,0],
    bass: [110,0,165,0,110,0,165,0, 87,0,131,0,87,0,131,0,  131,0,98,0,131,0,98,0,  98,0,147,0,98,0,147,0,
           110,0,165,0,110,0,165,0, 147,0,110,0,147,0,110,0,  165,0,123,0,165,0,123,0,  110,0,165,0,110,0,165,0],
    arp:  [440,0,523,0,659,0,523,0, 349,0,440,0,523,0,440,0,  523,0,659,0,784,0,659,0,  392,0,494,0,587,0,494,0,
           440,0,523,0,659,0,523,0, 587,0,698,0,880,0,698,0,  659,0,831,0,988,0,831,0,  440,0,523,0,659,0,523,0],
    echo: [0,0,0,0,0,0,440,784, 440,0,0,0,0,0,523,440,  0,0,0,0,0,0,659,587, 523,0,0,0,0,0,0,659,
           0,0,0,0,0,0,784,659, 587,0,0,0,0,0,523,659,  0,0,0,0,0,0,587,523, 494,0,0,0,0,0,0,440],
    drum: ['KH','H','SHW','KH','KH','H','SHW','HW'],
  },
  boss: {
    // E小调 150BPM 4/4：短狠冲的攻击性Pluck主旋律 + 低音弦乐Riff(含B大调D#紧张音) + 失真假Bass八分驱动 + 铜管Stab(BAAM!) + 大鼓Taiko + 重鼓组；血量≤50%转第二阶段(旋律升八度+暗合唱+鼓加倍)，≤20%狂暴(和弦压缩+高音Riff)
    step: 0.2, lead: 'square', leadVol: 0.038, decay: 0.32, leadAttack: 0.008,
    arpType: 'sawtooth', arpVol: 0.02, arpDur: 0.5, bassType: 'sawtooth', bassVol: 0.055, bassDur: 0.9,
    mel:  [330,392,494,440,392,370,330,294, 330,494,523,494,440,392,370,0, 330,392,440,494,587,523,494,440, 392,370,330,294,494,0,494,0,
           330,330,392,440,494,494,440,392, 370,440,523,494,440,392,330,0, 294,370,440,392,370,330,294,494, 330,392,494,392,330,0,330,0],
    bass: [82,82,82,82,82,82,82,82, 65,65,65,65,65,65,65,65, 73,73,73,73,73,73,73,73, 62,62,62,62,62,62,62,62,
           82,82,82,82,82,82,82,82, 49,49,49,49,49,49,49,49, 55,55,55,55,55,55,55,55, 62,62,62,62,62,62,62,62],
    arp:  [165,165,0,196,0,247,0,0, 165,165,0,220,0,196,0,0, 147,147,0,185,0,220,0,0, 123,123,0,156,0,185,0,0,
           165,165,0,196,0,247,0,0, 165,165,0,220,0,196,0,0, 147,147,0,185,0,220,0,0, 123,123,0,156,0,185,0,0],
    brass:[0,0,0,0,330,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,294,0,0,0, 0,0,0,0,0,0,0,0,
           0,0,0,0,262,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,247,0,0,0, 0,0,0,0,0,0,0,0],
    drum: ['KHT','H','KSH','KH','KH','H','KSH','KH', 'KH','H','KSH','KH','KH','H','KSH','KH', 'KHT','H','KSH','KH','KH','H','KSH','KH', 'KH','H','KSH','KH','KH','H','KSH','KH',
           'KHT','H','KSH','KH','KH','H','KSH','KH', 'KH','H','KSH','KH','KH','H','KSH','KH', 'KHT','H','KSH','KH','KH','H','KSH','KH', 'KH','H','KSH','KH','KH','H','KSH','KH'],
    mel2: [659,659,784,784,988,988,880,880, 784,784,740,740,659,659,587,587, 659,659,988,988,1175,1175,1047,1047, 988,988,880,880,784,784,740,740,
           659,659,784,784,988,988,880,880, 784,784,740,740,659,659,587,587, 659,659,988,988,1175,1175,1047,1047, 988,988,880,880,784,784,740,740],
    choir:[330,0,0,0,0,0,0,0, 262,0,0,0,0,0,0,0, 294,0,0,0,0,0,0,0, 247,0,0,0,0,0,0,0,
           330,0,0,0,0,0,0,0, 262,0,0,0,0,0,0,0, 294,0,0,0,0,0,0,0, 247,0,0,0,0,0,0,0],
    drum2:['KSHT','H','KSH','KH','KSH','H','KSH','KH', 'KSH','H','KSH','KH','KSH','H','KSH','KH', 'KSHT','H','KSH','KH','KSH','H','KSH','KH', 'KSH','H','KSH','KH','KSH','H','KSH','KH',
           'KSHT','H','KSH','KH','KSH','H','KSH','KH', 'KSH','H','KSH','KH','KSH','H','KSH','KH', 'KSHT','H','KSH','KH','KSH','H','KSH','KH', 'KSH','H','KSH','KH','KSH','H','KSH','KH'],
    mel3: [330,330,392,392,494,494,659,659, 294,294,494,494,392,392,330,330, 330,330,392,392,494,494,659,659, 311,311,494,494,370,370,311,311,
           330,330,392,392,494,494,659,659, 294,294,494,494,392,392,330,330, 330,330,392,392,494,494,659,659, 311,311,494,494,370,370,311,311],
    bass3:[82,82,82,82,82,82,82,82, 82,82,82,82,82,82,82,82, 73,73,73,73,73,73,73,73, 62,62,62,62,62,62,62,62,
           82,82,82,82,82,82,82,82, 82,82,82,82,82,82,82,82, 65,65,65,65,65,65,65,65, 62,62,62,62,62,62,62,62],
    arp3: [330,330,0,392,0,494,0,0, 330,330,0,440,0,392,0,0, 294,294,0,370,0,440,0,0, 247,247,0,311,0,370,0,0,
           330,330,0,392,0,494,0,0, 330,330,0,440,0,392,0,0, 294,294,0,370,0,440,0,0, 247,247,0,311,0,370,0,0],
    drum3:['KHT','KH','KSH','KH','KSH','KH','KSH','KH', 'KH','KH','KSH','KH','KSH','KH','KSH','KH', 'KHT','KH','KSH','KH','KSH','KH','KSH','KH', 'KH','KH','KSH','KH','KSH','KH','KSH','KH',
           'KHT','KH','KSH','KH','KSH','KH','KSH','KH', 'KH','KH','KSH','KH','KSH','KH','KSH','KH', 'KHT','KH','KSH','KH','KSH','KH','KSH','KH', 'KH','KH','KSH','KH','KSH','KH','KSH','KH'],
  },
  canyon: {
    // D小调 126BPM 4/4：干、短、有弹性的拨弦主旋律 + 恶地味吉他 Riff(含A大调C#紧张音) + 根五低音 + 风声/口哨点缀 + 鼓组(Kick/Snare/Hat/Woodblock/Claves)
    step: 0.238, lead: 'triangle', leadVol: 0.045, decay: 0.45, arpType: 'triangle', arpVol: 0.028,
    mel:  [294,349,392,440,349,294,262,294, 349,440,523,440,392,349,294,0, 294,349,440,392,349,330,294,262, 440,523,440,392,349,0,294,0,
           294,440,392,349,294,349,392,440, 523,440,392,349,330,294,262,0, 349,392,440,523,440,392,349,330, 294,349,440,349,294,0,294,0],
    bass: [147,0,110,0,147,0,110,0, 131,0,98,0,131,0,98,0, 117,0,87,0,117,0,87,0, 110,0,82,0,110,0,82,0,
           147,0,110,0,147,0,110,0, 87,0,131,0,87,0,131,0, 131,0,98,0,131,0,98,0, 110,0,82,0,110,0,82,0],
    arp:  [147,0,220,0,294,0,349,0, 147,0,220,0,262,0,220,0, 117,0,175,0,233,0,294,0, 110,0,165,0,220,0,277,0,
           147,0,220,0,294,0,349,0, 147,0,220,0,262,0,220,0, 117,0,175,0,233,0,294,0, 110,0,165,0,220,0,277,0],
    wind: [0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0],
    whistle: [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 880,0,784,0,698,0,587,0],
    drum: ['KH','HC','SH','HW','KH','HC','SHW','KH'],
  },
  space: {
    // E小调 92BPM 4/4：漂浮合成钟主旋律(慢attack+长延音+回声) + 八分音符轻琶音(ti-li-li) + Sub低音长音 + 钟/合唱二声部 + 星空ping/太空drone + 电子鼓(漂浮→危险)
    step: 0.326, lead: 'sine', leadVol: 0.040, decay: 0.95, leadAttack: 0.05, arpType: 'triangle', arpVol: 0.016, arpDur: 0.85, bassDur: 4.5,
    mel:  [330,392,494,440,392,330,294,0, 330,494,587,494,440,392,370,0, 392,494,659,587,494,440,392,0, 370,440,523,494,440,0,330,0,
           330,392,494,587,659,587,494,440, 392,494,440,392,370,330,294,0, 494,440,392,370,330,392,494,440, 330,494,392,330,330,0,330,0],
    bass: [82,0,0,0,0,0,0,0, 65,0,0,0,0,0,0,0, 49,0,0,0,0,0,0,0, 73,0,0,0,0,0,0,0,
           82,0,0,0,0,0,0,0, 65,0,0,0,0,0,0,0, 55,0,0,0,0,0,0,0, 62,0,0,0,0,0,0,0],
    arp:  [330,494,392,494,330,494,392,494, 262,392,330,392,262,392,330,392, 196,294,247,294,196,294,247,294, 294,440,370,440,294,440,370,440,
           330,494,392,494,330,494,392,494, 262,392,330,392,262,392,330,392, 220,330,262,330,220,330,262,330, 247,370,311,370,247,370,311,370],
    echo: [0,330,392,494,440,392,330,294, 0,330,494,587,494,440,392,370, 0,392,494,659,587,494,440,392, 0,370,440,523,494,440,0,330,
           0,330,392,494,587,659,587,494, 440,392,494,440,392,370,330,294, 0,494,440,392,370,330,392,494, 440,330,494,392,330,330,0,330],
    whistle: [988,0,0,0,880,0,0,0, 784,0,0,0,0,0,0,0, 659,0,0,0,784,0,0,0, 988,0,0,0,0,0,0,0,
              988,0,0,0,880,0,0,0, 784,0,0,0,0,0,0,0, 659,0,0,0,784,0,0,0, 988,0,0,0,0,0,0,0],
    wind: [1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
           1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0],
    drip: [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,1319,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,988,0,
           0,0,0,0,0,0,0,0, 0,0,0,0,0,0,784,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,1319,0],
    drum: ['KH','','SH','','H','','KSH','', 'KH','','SH','','H','','KSH','', 'KH','','SH','','H','','KSH','', 'KH','','SH','','H','','KSH','', 'KH','H','SH','KH','KH','H','SH','H', 'KH','H','SH','KH','KH','H','SH','H', 'KH','H','SH','KH','KH','H','SH','H', 'KH','H','SH','KH','KH','H','SH','H'],
  },
  story: {
    mel:  [523,0,587,0,659,0,587,0, 523,0,494,0,440,0,0,0,  494,0,523,0,587,0,659,0, 587,0,523,0,494,0,0,0],
    bass: [131,0,0,0,110,0,0,0, 98,0,0,0,131,0,0,0,  110,0,0,0,98,0,0,0, 131,0,0,0,98,0,0,0],
    arp:  [0,659,0,587,0,659,0,587, 0,523,0,494,0,440,0,0,  0,587,0,659,0,587,0,659, 0,587,0,523,0,494,0,0],
  },
  wardrobe: {
    // F大调 96BPM 4/4：轻钢琴/木琴主旋律 + pizzicato分解和弦 + 很轻的贝斯 + 室内轻鼓(手指snap/轻沙锤)——更衣室/赛前集合的友好+期待感
    step: 0.3125, lead: 'triangle', leadVol: 0.036, decay: 0.55, arpType: 'triangle', arpVol: 0.02, arpDur: 0.45, bassType: 'sine', bassVol: 0.045, bassDur: 1.5,
    mel:  [349,440,523,440,392,349,294,0, 349,392,440,523,440,392,349,0, 294,349,440,392,349,330,294,0, 262,330,392,349,330,262,349,0,
           349,440,523,587,523,440,392,349, 392,466,440,392,349,330,294,0, 262,349,440,392,349,330,294,262, 349,440,523,440,349,0,349,0],
    bass: [87,0,131,0,87,0,131,0, 65,0,98,0,65,0,98,0, 73,0,110,0,73,0,110,0, 58,0,87,0,58,0,87,0,
           87,0,131,0,87,0,131,0, 55,0,82,0,55,0,82,0, 49,0,73,0,49,0,73,0, 65,0,98,0,65,0,98,0],
    arp:  [349,0,440,0,523,0,440,0, 262,0,330,0,392,0,330,0, 294,0,349,0,440,0,349,0, 233,0,294,0,349,0,294,0,
           349,0,440,0,523,0,440,0, 220,0,262,0,330,0,262,0, 196,0,233,0,294,0,233,0, 262,0,330,0,392,0,330,0],
    drum: ['KH','HX','NH','HX','KH','HX','NH','HX'],
    motifs: { hero: [349,440,523], funny: [392,440,392,330], cool: [294,349,440,523], mysterious: [440,523,466,392] },
  },
  editor: {
    // C大调/A小调混合 105BPM 4/4：轻、短、干净的Marimba主旋律 + 1/8音符Soft Pluck琶音 + Round Bass稳定低音 + rimshot轻鼓 + 偶尔Bell UI小音型——关卡编辑器的循环耐听感
    step: 0.286, lead: 'triangle', leadVol: 0.03, decay: 0.4, arpType: 'triangle', arpVol: 0.014, arpDur: 0.4, bassType: 'sine', bassVol: 0.05, bassDur: 4.5,
    mel:  [262,330,392,440,392,330,294,330, 262,330,440,392,330,294,262,0, 440,523,659,587,523,440,392,440, 392,494,587,494,392,330,294,0,
           262,330,392,330,440,392,330,294, 349,440,523,440,392,330,262,0, 294,349,440,392,330,294,262,294, 262,330,392,330,262,0,262,0],
    arp:  [262,392,330,392,262,392,330,392, 220,330,262,330,220,330,262,330, 175,262,220,262,175,262,220,262, 196,294,247,294,196,294,247,294,
           262,392,330,392,262,392,330,392, 165,247,196,247,165,247,196,247, 147,220,175,220,147,220,175,220, 196,294,247,294,196,294,247,294],
    bass: [65,0,0,0,0,0,0,0, 55,0,0,0,0,0,0,0, 87,0,0,0,0,0,0,0, 49,0,0,0,0,0,0,0,
           65,0,0,0,0,0,0,0, 82,0,0,0,0,0,0,0, 73,0,0,0,0,0,0,0, 49,0,0,0,0,0,0,0],
    bell: [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 523,0,659,0,784,0,659,0, 0,0,0,0,0,0,0,0,
           587,0,698,0,880,0,698,0, 0,0,0,0,0,0,0,0, 659,0,784,0,988,0,784,0, 587,0,698,0,784,0,587,0],
    drum: ['KH','H','RH','H','KH','H','RH','H'],
  },
  credits: {
    mel:  [523,0,587,0,659,0,784,0, 880,0,784,0,659,0,587,0,  523,0,587,0,659,0,784,0, 880,0,1047,0,880,0,0,0],
    bass: [131,0,110,0,98,0,131,0, 110,0,131,0,98,0,110,0,  131,0,110,0,98,0,131,0, 110,0,98,0,131,0,0,0],
    arp:  [0,659,0,784,0,880,0,784, 0,1047,0,880,0,784,0,659,  0,659,0,784,0,880,0,784, 0,1047,0,1319,0,880,0,0],
  },
  complete: {
    mel:  [523,659,784,1047,880,784,659,523, 587,659,784,880,1047,880,784,659, 784,0,880,0,1047,0,1319,0, 1319,1047,880,784,659,523,0,0],
    bass: [131,0,98,0,131,0,98,0, 110,0,98,0,131,0,110,0, 131,0,110,0,98,0,131,0, 131,0,110,0,98,0,131,0],
    arp:  [0,659,0,784,0,880,0,1047, 0,659,0,784,0,880,0,1047, 0,880,0,1047,0,1319,0,1047, 0,1319,0,1047,0,880,0,0],
  },
  gameover: {
    mel:  [392,0,349,0,330,0,294,0, 262,0,294,0,330,0,349,0,  330,0,294,0,262,0,247,0, 220,0,247,0,262,0,0,0],
    bass: [98,0,0,0,87,0,0,0, 82,0,0,0,98,0,0,0, 87,0,0,0,82,0,0,0, 73,0,0,0,82,0,0,0],
    arp:  [0,349,0,330,0,294,0,262, 0,294,0,330,0,349,0,0, 0,330,0,294,0,262,0,247, 0,247,0,262,0,294,0,0],
  },
};
// 旧版合成音乐（本次修改之前的旋律），用于「使用旧版音乐」开关；只覆盖被改过的主题，其余沿用新版
const MUSIC_OLD = {
  grass: {
    mel:  [523,0,659,0,784,0,659,0, 880,0,784,0,659,0,523,0, 587,0,659,0,784,0,880,0, 1047,0,880,0,784,0,659,0],
    bass: [131,0,0,0,98,0,0,0, 196,0,0,0,131,0,0,0, 110,0,0,0,87,0,0,0, 98,0,0,0,131,0,0,0],
    arp:  [0,659,0,784,0,659,0,784, 0,880,0,784,0,659,0,0, 0,659,0,784,0,880,0,784, 0,1047,0,880,0,784,0,0],
    mel2: [659,0,587,0,523,0,587,0, 659,0,784,0,659,0,523,0, 880,0,784,0,659,0,784,0, 880,0,1047,0,880,0,0,0],
    bass2:[165,0,0,0,131,0,0,0, 165,0,0,0,131,0,0,0, 220,0,0,0,165,0,0,0, 220,0,0,0,165,0,0,0],
    arp2: [0,587,0,523,0,587,0,659, 0,784,0,659,0,587,0,523, 0,784,0,659,0,784,0,880, 0,1047,0,880,0,784,0,0],
  },
  forest: {
    mel:  [659,0,784,0,880,0,784,0, 1047,0,880,0,784,0,659,0, 587,0,659,0,784,0,880,0, 784,0,659,0,587,0,523,0],
    bass: [131,0,0,0,110,0,0,0, 87,0,0,0,131,0,0,0, 110,0,0,0,98,0,0,0, 131,0,0,0,110,0,0,0],
    arp:  [0,784,0,880,0,784,0,880, 0,1047,0,880,0,784,0,0, 0,659,0,784,0,880,0,784, 0,784,0,659,0,587,0,0],
  },
  canyon: {
    mel:  [330,0,392,0,330,0,294,0, 262,0,294,0,330,0,392,0, 440,0,392,0,330,0,294,0, 262,0,294,0,330,0,0,0],
    bass: [110,0,0,0,131,0,0,0, 98,0,0,0,110,0,0,0, 131,0,0,0,98,0,0,0, 110,0,0,0,98,0,0,0],
    arp:  [0,330,0,392,0,330,0,294, 0,262,0,294,0,330,0,392, 0,440,0,392,0,330,0,294, 0,262,0,330,0,392,0,0],
  },
  cave: {
    mel:  [220,0,262,0,294,0,262,0, 330,0,294,0,262,0,220,0, 196,0,220,0,262,0,294,0, 262,0,220,0,196,0,175,0],
    bass: [110,0,0,0,131,0,0,0, 98,0,0,0,110,0,0,0, 87,0,0,0,98,0,0,0, 82,0,0,0,87,0,0,0],
    arp:  [0,262,0,294,0,262,0,294, 0,330,0,294,0,262,0,0, 0,220,0,262,0,294,0,262, 0,294,0,262,0,220,0,0],
  },
  space: {
    mel:  [523,0,659,0,784,0,1047,0, 880,0,784,0,659,0,523,0, 587,0,659,0,784,0,880,0, 1047,0,880,0,784,0,0,0],
    bass: [131,0,0,0,196,0,0,0, 165,0,0,0,131,0,0,0, 147,0,0,0,165,0,0,0, 196,0,0,0,131,0,0,0],
    arp:  [0,784,0,1047,0,784,0,659, 0,880,0,1047,0,880,0,784, 0,659,0,784,0,880,0,1047, 0,1319,0,1047,0,880,0,0],
  },
  boss: {
    mel:  [175,0,185,0,196,0,0,0, 185,0,175,0,165,0,0,0, 175,0,185,0,196,0,0,0, 220,0,196,0,185,0,175,0],
    bass: [87,0,87,0,93,0,93,0, 87,0,87,0,82,0,82,0, 87,0,87,0,93,0,93,0, 110,0,98,0,93,0,87,0],
    arp:  [0,175,0,185,0,196,0,196, 0,185,0,175,0,165,0,0, 0,175,0,185,0,196,0,196, 0,220,0,196,0,185,0,0],
    mel2: [196,0,0,0,220,0,0,0, 233,0,0,0,220,0,196,0, 185,0,0,0,196,0,0,0, 233,0,220,0,196,0,185,0],
    bass2:[98,0,98,0,110,0,110,0, 116,0,116,0,110,0,98,0, 93,0,93,0,98,0,98,0, 116,0,110,0,98,0,93,0],
    arp2: [0,196,0,220,0,233,0,220, 0,196,0,220,0,196,0,185, 0,185,0,196,0,220,0,196, 0,233,0,220,0,196,0,0],
  },
  wardrobe: {
    mel:  [659,0,587,0,523,0,587,0, 659,0,0,0,587,0,0,0, 523,0,587,0,659,0,784,0, 659,0,587,0,523,0,0,0],
    bass: [131,0,0,0,98,0,0,0, 110,0,0,0,98,0,0,0, 131,0,0,0,98,0,0,0, 110,0,0,0,0,0,0,0],
  },
};
let useOldMusic = false;
try { useOldMusic = localStorage.getItem('rb_oldmusic') === '1'; } catch (e) {}
function setOldMusic(v) { useOldMusic = v; try { localStorage.setItem('rb_oldmusic', v ? '1' : '0'); } catch (e) {} }
// 已登录账号：载入其个人“小库”，实现“这次是中文，下次进来还是中文”
if (currentUser) loadUserData(currentUser);
window.addEventListener('beforeunload', saveUserData);
function getMusic(k) { return (useOldMusic && MUSIC_OLD[k]) || MUSIC[k] || MUSIC.title; }
let musicTheme = 'title';   // title | grass | cave | forest | boss | canyon | space | story | wardrobe | editor | credits | complete | gameover
let musicSection = 0;       // 0 = A 段, 1 = B 段（各主题的 mel2/bass2/arp2）

function currentMusicTheme() {
  if (state === 'CREDITS') return 'credits';
  if (state === 'WARDROBE') return 'wardrobe';
  if (state === 'COMPLETE') return 'complete';
  if (state === 'GAMEOVER') return 'gameover';
  if (state === 'STORY' || state === 'ENDING') return 'story';
  if (state === 'EDIT' || state === 'CUSTOM' || state === 'LOAD') return 'editor';
  if (state !== 'PLAY') return 'title';
  if (enemies.some(e => e.type === 'boss' && !e.dead)) return 'boss';
  if (theme === 'cave' || theme === 'mine') return 'cave';
  if (theme === 'forest') return 'forest';
  if (theme === 'canyon') return 'canyon';
  if (theme === 'space') return 'space';
  return 'grass';
}

function musicNote(freq, when, dur, type, vol, attack) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  const atk = (attack == null) ? 0.012 : attack;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + dur + 0.02);
}
// 鼓组：Kick / Snare / HiHat / Shaker（共享一段白噪声缓冲）
let noiseBuf = null;
function getNoise() {
  if (!AC || !AC.createBuffer || !AC.sampleRate) return null;
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.5), AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function kick(when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, when);
  o.frequency.exponentialRampToValueAtTime(45, when + 0.09);
  g.gain.setValueAtTime(0.2, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 0.14);
}
function snare(when) {
  if (!AC || !musicGain) return;
  const n = getNoise(); if (!n) return;
  const src = AC.createBufferSource(); src.buffer = n;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.12, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.11);
  src.connect(f); f.connect(g); g.connect(musicGain);
  src.start(when); src.stop(when + 0.13);
}
function hihat(when) {
  if (!AC || !musicGain) return;
  const n = getNoise(); if (!n) return;
  const src = AC.createBufferSource(); src.buffer = n;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.045, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  src.connect(f); f.connect(g); g.connect(musicGain);
  src.start(when); src.stop(when + 0.06);
}
function shaker(when) {
  if (!AC || !musicGain) return;
  const n = getNoise(); if (!n) return;
  const src = AC.createBufferSource(); src.buffer = n;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 9000;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.02, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
  src.connect(f); f.connect(g); g.connect(musicGain);
  src.start(when); src.stop(when + 0.05);
}
function woodblock(when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(1200, when);
  o.frequency.exponentialRampToValueAtTime(900, when + 0.04);
  g.gain.setValueAtTime(0.12, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 0.06);
}
function claves(when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(2400, when);
  o.frequency.exponentialRampToValueAtTime(1800, when + 0.03);
  g.gain.setValueAtTime(0.09, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 0.05);
}
// 手指 Snap：清脆的短促爆点（高频带通噪声，室内休息区感）
function fingerSnap(when) {
  if (!AC || !musicGain) return;
  const n = getNoise(); if (!n) return;
  const src = AC.createBufferSource(); src.buffer = n;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.5;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.06, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
  src.connect(f); f.connect(g); g.connect(musicGain);
  src.start(when); src.stop(when + 0.07);
}
// Rimshot 鼓边：短促清脆的干响（中频带通噪声，比 snare 轻）
function rimshot(when) {
  if (!AC || !musicGain) return;
  const n = getNoise(); if (!n) return;
  const src = AC.createBufferSource(); src.buffer = n;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.0;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.07, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
  src.connect(f); f.connect(g); g.connect(musicGain);
  src.start(when); src.stop(when + 0.08);
}
// UI Bell / Digital Pluck：明亮短促的叮（编辑器小音型）
function bellNote(freq, when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.03, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.4);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 0.42);
}
function windWhoosh(when) {
  if (!AC || !musicGain) return;
  const n = getNoise(); if (!n) return;
  const src = AC.createBufferSource(); src.buffer = n; src.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.5;
  f.frequency.setValueAtTime(300, when);
  f.frequency.linearRampToValueAtTime(650, when + 1.6);
  f.frequency.linearRampToValueAtTime(280, when + 3.0);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.05, when + 1.4);
  g.gain.linearRampToValueAtTime(0.0001, when + 3.0);
  src.connect(f); f.connect(g); g.connect(musicGain);
  src.start(when); src.stop(when + 3.1);
}
function whistleNote(freq, when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.06, when + 0.18);
  g.gain.setValueAtTime(0.06, when + 0.85);
  g.gain.linearRampToValueAtTime(0.0001, when + 1.25);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 1.3);
}
function dripNote(freq, when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.02, when);
  o.frequency.exponentialRampToValueAtTime(freq * 0.98, when + 0.05);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.055, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 0.52);
}
// 大鼓 Taiko：低沉长音 boom（低频正弦下滑 + 低频噪声冲击体）
function taiko(when) {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(95, when);
  o.frequency.exponentialRampToValueAtTime(38, when + 0.35);
  g.gain.setValueAtTime(0.3, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
  o.connect(g); g.connect(musicGain);
  o.start(when); o.stop(when + 0.55);
  const n = getNoise(); if (n) {
    const src = AC.createBufferSource(); src.buffer = n;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g2 = AC.createGain();
    g2.gain.setValueAtTime(0.1, when);
    g2.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
    src.connect(f); f.connect(g2); g2.connect(musicGain);
    src.start(when); src.stop(when + 0.14);
  }
}
// 铜管 Stab：短促 "BAAM!"（根音 + 纯五度 锯形波，快起快收）
function brassStab(freq, when) {
  if (!AC || !musicGain) return;
  [1, 1.5].forEach(r => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq * r;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.07, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.28);
    o.connect(g); g.connect(musicGain);
    o.start(when); o.stop(when + 0.3);
  });
}
// 暗合唱：低音区慢attack长延音（两个微失谐正弦营造合唱感）
function choirNote(freq, when) {
  if (!AC || !musicGain) return;
  [1, 1.006].forEach(r => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = freq * r;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.05, when + 0.3);
    g.gain.setValueAtTime(0.05, when + 1.4);
    g.gain.linearRampToValueAtTime(0.0001, when + 2.4);
    o.connect(g); g.connect(musicGain);
    o.start(when); o.stop(when + 2.45);
  });
}
// Boss 剩余血量比例（无存活 Boss 时按满血，避免影响其它主题）
function bossHpFrac() {
  for (const e of enemies) {
    if (e.type === 'boss' && !e.dead) return e.maxHp ? e.hp / e.maxHp : 1;
  }
  return 1;
}
// Boss 死亡收尾：鼓停，一个 E 长音，然后 E5 - B4 - E4
function bossDeathSting() {
  if (!AC || !musicGain) return;
  const t = AC.currentTime + 0.05;
  musicNote(82, t, 1.4, 'sine', 0.06);
  musicNote(659, t + 0.5, 0.7, 'sine', 0.04);
  musicNote(494, t + 1.0, 0.7, 'sine', 0.04);
  musicNote(330, t + 1.5, 1.2, 'sine', 0.04);
}
// 人物小标志音：换皮肤/介绍人物时插入 2–4 个音，给角色一点个性（不打断主循环）
function playMotif(name) {
  if (!AC || !musicGain || useOldMusic) return;   // 旧版音乐没有人物标志音
  const notes = MUSIC.wardrobe.motifs && MUSIC.wardrobe.motifs[name];
  if (!notes) return;
  let t = AC.currentTime + 0.02;
  for (const f of notes) { musicNote(f, t, 0.32, 'triangle', 0.05); t += 0.13; }
}
// 更衣室收尾：Bb → C → F（最后 F 拉长）——"人都认识了，出发"
function wardrobeOutro() {
  if (!AC || !musicGain) return;
  const t = AC.currentTime + 0.03;
  musicNote(233, t, 0.5, 'triangle', 0.05);
  musicNote(262, t + 0.3, 0.5, 'triangle', 0.05);
  musicNote(349, t + 0.6, 1.6, 'triangle', 0.055);
}
function scheduleMusic() {
  if (!AC || !musicOn) return;
  const themeKey = currentMusicTheme();
  const M = getMusic(themeKey);
  const step = M.step || MUSIC_STEP;        // 每章不同速度：森林欢快、洞穴紧张、宇宙漂浮
  const lead = M.lead || 'square';          // 每章不同音色：方波/三角波/锯齿波/正弦波
  const leadVol = M.leadVol || 0.034;
  const melDur = step * (M.decay || 0.9);   // 音符时值：草原/森林用短音，弹得「短、脆、跳」
  const arpType = M.arpType || 'sine';      // 和弦音色：森林用拨弦感三角波
  const arpVol = M.arpVol || 0.02;
  const leadAttack = M.leadAttack || 0.012; // 宇宙：主旋律慢attack（浮起）
  const bassDur = M.bassDur || 1.8;         // 宇宙：Sub低音一小节长音
  const bassType = M.bassType || 'triangle';// Boss：失真假Bass用锯齿波
  const bassVol = M.bassVol || 0.065;
  const arpDur = M.arpDur || 0.5;           // 宇宙：琶音稍长（漂浮/delay感）
  const echo = M.echo || null;              // 森林：长笛半拍回声
  const windArr = M.wind || null;           // 峡谷：风声 whoosh（偶尔，留白）
  const whistleArr = M.whistle || null;     // 峡谷：口哨点缀（每 8 小节一句）
  const dripArr = M.drip || null;           // 洞穴：水滴叮（随机抖动，不跟拍）
  const brassArr = M.brass || null;         // Boss：铜管Stab（根音，纯五度由 brassStab 叠加）
  const choirArr = M.choir || null;         // Boss：第二阶段暗合唱（低音长音）
  const bellArr = M.bell || null;           // 编辑器：Bell UI 小音型（偶尔）
  const isBoss = themeKey === 'boss';
  let mel, bass, arp, drum, len, hasB = false;
  if (isBoss) {
    // Boss 主题：血量联动三阶段 0=主战 1=第二阶段(≤50%) 2=狂暴(≤20%)
    const f = bossHpFrac();
    const ph = f <= 0.2 ? 2 : f <= 0.5 ? 1 : 0;
    mel = ph === 2 ? (M.mel3 || M.mel) : ph === 1 ? (M.mel2 || M.mel) : M.mel;
    bass = ph === 2 ? (M.bass3 || M.bass) : ph === 1 ? (M.bass2 || M.bass) : M.bass;
    arp = ph === 2 ? (M.arp3 || M.arp) : ph === 1 ? (M.arp2 || M.arp) : M.arp;
    drum = ph === 2 ? (M.drum3 || M.drum) : ph === 1 ? (M.drum2 || M.drum) : M.drum;
    len = mel.length;
  } else {
    hasB = !!(M.mel2 && M.mel2.length);
    const sec = hasB && musicSection === 1 ? 1 : 0;
    mel = sec ? M.mel2 : M.mel;
    bass = sec ? M.bass2 : M.bass;
    arp = sec ? M.arp2 : M.arp;
    drum = M.drum || null;
    len = mel.length;
  }
  const ahead = AC.currentTime + 0.35;
  while (musicNextTime < ahead) {
    const i = musicStep % len, t = musicNextTime;
    const m = mel[i], b = bass ? bass[i] : 0, a = arp ? arp[i] : 0;
    if (m) musicNote(m, t, melDur, lead, leadVol, leadAttack);
    if (b) musicNote(b, t, step * bassDur, bassType, bassVol);
    if (a) musicNote(a, t, step * arpDur, arpType, arpVol);
    if (echo) { const e = echo[i]; if (e) musicNote(e, t, melDur * 0.7, 'sine', leadVol * 0.5); }
    if (windArr && windArr[i]) windWhoosh(t);
    if (whistleArr && whistleArr[i]) whistleNote(whistleArr[i], t);
    if (dripArr && dripArr[i]) dripNote(dripArr[i], t + (Math.random() - 0.5) * step);
    if (brassArr && brassArr[i]) brassStab(brassArr[i], t);
    if (choirArr && choirArr[i]) choirNote(choirArr[i], t);
    if (bellArr && bellArr[i]) bellNote(bellArr[i], t);
    if (drum) {
      const d = drum[musicStep % drum.length] || '';
      if (d.indexOf('K') >= 0) kick(t);
      if (d.indexOf('S') >= 0) snare(t);
      if (d.indexOf('H') >= 0) hihat(t);
      if (d.indexOf('X') >= 0) shaker(t);
      if (d.indexOf('W') >= 0) woodblock(t);
      if (d.indexOf('C') >= 0) claves(t);
      if (d.indexOf('T') >= 0) taiko(t);
      if (d.indexOf('N') >= 0) fingerSnap(t);
      if (d.indexOf('R') >= 0) rimshot(t);
    }
    musicStep++; musicNextTime += step;
    if (!isBoss && hasB && musicStep % 32 === 0) musicSection = 1 - musicSection;
  }
}
function setMusicVol(v) {
  if (musicGain && AC) musicGain.gain.linearRampToValueAtTime(v, AC.currentTime + 0.2);
}
function applyMusicVol() {
  if (musicGain && AC) setMusicVol(musicMuted ? 0 : 0.9 * musicVol);
  applyBgmVolume();
}
function startMusic() {
  if (musicOn) return;
  if (!AC) return;
  if (!musicGain) { musicGain = AC.createGain(); musicGain.gain.value = 0; musicGain.connect(AC.destination); }
  musicOn = true;
  musicNextTime = AC.currentTime + 0.1;
  musicStep = 0;
  musicSection = 0;
  setMusicVol(0.9 * musicVol);
  if (!musicTimer) musicTimer = setInterval(scheduleMusic, 100);
}
function stopMusic() {
  if (!musicOn) return;
  musicOn = false;
  if (musicGain && AC) setMusicVol(0);
}
// 是否该播背景音乐：登录/教程不播；标题、游戏、剧情、结算、更衣室等均播
function musicActiveState() {
  return state !== 'LOGIN' && state !== 'TUTORIAL' && state !== 'MUSICBOX';
}
function toggleMusic() {
  musicMuted = !musicMuted;
  try { localStorage.setItem('rb_music', musicMuted ? '1' : '0'); } catch (e) {}
  if (musicMuted) {
    setMusicVol(0);
    applyBgmVolume();
  } else {
    audio();
    if (AC && AC.state === 'suspended') AC.resume();
    applyBgmVolume();
    if (bgmKey && bgmEl) { try { const p = bgmEl.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
    if (musicActiveState()) { startMusic(); if (musicGain) setMusicVol(0.9 * musicVol); }
  }
}
function toggleSfx() {
  sfxMuted = !sfxMuted;
  try { localStorage.setItem('rb_sfx', sfxMuted ? '1' : '0'); } catch (e) {}
  if (!sfxMuted) { audio(); if (AC && AC.state === 'suspended') AC.resume(); sfx.click(); }
}

/* ==================== 真实音乐（登录界面 / 主界面） ==================== */
// 用户提供的两首曲子：登录界面 & 主界面（MP3 内嵌、循环播放）；其余画面仍用合成音乐
const BGM_TRACKS = {
  login: 'assets/audio/bgm-login.mp3',
  title: 'assets/audio/bgm-title.mp3',
};
let bgmEl = null, bgmKey = null;
function applyBgmVolume() {
  if (bgmEl) bgmEl.volume = musicMuted ? 0 : 0.9 * musicVol;
}
function playBgm(key) {
  if (bgmKey === key) { applyBgmVolume(); return; }
  stopBgm();
  const src = BGM_TRACKS[key];
  if (!src || src.indexOf('__BGM_') >= 0) return;   // 尚未注入真实数据时跳过
  try {
    bgmEl = new Audio(src);
    bgmEl.loop = true;
    applyBgmVolume();
    bgmKey = key;
    const p = bgmEl.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { bgmEl = null; bgmKey = null; }
}
function stopBgm() {
  if (bgmEl) { try { bgmEl.pause(); } catch (e) {} bgmEl = null; }
  bgmKey = null;
}

/* ============================ 设置面板（各页面通用） ============================ */
let settingsOpen = false;
let settingsDrag = null;        // 正在拖动的滑块：'music' | 'sfx'
function openSettings() { settingsOpen = true; settingsDrag = null; }
function closeSettings() { settingsOpen = false; settingsDrag = null; }
function settingsBtn() {
  if (state === 'TITLE') return { x: VIEW_W - 286, y: 30, w: 42, h: 42 };
  if (state === 'EDIT') return { x: 16, y: 8, w: 34, h: 34 };
  return { x: VIEW_W - 62, y: 12, w: 50, h: 34 };
}
function settingsLayout() {
  const W = 400, H = 440, x = (VIEW_W - W) / 2, y = (VIEW_H - H) / 2;
  const rows = [
    { key: 'music', label: t('音乐'), y: y + 92, on: !musicMuted, vol: musicVol },
    { key: 'sfx',   label: t('音效'), y: y + 144, on: !sfxMuted,  vol: sfxVol },
  ];
  const qopts = ['low', 'medium', 'high', 'ultra'];
  const qlabels = [t('低'), t('中'), t('高'), t('超高')];
  const qbw = 56, qgap = 5, qx0 = x + 126;
  const qualityBtns = qopts.map((q, i) => ({ q, x: qx0 + i * (qbw + qgap), y: y + 194, w: qbw, h: 30, label: qlabels[i] }));
  const cbw = 40, cgap = 4, cx0 = x + 126;
  const cursorBtns = CURSOR_SKINS.map((s, i) => ({ skin: i, x: cx0 + i * (cbw + cgap), y: y + 244, w: cbw, h: 34, label: s.icon }));
  return {
    W, H, x, y, rows, qualityBtns, qualityLabelY: y + 209, cursorBtns, cursorLabelY: y + 258,
    close: { x: x + W - 44, y: y + 14, w: 30, h: 30 },
    toggle: (r) => ({ x: x + 54, y: r.y - 16, w: 88, h: 32 }),
    track:  (r) => ({ x: x + 158, y: r.y - 4, w: 190, h: 8 }),
    reset:  { x: x + 18, y: y + 360, w: 116, h: 44 },
    resetProgress: { x: x + 142, y: y + 360, w: 116, h: 44 },
    fullscreen: { x: x + 266, y: y + 360, w: 116, h: 44 },
    oldMusic: { x: x + 46, y: y + 300, w: 308, h: 40 },
  };
}
function setMusicVolume(v) {
  musicVol = clamp(v, 0, 1);
  try { localStorage.setItem('rb_music_vol', String(musicVol)); } catch (e) {}
  applyMusicVol();
}
function setSfxVolume(v) {
  sfxVol = clamp(v, 0, 1);
  try { localStorage.setItem('rb_sfx_vol', String(sfxVol)); } catch (e) {}
  if (sfxVol > 0 && !sfxMuted) sfx.click();
}
function setQuality(q) {
  if (!QUALITY_SCALE[q]) q = 'high';
  quality = q;
  try { localStorage.setItem('rb_quality', q); } catch (e) {}
  applyQuality();
}
function resetSettings() {
  musicMuted = false; sfxMuted = false; musicVol = 1.0; sfxVol = 1.0;
  try {
    localStorage.setItem('rb_music', '0'); localStorage.setItem('rb_sfx', '0');
    localStorage.setItem('rb_music_vol', '1'); localStorage.setItem('rb_sfx_vol', '1');
  } catch (e) {}
  applyMusicVol();
  if (!musicMuted && musicActiveState()) startMusic();
  setQuality('high');
  sfx.click();
}
function resetProgress() {
  maxUnlocked = 1; bestStars = [];
  try { localStorage.setItem('rb_unlocked', '1'); localStorage.setItem('rb_stars', JSON.stringify(bestStars)); } catch (e) {}
  sfx.click();
  flashMsg(t('进度已重置 · 从第 1 关重新开始'));
}
function toggleFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  } catch (e) {}
}
function drawSettings() {
  const L = settingsLayout();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#1c2030'; roundRect(L.x, L.y, L.W, L.H, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; roundRect(L.x, L.y, L.W, L.H, 18); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t('设置'), L.x + L.W / 2, L.y + 40);
  drawButton(L.close.x, L.close.y, L.close.w, L.close.h, '✕', '#c0392b');
  for (const r of L.rows) {
    ctx.textAlign = 'left'; ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(r.label, L.x + 46, r.y);
    const tg = L.toggle(r);
    const tgLabel = r.on ? (r.key === 'music' ? '🎵' : '🔊') : (r.key === 'music' ? '🔇' : '🔕');
    drawButton(tg.x, tg.y, tg.w, tg.h, tgLabel, r.on ? '#3f8a34' : '#4a4a5a');
    const tr = L.track(r);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; roundRect(tr.x, tr.y, tr.w, tr.h, 4); ctx.fill();
    ctx.fillStyle = r.on ? '#4f9e42' : '#666'; roundRect(tr.x, tr.y, Math.max(tr.w * r.vol, 4), tr.h, 4); ctx.fill();
    const tx = tr.x + tr.w * r.vol;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, tr.y + tr.h / 2, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
  }
  // 画质
  ctx.textAlign = 'left'; ctx.font = 'bold 19px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(t('画质'), L.x + 46, L.qualityLabelY);
  for (const b of L.qualityBtns) drawButton(b.x, b.y, b.w, b.h, b.label, b.q === quality ? '#3f8a34' : '#4a4a5a');
  // 鼠标皮肤
  ctx.fillText(t('鼠标皮肤'), L.x + 46, L.cursorLabelY);
  for (const b of L.cursorBtns) drawButton(b.x, b.y, b.w, b.h, b.label, b.skin === cursorSkin ? '#3f8a34' : '#4a4a5a');
  // 使用旧版音乐
  drawButton(L.oldMusic.x, L.oldMusic.y, L.oldMusic.w, L.oldMusic.h, '🎵 ' + t('使用旧版音乐') + (useOldMusic ? ' ✓' : ''), useOldMusic ? '#3f8a34' : '#4a4a5a');
  drawButton(L.reset.x, L.reset.y, L.reset.w, L.reset.h, '↺ ' + t('重置默认'), '#c0392b');
  drawButton(L.resetProgress.x, L.resetProgress.y, L.resetProgress.w, L.resetProgress.h, '🔒 ' + t('重置进度'), '#c0392b');
  drawButton(L.fullscreen.x, L.fullscreen.y, L.fullscreen.w, L.fullscreen.h, '⛶ ' + t('全屏'), '#4a4a5a');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function ensureAudio() {
  audio();
  if (AC && AC.state === 'suspended') AC.resume();
  if (bgmEl && bgmKey && !musicMuted) { try { const p = bgmEl.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  if (!musicMuted && musicActiveState()) startMusic();
}

/* ============================ 敌人工厂 ============================ */
function mkEnemy(cx, cy, type, bossKind) {
  if (type === 'boss') {
    const bk = bossKind || 'demon';
    if (bk === 'demon') return { x: cx, y: cy, hw: 34, hh: 30, vx: 0, vy: 0, dir: -1, speed: 55, grounded: false, dead: false, type: 'boss', bossKind: 'demon', hp: BOSS_HP, maxHp: BOSS_HP, hitFlash: 0, charge: 0, jumpCd: 2.4, dropCd: 30, waterCd: 5, gearCd: 5, smashing: false, eyeMode: 'red', eyeT: 0, eyeDelay: 0 };
    // 新 Boss：尺寸/血量/速度各自不同，其余字段在 update 里惰性初始化
    const cfg = {
      crusher: { hw: 40, hh: 36, speed: 120, hp: 5 },
      claw:    { hw: 56, hh: 30, speed: 0,   hp: 5 },
      spider:  { hw: 30, hh: 22, speed: 90,  hp: 5 },
      square:  { hw: 54, hh: 50, speed: 0,   hp: 6 },
    }[bk] || { hw: 34, hh: 30, speed: 55, hp: BOSS_HP };
    return { x: cx, y: cy, hw: cfg.hw, hh: cfg.hh, vx: 0, vy: 0, dir: -1, speed: cfg.speed, grounded: false, dead: false, type: 'boss', bossKind: bk, hp: cfg.hp, maxHp: cfg.hp, hitFlash: 0, charge: 0, vulnerable: false, phase: 0, stun: 0, frozen: 0, cd1: 1.2, cd2: 2.4, cd3: 5, state: 'idle' };
  }
  const base = { x: cx, y: cy, vx: 0, vy: 0, dir: -1, grounded: false, dead: false, type };
  switch (type) {
    case 'bull':      return { ...base, hw: 17, hh: 17, speed: 150 };
    case 'fast':      return { ...base, hw: 17, hh: 17, speed: 160 };
    case 'jumper':    return { ...base, hw: 17, hh: 17, speed: 70, jumpCd: 1.6 };
    case 'spiky':     return { ...base, hw: 17, hh: 17, speed: 70 };
    case 'armored':   return { ...base, hw: 17, hh: 17, speed: 55, hp: 3, hitFlash: 0 };
    case 'large':     return { ...base, hw: 26, hh: 26, speed: 45, hp: 3, hitFlash: 0 };
    case 'charger':   return { ...base, hw: 17, hh: 17, speed: 100, chargeT: 0 };
    case 'tracker':   return { ...base, hw: 17, hh: 17, speed: 85, turnT: 0 };
    case 'pusher':    return { ...base, hw: 17, hh: 17, speed: 70 };
    case 'shooter':   return { ...base, hw: 17, hh: 17, speed: 40, shootCd: 2.4 };
    case 'flyer':     return { ...base, hw: 16, hh: 16, speed: 70, baseY: cy, phase: 0 };
    case 'piranha':   return { ...base, hw: 15, hh: 12, speed: 55, baseY: cy, phase: Math.random() * 6 };  // 水怪：水中游
    case 'turret':    return { ...base, hw: 20, hh: 20, speed: 0, shootCd: 1.8, aim: 0 };
    case 'bomber':    return { ...base, hw: 16, hh: 16, speed: 55, baseY: cy, phase: 0, dropCd: 2.2 };
    case 'unkillable': return { ...base, hw: 17, hh: 17, speed: 60 };
    case 'gated':     return { ...base, hw: 17, hh: 17, speed: 70 };
    case 'walker':
    default:           return { ...base, hw: 17, hh: 17, speed: 82 };
  }
}

// Boss 只在“黄眼”状态可被攻击（红眼/锁血时无敌）；新 Boss 显式设 e.vulnerable
function bossVulnerable(e) {
  return e.vulnerable != null ? e.vulnerable : (e.eyeMode === 'yellow');
}

// Boss 名字（血条标签 / 提示用）
function bossName(e) {
  return { crusher: '钢铁压路机', claw: '熔岩机械臂', spider: '机械蜘蛛', square: '方块博士' }[e.bossKind] || '魔王';
}

// 统一扣血：命中一下；血量归零 → 死亡（方块博士由 updateBossSquare 接管阶段三）
function damageBoss(e, fx, fy) {
  if (e.dead || e.hitFlash > 0) return;
  e.hp--; e.hitFlash = 0.6;
  shake = Math.max(shake, 6);
  sfx.stomp(); spawnPuff(fx, fy, 14);
  if (e.hp <= 0 && e.bossKind !== 'square') {
    e.dead = true;
    spawnPuff(e.x, e.y, 34);
    bossDeathSting();
    sfx.win();
    winLevel();
  }
}

/* ============================ 关卡（字符地图） ============================ */
/*
  每格 40px，字符含义：
  # 草地表面   d 泥土   = 石板平台   W 漂浮木板(可跳上/从下穿过)   . 空
  K 可通过木方块(单向)   Z 叶子(装饰无碰撞)   J 水怪   i 冰面(滑)   m 泥地(慢)   s 沙地(略慢)   u 木制平台   v 金属平台
  [ 斜坡(↗)   ] 斜坡(↖)   ( 圆坡(↗)   ) 圆坡(↖)   x 可破坏墙   f 假墙(无碰撞)
  > 单向门(只许→)   < 单向门(只许←)
  B 箱子   e 走路小怪   n 牛角快怪   o Boss魔王   O Boss压路机   U Boss机械臂   X Boss蜘蛛   Q Boss博士
  a 快速怪   j 跳跃怪   k 带刺怪(踩=受伤)   h 重甲怪(踩3次)   A 大型怪
  q 冲刺怪   t 追踪怪   p 推箱怪   z 射弹怪   y 飞行怪   Y 炮塔   b 掉炸弹怪
  l 不可踩死   g 机关克星(触发机关后可踩)
  r 石球   V 跷跷板   ! 压力按钮   % 拉杆   @ 传送带   E 电梯
  ; 摆锤   : 风扇   + 易碎平台   , 旋转锯片   ? 爆炸桶   1 钥匙   \ | 绳索
  2 旋转平台   5 矿车   _ 宽木板
  * 星星   ~ 弹簧   w 水   ^ 尖刺   F 旗子   P 出生点   R 复活点(碰到后死亡从这里重生)
  M 移动平台   T 平台终点   C 大炮(向上弹)   L 火焰机关(定时喷火)   G 齿轮(旋转陷阱)
  S 机关(踩一下开锁)   D 门(机关触发前阻挡，打开后可通行)   & 熔岩(非固体，落入受伤)
*/
// 地形字符 → 实体类型/材质（返回 null 表示非地形实体）
function solidInfo(ch, def) {
  if (ch === '#') return { type: def.groundType, material: 'default' };
  if (ch === '=') return { type: 'stone', material: 'default' };
  if (ch === 'd') return { type: 'dirt', material: 'default' };
  if (ch === 'i') return { type: 'ice', material: 'ice' };
  if (ch === 'm') return { type: 'mud', material: 'mud' };
  if (ch === 's') return { type: 'sand', material: 'sand' };
  if (ch === 'u') return { type: 'wood', material: 'default' };
  if (ch === 'v') return { type: 'metal', material: 'default' };
  return null;
}
function buildLevel(def) {
  // 统一每行宽度：以最长的行为准（主线关卡已是逐关变长的宽度，编辑器/自定义为 200 列）
  const raw = def.rows || [];
  const width = Math.max(1, ...raw.map(r => (r || '').length));
  const rows = raw.map(r => (r + '.'.repeat(width)).slice(0, width));
  const solids = [], boxes = [], enemies = [], spikes = [], springs = [], water = [], stars = [], movers = [], planks = [], cannons = [], lasers = [], checkpoints = [], targets = [], gears = [], switches = [], doors = [], destructibles = [], fakes = [], oneways = [], boulders = [], seesaws = [], buttons = [], conveyors = [], pendulums = [], fans = [], fragiles = [], saws = [], explosives = [], keys = [], ropes = [], lava = [];
  let spawn = null, flag = null;

  for (let r = 0; r < rows.length; r++) {
    const line = rows[r];
    let runStart = -1, runType = null, runMat = null;
    for (let c = 0; c <= line.length; c++) {
      const ch = c < line.length ? line[c] : '.';
      const info = solidInfo(ch, def);
      if (info) {
        if (runStart < 0) { runStart = c; runType = info.type; runMat = info.material; }
        else if (runType !== info.type) { solids.push({ x: runStart * TILE, y: r * TILE, w: (c - runStart) * TILE, h: TILE, type: runType, material: runMat }); runStart = c; runType = info.type; runMat = info.material; }
      } else {
        if (runStart >= 0) { solids.push({ x: runStart * TILE, y: r * TILE, w: (c - runStart) * TILE, h: TILE, type: runType, material: runMat }); runStart = -1; runType = null; runMat = null; }
        const cx = c * TILE + TILE / 2, cy = r * TILE + TILE / 2;
        switch (ch) {
          case 'B': boxes.push({ x: c * TILE, y: (r - 1) * TILE, w: TILE * 2, h: TILE * 2, vx: 0, vy: 0, grounded: false }); break;   // 2×2 大箱，B 在左下角
          case 'e': enemies.push(mkEnemy(cx, cy, 'walker')); break;
          case 'n': enemies.push(mkEnemy(cx, cy, 'bull')); break;
          case 'a': enemies.push(mkEnemy(cx, cy, 'fast')); break;
          case 'j': enemies.push(mkEnemy(cx, cy, 'jumper')); break;
          case 'k': enemies.push(mkEnemy(cx, cy, 'spiky')); break;
          case 'h': enemies.push(mkEnemy(cx, cy, 'armored')); break;
          case 'A': enemies.push(mkEnemy(cx, cy, 'large')); break;
          case 'q': enemies.push(mkEnemy(cx, cy, 'charger')); break;
          case 't': enemies.push(mkEnemy(cx, cy, 'tracker')); break;
          case 'p': enemies.push(mkEnemy(cx, cy, 'pusher')); break;
          case 'z': enemies.push(mkEnemy(cx, cy, 'shooter')); break;
          case 'y': enemies.push(mkEnemy(cx, cy, 'flyer')); break;
          case 'Y': enemies.push(mkEnemy(cx, cy, 'turret')); break;
          case 'b': enemies.push(mkEnemy(cx, cy, 'bomber')); break;
          case 'l': enemies.push(mkEnemy(cx, cy, 'unkillable')); break;
          case 'g': enemies.push(mkEnemy(cx, cy, 'gated')); break;
          case 'J': enemies.push(mkEnemy(cx, cy, 'piranha')); break;   // 水怪（食人鱼）
          case 'o': enemies.push(mkEnemy(cx, cy, 'boss', def.bossKind)); break;
          case 'O': enemies.push(mkEnemy(cx, cy, 'boss', 'crusher')); break;
          case 'U': enemies.push(mkEnemy(cx, cy, 'boss', 'claw')); break;
          case 'X': enemies.push(mkEnemy(cx, cy, 'boss', 'spider')); break;
          case 'Q': enemies.push(mkEnemy(cx, cy, 'boss', 'square')); break;
          case '*': stars.push({ x: cx, y: cy - 10, taken: false }); break;
          case '~': springs.push({ x: c * TILE, y: (r + 1) * TILE, w: TILE, anim: 0 }); break;
          case 'w': water.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE }); break;
          case '^': spikes.push({ x: c * TILE, y: (r + 1) * TILE, w: TILE }); break;
          case 'F': flag = { x: cx, y: cy }; break;
          case 'P': spawn = { x: cx, y: cy }; break;
          case 'R': checkpoints.push({ x: cx, y: cy, taken: false }); break;   // 复活点
          case 'M': movers.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, x0: c * TILE, y0: r * TILE, range: TILE * 2, speed: 1.5, phase: (r * 7 + c) * 0.8, vx: 0, vy: 0, t: 0, tx: -1, ty: -1, x1: 0, y1: 0, pathSpeed: 90 }); break;
          case 'T': targets.push({ c, r }); break;
          case 'W': planks.push({ x: c * TILE, y: r * TILE, w: TILE, h: 14 }); break;   // 漂浮木板，顶面在格顶
          case 'K': planks.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, block: true }); break;   // 可通过纯木方块（单向，整格高）
          case 'C': cannons.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, cd: 0, anim: 0 }); break;
          case 'L': lasers.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, period: 1.8, phase: (r * 5 + c) * 0.6 }); break;
          case 'G': gears.push({ x: cx, y: -40, r: 26, angle: 0, spin: 3, vy: 0, life: 3, dead: false }); break;   // 齿轮从天而降，3 秒后消失
          case 'S': switches.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, on: false }); break;   // 机关/拉杆（点一下触发）
          case 'D': { const d = { x: c * TILE, y: r * TILE, w: TILE, h: TILE, type: 'door', open: false }; doors.push(d); solids.push(d); break; }   // 门（关闭时阻挡）
          case '[': solids.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, type: 'slope', dir: 1, slope: true }); break;     // 斜坡 ↗（左下→右上）
          case ']': solids.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, type: 'slope', dir: -1, slope: true }); break;    // 斜坡 ↖（右下→左上）
          case '(': solids.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, type: 'slope', dir: 1, slope: true, round: true }); break;  // 圆坡 ↗
          case ')': solids.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, type: 'slope', dir: -1, slope: true, round: true }); break; // 圆坡 ↖
          case 'x': { const d = { x: c * TILE, y: r * TILE, w: TILE, h: TILE, type: 'destructible', dead: false }; destructibles.push(d); solids.push(d); break; }   // 可破坏墙（重踩/爆炸碎裂）
          case 'f': fakes.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE }); break;   // 假墙（视觉存在，无碰撞）
          case 'Z': fakes.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, leaf: true }); break;   // 叶子方块（装饰，无碰撞）
          case '>': oneways.push({ x: c * TILE + TILE / 2 - 4, y: r * TILE, w: 8, h: TILE, allowDir: 1 }); break;    // 单向门（只许向右）
          case '<': oneways.push({ x: c * TILE + TILE / 2 - 4, y: r * TILE, w: 8, h: TILE, allowDir: -1 }); break;   // 单向门（只许向左）
          case 'r': boulders.push({ x: cx, y: cy, r: 20, vx: 0, vy: 0, grounded: false }); break;   // 石球
          case 'V': seesaws.push({ x: c * TILE, y: r * TILE, w: TILE * 3, pivotX: c * TILE + TILE * 1.5, pivotY: r * TILE + 20, angle: 0, angleVel: 0 }); break;   // 跷跷板
          case '!': buttons.push({ x: c * TILE, y: (r + 1) * TILE - 10, w: TILE, h: 10, on: false }); break;   // 压力按钮
          case '%': switches.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, on: false, lever: true }); break;   // 拉杆（同机关，一次性）
          case '@': conveyors.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, dir: 1 }); break;   // 传送带（向右）
          case 'E': movers.push({ x: c * TILE, y: r * TILE, w: TILE * 2, h: TILE, x0: c * TILE, y0: r * TILE, range: TILE * 5, speed: 0.7, phase: 0, vx: 0, vy: 0, t: 0, elevator: true }); break;   // 电梯
          case '2': movers.push({ x: c * TILE, y: r * TILE, w: TILE * 2, h: TILE, px: cx, py: cy, rad: TILE * 3, angle: 0, spin: 0.9, vx: 0, vy: 0, t: 0, rotate: true }); break;   // 旋转平台
          case '5': movers.push({ x: c * TILE, y: r * TILE, w: TILE * 2, h: TILE, x0: c * TILE, y0: r * TILE, range: TILE * 4, speed: 1.2, phase: 0, vx: 0, vy: 0, t: 0, tx: -1, ty: -1, x1: 0, y1: 0, pathSpeed: 90, cart: true }); break;   // 矿车
          case '_': planks.push({ x: c * TILE, y: r * TILE, w: TILE * 3, h: 14 }); break;   // 宽木板（3 格单向平台）
          case ';': pendulums.push({ ax: cx, ay: cy, len: TILE * 2.5, angle: 0.5, omega: 1.4, r: 22 }); break;   // 摆锤
          case ':': fans.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, force: 760, phase: (r * 5 + c) * 0.4, on: true }); break;   // 风扇（向上吹）
          case '+': fragiles.push({ x: c * TILE, y: r * TILE, w: TILE, h: 12, life: 0, broken: false, shakeT: 0 }); break;   // 易碎平台
          case ',': saws.push({ x: cx, y: cy, r: 16, angle: 0, spin: 6 }); break;   // 旋转锯片
          case '?': explosives.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, dead: false, fuse: -1 }); break;   // 爆炸桶（1 格高）
          case '1': keys.push({ x: cx, y: cy - 8, taken: false }); break;   // 钥匙
          case '\\': ropes.push({ x: cx, y: r * TILE, h: TILE * 3 }); break;   // 绳索（悬挂线）
          case '|': ropes.push({ x: cx, y: r * TILE, h: TILE * 3 }); break;   // 链条（悬挂线）
          case '&': lava.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE }); break;   // 熔岩（非固体，落入受伤）
        }
      }
    }
  }
  // 池塘：w 替换脚下的方块（挖掉水面正下方同列的固体，形成水坑，而非覆盖涂层）
  if (water.length) {
    const carved = [];
    for (const s of solids) {
      const cuts = [];
      for (const w of water) {
        const l = Math.max(s.x, w.x), r = Math.min(s.x + s.w, w.x + w.w);
        if (r - l > 0 && s.y >= w.y - 1) cuts.push([l, r]);
      }
      if (!cuts.length) { carved.push(s); continue; }
      cuts.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const [l, r] of cuts) {
        if (merged.length && l <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r);
        else merged.push([l, r]);
      }
      let cur = s.x;
      for (const [l, r] of merged) {
        if (l > cur) carved.push({ x: cur, y: s.y, w: l - cur, h: s.h, type: s.type });
        cur = Math.max(cur, r);
      }
      if (cur < s.x + s.w) carved.push({ x: cur, y: s.y, w: s.x + s.w - cur, h: s.h, type: s.type });
    }
    solids.length = 0; solids.push(...carved);
  }

  // 配对移动平台与终点：每个 M 找最近的未占用 T，平台在两者之间往返
  if (targets.length && movers.length) {
    const used = new Set();
    for (const m of movers) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < targets.length; i++) {
        if (used.has(i)) continue;
        const d = Math.hypot(targets[i].r - m.y0 / TILE, targets[i].c - m.x0 / TILE);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0) {
        used.add(best);
        m.tx = targets[best].c; m.ty = targets[best].r;
        m.x1 = m.tx * TILE; m.y1 = m.ty * TILE;
      }
    }
  }
  // 地表剖面：每列最上层地面块的行号（-1 表示该列无地面），用于画圆润草皮
  const surface = [];
  for (let c = 0; c < rows[0].length; c++) {
    let top = -1;
    for (let r = 0; r < rows.length; r++) {
      const ch = rows[r][c];
      if (ch === '#' || ch === 'd') { top = r; break; }
    }
    surface.push(top);
  }
  return {
    name: def.name, theme: def.theme, spawn, flag,
    solids, boxes, enemies, spikes, springs, water, stars, movers, planks, cannons, lasers, checkpoints, gears, switches, doors, destructibles, fakes, oneways, boulders, seesaws, buttons, conveyors, pendulums, fans, fragiles, saws, explosives, keys, ropes, lava, surface,
    killY: (rows.length + 2) * TILE,
    mapH: rows.length * TILE,
  };
}

// 把老关卡（44 列）扩展到指定列数：保留前半段原设计，后半段生成可玩的“延伸挑战”，旗子移到最右。
function normRows(rows) { return (rows || []).map(r => (r + '.'.repeat(EDIT_COLS)).slice(0, EDIT_COLS)); }
// 每关目标列数：每章内第 1 关最短，逐关变长，最后一关到 200 列（越来越难）
function levelCols(i) {
  const min = 60, max = EDIT_COLS;
  const n = CHAPTER_SIZE;
  const t = n <= 1 ? 1 : (i % n) / (n - 1);
  return Math.round(min + (max - min) * t);
}
// 给第一章手绘开头的底部地面加起伏（保守：只抬平段 1 格，用台阶，同步上移地表实体）
function addReliefToIntro(out, C0, G, H, rnd) {
  const set = (r, c, ch) => { if (r < 0 || r >= H || c < 0 || c >= C0) return; out[r] = out[r].slice(0, c) + ch + out[r].slice(c + 1); };
  const get = (r, c) => (r >= 0 && r < H && c >= 0 && c < C0) ? out[r][c] : '.';
  const isSolid = (ch) => '#dimsuv[]()=WMTDS'.includes(ch);   // 地面/平台/斜坡等固体
  const isEntity = (ch) => ch !== '.' && !isSolid(ch);
  const eligible = (c) =>
    get(G, c) === '#' &&                                    // 底部地表
    !isSolid(get(G - 1, c)) &&                              // 上方无平台/地形
    (get(G - 1, c) === '.' || get(G - 2, c) === '.');       // 空 或 可把实体上移
  let c = 4;
  while (c < C0 - 4) {
    if (!eligible(c)) { c++; continue; }
    let e = c;
    while (e < C0 - 4 && eligible(e)) e++;
    const len = e - c;
    if (len >= 5 && rnd() < 0.45) {
      for (let cc = c; cc < e; cc++) {
        const above = get(G - 1, cc);
        set(G - 1, cc, '#');                 // 新地表
        set(G, cc, 'd');                     // 原地表 → 泥土
        if (isEntity(above)) set(G - 2, cc, above);  // 地表实体上移 1 格
      }
    }
    c = e;
  }
}

function extendLevelRows(rows, seed, width) {
  const W = width, H = rows.length, G = H - 2;
  const C0 = rows[0].length;
  const out = rows.map(r => (r + '.'.repeat(W)).slice(0, W));
  const set = (r, c, ch) => { if (r < 0 || r >= H || c < 0 || c >= W) return; out[r] = out[r].slice(0, c) + ch + out[r].slice(c + 1); };
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  // Boss 关：只把平地补到 200 列，旗子留在原处（击败 Boss 即可过关）
  if (rows.some(r => r.includes('o'))) {
    for (let c = C0; c < W; c++) { set(G, c, '#'); set(G + 1, c, 'd'); }
    return out;
  }

  for (let r = 0; r < H; r++) out[r] = out[r].replace(/F/g, '.');

  // 手绘开头：给底部地面加起伏
  addReliefToIntro(out, C0, G, H, rnd);

  // 延伸段起伏地形
  const extLen = W - C0;
  const { surf, trans } = terrainProfile(extLen, G, rnd);
  emitTerrain(out, surf, trans, G, H, (r, cc, ch) => set(r, C0 + cc, ch));
  const srf = (c) => surf[c - C0];
  const trn = (c) => trans[c - C0];

  // 坑（2 格宽，只挖在平段、两侧等高）
  const pitSet = new Set();
  let pit = C0 + 15 + Math.floor(rnd() * 6);
  while (pit < W - 26) {
    const w = 2;
    if (trn(pit) === 'flat' && srf(pit) === srf(pit + w - 1) && srf(pit - 1) === srf(pit) && srf(pit + w) === srf(pit + w - 1)) {
      for (let k = 0; k < w; k++) { for (let r = srf(pit); r < H; r++) set(r, pit + k, '.'); pitSet.add(pit + k); }
    }
    pit += w + 15 + Math.floor(rnd() * 16);
  }
  const inPit = (c) => pitSet.has(c) || pitSet.has(c - 1);

  // 沿途内容（只放平段地表，避开坑）
  let c = C0 + 9;
  while (c < W - 18) {
    if (trn(c) !== 'flat' || inPit(c) || inPit(c - 1)) { c++; continue; }
    const gy = srf(c);
    const kind = Math.floor(rnd() * 11);
    if (kind < 3) {                       // 石板高台 + 星星
      set(gy - 2, c, '='); set(gy - 4, c, '*');
      c += 6 + Math.floor(rnd() * 5);
    } else if (kind < 5) {                // 漂浮木板 + 星星
      set(gy - 2, c, 'W'); set(gy - 4, c, '*');
      c += 7 + Math.floor(rnd() * 5);
    } else if (kind < 7) {                // 弹簧 + 高处星星
      set(gy - 1, c, '~'); set(gy - 6, c, '*');
      c += 8 + Math.floor(rnd() * 5);
    } else if (kind < 8) {                // 地面小怪
      set(gy - 1, c, 'e');
      c += 5 + Math.floor(rnd() * 5);
    } else if (kind < 9) {                // 牛角快怪
      set(gy - 1, c, 'n');
      c += 6 + Math.floor(rnd() * 5);
    } else if (kind < 10) {               // 一小片水塘（草原多一点水）
      set(gy - 1, c, 'w'); set(gy, c, 'w');
      c += 8 + Math.floor(rnd() * 6);
    } else {                              // 地面星星
      set(gy - 1, c, '*');
      c += 4 + Math.floor(rnd() * 4);
    }
  }

  // 结尾：大炮 + 高处星星 + 旗子
  set(srf(W - 16) - 1, W - 16, 'C');
  set(srf(W - 16) - 6, W - 16, '*');
  set(srf(W - 3) - 1, W - 3, 'F');

  // 修正：弹簧/大炮下方必须有地面（避免落在坑里悬空）
  for (let c = C0; c < W; c++) {
    const ch = out[srf(c) - 1][c];
    if (ch === '~' || ch === 'C') {
      if (out[srf(c)][c] !== '#') { set(srf(c), c, '#'); set(srf(c) + 1, c, 'd'); }
    }
  }

  // 复活点：放在中段（长关卡再多放一个），死亡后从这里重生
  const placeCP = (target) => {
    for (let c = Math.max(C0 + 3, Math.round(target)); c < W - 3; c++) {
      if (trn(c) === 'flat' && out[srf(c)][c] === '#' && out[srf(c) - 1][c] === '.') { set(srf(c) - 1, c, 'R'); return; }
    }
  };
  placeCP(W * 0.45);
  if (W >= 120) placeCP(W * 0.72);

  return out;
}

/* ============================ 篇章系统（五大篇章 × 15 关） ============================ */
const CHAPTERS = [
  { key: 'grass',  label: '草原', theme: 'grass',  groundType: 'grass',  seed: 11 },
  { key: 'forest', label: '森林', theme: 'forest', groundType: 'moss',   seed: 23 },
  { key: 'canyon', label: '峡谷', theme: 'canyon', groundType: 'canyon', seed: 37 },
  { key: 'mine',   label: '矿井', theme: 'mine',   groundType: 'stone',  seed: 53 },
  { key: 'space',  label: '宇宙', theme: 'space',  groundType: 'space',  seed: 71 },
];
const CHAPTER_SIZE = 15;

// 确定性随机数（同一种子生成同一关卡，排列组合稳定可复现）
function rngFactory(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function weightedPick(palette, rnd) {
  let total = 0; for (const e of palette) total += e.w;
  let r = rnd() * total;
  for (const e of palette) { r -= e.w; if (r <= 0) return e.k; }
  return palette[palette.length - 1].k;
}
// 元素调色板：难度随 pos 递增（排列组合不同机关）；章节风味只放大权重
function chapterPalette(ch, pos) {
  const p = []; const add = (k, w) => p.push({ k, w });
  add('star', 8);
  if (pos >= 1) add('walker', 6);
  if (pos >= 2) add('spring', 5);
  if (pos >= 3) add('spike', 5);
  if (pos >= 4) add('cannon', 5);
  if (pos >= 5) add('plank', 4);
  if (pos >= 6) add('mover', 4);
  if (pos >= 7) add('laser', 4);
  if (pos >= 8) add('water', 4);
  if (pos >= 9) add('box', 4);
  if (pos >= 10) add('bull', 4);
  if (pos >= 11) add('gear', 3);
  if (pos >= 5) add('fast', 4);
  if (pos >= 6) add('jumper', 4);
  if (pos >= 7) add('spiky', 4);
  if (pos >= 8) add('charger', 4);
  if (pos >= 9) add('tracker', 4);
  if (pos >= 10) add('pusher', 3);
  if (pos >= 10) add('armored', 3);
  if (pos >= 11) add('flyer', 3);
  if (pos >= 12) add('turret', 3);
  if (pos >= 12) add('shooter', 3);
  if (pos >= 13) add('bomber', 3);
  if (pos >= 13) add('large', 2);
  if (pos >= 13) add('unkillable', 2);
  // Phase C 机关（按难度门控解锁）
  if (pos >= 4) add('fragile', 3);
  if (pos >= 5) add('conveyor', 3);
  if (pos >= 6) add('seesaw', 3);
  if (pos >= 7) add('fan', 3);
  if (pos >= 8) add('elevator', 3);
  if (pos >= 9) add('boulder', 3);
  if (pos >= 10) add('button', 2);
  if (pos >= 11) add('pendulum', 3);
  if (pos >= 12) add('saw', 3);
  if (pos >= 13) add('explosive', 2);
  if (pos >= 13) add('key', 2);
  if (pos >= 6) add('wideplank', 3);
  if (pos >= 9) add('cart', 3);
  if (pos >= 12) add('rotator', 2);
  if (ch.key === 'forest') { add('plank', 6); add('walker', 4); add('spring', 4); add('jumper', 3); add('seesaw', 4); add('fan', 3); add('fragile', 3); add('wideplank', 4); }
  else if (ch.key === 'canyon') { add('mover', 8); add('spike', 4); add('water', 3); add('conveyor', 4); add('elevator', 3); add('boulder', 3); add('pendulum', 3); }
  else if (ch.key === 'mine') { add('laser', 5); add('gear', 4); add('box', 3); add('saw', 4); add('explosive', 3); add('button', 3); add('boulder', 3); add('cart', 4); }
  else if (ch.key === 'space') { add('cannon', 5); add('mover', 6); add('gear', 4); add('laser', 3); add('key', 3); add('pendulum', 3); add('fan', 2); add('rotator', 3); }
  return p;
}
function chapterFlavor(ch) {
  if (ch.key === 'forest') return '藤蔓与密林之间，善用弹簧翻越树冠。';
  if (ch.key === 'canyon') return '峡谷深渊遍布，把握移动平台与跳跃节奏。';
  if (ch.key === 'mine') return '黑暗矿井机关重重，留意火焰与坠落的齿轮。';
  if (ch.key === 'space') return '失重宇宙中，大炮会把你送上遥远的星空。';
  return '滚动跳跃，收集星星，一路向前！';
}
// ============================ 起伏地形生成 ============================
// 生成起伏地形剖面：surf[c] = 第 c 列地表行（G=基准），trans[c] = 过渡类型
// 高度范围 [lo, hi]（默认 [G-2, G]）；相邻落差 ≤1 格；斜坡与台阶混合；开头/结尾留平
function terrainProfile(W, G, rnd, lo, hi) {
  const surf = new Array(W).fill(G);
  const trans = new Array(W).fill('flat');
  const minY = lo != null ? lo : G - 2, maxY = hi != null ? hi : G;
  let y = G, c = 0;
  while (c < Math.min(5, W)) c++;                       // 开头 5 格平
  while (c < W - 10) {
    const run = 3 + Math.floor(rnd() * 5);              // 平跑 3~7
    for (let k = 0; k < run && c < W - 10; k++) { surf[c] = y; trans[c] = 'flat'; c++; }
    if (c >= W - 10) break;
    let dir;                                            // -1 抬升，+1 下降
    if (y <= minY) dir = 1; else if (y >= maxY) dir = -1; else dir = (rnd() < 0.5 ? -1 : 1);
    const isSlope = rnd() < 0.5;                        // 斜坡 or 台阶（各半）
    const steps = isSlope ? 1 : (rnd() < 0.3 ? 2 : 1);  // 台阶偶尔两级造「阶梯」
    for (let s = 0; s < steps && c < W - 10; s++) {
      if (dir === -1 && y > minY) { trans[c] = isSlope ? 'slopeUp' : 'stepUp'; surf[c] = y; y--; c++; }
      else if (dir === 1 && y < maxY) { trans[c] = isSlope ? 'slopeDown' : 'stepDown'; surf[c] = y; y++; c++; }
      else break;
      if (steps > 1 && s === 0 && c < W - 10) { surf[c] = y; trans[c] = 'flat'; c++; }  // 两级台阶间 1 格平
    }
  }
  while (c < W) { surf[c] = y; trans[c] = 'flat'; c++; } // 结尾平
  return { surf, trans };
}
// 把剖面写进网格：# 地表 / d 下方 / [ ] 斜坡；台阶就是相邻列 # 差 1 格
function emitTerrain(g, surf, trans, G, H, set) {
  const W = surf.length;
  for (let c = 0; c < W; c++) {
    const y = surf[c];
    for (let r = y; r < H; r++) set(r, c, '.');
    if (trans[c] === 'slopeUp') {
      set(y - 1, c, '[');
      for (let r = y; r < H; r++) set(r, c, 'd');
    } else if (trans[c] === 'slopeDown') {
      set(y, c, ']');
      for (let r = y + 1; r < H; r++) set(r, c, 'd');
    } else {
      set(y, c, '#');
      for (let r = y + 1; r < H; r++) set(r, c, 'd');
    }
  }
}

// 在关卡中放置单个机关元素（保证可玩：所有坑 ≤ 2 格，机关只铺在坚实地面）
function placeElement(kind, set, get, c, surf) {
  const g0 = surf[c] - 1;   // 站在地表上
  switch (kind) {
    case 'star':   set(g0, c, '*'); break;
    case 'spring': set(g0, c, '~'); set(surf[c] - 6, c, '*'); break;
    case 'cannon': set(g0, c, 'C'); set(surf[c] - 6, c, '*'); break;
    case 'spike':  set(g0, c, '^'); break;
    case 'laser':  set(g0, c, 'L'); break;
    case 'walker': set(g0, c, 'e'); break;
    case 'bull':   set(g0, c, 'n'); break;
    case 'fast':   set(g0, c, 'a'); break;
    case 'jumper': set(g0, c, 'j'); break;
    case 'spiky':  set(g0, c, 'k'); break;
    case 'armored': set(g0, c, 'h'); break;
    case 'large':  set(g0, c, 'A'); break;
    case 'charger': set(g0, c, 'q'); break;
    case 'tracker': set(g0, c, 't'); break;
    case 'pusher': set(g0, c, 'p'); break;
    case 'shooter': set(g0, c, 'z'); break;
    case 'flyer':  set(g0, c, 'y'); break;
    case 'turret': set(g0, c, 'Y'); break;
    case 'bomber': set(g0, c, 'b'); break;
    case 'unkillable': set(g0, c, 'l'); break;
    case 'mover':  set(surf[c] - 2, c, 'M'); set(surf[c] - 2, c + 4, 'T'); set(surf[c] - 4, c + 2, '*'); break;
    case 'plank':  set(surf[c] - 2, c, 'W'); set(surf[c] - 4, c, '*'); break;
    case 'box':    set(g0, c, 'B'); break;
    case 'water':  set(g0, c, 'w'); set(surf[c], c, 'J'); break;   // 水塘：水面 'w' + 水中水怪 'J'（食人鱼）
    case 'gear':   set(g0, c, 'G'); break;
    // Phase C 机关
    case 'fragile':  set(g0, c, '+'); set(surf[c] - 3, c, '*'); break;
    case 'conveyor': set(g0, c, '@'); break;
    case 'seesaw':   set(g0, c, 'V'); break;
    case 'fan':      set(g0, c, ':'); set(surf[c] - 4, c, '*'); break;
    case 'elevator': set(g0, c, 'E'); set(surf[c] - 7, c, '*'); break;
    case 'boulder':  set(g0, c, 'r'); break;
    case 'button':   set(g0, c, '!'); break;
    case 'pendulum': set(surf[c] - 3, c, ';'); break;
    case 'saw':      set(g0, c, ','); break;
    case 'explosive': set(g0, c, '?'); break;
    case 'key':      set(g0, c, '1'); break;
    case 'wideplank': set(g0, c, '_'); set(surf[c] - 3, c, '*'); break;
    case 'cart':      set(g0, c, '5'); break;
    case 'rotator':   set(surf[c] - 4, c, '2'); break;
  }
}
// 生成某篇章第 pos 关（pos 0..14；14 = Boss 关），返回完整宽度的关卡定义
/* ============================ Boss 竞技场构建（第 2~5 章末关） ============================ */
// 钢铁压路机：大型工厂地板 + 悬浮平台；直接踩头击杀，冲锋/倒车 + 天降铁块 + 召唤小方块
function arenaCrusher(g, set, W, G) {
  for (let c = 0; c < W; c++) { set(G, c, '#'); set(G + 1, c, 'd'); }
  for (const c of [22, 23, 24, 33, 34, 35, 56, 57, 58]) set(G - 1, c, '@');   // 三段短传送带
  set(G - 1, 1, 'P'); set(G - 1, 3, 'R');
  set(G - 1, 8, '*'); set(G - 1, 40, '*'); set(G - 1, 66, '*');
  for (const c of [12, 30, 48, 64]) { set(G - 3, c, '='); set(G - 3, c + 1, '='); set(G - 3, c + 2, '='); set(G - 4, c + 1, '*'); }
  set(G - 1, 62, 'o');
}
// 熔岩机械臂：地面 + 熔岩坑 + 按钮（喷冷却水冻臂）+ 易碎平台；中央固定 Boss
function arenaClaw(g, set, W, G) {
  for (let c = 0; c < W; c++) { set(G, c, '#'); set(G + 1, c, 'd'); }
  set(G - 1, 1, 'P'); set(G - 1, 3, 'R');
  set(G - 1, 8, '*'); set(G - 1, 14, '*');
  for (const c of [16, 17, 48, 49]) for (let r = G; r < G + 2; r++) set(r, c, '&');   // 熔岩坑（2 格宽，可跳）
  set(G - 1, 26, '!'); set(G - 1, 44, '!');                                          // 按钮：踩上冻臂
  set(G - 3, 32, '+'); set(G - 3, 38, '+');                                          // 易碎平台（阶段二下沉）
  set(G - 2, 35, 'o');
}
// 机械蜘蛛：大型地下洞穴 + 金属平台；直接踩头击杀，爬行 + 激光 + 召唤小蜘蛛
function arenaSpider(g, set, W, G) {
  for (let c = 0; c < W; c++) { set(G, c, '#'); set(G + 1, c, 'd'); }
  set(G - 1, 1, 'P'); set(G - 1, 3, 'R');
  set(G - 1, 8, '*'); set(G - 1, 40, '*'); set(G - 1, 66, '*');
  for (const c of [14, 32, 50, 68]) { set(G - 3, c, 'v'); set(G - 3, c + 1, 'v'); set(G - 3, c + 2, 'v'); set(G - 4, c + 1, '*'); }
  set(G - 1, 60, 'o');
}
// 方块博士：太空金属地板 + 传送带，巨型机器人悬浮半空
function arenaSquare(g, set, W, G) {
  for (let c = 0; c < W; c++) { set(G, c, '#'); set(G + 1, c, 'd'); set(G - 1, c, '@'); }
  set(G - 1, 1, 'P'); set(G - 1, 3, 'R');
  set(G - 1, 8, '*'); set(G - 1, 14, '*');
  set(G - 2, 34, 'o');
}

function genChapterLevel(ch, pos) {
  const H = 22, G = 20;
  const W = levelCols(pos);
  const g = Array.from({ length: H }, () => new Array(W).fill('.'));
  const set = (r, c, v) => { if (r >= 0 && r < H && c >= 0 && c < W) g[r][c] = v; };
  const get = (r, c) => (r >= 0 && r < H && c >= 0 && c < W) ? g[r][c] : '.';
  const rnd = rngFactory(ch.seed * 997 + pos * 131 + 17);
  const name = `${ch.label}篇 · 第 ${pos + 1} 关`;

  if (pos === 14) {
    // Boss 关：按章节分派到 4 个专属竞技场（森林→压路机 / 峡谷→机械臂 / 矿井→蜘蛛 / 宇宙→博士）
    const bossKind = { forest: 'crusher', canyon: 'claw', mine: 'spider', space: 'square' }[ch.key] || 'demon';
    if (bossKind === 'crusher') arenaCrusher(g, set, W, G);
    else if (bossKind === 'claw') arenaClaw(g, set, W, G);
    else if (bossKind === 'spider') arenaSpider(g, set, W, G);
    else if (bossKind === 'square') arenaSquare(g, set, W, G);
    else { for (let c = 0; c < W; c++) { set(G, c, '#'); set(G + 1, c, 'd'); } set(G - 1, 1, 'P'); set(G - 1, 60, 'o'); }
    return { name, theme: ch.theme, groundType: ch.groundType, rows: g.map(r => r.join('')), generated: true, bossKind };
  }

  // 起伏地形（斜坡 + 台阶混合）；洞穴大起伏、宇宙上下起伏更明显
  const range = ch.key === 'mine' ? 6 : ch.key === 'space' ? 4 : ch.key === 'canyon' ? 3 : 2;
  const { surf, trans } = terrainProfile(W, G, rnd, G - range, G);
  emitTerrain(g, surf, trans, G, H, set);

  set(surf[1] - 1, 1, 'P');
  set(surf[W - 3] - 1, W - 3, 'F');

  // 坑：2 格宽（始终可跳），只挖在平段、两侧等高；峡谷更多虚空
  const pits = new Set();
  const pitN = ch.key === 'canyon' ? Math.min(10, pos + 2) : Math.min(7, pos);
  let tries = 0;
  while (pits.size < pitN && tries < 500) {
    const c = 12 + Math.floor(rnd() * (W - 28));
    if (surf[c] !== surf[c + 1]) { tries++; continue; }                  // 坑内两侧同高
    if (surf[c - 1] !== surf[c] || surf[c + 2] !== surf[c + 1]) { tries++; continue; } // 坑沿平
    let ok = true;
    for (const p of pits) if (Math.abs(p - c) < 9) { ok = false; break; }
    if (!ok) { tries++; continue; }
    pits.add(c);
    tries++;
  }
  for (const c of pits) {
    for (let r = surf[c]; r < H; r++) { set(r, c, '.'); set(r, c + 1, '.'); }
  }
  const inPit = (c) => pits.has(c) || pits.has(c - 1);

  // 沿途机关（排列组合，只放在平段地表）
  const palette = chapterPalette(ch, pos);
  let c = 8;
  while (c < W - 16) {
    if (inPit(c) || inPit(c - 1)) { c += 2; continue; }
    if (trans[c] !== 'flat') { c++; continue; }
    const kind = weightedPick(palette, rnd);
    // 水面会在脚下挖坑，确保不与坑相邻导致 3 格以上不可跳
    if (kind === 'water' && (inPit(c + 1) || inPit(c + 2))) { c += 4; continue; }
    placeElement(kind, set, get, c, surf);
    c += 6 + Math.floor(rnd() * 7);
  }

  // 章节特色地形：森林树顶场景 / 峡谷深渊移动平台 / 洞穴高处石台 / 宇宙上下悬浮平台
  if (ch.key === 'forest') {
    // 树顶场景：固定每 6 格一个树冠（2 块连着的可通过木方块 'K'）+ 上方叶子 'Z'；平坦非坑处补纯木树干
    for (let tc = 14; tc < W - 16; tc += 6) {
      set(surf[tc] - 3, tc, 'K');
      set(surf[tc] - 3, tc + 1, 'K');
      set(surf[tc] - 4, tc, 'Z');
      set(surf[tc] - 4, tc + 1, 'Z');
      if (trans[tc] === 'flat' && !inPit(tc) && !inPit(tc - 1) && get(surf[tc], tc) === '#' && get(surf[tc] - 1, tc) === '.') {
        set(surf[tc] - 1, tc, 'u');
        set(surf[tc] - 2, tc, 'u');
      }
    }
  } else if (ch.key === 'space') {
    // 宇宙：错落的悬浮金属平台（上上下下）
    for (let sc = 18; sc < W - 18; sc += 12 + Math.floor(rnd() * 9)) {
      if (get(surf[sc] - 2, sc) === '.') set(surf[sc] - 2, sc, 'v');
      if (rnd() < 0.5 && get(surf[sc] - 5, sc + 2) === '.') set(surf[sc] - 5, sc + 2, 'W');
    }
  } else if (ch.key === 'mine') {
    // 矿井：高处悬垂石台，配合大起伏
    for (let mc = 20; mc < W - 20; mc += 16 + Math.floor(rnd() * 10)) {
      if (get(surf[mc] - 3, mc) === '.') set(surf[mc] - 3, mc, '=');
    }
  } else if (ch.key === 'canyon') {
    // 峡谷：在深渊上方铺移动平台（跨坑往返）+ 保留少量水塘
    for (const pc of pits) {
      const c = pc;
      if (surf[c] === surf[c + 1] && get(surf[c] - 2, c) === '.') {
        set(surf[c] - 2, c, 'M'); set(surf[c] - 2, c + 3, 'T');
      }
    }
    let wc = 0;
    for (let cc = 10; cc < W - 14 && wc < 3; cc++) {
      if (trans[cc] === 'flat' && !inPit(cc) && !inPit(cc - 1) && !inPit(cc + 1) && !inPit(cc + 2) && get(surf[cc] - 1, cc) === '.' && get(surf[cc], cc) === '#') {
        set(surf[cc] - 1, cc, 'w'); set(surf[cc], cc, 'w');
        wc++; cc += 10;
      }
    }
  }

  // 补充星星
  for (let k = 0; k < 5 + Math.floor(rnd() * 5); k++) {
    const c = 4 + Math.floor(rnd() * (W - 8));
    if (get(surf[c] - 1, c) === '.' && get(surf[c], c) !== '.') set(surf[c] - 1, c, '*');
    else if (get(surf[c] - 3, c) === '.') set(surf[c] - 3, c, '*');
  }

  // 复活点
  const placeCP = (frac) => {
    for (let c = Math.floor(W * frac); c < W - 4; c++) {
      if (trans[c] === 'flat' && get(surf[c], c) !== '.' && get(surf[c] - 1, c) === '.') { set(surf[c] - 1, c, 'R'); return; }
    }
  };
  placeCP(0.45);
  if (W >= 130) placeCP(0.72);

  // 地板统一为各篇章专属材质（森林苔藓 / 峡谷岩层 / 矿井石 / 宇宙金属），不再随机混铺冰泥沙木金

  return { name, theme: ch.theme, groundType: ch.groundType, rows: g.map(r => r.join('')), generated: true };
}

const LEVELS = [
  { name: '第 1 关 · 草原起步', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "......................*.....................",
    "......................M.....................",
    "............................................",
    "........................*....*..............",
    "..................*e.#####...#..............",
    "..................###ddddd###d#.............",
    "..............####ddddddddddddd.............",
    ".............#ddddddddddddddddd#........#...",
    ".P..........#ddddddddddddddddddd.......#d.F.",
    "############dddddddddddddddddddd#######dd###",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 2 关 · 第一门大炮', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "......................*.....................",
    "............................#...............",
    "............................d##.............",
    "...........................#ddd#...*........",
    "....*.....*................ddddd####........",
    "....#######...............#ddddddddd#.......",
    "....ddddddd#..............ddddddddddd#......",
    "...#dddddddd#............#dddddddddddd##....",
    ".P.dddddddddd##.e...B.C..ddddddddddddddd#.F.",
    "###dddddddddddd##########dddddddddddddddd###",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 3 关 · 小心火焰', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "..............***...........................",
    "..............###...........................",
    ".............#ddd#..........................",
    ".............ddddd..........................",
    "............#ddddd#.........................",
    "............ddddddd.........................",
    "...........#ddddddd#...................##...",
    "...........ddddddddd.................##dd...",
    ".P......L.#ddddddddd#####.e...e.....#dddd#F.",
    "##########ddddddddddddddd###########dddddd##",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 4 关 · 移动平台', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "...........................*................",
    "...........................M................",
    ".................................*..........",
    ".................*.......*...*..##..........",
    ".................M.......#######dd#.........",
    "........................#dddddddddd#........",
    "....#...............####dddddddddddd........",
    "...#d.............##dddddddddddddddd#.......",
    ".P.dd#.........e.#ddddddddddddddddddd.....F.",
    "###ddd###########dddddddddddddddddddd#######",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 5 关 · 起伏丘陵', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".................*..........................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".............*..................###.B.*.....",
    "....*.###...##.............*...#ddd######...",
    "....##ddd###dd##...........M...dddddddddd...",
    "....dddddddddddd#C............#dddddddddd#..",
    "...#ddddddddddddd###..........ddddddddddddF.",
    ".P.ddddddddddddddddd##.e..e..#dddddddddddd#.",
    "###ddddddddddddddddddd#######dddddddddddddd#",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 6 关 · 双炮齐鸣', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".................*..........................",
    "............................................",
    "............................................",
    "............................................",
    "...........................*................",
    "............................................",
    "..................***.......................",
    "..................###.......................",
    ".................Cddd#......................",
    ".................#dddd......................",
    ".................ddddd#.....................",
    "................#dddddd#....................",
    "................dddddddd#..C................",
    "...............#ddddddddd###................",
    ".P........e....ddddddddddddd##..n.........F.",
    "###############ddddddddddddddd##############",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 7 关 · 机关重重', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "......*.....................................",
    "......#...............................*.....",
    "......d#............................###.....",
    ".....#dd..............*........e.*.#ddd.....",
    ".....ddd#.............M.......#####dddd#....",
    "....#dddd....................#dddddddddd....",
    "....ddddd#.................##ddddddddddd#...",
    "...#dddddd..............###dddddddddddddd...",
    ".P.ddddddd#.....L..e..##ddddddddddddddddd#F.",
    "###dddddddd###########dddddddddddddddddddd##",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 8 关 · 火与炮', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "......................*.....................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".................*....................*.....",
    ".........*..L..####.................#####...",
    ".........######dddd##.Ce...........#ddddd...",
    "........#dddddddddddd####..........dddddd#..",
    ".......#ddddddddddddddddd#........#dddddddF.",
    ".P.####ddddddddddddddddddd#....e..dddddddd#.",
    "###dddddddddddddddddddddddd#######ddddddddd#",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 9 关 · 险象环生', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".......................*....................",
    ".......................##...................",
    ".......................dd#..................",
    "......................#ddd..................",
    "......................dddd#.**..............",
    ".....................#ddddd###..............",
    "....##...............ddddddddd##............",
    "...#dd#.............#ddddddddddd#...........",
    ".P.dddd#....L..L.e..ddddddddddddd##.e.....F.",
    "###ddddd############ddddddddddddddd#########",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 10 关 · 山路十八弯', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "........*..*.....*..........................",
    "........####............................#...",
    "........dddd............................d...",
    ".......#dddd#..........................#d#..",
    ".......dddddd..............*........*.#dddF.",
    "......#dddddd#.............M......####dddd#.",
    "......dddddddd..................##ddddddddd.",
    ".....#dddddddd#..............B.#ddddddddddd#",
    ".P.##dddddddddd.LC..e..e.n.####ddddddddddddd",
    "###dddddddddddd############ddddddddddddddddd",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 11 关 · 机关走廊', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".................*..........................",
    ".................M.........*................",
    "...........................M................",
    ".....................e*.....................",
    "...............*...#####....*...............",
    "...............####ddddd#####...........#...",
    ".............##dddddddddddddd#.........#d...",
    "............#ddddddddddddddddd#........dd#..",
    ".P.....L..##ddddddddddddddddddd..e....#dddF.",
    "##########ddddddddddddddddddddd#######dddd##",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 12 关 · 峰回路转', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "...........................*................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".................*.........C................",
    "...........................##...............",
    "...........................dd#..............",
    "..........................#ddd#.............",
    "....*...*.................ddddd#...*........",
    "....#####................#dddddd####........",
    "....ddddd##..............ddddddddddd#.......",
    "...#ddddddd#............#dddddddddddd#......",
    ".P.ddddddddd#.L.eC..e.n.dddddddddddddd###.F.",
    "###dddddddddd###########ddddddddddddddddd###",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 13 关 · 火焰迷宫', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".............***............................",
    ".............###............................",
    "............#ddd............................",
    "............dddd#...........................",
    "...........#ddddd.....*.....................",
    "...........dddddd#....M.....................",
    "..........#ddddddd...................####...",
    "..........dddddddd#.L...............#dddd...",
    ".P....L..#ddddddddd####...e..e..e..#ddddd#F.",
    "#########dddddddddddddd############ddddddd##",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 14 关 · 最终试炼', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "..............*.......*......*..............",
    "......................M......M..............",
    "................................*...........",
    "........................*.n*..B.#...........",
    "........................########d#..........",
    "...................e..##dddddddddd..........",
    "..................####dddddddddddd#.........",
    "...#.............#ddddddddddddddddd.........",
    ".P.d....L..e..C.#dddddddddddddddddd#......F.",
    "###d############dddddddddddddddddddd########",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
  { name: '第 15 关 · 魔王之战', theme: 'grass', groundType: 'grass', rows: [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "....................................................D...................................................................................................................................................",
    "....................................................D...................................................................................................................................................",
    "....................................................D...................................................................................................................................................",
    ".P..................*...................*.....S.....D.......o...........................................................................................................................................",
    "############################################",
    "dddddddddddddddddddddddddddddddddddddddddddd",
  ] },
];
// 追加四大篇章（森林/峡谷/矿井/宇宙），每章 15 关程序化排列组合生成
for (let ci = 1; ci < CHAPTERS.length; ci++) {
  for (let pos = 0; pos < CHAPTER_SIZE; pos++) LEVELS.push(genChapterLevel(CHAPTERS[ci], pos));
}
// 主线关卡逐关变长：手写的草原篇章逐关延长；生成的篇章已是完整宽度，跳过延伸
LEVELS.forEach((L, i) => { if (!L.generated) L.rows = extendLevelRows(L.rows, i, levelCols(i)); });

/* ============================ 载入关卡 ============================ */
function builtinDef(i) {
  if (!overrides[i]) return LEVELS[i];
  return { ...LEVELS[i], name: overrideNames[i] || LEVELS[i].name, rows: overrides[i] };
}
function loadLevel(i) {
  levelIndex = i;
  playingCustom = false; customDef = null;
  applyLevel(buildLevel(builtinDef(i)));
}
function loadCustom(def) {
  levelIndex = -1;
  playingCustom = true; customDef = def;
  applyLevel(buildLevel(def));
}
function currentLevelDef() {
  return playingCustom ? customDef : builtinDef(levelIndex);
}
function applyLevel(L) {
  theme = L.theme;
  solids = L.solids;
  boxes = L.boxes;
  enemies = L.enemies;
  spikes = L.spikes;
  springs = L.springs;
  water = L.water;
  stars = L.stars;
  movers = L.movers;
  planks = L.planks;
  cannons = L.cannons;
  lasers = L.lasers;
  checkpoints = L.checkpoints;
  gears = L.gears;
  switches = L.switches || [];
  doors = L.doors || [];
  destructibles = L.destructibles || [];
  fakes = L.fakes || [];
  oneways = L.oneways || [];
  boulders = L.boulders || [];
  seesaws = L.seesaws || [];
  buttons = L.buttons || [];
  conveyors = L.conveyors || [];
  pendulums = L.pendulums || [];
  fans = L.fans || [];
  fragiles = L.fragiles || [];
  saws = L.saws || [];
  explosives = L.explosives || [];
  keys = L.keys || [];
  ropes = L.ropes || [];
  waterTraps = [];
  pitSolids = [];
  projectiles = [];
  beams = [];
  lava = L.lava || [];
  conveyorBoost = 1;
  chase = null;
  respawn = null;             // 新关卡清空复活点
  surface = L.surface;
  flag = L.flag;
  killY = L.killY;
  mapH = L.mapH;
  starsGot = 0;
  scoreboardTotal = L.stars.length;
  ball = { x: L.spawn.x, y: L.spawn.y, vx: 0, vy: 0, r: BALL_R, grounded: false, angle: 0, inv: 0, cutLock: 0, groundMat: 'default' };
  vertySpeechUntil = 0; vertyNextSpeak = 4;
  wasInWater = false; rollCd = 0;
  lastGrounded = -1; lastJumpPress = -1;
  cam.x = clamp(ball.x - VIEW_W * 0.4, 0, Math.max(0, levelWidth() - VIEW_W));
  cam.y = clamp(ball.y - VIEW_H * 0.55, 0, Math.max(0, mapH - VIEW_H));
  particles = [];
  trail = [];
  jumpQueued = false;
}
let scoreboardTotal = 0;

/* ============================ 工具 ============================ */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function pointInSolid(px, py) {
  for (const s of solids) {
    if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return true;
  }
  return false;
}
// 破坏可破坏墙（重踩/爆炸）：从 solids 移除并播放碎裂
function breakDestructible(d) {
  if (d.dead) return;
  d.dead = true;
  solids = solids.filter(s => s !== d);
  spawnPuff(d.x + d.w / 2, d.y + d.h / 2, 16);
  sfx.stomp();
  shake = Math.max(shake, 4);
}
// 踩一下机关：打开所有门（把门固体从 solids 里移除，球与 Boss 都可通行）
function triggerSwitch(sw) {
  if (sw.on) return;
  sw.on = true;
  for (const d of doors) d.open = true;
  solids = solids.filter(s => s.type !== 'door');
  sfx.checkpoint();
  spawnPuff(sw.x + sw.w / 2, sw.y + sw.h / 2, 10);
}
// 挖掉 [x, x+w] 横向范围、y 及以下的所有固体，形成水坑/池塘，返回被移除的块（供恢复）
function carveSolids(x, y, w) {
  const removed = [], kept = [];
  for (const s of solids) {
    const l = Math.max(s.x, x), r = Math.min(s.x + s.w, x + w);
    if (r - l > 0 && s.y >= y - 1) {
      removed.push({ x: l, y: s.y, w: r - l, h: s.h, type: s.type });
      if (l > s.x) kept.push({ x: s.x, y: s.y, w: l - s.x, h: s.h, type: s.type });
      if (r < s.x + s.w) kept.push({ x: r, y: s.y, w: s.x + s.w - r, h: s.h, type: s.type });
    } else {
      kept.push(s);
    }
  }
  solids.length = 0; solids.push(...kept);
  pitSolids.push(...removed);      // 记入坑内固体，供 Boss 当作地面（免疫自己的坑）
  return removed;
}
function restoreSolids(pieces) {
  if (pieces && pieces.length) {
    solids.push(...pieces);
    // 从坑内固体中移除（回填）
    for (const p of pieces) {
      const i = pitSolids.indexOf(p);
      if (i >= 0) pitSolids.splice(i, 1);
    }
  }
}
// 小怪移到 nx（保持 y 不变）是否会与任何固体重叠（用于判断是否被箱子挤到墙上）
function enemyBlockedAt(e, nx) {
  const er = { x: nx - e.hw, y: e.y - e.hh, w: e.hw * 2, h: e.hh * 2 };
  for (const s of solids) {
    if (rectsOverlap(er, s)) return true;
  }
  return false;
}

/* —— 圆 vs AABB —— */
function circleRect(ball, box) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const hw = box.w / 2, hh = box.h / 2;
  const dx = ball.x - cx, dy = ball.y - cy;
  const px = clamp(dx, -hw, hw), py = clamp(dy, -hh, hh);
  let nx = dx - px, ny = dy - py;
  let d2 = nx * nx + ny * ny;
  if (d2 > ball.r * ball.r) return null;
  let nxu, nyu, pen;
  if (d2 < 1e-6) {
    const ox = hw - Math.abs(dx), oy = hh - Math.abs(dy);
    if (ox < oy) { nxu = dx > 0 ? 1 : -1; nyu = 0; pen = ox + ball.r; }
    else { nxu = 0; nyu = dy > 0 ? 1 : -1; pen = oy + ball.r; }
  } else {
    const d = Math.sqrt(d2);
    nxu = nx / d; nyu = ny / d; pen = ball.r - d;
  }
  return { nx: nxu, ny: nyu, pen };
}

/* —— 材质物理参数（冰面滑 / 泥地粘 / 沙地略慢） —— */
function materialProps(mat) {
  switch (mat) {
    case 'ice':  return { accel: 0.40, friction: 0.14, max: 1.00 };
    case 'mud':  return { accel: 0.50, friction: 2.6, max: 0.55 };
    case 'sand': return { accel: 0.62, friction: 1.7, max: 0.80 };
    default:     return { accel: 1, friction: 1, max: 1 };
  }
}

/* —— 斜坡 —— */
function slopeYAt(s, px) {
  const x = clamp(px, s.x, s.x + s.w);
  const u = (x - s.x) / s.w;
  return s.dir > 0 ? s.y + s.h - u * s.h : s.y + u * s.h;
}
function circleSegment(ball, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 < 1e-6 ? 0 : ((ball.x - ax) * abx + (ball.y - ay) * aby) / len2;
  t = clamp(t, 0, 1);
  const px = ax + abx * t, py = ay + aby * t;
  const dx = ball.x - px, dy = ball.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= ball.r * ball.r) return null;
  const d = Math.sqrt(d2) || 1e-4;
  return { nx: dx / d, ny: dy / d, pen: ball.r - d };
}
function resolveBallSlope(s) {
  // 斜边（坡面）+ 高侧竖直边（悬崖面），取穿透更深者
  let ax, ay, bx, by;
  if (s.dir > 0) { ax = s.x; ay = s.y + s.h; bx = s.x + s.w; by = s.y; }
  else { ax = s.x + s.w; ay = s.y + s.h; bx = s.x; by = s.y; }
  let c = circleSegment(ball, ax, ay, bx, by);
  const vx = s.dir > 0 ? s.x + s.w : s.x;
  const c2 = circleSegment(ball, vx, s.y, vx, s.y + s.h);
  if (c2 && (!c || c2.pen > c.pen)) c = c2;
  if (!c) return;
  ball.x += c.nx * c.pen;
  ball.y += c.ny * c.pen;
  const vn = ball.vx * c.nx + ball.vy * c.ny;
  if (vn < 0) { ball.vx -= vn * c.nx; ball.vy -= vn * c.ny; }
  if (c.ny < -0.25 && vn < 0) ball.grounded = true;
}

/* —— 单向门 —— */
function resolveBallOneway(o) {
  const c = circleRect(ball, o);
  if (!c) return;
  // 从允许方向来的球可穿过（不阻挡）
  if (o.allowDir > 0 && ball.x < o.x + o.w / 2) return;   // 只许→：球在左侧穿过
  if (o.allowDir < 0 && ball.x > o.x + o.w / 2) return;   // 只许←：球在右侧穿过
  ball.x += c.nx * c.pen;
  ball.y += c.ny * c.pen;
  const vn = ball.vx * c.nx + ball.vy * c.ny;
  if (vn < 0) { ball.vx -= vn * c.nx; ball.vy -= vn * c.ny; }
  if (c.ny < -0.4 && vn < 0) ball.grounded = true;
}

/* —— 地面检测（解决贴地静止时 grounded 恒为 false） —— */
function checkGrounded() {
  const feet = ball.y + ball.r;
  ball.groundMat = 'default';
  for (const s of solids) {
    if (s.slope) {
      if (ball.x > s.x - 2 && ball.x < s.x + s.w + 2) {
        const sy = slopeYAt(s, ball.x);
        if (feet >= sy - 3 && feet <= sy + 8) { ball.groundMat = 'default'; return true; }
      }
    } else if (ball.x > s.x - 2 && ball.x < s.x + s.w + 2 && feet >= s.y - 2 && feet <= s.y + 6) {
      ball.groundMat = s.material || 'default';
      return true;
    }
  }
  for (const b of boxes) {
    if (ball.x > b.x - 2 && ball.x < b.x + b.w + 2 && feet >= b.y - 2 && feet <= b.y + 6) { ball.groundMat = 'default'; return true; }
  }
  for (const m of movers) {
    if (ball.x > m.x - 2 && ball.x < m.x + m.w + 2 && feet >= m.y - 2 && feet <= m.y + 6) { ball.groundMat = 'default'; return true; }
  }
  for (const p of planks) {
    if (ball.x > p.x - 2 && ball.x < p.x + p.w + 2 && feet >= p.y - 2 && feet <= p.y + 6) { ball.groundMat = 'default'; return true; }
  }
  return false;
}

/* ============================ 物理更新 ============================ */
function ballInWater() {
  if (!ball || !water.length) return false;
  for (const w of water) {
    if (ball.x > w.x && ball.x < w.x + w.w && ball.y + ball.r * 0.4 > w.y && ball.y - ball.r < w.y + w.h) return true;
  }
  return false;
}
function updateBall(dt) {
  if (!ball) return;
  const prevGrounded = ball.grounded;
  const prevVy = ball.vy;
  ball.inv = Math.max(0, ball.inv - dt);
  ball.cutLock = Math.max(0, ball.cutLock - dt);
  ball.stepCd = Math.max(0, (ball.stepCd || 0) - dt);   // 自动跳跃 1 格的冷却

  // 开挂飞行：无重力、穿墙、上下左右自由移动
  if (fly) {
    const fspd = 620;
    let fx = 0, fy = 0;
    if (INPUT.left) fx -= fspd;
    if (INPUT.right) fx += fspd;
    if (INPUT.up) fy -= fspd;
    if (INPUT.down) fy += fspd;
    ball.vx = fx; ball.vy = fy;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.y = clamp(ball.y, 24, killY - 4);   // 限制在关卡范围内，避免飞出屏幕找不回来
    ball.grounded = false;
    ball.angle = ball.vx ? (ball.vx > 0 ? 0.06 : -0.06) : 0;
    if (Math.abs(fx) > 0.5 || Math.abs(fy) > 0.5) {
      if (flyTrail <= 0) { flyTrail = 0.03; addP(ball.x, ball.y, (Math.random() - .5) * 60, (Math.random() - .5) * 60, .5, 'rgba(255,240,150,.85)', 4); }
    }
    flyTrail = Math.max(0, flyTrail - dt);
    return;   // 跳过常规物理与碰撞
  }

  const mp = materialProps(ball.groundMat || 'default');
  const maxSpd = MAX_SPEED * mp.max;
  let target = 0;
  if (INPUT.left) target = -maxSpd;
  if (INPUT.right) target = maxSpd;
  // 松手时地面强力刹停，避免“太滑”的手感（材质影响：冰滑、泥粘、沙略慢）
  const k = (target === 0 && ball.grounded) ? GROUND_FRICTION * mp.friction : (ball.grounded ? GROUND_ACCEL * mp.accel : AIR_ACCEL);
  ball.vx += (target - ball.vx) * (1 - Math.exp(-k * dt));

  const held = INPUT.up;
  const gscale = (held && ball.vy < 0) ? 0.55 : 1;
  const gMul = theme === 'space' ? 0.85 : 1;   // 宇宙低重力：跳得更高、更飘
  const inWater = ballInWater();
  const waterG = inWater ? 0.45 : 1;           // 水下浮力：下沉明显变慢
  ball.vy += GRAVITY * gMul * gscale * waterG * dt;
  ball.vy = Math.min(ball.vy, inWater ? 260 : 1600);
  if (inWater && INPUT.up) { ball.vy -= 950 * dt; ball.vy = Math.max(ball.vy, -280); }   // 水下按住上 = 向上游

  // 跳跃判定（边缘触发 + 土狼时间 + 缓冲）
  if (ball.grounded) lastGrounded = time;
  if (jumpQueued) { lastJumpPress = time; jumpQueued = false; }
  const canCoyote = (time - lastGrounded) < COYOTE;
  const canBuffer = (time - lastJumpPress) < JUMP_BUFFER;
  if (canCoyote && canBuffer) {
    ball.vy = JUMP_VY * (theme === 'space' ? 1.1 : 1);
    ball.grounded = false;
    lastJumpPress = -1; lastGrounded = -1;
    sfx.jump();
    spawnDust(ball.x, ball.y + ball.r, 6);
  }
  if (!INPUT.up && ball.vy < -260 && ball.cutLock <= 0) ball.vy = -260;   // 弹簧/大炮弹射期间不截断高度

  const steps = 2;
  for (let s = 0; s < steps; s++) {
    const h = dt / steps;
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;
    ball.grounded = false;
    for (const b of solids) resolveBallSolid(b);
    for (const o of oneways) resolveBallOneway(o);
    for (const b of boxes) resolveBallBox(b);
    for (const m of movers) resolveBallMover(m, h);
    for (const p of planks) resolveBallPlank(p, h);
    for (const sp of springs) {
      const rect = { x: sp.x, y: sp.y - 14, w: sp.w, h: 14 };
      const c = circleRect(ball, rect);
      if (c && ball.vy > 0) {
        ball.vy = SPRING_VY; ball.grounded = false; ball.cutLock = 0.4;
        sp.anim = 0.35; sfx.spring();
        spawnDust(ball.x, sp.y, 8);
      }
    }
  }

  ball.grounded = checkGrounded();
  // 落地音：从空中落到地面时按冲击力发一声
  if (!prevGrounded && ball.grounded && prevVy > 0) sfx.land(prevVy);
  // 滚动音：贴地滚动时发出有节奏的轻响（速度越快越密集）
  if (ball.grounded && Math.abs(ball.vx) > 70) {
    rollCd -= dt;
    if (rollCd <= 0) { sfx.roll(ball.vx); rollCd = clamp(0.34 - Math.abs(ball.vx) / 420 * 0.22, 0.12, 0.34); }
  } else {
    rollCd = 0;
  }
  ball.angle += (ball.vx * dt) / ball.r;
}

function resolveBallSolid(b) {
  if (b.slope) { resolveBallSlope(b); return; }
  const c = circleRect(ball, b);
  if (!c) return;
  const sideHit = Math.abs(c.nx) > 0.5;
  const rise = (ball.y + ball.r) - b.y;
  // 自动跳跃 1 格：贴地前进撞到 ≤1 格高台阶，给一个真实小跳（完整抛物线，不被跳跃截断）
  if (sideHit && (ball.stepCd || 0) <= 0 && Math.abs(ball.vx) > 20 && ball.vy > -60 && rise > -2 && rise <= 44) {
    ball.vy = -480;
    ball.grounded = false;
    ball.cutLock = 0.22;   // 跳过「松手截断」，让自动跳保持完整弧线
    ball.stepCd = 0.42;
    return;
  }
  // 起跳翻越期间：1 格台阶不阻挡水平移动，让球带弧线翻过去（落下时才恢复碰撞，正好落在台阶上）
  if (sideHit && (ball.stepCd || 0) > 0 && ball.vy < 0 && rise <= 44) {
    return;
  }
  ball.x += c.nx * c.pen;
  ball.y += c.ny * c.pen;
  const vn = ball.vx * c.nx + ball.vy * c.ny;
  if (vn < 0) { ball.vx -= vn * c.nx; ball.vy -= vn * c.ny; }
  if (c.ny < -0.4 && vn < 0) ball.grounded = true;
}

function resolveBallMover(m, h) {
  const c = circleRect(ball, { x: m.x, y: m.y, w: m.w, h: m.h });
  if (!c) return;
  ball.x += c.nx * c.pen;
  ball.y += c.ny * c.pen;
  const vn = (ball.vx - m.vx) * c.nx + (ball.vy - m.vy) * c.ny;
  if (vn < 0) { ball.vx -= vn * c.nx; ball.vy -= vn * c.ny; }
  if (c.ny < -0.4) { ball.grounded = true; ball.x += m.vx * h; ball.y += m.vy * h; }   // 站在移动平台上被带着走（横向+纵向）
}

function resolveBallPlank(p, h) {
  if (ball.vy < 0) return;                          // 上升时从下方穿过
  const prevBottom = ball.y + ball.r - ball.vy * h; // 本步之前的球底位置
  if (prevBottom > p.y + 0.5) return;               // 之前已在木板下方，不吸附
  const c = circleRect(ball, p);
  if (!c) return;
  ball.x += c.nx * c.pen;
  ball.y += c.ny * c.pen;
  const vn = ball.vx * c.nx + ball.vy * c.ny;
  if (vn < 0) { ball.vx -= vn * c.nx; ball.vy -= vn * c.ny; }
  if (c.ny < -0.4) ball.grounded = true;
}

function resolveBallBox(b) {
  const c = circleRect(ball, b);
  if (!c) return;
  ball.x += c.nx * c.pen;
  ball.y += c.ny * c.pen;
  const vn = ball.vx * c.nx + ball.vy * c.ny;
  if (vn < 0) {
    b.vx -= c.nx * Math.abs(vn) * 0.5;   // 箱子朝远离球的方向移动（法线指向球，故取反）
    ball.vx -= vn * c.nx * 0.7;
    ball.vy -= vn * c.ny;
  }
  if (c.ny < -0.4 && vn < 0) ball.grounded = true;
}

function updateBox(b, dt) {
  b.vy += GRAVITY * dt;
  // 线性摩擦，箱子被推动后较快停下，不滑行
  const fr = 900 * dt;
  if (Math.abs(b.vx) <= fr) b.vx = 0;
  else b.vx -= Math.sign(b.vx) * fr;
  b.x += b.vx * dt;
  for (const s of solids) {
    if (rectsOverlap(b, s)) {
      if (b.vx > 0) b.x = s.x - b.w; else if (b.vx < 0) b.x = s.x + s.w;
      b.vx = 0;
    }
  }
  b.y += b.vy * dt;
  b.grounded = false;
  for (const s of solids) {
    if (rectsOverlap(b, s)) {
      if (b.vy > 0) { b.y = s.y - b.h; b.vy = 0; b.grounded = true; }
      else if (b.vy < 0) { b.y = s.y + s.h; b.vy = 0; }
    }
  }
  if (b.y > killY + 200) { b.y = killY - 100; b.vy = 0; }
}

function updateMovers(dt) {
  for (const m of movers) {
    m.t += dt;
    if (m.rotate) {
      // 旋转平台：平台中心绕支点 (px,py) 匀速圆周运动，携带站立的球
      m.angle += m.spin * dt;
      const cx = m.px + Math.cos(m.angle) * m.rad;
      const cy = m.py + Math.sin(m.angle) * m.rad;
      const nx = cx - m.w / 2, ny = cy - m.h / 2;
      m.vx = (nx - m.x) / dt;
      m.vy = (ny - m.y) / dt;
      m.x = nx; m.y = ny;
      continue;
    }
    if (m.elevator) {
      // 电梯：在 y0（底）与 y0-range（顶）之间上下往返
      const ny = m.y0 - Math.abs(Math.sin(m.t * m.speed + m.phase)) * m.range;
      m.vy = (ny - m.y) / dt;
      m.y = ny; m.vx = 0;
      continue;
    }
    if (m.tx >= 0) {
      // 自定义路径：在 (x0,y0) 与 (x1,y1) 之间匀速往返
      const dx = m.x1 - m.x0, dy = m.y1 - m.y0;
      const L = Math.hypot(dx, dy);
      let nx = m.x0, ny = m.y0;
      if (L >= 1) {
        let u = (m.t * m.pathSpeed) % (2 * L) / L;
        if (u > 1) u = 2 - u;
        nx = m.x0 + dx * u; ny = m.y0 + dy * u;
      }
      m.vx = (nx - m.x) / dt;
      m.vy = (ny - m.y) / dt;
      m.x = nx; m.y = ny;
    } else {
      const nx = m.x0 + Math.sin(m.t * m.speed + m.phase) * m.range;
      m.vx = (nx - m.x) / dt;
      m.x = nx; m.vy = 0;
    }
  }
}

/* ============================ Phase C 机关：物理/交互 ============================ */
// 压力判定：球/箱子/石球是否压在按钮上
function isPressingButton(b) {
  if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y - 2 && ball.y + ball.r < b.y + b.h + 20) return true;
  for (const bx of boxes) if (rectsOverlap(bx, { x: b.x - 2, y: b.y - 6, w: b.w + 4, h: b.h + 12 })) return true;
  for (const bd of boulders) if (bd.x > b.x && bd.x < b.x + b.w && bd.y + bd.r > b.y - 2 && bd.y + bd.r < b.y + b.h + 20) return true;
  return false;
}
function updateButtons(dt) {
  for (const b of buttons) {
    if (!b.on && isPressingButton(b)) {
      b.on = true;
      for (const d of doors) d.open = true;
      solids = solids.filter(s => s.type !== 'door');
      sfx.checkpoint(); spawnPuff(b.x + b.w / 2, b.y, 8);
    }
  }
}
// 传送带：站在上面给恒定水平速度（球 + 箱子）
function updateConveyors(dt) {
  for (const cv of conveyors) {
    if (ball.x + ball.r > cv.x && ball.x - ball.r < cv.x + cv.w && ball.y + ball.r > cv.y - 2 && ball.y + ball.r < cv.y + cv.h + 6) {
      ball.vx += (cv.dir * 250 * conveyorBoost - ball.vx) * (1 - Math.exp(-6 * dt));
    }
    for (const b of boxes) {
      if (b.x + b.w > cv.x && b.x < cv.x + cv.w && Math.abs(b.y + b.h - cv.y) < 8 && b.grounded) {
        b.vx += (cv.dir * 150 * conveyorBoost - b.vx) * (1 - Math.exp(-5 * dt));
      }
    }
  }
}
// 风扇：区域内持续向上吹力（球 + 箱子 + 石球）
function updateFans(dt) {
  for (const f of fans) {
    f.phase += dt;
    if (!f.on) continue;
    const cx = f.x + f.w / 2;
    const blow = (ox, oy, mass) => {
      if (Math.abs(ox - cx) < f.w / 2 + 40 && oy > f.y - f.h * 1.6 && oy < f.y + f.h / 2 + 10) return true;
      return false;
    };
    if (blow(ball.x, ball.y, 1)) ball.vy -= f.force * dt;
    for (const b of boxes) if (blow(b.x + b.w / 2, b.y, 1.4)) b.vy -= f.force * 0.55 * dt;
    for (const b of boulders) if (blow(b.x, b.y, 2)) b.vy -= f.force * 0.4 * dt;
  }
}
// 跷跷板：杠杆倾斜 + 支撑/弹射站在板面上的球
function updateSeesaws(dt) {
  for (const s of seesaws) {
    let torque = 0;
    torque += (ball.x - s.pivotX) * 1;
    for (const b of boxes) torque += (b.x + b.w / 2 - s.pivotX) * 1.5;
    for (const b of boulders) torque += (b.x - s.pivotX) * 2;
    const target = clamp(torque * 0.005, -0.28, 0.28);
    const k = 9, damp = 5;
    s.angleVel += (target - s.angle) * k * dt - s.angleVel * damp * dt;
    s.angle += s.angleVel * dt;
    if (s.angle > 0.5) s.angle = 0.5;
    if (s.angle < -0.5) s.angle = -0.5;
    // 支撑站在板面上的球
    const halfW = s.w / 2;
    if (ball.vy >= 0 && Math.abs(ball.x - s.pivotX) < halfW + ball.r) {
      const surfY = s.pivotY + Math.tan(s.angle) * (ball.x - s.pivotX);
      const prevBottom = ball.y + ball.r - ball.vy * dt;
      if (prevBottom <= surfY + 1 && ball.y + ball.r >= surfY - 2) {
        ball.y = surfY - ball.r;
        ball.grounded = true;
        if (ball.vy > 0) ball.vy = 0;
        // 翘起端快速弹射
        const side = ball.x - s.pivotX;
        const rising = (s.angleVel > 1.1 && side < 0) || (s.angleVel < -1.1 && side > 0);
        if (rising) ball.vy = -Math.min(680, Math.abs(s.angleVel) * 300 + 260);
      }
    }
  }
}
// 石球：重力 + 碰撞 + 与球互相推动 + 压死小怪 + 压按钮
function updateBoulders(dt) {
  for (const b of boulders) {
    b.vy += GRAVITY * dt;
    const fr = 400 * dt;
    if (Math.abs(b.vx) <= fr) b.vx = 0; else b.vx -= Math.sign(b.vx) * fr;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.grounded = false;
    for (const s of solids) {
      if (s.slope) continue;
      const c = circleRect(b, s);
      if (!c) continue;
      b.x += c.nx * c.pen; b.y += c.ny * c.pen;
      const vn = b.vx * c.nx + b.vy * c.ny;
      if (vn < 0) { b.vx -= vn * c.nx; b.vy -= vn * c.ny; }
      if (c.ny < -0.4) b.grounded = true;
    }
    if (ball) {
      const dx = ball.x - b.x, dy = ball.y - b.y;
      const d = Math.hypot(dx, dy);
      const rr = ball.r + b.r;
      if (d < rr && d > 0.001) {
        const nx = dx / d, ny = dy / d, ov = rr - d;
        b.x -= nx * ov * 0.55; b.y -= ny * ov * 0.55;
        ball.x += nx * ov * 0.45; ball.y += ny * ov * 0.45;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn > 0) { b.vx += nx * vn * 0.5; b.vy += ny * vn * 0.25; }
      }
    }
    for (const e of enemies) {
      if (e.dead || e.type === 'boss') continue;
      const rr = b.r + Math.min(e.hw, e.hh);
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy < rr * rr && b.y < e.y - 2) { e.dead = true; spawnPuff(e.x, e.y, 10); sfx.stomp(); }
    }
    if (b.y > killY + 200) { b.y = killY - 100; b.vy = 0; b.vx = 0; }
  }
  boulders = boulders.filter(b => !b.spent);
}
// 摆锤：绕锚点来回摆动，摆球碰到即受伤
function updatePendulums(dt) {
  for (const p of pendulums) {
    p.angle += dt * p.omega;                       // 相位累积
    const a = Math.sin(p.angle) * 1.0;             // 左右摆动 ±1 rad
    p.bx = p.ax + Math.sin(a) * p.len;
    p.by = p.ay + Math.cos(a) * p.len;
    const dx = ball.x - p.bx, dy = ball.y - p.by;
    const rr = ball.r + p.r;
    if (dx * dx + dy * dy < rr * rr && ball.inv <= 0) hurt();
  }
}
// 旋转锯片
function updateSaws(dt) {
  for (const s of saws) {
    s.angle += s.spin * dt;
    const dx = ball.x - s.x, dy = ball.y - s.y;
    const rr = ball.r + s.r;
    if (dx * dx + dy * dy < rr * rr && ball.inv <= 0) hurt();
  }
}
// 易碎平台：站上计时碎裂（单向平台）
function updateFragiles(dt) {
  for (const f of fragiles) {
    const onTop = ball.vy >= 0 && ball.x > f.x - ball.r && ball.x < f.x + f.w + ball.r &&
                  ball.y + ball.r > f.y - 2 && ball.y + ball.r < f.y + f.h + 6;
    if (onTop) {
      f.life += dt;
      if (f.life > 0.4) { f.broken = true; spawnPuff(f.x + f.w / 2, f.y, 10); sfx.stomp(); shake = Math.max(shake, 3); }
    } else {
      f.life = Math.max(0, f.life - dt * 2);
    }
    // 未碎时支撑球（可跳上，可从下方穿过）
    if (!f.broken && onTop) {
      const prevBottom = ball.y + ball.r - ball.vy * dt;
      if (prevBottom <= f.y + 1) { ball.y = f.y - ball.r; ball.grounded = true; if (ball.vy > 0) ball.vy = 0; }
    }
  }
  fragiles = fragiles.filter(f => !f.broken);
}
// 爆炸桶：被球撞/被射弹击 → 引信倒计时 → 范围爆炸
function explodeBarrel(ex) {
  if (ex.dead) return;
  ex.dead = true;
  shake = Math.max(shake, 12);
  sfx.explode();
  spawnPuff(ex.x + ex.w / 2, ex.y + ex.h / 2, 34);
  const cx = ex.x + ex.w / 2, cy = ex.y + ex.h / 2, R = 120;
  const box = { x: cx - R, y: cy - R, w: R * 2, h: R * 2 };
  for (const d of destructibles) if (!d.dead && rectsOverlap(box, d)) breakDestructible(d);
  for (const e of enemies) {
    if (e.dead || e.type === 'boss') continue;
    const dx = e.x - cx, dy = e.y - cy;
    if (dx * dx + dy * dy < R * R) { e.dead = true; spawnPuff(e.x, e.y, 12); }
  }
  const dx = ball.x - cx, dy = ball.y - cy;
  if (dx * dx + dy * dy < R * R) { if (ball.inv <= 0) hurt(); }
}
function updateExplosives(dt) {
  for (const ex of explosives) {
    if (ex.dead) continue;
    if (ex.fuse > 0) {
      ex.fuse -= dt;
      if (ex.fuse <= 0) explodeBarrel(ex);
      continue;
    }
    if (circleRect(ball, ex)) { ex.fuse = 0.3; continue; }
    for (const p of projectiles) {
      if (p.dead) continue;
      if (p.x > ex.x - p.r && p.x < ex.x + ex.w + p.r && p.y > ex.y - p.r && p.y < ex.y + ex.h + p.r) { ex.fuse = 0.3; p.dead = true; }
    }
  }
  explosives = explosives.filter(e => !e.dead);
}
// 钥匙：收集即开门（与机关门联动）
function updateKeys() {
  for (const k of keys) {
    if (k.taken) continue;
    const dx = ball.x - k.x, dy = ball.y - k.y;
    if (dx * dx + dy * dy < (ball.r + 18) * (ball.r + 18)) {
      k.taken = true;
      for (const d of doors) d.open = true;
      solids = solids.filter(s => s.type !== 'door');
      sfx.coin(); spawnSparkle(k.x, k.y, 8);
    }
  }
}

// 环境伤害也会消灭敌人与 Boss：碰到火焰/水/熔岩/尖刺/锯片/齿轮即死
function updateHazardDeaths() {
  const er = (e) => ({ x: e.x - e.hw, y: e.y - e.hh, w: e.hw * 2, h: e.hh * 2 });
  const hitBy = (e) => {
    const box = er(e);
    for (const lz of lasers) {
      if (((time + lz.phase) % lz.period) >= lz.period * 0.5) continue;      // 火焰未喷出
      if (rectsOverlap(box, { x: lz.x + 4, y: lz.y - 4, w: lz.w - 8, h: lz.h })) return true;
    }
    for (const w of water) if (e.x > w.x && e.x < w.x + w.w && e.y + e.hh > w.y && e.y - e.hh < w.y + w.h) return true;
    for (const lv of lava) if (rectsOverlap(box, lv)) return true;
    for (const sp of spikes) if (rectsOverlap(box, { x: sp.x + 4, y: sp.y - 14, w: sp.w - 8, h: 14 })) return true;
    for (const s of saws) { const dx = e.x - s.x, dy = e.y - s.y, rr = s.r + Math.min(e.hw, e.hh); if (dx * dx + dy * dy < rr * rr) return true; }
    for (const g of gears) { if (g.dead) continue; const dx = e.x - g.x, dy = e.y - g.y, rr = g.r + Math.min(e.hw, e.hh); if (dx * dx + dy * dy < rr * rr) return true; }
    return false;
  };
  for (const e of enemies) {
    if (e.dead || !hitBy(e)) continue;
    if (e.type === 'boss') damageBoss(e, e.x, e.y);   // Boss 掉血（尊重受击无敌帧，血尽自然死亡/进阶段）
    else { e.dead = true; spawnPuff(e.x, e.y, 12); sfx.stomp(); }
  }
  enemies = enemies.filter(e => !e.dead);
}

function updateEnemy(e, dt) {
  if (e.dead) return;
  if (e.hitFlash) e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.wasGrounded = e.grounded;

  // 新 Boss（非魔王/非压路机）移动完全由各自的 updateBoss* 接管，跳过通用物理
  if (e.type === 'boss' && e.bossKind && e.bossKind !== 'demon' && e.bossKind !== 'crusher' && e.bossKind !== 'spider') return;
  // 机械蜘蛛爬墙阶段：移动由 updateBossSpider 自定义，跳过重力/地面物理
  if (e.type === 'boss' && e.bossKind === 'spider' && e.climbing) return;

  const flying = e.type === 'flyer' || e.type === 'bomber' || e.type === 'piranha';
  const stationary = e.type === 'turret';

  // 飞行怪：无重力、正弦上下浮游；炮塔：定点不动
  if (flying) {
    e.phase += dt;
    e.y = e.baseY + Math.sin(e.phase * 2.4) * 22;
    e.vy = 0;
  } else if (!stationary) {
    e.vy += GRAVITY * dt;
  }

  let spd = e.speed;
  if (e.type === 'bull') {
    // 看到玩家就加速冲撞
    const dx = ball.x - e.x;
    if (Math.abs(dx) < 260 && Math.abs(ball.y - e.y) < 120) { e.dir = dx > 0 ? 1 : -1; spd = e.speed * 1.9; }
  } else if (e.type === 'charger') {
    // 冲刺怪：见玩家后直线冲刺一段
    const dx = ball.x - e.x;
    if (Math.abs(dx) < 300 && Math.abs(ball.y - e.y) < 120) { e.dir = dx > 0 ? 1 : -1; e.chargeT = 1.2; }
    e.chargeT = Math.max(0, e.chargeT - dt);
    spd = e.chargeT > 0 ? e.speed * 3 : e.speed;
  } else if (e.type === 'tracker') {
    // 追踪怪：持续朝玩家方向转向
    e.turnT -= dt;
    if (e.turnT <= 0) { e.dir = ball.x > e.x ? 1 : -1; e.turnT = 0.4; }
  } else if (e.type === 'boss') {
    if (e.stun > 0) { e.stun -= dt; spd = 0; }      // 眩晕期间原地不动（预留）
    else {
      e.charge = e.charge - dt;
      if (e.charge <= 0) {
        const dx = ball.x - e.x;
        if (Math.abs(dx) < 360 && Math.abs(ball.y - e.y) < 130) { e.charge = 1.7; e.dir = dx > 0 ? 1 : -1; }
      }
      spd = e.charge > 0 ? e.speed * 2.5 : e.speed;
    }
  } else if (e.type === 'turret') {
    e.aim = Math.atan2(ball.y - e.y, ball.x - e.x);   // 炮塔瞄准玩家
  }
  e.vx = e.dir * spd;

  // 跳跃怪：定时跳起
  if (e.type === 'jumper') {
    e.jumpCd -= dt;
    if (e.jumpCd <= 0 && e.grounded) { e.jumpCd = 1.8; e.vy = -620; e.grounded = false; }
  }

  // 射弹怪 / 炮塔：定时发射；掉炸弹怪：定时丢炸弹
  if (e.type === 'shooter' || e.type === 'turret') {
    e.shootCd -= dt;
    if (e.shootCd <= 0) { e.shootCd = e.type === 'turret' ? 2 : 2.4; fireProjectile(e); }
  }
  if (e.type === 'bomber') {
    e.dropCd -= dt;
    if (e.dropCd <= 0) { e.dropCd = 2.2; dropBomb(e); }
  }

  // 推箱怪：碰到箱子给它水平冲量
  if (e.type === 'pusher') {
    const er = { x: e.x - e.hw, y: e.y - e.hh, w: e.hw * 2, h: e.hh * 2 };
    for (const b of boxes) if (rectsOverlap(er, b)) b.vx = e.dir * 130;
  }

  if (flying || stationary) {
    // 飞行/炮塔：仅水平移动 + 撞墙转向（炮塔 speed=0 原地不动）
    e.x += e.vx * dt;
    for (const s of solids) {
      if (e.y + e.hh > s.y + 2 && e.y - e.hh < s.y + s.h - 2 && e.x > s.x - e.hw && e.x < s.x + s.w + e.hw) {
        if (e.vx > 0) { e.x = s.x - e.hw; e.dir = -1; }
        else if (e.vx < 0) { e.x = s.x + s.w + e.hw; e.dir = 1; }
      }
    }
    if (e.y > killY + 100) e.dead = true;
    return;
  }

  // 先垂直（重力/落地），再水平，避免大体积 Boss 出生即嵌地触发误判
  e.y += e.vy * dt;
  e.grounded = false;
  for (const s of solids) {
    if (e.x > s.x - e.hw && e.x < s.x + s.w + e.hw && e.y > s.y - e.hh && e.y < s.y + s.h + e.hh) {
      if (e.vy > 0) { e.y = s.y - e.hh; e.vy = 0; e.grounded = true; }
      else if (e.vy < 0) { e.y = s.y + s.h + e.hh; e.vy = 0; }
    }
  }
  // Boss 与箱子、陷阱坑(坑内固体)垂直碰撞：落在箱顶 / 撞到箱底。
  // 放在水平移动前判定，避免侧向接近箱子时被误「顶」到箱顶（从侧面穿模）。
  if (e.type === 'boss') {
    for (const b of boxes.concat(pitSolids)) {
      if (e.x > b.x - e.hw && e.x < b.x + b.w + e.hw && e.y > b.y - e.hh && e.y < b.y + b.h + e.hh) {
        if (e.vy > 0) { e.y = b.y - e.hh; e.vy = 0; e.grounded = true; }
        else if (e.vy < 0) { e.y = b.y + b.h + e.hh; e.vy = 0; }
      }
    }
  }
  e.x += e.vx * dt;
  for (const s of solids) {
    if (e.y + e.hh > s.y + 2 && e.y - e.hh < s.y + s.h - 2 && e.x > s.x - e.hw && e.x < s.x + s.w + e.hw) {
      if (e.vx > 0) { e.x = s.x - e.hw; e.dir = -1; }
      else if (e.vx < 0) { e.x = s.x + s.w + e.hw; e.dir = 1; }
    }
  }
  // Boss 与箱子、陷阱坑水平碰撞：被箱侧挡住，不能穿模
  if (e.type === 'boss') {
    for (const b of boxes.concat(pitSolids)) {
      if (e.y + e.hh > b.y + 2 && e.y - e.hh < b.y + b.h - 2 && e.x > b.x - e.hw && e.x < b.x + b.w + e.hw) {
        if (e.vx > 0) { e.x = b.x - e.hw; e.dir = -1; }
        else if (e.vx < 0) { e.x = b.x + b.w + e.hw; e.dir = 1; }
      }
    }
  }
  if (e.grounded) {
    const probeX = e.x + (e.dir > 0 ? e.hw + 3 : -e.hw - 3);
    const probeY = e.y + e.hh + 6;
    if (!pointInSolid(probeX, probeY)) e.dir *= -1;
  }
  if (e.y > killY + 100) e.dead = true;
}

/* —— 敌人射弹 / 炸弹 —— */
function fireProjectile(e) {
  const dx = ball.x - e.x, dy = ball.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const spd = 260;
  projectiles.push({ x: e.x, y: e.y - e.hh * 0.5, vx: dx / d * spd, vy: dy / d * spd, r: 6, life: 4, dead: false });
  sfx.summon();
}
function dropBomb(e) {
  // 掉炸弹怪：丢下会下落、落地旋转、碰到受伤的“炸弹”（复用齿轮实体）
  gears.push({ x: e.x, y: e.y + e.hh, r: 20, angle: 0, spin: 2, vy: 0, life: 2.5, dead: false });
}
function updateProjectiles(dt) {
  for (const p of projectiles) {
    if (p.dead) continue;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const s of solids) {
      if (p.x > s.x - p.r && p.x < s.x + s.w + p.r && p.y > s.y - p.r && p.y < s.y + s.h + p.r) {
        if (s.type === 'destructible') breakDestructible(s);   // 激光/射弹可断支撑柱（蜘蛛 Boss）
        p.dead = true; break;
      }
    }
    if (p.dead) continue;
    const dx = p.x - ball.x, dy = p.y - ball.y;
    if (dx * dx + dy * dy < (p.r + ball.r) * (p.r + ball.r)) {
      if (ball.inv <= 0) hurt();
      p.dead = true;
    }
    if (p.life <= 0 || p.x < cam.x - 80 || p.x > cam.x + VIEW_W + 80 || p.y > killY + 40) p.dead = true;
  }
  projectiles = projectiles.filter(p => !p.dead);
}
function drawProjectile(p, t) {
  ctx.save();
  ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, 7); ctx.fill();
  ctx.restore();
}

/* Boss 技能：黄眼(可打一下→立刻红眼) + 一直跳跃 + 每 30 秒下落一个小怪 + 召唤陷阱水 */
function updateBossDemon(e, dt) {
  // ⓪ 眼睛状态机：红眼(倒计时) → 警告闪烁(2 秒) → 黄眼(可被攻击) → 被踩头后延迟 0.5 秒再切回红眼
  if (e.eyeMode === 'red') {
    e.eyeT += dt;
    if (e.eyeT >= BOSS_EYE_CYCLE - BOSS_WARN) { e.eyeMode = 'warn'; e.eyeT = 0; sfx.alert(); }
  } else if (e.eyeMode === 'warn') {
    e.eyeT += dt;
    if (e.eyeT >= BOSS_WARN) { e.eyeMode = 'yellow'; e.eyeT = 0; e.eyeDelay = 0; sfx.vuln(); }
  } else if (e.eyeMode === 'yellow' && e.eyeDelay > 0) {
    e.eyeDelay -= dt;
    if (e.eyeDelay <= 0) { e.eyeMode = 'red'; e.eyeT = 0; }
  }

  // ① 一直跳跃：周期性地跳向玩家，落地时震屏并震伤附近玩家（黄眼时不跳，方便玩家踩头）
  e.jumpCd -= dt;
  if (e.jumpCd <= 0 && e.grounded && !e.smashing && e.eyeMode !== 'yellow') {
    e.jumpCd = 2.4;
    const dx = ball.x - e.x;
    e.dir = dx >= 0 ? 1 : -1;
    e.vy = -820;
    e.smashing = true;
    e.grounded = false;
    sfx.spring();
  }
  if (e.smashing && e.grounded && !e.wasGrounded) {
    e.smashing = false;
    shake = Math.max(shake, 10);
    sfx.stomp();
    spawnDust(e.x, e.y + e.hh, 22);
    if (ball.inv <= 0 && Math.abs(ball.x - e.x) < 130 && Math.abs(ball.y - e.y) < 110) hurt();
  }

  // ② 每 30 秒在三个石板的位置下落一个小怪（从空中掉到石板上）
  e.dropCd -= dt;
  if (e.dropCd <= 0) {
    e.dropCd = 30;
    const stones = solids.filter(s => s.type === 'stone');
    if (stones.length) {
      const st = stones[(Math.random() * stones.length) | 0];
      enemies.push(mkEnemy(st.x + st.w / 2, st.y - 120, 'walker'));
      sfx.summon();
    }
  }

  // ③ 召唤陷阱水：在玩家脚底生成，前 3 秒有预警提示
  e.waterCd -= dt;
  if (e.waterCd <= 0) {
    e.waterCd = 7.5;
    sfx.summon();
    waterTraps.push({ x: ball.x - 55, y: ball.y + ball.r, w: 110, warn: 3, life: 4 });
  }

  // ④ 齿轮雨：每隔 5 秒从天上掉落一个齿轮到玩家附近（3 秒后自毁）
  e.gearCd -= dt;
  if (e.gearCd <= 0) {
    e.gearCd = 5;
    sfx.summon();
    gears.push({ x: ball.x + (Math.random() - 0.5) * 320, y: -40, r: 26, angle: 0, spin: 3, vy: 0, life: 3, dead: false });
  }
}

/* Boss 更新分发：魔王走原逻辑；新 Boss 各走各的 */
function updateBoss(e, dt) {
  if (e.bossKind === 'crusher') return updateBossCrusher(e, dt);
  if (e.bossKind === 'claw') return updateBossClaw(e, dt);
  if (e.bossKind === 'spider') return updateBossSpider(e, dt);
  if (e.bossKind === 'square') return updateBossSquare(e, dt);
  return updateBossDemon(e, dt);
}

/* Boss 与球接触：魔王走原逻辑；新 Boss 统一「vulnerable 踩核心扣血 / 踩头弹起 / 侧碰受伤」 */
function bossTouchPlayer(e, dx, dy, onTop) {
  if (e.bossKind === 'demon') {
    if (bossVulnerable(e)) {
      if (onTop) {
        if (e.hitFlash <= 0) {
          e.hp--; e.hitFlash = 0.5;
          e.eyeDelay = 0.5;
          sfx.stomp(); spawnPuff(e.x, e.y - e.hh, 14);
          if (e.hp <= 0) { e.dead = true; spawnPuff(e.x, e.y, 30); sfx.win(); winLevel(); }
        }
        ball.vy = -640;
      } else {
        ball.vx = (dx >= 0 ? 1 : -1) * 220; ball.vy = -220;
      }
    } else if (onTop) {
      ball.vy = -500; sfx.stomp(); spawnPuff(e.x, e.y, 5);
    } else if (ball.inv <= 0) {
      hurt();
    }
    return;
  }
  if (bossVulnerable(e) && onTop) {
    damageBoss(e, e.x, e.y - e.hh);
    ball.vy = -600;
  } else if (onTop) {
    ball.vy = -500; sfx.stomp(); spawnPuff(e.x, e.y - e.hh, 5);
  } else if (ball.inv <= 0) {
    hurt();
  }
}

/* ============================ 新 Boss 更新 ============================ */

/* —— 钢铁压路机 Iron Crusher：冲锋/倒车 + 天降铁块 + 召唤小方块；直接踩头击杀 —— */
function updateBossCrusher(e, dt) {
  const phase2 = e.hp <= 2;
  conveyorBoost = Math.min(2.6, conveyorBoost + dt * 0.045);
  if (phase2) {
    // 半血后：连续冲锋两次（冲完稍顿，再冲第二次）
    if (e.dashCd === undefined) e.dashCd = 2.2;
    e.dashCd -= dt;
    if (e.dashCd <= 0 && !(e.stun > 0)) {
      e.dashCd = 3.4;
      e.charge = 0.9;          // 第 1 冲
      e.charge2 = 1.05;        // 稍顿后接第 2 冲
      e.dir = ball.x >= e.x ? 1 : -1;
      sfx.alert();
    }
    if (e.charge2 !== undefined && e.charge2 > 0) {
      e.charge2 -= dt;
      if (e.charge2 <= 0) { e.charge2 = undefined; e.charge = 0.9; sfx.alert(); }
    }
  } else {
    // 半血前：随机倒车
    if (e.revCd === undefined) e.revCd = 3;
    e.revCd -= dt;
    if (e.revCd <= 0 && !(e.stun > 0)) { e.revCd = 2.2 + Math.random() * 2; e.dir *= -1; sfx.alert(); }
  }
  // 直接可踩：踩头即扣血
  e.vulnerable = true;
  // 召唤重甲铁兵（限制场上数量，最多 3 只）——踩 3 次才死，有存在感但不淹没玩家
  if (e.minionCd === undefined) e.minionCd = 1.2;
  e.minionCd -= dt;
  if (e.minionCd <= 0) {
    e.minionCd = 2.6;
    const live = enemies.filter(x => !x.dead && x.type !== 'boss').length;
    if (live < 3) {
      enemies.push(mkEnemy(e.x + (e.dir > 0 ? e.hw + 34 : -e.hw - 34), e.y + e.hh - 18, 'armored'));
      sfx.summon();
    }
  }
  // 天降铁块
  e.cd1 -= dt;
  if (e.cd1 <= 0) {
    e.cd1 = 2.8; sfx.summon();
    gears.push({ x: ball.x + (Math.random() - 0.5) * 220, y: -40, r: 24, angle: 0, spin: 3, vy: 0, life: 3, dead: false });
  }
}

/* —— 熔岩机械臂 Lava Claw：踩按钮冻臂 → 踩核心扣血；阶段二双臂齐攻 + 平台下沉 —— */
function updateBossClaw(e, dt) {
  if (buttons.some(b => isPressingButton(b))) e.frozen = 3.5;
  e.frozen = Math.max(0, e.frozen - dt);
  e.vulnerable = e.frozen > 0;
  const phase2 = e.hp <= 2;
  if (e.armT === undefined) { e.armT = 0; e.palmL = { x: 0, y: 0, w: 52, h: 26, active: false }; e.palmR = { x: 0, y: 0, w: 52, h: 26, active: false }; }
  e.armT += dt;
  const period = phase2 ? 1.7 : 3.0;
  const cyc = e.armT % period;
  if (phase2) {
    // 半血后：双手一起攻击（左臂下砸 + 右臂横扫同时进行）
    const atk = cyc < period * 0.5;
    if (!e.frozen && atk) {
      e.palmL.active = true; e.palmL.x = ball.x - 26; e.palmL.y = mapH - 90;
      e.palmR.active = true;
      const k = cyc / (period * 0.5);
      e.palmR.x = e.x + e.hw + 40 - k * (e.hw * 2 + 300);
      e.palmR.y = mapH - 90;
    } else { e.palmL.active = false; e.palmR.active = false; }
  } else {
    // 阶段一：左臂下砸（cyc 前段），掌落玩家脚下
    if (!e.frozen && cyc < period * 0.30) {
      e.palmL.active = true; e.palmL.x = ball.x - 26; e.palmL.y = mapH - 90;
    } else e.palmL.active = false;
    // 阶段一：右臂横扫（cyc 后段），掌从右扫到左
    if (!e.frozen && cyc > period * 0.55 && cyc < period * 0.85) {
      e.palmR.active = true;
      const k = (cyc - period * 0.55) / (period * 0.30);
      e.palmR.x = e.x + e.hw + 40 - k * (e.hw * 2 + 300);
      e.palmR.y = mapH - 90;
    } else e.palmR.active = false;
  }
  // 手掌命中玩家
  const hitPalm = (p) => p.active && ball.x > p.x - ball.r && ball.x < p.x + p.w + ball.r && ball.y + ball.r > p.y && ball.y - ball.r < p.y + p.h;
  if ((hitPalm(e.palmL) || hitPalm(e.palmR)) && ball.inv <= 0) hurt();
  // 抛石块
  e.cd1 -= dt;
  if (e.cd1 <= 0 && !e.frozen) {
    e.cd1 = phase2 ? 2.4 : 3.6;
    projectiles.push({ x: e.x, y: e.y + e.hh, vx: (ball.x - e.x) * 2.2, vy: -420, r: 9, life: 4, dead: false });
    sfx.summon();
  }
  // 阶段二：易碎平台下沉
  if (phase2 && !e.sunk) { e.sunk = true; for (const f of fragiles) { f.broken = true; f.shakeT = 0.3; } }
}

/* —— 机械蜘蛛 Spider-8：爬行 + 激光 + 召唤小蜘蛛；直接踩头击杀，阶段二加速 —— */
function updateBossSpider(e, dt) {
  const phase2 = e.hp <= 2;
  e.speed = phase2 ? 150 : 90;
  e.vulnerable = true;   // 直接可踩：踩头即扣血
  // 爬墙：周期性地爬上高处（天花板），沿顶部左右爬行；期间不可被踩，落地后方可踩头
  if (e.climbCd === undefined) e.climbCd = 5;
  e.climbCd -= dt;
  if (e.climbCd <= 0) {
    e.climbing = !e.climbing;
    e.climbCd = e.climbing ? 2.4 : (phase2 ? 2.6 : 4.0);
    if (e.climbing) sfx.alert();
  }
  if (e.climbing) {
    const ceilY = 150;   // 天花板高度
    e.y += (ceilY - e.y) * Math.min(1, dt * 5);
    e.x += e.dir * e.speed * dt;
    if (e.x < e.hw + 24) { e.x = e.hw + 24; e.dir = 1; }
    if (e.x > levelWidth() - e.hw - 24) { e.x = levelWidth() - e.hw - 24; e.dir = -1; }
    e.vy = 0;
  }
  // 激光（红眼间歇发射，阶段二更密）
  e.cd1 -= dt;
  if (e.cd1 <= 0) {
    e.cd1 = phase2 ? 1.6 : 2.6;
    const dx = ball.x - e.x, dy = ball.y - e.y, d = Math.hypot(dx, dy) || 1;
    projectiles.push({ x: e.x, y: e.y - e.hh * 0.5, vx: dx / d * 300, vy: dy / d * 300, r: 6, life: 5, dead: false });
    sfx.summon();
  }
  // 召唤跳跳小蜘蛛（限制场上数量，最多 3 只）——会主动跳扑玩家，有存在感但不淹没玩家
  if (e.minionCd === undefined) e.minionCd = 1.2;
  e.minionCd -= dt;
  if (e.minionCd <= 0) {
    e.minionCd = 2.6;
    const live = enemies.filter(x => !x.dead && x.type !== 'boss').length;
    if (live < 3) {
      enemies.push(mkEnemy(e.x + (e.dir > 0 ? e.hw + 26 : -e.hw - 26), e.y + e.hh - 14, 'jumper'));
      sfx.summon();
    }
  }
}

/* —— 方块博士 Dr. Square：三阶段 + 追逐 —— */
function updateBossSquare(e, dt) {
  const phase = e.hp >= 5 ? 1 : (e.hp >= 3 ? 2 : 3);
  e.phase = phase;
  if (e.hp <= 0 && !e.exploded) {
    e.exploded = true;
    shake = 22; sfx.win();
    spawnPuff(e.x, e.y, 60);
    startChase();
    return;
  }
  if (e.exploded) return;
  // 核心暴露窗口循环（红→黄）
  if (e.cd2 === undefined) e.cd2 = 4;
  e.cd2 -= dt;
  if (e.cd2 <= 0) { e.cd2 = 5; e.vulnerable = !e.vulnerable; if (e.vulnerable) sfx.vuln(); }
  // 导弹
  e.cd1 -= dt;
  if (e.cd1 <= 0) {
    e.cd1 = phase === 1 ? 2.6 : 1.8;
    const dx = ball.x - e.x, dy = ball.y - e.y, d = Math.hypot(dx, dy) || 1;
    projectiles.push({ x: e.x, y: e.y, vx: dx / d * 260, vy: dy / d * 260, r: 8, life: 4, dead: false });
    sfx.summon();
  }
  // 召唤小方块（限制场上数量，最多 3 只）
  e.cd3 -= dt;
  if (e.cd3 <= 0) {
    e.cd3 = phase === 3 ? 4 : 7;
    const live = enemies.filter(x => !x.dead && x.type !== 'boss').length;
    if (live < 3) {
      enemies.push(mkEnemy(e.x + (Math.random() - 0.5) * 80, e.y - e.hh - 40, 'walker'));
      sfx.summon();
    }
  }
  // 激光：警告线 → 横向光束（需跳起躲避）
  if (e.cd4 === undefined) e.cd4 = 3.5;
  e.cd4 -= dt;
  if (e.cd4 <= 0) {
    e.cd4 = phase >= 2 ? 3.0 : 4.5;
    beams.push({ y: mapH - 90, warn: 0.55, life: 0.95, dead: false });
    sfx.summon();
  }
  // 阶段二起地面加速
  conveyorBoost = phase >= 2 ? Math.min(2, conveyorBoost + dt * 0.05) : 1;
}

/* —— 熔岩（机械臂 Boss 场）—— */
function updateLava(dt) {
  for (const lv of lava) {
    if (ball.x + ball.r > lv.x && ball.x - ball.r < lv.x + lv.w && ball.y + ball.r > lv.y && ball.y - ball.r < lv.y + lv.h && ball.inv <= 0) hurt();
  }
}
// 方块博士激光束：警告期只闪不伤人，之后成为可造成伤害的横向光束（跳起躲避）
function updateBeams(dt) {
  for (const b of beams) {
    if (b.dead) continue;
    if (b.warn > 0) { b.warn -= dt; continue; }
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (Math.abs(ball.y - b.y) < ball.r + 7 && ball.inv <= 0) hurt();
  }
  beams = beams.filter(b => !b.dead);
}
function drawBeam(b, t) {
  if (b.dead) return;
  const warning = b.warn > 0;
  const a = warning ? (0.25 + Math.sin(t * 28) * 0.2) : 0.85;
  const h = warning ? 5 : 14;
  ctx.save();
  ctx.shadowColor = '#ff2040'; ctx.shadowBlur = warning ? 8 : 22;
  ctx.fillStyle = warning ? `rgba(255,90,90,${a})` : `rgba(255,40,60,${a})`;
  ctx.fillRect(cam.x, b.y - h / 2, VIEW_W, h);
  ctx.fillStyle = warning ? 'rgba(255,220,220,.5)' : 'rgba(255,220,220,.9)';
  ctx.fillRect(cam.x, b.y - 1.5, VIEW_W, 3);
  ctx.restore();
}
function drawLava(lv, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,80,18,.95)'; ctx.fillRect(lv.x, lv.y, lv.w, lv.h);
  ctx.fillStyle = 'rgba(255,190,40,.85)';
  for (let x = lv.x; x < lv.x + lv.w; x += 24) {
    const h = 4 + Math.sin(t * 5 + x * 0.22) * 2;
    ctx.fillRect(x, lv.y, 12, h);
  }
  ctx.restore();
}

/* —— 方块博士追逐序列 —— */
function startChase() {
  chase = { on: true, speed: 300, t: 0, doctorX: ball.x + VIEW_W * 0.55, endX: levelWidth() - VIEW_W * 0.25, spawnT: 0.6 };
  enemies = enemies.filter(e => !(e.type === 'boss' && e.bossKind === 'square'));
  flashMsg(t('追上去！别被甩掉！'));
}
function updateChase(dt) {
  if (!chase || !chase.on) return;
  chase.t += dt;
  const maxCam = Math.max(0, levelWidth() - VIEW_W);
  cam.x += chase.speed * dt;
  if (cam.x >= maxCam) { cam.x = maxCam; chase.on = false; sfx.win(); winLevel(); return; }
  chase.doctorX = cam.x + VIEW_W * 0.62 + Math.sin(chase.t * 5) * 16;   // 钉在镜头前方，轻微左右摆动
  if (ball.x < cam.x - 40) { ball.x = cam.x + 90; ball.vy = -200; }   // 被甩出左屏：前推（不掉血）
  chase.spawnT -= dt;
  if (chase.spawnT <= 0) {
    chase.spawnT = 0.7;
    if (Math.random() < 0.55) gears.push({ x: cam.x + VIEW_W + 40, y: -40, r: 26, angle: 0, spin: 3, vy: 0, life: 3, dead: false });
    else projectiles.push({ x: cam.x + VIEW_W + 40, y: mapH - 200, vx: -330, vy: 0, r: 9, life: 5, dead: false });
  }
}
function drawChase() {
  if (!chase || !chase.on) return;
  ctx.save();
  // 逃窜的小黑方块博士
  const dx = chase.doctorX - cam.x;
  ctx.fillStyle = '#000'; roundRect(dx - 16, VIEW_H * 0.62 - 16, 32, 32, 5); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(dx - 5, VIEW_H * 0.62 - 6, 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(dx + 5, VIEW_H * 0.62 - 6, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(t('别被甩掉！'), VIEW_W / 2, 120);
  ctx.restore();
}

/* ============================ 新 Boss 绘制 ============================ */

function drawBossCrusher(e, time) {
  const flash = e.hitFlash > 0, w = e.hw * 2, h = e.hh * 2;
  ctx.fillStyle = flash ? '#fff' : '#4a525a'; roundRect(-e.hw, -e.hh, w, h - 14, 8); ctx.fill();
  ctx.strokeStyle = flash ? '#fff' : '#111'; ctx.lineWidth = 3; roundRect(-e.hw, -e.hh, w, h - 14, 8); ctx.stroke();
  ctx.fillStyle = flash ? '#fff' : '#ff3b3b';
  ctx.beginPath(); ctx.arc(e.dir > 0 ? 12 : -12, -e.hh + 12, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#200000'; ctx.beginPath(); ctx.arc(e.dir > 0 ? 13 : -11, -e.hh + 12, 3, 0, 7); ctx.fill();
  // 底部履带滚轮
  const roll = e.x * 0.2 * e.dir;
  for (let i = -1; i <= 1; i += 2) {
    ctx.save(); ctx.translate(i * e.hw * 0.6, e.hh - 12); ctx.rotate(roll);
    ctx.fillStyle = flash ? '#fff' : '#15181c'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6a727a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
    ctx.restore();
  }
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,170,40,.95)'; ctx.fillText(t('直接踩头! 小心召唤的小怪!'), 0, -e.hh - 12);
}

function drawBossClaw(e, time) {
  const flash = e.hitFlash > 0, frozen = e.frozen > 0;
  ctx.save();
  ctx.shadowColor = frozen ? 'rgba(120,220,255,.8)' : (e.vulnerable ? 'rgba(255,210,60,.8)' : 'rgba(255,60,40,.5)');
  ctx.shadowBlur = 16;
  ctx.fillStyle = flash ? '#fff' : (frozen ? '#5fb8e8' : '#5a3040');
  roundRect(-e.hw, -e.hh, e.hw * 2, e.hh * 2, 10); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = flash ? '#fff' : '#200a10'; ctx.lineWidth = 3; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh * 2, 10); ctx.stroke();
  // 核心
  ctx.fillStyle = e.vulnerable ? '#ffd23e' : (frozen ? '#bfe9ff' : '#ff3b3b');
  ctx.beginPath(); ctx.arc(0, e.hh - 8, 9, 0, 7); ctx.fill();
  // 眼睛
  ctx.fillStyle = frozen ? '#dff6ff' : '#ff6a4a';
  ctx.beginPath(); ctx.arc(-e.hw * 0.35, -4, 6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(e.hw * 0.35, -4, 6, 0, 7); ctx.fill();
  // 机械臂
  drawClawArm(e, -1, e.palmL, frozen);
  drawClawArm(e, 1, e.palmR, frozen);
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = frozen ? 'rgba(120,220,255,.95)' : 'rgba(255,120,90,.95)';
  ctx.fillText(frozen ? t('冻结! 快踩核心!') : t('踩按钮冻住机械臂!'), 0, -e.hh - 14);
}
function drawClawArm(e, side, palm, frozen) {
  if (!palm) return;   // 尚未初始化（updateBossClaw 首次运行前）时安全跳过
  const sx = side * (e.hw - 6), sy = -e.hh + 14;
  const ex = palm.active ? palm.x - e.x : sx + side * 130;
  const ey = palm.active ? palm.y - e.y : sy + 150;
  ctx.strokeStyle = frozen ? '#9adcff' : '#3a2430'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  if (palm.active) {
    ctx.fillStyle = frozen ? '#9adcff' : '#5a3040';
    roundRect(palm.x - e.x - palm.w / 2, palm.y - e.y - palm.h / 2, palm.w, palm.h, 6); ctx.fill();
  }
}

function drawBossSpider(e, time) {
  const flash = e.hitFlash > 0, phase2 = e.hp <= 2, legN = phase2 ? 4 : 8;
  ctx.strokeStyle = flash ? '#fff' : '#2a2f36'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < legN; i++) {
    const a = Math.PI + (i - (legN - 1) / 2) * 0.42;
    const wob = Math.sin(time * 8 + i) * 4;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * e.hw * 0.5, -2);
    ctx.lineTo(Math.cos(a) * (e.hw + 18), e.hh + 6 + wob); ctx.stroke();
  }
  ctx.fillStyle = flash ? '#fff' : '#3a4148'; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh * 2, 10); ctx.fill();
  ctx.strokeStyle = flash ? '#fff' : '#111'; ctx.lineWidth = 2; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh * 2, 10); ctx.stroke();
  ctx.save(); ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.ellipse(e.dir > 0 ? 6 : -6, -4, 7, 9, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#200000'; ctx.beginPath(); ctx.arc(e.dir > 0 ? 7 : -5, -4, 3, 0, 7); ctx.fill();
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,120,120,.95)'; ctx.fillText(t('直接踩头! 小心召唤的小蜘蛛!'), 0, -e.hh - 12);
}

function drawBossSquare(e, time) {
  const flash = e.hitFlash > 0, vuln = e.vulnerable, w = e.hw * 2, h = e.hh * 2;
  ctx.save();
  ctx.shadowColor = vuln ? 'rgba(255,210,60,.8)' : 'rgba(120,120,255,.5)'; ctx.shadowBlur = vuln ? 22 : 14;
  ctx.fillStyle = flash ? '#fff' : (vuln ? '#3a3a6a' : '#2a2a4a');
  roundRect(-e.hw, -e.hh, w, h, 12); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = flash ? '#fff' : '#000'; ctx.lineWidth = 3; roundRect(-e.hw, -e.hh, w, h, 12); ctx.stroke();
  // 驾驶舱（小黑方块博士）
  ctx.fillStyle = '#000'; roundRect(-18, -e.hh + 8, 36, 26, 5); ctx.fill();
  ctx.fillStyle = vuln ? '#ffd23e' : '#fff';
  ctx.beginPath(); ctx.arc(-7, -e.hh + 18, 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -e.hh + 18, 3, 0, 7); ctx.fill();
  // 机器人眼睛
  ctx.fillStyle = vuln ? '#ffd23e' : '#ff5a5a';
  ctx.beginPath(); ctx.arc(-20, -4, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(20, -4, 7, 0, 7); ctx.fill();
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = vuln ? 'rgba(255,210,60,.95)' : 'rgba(150,150,255,.9)';
  ctx.fillText(vuln ? t('核心暴露! 踩它!') : t('躲导弹·等核心暴露'), 0, -e.hh - 14);
}

function update(dt) {
  time += dt;
  updateMovers(dt);
  updateBall(dt);
  // Verty 时不时说话
  if (state === 'PLAY' && ball && SKINS[skinIndex].id === 'verty') {
    vertyNextSpeak -= dt;
    if (vertyNextSpeak <= 0) { vertySpeechUntil = time + 2.6; vertyNextSpeak = 6 + Math.random() * 6; }
  }
  // 机关：球踩在上面（接触）即触发开门
  for (const sw of switches) {
    if (!sw.on && circleRect(ball, sw)) triggerSwitch(sw);
  }
  for (const b of boxes) updateBox(b, dt);
  for (const e of enemies) updateEnemy(e, dt);
  for (const e of enemies) if (e.type === 'boss' && !e.dead) updateBoss(e, dt);
  updateProjectiles(dt);
  updateButtons(dt);
  updateConveyors(dt);
  updateFans(dt);
  updateSeesaws(dt);
  updateBoulders(dt);
  updatePendulums(dt);
  updateSaws(dt);
  updateFragiles(dt);
  updateExplosives(dt);
  updateKeys();
  updateLava(dt);
  updateBeams(dt);
  // Boss 意外死亡（如掉虚空）也直接胜利
  if (state === 'PLAY') {
    const boss = enemies.find(e => e.type === 'boss');
    if (boss && boss.dead) winLevel();
  }
  // 方块博士阶段三：追逐序列
  if (chase && chase.on) updateChase(dt);
  for (const sp of springs) sp.anim = Math.max(0, sp.anim - dt);

  // 箱子 vs 小怪：同层物理——箱子把怪推着走（不重叠）；怪被挤到墙边才挤死
  for (const b of boxes) {
    const moving = b.vx;
    if (Math.abs(moving) < 1) continue;          // 箱子不动时不推
    const dir = moving > 0 ? 1 : -1;
    const boxCx = b.x + b.w / 2;
    for (const e of enemies) {
      if (e.dead || e.type === 'boss') continue;
      // 只在箱子前进方向一侧的怪才被推（避免把背后的怪吸进来）
      if ((dir > 0 && e.x < boxCx) || (dir < 0 && e.x > boxCx)) continue;
      const er = { x: e.x - e.hw, y: e.y - e.hh, w: e.hw * 2, h: e.hh * 2 };
      if (!rectsOverlap(b, er)) continue;
      // 把怪沿箱子移动方向推一小步；推不动（撞墙）即被挤死
      const nx = e.x + moving * dt;
      if (enemyBlockedAt(e, nx)) {
        e.dead = true;
        spawnPuff(e.x, e.y, 12);
        sfx.stomp();
      } else {
        e.x = nx;
        e.dir = dir;
      }
    }
  }

  // 可破坏墙：球高速下落砸顶即碎裂（隐藏路线）；爆炸也会触发（见 Phase C）
  for (const d of destructibles) {
    if (d.dead) continue;
    if (ball.x > d.x - ball.r && ball.x < d.x + d.w + ball.r &&
        Math.abs(ball.y + ball.r - d.y) < 8 && ball.vy > 320) {
      breakDestructible(d);
    }
  }
  destructibles = destructibles.filter(d => !d.dead);

  // Boss 陷阱水：预警倒计时 → 挖坑出水 → 消失回填；水坑期间掉进去受伤
  for (const wt of waterTraps) {
    if (wt.warn > 0) {
      wt.warn -= dt;
      if (wt.warn <= 0) {
        spawnSplash(wt.x + wt.w / 2, wt.y, 14);
        wt.carved = carveSolids(wt.x, wt.y, wt.w);   // 替换脚下地面，形成真水坑
      }
      continue;
    }
    wt.life -= dt;
    if (wt.life <= 0) { restoreSolids(wt.carved); wt.dead = true; continue; }
    if (ball.y + ball.r * 0.4 > wt.y && ball.x > wt.x && ball.x < wt.x + wt.w) {
      if (ball.inv <= 0) { spawnSplash(ball.x, wt.y, 10); hurt(); }
    }
  }
  waterTraps = waterTraps.filter(w => !w.dead);

  // 敌人 vs 球
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = ball.x - e.x, dy = ball.y - e.y;
    const rr = ball.r + Math.min(e.hw, e.hh);
    if (dx * dx + dy * dy < rr * rr) {
      // 踩顶判定：球底高于敌人上半身即视为踩踏，与下落速度无关（站在头顶也不会被咬）
      // 方块博士头顶判定放大 ~1.2 倍：踩顶线从「中心上方 8px」下调到「中心」，可踩区域 42→50
      const headOff = e.type === 'boss' ? (e.bossKind === 'square' ? 0 : 8) : 2;
      const onTop = ball.y + ball.r < e.y - headOff;
      if (e.type === 'boss') {
        bossTouchPlayer(e, dx, dy, onTop);
      } else {
        const multi = e.type === 'armored' || e.type === 'large';   // 需踩多次
        const killable = (() => {
          if (e.type === 'spiky' || e.type === 'unkillable') return false;   // 不可踩（踩=受伤）
          if (e.type === 'gated') return switches.some(s => s.on);           // 机关触发后可踩
          return true;
        })();
        if (onTop) {
          if (!killable) {
            // 顶部带刺/不可踩：踩上去反弹并受伤
            ball.vy = -420;
            if (ball.inv <= 0) { hurt(); } else spawnPuff(e.x, e.y - e.hh, 5);
          } else if (multi) {
            if (e.hitFlash <= 0) {
              e.hp = (e.hp || 0) - 1; e.hitFlash = 0.4;
              sfx.stomp(); spawnPuff(e.x, e.y - e.hh, 12);
              if (e.hp <= 0) { e.dead = true; spawnPuff(e.x, e.y, 18); sfx.stomp(); }
            }
            ball.vy = -600;
          } else {
            e.dead = true; ball.vy = -600; sfx.stomp(); spawnPuff(e.x, e.y, 10);
          }
        } else if (ball.inv <= 0) {
          hurt();
        }
      }
    }
  }
  // 死亡怪物清理：踩死/压死/掉坑后真正移除，避免无限累积
  enemies = enemies.filter(e => !e.dead);

  // 尖刺
  for (const sp of spikes) {
    const hb = { x: sp.x + 6, y: sp.y - 14, w: sp.w - 12, h: 12 };
    const dx = ball.x - clamp(ball.x, hb.x, hb.x + hb.w);
    const dy = ball.y - clamp(ball.y, hb.y, hb.y + hb.h);
    if (dx * dx + dy * dy < ball.r * ball.r && ball.inv <= 0) hurt();
  }

  // 水：进水直接死（无氧气/憋气）；入水水花
  const inWater = ballInWater();
  if (inWater && !wasInWater) {
    sfx.splash(); spawnSplash(ball.x, ball.y, 12);
    hurt();
  }
  wasInWater = inWater;

  // 大炮（向上弹射）
  for (const cn of cannons) {
    cn.cd = Math.max(0, cn.cd - dt);
    cn.anim = Math.max(0, cn.anim - dt);
    if (cn.cd <= 0) {
      // 只有落到大炮顶部（且在下落/静止）才弹射，从侧面或下面经过不触发
      const rect = { x: cn.x + 2, y: cn.y - 8, w: cn.w - 4, h: 16 };
      const c = circleRect(ball, rect);
      if (c && ball.vy > -60) {
        ball.vy = CANNON_VY; ball.vx = 0; ball.grounded = false; ball.cutLock = 0.5;
        cn.cd = 0.6; cn.anim = 0.35; sfx.spring();
        spawnDust(cn.x + cn.w / 2, cn.y + cn.h / 2, 8);
      }
    }
  }

  // 火焰机关（定时喷火）
  for (const lz of lasers) {
    const on = ((time + lz.phase) % lz.period) < lz.period * 0.5;
    if (!on) continue;
    const hb = { x: lz.x + 4, y: lz.y - 4, w: lz.w - 8, h: lz.h };
    const dx = ball.x - clamp(ball.x, hb.x, hb.x + hb.w);
    const dy = ball.y - clamp(ball.y, hb.y, hb.y + hb.h);
    if (dx * dx + dy * dy < ball.r * ball.r && ball.inv <= 0) hurt();
  }

  // 齿轮：从天而降 → 落地继续旋转 → 3 秒后消失；碰到受伤
  for (const g of gears) {
    g.angle += g.spin * dt;
    g.vy = Math.min(g.vy + GRAVITY * dt, 1600);
    g.y += g.vy * dt;
    // 落在固体顶面（或撞到底面）即停下
    for (const s of solids) {
      const px = clamp(g.x, s.x, s.x + s.w);
      const py = clamp(g.y, s.y, s.y + s.h);
      const dx = g.x - px, dy = g.y - py;
      if (dx * dx + dy * dy < g.r * g.r) {
        if (g.vy > 0) { g.y = s.y - g.r; g.vy = 0; }
        else if (g.vy < 0) { g.y = s.y + s.h + g.r; g.vy = 0; }
      }
    }
    g.life -= dt;
    if (g.life <= 0) g.dead = true;
    const dx = ball.x - g.x, dy = ball.y - g.y;
    const rr = g.r + ball.r;
    if (!g.dead && dx * dx + dy * dy < rr * rr && ball.inv <= 0) hurt();
  }
  gears = gears.filter(g => !g.dead);

  // 敌人/Boss 碰到火焰、水、熔岩、尖刺、锯片、齿轮也会死
  updateHazardDeaths();

  if (ball.y > killY) hurt(true);

  // 星星
  for (const s of stars) {
    if (s.taken) continue;
    const dx = ball.x - s.x, dy = ball.y - s.y;
    if (dx * dx + dy * dy < (ball.r + 16) * (ball.r + 16)) {
      s.taken = true; starsGot++; sfx.coin(); spawnSparkle(s.x, s.y, 8);
    }
  }

  // 复活点：碰到即激活，死亡后从这里重生
  for (const cp of checkpoints) {
    if (cp.taken) continue;
    const dx = ball.x - cp.x, dy = ball.y - cp.y;
    if (dx * dx + dy * dy < 42 * 42) {
      cp.taken = true;
      respawn = { x: cp.x, y: cp.y - 20 };
      sfx.checkpoint(); spawnPuff(cp.x, cp.y - 6, 10);
    }
  }

  // 旗子
  if (flag && ball.x > flag.x - 8 && Math.abs(ball.y - flag.y) < 170) winLevel();

  // 相机（方块博士追逐阶段由 updateChase 强制右滚，这里跳过跟随）
  shake = Math.max(0, shake - dt * 40);
  if (!(chase && chase.on)) {
    const targetX = clamp(ball.x - VIEW_W * 0.4, 0, Math.max(0, levelWidth() - VIEW_W));
    cam.x += (targetX - cam.x) * (1 - Math.exp(-6 * dt));
    const targetY = clamp(ball.y - VIEW_H * 0.55, 0, Math.max(0, mapH - VIEW_H));
    cam.y += (targetY - cam.y) * (1 - Math.exp(-6 * dt));
  }

  // 拖尾
  if (Math.abs(ball.vx) > 130 || Math.abs(ball.vy) > 320) {
    trail.push({ x: ball.x, y: ball.y, r: ball.r, life: 0.26, max: 0.26 });
  }
  trail = trail.filter(t => (t.life -= dt) > 0);

  particles = particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.bubble ? -160 : 400) * dt; return p.life > 0; });
}

function levelWidth() {
  let max = 0;
  for (const s of solids) max = Math.max(max, s.x + s.w);
  return Math.max(max, 1200);
}

/* ============================ 受伤 / 胜利 ============================ */
function hurt(noRespawnFx) {
  if (god) return;          // 无敌模式：不掉血（飞行模式不无敌，照常受伤）
  if (ball.inv > 0) return;
  hearts--;
  sfx.hurt();
  if (hearts < 0) { gameOver(); return; }
  spawnPuff(ball.x, ball.y, 12);
  const L = buildLevel(currentLevelDef());
  const rp = respawn || L.spawn;   // 优先在最近的复活点重生
  ball.x = rp.x; ball.y = rp.y; ball.vx = 0; ball.vy = 0;
  ball.inv = 1.6;
  lastGrounded = -1; lastJumpPress = -1;
}

function winLevel() {
  if (state !== 'PLAY') return;
  if (playingCustom) {
    sfx.win();
    state = 'COMPLETE';
    const fx = flag ? flag.x : ball.x, fy = flag ? flag.y : ball.y;
    spawnConfetti(fx, fy, 40);
    return;
  }
  bestStars[levelIndex] = Math.max(bestStars[levelIndex] || 0, starsGot);
  maxUnlocked = Math.max(maxUnlocked, Math.min(LEVELS.length, levelIndex + 2));
  saveProgress();
  sfx.win();
  if (levelIndex === LEVELS.length - 1) {
    state = 'ENDING';          // 击败魔王 → 结局剧情
    spawnConfetti(ball.x, ball.y, 60);
  } else {
    state = 'COMPLETE';
    const fx = flag ? flag.x : ball.x, fy = flag ? flag.y : ball.y;
    spawnConfetti(fx, fy, 40);
  }
}

function gameOver() {
  state = 'GAMEOVER';
  sfx.over();
}

/* ============================ 粒子 ============================ */
function addP(x, y, vx, vy, life, color, r) { particles.push({ x, y, vx, vy, life, maxLife: life, color, r }); }
function spawnDust(x, y, n) { for (let i = 0; i < n; i++) addP(x, y, (Math.random() - .5) * 160, -Math.random() * 120 - 30, .5, 'rgba(255,255,255,.7)', 3); }
function spawnPuff(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120; addP(x, y, Math.cos(a) * s, Math.sin(a) * s, .5, 'rgba(255,255,255,.8)', 4); } }
function spawnSparkle(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160; addP(x, y, Math.cos(a) * s, Math.sin(a) * s, .6, '#ffe066', 4); } }
function spawnSplash(x, y, n) { for (let i = 0; i < n; i++) addP(x, y, (Math.random() - .5) * 200, -Math.random() * 240 - 40, .7, '#8fd6ff', 4); }
function spawnBubbles(x, y, n) { for (let i = 0; i < n; i++) particles.push({ x: x + (Math.random() - .5) * 14, y: y + (Math.random() - .5) * 6, vx: (Math.random() - .5) * 30, vy: -40 - Math.random() * 70, life: .5 + Math.random() * .5, maxLife: 1, color: 'rgba(190,230,255,.9)', r: 2.5 + Math.random() * 3, bubble: true, ring: true }); }
function spawnConfetti(x, y, n) { const cs = ['#ff5a5a', '#ffd23e', '#5ad1ff', '#7dff6a', '#ff8ae2']; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 260; addP(x, y, Math.cos(a) * s, Math.sin(a) * s - 120, 1.2, cs[(Math.random() * cs.length) | 0], 5); } }

/* ============================ 渲染 ============================ */
function drawBackground(t) {
  // 让画布外的留边（非 16:9 屏幕）沿用本关天空的渐变，像背景自然延伸出去（按钮/画面保持 16:9 不变）
  const bodyBg = {
    grass: 'linear-gradient(180deg, #7ec8f7 0%, #cdeeff 70%, #eaf7ff 100%)',
    forest: 'linear-gradient(180deg, #2f5d3a 0%, #3f7d50 60%, #27432f 100%)',
    cave: 'linear-gradient(180deg, #10101c 0%, #232034 60%, #342a44 100%)',
    canyon: 'linear-gradient(180deg, #2a0f2e 0%, #8a2a3a 45%, #e2703a 75%, #ffce6a 100%)',
    mine: 'linear-gradient(180deg, #0e0a16 0%, #1c1426 55%, #2e2138 100%)',
    space: 'linear-gradient(180deg, #05060f 0%, #0c1026 60%, #1a1440 100%)',
  }[t] || 'linear-gradient(180deg, #7ec8f7 0%, #cdeeff 70%, #eaf7ff 100%)';
  (document.body || canvas).style.background = bodyBg;
  if (t === 'forest') {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#2f5d3a'); g.addColorStop(0.6, '#3f7d50'); g.addColorStop(1, '#27432f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 远景树
    for (let i = 0; i < 8; i++) {
      const x = ((i * 340 + 120) % (VIEW_W + 400)) - 200;
      const h = 220 + (i % 3) * 50;
      drawTree(x - cam.x * 0.25, 460, h, 'rgba(20,45,28,.5)');
    }
    for (let i = 0; i < 5; i++) {
      const x = ((i * 480 + 60) % (VIEW_W + 400)) - 200;
      drawTree(x - cam.x * 0.4, 470, 150 + (i % 3) * 40, 'rgba(28,58,36,.7)');
    }
    drawBirds(time);
    drawFallingLeaves(time);
  } else if (t === 'cave') {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#10101c'); g.addColorStop(0.6, '#232034'); g.addColorStop(1, '#342a44');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 钟乳石（顶）+ 石笋（底）
    ctx.fillStyle = 'rgba(58,48,74,.8)';
    for (let i = 0; i < 13; i++) {
      const x = ((i * 176 + 40) % (VIEW_W + 200)) - 100 - cam.x * 0.18;
      const h = 40 + (i % 4) * 24;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 12, h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(46,38,60,.7)';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 240 + 130) % (VIEW_W + 220)) - 110 - cam.x * 0.28;
      const h = 28 + (i % 3) * 18;
      ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.lineTo(x + 20, VIEW_H); ctx.lineTo(x + 10, VIEW_H - h); ctx.closePath(); ctx.fill();
    }
    // 青色发光水晶
    for (let i = 0; i < 7; i++) {
      const x = ((i * 251 + 50) % (VIEW_W + 180)) - 90 - cam.x * 0.2;
      const y = 80 + (i * 73) % 320;
      const tw = 0.6 + 0.4 * Math.sin(time * 1.5 + i * 2.2);
      drawCrystal(x, y, 8 + (i % 3) * 3, `rgba(90,225,255,${0.5 + tw * 0.4})`);
    }
    drawDustMotes(time);
  } else if (t === 'canyon') {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#2a0f2e'); g.addColorStop(0.45, '#8a2a3a'); g.addColorStop(0.75, '#e2703a'); g.addColorStop(1, '#ffce6a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 落日（多层光晕 + 水平雾带）
    const sunX = 700 - cam.x * 0.04, sunY = 150;
    ctx.fillStyle = 'rgba(255,180,90,.16)'; ctx.beginPath(); ctx.arc(sunX, sunY, 120, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,110,.25)'; ctx.beginPath(); ctx.arc(sunX, sunY, 92, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffdf80'; ctx.beginPath(); ctx.arc(sunX, sunY, 58, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(sunX - 12, sunY - 12, 30, 0, 7); ctx.fill();
    // 被夕阳染色的条状云
    ctx.fillStyle = 'rgba(255,160,110,.22)';
    for (let i = 0; i < 4; i++) {
      const cy = 60 + i * 42 + Math.sin(time * 0.3 + i) * 4;
      const cw = 220 + (i % 2) * 140;
      const cx = ((i * 400 + 100 + time * 6) % (VIEW_W + 500)) - 250;
      ctx.beginPath(); ctx.ellipse(cx - cam.x * 0.06, cy, cw, 7, 0, 0, 7); ctx.fill();
    }
    // 远中近三层台地剪影（平顶山，越近越暗越大）
    for (let i = 0; i < 8; i++) {
      const x = ((i * 320 + 60) % (VIEW_W + 400)) - 200 - cam.x * 0.2;
      drawMesa(x, VIEW_H, 150 + (i % 3) * 40, 120 + (i % 4) * 30, 'rgba(120,50,60,.42)');
    }
    for (let i = 0; i < 6; i++) {
      const x = ((i * 420 + 180) % (VIEW_W + 400)) - 200 - cam.x * 0.45;
      drawMesa(x, VIEW_H, 190 + (i % 2) * 60, 180 + (i % 3) * 45, 'rgba(70,24,34,.62)');
    }
    for (let i = 0; i < 4; i++) {
      const x = ((i * 560 + 320) % (VIEW_W + 500)) - 250 - cam.x * 0.8;
      drawMesa(x, VIEW_H, 260 + (i % 2) * 80, 230 + (i % 3) * 40, 'rgba(38,14,22,.86)');
    }
    drawEmbers(time);
  } else if (t === 'mine') {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0e0a16'); g.addColorStop(0.55, '#1c1426'); g.addColorStop(1, '#2e2138');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 顶部钟乳石 + 底部石笋
    ctx.fillStyle = 'rgba(50,40,64,.75)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 170 + 30) % (VIEW_W + 180)) - 90 - cam.x * 0.18;
      const h = 34 + (i % 4) * 20;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 22, 0); ctx.lineTo(x + 11, h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(40,32,52,.6)';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 230 + 120) % (VIEW_W + 200)) - 100 - cam.x * 0.25;
      const h = 26 + (i % 3) * 16;
      ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.lineTo(x + 18, VIEW_H); ctx.lineTo(x + 9, VIEW_H - h); ctx.closePath(); ctx.fill();
    }
    // 木桩支撑梁（矿井框架）
    for (let i = 0; i < 6; i++) {
      const x = ((i * 340 + 60) % (VIEW_W + 340)) - 170 - cam.x * 0.4;
      ctx.fillStyle = 'rgba(74,46,26,.9)'; ctx.fillRect(x, 36, 14, VIEW_H - 36);
      ctx.fillStyle = 'rgba(100,66,38,.9)'; ctx.fillRect(x - 18, 32, 50, 12);
      ctx.fillStyle = 'rgba(100,66,38,.9)'; ctx.fillRect(x - 18, VIEW_H - 58, 50, 12);
    }
    // 发光水晶（青 / 紫交替，带光晕）
    for (let i = 0; i < 8; i++) {
      const x = ((i * 233 + 60) % (VIEW_W + 160)) - 80 - cam.x * 0.2;
      const y = 70 + (i * 67) % 320;
      const tw = 0.6 + 0.4 * Math.sin(time * 1.6 + i * 1.9);
      drawCrystal(x, y, 7 + (i % 3) * 3, i % 2 === 0 ? `rgba(90,220,255,${0.5 + tw * 0.4})` : `rgba(190,140,255,${0.45 + tw * 0.35})`);
    }
    // 散落的发光矿石点
    for (let i = 0; i < 12; i++) {
      const x = ((i * 137 + 30) % (VIEW_W + 200)) - 100 - cam.x * 0.2;
      const y = 80 + (i * 53) % 300;
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + i);
      ctx.fillStyle = `rgba(120,220,255,${0.22 + tw * 0.38})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 12); ctx.lineTo(x - 8, y + 12); ctx.closePath(); ctx.fill();
    }
    drawDustMotes(time);
  } else if (t === 'space') {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#05060f'); g.addColorStop(0.6, '#0c1026'); g.addColorStop(1, '#1a1440');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // 星点
    for (let i = 0; i < 60; i++) {
      const x = ((i * 173 + 20) % (VIEW_W + 40)) - 20;
      const y = ((i * 97 + 15) % VIEW_H);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i * 1.3));
      ctx.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.7})`;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2 : 1.2, 0, 7); ctx.fill();
    }
    // 行星
    ctx.fillStyle = '#3f8fb0'; ctx.beginPath(); ctx.arc(160 - cam.x * 0.05, 120, 42, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.ellipse(140 - cam.x * 0.05, 106, 38, 12, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5ab0'; ctx.beginPath(); ctx.arc(820 - cam.x * 0.03, 220, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9a0ff'; ctx.beginPath(); ctx.arc(814 - cam.x * 0.03, 210, 20, 0, 7); ctx.fill();
    drawShootingStars(time);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#7ec8f7'); g.addColorStop(0.7, '#cdeeff'); g.addColorStop(1, '#eaf7ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(820 - cam.x * 0.03, 90, 46, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,243,176,.4)'; ctx.beginPath(); ctx.arc(820 - cam.x * 0.03, 90, 64, 0, 7); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 280 + time * (8 + i % 3 * 3)) % (VIEW_W + 300)) - 150;
      drawCloud(cx - cam.x * 0.15, 60 + (i % 3) * 55);
    }
    drawBirds(time);
    drawButterfly(((time * 34 + 180) % (VIEW_W + 60)) - 30, 150 + Math.sin(time * 1.4) * 22, time, '#ff9ad5', '#e050a0');
    drawButterfly(((time * 26 + 620) % (VIEW_W + 60)) - 30, 210 + Math.sin(time * 1.1 + 2) * 26, time, '#ffd23e', '#f0a020');
    drawButterfly(((time * 40 + 980) % (VIEW_W + 60)) - 30, 120 + Math.sin(time * 0.9 + 4) * 18, time, '#7ec8ff', '#3a8fd0');
    drawHills(-cam.x * 0.3, 430, '#c5e6b0');
    drawHills(-cam.x * 0.5 + 300, 460, '#aad79a');
  }
}
function drawCloud(x, y) {
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, 7); ctx.arc(x + 26, y - 8, 18, 0, 7); ctx.arc(x + 50, y, 20, 0, 7);
  ctx.arc(x + 24, y + 6, 18, 0, 7);
  ctx.fill();
}
function drawFloatingText() {
  // 天上的漂浮字母 "made with Hamsger!"（标题天空署名）
  const txt = 'made with Hamsger!';
  const spacing = 36;
  const totalW = (txt.length - 1) * spacing;
  const x0 = VIEW_W / 2 - totalW / 2;
  const baseY = 132;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (ch === ' ') continue;
    const phase = i * 0.85;
    const bob = Math.sin(time * 1.2 + phase) * 7;
    const sway = Math.sin(time * 0.5 + phase * 1.4) * 10;
    const rot = Math.sin(time * 0.8 + phase) * 0.14;
    const hue = (i * 30 + time * 30) % 360;
    const alpha = 0.55 + 0.18 * Math.sin(time * 1.1 + phase * 1.7);
    ctx.save();
    ctx.translate(x0 + i * spacing + sway, baseY + bob);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.font = 'italic 700 26px system-ui, sans-serif';
    ctx.fillStyle = `hsl(${hue}, 95%, 66%)`;
    ctx.shadowColor = `hsla(${hue}, 95%, 55%, .9)`;
    ctx.shadowBlur = 12;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
}
function drawBirds(t) {
  // 天空飞鸟：几只小"v"字形小鸟掠过
  const n = 4;
  ctx.strokeStyle = 'rgba(40,55,70,.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const span = VIEW_W + 260;
    const speed = 26 + (i % 3) * 14;
    const x = ((i * 340 + t * speed) % span) - 130;
    const y = 70 + (i % 4) * 40 + Math.sin(t * 3 + i * 1.7) * 10;
    const flap = Math.sin(t * 9 + i * 2.1) * 5;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - flap); ctx.quadraticCurveTo(x, y + 4, x + 9, y - flap);
    ctx.stroke();
  }
}
function drawHills(off, base, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W + 80; x += 40) {
    const h = Math.sin((x + off) * 0.008) * 60 + Math.sin((x + off) * 0.02) * 24;
    ctx.lineTo(x, base - h);
  }
  ctx.lineTo(VIEW_W, VIEW_H); ctx.closePath(); ctx.fill();
}
function drawTree(x, base, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 8, base - h, 16, h);
  ctx.beginPath(); ctx.arc(x, base - h - 30, 55, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 40, base - h, 40, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 40, base - h, 40, 0, 7); ctx.fill();
}
// 蝴蝶：双翅扇动，按正弦轨迹缓慢飞行
function drawButterfly(x, y, t, c1, c2) {
  const flap = Math.sin(t * 11) * 3.5;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.ellipse(-4, -1, 4.5 + flap, 3.2, -0.45, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -1, 4.5 + flap, 3.2, 0.45, 0, 7); ctx.fill();
  ctx.fillStyle = c2;
  ctx.beginPath(); ctx.ellipse(-3, 1.5, 2.8, 2, -0.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, 1.5, 2.8, 2, 0.3, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(30,30,40,.7)';
  ctx.fillRect(-0.7, -4.5, 1.4, 9);
  ctx.restore();
}
// 森林飘落的叶子
function drawFallingLeaves(t) {
  ctx.fillStyle = 'rgba(120,190,120,.6)';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 211 + 50 + t * (20 + i % 3 * 12)) % (VIEW_W + 60)) - 30;
    const y = ((i * 137 + t * (40 + i % 4 * 16)) % (VIEW_H + 40)) - 20;
    const s = 3 + (i % 3) * 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i);
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.5, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}
// 宇宙流星：每隔约 6 秒划过一条
function drawShootingStars(t) {
  const cycle = 6.5;
  for (let k = 0; k < 2; k++) {
    const p = ((t + k * cycle * 0.55) % cycle) / cycle;   // 0→1
    if (p > 0.12) continue;
    const q = p / 0.12;                                    // 0→1 出现到消失
    const sx = 120 + 820 * (0.35 + q * 0.65);
    const sy = 40 + 150 * q;
    const len = 90;
    const g = ctx.createLinearGradient(sx, sy, sx - len, sy - len * 0.45);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - len, sy - len * 0.45); ctx.stroke();
  }
}
// 峡谷：阶梯状台地/岩柱剪影（多层堆叠的"平顶山"）
function drawMesa(x, base, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + w * 0.12, base - h * 0.55);
  ctx.lineTo(x + w * 0.34, base - h * 0.55);
  ctx.lineTo(x + w * 0.34, base - h * 0.8);
  ctx.lineTo(x + w * 0.66, base - h * 0.8);
  ctx.lineTo(x + w * 0.66, base - h);
  ctx.lineTo(x + w * 0.88, base - h * 0.5);
  ctx.lineTo(x + w, base);
  ctx.closePath(); ctx.fill();
}
// 峡谷：缓缓上升的火星/灰烬
function drawEmbers(t) {
  for (let i = 0; i < 16; i++) {
    const x = ((i * 173 + 40) % (VIEW_W + 40)) - 20;
    const y = VIEW_H - ((i * 89 + t * (18 + i % 4 * 9)) % (VIEW_H * 0.75));
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1);
    const r = (i % 4 === 0) ? 2 : 1.2;
    ctx.fillStyle = `rgba(255,${150 + Math.floor(tw * 60)},70,${0.25 + tw * 0.5})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
}
// 洞穴：缓缓飘动的尘埃/萤火（微光点）
function drawDustMotes(t) {
  for (let i = 0; i < 18; i++) {
    const x = ((i * 149 + 30) % (VIEW_W + 40)) - 20;
    const y = ((i * 97 + t * (10 + i % 3 * 8)) % (VIEW_H + 30)) - 15;
    const tw = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 1.7);
    const col = (i % 3 === 0) ? '140,240,180' : '180,220,255';
    ctx.fillStyle = `rgba(${col},${0.12 + tw * 0.3})`;
    ctx.beginPath(); ctx.arc(x, y, (i % 5 === 0) ? 1.8 : 1.1, 0, 7); ctx.fill();
  }
}
// 洞穴：发光水晶（带光晕的菱形晶簇）
function drawCrystal(x, y, r, color) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = r * 1.6;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.5, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x + r * 0.2, y); ctx.lineTo(x, y + r * 0.4); ctx.lineTo(x - r * 0.2, y); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSolid(s) {
  const type = s.type || 'dirt';
  ctx.save();
  if (type === 'slope') {
    // 斜坡：实心直角三角形（dir=1 左下→右上；dir=-1 右下→左上）
    ctx.fillStyle = s.round ? '#8b95a5' : '#7a8292';
    ctx.beginPath();
    if (s.dir > 0) { ctx.moveTo(s.x, s.y + s.h); ctx.lineTo(s.x + s.w, s.y + s.h); ctx.lineTo(s.x + s.w, s.y); }
    else { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y + s.h); ctx.lineTo(s.x + s.w, s.y + s.h); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    if (s.dir > 0) { ctx.moveTo(s.x, s.y + s.h); ctx.lineTo(s.x + s.w, s.y); ctx.lineTo(s.x + s.w, s.y + s.h); }
    else { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y + s.h); ctx.lineTo(s.x, s.y + s.h); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (s.dir > 0) { ctx.moveTo(s.x + 1, s.y + s.h); ctx.lineTo(s.x + s.w - 1, s.y + 1); }
    else { ctx.moveTo(s.x + 1, s.y + 1); ctx.lineTo(s.x + s.w - 1, s.y + s.h); }
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.10)';
  roundRect(s.x, s.y - 1, s.w, s.h, 4); ctx.fill();

  if (type === 'stone') {
    ctx.fillStyle = '#5a6070'; roundRect(s.x, s.y, s.w, s.h, 3); ctx.fill();
    ctx.fillStyle = '#7a8292'; roundRect(s.x, s.y, s.w, 8, 3); ctx.fill();
    ctx.fillStyle = '#444a58';
    for (let x = s.x + 12; x < s.x + s.w - 4; x += 26) {
      ctx.beginPath(); ctx.arc(x, s.y + s.h / 2, 2, 0, 7); ctx.fill();
    }
  } else if (type === 'grass') {
    ctx.fillStyle = '#7a5230'; roundRect(s.x, s.y + 12, s.w, s.h - 12, 3); ctx.fill();
    ctx.fillStyle = '#4f9e42'; roundRect(s.x, s.y, s.w, 20, 3); ctx.fill();
    ctx.fillStyle = '#66c74e'; roundRect(s.x, s.y, s.w, 10, 3); ctx.fill();
    ctx.fillStyle = '#8fef72';
    for (let x = s.x + 4; x < s.x + s.w - 4; x += 14) {
      ctx.beginPath(); ctx.moveTo(x, s.y + 2); ctx.lineTo(x + 3, s.y - 5); ctx.lineTo(x + 6, s.y + 2); ctx.fill();
    }
  } else if (type === 'moss') {
    // 森林苔藓地：深绿苔藓 + 露出的泥土 + 落叶斑点（与草原的亮绿草皮区分）
    ctx.fillStyle = '#5d3d22'; ctx.fillRect(s.x, s.y + 14, s.w, s.h - 14);
    ctx.fillStyle = '#3a6633'; ctx.fillRect(s.x, s.y, s.w, 16);
    ctx.fillStyle = '#4d8038'; ctx.fillRect(s.x, s.y, s.w, 8);
    ctx.fillStyle = '#2c4f27';
    for (let x = s.x + 7; x < s.x + s.w - 4; x += 19) {
      ctx.beginPath(); ctx.arc(x, s.y + 12, 3.2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#8a5a2b';
    for (let x = s.x + 14; x < s.x + s.w - 6; x += 34) {
      ctx.beginPath(); ctx.ellipse(x, s.y + 15, 5, 2.4, 0.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#6fbf5a';
    for (let x = s.x + 4; x < s.x + s.w - 4; x += 22) {
      ctx.beginPath(); ctx.moveTo(x, s.y + 1); ctx.lineTo(x + 2, s.y - 4); ctx.lineTo(x + 4, s.y + 1); ctx.fill();
    }
  } else if (type === 'canyon') {
    // 峡谷：橙红岩层
    ctx.fillStyle = '#a0401e'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#c85028'; ctx.fillRect(s.x, s.y, s.w, 9);
    ctx.fillStyle = '#e06830'; ctx.fillRect(s.x, s.y, s.w, 4);
    ctx.fillStyle = '#7c2f16';
    for (let x = s.x + 8; x < s.x + s.w - 4; x += 22) {
      ctx.beginPath(); ctx.arc(x, s.y + s.h - 8, 2.4, 0, 7); ctx.fill();
    }
  } else if (type === 'space') {
    // 宇宙：暗色金属地面 + 发光纹路
    ctx.fillStyle = '#2a2a44'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#3c3c60'; ctx.fillRect(s.x, s.y, s.w, 8);
    ctx.fillStyle = '#7fb7ff';
    for (let x = s.x + 6; x < s.x + s.w - 4; x += 20) {
      ctx.beginPath(); ctx.arc(x, s.y + s.h - 9, 2, 0, 7); ctx.fill();
    }
  } else if (type === 'door') {
    // 门：金属栅栏，机关触发前阻挡，打开后整段移除
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#5a6272'; ctx.fillRect(s.x, s.y, s.w, 8);
    ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 2;
    for (let x = s.x + 8; x < s.x + s.w; x += 12) {
      ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x, s.y + s.h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(s.x, s.y + s.h / 2); ctx.lineTo(s.x + s.w, s.y + s.h / 2); ctx.stroke();
    // 锁孔
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + s.h / 2, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2e38'; ctx.fillRect(s.x + s.w / 2 - 1.5, s.y + s.h / 2 - 5, 3, 10);
  } else if (type === 'ice') {
    // 冰面：淡蓝反光、滑
    ctx.fillStyle = '#b8e8ff'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#e6f7ff'; ctx.fillRect(s.x, s.y, s.w, 6);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let x = s.x + 6; x < s.x + s.w - 4; x += 22) ctx.fillRect(x, s.y + s.h - 8, 10, 3);
  } else if (type === 'mud') {
    // 泥地：深棕、粘
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#6e4c2c'; ctx.fillRect(s.x, s.y, s.w, 7);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (let x = s.x + 8; x < s.x + s.w - 4; x += 18) ctx.beginPath(), ctx.arc(x, s.y + s.h - 7, 2.5, 0, 7), ctx.fill();
  } else if (type === 'sand') {
    // 沙地：土黄、略慢
    ctx.fillStyle = '#d9b36a'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#e8c987'; ctx.fillRect(s.x, s.y, s.w, 7);
    ctx.fillStyle = 'rgba(160,120,50,.4)';
    for (let x = s.x + 6; x < s.x + s.w - 4; x += 16) ctx.beginPath(), ctx.arc(x, s.y + s.h - 7, 2, 0, 7), ctx.fill();
  } else if (type === 'wood') {
    // 木制平台：木板条
    ctx.fillStyle = '#a5763c'; roundRect(s.x, s.y, s.w, s.h, 3); ctx.fill();
    ctx.fillStyle = '#b8894c'; roundRect(s.x, s.y, s.w, 8, 3); ctx.fill();
    ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2;
    for (let x = s.x + 14; x < s.x + s.w; x += 22) { ctx.beginPath(); ctx.moveTo(x, s.y + 3); ctx.lineTo(x, s.y + s.h - 3); ctx.stroke(); }
  } else if (type === 'metal') {
    // 金属平台：铆钉金属板
    ctx.fillStyle = '#7a8292'; roundRect(s.x, s.y, s.w, s.h, 3); ctx.fill();
    ctx.fillStyle = '#8f99a8'; roundRect(s.x, s.y, s.w, 8, 3); ctx.fill();
    ctx.fillStyle = '#5a6270';
    for (let x = s.x + 10; x < s.x + s.w - 4; x += 24) ctx.beginPath(), ctx.arc(x, s.y + s.h / 2, 2, 0, 7), ctx.fill();
  } else if (type === 'destructible') {
    // 可破坏墙：带裂纹的砖墙
    ctx.fillStyle = '#9a6a3f'; roundRect(s.x, s.y, s.w, s.h, 3); ctx.fill();
    ctx.fillStyle = '#b07c4a'; roundRect(s.x, s.y, s.w, 7, 3); ctx.fill();
    ctx.strokeStyle = '#6e4a28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x, s.y + s.h / 2); ctx.lineTo(s.x + s.w, s.y + s.h / 2);
    ctx.moveTo(s.x + s.w / 2, s.y); ctx.lineTo(s.x + s.w / 2, s.y + s.h / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x + 6, s.y + 6); ctx.lineTo(s.x + s.w / 2, s.y + s.h / 2); ctx.lineTo(s.x + s.w - 6, s.y + 4); ctx.stroke();
  } else { // dirt —— 直角方块，无圆角
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#9c6a37'; ctx.fillRect(s.x, s.y, s.w, 8);
  }
  ctx.restore();
}

function drawFake(s) {
  // 叶子方块：绿色灌丛（装饰，无碰撞）
  if (s.leaf) {
    ctx.save();
    ctx.fillStyle = '#2f6d30'; ctx.fillRect(s.x, s.y + 8, s.w, s.h - 8);
    ctx.fillStyle = '#3d8a3a';
    ctx.beginPath(); ctx.arc(s.x + 9, s.y + 10, 13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + s.w - 9, s.y + 10, 13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 5, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#58b04a';
    ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 3, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a5a26';
    for (let x = s.x + 6; x < s.x + s.w - 4; x += 15) { ctx.beginPath(); ctx.arc(x, s.y + 19, 3, 0, 7); ctx.fill(); }
    ctx.restore();
    return;
  }
  // 假墙：外观近似普通墙，带极淡虚线边提示（游戏中当作可穿过的隐藏墙）
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#6a7280'; roundRect(s.x, s.y, s.w, s.h, 3); ctx.fill();
  ctx.fillStyle = '#828b99'; roundRect(s.x, s.y, s.w, 8, 3); ctx.fill();
  ctx.fillStyle = '#4c525c';
  for (let x = s.x + 12; x < s.x + s.w - 4; x += 26) { ctx.beginPath(); ctx.arc(x, s.y + s.h / 2, 2, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  roundRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4, 3); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

function drawOneway(o) {
  // 单向门：细窄竖直栅栏，箭头方向 = 可穿过的方向
  ctx.save();
  ctx.fillStyle = 'rgba(74,168,255,.35)';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.fillStyle = '#4aa8ff';
  const cx = o.x + o.w / 2;
  for (let y = o.y + 6; y < o.y + o.h - 4; y += 16) {
    ctx.beginPath();
    if (o.allowDir > 0) { ctx.moveTo(cx - 3, y); ctx.lineTo(cx + 3, y + 5); ctx.lineTo(cx - 3, y + 10); }
    else { ctx.moveTo(cx + 3, y); ctx.lineTo(cx - 3, y + 5); ctx.lineTo(cx + 3, y + 10); }
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#2b6db3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx, o.y + o.h); ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBox(b) {
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.fillStyle = '#c58a3f'; roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 4); ctx.fill();
  ctx.fillStyle = '#d99b4a'; roundRect(-b.w / 2, -b.h / 2, b.w, 8, 3); ctx.fill();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-b.w / 2, 0); ctx.lineTo(b.w / 2, 0);
  ctx.moveTo(0, -b.h / 2); ctx.lineTo(0, b.h / 2); ctx.stroke();
  ctx.restore();
}

function drawSwitch(s, t) {
  ctx.save();
  const cx = s.x + s.w / 2, baseY = s.y + s.h - 10;
  // 底座
  ctx.fillStyle = '#6a7282'; roundRect(s.x + 8, baseY - 6, s.w - 16, 14, 3); ctx.fill();
  ctx.fillStyle = '#4a4f58'; roundRect(s.x + 10, baseY - 4, s.w - 20, 10, 2); ctx.fill();
  // 拉杆（on 时倒向一侧，绿灯；off 时直立，红灯）
  const tipX = s.on ? cx - 14 : cx + 14, tipY = s.y + 10;
  ctx.strokeStyle = '#7a8292'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx, baseY - 4); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.fillStyle = s.on ? '#3fcf5f' : '#ff5a5a';
  ctx.beginPath(); ctx.arc(tipX, tipY, 6.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.arc(tipX - 1.5, tipY - 1.5, 2, 0, 7); ctx.fill();
  ctx.restore();
}

function drawSpike(s) {
  ctx.save();
  const n = Math.floor(s.w / 22);
  const step = s.w / n;
  ctx.fillStyle = '#9aa0a6';
  for (let i = 0; i < n; i++) {
    const x0 = s.x + i * step;
    ctx.beginPath(); ctx.moveTo(x0, s.y); ctx.lineTo(x0 + step / 2, s.y - 20); ctx.lineTo(x0 + step, s.y); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#6d7480'; ctx.fillRect(s.x, s.y - 2, s.w, 4);
  ctx.restore();
}

function drawSpring(s) {
  ctx.save();
  const c = s.anim > 0 ? 8 : 0;
  const top = s.y - 16 + c;
  ctx.fillStyle = '#e74c3c'; roundRect(s.x, top, s.w, 16, 3); ctx.fill();
  ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = top + 4; y < s.y - 1; y += 4) { ctx.moveTo(s.x + 4, y); ctx.lineTo(s.x + s.w - 4, y + 2); }
  ctx.stroke();
  ctx.fillStyle = '#7a0000'; ctx.fillRect(s.x, s.y - 2, s.w, 3);
  ctx.restore();
}

function drawMover(m, t) {
  if (m.elevator) { drawElevator(m, t); return; }
  if (m.rotate) { drawRotator(m, t); return; }
  if (m.cart) { drawMinecart(m, t); return; }
  ctx.save();
  if (m.tx >= 0) {
    // 终点幽灵标记：显示平台会移动到哪里
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    roundRect(m.x1, m.y1, m.w, m.h, 4); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(0,0,0,.12)'; roundRect(m.x, m.y - 2, m.w, m.h, 4); ctx.fill();
  ctx.fillStyle = '#b07a3c'; roundRect(m.x, m.y, m.w, m.h, 3); ctx.fill();
  ctx.fillStyle = '#d99b4a'; roundRect(m.x, m.y, m.w, 9, 3); ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  for (let x = m.x + 8; x < m.x + m.w - 4; x += 12) { ctx.beginPath(); ctx.arc(x, m.y + m.h / 2, 2.5, 0, 7); ctx.fill(); }
  // 底部小滚轮（示意可移动）
  ctx.fillStyle = '#6d7480';
  ctx.beginPath(); ctx.arc(m.x + 7, m.y + m.h - 4, 4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + m.w - 7, m.y + m.h - 4, 4, 0, 7); ctx.fill();
  ctx.restore();
}

function drawPlank(p) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.14)'; roundRect(p.x, p.y + 2, p.w, p.h, 3); ctx.fill();
  // 木板主体（手绘木纹）；可通过木方块为整格高、更实心
  ctx.fillStyle = p.block ? '#9a6a34' : '#b07a3c'; roundRect(p.x, p.y, p.w, p.h, 3); ctx.fill();
  ctx.fillStyle = p.block ? '#b5854a' : '#c8904a'; roundRect(p.x, p.y, p.w, p.block ? 8 : 5, 3); ctx.fill();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5;
  for (let x = p.x + 6; x < p.x + p.w - 4; x += 10) {
    ctx.beginPath(); ctx.moveTo(x, p.y + 6); ctx.lineTo(x + 3, p.y + p.h - 2); ctx.stroke();
  }
  if (!p.block) {
    // 两端小钉
    ctx.fillStyle = '#6d7480';
    ctx.beginPath(); ctx.arc(p.x + 5, p.y + 7, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + p.w - 5, p.y + 7, 2, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawCannon(cn, t) {
  ctx.save();
  ctx.translate(cn.x + cn.w / 2, cn.y + cn.h / 2);
  const lift = cn.anim > 0 ? 4 : 0;
  // 底座
  ctx.fillStyle = '#5a6070'; roundRect(-20, 8, 40, 10, 4); ctx.fill();
  ctx.fillStyle = '#444a58'; roundRect(-24, 14, 48, 6, 4); ctx.fill();
  // 炮管（朝上）
  ctx.fillStyle = '#3a4048'; roundRect(-8, -22 + lift, 16, 30, 5); ctx.fill();
  ctx.fillStyle = '#22262c'; roundRect(-12, -18 + lift, 24, 8, 4); ctx.fill();
  // 炮口
  ctx.fillStyle = '#0f1115'; ctx.beginPath(); ctx.arc(0, -22 + lift, 5, 0, 7); ctx.fill();
  ctx.restore();
}

function drawLaser(lz, t) {
  const on = ((time + lz.phase) % lz.period) < lz.period * 0.5;
  ctx.save();
  if (on) {
    const h = lz.h * (0.85 + Math.sin(t * 22 + lz.phase) * 0.12);
    const g = ctx.createLinearGradient(0, lz.y + lz.h, 0, lz.y + lz.h - h);
    g.addColorStop(0, 'rgba(255,120,40,.95)');
    g.addColorStop(0.6, 'rgba(255,70,20,.8)');
    g.addColorStop(1, 'rgba(255,220,60,.05)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lz.x + 6, lz.y + lz.h);
    ctx.quadraticCurveTo(lz.x + 4, lz.y + lz.h - h * 0.5, lz.x + lz.w / 2, lz.y + lz.h - h);
    ctx.quadraticCurveTo(lz.x + lz.w - 4, lz.y + lz.h - h * 0.5, lz.x + lz.w - 6, lz.y + lz.h);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#5a6070'; roundRect(lz.x + 2, lz.y + lz.h - 8, lz.w - 4, 8, 3); ctx.fill();
    ctx.fillStyle = '#9aa0a6'; roundRect(lz.x + 8, lz.y + lz.h - 6, lz.w - 16, 3, 2); ctx.fill();
  }
  ctx.restore();
}

function drawGear(g, t) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  // 生命最后 0.6 秒渐隐消失
  ctx.globalAlpha = g.life != null ? Math.max(0, Math.min(1, g.life / 0.6)) : 1;
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6;
  // 轮体
  ctx.fillStyle = '#5a6270';
  ctx.beginPath(); ctx.arc(0, 0, g.r, 0, 7); ctx.fill();
  // 齿（8 个矩形齿，随轮体一起旋转）
  ctx.fillStyle = '#7a8292';
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 4);
    ctx.fillRect(g.r - 5, -6, 12, 12);
    ctx.restore();
  }
  // 齿尖高光
  ctx.fillStyle = '#9aa0a6';
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 4);
    ctx.fillRect(g.r - 5, -6, 12, 3);
    ctx.restore();
  }
  // 中心轴孔
  ctx.fillStyle = '#2a2e36';
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#6d7480';
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
  ctx.restore();
}

function drawWater(w, t) {
  ctx.save();
  // 池塘：从水面一直填到地图底部（替换脚下方块，非覆盖涂层）
  const bottom = mapH;
  ctx.fillStyle = 'rgba(40,150,235,.94)'; ctx.fillRect(w.x, w.y, w.w, bottom - w.y);
  ctx.fillStyle = 'rgba(80,190,255,.9)'; ctx.fillRect(w.x, w.y, w.w, 9);
  // 水面波纹
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let x = w.x; x < w.x + w.w; x += 20) {
    const yy = w.y + 6 + Math.sin(t * 4 + x * 0.12) * 4;
    ctx.beginPath(); ctx.arc(x, yy, 5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(20,90,160,.9)'; ctx.fillRect(w.x, w.y, w.w, 3);
  ctx.restore();
}

function drawEnemy(e, time) {
  if (e.dead) return;
  ctx.save();
  ctx.translate(e.x, e.y);
  const bob = e.grounded ? Math.abs(Math.sin(time * 10 + e.x * 0.1)) * 3 : 0;
  ctx.translate(0, -bob);

  if (e.type === 'boss' && e.bossKind === 'demon') {
    // 方块魔王：暗色魔方 + 金王冠 + 发光双眼 + 利齿嘴
    const flash = e.hitFlash > 0;
    const vuln = bossVulnerable(e);           // 黄眼 = 可被攻击
    const warn = e.eyeMode === 'warn';        // 警告闪烁（即将黄眼）
    const warnBlink = warn && Math.floor(time * 10) % 2 === 0;
    const bw = e.hw * 2, bh = e.hh * 2;
    // 身体（竖向渐变 + 辉光）
    ctx.save(); ctx.shadowColor = vuln ? 'rgba(255,210,60,.75)' : 'rgba(255,40,40,.6)'; ctx.shadowBlur = vuln ? 24 : 15;
    const body = ctx.createLinearGradient(0, -e.hh, 0, e.hh);
    if (flash) { body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#ffe0e0'); }
    else if (vuln) { body.addColorStop(0, '#5a1c28'); body.addColorStop(1, '#2a0a12'); }
    else { body.addColorStop(0, '#3d0f18'); body.addColorStop(1, '#1e060c'); }
    ctx.fillStyle = body;
    roundRect(-e.hw, -e.hh, bw, bh, 8); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = flash ? '#fff' : '#000'; ctx.lineWidth = 3;
    roundRect(-e.hw, -e.hh, bw, bh, 8); ctx.stroke();
    // 顶部高光
    ctx.fillStyle = flash ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.08)';
    roundRect(-e.hw + 4, -e.hh + 4, bw - 8, e.hh - 6, 5); ctx.fill();
    // 金王冠
    ctx.fillStyle = flash ? '#fff' : '#ffd23e';
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -e.hh - 1); ctx.lineTo(-16, -e.hh - 10); ctx.lineTo(-9, -e.hh - 5);
    ctx.lineTo(-3, -e.hh - 14); ctx.lineTo(3, -e.hh - 5); ctx.lineTo(9, -e.hh - 12);
    ctx.lineTo(16, -e.hh - 4); ctx.lineTo(16, -e.hh - 1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = vuln ? '#7a5200' : '#e74c3c';
    ctx.beginPath(); ctx.arc(0, -e.hh - 6, 2.6, 0, 7); ctx.fill();
    const ex = e.dir > 0 ? 6 : -6;
    // 眼睛：黄眼=黄色发光，红眼=红色，警告=红黄快速闪烁
    const eyeCol = vuln ? '#ffd23e' : (warnBlink ? '#ffd23e' : '#ff3b3b');
    ctx.save(); ctx.shadowColor = eyeCol; ctx.shadowBlur = vuln ? 16 : (warn ? 15 : 12);
    ctx.fillStyle = eyeCol;
    ctx.beginPath(); ctx.ellipse(-13 + ex, -5, 6.5, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13 + ex, -5, 6.5, 8, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = vuln ? '#4a2f00' : '#200000';
    ctx.beginPath(); ctx.arc(-13 + ex + 2, -5, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(13 + ex + 2, -5, 2.6, 0, 7); ctx.fill();
    // 怒眉
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22 + ex, -17); ctx.lineTo(-5 + ex, -13);
    ctx.moveTo(22 + ex, -17); ctx.lineTo(5 + ex, -13);
    ctx.stroke();
    // 利齿嘴
    ctx.fillStyle = '#000'; roundRect(-14 + ex, 8, 28, 11, 3); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(i * 9 + ex - 3, 9); ctx.lineTo(i * 9 + ex, 13); ctx.lineTo(i * 9 + ex + 3, 9);
    }
    ctx.closePath(); ctx.fill();
    // 警告闪烁：头顶红色感叹号 + 脉动光晕（动画警告）
    if (warn) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 22);
      const wy = -e.hh - 38;
      ctx.save();
      ctx.shadowColor = 'rgba(255,60,60,.95)'; ctx.shadowBlur = 16;
      ctx.fillStyle = warnBlink ? 'rgba(255,80,40,.95)' : 'rgba(200,30,30,.95)';
      ctx.beginPath(); ctx.arc(0, wy, 11 + pulse * 2.5, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, wy + 1);
      ctx.textBaseline = 'alphabetic';
    }
    // 头顶提示：黄眼=踩头；警告=危险；红眼=倒计时到下次黄眼
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    if (vuln) {
      ctx.fillStyle = 'rgba(255,210,60,.95)';
      ctx.fillText(t('黄眼 · 踩头!'), 0, -e.hh - 24);
    } else if (warn) {
      ctx.fillStyle = warnBlink ? 'rgba(255,80,40,.95)' : 'rgba(255,255,255,.9)';
      ctx.fillText(t('危险!'), 0, -e.hh - 54);
    } else {
      const remain = Math.max(0, (BOSS_EYE_CYCLE - BOSS_WARN) - (e.eyeT || 0));
      ctx.fillStyle = 'rgba(255,90,90,.85)';
      ctx.fillText(t('红眼 ') + Math.ceil(remain) + 's', 0, -e.hh - 24);
    }
    ctx.restore();
    return;
  }

  // 新 Boss（非魔王）：按 bossKind 分发各自绘制
  if (e.type === 'boss') {
    if (e.bossKind === 'crusher') drawBossCrusher(e, time);
    else if (e.bossKind === 'claw') drawBossClaw(e, time);
    else if (e.bossKind === 'spider') drawBossSpider(e, time);
    else drawBossSquare(e, time);
    ctx.restore();
    return;
  }

  // 飞行怪 / 掉炸弹怪：带翅膀的浮空小怪
  if (e.type === 'flyer' || e.type === 'bomber') {
    const flap = Math.sin(e.phase * 6) * 6;
    ctx.fillStyle = e.type === 'bomber' ? '#4a1220' : '#1a2a4a';
    ctx.save(); ctx.shadowColor = e.type === 'bomber' ? 'rgba(255,60,90,.5)' : 'rgba(120,180,255,.5)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, e.hw, 0, 7); ctx.fill(); ctx.restore();
    // 翅膀
    ctx.fillStyle = e.type === 'bomber' ? '#6a2030' : '#2a4a7a';
    ctx.beginPath(); ctx.ellipse(-e.hw, 0, 9, 6 + flap, -0.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(e.hw, 0, 9, 6 - flap, 0.6, 0, 7); ctx.fill();
    // 眼睛
    const fex = e.dir > 0 ? 3 : -3;
    ctx.fillStyle = e.type === 'bomber' ? '#ff5a5a' : '#ffd23e';
    ctx.beginPath(); ctx.arc(-4 + fex, -2, 2.6, 0, 7); ctx.arc(4 + fex, -2, 2.6, 0, 7); ctx.fill();
    if (e.type === 'bomber') {
      ctx.fillStyle = '#ff8a3d'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 6); ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    return;
  }

  // 炮塔：定点炮台，炮管朝玩家
  if (e.type === 'turret') {
    ctx.fillStyle = '#3a3f4a'; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh * 2, 6); ctx.fill();
    ctx.fillStyle = '#5a6272'; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh, 6); ctx.fill();
    ctx.fillStyle = '#22262e'; ctx.beginPath(); ctx.arc(0, 0, e.hw * 0.55, 0, 7); ctx.fill();
    const aim = e.aim != null ? e.aim : Math.atan2(ball.y - e.y, ball.x - e.x);
    ctx.strokeStyle = '#20242c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(aim) * e.hw * 0.95, Math.sin(aim) * e.hw * 0.95); ctx.stroke();
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(Math.cos(aim) * e.hw * 0.95, Math.sin(aim) * e.hw * 0.95, 4, 0, 7); ctx.fill();
    ctx.restore();
    return;
  }

  // 水怪（食人鱼）：绿色鱼身 + 尾巴 + 利齿
  if (e.type === 'piranha') {
    const dir = e.dir > 0 ? 1 : -1;
    const flap = Math.sin(e.phase * 6) * 3;
    ctx.save();
    ctx.shadowColor = 'rgba(70,220,170,.5)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#1e7a58';
    ctx.beginPath(); ctx.ellipse(0, 0, e.hw, e.hh * 0.85, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2f9e72';
    ctx.beginPath(); ctx.ellipse(0, -e.hh * 0.2, e.hw * 0.78, e.hh * 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1e7a58';
    ctx.beginPath();
    ctx.moveTo(-dir * e.hw * 0.85, 0);
    ctx.lineTo(-dir * (e.hw + 9), -e.hh * 0.6 + flap);
    ctx.lineTo(-dir * (e.hw + 9), e.hh * 0.6 + flap);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#156149';
    ctx.beginPath(); ctx.moveTo(-4, -e.hh * 0.4); ctx.lineTo(2, -e.hh - 5); ctx.lineTo(7, -e.hh * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0c3a28';
    ctx.beginPath(); ctx.arc(dir * e.hw * 0.5, 2, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -1; i <= 1; i++) {
      const tx = dir * e.hw * 0.38 + i * 3.2;
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + 1.5, 4.5); ctx.lineTo(tx + 3, 0); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(dir * e.hw * 0.22, -e.hh * 0.32, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(dir * e.hw * 0.22 + 1, -e.hh * 0.32, 1.2, 0, 7); ctx.fill();
    ctx.restore();
    return;
  }

  // 走路类小怪：按类型配色 + 装饰
  const SKIN = {
    walker:     { body: '#15151d', top: '#22222e', eye: '#ff3b3b', glow: 'rgba(255,40,40,.45)' },
    bull:       { body: '#3a2412', top: '#4a3018', eye: '#ffcf4a', glow: 'rgba(255,160,40,.55)' },
    fast:       { body: '#2a0a14', top: '#3a1220', eye: '#ff5a5a', glow: 'rgba(255,80,80,.5)' },
    jumper:     { body: '#1a1a2a', top: '#26263a', eye: '#ffb84a', glow: 'rgba(255,180,74,.5)' },
    spiky:      { body: '#30363e', top: '#3a424c', eye: '#ff5a5a', glow: 'rgba(200,210,220,.5)' },
    armored:    { body: '#4a5460', top: '#5a6674', eye: '#ff3b3b', glow: 'rgba(160,170,185,.5)' },
    large:      { body: '#3d1a28', top: '#4d2432', eye: '#ff6b6b', glow: 'rgba(180,60,90,.5)' },
    charger:    { body: '#3d0f0f', top: '#4d1515', eye: '#ff5a5a', glow: 'rgba(255,60,60,.55)' },
    tracker:    { body: '#2a1a08', top: '#3a2610', eye: '#ffb84a', glow: 'rgba(255,160,40,.5)' },
    pusher:     { body: '#3a2a14', top: '#4a3818', eye: '#ffcf4a', glow: 'rgba(200,140,60,.5)' },
    shooter:    { body: '#1a1a1a', top: '#262626', eye: '#ff8a3d', glow: 'rgba(255,138,61,.5)' },
    unkillable: { body: '#3a0a0a', top: '#4a1010', eye: '#ff2020', glow: 'rgba(255,32,32,.6)' },
    gated:      { body: '#4a3416', top: '#5a4220', eye: '#ffd23e', glow: 'rgba(200,170,80,.5)' },
  };
  const sk = SKIN[e.type] || SKIN.walker;
  const flash = e.hitFlash > 0;
  ctx.save(); ctx.shadowColor = sk.glow; ctx.shadowBlur = 8;
  ctx.fillStyle = flash ? '#ffffff' : sk.body; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh * 2, 5); ctx.fill();
  ctx.restore();
  ctx.fillStyle = flash ? '#ffe0e0' : sk.top; roundRect(-e.hw, -e.hh, e.hw * 2, e.hh, 4); ctx.fill();
  // 牛角
  if (e.type === 'bull') {
    ctx.fillStyle = '#f3ead6';
    ctx.beginPath(); ctx.moveTo(-12, -e.hh); ctx.lineTo(-7, -e.hh - 12); ctx.lineTo(-3, -e.hh); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -e.hh); ctx.lineTo(7, -e.hh - 12); ctx.lineTo(3, -e.hh); ctx.closePath(); ctx.fill();
  }
  // 带刺怪：顶部尖刺
  if (e.type === 'spiky' || e.type === 'unkillable') {
    ctx.fillStyle = '#d8dee6'; ctx.strokeStyle = '#6a7480'; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      const sx = i * (e.hw * 0.55);
      ctx.beginPath(); ctx.moveTo(sx - 3, -e.hh + 1); ctx.lineTo(sx, -e.hh - 8); ctx.lineTo(sx + 3, -e.hh + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // 重甲/巨怪：血条
  if (e.type === 'armored' || e.type === 'large') {
    const bw = e.hw * 2, hpw = Math.max(0, (e.hp || 0) / 3) * bw;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(-e.hw, -e.hh - 10, bw, 5, 2); ctx.fill();
    ctx.fillStyle = '#ff5a5a'; if (hpw > 1) { roundRect(-e.hw + 1, -e.hh - 9, hpw - 2, 3, 1.5); ctx.fill(); }
  }
  // 机关克星：头顶锁（未触发时）
  if (e.type === 'gated' && !switches.some(s => s.on)) {
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔒', 0, -e.hh - 8); ctx.textBaseline = 'alphabetic';
  }
  const ex = e.dir > 0 ? 3 : -3;
  ctx.save();
  ctx.shadowColor = sk.eye; ctx.shadowBlur = 9;
  ctx.fillStyle = sk.eye;
  ctx.beginPath(); ctx.ellipse(-6 + ex, -4, 3.2, 4.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6 + ex, -4, 3.2, 4.4, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#180000';
  ctx.beginPath(); ctx.arc(-6 + ex + 1.2, -4, 1.4, 0, 7); ctx.arc(6 + ex + 1.2, -4, 1.4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11 + ex, -10); ctx.lineTo(-3 + ex, -7.5);
  ctx.moveTo(11 + ex, -10); ctx.lineTo(3 + ex, -7.5);
  ctx.stroke();
  ctx.restore();
}

function drawStar(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStarCollect(s, t) {
  if (s.taken) return;
  const bob = Math.sin(t * 3 + s.x * 0.05) * 4;
  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.fillStyle = '#ffd23e'; drawStar(0, 0, 14); ctx.fill();
  ctx.strokeStyle = '#e0a000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; drawStar(0, 0, 5); ctx.fill();
  ctx.restore();
}

function drawFlag(f, t) {
  ctx.save();
  ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(f.x, f.y + 70); ctx.lineTo(f.x, f.y - 40); ctx.stroke();
  const wave = Math.sin(t * 5) * 4;
  ctx.fillStyle = '#e23a3a';
  ctx.beginPath(); ctx.moveTo(f.x, f.y - 40);
  ctx.lineTo(f.x + 46, f.y - 28 + wave); ctx.lineTo(f.x, f.y - 12);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(f.x + 16, f.y - 28 + wave * .5, 4, 0, 7); ctx.fill();
  ctx.restore();
}

function drawCheckpoint(cp, t) {
  ctx.save();
  const active = cp.taken;
  // 底座
  ctx.fillStyle = '#6d7480'; roundRect(cp.x - 8, cp.y + 18, 16, 6, 2); ctx.fill();
  // 旗杆
  ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cp.x, cp.y + 20); ctx.lineTo(cp.x, cp.y - 32); ctx.stroke();
  // 旗帜（未激活灰、已激活绿）
  const wave = Math.sin(t * 5) * 3;
  const col = active ? '#3fcf5f' : '#b8bec6';
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(cp.x, cp.y - 32);
  ctx.lineTo(cp.x + 32, cp.y - 22 + wave); ctx.lineTo(cp.x, cp.y - 8);
  ctx.closePath(); ctx.fill();
  // 激活后：亮起的光点 + 光圈
  if (active) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cp.x + 9, cp.y - 22 + wave * .5, 3, 0, 7); ctx.fill();
    const p = 0.5 + Math.sin(t * 4) * 0.2;
    ctx.strokeStyle = `rgba(90,255,150,${p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cp.x, cp.y - 10, 20 + Math.sin(t * 4) * 3, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

/* Boss 陷阱水：预警圈 → 水 */
function drawWaterTrap(wt, t) {
  ctx.save();
  if (wt.warn > 0) {
    // 预警：红色圆圈 + 闪烁，提示即将出水
    const k = wt.warn / 3;
    const pulse = 0.4 + Math.sin(t * 12) * 0.25;
    ctx.strokeStyle = `rgba(255,70,60,${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(wt.x + wt.w / 2, wt.y + 8, wt.w / 2, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,70,60,${0.25 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(wt.x + wt.w / 2, wt.y + 8, wt.w / 2, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5a4a';
    ctx.fillText('⚠', wt.x + wt.w / 2, wt.y - 8);
  } else {
    // 真水坑：从水面一直填到地图底部（替换脚下方块，非覆盖涂层）
    const bottom = mapH;
    ctx.fillStyle = 'rgba(40,150,235,.94)'; ctx.fillRect(wt.x, wt.y, wt.w, bottom - wt.y);
    ctx.fillStyle = 'rgba(80,190,255,.9)'; ctx.fillRect(wt.x, wt.y, wt.w, 9);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let x = wt.x; x < wt.x + wt.w; x += 20) {
      const yy = wt.y + 6 + Math.sin(t * 4 + x * 0.12) * 4;
      ctx.beginPath(); ctx.arc(x, yy, 5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(20,90,160,.9)'; ctx.fillRect(wt.x, wt.y, wt.w, 3);
  }
  ctx.restore();
}

/* 地表装饰：小花 + 草簇（确定性摆放，不闪烁） */
function drawFlora() {
  for (const s of solids) {
    if (s.type !== 'grass') continue;
    for (let x = s.x + 10; x < s.x + s.w - 8; x += 26) {
      const h = Math.abs(Math.sin(x * 12.9898) * 43758.5453) % 1;
      if (h < 0.45) continue;
      const cx = x + (h * 6 - 2);
      if (h < 0.72) {
        // 草簇
        ctx.fillStyle = '#8fef72';
        ctx.beginPath();
        ctx.moveTo(cx, s.y + 2); ctx.lineTo(cx - 3, s.y - 7); ctx.lineTo(cx + 1, s.y + 2);
        ctx.lineTo(cx + 4, s.y - 6); ctx.lineTo(cx + 6, s.y + 2);
        ctx.closePath(); ctx.fill();
      } else {
        // 小花
        const cols = ['#ff8ae2', '#ffd23e', '#ff7a6a', '#c9a2ff'];
        ctx.fillStyle = cols[Math.floor(h * 40) % cols.length];
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = p * Math.PI * 2 / 5;
          ctx.arc(cx + Math.cos(a) * 3.5, s.y - 7 + Math.sin(a) * 3.5, 2.4, 0, 7);
        }
        ctx.fill();
        ctx.fillStyle = '#fff7cf';
        ctx.beginPath(); ctx.arc(cx, s.y - 7, 2.2, 0, 7); ctx.fill();
      }
    }
  }
}

function drawBall(b, t) {
  if (!b) return;
  const sk = SKINS[skinIndex];
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.inv > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.4;
  if (god) {   // 无敌模式：金色护罩
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,60,.9)'; ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,210,60,.14)';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 3, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,210,60,.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 4, 0, 7); ctx.stroke();
  }
  if (fly) {   // 飞行模式：青色光晕 + 双翼
    ctx.save();
    ctx.shadowColor = 'rgba(90,225,255,.9)'; ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(90,225,255,.15)';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 3, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,225,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 5, 0, 7); ctx.stroke();
    const fl = Math.sin(t * 18) * 4;                 // 翅膀扇动
    ctx.fillStyle = 'rgba(90,225,255,.55)';
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * (b.r - 1), 0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(sx * 11, -8 - fl, sx * 16, -2 + fl);
      ctx.quadraticCurveTo(sx * 10, 2, 0, 4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  drawGlow(b.r, sk);
  ctx.save();
  ctx.shadowColor = sk.c1 + 'cc';
  ctx.shadowBlur = 16;
  drawBallBody(sk, b.r);
  ctx.restore();
  ctx.strokeStyle = sk.edge; ctx.lineWidth = 2.5; ctx.stroke();

  // 滚动纹理（空心球 / 纯色 / 像素 / 积木球跳过）
  if (!sk.hollow && !sk.solid && !sk.pixel && !sk.blocky) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, b.r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.rotate(b.angle);
    const SEGS = 6;
    for (let i = 0; i < SEGS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, b.r, i * Math.PI * 2 / SEGS, (i + 1) * Math.PI * 2 / SEGS);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.13)' : 'rgba(0,0,0,.13)';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-b.r, 0); ctx.lineTo(b.r, 0); ctx.stroke();
    ctx.restore();
  }

  if (!sk.solid && !sk.blocky) {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(-b.r * 0.34, -b.r * 0.42, b.r * 0.17, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, b.r - 1.5, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  }

  // 眼睛
  const lookX = clamp(b.vx / MAX_SPEED, -1, 1) * 2.8;
  const lookY = b.vy < -60 ? -1.8 : clamp(b.vy / 900, -0.4, 0.8) * 1.4;
  if (sk.face === 'smiley') {
    drawSmileyFace(b.r, lookX, lookY);
  } else {
    const blinkK = Math.sin(t * 2.1) > 0.988 ? 0.14 : 1;
    ctx.save();
    ctx.shadowColor = 'rgba(170,235,255,.95)';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-6.5 + lookX, -2.5 + lookY, 4.1, 4.7 * blinkK, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.5 + lookX, -2.5 + lookY, 4.1, 4.7 * blinkK, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(-6.5 + lookX * 1.5, -2.5 + lookY, 2.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(6.5 + lookX * 1.5, -2.5 + lookY, 2.1, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.arc(-7.3 + lookX * 1.5, -3.4 + lookY, 0.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(5.7 + lookX * 1.5, -3.4 + lookY, 0.8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3f0609'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11.5 + lookX * 0.5, -10.5 + lookY * 0.5); ctx.lineTo(-2.5 + lookX, -7.8 + lookY);
    ctx.moveTo(11.5 + lookX * 0.5, -10.5 + lookY * 0.5); ctx.lineTo(2.5 + lookX, -7.8 + lookY);
    ctx.stroke();
    ctx.strokeStyle = '#3f0609'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 6); ctx.quadraticCurveTo(1, 8.5, 6, 5.5); ctx.stroke();
  }

  // 眼镜（脸之后）→ 衣服 → 帽子（最上层）
  drawGlasses(b.r, glassesIndex);
  drawClothes(b.r, clothesIndex);
  drawHat(b.r, hatIndex);
  ctx.restore();
}

// Verty 说话气泡（球顶上方）
function drawBallSpeech() {
  if (!ball) return;
  if (SKINS[skinIndex].id !== 'verty' || time >= vertySpeechUntil) return;
  const text = "Hello, I'm Verty!";
  ctx.save();
  ctx.font = 'bold 16px system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  const w = tw + 28, h = 30;
  const bx = ball.x, by = ball.y - ball.r - 12;
  const x = bx - w / 2, y = by - h;
  // 尾巴（先画，气泡盖住顶端）
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.strokeStyle = '#b58a00'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.lineTo(bx, by + 9); ctx.lineTo(bx + 7, by); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 气泡主体
  roundRect(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = '#b58a00'; ctx.lineWidth = 2;
  roundRect(x, y, w, h, 12); ctx.stroke();
  // 文字
  ctx.fillStyle = '#7a4a00';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx, y + h / 2 + 1);
  ctx.restore();
}

function drawHUD() {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const x = 24 + i * 32, y = 26;
    drawHeart(x, y, i < hearts ? '#ff4d5a' : 'rgba(255,255,255,.25)');
  }
  if (god) {
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd23e'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    ctx.strokeText(t('无敌'), 24, 52); ctx.fillText(t('无敌'), 24, 52);
  }
  if (fly) {
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = '#5ae1ff'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    const fy = god ? 70 : 52;
    ctx.strokeText(t('飞行'), 24, fy); ctx.fillText(t('飞行'), 24, fy);
  }
  ctx.fillStyle = '#ffd23e'; drawStar(VIEW_W - 160, 26, 13); ctx.fill();
  ctx.strokeStyle = '#e0a000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3;
  ctx.strokeText(`${starsGot}/${scoreboardTotal}`, VIEW_W - 138, 34);
  ctx.fillText(`${starsGot}/${scoreboardTotal}`, VIEW_W - 138, 34);

  ctx.font = 'bold 18px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
  const lvName = playingCustom ? t(customDef.name) : levelName(levelIndex);
  ctx.strokeText(lvName, VIEW_W / 2, 30);
  ctx.fillText(lvName, VIEW_W / 2, 30);

  // Boss 血条
  const boss = enemies.find(e => e.type === 'boss' && !e.dead);
  if (boss) {
    const bw = 320, bx = VIEW_W / 2 - bw / 2, by = 46;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(bx - 4, by - 4, bw + 8, 24, 6); ctx.fill();
    ctx.fillStyle = '#4a4a58'; roundRect(bx, by, bw, 16, 4); ctx.fill();
    ctx.fillStyle = '#ff4d5a'; roundRect(bx, by, bw * Math.max(0, boss.hp) / boss.maxHp, 16, 4); ctx.fill();
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(t(bossName(boss)), VIEW_W / 2, by + 13);
  }
  // 右上角退出按钮（M 键）
  drawButton(VIEW_W - 156, 12, 100, 34, t('退出') + ' [M]', '#a33a3a');
  ctx.restore();
}

function drawHeart(x, y, color) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5);
  ctx.bezierCurveTo(5, -10, 9, -3, 0, 6);
  ctx.fill();
  ctx.restore();
}

function drawPanel(w, h) {
  ctx.fillStyle = 'rgba(16,30,50,.82)';
  roundRect(VIEW_W / 2 - w / 2, VIEW_H / 2 - h / 2, w, h, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
  roundRect(VIEW_W / 2 - w / 2, VIEW_H / 2 - h / 2, w, h, 18); ctx.stroke();
}

function drawButton(x, y, w, h, label, color) {
  ctx.fillStyle = color; roundRect(x, y, w, h, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(x, y, w, h * 0.5, 12); ctx.fill();
  ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

/* ============================ 标题布局 ============================ */
function chapterOf(i) { return Math.floor(i / CHAPTER_SIZE); }
function chapterUnlocked(c) { return maxUnlocked >= c * CHAPTER_SIZE + 1; }

function chapterTabs() {
  const n = CHAPTERS.length, w = 150, gap = 10;
  const totalW = n * w + (n - 1) * gap;
  const x0 = VIEW_W / 2 - totalW / 2, y = 224, h = 40;
  const tabs = [];
  for (let c = 0; c < n; c++) tabs.push({ c, x: x0 + c * (w + gap), y, w, h });
  return tabs;
}
function chapterTabAt(x, y) {
  for (const t of chapterTabs()) if (x > t.x && x < t.x + t.w && y > t.y && y < t.y + t.h) return t.c;
  return -1;
}
function drawChapterTabs() {
  for (const tab of chapterTabs()) {
    const locked = !chapterUnlocked(tab.c);
    const sel = tab.c === chapterIndex;
    ctx.fillStyle = sel ? 'rgba(255,255,255,.92)' : (locked ? 'rgba(0,0,0,.30)' : 'rgba(0,0,0,.40)');
    roundRect(tab.x, tab.y, tab.w, tab.h, 10); ctx.fill();
    if (sel) { ctx.strokeStyle = 'rgba(255,210,62,.8)'; ctx.lineWidth = 2.5; roundRect(tab.x, tab.y, tab.w, tab.h, 10); ctx.stroke(); }
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = sel ? '#17324d' : (locked ? 'rgba(255,255,255,.5)' : '#fff');
    ctx.fillText((locked ? '🔒 ' : '') + t(CHAPTERS[tab.c].label), tab.x + tab.w / 2, tab.y + tab.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

// 当前选中篇章的 15 个关卡按钮（i = 全局索引，k = 章内 0..14）
function levelButtons() {
  const cols = 5, bw = 72, bh = 46, gap = 12;
  const totalW = cols * bw + (cols - 1) * gap;
  const x0 = VIEW_W / 2 - totalW / 2, y0 = 276;
  const btns = [];
  const base = chapterIndex * CHAPTER_SIZE;
  for (let k = 0; k < CHAPTER_SIZE; k++) {
    const r = Math.floor(k / cols), c = k % cols;
    btns.push({ i: base + k, k, x: x0 + c * (bw + gap), y: y0 + r * (bh + 12), w: bw, h: bh });
  }
  return btns;
}

function drawTitle() {
  drawBackground('grass');
  drawFloatingText();
  const sk = SKINS[skinIndex];

  // 标题
  ctx.textAlign = 'center';
  ctx.font = '900 50px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
  ctx.strokeText('Badball.HSgame', VIEW_W / 2, 74);
  ctx.fillText('Badball.HSgame', VIEW_W / 2, 74);
  ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillStyle = '#17324d';
  ctx.fillText(t('滚动跳跃 · 收集星星 · 75 关冒险 · 五大篇章 · 击败魔王'), VIEW_W / 2, 104);

  // 账号显示 + 退出登录
  if (currentUser) {
    ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#17324d';
    ctx.fillText('👤 ' + currentUser, VIEW_W / 2, 150);
    drawButton(VIEW_W / 2 - 50, 158, 100, 30, t('退出登录'), '#a33a3a');
  }

  // 左下角红球预览（更衣室上面）
  const by = 390 + Math.sin(time * 2) * 4;
  ctx.save(); ctx.translate(93, by);
  drawGlow(30, sk);
  ctx.shadowColor = sk.c1 + 'cc'; ctx.shadowBlur = 22;
  drawBallBody(sk, 30);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = sk.edge; ctx.lineWidth = 3; ctx.stroke();
  if (!sk.solid) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(-11, -13, 6, 0, 7); ctx.fill(); }
  if (sk.face === 'smiley') {
    drawSmileyFace(30, 0, 0);
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-9, -5, 6, 7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -5, 6, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(-9, -5, 3, 0, 7); ctx.fill(); ctx.arc(9, -5, 3, 0, 7); ctx.fill();
    ctx.strokeStyle = sk.edge; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-4, -11);
    ctx.moveTo(16, -14); ctx.lineTo(4, -11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.quadraticCurveTo(1, 8, 8, 4); ctx.stroke();
  }
  drawGlasses(30, glassesIndex);
  drawClothes(30, clothesIndex);
  drawHat(30, hatIndex);
  ctx.restore();

  // 当前装扮名
  ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = '#17324d'; ctx.textAlign = 'center';
  const hatName = hatIndex > 0 ? t(HATS[hatIndex - 1].name) : t('无');
  const cloName = clothesIndex > 0 ? t(CLOTHES[clothesIndex - 1].name) : t('无');
  const glaName = glassesIndex > 0 ? t(GLASSES[glassesIndex - 1].name) : t('无');
  ctx.fillText(t('皮肤：') + t(sk.name) + (hatIndex ? ' · ' + hatName : '') + (clothesIndex ? ' · ' + cloName : '') + (glassesIndex ? ' · ' + glaName : ''), 93, by + 46);

  // 篇章标签
  drawChapterTabs();

  // 关卡网格（当前篇章的 15 关）
  for (const b of levelButtons()) {
    const locked = b.i + 1 > maxUnlocked;
    const col = locked ? 'rgba(0,0,0,.25)' : themeColor(b.i);
    ctx.fillStyle = col; roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill();
    if (!locked) { ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(b.x, b.y, b.w, b.h * 0.5, 10); ctx.fill(); }
    ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = locked ? 'rgba(255,255,255,.45)' : '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(locked ? '🔒' : String(b.k + 1), b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    if (overrides[b.i]) {
      ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = '#ffe27a';
      ctx.fillText('✎', b.x + b.w - 13, b.y + 13);
    }
  }

  ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillText(t('← → 或 A D 移动 · ↑/空格/W 跳跃 · R 重开 · M 菜单 · U 无敌 · G 飞行'), VIEW_W / 2, 504);

  // 更衣室（左下角）
  drawButton(18, 452, 150, 42, '👕 ' + t('更衣室'), '#7a3fd0');
  drawButton(176, 452, 130, 42, '🎵 ' + t('音乐盒'), '#2f7fb8');
  // 版本号（右下角）
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.textAlign = 'right';
  ctx.fillText('v' + GAME_VERSION, VIEW_W - 16, VIEW_H - 12);
  ctx.textAlign = 'center';
  // 编辑器 / 我的关卡入口
  for (const b of titleEditorButtons()) drawButton(b.x, b.y, b.w, b.h, t(b.label), b.color);

  // 语言切换
  drawButton(VIEW_W - 232, 30, 86, 42, langName(LANG), 'rgba(0,0,0,.35)');
  // 音乐开关
  drawButton(VIEW_W - 140, 30, 58, 42, musicMuted ? '🔇' : '🎵', 'rgba(0,0,0,.35)');
  // 音效开关
  drawButton(VIEW_W - 76, 30, 58, 42, sfxMuted ? '🔕' : '🔊', 'rgba(0,0,0,.35)');
  // 新手教程
  drawButton(18, 30, 76, 42, t('🎓 教程'), 'rgba(0,0,0,.35)');
  // 制作组
  drawButton(104, 30, 92, 42, '👥 ' + t('制作组'), 'rgba(0,0,0,.35)');
}

/* ============================ 更衣室 ============================ */
function wardrobeColorBtns() {
  const cols = 13, sz = 40, gap = 8, x0 = 200, y0 = 82, rowGap = 8;
  const out = [];
  for (let i = 0; i < SKINS.length; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    out.push({ i, x: x0 + c * (sz + gap), y: y0 + r * (sz + rowGap), w: sz, h: sz });
  }
  return out;
}
function wardrobeHatBtns() {
  const sz = 52, gap = 8, x0 = 200, y0 = 210;
  const out = [];
  for (let i = 0; i <= HATS.length; i++) out.push({ idx: i, x: x0 + i * (sz + gap), y: y0, w: sz, h: sz });
  return out;
}
function wardrobeClothesBtns() {
  const sz = 52, gap = 8, x0 = 200, y0 = 302;
  const out = [];
  for (let i = 0; i <= CLOTHES.length; i++) out.push({ idx: i, x: x0 + i * (sz + gap), y: y0, w: sz, h: sz });
  return out;
}
function wardrobeGlassesBtns() {
  const sz = 52, gap = 8, x0 = 200, y0 = 394;
  const out = [];
  for (let i = 0; i <= GLASSES.length; i++) out.push({ idx: i, x: x0 + i * (sz + gap), y: y0, w: sz, h: sz });
  return out;
}
// 迷你球（无脸），用于帽子/衣服缩略图底部
function drawBallSwatch(r) {
  const sk = SKINS[skinIndex];
  drawGlow(r, sk);
  drawBallBody(sk, r);
  ctx.strokeStyle = sk.edge; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.stroke();
}
function drawWardrobe() {
  drawBackground('grass');
  drawButton(18, 16, 92, 42, t('← 返回'), 'rgba(0,0,0,.35)');

  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#7a3fd0'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.strokeText(t('更衣室'), VIEW_W / 2, 48);
  ctx.fillText(t('更衣室'), VIEW_W / 2, 48);

  // 左下角大预览
  const sk = SKINS[skinIndex];
  const px = 150, py = 440;
  ctx.save(); ctx.translate(px, py);
  drawGlow(46, sk);
  ctx.shadowColor = sk.c1 + 'cc'; ctx.shadowBlur = 24;
  drawBallBody(sk, 46);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = sk.edge; ctx.lineWidth = 3.5; ctx.stroke();
  if (!sk.solid) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(-16, -19, 8, 0, 7); ctx.fill(); }
  if (sk.face === 'smiley') {
    drawSmileyFace(46, 0, 0);
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-13, -7, 8, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, -7, 8, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(-13, -7, 4, 0, 7); ctx.fill(); ctx.arc(13, -7, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = sk.edge; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, -20); ctx.lineTo(-6, -15);
    ctx.moveTo(22, -20); ctx.lineTo(6, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(1, 12, 12, 6); ctx.stroke();
  }
  drawGlasses(46, glassesIndex);
  drawClothes(46, clothesIndex);
  drawHat(46, hatIndex);
  ctx.restore();

  ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = '#17324d'; ctx.textAlign = 'center';
  const hatName = hatIndex > 0 ? t(HATS[hatIndex - 1].name) : t('无');
  const cloName = clothesIndex > 0 ? t(CLOTHES[clothesIndex - 1].name) : t('无');
  const glaName = glassesIndex > 0 ? t(GLASSES[glassesIndex - 1].name) : t('无');
  ctx.fillText(t(sk.name) + ' · ' + hatName + ' · ' + cloName + ' · ' + glaName, px, py + 78);

  // 颜色区
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = '#17324d';
  ctx.fillText(t('颜色'), 200, 64);
  for (const b of wardrobeColorBtns()) {
    const s = SKINS[b.i], sel = b.i === skinIndex;
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = sel ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.28)';
    ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3; ctx.stroke(); }
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (s.glow) { ctx.save(); ctx.shadowColor = s.glow; ctx.shadowBlur = 10; ctx.fillStyle = s.glow; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.translate(cx, cy);
    drawBallBody(s, 16);
    ctx.strokeStyle = s.edge; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  // 帽子区
  ctx.fillText(t('帽子'), 200, 192);
  for (const b of wardrobeHatBtns()) {
    const sel = b.idx === hatIndex;
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = sel ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.28)';
    ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3; ctx.stroke(); }
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + 7;
    if (b.idx === 0) {
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t('无'), b.x + b.w / 2, b.y + b.h / 2);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.save(); ctx.translate(cx, cy);
      drawBallSwatch(14);
      drawHat(14, b.idx);
      ctx.restore();
    }
  }

  // 衣服区
  ctx.fillText(t('衣服'), 200, 284);
  for (const b of wardrobeClothesBtns()) {
    const sel = b.idx === clothesIndex;
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = sel ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.28)';
    ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3; ctx.stroke(); }
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + 8;
    if (b.idx === 0) {
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t('无'), b.x + b.w / 2, b.y + b.h / 2);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.save(); ctx.translate(cx, cy);
      drawBallSwatch(14);
      drawClothes(14, b.idx);
      ctx.restore();
    }
  }

  // 眼镜区
  ctx.fillText(t('眼镜'), 200, 376);
  for (const b of wardrobeGlassesBtns()) {
    const sel = b.idx === glassesIndex;
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = sel ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.28)';
    ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3; ctx.stroke(); }
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (b.idx === 0) {
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t('无'), b.x + b.w / 2, b.y + b.h / 2);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.save(); ctx.translate(cx, cy);
      drawBallSwatch(14);
      drawGlasses(14, b.idx);
      ctx.restore();
    }
  }
}

/* ============================ 制作组名单 ============================ */
function drawCredits() {
  drawBackground('space');
  drawPanel(560, 560);
  ctx.textAlign = 'center';
  ctx.font = '900 40px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.strokeText(t('制作组'), VIEW_W / 2, VIEW_H / 2 - 220);
  ctx.fillText(t('制作组'), VIEW_W / 2, VIEW_H / 2 - 220);

  const rows = [
    [t('游戏开发'), 'DeSe'],
    [t('音乐'), 'Sol & Zayne'],
    [t('美术与视觉设计'), 'DS'],
    [t('首席执行官'), 'Zayne'],
    [t('吉祥物'), 'Hamsger'],
    [t('支持与改进'), 'zgl'],
  ];
  let y = VIEW_H / 2 - 130;
  for (const [role, name] of rows) {
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.fillText(role + ':', VIEW_W / 2 - 24, y);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23e'; ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText(name, VIEW_W / 2 + 6, y);
    y += 44;
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = '#9fd0ff';
  ctx.fillText('🌐 Hamsger-redball-addon.com', VIEW_W / 2, VIEW_H / 2 + 150);
  drawButton(VIEW_W / 2 - 110, VIEW_H / 2 + 172, 220, 50, t('← 返回'), '#556');
}

function themeColor(i) {
  const t = LEVELS[i].theme;
  if (t === 'forest') return '#3f8a3a';
  if (t === 'cave') return '#5a6070';
  if (t === 'canyon') return '#c9762f';
  if (t === 'mine') return '#6b5d8a';
  if (t === 'space') return '#4a6fb5';
  return '#4f9e42';
}

function drawComplete() {
  drawWorld();
  drawPanel(440, 300);
  ctx.textAlign = 'center';
  ctx.font = '900 40px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.fillText(t('过关啦！'), VIEW_W / 2, VIEW_H / 2 - 90);
  ctx.font = 'bold 24px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(t('收集星星  {0} / {1}', starsGot, scoreboardTotal), VIEW_W / 2, VIEW_H / 2 - 40);
  const hasNext = !playingCustom && levelIndex < LEVELS.length - 1;
  drawButton(VIEW_W / 2 - 110, VIEW_H / 2 - 10, 220, 54, hasNext ? t('下一关') : t('返回菜单'), '#4f9e42');
  drawButton(VIEW_W / 2 - 110, VIEW_H / 2 + 58, 220, 44, t('返回菜单'), '#556');
}

function drawGameOver() {
  drawWorld();
  drawPanel(420, 260);
  ctx.textAlign = 'center';
  ctx.font = '900 44px system-ui, sans-serif'; ctx.fillStyle = '#ff4d5a';
  ctx.fillText(t('游戏结束'), VIEW_W / 2, VIEW_H / 2 - 70);
  ctx.font = '20px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(t('生命用完了，再试一次吧！'), VIEW_W / 2, VIEW_H / 2 - 24);
  drawButton(VIEW_W / 2 - 110, VIEW_H / 2, 220, 54, t('重试本关'), '#4f9e42');
  drawButton(VIEW_W / 2 - 110, VIEW_H / 2 + 66, 220, 44, t('返回菜单'), '#556');
}

/* ============================ Phase C 机关：绘制 ============================ */
function drawElevator(m, t) {
  ctx.save();
  const top = m.y0 - m.range;
  // 轨道（虚线）
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(m.x + m.w / 2, top); ctx.lineTo(m.x + m.w / 2, m.y0 + m.h); ctx.stroke();
  ctx.setLineDash([]);
  // 吊缆
  ctx.strokeStyle = '#6d7480'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(m.x + m.w / 2, top); ctx.lineTo(m.x + m.w / 2, m.y); ctx.stroke();
  // 轿厢平台
  ctx.fillStyle = 'rgba(0,0,0,.15)'; roundRect(m.x, m.y - 2, m.w, m.h, 4); ctx.fill();
  ctx.fillStyle = '#8a95a5'; roundRect(m.x, m.y, m.w, m.h, 3); ctx.fill();
  ctx.fillStyle = '#a8b0be'; roundRect(m.x, m.y, m.w, 6, 3); ctx.fill();
  ctx.strokeStyle = '#6d7480'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(m.x + 4, m.y - 10); ctx.lineTo(m.x + 4, m.y);
  ctx.moveTo(m.x + m.w - 4, m.y - 10); ctx.lineTo(m.x + m.w - 4, m.y); ctx.stroke();
  ctx.restore();
}
function drawRotator(m, t) {
  ctx.save();
  const cx = m.px + Math.cos(m.angle) * m.rad, cy = m.py + Math.sin(m.angle) * m.rad;
  // 支点
  ctx.fillStyle = '#6d7480';
  ctx.beginPath(); ctx.arc(m.px, m.py, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a4f58';
  ctx.beginPath(); ctx.arc(m.px, m.py, 3, 0, 7); ctx.fill();
  // 旋转臂
  ctx.strokeStyle = '#5a6270'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(m.px, m.py); ctx.lineTo(cx, cy); ctx.stroke();
  // 平台（保持水平）
  ctx.fillStyle = 'rgba(0,0,0,.12)'; roundRect(m.x, m.y - 2, m.w, m.h, 4); ctx.fill();
  ctx.fillStyle = '#b07a3c'; roundRect(m.x, m.y, m.w, m.h, 3); ctx.fill();
  ctx.fillStyle = '#d99b4a'; roundRect(m.x, m.y, m.w, 9, 3); ctx.fill();
  ctx.restore();
}
function drawMinecart(m, t) {
  ctx.save();
  // 轨道
  const railY = m.y + m.h + 4;
  ctx.strokeStyle = '#8a95a5'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(m.x0 - m.range, railY); ctx.lineTo(m.x0 + m.range + m.w, railY); ctx.stroke();
  ctx.strokeStyle = '#6d7480'; ctx.lineWidth = 2;
  for (let x = m.x0 - m.range; x < m.x0 + m.range + m.w; x += 24) {
    ctx.beginPath(); ctx.moveTo(x, railY); ctx.lineTo(x + 12, railY + 8); ctx.stroke();
  }
  // 车斗
  ctx.fillStyle = 'rgba(0,0,0,.14)'; roundRect(m.x, m.y - 2, m.w, m.h, 3); ctx.fill();
  ctx.fillStyle = '#6a7282'; roundRect(m.x, m.y, m.w, m.h, 3); ctx.fill();
  ctx.fillStyle = '#7a8292'; roundRect(m.x, m.y, m.w, 8, 3); ctx.fill();
  ctx.fillStyle = '#3a3f4a'; roundRect(m.x + 4, m.y + 9, m.w - 8, m.h - 12, 2); ctx.fill();
  // 车轮
  ctx.fillStyle = '#2a2e36';
  ctx.beginPath(); ctx.arc(m.x + 8, m.y + m.h, 6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + m.w - 8, m.y + m.h, 6, 0, 7); ctx.fill();
  ctx.restore();
}
function drawBoulder(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate((b.x / b.r) * 0.5);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 5;
  const g = ctx.createRadialGradient(-6, -6, 3, 0, 0, b.r);
  g.addColorStop(0, '#c7ced6'); g.addColorStop(0.7, '#9aa0a6'); g.addColorStop(1, '#6d7480');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.arc(4, 6, b.r - 6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.arc(-5, -5, 5, 0, 7); ctx.fill();
  ctx.restore();
}
function drawSeesaw(s, t) {
  ctx.save();
  // 支点
  ctx.fillStyle = '#6a7282';
  ctx.beginPath(); ctx.moveTo(s.pivotX - 12, s.pivotY); ctx.lineTo(s.pivotX + 12, s.pivotY); ctx.lineTo(s.pivotX, s.pivotY - 14); ctx.closePath(); ctx.fill();
  // 板面（绕支点旋转）
  ctx.translate(s.pivotX, s.pivotY);
  ctx.rotate(s.angle);
  ctx.fillStyle = 'rgba(0,0,0,.15)'; roundRect(-s.w / 2, -3, s.w, 12, 3); ctx.fill();
  ctx.fillStyle = '#c8904a'; roundRect(-s.w / 2, -5, s.w, 12, 3); ctx.fill();
  ctx.fillStyle = '#d99b4a'; roundRect(-s.w / 2, -5, s.w, 5, 3); ctx.fill();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-s.w / 2 + 10, -5); ctx.lineTo(-s.w / 2 + 10, 6);
  ctx.moveTo(s.w / 2 - 10, -5); ctx.lineTo(s.w / 2 - 10, 6); ctx.stroke();
  ctx.restore();
}
function drawPressureButton(b, t) {
  ctx.save();
  const cy = b.y + b.h / 2, h = b.on ? 3 : 8;
  ctx.fillStyle = '#4a4f58'; roundRect(b.x + 4, b.y - 2, b.w - 8, b.h + 2, 3); ctx.fill();
  ctx.fillStyle = b.on ? '#3fcf5f' : '#ffd23e';
  roundRect(b.x + 6, cy - h, b.w - 12, h * 2, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(b.x + 6, cy + h - 2, b.w - 12, 2);
  ctx.restore();
}
function drawConveyor(cv, t) {
  ctx.save();
  const y0 = cv.y + cv.h - 14;
  ctx.fillStyle = '#3a3f4a'; roundRect(cv.x, y0, cv.w, 14, 3); ctx.fill();
  ctx.fillStyle = '#4a4f58';
  ctx.fillRect(cv.x + 2, y0 + 2, cv.w - 4, 10);
  // 滚轮条纹（随 dir 滚动）
  const off = (time * 40 * cv.dir) % 10;
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
  for (let x = cv.x - 10 + off; x < cv.x + cv.w + 10; x += 10) {
    ctx.beginPath(); ctx.moveTo(x, y0 + 3); ctx.lineTo(x + 4, y0 + 11); ctx.stroke();
  }
  ctx.strokeStyle = '#2a2e36'; ctx.lineWidth = 1.5;
  ctx.strokeRect(cv.x + 0.5, y0 + 0.5, cv.w - 1, 13);
  ctx.restore();
}
function drawPendulum(p, t) {
  ctx.save();
  // 悬线
  ctx.strokeStyle = '#8a95a5'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(p.ax, p.ay); ctx.lineTo(p.bx, p.by); ctx.stroke();
  // 摆球（金属锤）
  ctx.translate(p.bx, p.by);
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, p.r);
  g.addColorStop(0, '#c7ced6'); g.addColorStop(1, '#6d7480');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, p.r - 5, 0, 7); ctx.stroke();
  ctx.restore();
}
function drawFan(f, t) {
  ctx.save();
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
  // 底座
  ctx.fillStyle = '#5a6070'; roundRect(f.x + 6, f.y + f.h - 8, f.w - 12, 8, 2); ctx.fill();
  // 风罩
  ctx.strokeStyle = '#8a95a5'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 7); ctx.stroke();
  // 扇叶（旋转）
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(f.on ? f.phase * 8 : 0.4);
  ctx.fillStyle = '#4ac0e0';
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -8, 0, -13); ctx.quadraticCurveTo(-6, -8, 0, 0); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // 上升气流
  if (f.on) {
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const yy = f.y - ((time * 90 + i * 22) % 70);
      ctx.beginPath(); ctx.moveTo(cx - 6 + i * 6, yy); ctx.lineTo(cx - 2 + i * 6, yy + 12); ctx.stroke();
    }
  }
  ctx.restore();
}
function drawFragile(f, t) {
  ctx.save();
  ctx.globalAlpha = f.broken ? 0.3 : 1;
  const o = f.life > 0 ? Math.sin(f.life * 60) * 1.5 : 0;
  ctx.fillStyle = '#c8904a'; roundRect(f.x + o, f.y, f.w, f.h, 2); ctx.fill();
  ctx.fillStyle = '#d99b4a'; roundRect(f.x + o, f.y, f.w, 4, 2); ctx.fill();
  ctx.strokeStyle = '#6e4a28'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(f.x + f.w / 2, f.y); ctx.lineTo(f.x + f.w / 2, f.y + f.h);
  ctx.moveTo(f.x + f.w * 0.3, f.y + 3); ctx.lineTo(f.x + f.w * 0.3, f.y + f.h - 2);
  ctx.moveTo(f.x + f.w * 0.7, f.y + 3); ctx.lineTo(f.x + f.w * 0.7, f.y + f.h - 2); ctx.stroke();
  ctx.restore();
}
function drawSaw(s, t) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#c0c8d0';
  ctx.beginPath(); ctx.arc(0, 0, s.r, 0, 7); ctx.fill();
  ctx.fillStyle = '#8b95a5';
  for (let i = 0; i < 10; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 5);
    ctx.beginPath(); ctx.moveTo(s.r - 3, -5); ctx.lineTo(s.r + 5, 0); ctx.lineTo(s.r - 3, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#5a6270';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  ctx.restore();
}
function drawExplosive(ex, t) {
  ctx.save();
  const cx = ex.x + ex.w / 2, cy = ex.y + ex.h / 2;
  const flash = ex.fuse > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.fillStyle = '#a33a2a'; roundRect(ex.x, ex.y, ex.w, ex.h, 5); ctx.fill();
  ctx.fillStyle = '#c85030'; roundRect(ex.x + 4, ex.y, ex.w - 8, 8, 4); ctx.fill();
  ctx.fillStyle = '#7a2a1e';
  ctx.fillRect(ex.x + 4, ex.y + ex.h / 2, ex.w - 8, 4);
  // 危险标识
  ctx.fillStyle = flash ? '#ffffff' : '#ffd23e';
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#7a2a1e';
  ctx.font = '900 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + 1);
  ctx.restore();
}
function drawKey(k, t) {
  if (k.taken) return;
  ctx.save();
  ctx.translate(k.x, k.y + Math.sin(t * 3 + k.x * 0.05) * 4);
  ctx.rotate(-0.5);
  ctx.strokeStyle = '#e8b23a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 13); ctx.lineTo(6, 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(5, 16); ctx.stroke();
  ctx.fillStyle = '#fff3c0';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  ctx.restore();
}
function drawRope(rp, t) {
  ctx.save();
  ctx.strokeStyle = '#c8904a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(rp.x, rp.y); ctx.lineTo(rp.x, rp.y + rp.h); ctx.stroke();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(rp.x - 2, rp.y); ctx.lineTo(rp.x - 2, rp.y + rp.h); ctx.stroke();
  ctx.restore();
}

function drawWorld() {
  drawBackground(theme);
  ctx.save();
  let sx = 0, sy = 0;
  if (shake > 0.5) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
  ctx.translate(-Math.round(cam.x) + sx, -Math.round(cam.y) + sy);
  for (const s of solids) drawSolid(s);
  for (const f of fakes) drawFake(f);
  for (const o of oneways) drawOneway(o);
  drawFlora();
  for (const m of movers) drawMover(m, time);
  for (const p of planks) drawPlank(p);
  for (const w of water) drawWater(w, time);
  for (const lv of lava) drawLava(lv, time);
  for (const sp of spikes) drawSpike(sp);
  for (const sp of springs) drawSpring(sp);
  for (const cn of cannons) drawCannon(cn, time);
  for (const lz of lasers) drawLaser(lz, time);
  for (const g of gears) drawGear(g, time);
  for (const wt of waterTraps) drawWaterTrap(wt, time);
  for (const cp of checkpoints) drawCheckpoint(cp, time);
  for (const sw of switches) drawSwitch(sw, time);
  for (const rp of ropes) drawRope(rp, time);
  for (const s of seesaws) drawSeesaw(s, time);
  for (const f of fans) drawFan(f, time);
  for (const cv of conveyors) drawConveyor(cv, time);
  for (const f of fragiles) drawFragile(f, time);
  for (const p of pendulums) drawPendulum(p, time);
  for (const s of saws) drawSaw(s, time);
  for (const ex of explosives) drawExplosive(ex, time);
  for (const k of keys) drawKey(k, time);
  for (const b of buttons) drawPressureButton(b, time);
  for (const b of boulders) drawBoulder(b);
  if (flag) drawFlag(flag, time);
  for (const s of stars) drawStarCollect(s, time);
  for (const b of boxes) drawBox(b);
  for (const e of enemies) drawEnemy(e, time);
  for (const p of projectiles) drawProjectile(p, time);
  for (const b of beams) drawBeam(b, time);
  for (const t of trail) {
    const a = (t.life / t.max) * 0.32;
    const tg = ctx.createRadialGradient(t.x, t.y, 3, t.x, t.y, t.r);
    tg.addColorStop(0, `rgba(255,70,50,${a})`);
    tg.addColorStop(1, 'rgba(255,70,50,0)');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill();
  }
  drawBall(ball, time);
  drawBallSpeech();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
    if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = 1.2; ctx.stroke(); }
    else { ctx.fillStyle = p.color; ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawChase();
}

function drawNarrative(st, btn) {
  if (state === 'ENDING') drawBackground('grass');
  else drawBackground(theme);
  drawPanel(600, 400);
  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.fillText(t(st.title), VIEW_W / 2, VIEW_H / 2 - 128);
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(VIEW_W / 2 - 240, VIEW_H / 2 - 104); ctx.lineTo(VIEW_W / 2 + 240, VIEW_H / 2 - 104); ctx.stroke();
  ctx.font = '21px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  let y = VIEW_H / 2 - 55;
  for (const line of st.lines) {
    ctx.fillText(t(line), VIEW_W / 2, y);
    y += 28;
  }
  const pulse = Math.floor(time * 3) % 2 === 0;
  drawButton(VIEW_W / 2 - 120, VIEW_H / 2 + 100, 240, 54, btn, pulse ? '#4f9e42' : '#3f8a34');
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillText(t('按 空格 / 回车 继续'), VIEW_W / 2, VIEW_H / 2 + 178);
  if (state === 'STORY') drawButton(VIEW_W - 124, 12, 64, 34, t('退出'), '#a33a3a');
}

/* ============================ 地形编辑器 ============================ */
let toast = { text: '', until: 0 };
function flashMsg(txt) { toast.text = txt; toast.until = time + 2.6; }

function tileColor(ch) { for (const p of PALETTE) if (p.ch === ch) return p.color; return '#888'; }

// 调色板每个图标的小美术（不再是纯色方块）
function drawTileIcon(ch, cx, cy) {
  ctx.save();
  const hw = 11, hh = 7;                    // 方块半宽/半高
  const blk = (c, x, y, w, h, r) => { ctx.fillStyle = c; roundRect(x, y, w, h, r || 2); ctx.fill(); };
  const cir = (c, x, y, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const str = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w || 1.3; ctx.lineCap = 'round'; };
  const eye = (x, y, r) => { cir('#fff', x, y, r); cir('#20242e', x, y, r * 0.5); };
  const tri = (c, pts) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  const gear = (gx, gy, r) => {
    str('#8b95a5', 1.3);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.moveTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); ctx.lineTo(gx + Math.cos(a) * (r + 2.4), gy + Math.sin(a) * (r + 2.4)); }
    ctx.stroke();
    ctx.fillStyle = '#8b95a5'; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill();
    cir('#2b313a', gx, gy, r * 0.34);
  };
  // 圆球小怪：身体 + 两只眼 + 可选装饰
  const critter = (c, r, deco) => {
    cir(c, cx, cy, r);
    str('rgba(0,0,0,.4)', 1); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    eye(cx - r * 0.36, cy - r * 0.1, r * 0.24); eye(cx + r * 0.36, cy - r * 0.1, r * 0.24);
    if (deco) deco(r);
  };

  switch (ch) {
    /* ---------- 地形 ---------- */
    case '.': str('rgba(255,255,255,.55)', 1.2); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.stroke(); ctx.setLineDash([]); break;
    case '#': blk('#5cb84a', cx - hw, cy - hh, hw * 2, hh * 2); str('#2e7d2c', 1.2);
      ctx.beginPath(); ctx.moveTo(cx - hw + 1, cy - hh); ctx.lineTo(cx - hw + 1, cy - hh - 3); ctx.lineTo(cx - hw + 5, cy - hh);
      ctx.moveTo(cx - 3, cy - hh); ctx.lineTo(cx - 3, cy - hh - 4); ctx.lineTo(cx + 1, cy - hh);
      ctx.moveTo(cx + hw - 5, cy - hh); ctx.lineTo(cx + hw - 5, cy - hh - 3); ctx.lineTo(cx + hw - 1, cy - hh); ctx.stroke(); break;
    case 'd': blk('#8a5a2b', cx - hw, cy - hh, hw * 2, hh * 2); cir('#5f3c1a', cx - 4, cy - 2, 1.4); cir('#5f3c1a', cx + 3, cy + 2, 1.4); cir('#5f3c1a', cx + 5, cy - 3, 1.2); break;
    case '=': blk('#7a8292', cx - hw, cy - hh, hw * 2, hh * 2); str('#565e6b', 1.2); ctx.beginPath(); ctx.moveTo(cx - hw, cy); ctx.lineTo(cx + hw, cy); ctx.stroke(); break;
    case 'i': blk('#a8e6ff', cx - hw, cy - hh, hw * 2, hh * 2); str('#ffffff', 1.5); ctx.beginPath(); ctx.moveTo(cx - hw + 3, cy - hh + 2); ctx.lineTo(cx + hw - 3, cy + hh - 2); ctx.stroke(); break;
    case 'm': blk('#6b4a2b', cx - hw, cy - hh, hw * 2, hh * 2); str('#4a3018', 1.3); ctx.beginPath(); ctx.moveTo(cx - 6, cy - hh + 1); ctx.lineTo(cx - 8, cy - hh + 4); ctx.moveTo(cx + 1, cy - hh + 1); ctx.lineTo(cx - 1, cy - hh + 4); ctx.moveTo(cx + 6, cy - hh + 1); ctx.lineTo(cx + 5, cy - hh + 4); ctx.stroke(); break;
    case 's': blk('#d9b36a', cx - hw, cy - hh, hw * 2, hh * 2); cir('#b8914a', cx - 4, cy - 1, 1.2); cir('#b8914a', cx + 2, cy + 3, 1.2); cir('#b8914a', cx + 6, cy - 2, 1.2); break;
    case 'u': blk('#b07a3c', cx - hw, cy - hh, hw * 2, hh * 2); str('#8a5a2b', 1.1); ctx.beginPath(); ctx.moveTo(cx - hw + 2, cy - 2); ctx.lineTo(cx + hw - 2, cy - 2); ctx.moveTo(cx - hw + 2, cy + 2); ctx.lineTo(cx + hw - 2, cy + 2); ctx.stroke(); break;
    case 'v': blk('#8a95a5', cx - hw, cy - hh, hw * 2, hh * 2); cir('#5c6470', cx - 4, cy - 2, 1.3); cir('#5c6470', cx + 4, cy - 2, 1.3); cir('#5c6470', cx, cy + 2, 1.3); break;
    case '[': tri('#7a8292', [[cx - hw, cy + hh], [cx + hw, cy + hh], [cx + hw, cy - hh]]); break;
    case ']': tri('#7a8292', [[cx - hw, cy + hh], [cx + hw, cy + hh], [cx - hw, cy - hh]]); break;
    case '(': ctx.fillStyle = '#7a8292'; ctx.beginPath(); ctx.moveTo(cx - hw, cy + hh); ctx.arc(cx - hw, cy + hh, hw * 2, -Math.PI / 2, 0); ctx.closePath(); ctx.fill(); break;
    case ')': ctx.fillStyle = '#7a8292'; ctx.beginPath(); ctx.moveTo(cx + hw, cy + hh); ctx.arc(cx + hw, cy + hh, hw * 2, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill(); break;
    case 'x': blk('#9a6a3f', cx - hw, cy - hh, hw * 2, hh * 2); str('#5c3a1a', 1.3); ctx.beginPath(); ctx.moveTo(cx - hw + 2, cy - hh); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - hw + 2, cy + hh); ctx.moveTo(cx + hw - 2, cy - hh); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx + hw - 2, cy + hh); ctx.stroke(); break;
    case 'f': ctx.setLineDash([3, 2]); str('rgba(154,166,182,.9)', 1.3); roundRect(cx - hw, cy - hh, hw * 2, hh * 2, 2); ctx.stroke(); ctx.setLineDash([]); break;
    case '>': blk('#2b6f9e', cx - hw, cy - 3, hw * 2, 6); str('#fff', 1.4); ctx.beginPath(); ctx.moveTo(cx + 3, cy - 1); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx + 3, cy + 1); ctx.stroke(); break;
    case '<': blk('#2b6f9e', cx - hw, cy - 3, hw * 2, 6); str('#fff', 1.4); ctx.beginPath(); ctx.moveTo(cx - 3, cy - 1); ctx.lineTo(cx - 7, cy); ctx.lineTo(cx - 3, cy + 1); ctx.stroke(); break;
    case 'W': blk('#b07a3c', cx - hw - 2, cy - 3, hw * 2 + 4, 6, 2); str('#7c4f22', 1); ctx.beginPath(); ctx.moveTo(cx - hw, cy); ctx.lineTo(cx + hw, cy); ctx.stroke(); break;

    /* ---------- 物品 ---------- */
    case 'B': blk('#c58a3f', cx - hw, cy - hh, hw * 2, hh * 2, 3); str('#8a5a2b', 1.5); ctx.beginPath(); ctx.moveTo(cx - hw + 2, cy - hh + 2); ctx.lineTo(cx + hw - 2, cy + hh - 2); ctx.moveTo(cx + hw - 2, cy - hh + 2); ctx.lineTo(cx - hw + 2, cy + hh - 2); ctx.stroke(); break;
    case 'r': cir('#aab0b6', cx, cy, 8); cir('#d6dade', cx - 2, cy - 2, 3); str('#6d7480', 1); ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.stroke(); break;
    case 'V': tri('#8a5a2b', [[cx - 4, cy + 2], [cx + 4, cy + 2], [cx, cy + 8]]); str('#c8904a', 2); ctx.beginPath(); ctx.moveTo(cx - 8, cy - 2); ctx.lineTo(cx + 8, cy - 4); ctx.stroke(); break;
    case '!': blk('#555b66', cx - 6, cy + 4, 12, 4, 2); cir('#ffd23e', cx, cy - 3, 6); cir('#e0a000', cx, cy - 3, 6); str('#b88100', 1.4); ctx.beginPath(); ctx.arc(cx, cy - 3, 4.5, 0, 7); ctx.stroke(); break;
    case '%': blk('#555b66', cx - 5, cy + 6, 10, 3, 2); str('#ffb84a', 2.2); ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx + 2, cy - 4); ctx.stroke(); cir('#ffd23e', cx + 2, cy - 5, 2.6); break;
    case '@': blk('#2b6f9e', cx - 9, cy - 2, 18, 5, 2); str('#fff', 1.2); ctx.beginPath(); ctx.moveTo(cx - 4, cy - 1); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - 4, cy + 1); ctx.moveTo(cx, cy - 1); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx, cy + 1); ctx.moveTo(cx + 4, cy - 1); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx + 4, cy + 1); ctx.stroke(); break;
    case 'E': blk('#8a95a5', cx - 9, cy, 18, 5, 2); str('#5c6470', 1.4); ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx - 3, cy - 6); ctx.lineTo(cx, cy - 8); ctx.lineTo(cx + 3, cy - 6); ctx.stroke(); break;
    case ';': str('#8a95a5', 1.3); ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 2); ctx.stroke(); cir('#8b95a5', cx, cy + 5, 3); break;
    case ':': cir('#4ac0e0', cx, cy, 2.5); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; str('#9be4ff', 2); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2); ctx.lineTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7); ctx.stroke(); } break;
    case '+': blk('#c8904a', cx - 9, cy - 1, 18, 4, 2); str('#8a5a2b', 1.1); ctx.beginPath(); ctx.moveTo(cx - 2, cy + 1); ctx.lineTo(cx, cy - 3); ctx.lineTo(cx + 2, cy + 1); ctx.stroke(); break;
    case ',': cir('#c0c8d0', cx, cy, 6.5); cir('#e6eaef', cx, cy, 2); str('#8a95a5', 1); ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, 7); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 5.5, cy + Math.sin(a) * 5.5); ctx.lineTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); ctx.stroke(); } break;
    case '?': blk('#e74c3c', cx - 6, cy - 6, 12, 12, 3); str('#7a1f14', 1.2); ctx.beginPath(); ctx.moveTo(cx - 6, cy - 1); ctx.lineTo(cx + 6, cy - 1); ctx.moveTo(cx - 6, cy + 3); ctx.lineTo(cx + 6, cy + 3); ctx.stroke(); cir('#c0392b', cx, cy, 1.4); break;
    case '1': cir('#ffd23e', cx - 4, cy - 4, 3.5); cir('#20242e', cx - 4, cy - 4, 1.4); str('#ffd23e', 2); ctx.beginPath(); ctx.moveTo(cx - 1, cy - 1); ctx.lineTo(cx + 6, cy + 6); ctx.stroke(); str('#ffd23e', 1.8); ctx.beginPath(); ctx.moveTo(cx + 4, cy + 4); ctx.lineTo(cx + 6, cy + 6); ctx.moveTo(cx + 3, cy + 6); ctx.lineTo(cx + 6, cy + 6); ctx.stroke(); break;
    case '\\': str('#c8904a', 2); ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.quadraticCurveTo(cx + 2, cy - 2, cx, cy + 7); ctx.stroke(); break;
    case '|': str('#8a95a5', 1.5); ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke(); cir('#5c6470', cx, cy - 5, 1.4); cir('#5c6470', cx, cy - 1, 1.4); cir('#5c6470', cx, cy + 3, 1.4); break;
    case '2': cir('#b07a3c', cx, cy + 1, 7); cir('#7c4f22', cx, cy + 1, 1.8); str('#b07a3c', 1.3); ctx.beginPath(); ctx.arc(cx, cy + 1, 9.5, -1.2, 0.6); ctx.stroke(); break;
    case '5': blk('#6a7282', cx - 7, cy - 6, 14, 9, 2); cir('#2b313a', cx - 4, cy + 5, 2.2); cir('#2b313a', cx + 4, cy + 5, 2.2); break;
    case '_': blk('#b07a3c', cx - 11, cy - 3, 22, 6, 2); str('#7c4f22', 1); ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke(); break;
    case '*': ctx.fillStyle = '#ffd23e'; drawStar(cx, cy, 8); ctx.fill(); ctx.strokeStyle = '#e0a000'; ctx.lineWidth = 1.2; ctx.stroke(); break;
    case '~': str('#ff9d3d', 2); ctx.beginPath(); ctx.moveTo(cx - 4, cy + 5); ctx.lineTo(cx + 4, cy + 3); ctx.lineTo(cx - 4, cy + 1); ctx.lineTo(cx + 4, cy - 1); ctx.lineTo(cx - 4, cy - 3); ctx.stroke(); break;
    case 'C': blk('#5a6070', cx - 7, cy + 1, 14, 6, 2); blk('#3a414e', cx - 3, cy - 2, 5, 5, 1); cir('#ffd23e', cx, cy + 4, 1.6); break;

    /* ---------- 敌人 ---------- */
    case 'e': critter('#ff8a3d', 7); break;
    case 'n': critter('#e74c3c', 7, r => { str('#fff', 1.5); ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy - r * 0.6); ctx.lineTo(cx - r * 0.9, cy - r - 3); ctx.moveTo(cx + r * 0.7, cy - r * 0.6); ctx.lineTo(cx + r * 0.9, cy - r - 3); ctx.stroke(); }); break;
    case 'a': critter('#ff6b4a', 6); str('rgba(255,255,255,.7)', 1.2); ctx.beginPath(); ctx.moveTo(cx - 8, cy - 5); ctx.lineTo(cx - 11, cy - 5); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 12, cy); ctx.moveTo(cx - 8, cy + 5); ctx.lineTo(cx - 11, cy + 5); ctx.stroke(); break;
    case 'j': critter('#ff9d3d', 6, r => { str('#fff', 1.4); ctx.beginPath(); ctx.moveTo(cx, cy - r - 5); ctx.lineTo(cx, cy - r - 9); ctx.moveTo(cx - 3, cy - r - 7); ctx.lineTo(cx, cy - r - 9); ctx.lineTo(cx + 3, cy - r - 7); ctx.stroke(); }); break;
    case 'k': critter('#c0c8d0', 6, r => { tri('#8a95a5', [[cx - 4, cy - r], [cx - 2, cy - r - 4], [cx, cy - r]]); tri('#8a95a5', [[cx - 1, cy - r], [cx, cy - r - 5], [cx + 1, cy - r]]); tri('#8a95a5', [[cx + 1, cy - r], [cx + 3, cy - r - 4], [cx + 4, cy - r]]); }); break;
    case 'h': critter('#8a95a5', 7, r => { cir('#5c6470', cx, cy - r * 0.5, r * 0.8); cir('#8a95a5', cx, cy - r * 0.5, r * 0.5); }); break;
    case 'A': critter('#b04a6a', 9); break;
    case 'q': critter('#ff5a5a', 7, r => { str('rgba(255,255,255,.8)', 1.3); ctx.beginPath(); ctx.moveTo(cx - r - 2, cy - r * 0.4); ctx.lineTo(cx - r - 5, cy - r * 0.4); ctx.moveTo(cx - r - 2, cy + r * 0.2); ctx.lineTo(cx - r - 5, cy + r * 0.2); ctx.stroke(); }); break;
    case 't': cir('#ffb84a', cx, cy, 7); str('rgba(0,0,0,.35)', 1); ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.stroke(); cir('#fff', cx, cy, 3.4); cir('#20242e', cx, cy, 1.8); break;
    case 'p': blk('#c58a3f', cx - 11, cy - 3, 10, 8, 1); cir('#ff8a3d', cx + 3, cy + 1, 5); eye(cx + 1.5, cy, 1.6); eye(cx + 4.5, cy, 1.6); break;
    case 'z': critter('#ff8a3d', 6, r => { blk('#5a6070', cx + r, cy - 2, 5, 4, 1); }); break;
    case 'y': critter('#7fb7ff', 6, r => { tri('#cfe4ff', [[cx - r, cy], [cx - r - 5, cy - 4], [cx - r - 5, cy + 2]]); tri('#cfe4ff', [[cx + r, cy], [cx + r + 5, cy - 4], [cx + r + 5, cy + 2]]); }); break;
    case 'Y': blk('#5a6070', cx - 5, cy - 1, 10, 7, 2); blk('#3a414e', cx - 2, cy - 5, 6, 5, 1); blk('#3a414e', cx + 1, cy - 5, 9, 3, 1); break;
    case 'b': critter('#ff4a6a', 6, r => { str('#8a5a2b', 1.5); ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r); ctx.quadraticCurveTo(cx + r + 3, cy - r - 3, cx + r + 2, cy - r - 6); ctx.stroke(); cir('#ffd23e', cx + r + 2, cy - r - 6, 1.8); }); break;
    case 'l': critter('#c0392b', 6, r => { str('rgba(255,255,255,.7)', 1.3); ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, 7); ctx.stroke(); }); break;
    case 'g': critter('#b07a4a', 6, r => { str('#8a5a2b', 1.2); ctx.beginPath(); ctx.arc(cx, cy + r + 2, 3, 0, 7); ctx.stroke(); }); break;
    case 'o': cir('#7d2b3f', cx, cy, 8); tri('#3a0f1a', [[cx - 6, cy - 4], [cx - 3, cy - 10], [cx - 2, cy - 4]]); tri('#3a0f1a', [[cx + 6, cy - 4], [cx + 3, cy - 10], [cx + 2, cy - 4]]); eye(cx - 3, cy - 1, 2.4); eye(cx + 3, cy - 1, 2.4); str('#fff', 1.2); ctx.beginPath(); ctx.moveTo(cx - 4, cy + 4); ctx.lineTo(cx + 4, cy + 4); ctx.stroke(); break;
    case 'O': blk('#8a5a2b', cx - 8, cy - 7, 16, 11, 2); cir('#5a3c1a', cx - 4, cy + 6, 3); cir('#5a3c1a', cx + 4, cy + 6, 3); eye(cx - 2, cy - 2, 1.8); eye(cx + 2, cy - 2, 1.8); break;
    case 'U': blk('#ff5012', cx - 5, cy - 2, 6, 6, 1); str('#ff5012', 2); ctx.beginPath(); ctx.moveTo(cx - 2, cy); ctx.lineTo(cx - 7, cy + 7); ctx.stroke(); cir('#ffd23e', cx - 7, cy + 7, 2.5); break;
    case 'X': cir('#5a6070', cx, cy, 5); str('#3a414e', 1.3); ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * Math.PI / 3; ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9 + 2); } ctx.stroke(); eye(cx - 2, cy - 1, 1.8); eye(cx + 2, cy - 1, 1.8); break;
    case 'Q': blk('#2b3f7d', cx - 7, cy - 6, 14, 12, 2); str('#9ab0ff', 1.3); ctx.strokeRect(cx - 6, cy - 3, 5, 3); ctx.strokeRect(cx + 1, cy - 3, 5, 3); cir('#9ab0ff', cx, cy + 2, 1.6); break;
    case '^': tri('#9aa0a6', [[cx - 9, cy + 3], [cx - 5, cy - 6], [cx - 1, cy + 3]]); tri('#9aa0a6', [[cx - 3, cy + 3], [cx + 1, cy - 7], [cx + 5, cy + 3]]); tri('#9aa0a6', [[cx + 2, cy + 3], [cx + 6, cy - 6], [cx + 9, cy + 3]]); break;
    case 'L': ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.quadraticCurveTo(cx + 7, cy - 2, cx + 4, cy + 6); ctx.quadraticCurveTo(cx + 2, cy + 2, cx - 2, cy + 6); ctx.quadraticCurveTo(cx - 6, cy + 1, cx, cy - 7); ctx.fill(); cir('#ffd23e', cx, cy + 1, 3); break;
    case 'G': gear(cx, cy, 6); break;
    case 'w': str('#4aa8ff', 2); ctx.beginPath(); ctx.moveTo(cx - 9, cy + 3); ctx.quadraticCurveTo(cx - 5, cy - 1, cx - 1, cy + 3); ctx.quadraticCurveTo(cx + 3, cy + 6, cx + 7, cy + 3); ctx.quadraticCurveTo(cx + 9, cy + 1, cx + 10, cy + 3); ctx.stroke(); str('#2b7fd0', 1.5); ctx.beginPath(); ctx.moveTo(cx - 8, cy - 1); ctx.quadraticCurveTo(cx - 4, cy - 4, cx + 1, cy - 1); ctx.quadraticCurveTo(cx + 5, cy + 1, cx + 8, cy - 1); ctx.stroke(); break;
    case '&': blk('#ff5012', cx - 9, cy - 2, 18, 6, 3); cir('#ffd23e', cx - 4, cy, 2); cir('#ff8a3d', cx + 3, cy + 1, 1.6); break;

    /* ---------- 特殊 ---------- */
    case 'F': str('#8a8f96', 2.2); ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy - 8); ctx.stroke(); ctx.fillStyle = '#e23a3a'; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 11, cy - 5); ctx.lineTo(cx, cy - 2); ctx.closePath(); ctx.fill(); cir('#ffd23e', cx + 3, cy - 6, 1.6); break;
    case 'P': cir('#4aa8ff', cx, cy, 8); str('#1d5f9e', 1); ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 4); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx - 2, cy + 4); ctx.closePath(); ctx.fill(); break;
    case 'R': str('#8a8f96', 2); ctx.beginPath(); ctx.moveTo(cx, cy + 7); ctx.lineTo(cx, cy - 7); ctx.stroke(); ctx.fillStyle = '#3fcf5f'; ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 9, cy - 5); ctx.lineTo(cx, cy - 3); ctx.closePath(); ctx.fill(); break;
    case 'M': blk('#2fbfa0', cx - 9, cy - 2, 18, 5, 2); str('#0f7f66', 1.4); ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx - 3, cy - 7); ctx.lineTo(cx, cy - 8); ctx.lineTo(cx + 3, cy - 7); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 7); ctx.moveTo(cx - 3, cy + 6); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx + 3, cy + 6); ctx.stroke(); break;
    case 'T': str('#ff8a8a', 1.6); ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.stroke(); cir('#ff8a8a', cx, cy, 2.5); ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke(); break;
    case 'S': gear(cx, cy, 5); cir('#ffd23e', cx, cy, 1.8); break;
    case 'D': blk('#5a6272', cx - 7, cy - 7, 14, 14, 2); cir('#cbd2dd', cx + 3, cy, 1.6); str('#3a414e', 1); ctx.beginPath(); ctx.moveTo(cx - 7, cy - 4); ctx.lineTo(cx + 7, cy - 4); ctx.stroke(); break;
    default: blk('#888', cx - hw, cy - hh, hw * 2, hh * 2); break;
  }
  ctx.restore();
}
function editorLayout() {
  const cell = 17;
  const gx = 16;
  const gy = 116;
  const viewW = VIEW_W - gx * 2;
  const maxCam = Math.max(0, EDIT_COLS * cell - viewW);
  editCamX = clamp(editCamX, 0, maxCam);
  return { cell, gx, gy, viewW, maxCam };
}
const PALETTE_CATS = ['地形', '物品', '敌人', '特殊'];
const PALETTE_PAGE_SIZE = 16;
const PALETTE_PER_ROW = 8;
function paletteFlat() {
  const out = [];
  for (const cat of PALETTE_CATS) {
    for (let i = 0; i < PALETTE.length; i++) if (PALETTE[i].cat === cat) out.push(i);
  }
  return out;
}
function paletteLayout() {
  const swW = 40, swH = 30, gap = 5;
  const flat = paletteFlat();
  const pages = Math.max(1, Math.ceil(flat.length / PALETTE_PAGE_SIZE));
  const page = clamp(Math.floor(editPalettePage), 0, pages - 1);
  const slice = flat.slice(page * PALETTE_PAGE_SIZE, (page + 1) * PALETTE_PAGE_SIZE);
  const rowY = [44, 82];
  const swatches = [], labels = [];
  let prevCat = null;
  slice.forEach((gi, k) => {
    const row = Math.floor(k / PALETTE_PER_ROW), col = k % PALETTE_PER_ROW;
    const x = 16 + col * (swW + gap), y = rowY[row];
    swatches.push({ i: gi, x, y });
    const cat = PALETTE[gi].cat;
    if (cat !== prevCat) { labels.push({ name: cat, x, y: y - 4 }); prevCat = cat; }
  });
  const prevBtn = { x: VIEW_W - 126, y: 44, w: 44, h: 30 };
  const nextBtn = { x: VIEW_W - 78, y: 44, w: 44, h: 30 };
  const pageInd = { x: VIEW_W - 122, y: 104, text: t('页 ') + (page + 1) + '/' + pages };
  return { swatches, labels, swW, swH, pages, page, prevBtn, nextBtn, pageInd };
}
function palettePageAt(x, y) {
  const PL = paletteLayout();
  if (x >= PL.prevBtn.x && x <= PL.prevBtn.x + PL.prevBtn.w && y >= PL.prevBtn.y && y <= PL.prevBtn.y + PL.prevBtn.h) return -1;
  if (x >= PL.nextBtn.x && x <= PL.nextBtn.x + PL.nextBtn.w && y >= PL.nextBtn.y && y <= PL.nextBtn.y + PL.nextBtn.h) return 1;
  return 0;
}
function editorButtons() {
  const defs = [
    { id: 'test', label: '▶测试', color: '#4f9e42' },
    { id: 'save', label: '💾保存', color: '#2f7fb8' },
    { id: 'rename', label: '✏改名', color: '#b8860b' },
    { id: 'load', label: '📥载入', color: '#2fbfa0' },
    { id: 'clear', label: '🗑清空', color: '#c0392b' },
    { id: 'export', label: '⤴导出', color: '#7a5fb8' },
    { id: 'import', label: '⤵导入', color: '#7a5fb8' },
    { id: 'back', label: '←返回', color: '#556' },
  ];
  const w = 68, h = 34, gap = 4;
  const total = defs.length * w + (defs.length - 1) * gap;
  let x = VIEW_W - total - 14;
  return defs.map((b, i) => ({ ...b, x: x + i * (w + gap), y: 8, w, h }));
}
function newEditGrid() {
  const rows = [];
  for (let r = 0; r < EDIT_ROWS; r++) rows.push('.'.repeat(EDIT_COLS));
  const surf = EDIT_ROWS - 2;
  rows[surf] = '#'.repeat(EDIT_COLS);
  rows[EDIT_ROWS - 1] = 'd'.repeat(EDIT_COLS);
  rows[surf - 1] = rows[surf - 1].slice(0, 2) + 'P' + rows[surf - 1].slice(3);
  rows[surf - 1] = rows[surf - 1].slice(0, EDIT_COLS - 3) + 'F' + rows[surf - 1].slice(EDIT_COLS - 2);
  return rows;
}
function saveEditDraft() { try { localStorage.setItem('rb_edit', JSON.stringify({ t: editTarget, c: customEditIndex, rows: editGrid })); } catch (e) {} }
function loadEditDraft() {
  try {
    const s = localStorage.getItem('rb_edit');
    if (s) {
      const d = JSON.parse(s);
      if (d && Array.isArray(d.rows) && d.rows.length === EDIT_ROWS) return { target: (d.t == null ? -1 : d.t), custom: (d.c == null ? -1 : d.c), rows: normRows(d.rows) };
    }
  } catch (e) {}
  return null;
}
function enterEditor() {
  const d = loadEditDraft();
  editGrid = d ? d.rows : newEditGrid();
  editTarget = d ? d.target : -1;
  customEditIndex = d ? d.custom : -1;
  editPalette = '#';
  editPainting = false;
  state = 'EDIT';
}
function newBlankEditor() {
  editGrid = newEditGrid();
  editTarget = -1;
  customEditIndex = -1;
  editPalette = '#';
  editPainting = false;
  try { localStorage.removeItem('rb_edit'); } catch (e) {}
  state = 'EDIT';
}
function paintCell(r, c, ch) {
  if (r < 0 || r >= EDIT_ROWS || c < 0 || c >= EDIT_COLS) return;
  const cur = editGrid[r][c];
  // 放置方块时只填「空气 .」和「泥土 d」，永不覆盖草(#)或其它机关；擦除(.)不受限
  if (ch !== '.' && cur !== '.' && cur !== 'd') return;
  editGrid[r] = editGrid[r].slice(0, c) + ch + editGrid[r].slice(c + 1);
  // 放草地(#)/泥土(d)时，自动向下填充泥土：一格放下，下面整列自动补 d，直到碰到其它方块
  if (ch === '#' || ch === 'd') {
    for (let rr = r + 1; rr < EDIT_ROWS; rr++) {
      const below = editGrid[rr][c];
      if (below === '.') editGrid[rr] = editGrid[rr].slice(0, c) + 'd' + editGrid[rr].slice(c + 1);
      else if (below === 'd') continue;
      else break;
    }
  }
}
function paintLine(r0, c0, r1, c1, ch) {
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  for (let s = 0; s <= steps; s++) {
    const r = Math.round(r0 + (r1 - r0) * s / Math.max(1, steps));
    const c = Math.round(c0 + (c1 - c0) * s / Math.max(1, steps));
    paintCell(r, c, ch);
  }
}
function editorCellAt(x, y) {
  const L = editorLayout();
  const c = Math.floor((x - L.gx + editCamX) / L.cell), r = Math.floor((y - L.gy) / L.cell);
  if (c < 0 || c >= EDIT_COLS || r < 0 || r >= EDIT_ROWS) return null;
  return { r, c };
}
function editorPaletteAt(x, y) {
  const PL = paletteLayout();
  for (const sw of PL.swatches) {
    if (x >= sw.x && x <= sw.x + PL.swW && y >= sw.y && y <= sw.y + PL.swH) return sw.i;
  }
  return -1;
}
function editorButtonAt(x, y) {
  for (const b of editorButtons()) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
  return null;
}
function editorScrollbarRect() {
  const L = editorLayout();
  const sy = L.gy + EDIT_ROWS * L.cell + 20, sh = 12;
  return { x: L.gx, y: sy, w: L.viewW, h: sh };
}
function editorScrollThumbW() {
  const L = editorLayout();
  return Math.max(46, L.viewW * (L.viewW / (EDIT_COLS * L.cell)));
}
function gridHasSpawn() { for (const row of editGrid) if (row.includes('P')) return true; return false; }
function playEdit() {
  if (!gridHasSpawn()) { flashMsg(t('请先放置出生点 P！')); return; }
  if (editTarget >= 0) {
    autoSaveMain();
    flashMsg(t('✅ 已自动保存到主线「') + currentMainName() + '」');
  } else {
    saveEditDraft();
  }
  hearts = 3;
  loadCustom({ name: '自定义关卡', theme: 'grass', groundType: 'grass', rows: editGrid.slice() });
  state = 'PLAY';
}
function autoSaveMain() {
  if (editTarget >= 0) {
    overrides[editTarget] = editGrid.slice();
    saveOverrides();
  }
  saveEditDraft();
}
function renameCurrent() {
  if (editTarget >= 0) {
    const nm = (prompt(t('新的关卡名字：'), levelName(editTarget)) || '').trim();
    if (!nm) return;
    overrideNames[editTarget] = nm;
    saveOverrideNames(); saveEditDraft();
    flashMsg(t('已改名为「') + nm + '」');
  } else {
    flashMsg(t('自定义关卡请在保存时起名（点 💾保存）'));
  }
}
function saveCurrent() {
  if (!gridHasSpawn()) { flashMsg(t('请先放置出生点 P 再保存！')); return; }
  if (editTarget >= 0) {
    autoSaveMain();
    flashMsg(t('已保存为主线 ') + currentMainName() + t('（覆盖原关卡）'));
  } else if (customEditIndex >= 0 && customLevels[customEditIndex]) {
    // 正在编辑已保存的自定义关卡：原地更新，不再弹窗、不再另存一份
    customLevels[customEditIndex].rows = editGrid.slice();
    saveCustomLevels(); saveEditDraft();
    flashMsg(t('已保存「') + customLevels[customEditIndex].name + t('」'));
  } else {
    const name = (prompt(t('关卡名字：'), t('我的关卡') + (customLevels.length + 1)) || '').trim();
    if (!name) return;
    customLevels.push({ name, rows: editGrid.slice() });
    customEditIndex = customLevels.length - 1;
    saveCustomLevels(); saveEditDraft();
    flashMsg(t('已保存「') + name + t('」→ 去“我的关卡”玩'));
  }
}
// 关卡显示名：覆盖名优先；生成关卡按篇章模板翻译，手写关卡名作为键翻译
function levelName(i) {
  if (overrideNames[i]) return overrideNames[i];
  if (i >= CHAPTER_SIZE) {
    const ch = CHAPTERS[chapterOf(i)];
    return t('{0}篇 · 第 {1} 关', t(ch.label), i % CHAPTER_SIZE + 1);
  }
  return t(LEVELS[i].name);
}
function currentMainName() { return editTarget >= 0 ? levelName(editTarget) : ''; }
function loadMain(i) {
  editTarget = i;
  customEditIndex = -1;
  editGrid = normRows(overrides[i] || LEVELS[i].rows);
  editPalette = '#';
  state = 'EDIT';
  flashMsg(t('已载入 ') + currentMainName() + t('（编辑会自动保存到主线）'));
}
function exportEdit() {
  const ascii = editGrid.join('\n');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(ascii); flashMsg(t('已复制关卡代码到剪贴板')); }
    else { prompt(t('复制这段关卡代码：'), ascii); }
  } catch (e) { prompt(t('复制这段关卡代码：'), ascii); }
}
function importEdit() {
  const txt = (prompt(t('粘贴关卡字符画（每行 ') + EDIT_COLS + t(' 字符）：')) || '').trim();
  if (!txt) return;
  const rows = txt.split(/\n+/).map(r => (r + '.'.repeat(EDIT_COLS)).slice(0, EDIT_COLS));
  while (rows.length < EDIT_ROWS) rows.push('.'.repeat(EDIT_COLS));
  editGrid = rows.slice(0, EDIT_ROWS);
  saveEditDraft(); flashMsg(t('已导入'));
}
function editorAction(id) {
  if (id === 'test') playEdit();
  else if (id === 'save') saveCurrent();
  else if (id === 'rename') renameCurrent();
  else if (id === 'load') { autoSaveMain(); goLoadScreen('editor'); }
  else if (id === 'clear') { editGrid = newEditGrid(); editTarget = -1; }
  else if (id === 'export') exportEdit();
  else if (id === 'import') importEdit();
  else if (id === 'back') { autoSaveMain(); state = 'TITLE'; }
}
function openEditor() {
  if (editorUnlocked) { goLoadScreen('title'); return; }
  const code = (prompt(t('请输入兑换码解锁编辑器：')) || '').trim();
  if (code === REDEEM_CODE) {
    editorUnlocked = true;
    try { localStorage.setItem('rb_editor_unlocked', '1'); } catch (e) {}
    goLoadScreen('title');
  } else {
    flashMsg(t('兑换码错误'));
  }
}
function goLoadScreen(from) { loadFrom = from; state = 'LOAD'; }
function drawEditor() {
  drawBackground('grass');
  const L = editorLayout();
  const PL = paletteLayout();
  ctx.textAlign = 'left'; ctx.font = '900 20px system-ui, sans-serif';
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#17324d'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.strokeText(t('🛠 地形编辑器'), 16, 24); ctx.fillText(t('🛠 地形编辑器'), 16, 24);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.lineWidth = 2;
  if (editTarget >= 0) {
    ctx.fillStyle = '#ffd23e';
    const editLine = t('编辑：') + currentMainName() + t('（自动保存到主线）');
    ctx.strokeText(editLine, 16, 42); ctx.fillText(editLine, 16, 42);
  } else {
    ctx.fillStyle = '#aef0ff';
    const customLine = (customEditIndex >= 0 && customLevels[customEditIndex])
      ? t('当前：自定义关卡「') + customLevels[customEditIndex].name + t('」')
      : t('当前：自定义关卡 —— 想覆盖主线，先点 📥载入 选一关');
    ctx.strokeText(customLine, 16, 42); ctx.fillText(customLine, 16, 42);
  }
  for (const b of editorButtons()) drawButton(b.x, b.y, b.w, b.h, t(b.label), b.color);
  // 调色板（按分类分组）
  for (const lb of PL.labels) {
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fillText(t(lb.name), lb.x, lb.y);
  }
  for (const sw of PL.swatches) {
    const p = PALETTE[sw.i];
    // 深色底 + 该分类色微光，再画图标（不再是整块纯色方块）
    ctx.fillStyle = 'rgba(18,24,34,.92)'; roundRect(sw.x, sw.y, PL.swW, PL.swH, 6); ctx.fill();
    ctx.globalAlpha = 0.16; ctx.fillStyle = p.color; roundRect(sw.x, sw.y, PL.swW, PL.swH, 6); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = p.ch === editPalette ? '#fff' : 'rgba(255,255,255,.14)';
    ctx.lineWidth = p.ch === editPalette ? 2.5 : 1;
    roundRect(sw.x + 1, sw.y + 1, PL.swW - 2, PL.swH - 2, 5); ctx.stroke();
    drawTileIcon(p.ch, sw.x + PL.swW / 2, sw.y + 11);
    ctx.font = 'bold 8px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'center';
    ctx.fillText(t(p.label), sw.x + PL.swW / 2, sw.y + PL.swH - 3);
  }
  // 翻页按钮（◀ ▶）+ 页码
  drawButton(PL.prevBtn.x, PL.prevBtn.y, PL.prevBtn.w, PL.prevBtn.h, '◀', PL.page > 0 ? '#3f6ea8' : '#3a3f4a');
  drawButton(PL.nextBtn.x, PL.nextBtn.y, PL.nextBtn.w, PL.nextBtn.h, '▶', PL.page < PL.pages - 1 ? '#3f6ea8' : '#3a3f4a');
  ctx.textAlign = 'left'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(PL.pageInd.text, PL.pageInd.x, PL.pageInd.y);
  // 网格（带横向滚动）
  ctx.save();
  ctx.beginPath(); ctx.rect(L.gx - 1, L.gy - 1, L.viewW + 2, EDIT_ROWS * L.cell + 2); ctx.clip();
  for (let r = 0; r < EDIT_ROWS; r++) {
    for (let c = 0; c < EDIT_COLS; c++) {
      const x = L.gx + c * L.cell - editCamX, y = L.gy + r * L.cell;
      const ch = editGrid[r][c];
      if (ch === '.') {
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.fillRect(x, y, L.cell, L.cell);
      } else {
        // 底色调（地形连成一片）
        ctx.fillStyle = tileColor(ch); ctx.globalAlpha = 0.30; ctx.fillRect(x, y, L.cell, L.cell); ctx.globalAlpha = 1;
        // 图标（按格子缩放，放置后也能看到具体形状）
        const cx = x + L.cell / 2, cy = y + L.cell / 2, k = 0.62;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); drawTileIcon(ch, cx, cy); ctx.restore();
      }
      ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, y + .5, L.cell, L.cell);
    }
  }
  // 2×2 大箱预览（B 在左下角，箱体向上+向右铺开）
  for (let r = 0; r < EDIT_ROWS; r++) {
    for (let c = 0; c < EDIT_COLS; c++) {
      if (editGrid[r][c] === 'B') {
        const x = L.gx + c * L.cell - editCamX, y = L.gy + (r - 1) * L.cell;
        ctx.fillStyle = 'rgba(197,138,63,.45)';
        roundRect(x + 1, y + 1, 2 * L.cell - 2, 2 * L.cell - 2, 4); ctx.fill();
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        roundRect(x + 1, y + 1, 2 * L.cell - 2, 2 * L.cell - 2, 4); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
  // 大号鼠标：十字准星 + 高亮当前格
  const hov = editorCellAt(editHover.x, editHover.y);
  if (hov) {
    const hx = L.gx + hov.c * L.cell - editCamX, hy = L.gy + hov.r * L.cell;
    const cx = hx + L.cell / 2, cy = hy + L.cell / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.30)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L.gx, cy); ctx.lineTo(L.gx + L.viewW, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, L.gy); ctx.lineTo(cx, L.gy + EDIT_ROWS * L.cell); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.strokeRect(hx - 2, hy - 2, L.cell + 4, L.cell + 4);
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const b = 7, g = 5;
    ctx.beginPath();
    ctx.moveTo(hx - g, hy - g + b); ctx.lineTo(hx - g, hy - g); ctx.lineTo(hx - g + b, hy - g);
    ctx.moveTo(hx + L.cell + g - b, hy - g); ctx.lineTo(hx + L.cell + g, hy - g); ctx.lineTo(hx + L.cell + g, hy - g + b);
    ctx.moveTo(hx + L.cell + g, hy + L.cell + g - b); ctx.lineTo(hx + L.cell + g, hy + L.cell + g); ctx.lineTo(hx + L.cell + g - b, hy + L.cell + g);
    ctx.moveTo(hx - g + b, hy + L.cell + g); ctx.lineTo(hx - g, hy + L.cell + g); ctx.lineTo(hx - g, hy + L.cell + g - b);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.restore();
  ctx.textAlign = 'center'; ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText('滚轮/拖动滚动条横向浏览 · 左键拖动放置 · 右键擦除 · 只填空气/泥土、不覆盖草 · 记得放 P(出生) 和 F(旗子)', VIEW_W / 2, L.gy + EDIT_ROWS * L.cell + 14);
  // 横向滚动条
  if (L.maxCam > 0) {
    const sy = L.gy + EDIT_ROWS * L.cell + 20, sh = 12;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; roundRect(L.gx, sy, L.viewW, sh, 4); ctx.fill();
    const thumbW = Math.max(46, L.viewW * (L.viewW / (EDIT_COLS * L.cell)));
    const thumbX = L.gx + (L.viewW - thumbW) * (editCamX / L.maxCam);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; roundRect(thumbX, sy, thumbW, sh, 4); ctx.fill();
  }
}

/* ============================ 我的关卡列表 ============================ */
function drawCustomList() {
  drawBackground('grass');
  ctx.textAlign = 'center'; ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#17324d'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.strokeText(t('我的关卡'), VIEW_W / 2, 60); ctx.fillText(t('我的关卡'), VIEW_W / 2, 60);
  if (customLevels.length === 0) {
    ctx.font = '20px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.fillText(t('还没有保存的关卡，去「🛠 关卡编辑器」做一个吧！'), VIEW_W / 2, 250);
  }
  let y = 120;
  for (let i = 0; i < customLevels.length; i++) {
    ctx.fillStyle = 'rgba(255,255,255,.12)'; roundRect(120, y - 26, 720, 48, 10); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText((i + 1) + '. ' + customLevels[i].name, 140, y + 4);
    drawButton(544, y - 22, 80, 40, t('✎编辑'), '#2f7fb8');
    drawButton(632, y - 22, 80, 40, t('▶玩'), '#4f9e42');
    drawButton(720, y - 22, 80, 40, t('✕删'), '#c0392b');
    y += 60;
  }
  drawButton(VIEW_W / 2 - 110, 496, 220, 40, t('← 返回'), '#556');
}
function customListAt(x, y) {
  let yy = 120;
  for (let i = 0; i < customLevels.length; i++) {
    if (x > 544 && x < 624 && y > yy - 22 && y < yy + 18) return { type: 'edit', i };
    if (x > 632 && x < 712 && y > yy - 22 && y < yy + 18) return { type: 'play', i };
    if (x > 720 && x < 800 && y > yy - 22 && y < yy + 18) return { type: 'del', i };
    yy += 60;
  }
  if (x > VIEW_W / 2 - 110 && x < VIEW_W / 2 + 110 && y > 496 && y < 536) return { type: 'back' };
  return null;
}
function playCustomIdx(i) {
  const lv = customLevels[i]; if (!lv) return;
  hearts = 3;
  loadCustom({ name: lv.name, theme: 'grass', groundType: 'grass', rows: lv.rows });
  state = 'PLAY';
}
function editCustomIdx(i) {
  const lv = customLevels[i]; if (!lv) return;
  customEditIndex = i;
  editTarget = -1;
  editGrid = normRows(lv.rows);
  editPalette = '#';
  editPainting = false;
  state = 'EDIT';
  flashMsg(t('已载入「') + lv.name + t('」继续编辑'));
}
function deleteCustomIdx(i) {
  customLevels.splice(i, 1);
  if (customEditIndex === i) customEditIndex = -1;
  else if (customEditIndex > i) customEditIndex--;
  saveCustomLevels(); saveEditDraft();
}

/* ============================ 载入主线（编辑器） ============================ */
function drawLoadMain() {
  drawBackground('grass');
  ctx.textAlign = 'center'; ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#17324d'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.strokeText(t('选择要编辑的关卡'), VIEW_W / 2, 56); ctx.fillText(t('选择要编辑的关卡'), VIEW_W / 2, 56);
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#aef0ff'; ctx.lineWidth = 0;
  ctx.fillText(t('点一关载入编辑器（覆盖主线）· 或 ✨新建空白 做自定义关卡'), VIEW_W / 2, 84);
  drawChapterTabs();
  for (const b of levelButtons()) {
    ctx.fillStyle = overrides[b.i] ? '#e08a2f' : themeColor(b.i);
    roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(b.k + 1), b.x + b.w / 2, b.y + b.h / 2 + 1);
    if (overrides[b.i]) { ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText('✎', b.x + b.w - 13, b.y + 13); }
    ctx.textBaseline = 'alphabetic';
  }
  drawButton(28, 496, 214, 40, t('✨ 新建空白'), '#4f9e42');
  drawButton(258, 496, 214, 40, t('📦 导出游戏文件'), '#2f7fb8');
  drawButton(488, 496, 214, 40, t('← 返回'), '#556');
  drawButton(718, 496, 214, 40, t('↺ 重置全部'), '#c0392b');
}
function resetAllOverrides() {
  if (!confirm(t('确定要还原所有主线关卡的修改吗？此操作不可撤销。'))) return;
  overrides = {};
  overrideNames = {};
  saveOverrides(); saveOverrideNames();
  flashMsg(t('已还原所有主线关卡'));
}
function buildLevelsText() {
  const out = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const d = builtinDef(i);
    out.push("  { name: '" + d.name + "', theme: '" + d.theme + "', groundType: '" + (d.groundType || 'grass') + "', rows: [");
    for (const row of d.rows) out.push('    "' + row + '",');
    out.push('  ] },');
  }
  return out.join('\n');
}
async function exportGameFile() {
  let html;
  try {
    const r = await fetch(location.href);
    html = await r.text();
  } catch (e) {
    flashMsg(t('导出失败：请通过 http:// 访问（file:// 不行）'));
    return;
  }
  const start = html.indexOf('const LEVELS = [');
  const end = html.indexOf('/* ============================ 载入关卡 ============================ */');
  if (start < 0 || end < 0 || end <= start) { flashMsg(t('导出失败：找不到关卡数据')); return; }
  const out = html.slice(0, start) + 'const LEVELS = [\n' + buildLevelsText() + '\n];\n\n' + html.slice(end);
  try {
    const blob = new Blob([out], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'index.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flashMsg(t('已导出 index.html —— 用它覆盖服务器上的文件，你的关卡就成主线了'));
  } catch (e) {
    flashMsg(t('下载失败：') + e.message);
  }
}
function loadMainAt(x, y) {
  const tc = chapterTabAt(x, y);
  if (tc >= 0) { if (chapterUnlocked(tc)) chapterIndex = tc; return -1; }
  for (const b of levelButtons()) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b.i;
  if (y > 496 && y < 536) {
    if (x > 28 && x < 242) return -5;    // 新建空白
    if (x > 258 && x < 472) return -4;   // 导出游戏文件
    if (x > 488 && x < 702) return -2;   // 返回
    if (x > 718 && x < 932) return -3;   // 重置全部
  }
  return -1;
}

/* ============================ 标题入口按钮 ============================ */
function titleEditorButtons() {
  return [
    { id: 'editor', x: VIEW_W / 2 - 172, y: 452, w: 164, h: 42, label: '🛠 关卡编辑器', color: '#2f7fb8' },
    { id: 'custom', x: VIEW_W / 2 + 8, y: 452, w: 164, h: 42, label: '▶ 我的关卡', color: '#7a5fb8' },
  ];
}

const SCHOOL_NAME = 'German Mills Public School';

function loginButtons() {
  const w = 540, h = 74, x = VIEW_W / 2 - w / 2;
  return [
    { id: 'student', x, y: 280, w, h, icon: '🎒', label: SCHOOL_NAME + ' ' + t('学生'), sub: t('解锁关卡编辑器 · 不保存进度'), color: '#2f9e44' },
  ];
}
function drawLogin() {
  drawBackground('space');
  ctx.textAlign = 'center';
  // 游戏名
  ctx.font = '900 52px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
  ctx.strokeText('Badball.HSgame', VIEW_W / 2, 108);
  ctx.fillText('Badball.HSgame', VIEW_W / 2, 108);

  // 账号登录/注册表单
  if (loginMode !== 'none') { drawAccountForm(); return; }

  // 登录标题
  ctx.font = '900 24px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 5;
  ctx.strokeText(t('登录'), VIEW_W / 2, 158);
  ctx.fillText(t('登录'), VIEW_W / 2, 158);
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 0;
  ctx.fillText(currentUser ? (t('已登录：') + currentUser) : t('请选择身份'), VIEW_W / 2, 182);
  // 账号登录/注册按钮（最上面）
  const ay = 196;
  ctx.fillStyle = 'rgba(255,210,62,.16)'; roundRect(VIEW_W / 2 - 270, ay, 540, 74, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,.4)'; ctx.lineWidth = 2; roundRect(VIEW_W / 2 - 270, ay, 540, 74, 14); ctx.stroke();
  ctx.font = '900 22px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e'; ctx.textBaseline = 'middle';
  ctx.fillText('👤 ' + t('账号登录 / 注册'), VIEW_W / 2, ay + 28);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,210,62,.85)';
  ctx.fillText(t('注册 / 登录账号 · 输入兑换码'), VIEW_W / 2, ay + 54);
  ctx.textBaseline = 'alphabetic';
  // 身份选项
  for (const b of loginButtons()) {
    ctx.fillStyle = b.color; roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(b.x, b.y, b.w, b.h * 0.5, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    ctx.font = '900 22px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(b.icon + ' ' + b.label, b.x + b.w / 2, b.y + 29);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(b.sub, b.x + b.w / 2, b.y + 54);
    ctx.textBaseline = 'alphabetic';
  }
}
function drawAccountForm() {
  ctx.font = '900 24px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 5;
  ctx.strokeText(loginMode === 'login' ? t('账号登录') : t('注册账号'), VIEW_W / 2, 150);
  ctx.fillText(loginMode === 'login' ? t('账号登录') : t('注册账号'), VIEW_W / 2, 150);
  ctx.lineWidth = 0;
  ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'left';
  ctx.fillText(t('用户名'), VIEW_W / 2 - 250, 210);
  drawInputBox(VIEW_W / 2 - 250, 222, 500, 50, loginUser, loginField === 'user');
  ctx.fillText(t('兑换码') + ' (' + t('可选') + ')', VIEW_W / 2 - 250, 300);
  drawInputBox(VIEW_W / 2 - 250, 312, 500, 50, loginCode, loginField === 'code');
  ctx.textAlign = 'center';
  drawButton(VIEW_W / 2 - 270, 390, 165, 52, t('登录'), '#2f7fb8');
  drawButton(VIEW_W / 2 - 90, 390, 165, 52, t('注册'), '#2f9e44');
  drawButton(VIEW_W / 2 + 90, 390, 165, 52, t('返回'), '#556');
}
function drawInputBox(x, y, w, h, text, focused) {
  ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = focused ? '#ffd23e' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; roundRect(x, y, w, h, 10); ctx.stroke();
  ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text + (focused ? '|' : ''), x + 16, y + h / 2 + 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
}
function loginAs(id) {
  if (id === 'student') { isStudent = true; noSave = true; editorUnlocked = true; }
  else { isStudent = false; noSave = false; }
  if (!tutorialSeen) state = 'TUTORIAL';
  else state = 'TITLE';
}

function langButtons() {
  const n = LANGS.length, w = 300, h = 46, gap = 12;
  const totalH = n * h + (n - 1) * gap;
  let y = VIEW_H / 2 - totalH / 2 + 30;
  const btns = [];
  for (let i = 0; i < n; i++) { btns.push({ code: LANGS[i].code, name: LANGS[i].name, x: VIEW_W / 2 - w / 2, y, w, h }); y += h + gap; }
  return btns;
}
function drawLangSelect() {
  drawBackground('grass');
  drawPanel(470, 410);
  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.strokeText('🌐 Language · 语言', VIEW_W / 2, VIEW_H / 2 - 152);
  ctx.fillText('🌐 Language · 语言', VIEW_W / 2, VIEW_H / 2 - 152);
  ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0;
  ctx.fillText('Choose your language · 选择你的语言', VIEW_W / 2, VIEW_H / 2 - 122);
  for (const b of langButtons()) drawButton(b.x, b.y, b.w, b.h, b.name, '#2f7fb8');
}
function pickLang(code) {
  setLang(code);
  if (!tutorialSeen) state = 'TUTORIAL';
  else state = 'TITLE';
}

// 内嵌音乐盒曲目（从本地文件夹打包进游戏）
const MUSIC_BOX_TRACKS = [
  { name: 'radio', data: 'assets/audio/musicbox-radio.mp3' },
  { name: 'Chinese Nostalgic Music', data: 'assets/audio/musicbox-chinese.mp3' }
];

/* ============================ 音乐盒子 ============================ */
// 从本地选择音乐文件播放（File API），不内嵌大文件
let musicBoxSongs = (typeof MUSIC_BOX_TRACKS !== 'undefined' ? MUSIC_BOX_TRACKS.map(t => ({ name: t.name, url: t.data })) : []);   // 先放内嵌曲目，后可追加本地文件
let musicBoxCurrent = -1;
let musicBoxScroll = 0;
let musicBoxAudio = null;
let musicFileInput = null;
if (document.createElement && document.body && document.body.appendChild) {
  musicFileInput = document.createElement('input');
  musicFileInput.type = 'file';
  musicFileInput.accept = 'audio/*';
  musicFileInput.multiple = true;
  musicFileInput.style.display = 'none';
  document.body.appendChild(musicFileInput);
  musicFileInput.addEventListener('change', () => {
    const files = Array.from(musicFileInput.files || []);
    let added = 0;
    for (const f of files) {
      if (!(f.type || '').startsWith('audio/')) continue;
      musicBoxSongs.push({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) });
      added++;
    }
    if (added) flashMsg(t('已添加') + ' ' + added + ' ' + t('首音乐'));
    musicFileInput.value = '';
  });
}
function openMusicBox() { musicBoxStop(); state = 'MUSICBOX'; }
function musicBoxPlay(i) {
  musicBoxStop();
  const s = musicBoxSongs[i];
  if (!s) return;
  musicBoxCurrent = i;
  musicBoxAudio = new Audio(s.url);
  musicBoxAudio.loop = false;
  musicBoxAudio.volume = musicMuted ? 0 : musicVol;
  musicBoxAudio.play().catch(() => {});
}
function musicBoxStop() {
  if (musicBoxAudio) { try { musicBoxAudio.pause(); } catch (e) {} musicBoxAudio = null; }
  musicBoxCurrent = -1;
}
function drawMusicBox() {
  drawBackground('space');
  ctx.textAlign = 'center';
  ctx.font = '900 40px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 6;
  ctx.strokeText('🎵 ' + t('音乐盒'), VIEW_W / 2, 90);
  ctx.fillText('🎵 ' + t('音乐盒'), VIEW_W / 2, 90);
  drawButton(18, 16, 92, 42, t('← 返回'), 'rgba(0,0,0,.35)');
  drawButton(VIEW_W / 2 - 130, 130, 260, 50, '📂 ' + t('选择音乐文件'), '#2f7fb8');
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.fillText(t('从电脑选择音乐文件，点 ▶ 播放'), VIEW_W / 2, 210);
  if (musicBoxSongs.length === 0) {
    ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText(t('还没有音乐'), VIEW_W / 2, 300);
  } else {
    const page = 6;
    if (musicBoxScroll > 0) drawButton(VIEW_W / 2 - 40, 240, 80, 30, '▲', '#4a4a5a');
    for (let i = 0; i < page && musicBoxScroll + i < musicBoxSongs.length; i++) {
      const idx = musicBoxScroll + i;
      const y = 240 + i * 40;
      const playing = idx === musicBoxCurrent;
      const name = musicBoxSongs[idx].name.length > 26 ? musicBoxSongs[idx].name.slice(0, 26) + '…' : musicBoxSongs[idx].name;
      drawButton(VIEW_W / 2 - 260, y, 440, 36, (playing ? '⏹ ' : '▶ ') + name, playing ? '#3f8a34' : '#4a4a5a');
    }
    if (musicBoxScroll + page < musicBoxSongs.length) drawButton(VIEW_W / 2 - 40, 240 + page * 40, 80, 30, '▼', '#4a4a5a');
  }
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#ffd23e';
  ctx.fillText(t('音乐由 Hamsger 制作') + ' · v' + GAME_VERSION, VIEW_W / 2, VIEW_H - 24);
}
function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state === 'LOGIN') drawLogin();
  else if (state === 'LANGSEL') drawLangSelect();
  else if (state === 'TITLE') drawTitle();
  else if (state === 'PLAY') { drawWorld(); drawHUD(); drawLevelTip(); }
  else if (state === 'COMPLETE') drawComplete();
  else if (state === 'GAMEOVER') drawGameOver();
  else if (state === 'STORY') drawNarrative(story, t('开始冒险'));
  else if (state === 'ENDING') drawNarrative(ENDING, t('回到标题'));
  else if (state === 'TUTORIAL') drawNarrative(TUTORIAL, t('开始游戏'));
  else if (state === 'EDIT') drawEditor();
  else if (state === 'CUSTOM') drawCustomList();
  else if (state === 'LOAD') drawLoadMain();
  else if (state === 'WARDROBE') drawWardrobe();
  else if (state === 'MUSICBOX') drawMusicBox();
  else if (state === 'CREDITS') drawCredits();
  // 设置面板 + 各页面右上角齿轮入口
  if (settingsOpen) {
    drawSettings();
  } else if (state !== 'LOGIN' && state !== 'LANGSEL') {
    const g = settingsBtn();
    drawButton(g.x, g.y, g.w, g.h, state === 'PLAY' ? '⚙️ [I]' : '⚙️', 'rgba(0,0,0,.35)');
  }
  if (toast.text && time < toast.until) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    const tw = ctx.measureText(toast.text).width;
    ctx.fillStyle = 'rgba(0,0,0,.72)'; roundRect(VIEW_W / 2 - tw / 2 - 18, VIEW_H - 70, tw + 36, 40, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(toast.text, VIEW_W / 2, VIEW_H - 50);
    ctx.textBaseline = 'alphabetic';
  }
  if (mouseX >= 0 && mouseY >= 0) drawBigCursor(mouseX, mouseY);
}

// 鼠标指针：游戏内默认隐藏、Q 显示、菜单/设置显示；皮肤可选（大箭头 + 5 款自绘）
const BIG_CURSOR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M4 3 L31 18 L21 19 L18 31 Z" fill="#ffffff" stroke="#111111" stroke-width="2.4" stroke-linejoin="round"/></svg>';
const BIG_CURSOR = 'url("data:image/svg+xml,' + encodeURIComponent(BIG_CURSOR_SVG) + '") 4 3, auto';
const CURSOR_SKINS = [
  { icon: '🖱️', draw: null },   // 大箭头（系统指针放大）
  { icon: '🐾', draw: drawCursorPaw },
  { icon: '⭐', draw: drawCursorStar },
  { icon: '❤️', draw: drawCursorHeart },
  { icon: '😊', draw: drawCursorSmiley },
  { icon: '☁️', draw: drawCursorCloud },
];
let cursorSkin = 0;
try { const v = parseInt(localStorage.getItem('rb_cursor') || '0', 10); if (v >= 0 && v < CURSOR_SKINS.length) cursorSkin = v; } catch (e) {}
let mouseShown = false;   // Q 键切换：游戏内显示鼠标
function cursorVisible() { return mouseShown || state !== 'PLAY' || settingsOpen; }
function applyCursor() {
  (document.body || canvas).style.cursor = (cursorVisible() && cursorSkin === 0) ? BIG_CURSOR : 'none';
}
function setCursorSkin(i) { cursorSkin = ((i % CURSOR_SKINS.length) + CURSOR_SKINS.length) % CURSOR_SKINS.length; try { localStorage.setItem('rb_cursor', String(cursorSkin)); } catch (e) {} applyCursor(); }
function drawBigCursor(x, y) {
  if (!cursorVisible() || cursorSkin === 0 || !CURSOR_SKINS[cursorSkin].draw) return;
  CURSOR_SKINS[cursorSkin].draw(x, y);
}
// 猫爪
function drawCursorPaw(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,170,195,.18)'; ctx.beginPath(); ctx.arc(0, 2, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffa6c0'; ctx.beginPath(); ctx.ellipse(0, 8, 11, 9, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  const toes = [[-12, -1], [-5, -7], [5, -7], [12, -1]];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = (i === 0 || i === 3) ? '#ff8fa8' : '#ffb3ca';
    ctx.beginPath(); ctx.arc(toes[i][0], toes[i][1], 5.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-3, 4, 2.6, 0, 7); ctx.fill();
  ctx.restore();
}
// 星星
function drawCursorStar(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,210,90,.18)'; ctx.beginPath(); ctx.arc(0, 2, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd23e'; drawStar(0, 0, 17); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-4, -4, 3, 0, 7); ctx.fill();
  ctx.restore();
}
// 爱心
function drawCursorHeart(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,120,150,.18)'; ctx.beginPath(); ctx.arc(0, 2, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff5f7a';
  ctx.beginPath(); ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-19, -5, -10, -19, 0, -8);
  ctx.bezierCurveTo(10, -19, 19, -5, 0, 12);
  ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, 7); ctx.fill();
  ctx.restore();
}
// 笑脸
function drawCursorSmiley(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,210,90,.18)'; ctx.beginPath(); ctx.arc(0, 2, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#4a2a10'; ctx.beginPath(); ctx.arc(-5, -3, 2.2, 0, 7); ctx.arc(5, -3, 2.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 2, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}
// 云朵
function drawCursorCloud(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(180,220,255,.18)'; ctx.beginPath(); ctx.arc(0, 2, 22, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-9, 3, 8, 0, 7); ctx.arc(0, -3, 11, 0, 7); ctx.arc(9, 3, 8, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(170,200,235,.9)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(170,200,235,.75)'; ctx.beginPath(); ctx.arc(-2, 4, 3, 0, 7); ctx.fill();
  ctx.restore();
}
// 鼠标跟踪（自绘皮肤用）
let mouseX = -1000, mouseY = -1000;
applyCursor();
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) / rect.width * VIEW_W;
  mouseY = (e.clientY - rect.top) / rect.height * VIEW_H;
});
canvas.addEventListener('mouseleave', () => { mouseX = -1000; mouseY = -1000; });

/* ============================ 输入 ============================ */
const touch = { left: false, right: false, up: false };
function getTouchBtns() {
  const y = VIEW_H - 90;   // 底部（随屏幕高度自适应）
  return [
    { id: 'left', x: 20, y, w: 70, h: 70, label: '◀' },
    { id: 'right', x: 100, y, w: 70, h: 70, label: '▶' },
    { id: 'up', x: VIEW_W - 90, y, w: 70, h: 70, label: '▲' },
  ];
}
const touchPtrs = {};          // pointerId -> 当前按住的按键 id（支持多点触控 + 滑动切换）
function touchBtnAt(x, y) {
  if (!isTouch() && !mouseShown) return null;   // 触屏显示；桌面按 Q 后也显示
  for (const b of getTouchBtns()) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
  }
  return null;
}
function refreshTouch() {
  touch.left = touch.right = touch.up = false;
  for (const id in touchPtrs) {
    const b = touchPtrs[id];
    if (b === 'left') touch.left = true;
    else if (b === 'right') touch.right = true;
    else if (b === 'up') touch.up = true;
  }
}

function isTouch() {
  return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0 ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
}
function isLeftKey(e) { return e.code === 'ArrowLeft' || e.code === 'KeyA' || ['ArrowLeft','a','A'].includes(e.key); }
function isRightKey(e) { return e.code === 'ArrowRight' || e.code === 'KeyD' || ['ArrowRight','d','D'].includes(e.key); }
function isJumpKey(e) { return e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW' || e.code === 'KeyZ' || ['ArrowUp','w','W',' ','z','Z'].includes(e.key); }
function isDownKey(e) { return e.code === 'ArrowDown' || e.code === 'KeyS' || ['ArrowDown','s','S'].includes(e.key); }

document.addEventListener('keydown', e => {
  ensureAudio();
  if (settingsOpen) {
    if (e.key === 'Escape' || e.key === 'Esc') { closeSettings(); e.preventDefault(); }
    return;
  }
  if (state === 'LOGIN') {
    // 账号登录/注册表单：输入处理
    if (loginMode !== 'none') {
      if (e.key === 'Enter') { if (loginMode === 'login') loginAccount(); else registerAccount(); e.preventDefault(); return; }
      if (e.key === 'Escape') { loginMode = 'none'; return; }
      if (e.key === 'Tab') { loginField = (loginField === 'user' ? 'code' : 'user'); e.preventDefault(); return; }
      if (e.key === 'Backspace') {
        if (loginField === 'user') loginUser = loginUser.slice(0, -1);
        else loginCode = loginCode.slice(0, -1);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (loginField === 'user') loginUser = (loginUser + e.key).slice(0, 16);
        else loginCode = (loginCode + e.key).slice(0, 20);
        return;
      }
      return;
    }
    if (e.key === '1') { loginAs('student'); e.preventDefault(); }
    return;
  }
  if (state === 'STORY' || state === 'ENDING' || state === 'TUTORIAL') {
    if (e.code === 'Space' || e.code === 'Enter') { dismissStory(); e.preventDefault(); }
    return;
  }
  if (state === 'LANGSEL') {
    const idx = parseInt(e.key, 10);
    if (idx >= 1 && idx <= LANGS.length) { pickLang(LANGS[idx - 1].code); }
    return;
  }
  if (state === 'EDIT' || state === 'CUSTOM' || state === 'LOAD') {
    if (e.key === 'Escape') {
      if (state === 'LOAD') state = (loadFrom === 'title') ? 'TITLE' : 'EDIT';
      else state = 'TITLE';
    }
    return;
  }
  if (isLeftKey(e)) KEYS.left = true;
  if (isRightKey(e)) KEYS.right = true;
  if (isJumpKey(e)) { KEYS.up = true; if (state === 'PLAY' && !e.repeat) jumpQueued = true; e.preventDefault(); }
  if (isDownKey(e)) { KEYS.down = true; e.preventDefault(); }
  if (e.key === 'u' || e.key === 'U') { god = !god; toast.text = god ? t('无敌模式 ON') : t('无敌模式 OFF'); toast.until = time + 1.5; }
  if (e.key === 'g' || e.key === 'G') { fly = !fly; toast.text = fly ? t('飞行模式 ON（方向键/WASD 上下左右飞）') : t('飞行模式 OFF'); toast.until = time + 2.2; }
  if (e.key === 'r' || e.key === 'R') restart();
  if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') { if (state !== 'TITLE') state = 'TITLE'; }
  if (e.key === 'i' || e.key === 'I') { settingsOpen = !settingsOpen; settingsDrag = null; }   // I 键开关设置
  if (e.key === 'q' || e.key === 'Q') { mouseShown = !mouseShown; applyCursor(); }   // Q 键显示/隐藏鼠标
  if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }   // F 键切换全屏
  if (state === 'TITLE' && (e.code === 'Space' || e.code === 'Enter')) startLevel(0);
});
document.addEventListener('keyup', e => {
  if (isLeftKey(e)) KEYS.left = false;
  if (isRightKey(e)) KEYS.right = false;
  if (isJumpKey(e)) KEYS.up = false;
  if (isDownKey(e)) KEYS.down = false;
});

canvas.addEventListener('pointerdown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * VIEW_W;
  const y = (e.clientY - rect.top) / rect.height * VIEW_H;
  ensureAudio();
  // 所有 UI 按钮点击音效（游戏内触控/跳跃另有音效）
  if (state !== 'PLAY') sfx.click();

  // 设置面板：打开时优先拦截所有点击
  if (settingsOpen) {
    const L = settingsLayout();
    if (x >= L.close.x && x <= L.close.x + L.close.w && y >= L.close.y && y <= L.close.y + L.close.h) { closeSettings(); return; }
    if (x >= L.reset.x && x <= L.reset.x + L.reset.w && y >= L.reset.y && y <= L.reset.y + L.reset.h) { resetSettings(); return; }
    if (x >= L.resetProgress.x && x <= L.resetProgress.x + L.resetProgress.w && y >= L.resetProgress.y && y <= L.resetProgress.y + L.resetProgress.h) { resetProgress(); return; }
    if (x >= L.fullscreen.x && x <= L.fullscreen.x + L.fullscreen.w && y >= L.fullscreen.y && y <= L.fullscreen.y + L.fullscreen.h) { toggleFullscreen(); return; }
    if (x >= L.oldMusic.x && x <= L.oldMusic.x + L.oldMusic.w && y >= L.oldMusic.y && y <= L.oldMusic.y + L.oldMusic.h) { setOldMusic(!useOldMusic); sfx.click(); return; }
    for (const b of L.qualityBtns) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { setQuality(b.q); sfx.click(); return; }
    }
    for (const b of L.cursorBtns) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { setCursorSkin(b.skin); sfx.click(); return; }
    }
    for (const r of L.rows) {
      const tg = L.toggle(r);
      if (x >= tg.x && x <= tg.x + tg.w && y >= tg.y && y <= tg.y + tg.h) {
        if (r.key === 'music') toggleMusic(); else toggleSfx();
        return;
      }
      const tr = L.track(r);
      if (x >= tr.x - 16 && x <= tr.x + tr.w + 16 && y >= tr.y - 14 && y <= tr.y + tr.h + 14) {
        settingsDrag = r.key;
        if (r.key === 'music') setMusicVolume((x - tr.x) / tr.w); else setSfxVolume((x - tr.x) / tr.w);
        return;
      }
    }
    if (x < L.x || x > L.x + L.W || y < L.y || y > L.y + L.H) closeSettings();
    return;
  }
  // 齿轮入口（各页面右上角）
  if (state !== 'LOGIN' && state !== 'LANGSEL') {
    const g = settingsBtn();
    if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) { settingsOpen = true; return; }
  }

  if (state === 'LOGIN') {
    if (loginMode !== 'none') {
      // 表单按钮：登录 / 注册 / 返回
      if (x > VIEW_W / 2 - 270 && x < VIEW_W / 2 - 105 && y > 390 && y < 442) { loginAccount(); return; }
      if (x > VIEW_W / 2 - 90 && x < VIEW_W / 2 + 75 && y > 390 && y < 442) { registerAccount(); return; }
      if (x > VIEW_W / 2 + 90 && x < VIEW_W / 2 + 255 && y > 390 && y < 442) { loginMode = 'none'; return; }
      // 输入框聚焦
      if (x > VIEW_W / 2 - 250 && x < VIEW_W / 2 + 250 && y > 222 && y < 272) { loginField = 'user'; return; }
      if (x > VIEW_W / 2 - 250 && x < VIEW_W / 2 + 250 && y > 312 && y < 362) { loginField = 'code'; return; }
      return;
    }
    for (const b of loginButtons()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { loginAs(b.id); return; }
    }
    // 账号登录/注册按钮（顶部）
    if (x > VIEW_W / 2 - 270 && x < VIEW_W / 2 + 270 && y > 196 && y < 270) { loginMode = 'login'; loginUser = ''; loginCode = ''; loginField = 'user'; return; }
    return;
  }

  if (state === 'STORY' || state === 'ENDING' || state === 'TUTORIAL') {
    if (state === 'STORY' && x > VIEW_W - 124 && x < VIEW_W - 60 && y > 12 && y < 46) { exitToTitle(); return; }
    dismissStory(); return;
  }

  if (state === 'LANGSEL') {
    for (const b of langButtons()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { pickLang(b.code); return; }
    }
    return;
  }

  if (state === 'TITLE') {
    // 语言切换
    if (x > VIEW_W - 232 && x < VIEW_W - 146 && y > 16 && y < 58) { cycleLang(); return; }
    // 音乐开关
    if (x > VIEW_W - 140 && x < VIEW_W - 82 && y > 16 && y < 58) { toggleMusic(); return; }
    // 音效开关
    if (x > VIEW_W - 76 && x < VIEW_W - 18 && y > 16 && y < 58) { toggleSfx(); return; }
    // 新手教程
    if (x > 18 && x < 94 && y > 16 && y < 58) { openTutorial(); return; }
    // 制作组
    if (x > 104 && x < 196 && y > 16 && y < 58) { state = 'CREDITS'; return; }
    // 退出登录
    if (currentUser && x > VIEW_W / 2 - 50 && x < VIEW_W / 2 + 50 && y > 158 && y < 188) { logoutAccount(); flashMsg(t('已退出登录')); return; }
    // 更衣室（左下角）
    if (x > 18 && x < 168 && y > 452 && y < 494) { state = 'WARDROBE'; return; }
    if (x > 176 && x < 306 && y > 452 && y < 494) { openMusicBox(); return; }
    // 篇章标签
    const tcidx = chapterTabAt(x, y);
    if (tcidx >= 0) { if (chapterUnlocked(tcidx)) chapterIndex = tcidx; return; }
    // 关卡按钮
    for (const b of levelButtons()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
        if (b.i + 1 <= maxUnlocked) startLevel(b.i);
        return;
      }
    }
    // 编辑器 / 我的关卡
    for (const b of titleEditorButtons()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
        if (b.id === 'editor') openEditor();
        else state = 'CUSTOM';
        return;
      }
    }
    return;
  }
  if (state === 'WARDROBE') {
    if (x > 18 && x < 110 && y > 16 && y < 58) { wardrobeOutro(); state = 'TITLE'; saveProgress(); return; }
    for (const b of wardrobeColorBtns()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { skinIndex = b.i; playMotif(['hero','funny','cool','mysterious'][b.i % 4]); saveProgress(); return; }
    }
    for (const b of wardrobeHatBtns()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { hatIndex = b.idx; saveProgress(); return; }
    }
    for (const b of wardrobeClothesBtns()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { clothesIndex = b.idx; saveProgress(); return; }
    }
    for (const b of wardrobeGlassesBtns()) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { glassesIndex = b.idx; saveProgress(); return; }
    }
    return;
  }
  if (state === 'MUSICBOX') {
    if (x > 18 && x < 110 && y > 16 && y < 58) { musicBoxStop(); state = 'TITLE'; return; }
    if (x > VIEW_W / 2 - 130 && x < VIEW_W / 2 + 130 && y > 130 && y < 180) { if (musicFileInput) musicFileInput.click(); return; }
    // 滚动
    if (x > VIEW_W / 2 - 40 && x < VIEW_W / 2 + 40 && y > 240 && y < 270) { if (musicBoxScroll > 0) musicBoxScroll--; return; }
    if (x > VIEW_W / 2 - 40 && x < VIEW_W / 2 + 40 && y > 240 + 6 * 40 && y < 270 + 6 * 40) { if (musicBoxScroll + 6 < musicBoxSongs.length) musicBoxScroll++; return; }
    // 列表
    for (let i = 0; i < 6 && musicBoxScroll + i < musicBoxSongs.length; i++) {
      const by = 240 + i * 40;
      if (x > VIEW_W / 2 - 260 && x < VIEW_W / 2 + 180 && y > by && y < by + 36) { musicBoxPlay(musicBoxScroll + i); return; }
    }
    return;
  }
  if (state === 'CREDITS') {
    if (x > VIEW_W / 2 - 110 && x < VIEW_W / 2 + 110 && y > VIEW_H / 2 + 172 && y < VIEW_H / 2 + 222) { state = 'TITLE'; return; }
    return;
  }
  if (state === 'COMPLETE') {
    if (x > VIEW_W / 2 - 110 && x < VIEW_W / 2 + 110) {
      if (y > VIEW_H / 2 - 10 && y < VIEW_H / 2 + 44) { nextLevel(); }
      else if (y > VIEW_H / 2 + 58 && y < VIEW_H / 2 + 102) { state = 'TITLE'; }
    }
    return;
  }
  if (state === 'GAMEOVER') {
    if (x > VIEW_W / 2 - 110 && x < VIEW_W / 2 + 110) {
      if (y > VIEW_H / 2 && y < VIEW_H / 2 + 54) restart();
      else if (y > VIEW_H / 2 + 66 && y < VIEW_H / 2 + 110) state = 'TITLE';
    }
    return;
  }
  if (state === 'EDIT') {
    const btn = editorButtonAt(x, y);
    if (btn) { editorAction(btn.id); return; }
    const pg = palettePageAt(x, y);
    if (pg !== 0) {
      const PL = paletteLayout();
      editPalettePage = clamp(editPalettePage + pg, 0, PL.pages - 1);
      return;
    }
    const pi = editorPaletteAt(x, y);
    if (pi >= 0) { editPalette = PALETTE[pi].ch; return; }
    // 横向滚动条拖动
    const sb = editorScrollbarRect();
    if (x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
      editScrollDrag = true;
      const L = editorLayout();
      const thumbW = editorScrollThumbW();
      const t = (x - sb.x - thumbW / 2) / (sb.w - thumbW);
      editCamX = clamp(t * L.maxCam, 0, L.maxCam);
      return;
    }
    const cell = editorCellAt(x, y);
    if (cell) {
      const ch = e.button === 2 ? '.' : editPalette;
      paintCell(cell.r, cell.c, ch);
      editPainting = true;
      editStart = { r: cell.r, c: cell.c, erase: e.button === 2 };
    }
    return;
  }
  if (state === 'CUSTOM') {
    const a = customListAt(x, y);
    if (!a) return;
    if (a.type === 'play') playCustomIdx(a.i);
    else if (a.type === 'edit') editCustomIdx(a.i);
    else if (a.type === 'del') deleteCustomIdx(a.i);
    else state = 'TITLE';
    return;
  }
  if (state === 'LOAD') {
    const i = loadMainAt(x, y);
    if (i === -2) state = (loadFrom === 'title') ? 'TITLE' : 'EDIT';
    else if (i === -3) resetAllOverrides();
    else if (i === -4) exportGameFile();
    else if (i === -5) newBlankEditor();
    else if (i >= 0) loadMain(i);
    return;
  }
  // 游戏内右上角退出按钮
  if (state === 'PLAY' && x > VIEW_W - 156 && x < VIEW_W - 56 && y > 12 && y < 46) { sfx.click(); exitToTitle(); return; }
  // 触控按钮：记录 pointerId 支持多点触控（左右 + 跳跃可同时按）
  if (state === 'PLAY') {
    const tb = touchBtnAt(x, y);
    if (tb) {
      touchPtrs[e.pointerId] = tb.id;
      refreshTouch();
      if (tb.id === 'up') jumpQueued = true;
    }
  }
});
let editStart = null, editHover = { x: -1, y: -1 }, editScrollDrag = false;
canvas.addEventListener('pointermove', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * VIEW_W;
  const y = (e.clientY - rect.top) / rect.height * VIEW_H;
  // 触控按钮滑动：手指在 ◀▶▲ 之间滑动时实时切换（松开前不丢按键）
  if (e.pointerId in touchPtrs) {
    const old = touchPtrs[e.pointerId];
    const tb = touchBtnAt(x, y);
    const cur = tb ? tb.id : null;
    if (cur !== old) {
      touchPtrs[e.pointerId] = cur;
      refreshTouch();
      if (cur === 'up') jumpQueued = true;
    }
    return;
  }
  if (settingsDrag) {
    const L = settingsLayout();
    const r = L.rows.find(rr => rr.key === settingsDrag);
    if (r) {
      const tr = L.track(r);
      if (settingsDrag === 'music') setMusicVolume((x - tr.x) / tr.w); else setSfxVolume((x - tr.x) / tr.w);
    }
    return;
  }
  if (state !== 'EDIT') return;
  if (editScrollDrag) {
    const sb = editorScrollbarRect();
    const L = editorLayout();
    const thumbW = editorScrollThumbW();
    const t = (x - sb.x - thumbW / 2) / (sb.w - thumbW);
    editCamX = clamp(t * L.maxCam, 0, L.maxCam);
    return;
  }
  editHover.x = x; editHover.y = y;
  if (!editPainting || !editStart) return;
  const cell = editorCellAt(x, y);
  if (!cell) return;
  const ch = editStart.erase ? '.' : editPalette;
  paintLine(editStart.r, editStart.c, cell.r, cell.c, ch);
  editStart = { r: cell.r, c: cell.c, erase: editStart.erase };
});
canvas.addEventListener('pointerup', e => {
  // 只松开当前手指对应的按键（多点触控：抬一根不影响另一根）
  if (e.pointerId in touchPtrs) { delete touchPtrs[e.pointerId]; refreshTouch(); }
  editPainting = false; editStart = null; editScrollDrag = false;
  settingsDrag = null;
  if (state === 'EDIT' && editTarget >= 0) autoSaveMain();
});
canvas.addEventListener('pointercancel', e => {
  if (e.pointerId in touchPtrs) { delete touchPtrs[e.pointerId]; refreshTouch(); }
  settingsDrag = null;
});
canvas.addEventListener('pointerleave', e => {
  if (e.pointerId in touchPtrs) { delete touchPtrs[e.pointerId]; refreshTouch(); }
  editPainting = false; editStart = null; editHover.x = editHover.y = -1; editScrollDrag = false;
  settingsDrag = null;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  if (state !== 'EDIT') return;
  const L = editorLayout();
  if (L.maxCam <= 0) return;
  e.preventDefault();
  editCamX = clamp(editCamX + (e.deltaY || e.deltaX) * 1.2, 0, L.maxCam);
}, { passive: false });

function startLevel(i) {
  hearts = 3; loadLevel(i);
  if (STORIES[i]) { story = STORIES[i]; state = 'STORY'; }
  else { setLevelTip(); state = 'PLAY'; }
}
function restart() {
  hearts = 3;
  if (playingCustom) loadCustom(customDef);
  else loadLevel(levelIndex);
  setLevelTip();
  state = 'PLAY';
}
function nextLevel() {
  if (playingCustom) { playingCustom = false; customDef = null; state = 'TITLE'; return; }
  if (levelIndex < LEVELS.length - 1) {
    const n = levelIndex + 1;
    hearts = 3; loadLevel(n);
    if (STORIES[n]) { story = STORIES[n]; state = 'STORY'; }
    else { setLevelTip(); state = 'PLAY'; }
  }
  else { state = 'TITLE'; }
}
function dismissStory() {
  if (state === 'STORY') { setLevelTip(); state = 'PLAY'; }
  else if (state === 'ENDING') state = 'TITLE';
  else if (state === 'TUTORIAL') { markTutorialSeen(); state = 'TITLE'; }
}
function exitToTitle() {
  playingCustom = false; customDef = null;
  state = 'TITLE';
}
function markTutorialSeen() {
  tutorialSeen = true;
  try { localStorage.setItem('rb_tut', '1'); } catch (e) {}
}
function openTutorial() { state = 'TUTORIAL'; }
// 关卡玩法提示（第 0..14 关手写，第 15 关起按篇章模板生成）
function tipText(i) {
  if (i >= 0 && i < LEVEL_TIPS.length) return t(LEVEL_TIPS[i]);
  const ci = chapterOf(i);
  const ch = CHAPTERS[ci];
  const pos = i - ci * CHAPTER_SIZE;
  if (pos === 14) {
    const tip = {
      forest: 'Boss：钢铁压路机！直接踩头击杀，小心它召唤的小怪！',
      canyon: 'Boss：熔岩机械臂！踩按钮冻住机械臂，再跳上核心攻击！',
      mine: 'Boss：机械蜘蛛！直接踩头击杀，小心它召唤的小蜘蛛！',
      space: '最终Boss：方块博士！躲开导弹，等核心暴露时踩它！',
    }[ch.key];
    if (tip) return t(tip);
    return t('Boss 战！{0}魔王横冲直撞，黄眼时踩它头顶 5 次即可获胜。', t(ch.label));
  }
  if (pos === 0) return t('欢迎来到{0}篇章！{1}', t(ch.label), t(chapterFlavor(ch)));
  return t('{0}第 {1} 关：{2}', t(ch.label), pos + 1, t(chapterFlavor(ch)));
}
// 设置当前关卡的玩法提示（自定义关卡无提示）
function setLevelTip() {
  levelTip = (levelIndex >= 0) ? tipText(levelIndex) : '';
  tipUntil = time + 5.5;
}
function drawLevelTip() {
  if (state !== 'PLAY' || !levelTip || time >= tipUntil) return;
  let alpha = 1;
  const remain = tipUntil - time;
  if (remain < 0.6) alpha = remain / 0.6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 17px system-ui, sans-serif';
  const w = ctx.measureText(levelTip).width + 44;
  const x = (VIEW_W - w) / 2, y = 70;
  ctx.fillStyle = 'rgba(18,30,48,.80)';
  roundRect(x, y, w, 44, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,.55)'; ctx.lineWidth = 2;
  roundRect(x, y, w, 44, 12); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(levelTip, VIEW_W / 2, y + 22);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/* ============================ 主循环 ============================ */
const FPS = 120, STEP = 1 / FPS;   // 固定时间步长：物理锁定 120 FPS（渲染跟显示器走，最高不超过 120）
let lastT = 0, acc = 0;
function loop(t) {
  if (!lastT) { lastT = t; requestAnimationFrame(loop); return; }
  let frameDt = (t - lastT) / 1000; lastT = t;
  if (frameDt > 0.25) frameDt = 0.25;   // 切后台/卡顿：防死亡螺旋
  acc += frameDt;

  INPUT.left = KEYS.left || touch.left;
  INPUT.right = KEYS.right || touch.right;
  INPUT.up = KEYS.up || touch.up;
  INPUT.down = KEYS.down;

  // 登录 / 主界面用真实音乐；其余画面用合成音乐
  if (state === 'LOGIN' || state === 'TITLE') {
    stopMusic();
    playBgm(state === 'LOGIN' ? 'login' : 'title');
  } else {
    stopBgm();
    const wantTheme = currentMusicTheme();
    if (wantTheme !== musicTheme) { musicTheme = wantTheme; musicStep = 0; musicSection = 0; }
    // 教程不播背景音乐；游戏、更衣室、结算等按主题播放
    if (!musicActiveState()) {
      stopMusic();
    } else if (!musicMuted) {
      startMusic();
    }
  }

  // 固定步长物理更新：每 1/120 秒一步（单帧最多补 5 步，避免卡顿后快进）
  let n = 0;
  while (acc >= STEP && n < 5) {
    if (state === 'PLAY' && !settingsOpen) update(STEP);
    else if (state !== 'PLAY') {
      // 菜单/剧情/结算画面：时间继续走（背景动画、按钮呼吸），彩带等粒子继续飘
      time += STEP;
      particles = particles.filter(p => { p.life -= STEP; p.x += p.vx * STEP; p.y += p.vy * STEP; p.vy += 400 * STEP; return p.life > 0; });
    }
    acc -= STEP; n++;
  }
  if (acc >= STEP) acc = 0;   // 积压过多直接丢弃，防止追赶

  applyCursor();   // 游戏内隐藏鼠标，菜单显示大箭头
  render();

  if (state === 'PLAY' && !settingsOpen && (isTouch() || mouseShown)) {
    for (const b of getTouchBtns()) {
      ctx.fillStyle = touch[b.id] ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.25)';
      roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill();
      ctx.font = '28px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2); ctx.textBaseline = 'alphabetic';
    }
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

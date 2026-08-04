import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const password = process.env.DASHBOARD_PASSWORD || '';
const root = new URL('../', import.meta.url);
const outputDirectory = new URL('./dist/', root);
await mkdir(outputDirectory, { recursive: true });

const baseStyles = `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 85% 5%,rgba(214,168,76,.2),transparent 25%),linear-gradient(145deg,#081321,#0b1728);color:#132238;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.card{width:min(470px,100%);padding:32px;border-radius:20px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.38)}.brand{display:flex;align-items:center;gap:13px}.mark{width:50px;height:50px;display:grid;place-items:center;border-radius:14px;background:#0b1728;color:#d6a84c;font-size:23px;font-weight:900}.brand strong{display:block;font-size:17px}.brand span{display:block;margin-top:3px;color:#6f7e90;font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}h1{margin:28px 0 9px;font-size:26px;letter-spacing:-.04em}p{margin:0;color:#6f7e90;font-size:13px;line-height:1.6}form{margin-top:23px}label{display:block;color:#526176;font-size:10px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}input{width:100%;margin-top:7px;padding:13px 14px;border:1px solid #dce2e8;border-radius:10px;color:#132238;background:#fff;font:inherit}input:focus{outline:3px solid rgba(214,168,76,.35);border-color:#c69b45}button{width:100%;margin-top:12px;padding:13px 16px;border:0;border-radius:10px;color:#fff;background:#0b1728;font:inherit;font-weight:850;cursor:pointer}button:disabled{opacity:.65;cursor:wait}.error{min-height:20px;margin-top:13px;color:#b83f49;font-size:12px;font-weight:750}.security,.status{margin-top:18px;padding-top:16px;border-top:1px solid #dce2e8;font-size:11px}.status{padding:14px;border:1px solid #ecd79e;border-radius:12px;background:#fff9ec;color:#73531d;font-size:13px;font-weight:700}.spinner{display:none;width:16px;height:16px;margin-right:8px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;vertical-align:-3px;animation:spin .7s linear infinite}.working .spinner{display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}`;

function page(body, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>${title}</title><style>${baseStyles}</style></head><body>${body}</body></html>`;
}

if (password.length < 16) {
  const body = `<main class="card"><div class="brand"><div class="mark">J</div><div><strong>The Jefferson</strong><span>Protected operations dashboard</span></div></div><h1>Access protection is being configured</h1><p>The dashboard is not being published in plaintext.</p><div class="status">Add a repository Actions secret named <strong>DASHBOARD_PASSWORD</strong> containing at least 16 characters, then rerun the Pages deployment.</div></main>`;
  await writeFile(new URL('index.html', outputDirectory), page(body, 'The Jefferson | Access Protection'), 'utf8');
  console.log('Password secret unavailable; published locked configuration page.');
  process.exit(0);
}

const sourceHtml = await readFile(new URL('./index.html', root), 'utf8');
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, 250_000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(sourceHtml, 'utf8'), cipher.final(), cipher.getAuthTag()]);
const payload = JSON.stringify({ salt: salt.toString('base64'), iv: iv.toString('base64'), data: encrypted.toString('base64') });

const body = `<main class="card"><div class="brand"><div class="mark">J</div><div><strong>The Jefferson</strong><span>Protected operations dashboard</span></div></div><h1>Authorized access only</h1><p>Enter the dashboard password. Access remains unlocked only for this browser tab.</p><form id="accessForm"><label for="password">Dashboard password</label><input id="password" type="password" autocomplete="current-password" required autofocus><button id="unlockButton" type="submit"><span class="spinner"></span><span class="buttonText">Unlock dashboard</span></button><div class="error" id="error" role="alert" aria-live="polite"></div></form><p class="security">The deployed dashboard payload is AES-256-GCM encrypted. Close this tab to lock it again.</p></main><script>
(() => {
  const payload = ${payload};
  const sessionKeyName = 'jefferson-dashboard-session-key-v1';
  const form = document.getElementById('accessForm');
  const passwordInput = document.getElementById('password');
  const button = document.getElementById('unlockButton');
  const buttonText = button.querySelector('.buttonText');
  const error = document.getElementById('error');
  const fromBase64 = value => Uint8Array.from(atob(value), character => character.charCodeAt(0));
  function toBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  }
  async function deriveKeyBytes(password) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(payload.salt), iterations: 250000 }, material, 256));
  }
  async function decrypt(keyBytes) {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv), tagLength: 128 }, key, fromBase64(payload.data));
    return new TextDecoder().decode(plaintext);
  }
  async function openDashboard(keyBytes, remember) {
    const html = await decrypt(keyBytes);
    if (remember) sessionStorage.setItem(sessionKeyName, toBase64(keyBytes));
    document.open(); document.write(html); document.close();
  }
  const saved = sessionStorage.getItem(sessionKeyName);
  if (saved) openDashboard(fromBase64(saved), false).catch(() => sessionStorage.removeItem(sessionKeyName));
  form.addEventListener('submit', async event => {
    event.preventDefault(); error.textContent = ''; button.disabled = true; button.classList.add('working'); buttonText.textContent = 'Unlocking…';
    try { await openDashboard(await deriveKeyBytes(passwordInput.value), true); }
    catch { error.textContent = 'Incorrect password. Check it and try again.'; passwordInput.select(); button.disabled = false; button.classList.remove('working'); buttonText.textContent = 'Unlock dashboard'; }
  });
})();
</script>`;

await writeFile(new URL('index.html', outputDirectory), page(body, 'The Jefferson | Secure Access'), 'utf8');
console.log('Encrypted dashboard generated in dist/index.html.');

import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const password = process.env.DASHBOARD_PASSWORD || '';
const outputDirectory = new URL('../dist/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });

function configurationPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>The Jefferson | Access Protection</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0b1728;color:#132238;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.card{width:min(520px,100%);padding:32px;border-radius:20px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.35)}.mark{width:52px;height:52px;display:grid;place-items:center;border-radius:15px;background:#0b1728;color:#d6a84c;font-size:24px;font-weight:900}h1{margin:22px 0 10px;font-size:27px;letter-spacing:-.04em}p{margin:0;color:#627084;line-height:1.65;font-size:14px}.status{margin-top:20px;padding:14px;border:1px solid #ecd79e;border-radius:12px;background:#fff9ec;color:#73531d;font-size:13px;font-weight:700}
  </style>
</head>
<body>
  <main class="card">
    <div class="mark">J</div>
    <h1>Access protection is being configured</h1>
    <p>The dashboard is not being published in plaintext. The repository administrator must add a <strong>DASHBOARD_PASSWORD</strong> Actions secret and rerun the Pages deployment.</p>
    <div class="status">Dashboard content remains unavailable until a valid password of at least 16 characters is configured.</div>
  </main>
</body>
</html>`;
}

if (password.length < 16) {
  await writeFile(new URL('index.html', outputDirectory), configurationPage(), 'utf8');
  console.log('DASHBOARD_PASSWORD is missing or too short; published locked configuration page.');
  process.exit(0);
}

const sourceHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, 250_000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(sourceHtml, 'utf8'), cipher.final(), cipher.getAuthTag()]);

const payload = {
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  data: encrypted.toString('base64')
};

const protectedHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>The Jefferson | Secure Access</title>
  <style>
    :root{--navy:#0b1728;--paper:#f3f5f7;--ink:#132238;--muted:#6f7e90;--gold:#d6a84c;--red:#b83f49;--line:#dce2e8}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 85% 5%,rgba(214,168,76,.2),transparent 25%),linear-gradient(145deg,#081321,var(--navy));color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.card{width:min(460px,100%);padding:32px;border-radius:20px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.38)}.brand{display:flex;align-items:center;gap:13px}.mark{width:50px;height:50px;display:grid;place-items:center;border-radius:14px;background:var(--navy);color:var(--gold);font-size:23px;font-weight:900}.brand strong{display:block;font-size:17px}.brand span{display:block;margin-top:3px;color:var(--muted);font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}h1{margin:28px 0 9px;font-size:26px;letter-spacing:-.04em}p{margin:0;color:var(--muted);font-size:13px;line-height:1.6}form{margin-top:23px}label{display:block;color:#526176;font-size:10px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}input{width:100%;margin-top:7px;padding:13px 14px;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:#fff;font:inherit}input:focus{outline:3px solid rgba(214,168,76,.35);border-color:#c69b45}button{width:100%;margin-top:12px;padding:13px 16px;border:0;border-radius:10px;color:#fff;background:var(--navy);font:inherit;font-weight:850;cursor:pointer}button:disabled{opacity:.65;cursor:wait}.error{min-height:20px;margin-top:13px;color:var(--red);font-size:12px;font-weight:750}.security{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);font-size:11px}.spinner{display:none;width:16px;height:16px;margin-right:8px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;vertical-align:-3px;animation:spin .7s linear infinite}.working .spinner{display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <main class="card">
    <div class="brand"><div class="mark">J</div><div><strong>The Jefferson</strong><span>Protected operations dashboard</span></div></div>
    <h1>Authorized access only</h1>
    <p>Enter the dashboard password. A successful unlock is retained only for this browser tab.</p>
    <form id="accessForm">
      <label for="password">Dashboard password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button id="unlockButton" type="submit"><span class="spinner"></span><span class="buttonText">Unlock dashboard</span></button>
      <div class="error" id="error" role="alert" aria-live="polite"></div>
    </form>
    <p class="security">The published dashboard payload is AES-256-GCM encrypted. The password is not stored in the repository or page source.</p>
  </main>
  <script>
    (() => {
      const payload = ${JSON.stringify(payload)};
      const sessionKeyName = 'jefferson-dashboard-session-key-v1';
      const form = document.getElementById('accessForm');
      const passwordInput = document.getElementById('password');
      const button = document.getElementById('unlockButton');
      const buttonText = button.querySelector('.buttonText');
      const error = document.getElementById('error');

      function fromBase64(value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }
      function toBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
      }
      async function deriveKeyBytes(password) {
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(payload.salt), iterations: 250000 }, material, 256);
        return new Uint8Array(bits);
      }
      async function decryptWithKeyBytes(keyBytes) {
        const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv), tagLength: 128 }, key, fromBase64(payload.data));
        return new TextDecoder().decode(plaintext);
      }
      function openDashboard(html) {
        const logout = '<button id="jeffersonSecureLogout" type="button" style="position:fixed;right:16px;bottom:16px;z-index:99999;border:0;border-radius:999px;padding:10px 14px;color:#fff;background:#0b1728;box-shadow:0 8px 24px rgba(0,0,0,.2);font:700 12px system-ui;cursor:pointer">Lock dashboard</button><script>document.getElementById("jeffersonSecureLogout").addEventListener("click",()=>{sessionStorage.removeItem("' + sessionKeyName + '");location.reload();});<\\/script>';
        const securedHtml = html.includes('</body>') ? html.replace('</body>', logout + '</body>') : html + logout;
        document.open();
        document.write(securedHtml);
        document.close();
      }
      async function unlock(keyBytes, remember) {
        const html = await decryptWithKeyBytes(keyBytes);
        if (remember) sessionStorage.setItem(sessionKeyName, toBase64(keyBytes));
        openDashboard(html);
      }
      async function trySessionUnlock() {
        const saved = sessionStorage.getItem(sessionKeyName);
        if (!saved) return;
        try { await unlock(fromBase64(saved), false); } catch (_) { sessionStorage.removeItem(sessionKeyName); }
      }

      form.addEventListener('submit', async event => {
        event.preventDefault();
        error.textContent = '';
        button.disabled = true;
        button.classList.add('working');
        buttonText.textContent = 'Unlocking…';
        try {
          const keyBytes = await deriveKeyBytes(passwordInput.value);
          await unlock(keyBytes, true);
        } catch (_) {
          error.textContent = 'Incorrect password. Check the password and try again.';
          passwordInput.select();
          button.disabled = false;
          button.classList.remove('working');
          buttonText.textContent = 'Unlock dashboard';
        }
      });

      trySessionUnlock();
    })();
  <\/script>
</body>
</html>`;

await writeFile(new URL('index.html', outputDirectory), protectedHtml, 'utf8');
console.log('Encrypted dashboard generated in dist/index.html.');

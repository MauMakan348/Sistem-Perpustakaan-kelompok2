const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('registration and login are the only public auth routes', () => {
  assert.match(source, /req\.method === "POST" && \(path === "\/api\/register" \|\| path === "\/api\/login"\)/);
  assert.match(source, /if \(publicAuth\) return readAndForward/);
});
test('user loan operations require JWT even if API key is supplied', () => {
  assert.match(source, /isUserOnlyRoute\(req, url\.pathname\) && !tokenValid/);
  assert.match(source, /POST.*\/api\/loans.*return/s);
});
test('book creation requires admin JWT, not API key alone', () => {
  assert.match(source, /if \(isBookCreate\(req, url\.pathname\)\)/);
  assert.match(source, /tokenPayload\.role !== "admin"/);
});
test('book status mutation requires gateway API key', () => {
  assert.match(source, /if \(isBookStatusPatch\(req, url\.pathname\)\)/);
  assert.match(source, /if \(!apiKeyValid\) return sendJson\(res, 401/);
});
test('API key is not forwarded to internal services and upstream errors are sanitized', () => {
  assert.match(source, /X-API-Key is intentionally consumed at Gateway/);
  assert.doesNotMatch(source, /headers\["x-api-key"\]\s*=\s*[^=]/i);
  assert.match(source, /error: `\$\{target\.serviceName\} tidak tersedia\.`/);
  assert.doesNotMatch(source, /res\.end\(JSON\.stringify\(\{\s*error\s*:\s*error\.stack/);
});
test('query string and HTTP method are forwarded; body size is bounded', () => {
  assert.match(source, /path: pathname\.replace\(\/\^\\\/api\/, ""\) \+ search/);
  assert.match(source, /method: req\.method/);
  assert.match(source, /maxBody = 1024 \* 1024/);
});

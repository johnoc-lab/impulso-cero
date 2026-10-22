const api = 'https://api.github.com';

function send(res, status, payload) {
  res.status(status).json(payload);
}

async function verifyEditor(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Inicia sesión para continuar.', status: 401 };
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const allowlist = (process.env.CMS_ALLOWED_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!supabaseUrl || !anonKey || !allowlist.length) return { error: 'El acceso de administración no está configurado.', status: 503 };
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` }
  });
  if (!response.ok) return { error: 'Tu sesión ya no es válida. Inicia sesión de nuevo.', status: 401 };
  const user = await response.json();
  if (!user.email || !allowlist.includes(user.email.toLowerCase())) return { error: 'Esta cuenta no tiene permiso para editar la landing.', status: 403 };
  return { user };
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Falta configurar GITHUB_TOKEN en Vercel.');
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `GitHub respondió ${response.status}.`);
  return result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.query?.config === '1') {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return send(res, 503, { error: 'Falta configurar el inicio de sesión.' });
    return send(res, 200, { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
  }
  if (req.method === 'GET' && req.query?.session === '1') {
    const access = await verifyEditor(req);
    if (access.error) return send(res, access.status, { error: access.error });
    return send(res, 200, { ok: true, email: access.user.email });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });

  try {
    const access = await verifyEditor(req);
    if (access.error) return send(res, access.status, { error: access.error });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body.content !== 'object' || Array.isArray(body.content)) return send(res, 400, { error: 'El contenido enviado no es válido.' });
    const images = Array.isArray(body.images) ? body.images : [];
    if (images.length > 8) return send(res, 413, { error: 'Sube hasta ocho imágenes por guardado.' });
    const maxBytes = 2 * 1024 * 1024;
    const totalUploadBytes = images.reduce((total, image) => total + (typeof image?.base64 === 'string' ? Math.floor(image.base64.length * 0.75) : 0), 0);
    if (totalUploadBytes > 3 * 1024 * 1024) return send(res, 413, { error: 'El total de imágenes por guardado no puede superar 3 MB.' });
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const projectRoot = (process.env.CMS_REPO_PATH || 'IMPULSO CERO').replace(/^\/+|\/+$/g, '');
    if (!owner || !repo) return send(res, 503, { error: 'Falta configurar el repositorio de GitHub en Vercel.' });

    const ref = await github(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    const parentSha = ref.object.sha;
    const parent = await github(`/repos/${owner}/${repo}/git/commits/${parentSha}`);
    const entries = [];
    const makeBlob = async (path, data, encoding) => {
      const blob = await github(`/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: data, encoding })
      });
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    };

    for (const image of images) {
      if (!image || !allowedTypes.has(image.type) || typeof image.base64 !== 'string') return send(res, 400, { error: 'Formato de imagen no permitido.' });
      const bytes = Buffer.from(image.base64, 'base64');
      if (!bytes.length || bytes.length > maxBytes) return send(res, 413, { error: 'Cada imagen debe pesar menos de 2 MB.' });
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[image.type];
      const safeName = String(image.name || 'imagen').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'imagen';
      const filename = `${Date.now()}-${safeName}.${extension}`;
      image.publicPath = `/assets/uploads/${filename}`;
      await makeBlob(`${projectRoot}/assets/uploads/${filename}`, bytes.toString('base64'), 'base64');
    }
    for (const image of images) {
      const path = image.fieldPath;
      if (typeof path !== 'string' || !/^[a-zA-Z0-9.[\]_-]+$/.test(path)) return send(res, 400, { error: 'Campo de imagen no válido.' });
      const parts = path.split('.');
      let target = body.content;
      for (const part of parts.slice(0, -1)) target = target?.[part];
      if (!target || typeof target !== 'object') return send(res, 400, { error: 'No se encontró el campo de imagen.' });
      target[parts[parts.length - 1]] = image.publicPath;
    }

    const serialized = JSON.stringify(body.content, null, 2);
    if (Buffer.byteLength(serialized, 'utf8') > 500_000) return send(res, 413, { error: 'El contenido es demasiado grande.' });
    await makeBlob(`${projectRoot}/content/site.json`, serialized, 'utf-8');
    const tree = await github(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ base_tree: parent.tree.sha, tree: entries })
    });
    const commit = await github(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: `Actualizar landing desde el panel (${access.user.email})`, tree: tree.sha, parents: [parentSha] })
    });
    await github(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sha: commit.sha, force: false })
    });
    return send(res, 200, { ok: true, commit: commit.html_url });
  } catch (error) {
    return send(res, 500, { error: error.message || 'No se pudo guardar en GitHub.' });
  }
};

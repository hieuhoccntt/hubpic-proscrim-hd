const UPSTREAM = 'https://proscrim-hd.vercel.app/api';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200) => Response.json(data, { status, headers });
const fields = (item, keys) => Object.fromEntries(keys.map(key => [key, item[key]]));

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
    }
    const params = new URL(request.url).searchParams;
    const resource = params.get('resource');
    const id = params.get('id') || '';
    const slot = params.get('slot') || '';
    let path;
    if (resource === 'timeslots') path = '/timeslots';
    else if (resource === 'teams' && slot.trim() && slot.length <= 120 && !/[\/\\\x00-\x1f]/.test(slot) && slot !== '.' && slot !== '..') {
      path = '/teams/timeslot/' + encodeURIComponent(slot);
    } else if (/^\d{1,15}$/.test(id)) {
      if (resource === 'overrides') path = '/teams/' + id + '/player-overrides';
      if (resource === 'logo') path = '/teams/' + id + '/logo';
    }
    if (!path) return json({ error: 'Invalid request' }, 400);

    try {
      const upstream = await fetch(UPSTREAM + path, { redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) return json({ error: 'Pro Scrim API unavailable' }, upstream.status === 404 ? 404 : 502);
      if (resource === 'logo') {
        const contentType = upstream.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
        if (!/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(contentType || '')) {
          return json({ error: 'Unsupported logo format' }, 415);
        }
        return new Response(upstream.body, { headers: { ...headers, 'Content-Type': contentType } });
      }
      const payload = await upstream.json();
      const list = Array.isArray(payload) ? payload : payload?.data;
      if (!Array.isArray(list)) return json({ error: 'Invalid Pro Scrim response' }, 502);
      const rows = list.filter(item => item && typeof item === 'object');
      if (resource === 'timeslots') return json(rows.map(item => fields(item, ['id', 'value', 'time', 'name', 'label'])));
      if (resource === 'overrides') return json({ data: rows.map(item => fields(item, ['player_id', 'rename_override', 'team_full'])) });
      return json({ data: rows.map(item => ({
        ...fields(item, ['id', 'name', 'team_name', 'teamName', 'squad_name', 'title', 'stt', 'order', 'position', 'no', 'index']),
        logo: item.logo && /^\d{1,15}$/.test(String(item.id)) ? { url: '/scrim-api/teams/' + item.id + '/logo' } : undefined
      })) });
    } catch {
      return json({ error: 'Pro Scrim API unavailable' }, 502);
    }
  }
};

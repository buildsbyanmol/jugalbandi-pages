export function detectPlatform(userAgent = '') {
  if (/Android|iPhone|iPad|Mobile/i.test(userAgent)) return 'unknown';
  if (/Macintosh/i.test(userAgent)) return 'macos';
  if (/Windows/i.test(userAgent)) return 'windows';
  if (/Linux/i.test(userAgent)) return 'linux';
  return 'unknown';
}

export function googleFormUrls(config) {
  if (config?.provider !== 'google-forms') return null;
  try {
    const responder = new URL(config.responderUrl);
    const embedded = new URL(config.embedUrl);
    const validForm = (url) => url.protocol === 'https:' && url.hostname === 'docs.google.com'
      && !url.port && !url.username && !url.password && !url.hash
      && /^\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform$/.test(url.pathname);
    if (!validForm(responder) || !validForm(embedded) || responder.pathname !== embedded.pathname) return null;
    if (responder.search || embedded.searchParams.size !== 1 || embedded.searchParams.get('embedded') !== 'true') return null;
    return { responderUrl: responder.href, embedUrl: embedded.href };
  } catch { return null; }
}

export function isPublicHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

export function registrationReady(config) {
  if (config?.provider === 'google-forms') return Boolean(googleFormUrls(config));
  if (config?.provider && config.provider !== 'api') return false;
  return Boolean(config && isPublicHttps(config.endpoint) && isPublicHttps(config.privacyUrl));
}

export async function registerBeta({ email, platform }, config, fetcher = fetch) {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 254) return { status: 'invalid' };
  if (!registrationReady(config)) return { status: 'unconfigured' };
  // Google owns validation, durable saving, and confirmation in its native form.
  if (config.provider === 'google-forms') return { status: 'native-form' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, platform, purpose: 'jugalbandi-beta' }),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) return { status: 'error' };
    const body = await response.json();
    // An HTTP success alone does not mean the address was saved.
    return body.saved === true ? { status: 'saved' } : { status: 'error' };
  } catch { return { status: 'error' }; }
  finally { clearTimeout(timeout); }
}

/** A cohort goal is labelled as a goal. Only verified totals may claim signups. */
export function betaCommunityLabel(count, cohortGoal) {
  if (Number.isSafeInteger(cohortGoal) && cohortGoal > 0) return `Goal: ${cohortGoal.toLocaleString('en-IN')} beta testers`;
  if (!Number.isSafeInteger(count) || count < 0) return 'Beta list is open';
  if (count === 0) return 'Be the first to join';
  return `${count.toLocaleString('en-IN')} ${count === 1 ? 'person has' : 'people have'} joined`;
}

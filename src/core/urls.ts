export function absoluteUrl(value: string, label = 'URL'): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${label} must be an absolute HTTP(S) URL without credentials.`);
  }
  url.hash = '';
  return url.href;
}

export function siteOrigin(value: string): string {
  const url = new URL(absoluteUrl(value, 'Site origin'));
  if (url.pathname !== '/' || url.search || value.includes('#')) {
    throw new Error('Site origin must contain only scheme, host and optional port.');
  }
  return url.origin;
}

export function routeUrl(origin: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\?#\s\u0000-\u001f]/u.test(path)) {
    throw new Error('Route must be an absolute pathname without query, fragment or whitespace.');
  }
  const url = new URL(path, siteOrigin(origin));
  if (url.origin !== siteOrigin(origin)) throw new Error('Route must stay on the configured site.');
  return url.href;
}

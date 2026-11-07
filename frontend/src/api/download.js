import api from './client';

/**
 * Download a file from an authenticated endpoint.
 * axios automatically attaches the JWT via its interceptor,
 * so this works for any endpoint protected by get_current_user.
 */
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });

  // Try to grab the filename from Content-Disposition if provided
  let finalName = filename;
  const cd = res.headers['content-disposition'];
  if (cd) {
    const match = /filename="?([^"]+)"?/.exec(cd);
    if (match) finalName = match[1];
  }

  // Create an object URL and trigger a click on a temporary anchor
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
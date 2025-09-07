// Placeholder image worker: compress/strip EXIF/blur regions (stubs)
self.onmessage = async (ev: MessageEvent) => {
  const { file, regions } = ev.data || {};
  if (!file) return self.postMessage({ error: 'no-file' });
  // For scaffold: echo back the original Blob
  // Real impl: createImageBitmap -> draw to OffscreenCanvas -> apply blur masks -> convertToBlob
  self.postMessage({ blob: file, regions: regions || [] });
};


export type EmbedSizeMessage = {
  type: 'EMBED_SIZE';
  height: number;
};

export type EmbedReadyMessage = {
  type: 'EMBED_READY';
};

export function postEmbedReady() {
  if (typeof window === 'undefined') return;
  const msg: EmbedReadyMessage = { type: 'EMBED_READY' };
  window.parent?.postMessage(msg, '*');
}

export function attachAutoResize(root: HTMLElement) {
  if (typeof window === 'undefined') return () => {};

  postEmbedReady();

  let rafId: number | null = null;

  const send = (height: number) => {
    const msg: EmbedSizeMessage = { type: 'EMBED_SIZE', height };
    window.parent?.postMessage(msg, '*');
  };

  const measureAndSend = () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      send(height);
    });
  };

  const ro = new ResizeObserver(() => measureAndSend());
  ro.observe(root);

  window.addEventListener('load', measureAndSend);

  measureAndSend();

  return () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    window.removeEventListener('load', measureAndSend);
    ro.disconnect();
  };
}
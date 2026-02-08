export type EmbedSizeMessage = {
  type: 'EMBED_SIZE';
  height: number;
  width: number;
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
  let intervalId: number | null = null;
  let mutationObserver: MutationObserver | null = null;
  let lastSentWidth = 0;
  let lastSentHeight = 0;
  let lastSentAt = 0;

  const RESIZE_POLL_MS = 400;
  const FORCE_RESEND_MS = 2000;

  const send = (height: number, width: number, force = false) => {
    const now = Date.now();
    const changed = height !== lastSentHeight || width !== lastSentWidth;
    const stale = now - lastSentAt >= FORCE_RESEND_MS;
    if (!force && !changed && !stale) return;

    lastSentHeight = height;
    lastSentWidth = width;
    lastSentAt = now;
    const msg: EmbedSizeMessage = { type: 'EMBED_SIZE', height, width };
    window.parent?.postMessage(msg, '*');
  };

  const measureAndSend = (force = false) => {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const doc = document.documentElement;
      const body = document.body;
      const height = Math.ceil(
        Math.max(
          root.getBoundingClientRect().height,
          root.scrollHeight,
          root.offsetHeight,
          body?.scrollHeight ?? 0,
          body?.offsetHeight ?? 0,
          doc?.scrollHeight ?? 0,
          doc?.offsetHeight ?? 0
        )
      );
      const width = Math.ceil(
        Math.max(
          root.getBoundingClientRect().width,
          root.scrollWidth,
          root.offsetWidth
        )
      );
      send(height, width, force);
    });
  };

  const ro = new ResizeObserver(() => measureAndSend());
  ro.observe(root);
  ro.observe(document.documentElement);

  const onLoad = () => measureAndSend();
  const onResize = () => measureAndSend();
  const onOrientationChange = () => measureAndSend();
  const onPageShow = () => measureAndSend();
  const onVisibilityChange = () => measureAndSend(true);
  const onFocus = () => measureAndSend();

  window.addEventListener('load', onLoad);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrientationChange);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onFocus);

  mutationObserver = new MutationObserver(() => measureAndSend());
  mutationObserver.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });

  intervalId = window.setInterval(() => {
    measureAndSend(true);
  }, RESIZE_POLL_MS);

  window.setTimeout(() => measureAndSend(true), 80);
  window.setTimeout(() => measureAndSend(true), 250);
  window.setTimeout(() => measureAndSend(true), 800);
  window.setTimeout(() => measureAndSend(true), 1600);

  measureAndSend(true);

  return () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    if (intervalId != null) window.clearInterval(intervalId);
    window.removeEventListener('load', onLoad);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrientationChange);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('visibilitychange', onVisibilityChange);
    ro.disconnect();
    mutationObserver?.disconnect();
  };
}

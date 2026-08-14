(() => {
  if (!matchMedia('(pointer:fine)').matches || document.querySelector('#melotripCursor')) return;

  const cursor = document.createElement('div');
  cursor.className = 'global-melotrip-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<i></i>';
  document.body.appendChild(cursor);

  const actionSelector = 'a,button,input,select,textarea,[role="button"],[role="slider"]';
  const spatialSelector = '.material,.grid-card,.sound-card,.track-wave-scrubber,.clip-wave,.mobile-connect-card';

  document.addEventListener('pointermove', event => {
    cursor.style.setProperty('--cursor-x', `${event.clientX}px`);
    cursor.style.setProperty('--cursor-y', `${event.clientY}px`);
    cursor.classList.add('visible');
    cursor.classList.toggle('over-action', Boolean(event.target.closest(actionSelector)));
    cursor.classList.toggle('over-spatial', Boolean(event.target.closest(spatialSelector)) && !event.target.closest(actionSelector));
  }, { passive: true });

  document.addEventListener('pointerdown', () => cursor.classList.add('pressed'), { passive: true });
  document.addEventListener('pointerup', () => cursor.classList.remove('pressed'), { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
  window.addEventListener('blur', () => cursor.classList.remove('visible'));
})();

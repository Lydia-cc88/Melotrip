(() => {
  const tabs = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.sound-card[data-category]')];
  const count = document.querySelector('#visibleSoundCount');
  const mixButton = document.querySelector('#cityMixButton');
  const saveButton = document.querySelector('#saveCityButton');
  let audioContext;
  let activeNodes = [];
  let mixTimer;

  const stopMix = () => {
    clearTimeout(mixTimer);
    activeNodes.forEach(node => { try { node.stop(); } catch (_) {} });
    activeNodes = [];
    mixButton.classList.remove('playing');
    mixButton.textContent = '▶ Play city mix';
    mixButton.setAttribute('aria-pressed', 'false');
  };

  const playTone = (frequency, start, duration, type, pan) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const panner = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.04, start + duration);
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(.055, start + .06);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain);
    if (panner) { gain.connect(panner); panner.pan.value = pan; panner.connect(audioContext.destination); }
    else gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .05);
    activeNodes.push(oscillator);
  };

  const playMix = () => {
    if (mixButton.classList.contains('playing')) { stopMix(); return; }
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const now = audioContext.currentTime + .03;
    const sequence = [262, 330, 392, 523, 494, 440, 349, 392, 523, 659];
    sequence.forEach((frequency, index) => playTone(frequency, now + index * .62, index === sequence.length - 1 ? 1.25 : .76, 'sine', (index / 9) * 1.4 - .7));
    mixButton.classList.add('playing');
    mixButton.textContent = '■ Stop city mix';
    mixButton.setAttribute('aria-pressed', 'true');
    mixTimer = setTimeout(stopMix, 7000);
  };

  tabs.forEach(tab => tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;
    tabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let visible = 0;
    cards.forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('filtered-out', !show);
      card.setAttribute('aria-hidden', String(!show));
      if (show) visible += 1;
    });
    document.querySelector('.sound-grid')?.classList.toggle('is-filtered', filter !== 'all');
    count.textContent = String(visible).padStart(2, '0');
  }));

  mixButton?.addEventListener('click', playMix);
  saveButton?.addEventListener('click', () => {
    const saved = saveButton.getAttribute('aria-pressed') !== 'true';
    saveButton.setAttribute('aria-pressed', String(saved));
    saveButton.textContent = saved ? '♥ City saved' : '♡ Save city';
  });
  document.addEventListener('visibilitychange', () => document.hidden && stopMix());
})();

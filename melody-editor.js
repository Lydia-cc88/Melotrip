(() => {
  const hero = document.querySelector('#waveEditor');
  const canvas = document.querySelector('#editorWaveCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const controls = Array.from({ length: 11 }, (_, index) => .42 + Math.sin(index * 1.38) * .16 + Math.cos(index * .61) * .08);
  const palettes = {
    melody: ['#F4FF00', '#123F85', '#FFF200', '#3E8FCE', '#F4FF00'],
    atmosphere: ['#F4FF00', '#9FDCF4', '#123F85', '#FFF200'],
    rhythm: ['#FFF200', '#F15A43', '#123F85', '#F4FF00']
  };
  let width = 0, height = 0, dpr = 1, frame = 0, elapsed = 0;
  let mode = 'melody', intensity = .64, texture = .48, tempo = 92;
  let pointer = { x: .5, y: .5, inside: false, down: false };
  const totalDuration = 204;
  let audioContext, audioTimer, playbackStart = 0, progressFrame = 0, materials = 7;
  let trimStartValue = 0, trimEndValue = 1, activeTrimHandle = null;
  let activeTrackPlayback = null, trackProgressFrame = 0, trackPlaybackStarted = 0, trackPlaybackOffset = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const hex = value => {
    const number = parseInt(value.slice(1), 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  };
  const rgba = (color, alpha) => `rgba(${hex(color).join(',')},${alpha})`;
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
  const durationToSeconds = value => {
    const [minutes, seconds] = value.split(':').map(Number);
    return minutes * 60 + seconds;
  };
  const barHeight = (index, seed = 1) => 18 + Math.abs(Math.sin(index * .73 + seed) * 25) + Math.abs(Math.cos(index * .19 + seed * .6) * 9);

  function populateWaveBars(container, count, seed, tag = 'span', className = '') {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index++) {
      const bar = document.createElement(tag);
      if (className) bar.className = className;
      bar.style.setProperty('--bar-height', `${Math.min(48, barHeight(index, seed))}px`);
      fragment.appendChild(bar);
    }
    container.prepend(fragment);
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function sampledControl(nx) {
    const position = clamp(nx, 0, 1) * (controls.length - 1);
    const index = Math.floor(position), fraction = position - index;
    return mix(controls[index], controls[Math.min(index + 1, controls.length - 1)], fraction);
  }

  function waveHeight(nx, depth, time) {
    const hand = (sampledControl(nx) - .5) * 2;
    const speed = tempo / 92;
    const base = Math.sin(nx * Math.PI * (4 + texture * 3) - time * .00045 * speed + depth * 4.2) * .24;
    const detail = Math.sin(nx * 31 + depth * 12 + time * .00072 * speed) * texture * .11;
    const pulse = mode === 'rhythm' ? Math.sin(nx * 54 - time * .0018 * speed) * .11 : 0;
    return (hand * .66 + base + detail + pulse) * intensity;
  }

  function draw(time) {
    elapsed = reducedMotion ? 0 : time;
    ctx.clearRect(0, 0, width, height);
    const horizon = height * .50;
    const colors = palettes[mode];
    const rows = width < 700 ? 42 : 64;
    const columns = width < 700 ? 84 : 136;
    for (let row = 0; row < rows; row++) {
      const depth = row / (rows - 1);
      const perspective = .25 + Math.pow(depth, .78) * .92;
      const yBase = horizon + Math.pow(depth, 1.55) * height * .56;
      const color = colors[row % colors.length];
      for (let column = 0; column < columns; column++) {
        const nx = column / (columns - 1);
        const x = width / 2 + (nx - .5) * width * perspective * 1.18;
        const wave = waveHeight(nx, depth, elapsed);
        const y = yBase - wave * height * (1.18 - depth * .42);
        const hoverDistance = Math.hypot((x - pointer.x * width) / width, (y - pointer.y * height) / height);
        const hover = pointer.inside ? Math.max(0, 1 - hoverDistance * 8) : 0;
        const radius = (.52 + depth * 1.1) * (1 + hover * 1.25);
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, .16 + depth * .47 + hover * .28); ctx.fill();
      }
    }
    ctx.beginPath();
    for (let column = 0; column <= 180; column++) {
      const nx = column / 180;
      const x = nx * width;
      const y = horizon - waveHeight(nx, .04, elapsed) * height * 1.02;
      column ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = rgba(colors[1], .62); ctx.lineWidth = 1.2; ctx.shadowColor = rgba(colors[1], .45); ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    controls.forEach((value, index) => {
      const nx = index / (controls.length - 1), x = nx * width;
      const y = horizon - waveHeight(nx, .04, elapsed) * height * 1.02;
      ctx.beginPath(); ctx.arc(x, y, pointer.down && Math.abs(pointer.x - nx) < .06 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = '#123f85'; ctx.fill();
    });
    frame = requestAnimationFrame(draw);
  }

  function editAt(event) {
    const rect = hero.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    pointer.y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    pointer.inside = true;
    if (!pointer.down) return;
    const position = pointer.x * (controls.length - 1);
    const index = Math.round(position);
    controls[index] = clamp(.5 + (.53 - pointer.y) * 1.65, .08, .92);
    if (index > 0) controls[index - 1] = mix(controls[index - 1], controls[index], .24);
    if (index < controls.length - 1) controls[index + 1] = mix(controls[index + 1], controls[index], .24);
    document.querySelector('#editorStatus').textContent = `${materials} materials · wave edited`;
  }

  hero.addEventListener('pointerdown', event => {
    if (event.target.closest('button,a,input,.wave-control-panel,.editor-transport-panel')) return;
    pointer.down = true; hero.setPointerCapture?.(event.pointerId); editAt(event);
  });
  hero.addEventListener('pointermove', editAt, { passive: true });
  hero.addEventListener('pointerup', () => pointer.down = false);
  hero.addEventListener('pointercancel', () => pointer.down = false);
  hero.addEventListener('pointerleave', () => { pointer.inside = false; pointer.down = false; });

  const clipWave = document.querySelector('#clipWave');
  const clipWindow = document.querySelector('#clipWindow');
  const clipMaskLeft = document.querySelector('#clipMaskLeft');
  const clipMaskRight = document.querySelector('#clipMaskRight');
  const trimStartHandle = document.querySelector('#trimStart');
  const trimEndHandle = document.querySelector('#trimEnd');
  populateWaveBars(clipWave, 92, 2.4, 'span', 'clip-bar');

  function updateTrimUI(announce = false) {
    const startPercent = trimStartValue * 100;
    const endPercent = trimEndValue * 100;
    clipMaskLeft.style.width = `${startPercent}%`;
    clipMaskRight.style.width = `${100 - endPercent}%`;
    clipWindow.style.left = `${startPercent}%`;
    clipWindow.style.width = `${endPercent - startPercent}%`;
    trimStartHandle.setAttribute('aria-valuenow', String(Math.round(trimStartValue * totalDuration)));
    trimEndHandle.setAttribute('aria-valuenow', String(Math.round(trimEndValue * totalDuration)));
    document.querySelector('#trimSelectionLabel').textContent = `Selection · ${formatTime((trimEndValue - trimStartValue) * totalDuration)}`;
    document.querySelector('#editorCurrentTime').textContent = formatTime(trimStartValue * totalDuration);
    if (announce) document.querySelector('#editorStatus').textContent = `${materials} materials · trimmed ${formatTime(trimStartValue * totalDuration)}–${formatTime(trimEndValue * totalDuration)}`;
    if (document.querySelector('#editorPlay').classList.contains('playing')) playbackStart = performance.now();
  }

  function setTrimFromPointer(event) {
    if (!activeTrimHandle) return;
    const rect = clipWave.getBoundingClientRect();
    const value = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    if (activeTrimHandle === 'start') trimStartValue = Math.min(value, trimEndValue - .08);
    if (activeTrimHandle === 'end') trimEndValue = Math.max(value, trimStartValue + .08);
    updateTrimUI(true);
  }
  function beginTrim(type, event) {
    activeTrimHandle = type;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setTrimFromPointer(event);
  }
  trimStartHandle.addEventListener('pointerdown', event => beginTrim('start', event));
  trimEndHandle.addEventListener('pointerdown', event => beginTrim('end', event));
  addEventListener('pointermove', setTrimFromPointer, { passive: true });
  addEventListener('pointerup', () => activeTrimHandle = null);
  addEventListener('pointercancel', () => activeTrimHandle = null);
  [trimStartHandle, trimEndHandle].forEach((handle, index) => handle.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const delta = (event.key === 'ArrowRight' ? 1 : -1) / totalDuration;
    if (index === 0) trimStartValue = clamp(trimStartValue + delta, 0, trimEndValue - .08);
    else trimEndValue = clamp(trimEndValue + delta, trimStartValue + .08, 1);
    updateTrimUI(true);
  }));
  updateTrimUI();

  document.querySelectorAll('[data-wave-mode]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.waveMode;
    document.querySelectorAll('[data-wave-mode]').forEach(item => {
      const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
    });
  }));

  function bindRange(id, output, setter) {
    const input = document.querySelector(id), label = document.querySelector(output);
    input.addEventListener('input', () => { setter(Number(input.value)); label.textContent = input.value; });
  }
  bindRange('#intensityControl', '#intensityValue', value => intensity = value / 100);
  bindRange('#textureControl', '#textureValue', value => texture = value / 100);
  bindRange('#tempoControl', '#tempoValue', value => tempo = value);

  function stopAudio() {
    clearInterval(audioTimer); cancelAnimationFrame(progressFrame);
    const button = document.querySelector('#editorPlay');
    button.classList.remove('playing'); button.setAttribute('aria-pressed', 'false'); button.querySelector('span').textContent = '▶';
  }
  function playNote() {
    const now = audioContext.currentTime;
    const index = Math.floor(Math.random() * controls.length);
    const frequencies = [196, 220, 247, 294, 330, 392, 440, 494, 523, 587, 659];
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = mode === 'rhythm' ? 'triangle' : 'sine';
    oscillator.frequency.value = frequencies[index] * (.86 + controls[index] * .28);
    gain.gain.setValueAtTime(.001, now); gain.gain.exponentialRampToValueAtTime(.035 + intensity * .035, now + .03); gain.gain.exponentialRampToValueAtTime(.001, now + .42);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + .45);
  }
  function updateProgress() {
    const seconds = (performance.now() - playbackStart) / 1000;
    const selectionDuration = Math.max(1, (trimEndValue - trimStartValue) * totalDuration);
    const selectionTime = seconds % selectionDuration;
    const shown = trimStartValue * totalDuration + selectionTime;
    document.querySelector('#editorCurrentTime').textContent = formatTime(shown);
    document.querySelector('#editorProgress').style.width = `${(selectionTime / selectionDuration) * 100}%`;
    progressFrame = requestAnimationFrame(updateProgress);
  }
  document.querySelector('#editorPlay').addEventListener('click', event => {
    const button = event.currentTarget;
    if (button.classList.contains('playing')) { stopAudio(); return; }
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume();
    button.classList.add('playing'); button.setAttribute('aria-pressed', 'true'); button.querySelector('span').textContent = '■';
    playbackStart = performance.now(); playNote(); audioTimer = setInterval(playNote, 60000 / tempo / 2); updateProgress();
  });

  document.querySelector('#addMaterial').addEventListener('click', () => {
    materials += 1; document.querySelector('#editorStatus').textContent = `${materials} materials · new fragment added`;
    controls[Math.floor(Math.random() * controls.length)] = .25 + Math.random() * .55;
  });
  document.querySelector('#saveMelody').addEventListener('click', event => {
    event.currentTarget.textContent = '✓ Saved'; document.querySelector('#editorStatus').textContent = 'Saved to Journey Melody Collection';
  });
  document.querySelector('#aiVariation').addEventListener('click', event => {
    controls.forEach((_, index) => controls[index] = clamp(.22 + Math.random() * .58, .08, .92));
    event.currentTarget.textContent = 'Variation generated'; setTimeout(() => event.currentTarget.textContent = 'Generate AI variation', 1600);
  });

  const tracks = [...document.querySelectorAll('.melody-track')];
  const librarySelection = document.querySelector('#librarySelection');
  const libraryStatus = document.querySelector('#libraryActionStatus');
  let selectedTrack = tracks[0];

  tracks.forEach((track, trackIndex) => {
    const scrubber = document.createElement('div');
    scrubber.className = 'track-wave-scrubber';
    scrubber.innerHTML = `<div class="track-wave-bars" aria-hidden="true"></div><div class="track-wave-progress" aria-hidden="true"></div><input class="track-scrubber" type="range" min="0" max="1000" value="0" step="1" aria-label="Playback position for ${track.dataset.title}"><span class="track-current">00:00</span>`;
    track.insertBefore(scrubber, track.querySelector('.track-place'));
    populateWaveBars(scrubber.querySelector('.track-wave-bars'), 82, trackIndex + 1.25, 'i');
    const input = scrubber.querySelector('.track-scrubber');
    input.addEventListener('input', () => {
      const progress = Number(input.value) / 10;
      updateTrackScrubber(track, progress);
      if (activeTrackPlayback === track) {
        trackPlaybackOffset = progress;
        trackPlaybackStarted = performance.now();
      }
      libraryStatus.textContent = `Position ${scrubber.querySelector('.track-current').textContent} · ${track.dataset.title}`;
    });
  });

  function updateTrackScrubber(track, progress) {
    const scrubber = track.querySelector('.track-wave-scrubber');
    const duration = durationToSeconds(track.dataset.duration);
    const bounded = clamp(progress, 0, 100);
    scrubber.style.setProperty('--track-progress', `${bounded}%`);
    scrubber.querySelector('.track-scrubber').value = String(Math.round(bounded * 10));
    scrubber.querySelector('.track-current').textContent = formatTime(duration * bounded / 100);
  }
  function stopTrackPlayback() {
    cancelAnimationFrame(trackProgressFrame);
    if (activeTrackPlayback) {
      const button = activeTrackPlayback.querySelector('[data-action="play"]');
      button.classList.remove('active'); button.textContent = '▶';
    }
    activeTrackPlayback = null;
  }
  function animateTrackPlayback() {
    if (!activeTrackPlayback) return;
    const duration = durationToSeconds(activeTrackPlayback.dataset.duration);
    const elapsedPercent = ((performance.now() - trackPlaybackStarted) / 1000 / duration) * 100;
    const progress = (trackPlaybackOffset + elapsedPercent) % 100;
    updateTrackScrubber(activeTrackPlayback, progress);
    trackProgressFrame = requestAnimationFrame(animateTrackPlayback);
  }
  function selectTrack(track) {
    selectedTrack = track;
    tracks.forEach(item => item.classList.toggle('active', item === track));
    librarySelection.textContent = track.dataset.title;
    document.querySelector('#clipEditTitle').textContent = track.dataset.title;
  }
  document.querySelector('#melodyList').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    const track = event.target.closest('.melody-track');
    if (!track) return;
    selectTrack(track);
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'play') {
      const willPlay = activeTrackPlayback !== track;
      stopTrackPlayback();
      if (willPlay) {
        activeTrackPlayback = track;
        trackPlaybackOffset = Number(track.querySelector('.track-scrubber').value) / 10;
        trackPlaybackStarted = performance.now();
        button.classList.add('active'); button.textContent = '■';
        libraryStatus.textContent = `Playing preview · ${track.dataset.title}`;
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume(); playNote(); animateTrackPlayback();
      } else {
        libraryStatus.textContent = `Paused · ${track.dataset.title}`;
      }
    }
    if (action === 'edit') {
      document.querySelector('#sessionTitle').textContent = track.dataset.title;
      document.querySelector('#editorStatus').textContent = `Loaded from collection · ${track.dataset.duration}`;
      libraryStatus.textContent = `Opened in editor · ${track.dataset.title}`;
      hero.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    if (action === 'upload') {
      const uploaded = button.classList.toggle('uploaded');
      button.textContent = uploaded ? '✓' : '↑';
      libraryStatus.textContent = uploaded ? `Uploaded to mobile · ${track.dataset.title}` : `Upload removed · ${track.dataset.title}`;
    }
    if (action === 'download') {
      const project = { title: track.dataset.title, city: track.dataset.city, duration: track.dataset.duration, format: 'Melotrip editable journey melody' };
      const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `${track.dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.melotrip.json`; link.click(); URL.revokeObjectURL(url);
      libraryStatus.textContent = `Downloaded project · ${track.dataset.title}`;
    }
  });

  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAudio(); stopTrackPlayback(); } });
  resize(); draw(0);
})();

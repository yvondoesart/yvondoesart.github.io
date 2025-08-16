    const tabs = document.querySelectorAll('.collection-tab');
    const gallery = document.getElementById('gallery-images');
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');
    const form = document.getElementById('inquiry-form');
    const formArtTitle = document.getElementById('form-art-title');
    const description = document.getElementById('collection-description');
    let currentArtTitle = '';

    function setActiveTab(selectedTab) {
      tabs.forEach(tab => tab.classList.remove('active'));
      selectedTab.classList.add('active');
    }

    function setupReveals() {
      // Respect reduced-motion users
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        return;
      }

      if (!('IntersectionObserver' in window)) {
        // Fallback: just show them
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        return;
      }

      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target); // reveal once
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px'
      });

      document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
    }

    document.addEventListener('DOMContentLoaded', () => {
      setupReveals();
      const modal = document.getElementById('modal');
      if (modal) modal.style.display = 'none';
      if (location.hash === '#modal') history.replaceState(null, '', location.pathname);
    });

    function loadCollection(collection) {
      fetch(`collections/${collection}.json`)
        .then(res => res.json())
        .then(data => {
          gallery.innerHTML = '';
          description.textContent = data.description || '';

          (data.artworks || data).forEach(art => {
            const wrapper = document.createElement('div');
            wrapper.className = 'art-piece reveal';

            // carousel container
            const carousel = document.createElement('div');
            carousel.className = 'carousel';

            // prev/next buttons (page carousel)
            const prevBtn = document.createElement('button');
            prevBtn.className = 'carousel-prev';
            prevBtn.innerHTML = '&#10094;';
            prevBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const imgs = carousel.querySelectorAll('.carousel-img');
              const active = carousel.querySelector('.carousel-img.active');
              let idx = +active.dataset.index;
              active.classList.remove('active');
              idx = (idx - 1 + imgs.length) % imgs.length;
              imgs[idx].classList.add('active');
            });

            const nextBtn = document.createElement('button');
            nextBtn.className = 'carousel-next';
            nextBtn.innerHTML = '&#10095;';
            nextBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const imgs = carousel.querySelectorAll('.carousel-img');
              const active = carousel.querySelector('.carousel-img.active');
              let idx = +active.dataset.index;
              active.classList.remove('active');
              idx = (idx + 1) % imgs.length;
              imgs[idx].classList.add('active');
            });

            carousel.appendChild(prevBtn);

            // slides
            (art.filenames || []).forEach((fn, idx) => {
              const img = document.createElement('img');
              img.src = `images/${fn}`;
              img.className = 'carousel-img' + (idx === 0 ? ' active' : '');
              img.dataset.index = idx;

              // open modal on click — no inline JS, so apostrophes are safe
              img.addEventListener('click', (ev) => {
                openModal(ev, art.filenames, art.title, art.status, idx, art.details);
              });

              carousel.appendChild(img);
            });

            carousel.appendChild(nextBtn);

            // caption & details
            const cap = document.createElement('p');
            cap.className = 'caption';
            cap.textContent = `"${art.title}" — ${art.status}`;

            const det = document.createElement('p');
            det.className = 'details';
            det.textContent = art.details || '';

            wrapper.appendChild(carousel);
            wrapper.appendChild(cap);
            wrapper.appendChild(det);

            gallery.appendChild(wrapper);
          });

          setupReveals(); /* for animation scroll */

        })
        .catch(() => {
          gallery.innerHTML = '<p style="color: red;">Error loading collection.</p>';
        });
    }




    function nextSlide(btn) {
      const carousel = btn.parentNode;
      const imgs     = carousel.querySelectorAll('.carousel-img');
      let active     = carousel.querySelector('.carousel-img.active');
      let idx        = +active.dataset.index;
      active.classList.remove('active');
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add('active');
    }

    function prevSlide(btn) {
      const carousel = btn.parentNode;
      const imgs     = carousel.querySelectorAll('.carousel-img');
      let active     = carousel.querySelector('.carousel-img.active');
      let idx        = +active.dataset.index;
      active.classList.remove('active');
      idx = (idx - 1 + imgs.length) % imgs.length;
      imgs[idx].classList.add('active');
    }


    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        setActiveTab(tab);
        loadCollection(tab.dataset.collection);
      });
    });

    function openModal(event, filenames, title, status, startIndex = 0, details = '') {
      event.stopPropagation();
      modal.style.display = 'flex';

      modal.currentSet = filenames;
      modal.currentIdx = startIndex;

      modalImg.src = `images/${filenames[startIndex]}`;
      formArtTitle.value = title;

      document.getElementById('modal-art-title').textContent = title || '';
      document.getElementById('modal-art-status').textContent = status || '';
      document.getElementById('modal-art-details').textContent = details || '';
    }


    function modalNext() {
      const set = modal.currentSet;
      modal.currentIdx = (modal.currentIdx + 1) % set.length;
      modalImg.src = `images/${set[modal.currentIdx]}`;
    }

    function modalPrev() {
      const set = modal.currentSet;
      modal.currentIdx = (modal.currentIdx - 1 + set.length) % set.length;
      modalImg.src = `images/${set[modal.currentIdx]}`;
    }

    function closeModal(event) {
      const modalContent = document.getElementById('modal-content');

      // Shrink safe zone by adding a buffer box slightly *larger* than modal-content
      const rect = modalContent.getBoundingClientRect();
      const buffer = 10; // pixels of tolerance

      const isInsideSafeZone = (
        event.clientX > rect.left - buffer &&
        event.clientX < rect.right + buffer &&
        event.clientY > rect.top - buffer &&
        event.clientY < rect.bottom + buffer
      );

      if (!isInsideSafeZone) {
        modal.style.display = 'none';
      }
    }

    function handleSubmit(event) {
      event.preventDefault();
      const form = event.target;

      setTimeout(() => {
        form.submit();                     // submit to hidden iframe
        modal.style.display = 'none';      // close zoom modal
        form.reset();                      // reset the form fields
        showToast();                       // show toast message
      }, 100);
    }

    function showToast() {
      const toast = document.getElementById('toast');
      toast.classList.add('show');

      setTimeout(() => {
        toast.classList.remove('show');
      }, 4000); // Show for 4 secs
    }


    loadCollection('all-that-remains');

    document.addEventListener('DOMContentLoaded', () => {
      const modal = document.getElementById('modal');
      if (modal) modal.style.display = 'none';                // force hidden
      if (location.hash === '#modal') history.replaceState(null, '', location.pathname); // clear stray hash
    });

    /* basic scratchpad drawing (safe no-op if canvas not found) */
  (function () {
    const c = document.getElementById('scratchpad') || document.querySelector('canvas.scratchpad');
    if (!c || c.dataset.drawingReady) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    c.dataset.drawingReady = '1';

    function fit() {
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      // preserve CSS size; scale backing store
      c.width = Math.max(1, Math.round(rect.width * dpr));
      c.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    fit(); window.addEventListener('resize', fit);

    let drawing = false, prev = null;
    const pen = { size: 2, color: '#111' };

    function relPos(e) {
      const r = c.getBoundingClientRect();
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function start(e) { drawing = true; prev = relPos(e); e.preventDefault(); }
    function move(e) {
      if (!drawing) return;
      const p = relPos(e);
      ctx.lineWidth = pen.size;
      ctx.lineCap = 'round';
      ctx.strokeStyle = pen.color;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      prev = p;
      e.preventDefault();
    }
    function end() { drawing = false; prev = null; }

    c.addEventListener('mousedown', start);
    c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
  })();

    /* Int whiteboard for fun*/

  /* Interactive whiteboard — responsive + export */
  (function() {
    const canvas = document.getElementById('whiteboard');
    const ctx    = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0, lastY = 0;

    // stroke style
    ctx.strokeStyle = '#eee';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';

    // Resize canvas to fill leftover space responsively (and keep it sharp on retina)
    function resizeCanvas() {
      const wrap = canvas.parentElement; // .sketchpad-wrap
      const dpr = window.devicePixelRatio || 1;

      // Desired display size
      const displayWidth  = wrap.clientWidth;
      const displayHeight = Math.max(300, Math.min(window.innerHeight * 0.6, 700)); // fills vertical space nicely

      // Set the canvas's internal pixel buffer
      canvas.width  = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);

      // And its CSS display size (what the user sees)
      canvas.style.width  = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';

      // Scale the 2D context so 1 unit = 1 CSS pixel
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function pointerDown(e) {
      drawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
    }

    function pointerMove(e) {
      if (!drawing) return;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
      if (e.cancelable) e.preventDefault();
    }

    function pointerUp() {
      drawing = false;
    }

    // Events
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    canvas.addEventListener('mousedown', pointerDown);
    canvas.addEventListener('mousemove', pointerMove);
    window .addEventListener('mouseup',   pointerUp);

    canvas.addEventListener('touchstart', pointerDown, { passive:false });
    canvas.addEventListener('touchmove',  pointerMove, { passive:false });
    window .addEventListener('touchend',  pointerUp);

    // Clear
    document.getElementById('clear-board').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Download PNG
    document.getElementById('download-board').addEventListener('click', () => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'yvon-sketchpad.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // “Send to Yvon” — downloads PNG and opens email draft
    document.getElementById('send-board').addEventListener('click', () => {
      // 1) Download a copy so they can attach
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'yvon-sketchpad.png';
        a.click();
        URL.revokeObjectURL(url);

        // 2) Open mail client (attachments can’t be auto‑added by websites for security)
        const subject = encodeURIComponent('Sketchpad submission');
        const body = encodeURIComponent(
          `Hi Yvon, I drew this in your sketchpad. See attached PNG (downloaded just now).` +
          `Now, send me some thoughts on your art or mine...let's start a conversation`
        );
        window.location.href = `mailto:yvondoesart@gmail.com?subject=${subject}&body=${body}`;
      });
    });

    // Initial size
    resizeCanvas();
  })();


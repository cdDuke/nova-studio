import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createI18n } from './i18n.js';
import { dict } from './lang.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------- Language ---------------- */
const i18n = createI18n({ dict });
const { t } = i18n;

/* ---------------- Smooth scroll ---------------- */
const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduceMotion });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
if (import.meta.env.DEV) window.lenis = lenis;

$$('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const target = id === '#top' || id === '#' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  });
});

/* ---------------- Preloader + intro ---------------- */
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title .line__inner', { yPercent: 110, duration: 1.4, stagger: 0.1 })
    .from('.hero__meta', { y: 20, autoAlpha: 0, duration: 1 }, '-=1.1')
    .from('.hero__bottom > *', { y: 30, autoAlpha: 0, duration: 1, stagger: 0.08 }, '-=0.9')
    .from('.header', { yPercent: -100, duration: 1, clearProps: 'transform' }, '-=1')
    .from('.hero__blob', { scale: 0.4, autoAlpha: 0, duration: 2, ease: 'power3.out' }, 0);
  return tl;
}

function runLoader() {
  const loader = $('.loader');
  const num = $('.loader__num');
  const counter = { v: 0 };

  if (reduceMotion) {
    loader.remove();
    document.body.classList.remove('is-loading');
    lenis.start();
    return;
  }

  const done = () => {
    if (import.meta.env.DEV) window.__loadedAt = performance.now();
    loader.remove();
    document.body.classList.remove('is-loading');
    lenis.start();
    ScrollTrigger.refresh();
  };

  const tl = gsap.timeline();

  tl.to(counter, {
    v: 100,
    duration: 1.4,
    ease: 'power2.inOut',
    onUpdate: () => (num.textContent = Math.round(counter.v)),
  })
    .to('.loader__bar span', { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, 0)
    .to('.loader__count, .loader__bar', { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.in' })
    .to('.loader__panel', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' }, '-=0.2')
    .set('.loader', { background: 'transparent' })
    .set('.loader__panel', { transformOrigin: 'top' })
    .to('.loader__panel', { scaleY: 0, duration: 0.8, ease: 'expo.inOut' })
    .add(intro(), '-=0.5')
    .add(done, '<0.3');
}

// Wait for fonts so text metrics are right before measuring anything
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.race([document.fonts?.ready ?? Promise.resolve(), wait(1000)]).then(runLoader);

/* ---------------- Clock ---------------- */
const clock = $('.clock');
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const tick = () => (clock.textContent = `${fmt.format(new Date())} CET`);
tick();
setInterval(tick, 10_000);

/* ---------------- Header: hide on scroll down ---------------- */
const header = $('.header');
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  if (document.body.classList.contains('menu-open')) return;
  header.classList.toggle('is-hidden', scroll > lastY && scroll > 200);
  lastY = scroll;
});

/* ---------------- Mobile menu ---------------- */
const burger = $('.burger');
const menu = $('#menu');

function openMenu() {
  document.body.classList.add('menu-open');
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', t('menu.close'));
  menu.setAttribute('aria-hidden', 'false');
  header.classList.remove('is-hidden');
  lenis.stop();
}

function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', t('menu.open'));
  menu.setAttribute('aria-hidden', 'true');
  lenis.start();
}

burger.addEventListener('click', () =>
  document.body.classList.contains('menu-open') ? closeMenu() : openMenu()
);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
window.addEventListener('resize', () => window.innerWidth > 860 && closeMenu());

/* ---------------- Custom cursor ---------------- */
if (finePointer) {
  const cursor = $('.cursor');
  const label = $('.cursor__label');
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    gsap.to(cursor, { opacity: 1, duration: 0.3, overwrite: 'auto' });
    xTo(e.clientX);
    yTo(e.clientY);
  });
  document.documentElement.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));

  document.addEventListener('pointerover', (e) => {
    const view = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button');
    cursor.classList.toggle('is-view', !!view);
    cursor.classList.toggle('is-link', !view && !!link);
    if (view) label.textContent = t(`cursor.${view.dataset.cursor}`);
  });
}

/* ---------------- Magnetic elements ---------------- */
if (finePointer && !reduceMotion) {
  $$('.magnetic').forEach((el) => {
    const strength = el.classList.contains('footer__big') ? 0.15 : 0.35;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* ---------------- Marquee (reacts to scroll direction) ---------------- */
const marquee = gsap.to('.marquee__track', {
  xPercent: -50,
  duration: 22,
  ease: 'none',
  repeat: -1,
});

if (!reduceMotion) {
  lenis.on('scroll', ({ velocity }) => {
    const dir = velocity < 0 ? -1 : 1;
    const boost = 1 + Math.min(Math.abs(velocity) / 10, 4);
    gsap.to(marquee, { timeScale: dir * boost, duration: 0.2, overwrite: true });
    gsap.to(marquee, { timeScale: dir, duration: 1, delay: 0.25, overwrite: false });
  });
} else {
  marquee.pause();
}

/* ---------------- Word-by-word reveal ---------------- */
let revealTweens = [];
function setupReveal() {
  revealTweens.forEach((tw) => (tw.scrollTrigger?.kill(), tw.kill()));
  revealTweens = $$('.reveal-words').map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
    return gsap.to(el.querySelectorAll('.word'), {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });
}
setupReveal();

i18n.onChange(() => {
  setupReveal();
  ScrollTrigger.refresh();
});

/* ---------------- Counters ---------------- */
$$('.stat__num').forEach((el) => {
  const target = +el.dataset.count;
  const obj = { v: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () =>
      gsap.to(obj, {
        v: target,
        duration: 2,
        ease: 'power3.out',
        onUpdate: () => (el.textContent = Math.round(obj.v)),
      }),
  });
});

/* ---------------- Section titles fade-up ---------------- */
$$('.section-title, .eyebrow, .footer__title').forEach((el) => {
  gsap.from(el, {
    y: 60,
    autoAlpha: 0,
    duration: 1.2,
    ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

/* ---------------- Responsive scroll scenes ---------------- */
const mm = gsap.matchMedia();

mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
  // Pinned horizontal gallery
  const track = $('.work__track');
  const distance = () => track.scrollWidth - window.innerWidth;

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.work',
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  });

  // Covers drift slightly inside their frame (parallax)
  $$('.card .cover__word').forEach((word) => {
    gsap.fromTo(
      word,
      { xPercent: 20 },
      {
        xPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: word.closest('.card'),
          containerAnimation: tween,
          start: 'left right',
          end: 'right left',
          scrub: true,
        },
      }
    );
  });

  // Stacked process cards shrink as the next one arrives
  const steps = $$('.step');
  steps.slice(0, -1).forEach((step, i) => {
    gsap.to(step, {
      scale: 0.95,
      filter: 'brightness(0.75)',
      ease: 'none',
      scrollTrigger: {
        trigger: steps[i + 1],
        start: 'top bottom',
        end: 'top 30%',
        scrub: true,
      },
    });
  });

  // Big footer word rises
  gsap.from('.footer__logo', {
    yPercent: 40,
    ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
});

mm.add('(max-width: 860px)', () => {
  gsap.from('.card', {
    y: 60,
    autoAlpha: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.work__pin', start: 'top 85%' },
  });
});

/* ---------------- Services hover preview ---------------- */
if (finePointer) {
  const preview = $('.service-preview');
  const inner = $('.service-preview__inner');
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
  const rotTo = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: 'power3' });
  let lastX = 0;

  $('.services__list').addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    rotTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.8));
    lastX = e.clientX;
  });

  $$('.service').forEach((item) => {
    item.addEventListener('pointerenter', () => {
      const idx = +item.dataset.preview - 1;
      inner.style.transform = `translateY(${-idx * 25}%)`;
      gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
    });
  });

  $('.services__list').addEventListener('pointerleave', () =>
    gsap.to(preview, { opacity: 0, scale: 0.6, duration: 0.4, ease: 'power3.out' })
  );
}

/* ---------------- Testimonials slider ---------------- */
{
  const quotes = $$('.quote');
  const count = $('.quotes__count b');
  let current = 0;
  let timer;

  const show = (i) => {
    quotes[current].classList.remove('is-active');
    current = (i + quotes.length) % quotes.length;
    quotes[current].classList.add('is-active');
    count.textContent = String(current + 1).padStart(2, '0');
  };
  const autoplay = () => {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => show(current + 1), 7000);
  };

  $$('.quotes__btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      show(current + +btn.dataset.dir);
      autoplay();
    })
  );

  // swipe on touch devices
  let startX = null;
  const slider = $('.quotes__slider');
  slider.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      show(current + (dx < 0 ? 1 : -1));
      autoplay();
    }
    startX = null;
  });

  autoplay();
}

// Recalculate pins once all images/fonts are in place
window.addEventListener('load', () => ScrollTrigger.refresh());

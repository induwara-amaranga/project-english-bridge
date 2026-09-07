import type { PointerEvent as ReactPointerEvent } from 'react';

// The bubble that expands from wherever a control was pressed. Done in the DOM
// rather than in React state because it is throwaway decoration — re-rendering
// an option button to animate its own press would make every tap a state
// change, and two rapid taps need two overlapping bubbles anyway.
//
// The element it is attached to must carry `className="bubble-host"`, which
// supplies the `position: relative; overflow: hidden` the bubble is clipped by
// (see components.css).
//
// Some controls cannot take that `overflow: hidden` — the roadmap's current
// planet has an orbit ring drawn wider than the planet itself, and hiding
// overflow would cut it in half. Those give the bubble its own clipping layer
// instead: an inset, same-sized `.bubble-layer` child that the bubble is
// appended to, leaving the host free to overflow.

export function bubble(e: ReactPointerEvent<HTMLElement>): void {
  const host = e.currentTarget;
  if (!host) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const layer = host.querySelector<HTMLElement>(':scope > .bubble-layer');
  const target = layer || host;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const span = document.createElement('span');
  span.className = 'bubble';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  span.addEventListener('animationend', () => span.remove());
  target.appendChild(span);
}

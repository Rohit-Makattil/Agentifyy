import { useEffect } from 'react';

function Background() {
  useEffect(() => {
    const container = document.getElementById('bgAnimation');
    if (!container) return;

    const PARTICLE_COUNT = 100;

    // Clear existing content
    container.innerHTML = '';

    // Create gradient orbs in background
    for (let i = 0; i < 5; i++) {
      const orb = document.createElement('div');
      orb.classList.add('orb');
      orb.style.width = `${200 + Math.random() * 300}px`;
      orb.style.height = orb.style.width;
      orb.style.left = `${Math.random() * 100}%`;
      orb.style.top = `${Math.random() * 100}%`;
      orb.style.animationDuration = `${15 + Math.random() * 10}s`;
      orb.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(orb);
    }

    // Create floating particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      const x0 = Math.random() * window.innerWidth + 'px';
      const y0 = Math.random() * window.innerHeight + 'px';
      const x1 = Math.random() * window.innerWidth + 'px';
      const y1 = Math.random() * window.innerHeight + 'px';
      p.style.setProperty('--x0', x0);
      p.style.setProperty('--y0', y0);
      p.style.setProperty('--x1', x1);
      p.style.setProperty('--y1', y1);
      p.style.animationDuration = `${5 + Math.random() * 10}s`;
      p.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(p);
    }
  }, []);

  return <div id="bgAnimation"></div>;
}

export default Background;

import { useEffect } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // Unobserve once revealed for performance
          }
        });
      },
      { threshold: 0.05 }
    );

    const elements = document.querySelectorAll('.reveal, .reveal-3d, .reveal-left, .reveal-scale');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

export function use3DTilt(selector: string = '.tilt-card') {
  useEffect(() => {
    // Disable 3D tilt calculations on mobile touch devices to eliminate scroll stutter
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        window.matchMedia('(pointer: coarse)').matches);

    if (isTouchDevice) return;

    const cards = document.querySelectorAll<HTMLElement>(selector);
    let rafId: number | null = null;

    cards.forEach((card) => {
      let mouseX = 0;
      let mouseY = 0;

      const updateTransform = () => {
        const rect = card.getBoundingClientRect();
        const x = mouseX - rect.left;
        const y = mouseY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
        rafId = null;
      };

      const handleMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) {
          rafId = requestAnimationFrame(updateTransform);
        }
      };

      const handleMouseLeave = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      };

      card.addEventListener('mousemove', handleMouseMove, { passive: true });
      card.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      card.style.transition = 'transform 0.15s ease-out';
      (card as any)._cleanupTilt = () => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      };
    });

    return () => {
      cards.forEach((card) => {
        if ((card as any)._cleanupTilt) {
          (card as any)._cleanupTilt();
        }
      });
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [selector]);
}

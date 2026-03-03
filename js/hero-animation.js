// ===================================
// PlanB Consultancy — Hero Background Animation
// Subtle animated gradient mesh - lightweight, performant
// ===================================

(function () {
    'use strict';

    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W, H, dpr;
    let particles = [];
    let time = 0;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initParticles();
    }

    function initParticles() {
        particles = [];
        const count = Math.min(Math.floor((W * H) / 18000), 40);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.2,
                vy: -Math.random() * 0.3 - 0.05,
                alpha: Math.random() * 0.3 + 0.05,
            });
        }
    }

    function draw() {
        time += 0.003;
        ctx.clearRect(0, 0, W, H);

        // Dark base
        ctx.fillStyle = '#050D1A';
        ctx.fillRect(0, 0, W, H);

        // Animated gradient orbs
        const orbs = [
            { x: W * (0.3 + Math.sin(time * 0.7) * 0.1), y: H * (0.3 + Math.cos(time * 0.5) * 0.1), r: H * 0.5, color: 'rgba(10, 30, 70, 0.5)' },
            { x: W * (0.7 + Math.cos(time * 0.6) * 0.1), y: H * (0.6 + Math.sin(time * 0.4) * 0.1), r: H * 0.45, color: 'rgba(15, 25, 55, 0.4)' },
            { x: W * (0.5 + Math.sin(time * 0.8) * 0.08), y: H * (0.5 + Math.cos(time * 0.3) * 0.08), r: H * 0.35, color: 'rgba(212, 160, 23, 0.03)' },
        ];

        orbs.forEach(orb => {
            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
            grad.addColorStop(0, orb.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        });

        // Particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(212, 160, 23, ${p.alpha * 0.5})`;
            ctx.fill();
        });

        // Subtle gold accent line at bottom
        const lineGrad = ctx.createLinearGradient(0, H - 2, W, H - 2);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, 'rgba(212, 160, 23, 0.15)');
        lineGrad.addColorStop(0.7, 'rgba(212, 160, 23, 0.15)');
        lineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, H - 1, W, 1);

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
})();

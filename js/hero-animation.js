// ===================================
// PlanB Consultancy — Hero Background Animation
// Deep blue gradient with floating particles & geometric shapes
// ===================================

(function () {
    'use strict';

    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W, H, dpr;
    let particles = [];
    let shapes = [];
    let time = 0;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initParticles();
        initShapes();
    }

    function initParticles() {
        particles = [];
        const count = Math.min(Math.floor((W * H) / 15000), 50);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.8 + 0.4,
                vx: (Math.random() - 0.5) * 0.15,
                vy: -Math.random() * 0.25 - 0.03,
                alpha: Math.random() * 0.4 + 0.08,
            });
        }
    }

    function initShapes() {
        shapes = [];
        const shapeCount = Math.min(Math.floor(W / 200), 5);
        for (let i = 0; i < shapeCount; i++) {
            shapes.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 40 + 20,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.005,
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1,
                sides: Math.random() > 0.5 ? 6 : 4,
                alpha: Math.random() * 0.06 + 0.02,
            });
        }
    }

    function drawPolygon(cx, cy, size, sides, rotation) {
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const angle = (i * 2 * Math.PI / sides) + rotation;
            const x = cx + size * Math.cos(angle);
            const y = cy + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    function draw() {
        time += 0.003;
        ctx.clearRect(0, 0, W, H);

        // Deep blue base
        const baseGrad = ctx.createLinearGradient(0, 0, W, H);
        baseGrad.addColorStop(0, '#050D1A');
        baseGrad.addColorStop(0.5, '#0A1628');
        baseGrad.addColorStop(1, '#0D2247');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, W, H);

        // Animated gradient orbs — blue tones
        const orbs = [
            { x: W * (0.3 + Math.sin(time * 0.7) * 0.1), y: H * (0.3 + Math.cos(time * 0.5) * 0.1), r: H * 0.5, color: 'rgba(59, 130, 246, 0.08)' },
            { x: W * (0.7 + Math.cos(time * 0.6) * 0.1), y: H * (0.6 + Math.sin(time * 0.4) * 0.1), r: H * 0.45, color: 'rgba(10, 46, 107, 0.12)' },
            { x: W * (0.5 + Math.sin(time * 0.8) * 0.08), y: H * (0.5 + Math.cos(time * 0.3) * 0.08), r: H * 0.35, color: 'rgba(147, 197, 253, 0.04)' },
        ];

        orbs.forEach(orb => {
            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
            grad.addColorStop(0, orb.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        });

        // Floating geometric shapes
        shapes.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
            s.rotation += s.rotSpeed;
            if (s.x < -60) s.x = W + 60;
            if (s.x > W + 60) s.x = -60;
            if (s.y < -60) s.y = H + 60;
            if (s.y > H + 60) s.y = -60;

            drawPolygon(s.x, s.y, s.size, s.sides, s.rotation);
            ctx.strokeStyle = `rgba(147, 197, 253, ${s.alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Particles — white/light blue dots
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha * 0.6})`;
            ctx.fill();
        });

        // Subtle light blue accent line at bottom
        const lineGrad = ctx.createLinearGradient(0, H - 2, W, H - 2);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, 'rgba(59, 130, 246, 0.2)');
        lineGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.2)');
        lineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, H - 1, W, 1);

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
})();

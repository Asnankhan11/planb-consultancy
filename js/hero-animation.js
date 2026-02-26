// ===================================
// PlanB Consultancy — Hero Canvas Animation
// "From Confusion to Clarity" — 8s cinematic loop
// ===================================

(function () {
    'use strict';

    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Configuration ---
    const CYCLE = 8000; // 8 seconds per loop
    const PRIMARY = '#1E3A8A';
    const GREEN = '#16A34A';
    const WHITE = '#FFFFFF';
    const LIGHT_BLUE = '#3B82F6';

    let W, H, dpr;
    let particles = [];
    let startTime = performance.now();

    // --- Resize handler ---
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initParticles();
    }

    // --- Particles ---
    function initParticles() {
        particles = [];
        const count = Math.min(Math.floor((W * H) / 12000), 60);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 2 + 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.4 - 0.1,
                alpha: Math.random() * 0.4 + 0.1,
            });
        }
    }

    function updateParticles() {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
        });
    }

    function drawParticles(globalAlpha) {
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${p.alpha * globalAlpha})`;
            ctx.fill();
        });
    }

    // --- Easing ---
    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // --- Draw helpers ---
    function drawSilhouette(cx, cy, scale, alpha) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // Head
        ctx.beginPath();
        ctx.arc(0, -55, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,210,230,0.8)';
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.moveTo(-20, -35);
        ctx.lineTo(20, -35);
        ctx.lineTo(25, 30);
        ctx.lineTo(-25, 30);
        ctx.closePath();
        ctx.fillStyle = 'rgba(180,195,220,0.7)';
        ctx.fill();

        // Arms
        ctx.beginPath();
        ctx.moveTo(-20, -30);
        ctx.lineTo(-40, 10);
        ctx.lineTo(-35, 12);
        ctx.lineTo(-16, -25);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(20, -30);
        ctx.lineTo(40, 10);
        ctx.lineTo(35, 12);
        ctx.lineTo(16, -25);
        ctx.closePath();
        ctx.fill();

        // Legs
        ctx.beginPath();
        ctx.moveTo(-15, 30);
        ctx.lineTo(-18, 70);
        ctx.lineTo(-8, 70);
        ctx.lineTo(-8, 30);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(15, 30);
        ctx.lineTo(18, 70);
        ctx.lineTo(8, 70);
        ctx.lineTo(8, 30);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function drawDocument(x, y, w, h, label, rotation, alpha, glowColor) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.globalAlpha = alpha;

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // Card background
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        roundRect(ctx, -w / 2, -h / 2, w, h, 6);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Top colored strip
        if (glowColor) {
            ctx.fillStyle = glowColor;
            roundRectTop(ctx, -w / 2, -h / 2, w, 6, 6);
            ctx.fill();
        }

        // Lines (text placeholder)
        ctx.fillStyle = 'rgba(30,58,138,0.15)';
        const lineY = -h / 2 + 16;
        for (let i = 0; i < 3; i++) {
            const lw = w * (i === 0 ? 0.7 : i === 1 ? 0.5 : 0.6);
            ctx.fillRect(-w / 2 + 8, lineY + i * 10, lw, 3);
        }

        // Label text
        if (label) {
            ctx.fillStyle = 'rgba(30,58,138,0.65)';
            ctx.font = `500 ${Math.max(9, w * 0.12)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 0, h / 2 - 12);
        }

        ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function roundRectTop(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // --- Draw process step pill ---
    function drawStepPill(x, y, label, index, progress, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;

        const pillW = Math.min(180, W * 0.22);
        const pillH = 36;
        const radius = pillH / 2;

        // Background
        ctx.fillStyle = progress > 0.5 ? 'rgba(22,163,74,0.12)' : 'rgba(30,58,138,0.06)';
        roundRect(ctx, x - pillW / 2, y - pillH / 2, pillW, pillH, radius);
        ctx.fill();

        // Border
        ctx.strokeStyle = progress > 0.5 ? 'rgba(22,163,74,0.4)' : 'rgba(30,58,138,0.15)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x - pillW / 2, y - pillH / 2, pillW, pillH, radius);
        ctx.stroke();

        // Step number circle
        const circleR = 12;
        const circleX = x - pillW / 2 + 22;
        ctx.beginPath();
        ctx.arc(circleX, y, circleR, 0, Math.PI * 2);
        ctx.fillStyle = progress > 0.5 ? GREEN : PRIMARY;
        ctx.fill();

        ctx.fillStyle = WHITE;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), circleX, y + 1);

        // Label
        ctx.fillStyle = progress > 0.5 ? '#15803D' : '#1E293B';
        ctx.font = '500 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, circleX + 18, y + 1);

        // Checkmark if fully progressed
        if (progress > 0.9) {
            const checkX = x + pillW / 2 - 18;
            ctx.fillStyle = GREEN;
            ctx.font = '600 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✓', checkX, y + 1);
        }

        ctx.restore();
    }

    // --- Connection line ---
    function drawConnectionLine(x1, y1, x2, y2, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = LIGHT_BLUE;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // --- Green checkmark ---
    function drawCheckmark(cx, cy, size, alpha) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = alpha;

        // Circle background
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(22,163,74,0.12)';
        ctx.fill();
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Checkmark
        ctx.beginPath();
        ctx.moveTo(-size * 0.35, size * 0.05);
        ctx.lineTo(-size * 0.05, size * 0.35);
        ctx.lineTo(size * 0.4, -size * 0.25);
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.restore();
    }

    // --- Top soft light ---
    function drawTopLight(alpha) {
        const grad = ctx.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H * 0.7);
        grad.addColorStop(0, `rgba(59,130,246,${0.08 * alpha})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // --- Green flow glow ---
    function drawGreenFlow(y, progress, alpha) {
        if (progress <= 0 || alpha <= 0) return;
        const grad = ctx.createLinearGradient(W * 0.3, y - 20, W * 0.3, y + progress * H * 0.35);
        grad.addColorStop(0, `rgba(22,163,74,${0.06 * alpha})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(W * 0.25, y - 20, W * 0.5, progress * H * 0.35 + 40);
    }

    // --- Main animation frame ---
    function draw(timestamp) {
        const elapsed = (timestamp - startTime) % CYCLE;
        const t = elapsed / CYCLE; // 0..1

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = PRIMARY;
        ctx.fillRect(0, 0, W, H);

        // Subtle gradient overlay
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, 'rgba(23,37,84,0.6)');
        bgGrad.addColorStop(1, 'rgba(30,58,138,0.3)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Top light
        drawTopLight(1);

        // Update particles
        updateParticles();
        drawParticles(0.6);

        // Scene timing (normalized 0..1 within each scene)
        const scene1 = Math.max(0, Math.min(1, t / 0.25));         // 0-25%
        const scene2 = Math.max(0, Math.min(1, (t - 0.25) / 0.25)); // 25-50%
        const scene3 = Math.max(0, Math.min(1, (t - 0.50) / 0.25)); // 50-75%
        const scene4 = Math.max(0, Math.min(1, (t - 0.75) / 0.25)); // 75-100%

        const cx = W / 2;
        const cy = H / 2;

        // Responsive sizing
        const baseScale = Math.min(W, H) / 600;
        const docW = Math.max(55, 70 * baseScale);
        const docH = Math.max(70, 90 * baseScale);

        // --- Document positions ---
        const docs = [
            { label: 'Resume', color: '#3B82F6' },
            { label: 'Aadhaar ID', color: '#8B5CF6' },
            { label: 'Application', color: '#F59E0B' },
            { label: 'Brochure', color: '#10B981' },
        ];

        // Scattered positions (Scene 1)
        const scattered = [
            { x: cx - 80 * baseScale, y: cy - 30 * baseScale, r: -0.15 },
            { x: cx + 70 * baseScale, y: cy - 50 * baseScale, r: 0.12 },
            { x: cx - 60 * baseScale, y: cy + 60 * baseScale, r: 0.18 },
            { x: cx + 90 * baseScale, y: cy + 40 * baseScale, r: -0.1 },
        ];

        // Organized positions (Scene 2+)
        const organized = [
            { x: cx - 90 * baseScale, y: cy - 50 * baseScale, r: 0 },
            { x: cx + 90 * baseScale, y: cy - 50 * baseScale, r: 0 },
            { x: cx - 90 * baseScale, y: cy + 50 * baseScale, r: 0 },
            { x: cx + 90 * baseScale, y: cy + 50 * baseScale, r: 0 },
        ];

        // Aligned positions (Scene 4)
        const aligned = [
            { x: cx - 100 * baseScale, y: cy - 20 * baseScale, r: 0 },
            { x: cx - 34 * baseScale, y: cy - 20 * baseScale, r: 0 },
            { x: cx + 34 * baseScale, y: cy - 20 * baseScale, r: 0 },
            { x: cx + 100 * baseScale, y: cy - 20 * baseScale, r: 0 },
        ];

        // --- SCENE 1: Silhouette + scattered docs ---
        if (scene1 > 0) {
            const s1Alpha = scene2 > 0 ? Math.max(0, 1 - scene2) : easeOut(scene1);
            drawSilhouette(cx, cy - 10 * baseScale, baseScale * 0.9, s1Alpha * 0.6);

            docs.forEach((doc, i) => {
                const float = Math.sin(timestamp / 1200 + i * 1.5) * 5;
                const pos = scattered[i];
                drawDocument(
                    pos.x, pos.y + float,
                    docW, docH,
                    doc.label,
                    pos.r,
                    s1Alpha * easeOut(Math.min(1, scene1 * 2 - i * 0.15)),
                    doc.color
                );
            });
        }

        // --- SCENE 2: Documents separate and hover with glow lines ---
        if (scene2 > 0 && scene3 < 1) {
            const s2Alpha = scene3 > 0 ? Math.max(0, 1 - scene3) : easeOut(scene2);
            const s2t = easeInOut(scene2);

            docs.forEach((doc, i) => {
                const from = scattered[i];
                const to = organized[i];
                const x = from.x + (to.x - from.x) * s2t;
                const y = from.y + (to.y - from.y) * s2t;
                const r = from.r * (1 - s2t);
                const float = Math.sin(timestamp / 1000 + i) * 4;

                drawDocument(x, y + float, docW, docH, doc.label, r, s2Alpha, doc.color);

                // Connection lines
                if (scene2 > 0.3) {
                    const lineAlpha = s2Alpha * easeOut(Math.min(1, (scene2 - 0.3) / 0.4));
                    if (i < docs.length - 1) {
                        const nextTo = organized[i + 1];
                        const nx = from.x + (nextTo.x - from.x) * s2t;
                        const ny = from.y + (nextTo.y - from.y) * s2t;
                        drawConnectionLine(x, y, nx, ny, lineAlpha);
                    }
                }
            });
        }

        // --- SCENE 3: Process steps with green flow ---
        if (scene3 > 0 && scene4 < 1) {
            const s3Alpha = scene4 > 0 ? Math.max(0, 1 - scene4 * 1.5) : easeOut(scene3);
            const steps = ['Fill Application', 'Verification', 'Processing', 'Confirmation'];
            const stepsStartY = cy - 65 * baseScale;
            const stepGap = 46 * baseScale;

            // Green flow
            const flowProgress = easeOut(Math.min(1, scene3 * 1.3));
            drawGreenFlow(stepsStartY, flowProgress, s3Alpha);

            steps.forEach((label, i) => {
                const delay = i * 0.2;
                const stepT = Math.max(0, Math.min(1, (scene3 - delay) / 0.4));
                if (stepT > 0) {
                    const stepProgress = Math.max(0, Math.min(1, (scene3 - delay - 0.1) / 0.5));
                    const yOff = (1 - easeOut(stepT)) * 15;
                    drawStepPill(
                        cx,
                        stepsStartY + i * stepGap + yOff,
                        label,
                        i,
                        stepProgress,
                        s3Alpha * easeOut(stepT)
                    );
                }
            });
        }

        // --- SCENE 4: Documents align + checkmark + branding ---
        if (scene4 > 0) {
            const s4t = easeInOut(Math.min(1, scene4 * 1.2));
            const s4Alpha = easeOut(Math.min(1, scene4 * 1.5));

            // Fade to a slightly lighter blue bg
            ctx.fillStyle = `rgba(23,37,84,${s4Alpha * 0.15})`;
            ctx.fillRect(0, 0, W, H);

            docs.forEach((doc, i) => {
                const from = organized[i];
                const to = aligned[i];
                const x = from.x + (to.x - from.x) * s4t;
                const y = from.y + (to.y - from.y) * s4t;

                drawDocument(x, y, docW * 0.85, docH * 0.85, doc.label, 0, s4Alpha, doc.color);
            });

            // Green checkmark
            if (scene4 > 0.3) {
                const checkAlpha = easeOut(Math.min(1, (scene4 - 0.3) / 0.3));
                drawCheckmark(cx, cy + 40 * baseScale, 22 * baseScale, checkAlpha * s4Alpha);
            }

            // Branding text
            if (scene4 > 0.4) {
                const textAlpha = easeOut(Math.min(1, (scene4 - 0.4) / 0.3));
                ctx.save();
                ctx.globalAlpha = textAlpha * s4Alpha;

                ctx.fillStyle = WHITE;
                ctx.font = `700 ${Math.max(18, 24 * baseScale)}px Poppins, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('PlanB Consultancy', cx, cy + 80 * baseScale);

                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = `400 ${Math.max(11, 13 * baseScale)}px Inter, sans-serif`;
                ctx.fillText('We Guide You Step by Step', cx, cy + 104 * baseScale);

                ctx.restore();
            }
        }

        requestAnimationFrame(draw);
    }

    // --- Init ---
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);

})();

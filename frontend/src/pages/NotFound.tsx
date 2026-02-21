import React, { useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './NotFound.css';

const NotFound: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sparksRef = useRef<HTMLDivElement>(null);
    const illusRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isLoading } = useAuth();

    let dashboardLink = '/';
    let dashboardText = 'Return to Homepage';

    if (isLoading) {
        dashboardText = 'Loading...';
        dashboardLink = '#';
    } else if (isAuthenticated && user) {
        dashboardText = 'Return to Dashboard';
        if (user.Role === 'exam_admin') {
            dashboardLink = '/admin';
        } else if (user.Role === 'invigilator') {
            dashboardLink = '/invigilator/dashboard';
        } else if (user.Role === 'student') {
            dashboardLink = '/student/dashboard';
        }
    } else {
        dashboardText = 'Go to Login';
        const currentPath = location.pathname.toLowerCase();
        if (currentPath.startsWith('/admin')) {
            dashboardLink = '/admin/login';
        } else if (currentPath.startsWith('/invigilator')) {
            dashboardLink = '/invigilator/login';
        } else if (currentPath.startsWith('/student')) {
            dashboardLink = '/student/login';
        } else {
            dashboardLink = '/';
            dashboardText = 'Return to Homepage';
        }
    }

    const handleGoBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(dashboardLink, { replace: true });
        }
    };

    useEffect(() => {
        // 1. Stars Animation
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animFrame: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Check if the canvas exists in the DOM
        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            if (canvas) {
                canvas.width = width;
                canvas.height = height;
            }
        };
        resize();
        window.addEventListener('resize', resize);

        const stars = Array.from({ length: 220 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.4 + 0.2,
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.7,
            color: ['rgba(200,220,255,', 'rgba(180,200,255,', 'rgba(220,240,255,'][Math.floor(Math.random() * 3)]
        }));

        const shoots: any[] = [];
        const spawnShoot = () => {
            shoots.push({
                x: Math.random() * width * 0.6,
                y: Math.random() * height * 0.4,
                len: 70 + Math.random() * 80,
                life: 1,
                speed: 7 + Math.random() * 5,
                angle: Math.PI * 0.2 + Math.random() * 0.15
            });
        };

        const intervalId = setInterval(spawnShoot, 2500);
        spawnShoot();

        const draw = (t: number) => {
            ctx.clearRect(0, 0, width, height);
            stars.forEach(s => {
                const op = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = s.color + op + ')';
                ctx.fill();
                if (s.r > 1.1) {
                    ctx.strokeStyle = s.color + (op * 0.35) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(s.x - 6, s.y); ctx.lineTo(s.x + 6, s.y); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(s.x, s.y - 6); ctx.lineTo(s.x, s.y + 6); ctx.stroke();
                }
            });
            for (let i = shoots.length - 1; i >= 0; i--) {
                const s = shoots[i];
                const ex = s.x + Math.cos(s.angle) * s.len;
                const ey = s.y + Math.sin(s.angle) * s.len;
                const g = ctx.createLinearGradient(s.x, s.y, ex, ey);
                g.addColorStop(0, `rgba(255,255,255,${s.life})`);
                g.addColorStop(0.4, `rgba(120,180,255,${s.life * 0.6})`);
                g.addColorStop(1, 'transparent');
                ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ex, ey);
                ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
                s.x += Math.cos(s.angle) * s.speed;
                s.y += Math.sin(s.angle) * s.speed;
                s.life -= 0.025;
                if (s.life <= 0) shoots.splice(i, 1);
            }
        };

        const loop = (ts: number) => {
            draw(ts * 0.001);
            animFrame = requestAnimationFrame(loop);
        };
        animFrame = requestAnimationFrame(loop);

        // 2. Sparks
        const sparksEl = sparksRef.current;
        if (sparksEl) {
            sparksEl.innerHTML = ''; // Clear in case of re-mount
            const SC = ['var(--nf-cyan)', 'var(--nf-violet)', 'var(--nf-pink)', 'var(--nf-amber)', '#fff'];
            for (let i = 0; i < 18; i++) {
                const s = document.createElement('div');
                s.className = 'nf-spark';
                const angle = Math.random() * 360;
                const dist = 90 + Math.random() * 60;
                const rad = angle * Math.PI / 180;
                s.style.left = (50 + Math.cos(rad) * (dist / 2) + Math.random() * 20 - 10) + '%';
                s.style.top = (50 + Math.sin(rad) * (dist / 2) + Math.random() * 20 - 10) + '%';
                s.style.background = SC[Math.floor(Math.random() * SC.length)];
                s.style.setProperty('--dx', ((Math.random() - 0.5) * 60) + 'px');
                s.style.width = s.style.height = (2 + Math.random() * 4) + 'px';
                s.style.animationDuration = (2 + Math.random() * 4) + 's';
                s.style.animationDelay = (Math.random() * 4) + 's';
                sparksEl.appendChild(s);
            }
        }

        // 3. Parallax
        const handleMouseMove = (e: MouseEvent) => {
            if (!illusRef.current) return;
            const dx = (e.clientX / window.innerWidth - 0.5) * 18;
            const dy = (e.clientY / window.innerHeight - 0.5) * 10;
            illusRef.current.style.transform = `translate(${dx}px,${dy}px)`;
        };
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('resize', resize);
            clearInterval(intervalId);
            cancelAnimationFrame(animFrame);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="nf-wrapper">
            <div className="nf-bg-wrap">
                <canvas id="nf-stars" ref={canvasRef}></canvas>
                <div className="nf-nebula"></div>
            </div>

            <div className="nf-logo">
                <div className="nf-logo-box">S</div>
                Seat Sync
            </div>

            <div className="nf-page">
                <div className="nf-illustration" id="nf-illus" ref={illusRef}>
                    <div className="nf-tether"></div>
                    <div className="nf-ring-wrap"><div className="nf-ring"></div></div>
                    <div className="nf-sparks" id="nf-sparks" ref={sparksRef}></div>

                    <div className="nf-planet-wrap">
                        <div className="nf-planet">
                            <div className="nf-planet-marks"></div>
                            <div className="nf-planet-shimmer"></div>
                        </div>
                    </div>

                    <div className="nf-astronaut">
                        <div className="nf-astro-arm-l"></div>
                        <div className="nf-astro-arm-r"></div>
                        <div className="nf-astro-body">
                            <div className="nf-astro-helmet"></div>
                            <div className="nf-astro-visor"></div>
                            <div className="nf-astro-pack"></div>
                        </div>
                        <div className="nf-astro-leg-l"></div>
                        <div className="nf-astro-leg-r"></div>
                    </div>

                    <div className="nf-moon"></div>

                    <div className="nf-sat nf-sat1">
                        <svg viewBox="0 0 34 34" fill="none">
                            <rect x="13" y="11" width="8" height="12" rx="2" fill="#94a3ff" stroke="#c4d0ff" strokeWidth="1" />
                            <rect x="1" y="14" width="12" height="6" rx="1" fill="#3d5af1" opacity=".8" />
                            <rect x="21" y="14" width="12" height="6" rx="1" fill="#3d5af1" opacity=".8" />
                            <circle cx="17" cy="17" r="3" fill="#22d3ee" opacity=".9" />
                        </svg>
                    </div>
                    <div className="nf-sat nf-sat2">
                        <svg viewBox="0 0 26 26" fill="none">
                            <rect x="9" y="8" width="8" height="10" rx="2" fill="#c4b5fd" stroke="#e9d5ff" strokeWidth="1" />
                            <rect x="0" y="10" width="9" height="6" rx="1" fill="#8b5cf6" opacity=".8" />
                            <rect x="17" y="10" width="9" height="6" rx="1" fill="#8b5cf6" opacity=".8" />
                            <circle cx="13" cy="13" r="2.5" fill="#f472b6" opacity=".9" />
                        </svg>
                    </div>
                </div>

                <div className="nf-content">
                    <p className="nf-eyebrow">Error 404 — Page Unoccupied</p>

                    <div className="nf-code-404">
                        <span className="nf-n4">4</span><span className="nf-n0">0</span><span className="nf-n4">4</span>
                    </div>

                    <h1 className="nf-headline">This page is on<br />study leave.</h1>

                    <p className="nf-sub">
                        It's not lost — it just doesn't exist yet.<br />
                        Head back and find where you truly belong.
                    </p>

                    <div className="nf-pills">
                        <div className="nf-pill nf-pill-ok"><span className="nf-dot"></span>ERP Server Online</div>
                        <div className="nf-pill nf-pill-ok"><span className="nf-dot"></span>Database Connected</div>
                        <div className="nf-pill nf-pill-warn"><span className="nf-dot"></span>Route Not Found</div>
                    </div>

                    <div className="nf-btns">
                        <Link to={dashboardLink} className="nf-btn nf-btn-p">&#8592; {dashboardText}</Link>
                        <button className="nf-btn nf-btn-s" onClick={handleGoBack}>Go Back</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;

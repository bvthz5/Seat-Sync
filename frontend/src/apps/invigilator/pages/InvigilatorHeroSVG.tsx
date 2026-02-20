import React from 'react';

export const InvigilatorHeroSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="100%" height="100%" className="w-full h-full max-w-[550px] max-h-[650px] drop-shadow-2xl">
        <defs>
            {/* Background gradient */}
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#0a0e27', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#1a1040', stopOpacity: 1 }} />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>

            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>

            <filter id="eyeGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>

            {/* Scan line pattern */}
            <pattern id="scanLines" width="2" height="4" patternUnits="userSpaceOnUse">
                <rect width="2" height="1" fill="rgba(255,255,255,0.03)" />
            </pattern>

            {/* Eye iris gradient */}
            <radialGradient id="irisGrad" cx="50%" cy="40%" r="50%">
                <stop offset="0%" style={{ stopColor: '#00f5ff' }} />
                <stop offset="50%" style={{ stopColor: '#0080ff' }} />
                <stop offset="100%" style={{ stopColor: '#0020aa' }} />
            </radialGradient>

            {/* Skin gradient */}
            <radialGradient id="skinGrad" cx="45%" cy="35%" r="60%">
                <stop offset="0%" style={{ stopColor: '#f5c89a' }} />
                <stop offset="100%" style={{ stopColor: '#d4915c' }} />
            </radialGradient>

            {/* Robe gradient */}
            <linearGradient id="robeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#1e2a5e' }} />
                <stop offset="100%" style={{ stopColor: '#0a1233' }} />
            </linearGradient>

            {/* Gold accent */}
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#b8860b' }} />
                <stop offset="50%" style={{ stopColor: '#ffd700' }} />
                <stop offset="100%" style={{ stopColor: '#b8860b' }} />
            </linearGradient>

            {/* Clipboard gradient */}
            <linearGradient id="clipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#e8d5b0' }} />
                <stop offset="100%" style={{ stopColor: '#c8b08a' }} />
            </linearGradient>

            {/* Aura gradient */}
            <radialGradient id="auraGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#00f5ff', stopOpacity: 0.15 }} />
                <stop offset="100%" style={{ stopColor: '#00f5ff', stopOpacity: 0 }} />
            </radialGradient>

            {/* Particle glow */}
            <radialGradient id="particleGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.9 }} />
                <stop offset="100%" style={{ stopColor: '#00f5ff', stopOpacity: 0 }} />
            </radialGradient>

            <style>
                {`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes orbit {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes blink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.05); }
          }
          @keyframes scanMove {
            0% { transform: translateY(0px); opacity: 0.7; }
            50% { opacity: 1; }
            100% { transform: translateY(300px); opacity: 0; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes textFlicker {
            0%,100% { opacity: 1; }
            92% { opacity: 1; }
            93% { opacity: 0.3; }
            94% { opacity: 1; }
          }
          @keyframes particleDrift {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-60px) translateX(20px); opacity: 0; }
          }

          .figure-group {
            animation: float 4s ease-in-out infinite;
            transform-origin: 250px 500px;
          }
          .eye-group {
            animation: blink 5s ease-in-out infinite;
            transform-origin: 50% 50%;
          }
          .scan-line {
            animation: scanMove 3s linear infinite;
          }
          .pulse-ring {
            animation: pulse 2.5s ease-in-out infinite;
          }
          .orbit-ring {
            transform-origin: 250px 200px;
          }
          .orbit-1 { animation: orbit 8s linear infinite; }
          .orbit-2 { animation: orbit 12s linear infinite reverse; }
          .aura-glow { animation: pulse 3s ease-in-out infinite; }
          .code-text { animation: textFlicker 4s linear infinite; font-family: monospace; }
          .particle { animation: particleDrift 4s ease-out infinite; }
          .particle:nth-child(2) { animation-delay: 1s; }
          .particle:nth-child(3) { animation-delay: 2s; }
          .particle:nth-child(4) { animation-delay: 3s; }
        `}
            </style>
        </defs>

        {/* Background */}
        <rect width="500" height="600" fill="url(#bgGrad)" rx="24" />
        <rect width="500" height="600" fill="url(#scanLines)" opacity="0.4" rx="24" />

        {/* Subtle grid lines */}
        <g stroke="#1a2a6e" strokeWidth="0.5" opacity="0.4">
            <line x1="0" y1="100" x2="500" y2="100" />
            <line x1="0" y1="200" x2="500" y2="200" />
            <line x1="0" y1="300" x2="500" y2="300" />
            <line x1="0" y1="400" x2="500" y2="400" />
            <line x1="0" y1="500" x2="500" y2="500" />
            <line x1="100" y1="0" x2="100" y2="600" />
            <line x1="200" y1="0" x2="200" y2="600" />
            <line x1="300" y1="0" x2="300" y2="600" />
            <line x1="400" y1="0" x2="400" y2="600" />
        </g>

        {/* Corner decorations */}
        <g stroke="#00f5ff" strokeWidth="1.5" fill="none" opacity="0.5">
            <polyline points="20,20 20,45 45,45" />
            <polyline points="480,20 480,45 455,45" />
            <polyline points="20,580 20,555 45,555" />
            <polyline points="480,580 480,555 455,555" />
        </g>

        {/* Outer aura */}
        <ellipse cx="250" cy="240" rx="170" ry="200" fill="url(#auraGrad)" className="aura-glow" />

        {/* Orbit rings */}
        <g className="orbit-ring orbit-1">
            <ellipse cx="250" cy="210" rx="155" ry="40" fill="none" stroke="#00f5ff" strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />
            {/* Orbiting dot */}
            <circle cx="405" cy="210" r="4" fill="#00f5ff" filter="url(#glow)" opacity="0.9" />
        </g>
        <g className="orbit-ring orbit-2">
            <ellipse cx="250" cy="210" rx="130" ry="30" fill="none" stroke="#ffd700" strokeWidth="0.8" strokeDasharray="4,6" opacity="0.3" />
            <circle cx="120" cy="210" r="3" fill="#ffd700" filter="url(#glow)" opacity="0.8" />
        </g>

        {/* Main figure group with float animation */}
        <g className="figure-group">

            {/* Shadow on ground */}
            <ellipse cx="250" cy="540" rx="80" ry="12" fill="#000" opacity="0.35" />

            {/* ROBE / BODY */}
            {/* Graduation gown */}
            <path d="M160 380 Q150 420 140 520 L360 520 Q350 420 340 380 Q295 410 250 410 Q205 410 160 380Z" fill="url(#robeGrad)" stroke="#2a3a7e" strokeWidth="1" />
            {/* Robe trim gold */}
            <path d="M160 380 Q205 410 250 410 Q295 410 340 380" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />
            {/* Center stripe */}
            <line x1="250" y1="410" x2="250" y2="520" stroke="url(#goldGrad)" strokeWidth="2.5" />
            {/* Sleeve left */}
            <path d="M185 360 Q155 370 140 410 Q155 415 175 405 Q170 395 185 385Z" fill="url(#robeGrad)" stroke="#2a3a7e" strokeWidth="1" />
            {/* Sleeve right */}
            <path d="M315 360 Q345 370 360 410 Q345 415 325 405 Q330 395 315 385Z" fill="url(#robeGrad)" stroke="#2a3a7e" strokeWidth="1" />

            {/* Graduation cap */}
            <rect x="205" y="148" width="90" height="8" rx="2" fill="#1a1a3e" />
            <path d="M205 148 L250 130 L295 148Z" fill="#1a1a3e" />
            {/* Cap top board */}
            <rect x="190" y="140" width="120" height="12" rx="2" fill="#111133" />
            {/* Tassel */}
            <line x1="295" y1="146" x2="310" y2="170" stroke="#ffd700" strokeWidth="2" />
            <circle cx="310" cy="172" r="4" fill="#ffd700" />
            <line x1="310" y1="176" x2="308" y2="192" stroke="#ffd700" strokeWidth="1.5" />
            <line x1="310" y1="176" x2="312" y2="192" stroke="#ffd700" strokeWidth="1.5" />
            <line x1="310" y1="176" x2="306" y2="193" stroke="#ffd700" strokeWidth="1.5" />

            {/* NECK */}
            <rect x="237" y="280" width="26" height="35" rx="8" fill="url(#skinGrad)" />

            {/* Collar / white shirt */}
            <path d="M220 310 Q237 295 250 298 Q263 295 280 310 L285 330 Q250 340 215 330Z" fill="#e8e8f0" />
            <path d="M250 298 L245 315 L250 320 L255 315Z" fill="#c0c0d0" />
            {/* Tie / bow tie */}
            <path d="M244 310 L250 320 L256 310 Q250 305 244 310Z" fill="#cc0022" />
            <rect x="248" y="320" width="4" height="10" fill="#990011" />

            {/* HEAD */}
            <ellipse cx="250" cy="230" rx="62" ry="72" fill="url(#skinGrad)" />

            {/* Hair */}
            <path d="M188 220 Q190 155 250 152 Q310 155 312 220 Q305 200 296 190 Q280 172 250 170 Q220 172 204 190 Q194 200 188 220Z" fill="#2a1a0a" />

            {/* EAR left */}
            <ellipse cx="188" cy="235" rx="10" ry="14" fill="#d4915c" />
            <ellipse cx="189" cy="235" rx="6" ry="9" fill="#c07840" />

            {/* EAR right */}
            <ellipse cx="312" cy="235" rx="10" ry="14" fill="#d4915c" />
            <ellipse cx="311" cy="235" rx="6" ry="9" fill="#c07840" />

            {/* Glasses frame */}
            <rect x="206" y="220" width="36" height="24" rx="8" fill="none" stroke="#222" strokeWidth="2.5" />
            <rect x="258" y="220" width="36" height="24" rx="8" fill="none" stroke="#222" strokeWidth="2.5" />
            <line x1="242" y1="232" x2="258" y2="232" stroke="#222" strokeWidth="2" />
            {/* Temples */}
            <line x1="206" y1="232" x2="190" y2="235" stroke="#222" strokeWidth="2" />
            <line x1="294" y1="232" x2="310" y2="235" stroke="#222" strokeWidth="2" />

            {/* Glowing eyes behind glasses */}
            {/* Left eye */}
            <g className="eye-group" style={{ transformOrigin: '224px 232px' }}>
                <ellipse cx="224" cy="232" rx="14" ry="9" fill="#001a40" />
                <circle cx="224" cy="232" r="7" fill="url(#irisGrad)" filter="url(#eyeGlow)" />
                <circle cx="224" cy="232" r="3" fill="#000a20" />
                <circle cx="226" cy="229" r="2" fill="white" opacity="0.8" />
            </g>
            {/* Right eye */}
            <g className="eye-group" style={{ transformOrigin: '276px 232px' }}>
                <ellipse cx="276" cy="232" rx="14" ry="9" fill="#001a40" />
                <circle cx="276" cy="232" r="7" fill="url(#irisGrad)" filter="url(#eyeGlow)" />
                <circle cx="276" cy="232" r="3" fill="#000a20" />
                <circle cx="278" cy="229" r="2" fill="white" opacity="0.8" />
            </g>

            {/* Eyebrows */}
            <path d="M210 218 Q224 212 238 217" stroke="#3a2010" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M262 217 Q276 212 290 218" stroke="#3a2010" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Nose */}
            <path d="M248 240 Q244 255 248 262 Q254 262 258 255 Q260 248 256 240" stroke="#c07840" strokeWidth="1.2" fill="none" />

            {/* Mouth - subtle stern expression */}
            <path d="M236 274 Q250 270 264 274" stroke="#a05830" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* CLIPBOARD in left hand */}
            <g transform="translate(112 380) rotate(-10)">
                <rect x="0" y="0" width="60" height="78" rx="3" fill="url(#clipGrad)" stroke="#8a6030" strokeWidth="1.5" />
                <rect x="20" y="-6" width="20" height="12" rx="3" fill="#8a6030" />
                {/* Lines on clipboard */}
                <line x1="8" y1="20" x2="52" y2="20" stroke="#8a6030" strokeWidth="1.5" opacity="0.7" />
                <line x1="8" y1="30" x2="52" y2="30" stroke="#8a6030" strokeWidth="1.5" opacity="0.7" />
                <line x1="8" y1="40" x2="40" y2="40" stroke="#8a6030" strokeWidth="1.5" opacity="0.7" />
                <line x1="8" y1="50" x2="45" y2="50" stroke="#8a6030" strokeWidth="1.5" opacity="0.7" />
                <line x1="8" y1="60" x2="35" y2="60" stroke="#8a6030" strokeWidth="1.5" opacity="0.7" />
                {/* Check marks */}
                <path d="M44 27 L48 31 L55 22" stroke="#2a6a2a" strokeWidth="2" fill="none" />
            </g>

            {/* Hand holding clipboard */}
            <ellipse cx="143" cy="460" rx="16" ry="10" fill="url(#skinGrad)" transform="rotate(-10 143 460)" />

            {/* PEN in right hand */}
            <g transform="translate(335 410) rotate(25)">
                <rect x="0" y="0" width="8" height="55" rx="3" fill="#1a1a6e" />
                <polygon points="4,55 0,65 8,65" fill="#c0c0c0" />
                <rect x="0" y="0" width="8" height="8" rx="2" fill="#ffd700" />
            </g>

            {/* Right hand */}
            <ellipse cx="345" cy="455" rx="14" ry="9" fill="url(#skinGrad)" transform="rotate(25 345 455)" />

            {/* SCANNING BEAM from eyes */}
            <line x1="224" y1="241" x2="100" y2="300" stroke="#00f5ff" strokeWidth="1.5" opacity="0.3" className="pulse-ring" />
            <line x1="276" y1="241" x2="400" y2="300" stroke="#00f5ff" strokeWidth="1.5" opacity="0.3" className="pulse-ring" />

        </g>
        {/* end figure group */}

        {/* Floating HUD elements */}
        {/* Left data panel */}
        <g opacity="0.75">
            <rect x="18" y="200" width="85" height="110" rx="4" fill="rgba(0,20,60,0.7)" stroke="#00f5ff" strokeWidth="0.8" />
            <text x="26" y="218" fill="#00f5ff" fontSize="7" className="code-text">MONITORING</text>
            <text x="26" y="232" fill="#aaf" fontSize="6">CANDIDATE: 42</text>
            <text x="26" y="244" fill="#aaf" fontSize="6">STATUS: ACTIVE</text>
            <text x="26" y="256" fill="#0f0" fontSize="6">EYE TRACK: ON</text>
            <text x="26" y="268" fill="#0f0" fontSize="6">FOCUS: 97%</text>
            <text x="26" y="280" fill="#ff4" fontSize="6">ALERTS: 0</text>
            <text x="26" y="292" fill="#aaf" fontSize="6">TIME: 01:23:47</text>
            <rect x="26" y="298" width="65" height="4" rx="2" fill="#0a1a40" />
            <rect x="26" y="298" width="58" height="4" rx="2" fill="#00f5ff" />
        </g>

        {/* Right data panel */}
        <g opacity="0.75">
            <rect x="397" y="200" width="85" height="110" rx="4" fill="rgba(0,20,60,0.7)" stroke="#00f5ff" strokeWidth="0.8" />
            <text x="405" y="218" fill="#00f5ff" fontSize="7" className="code-text">INTEGRITY</text>
            <text x="405" y="232" fill="#0f0" fontSize="6">✓ NO DEVICE</text>
            <text x="405" y="244" fill="#0f0" fontSize="6">✓ SILENCE</text>
            <text x="405" y="256" fill="#0f0" fontSize="6">✓ SEALED DOCS</text>
            <text x="405" y="268" fill="#ff4" fontSize="6">⊙ SCANNING…</text>
            <text x="405" y="280" fill="#aaf" fontSize="6">ZONE: CLEAR</text>
            <rect x="405" y="290" width="65" height="4" rx="2" fill="#0a1a40" />
            <rect x="405" y="290" width="30" height="4" rx="2" fill="#ffd700" className="pulse-ring" />
        </g>

        {/* Floating particles around figure */}
        <g filter="url(#glow)">
            <circle cx="190" cy="320" r="2.5" fill="#00f5ff" className="particle" style={{ animationDelay: '0s' }} />
            <circle cx="310" cy="290" r="2" fill="#ffd700" className="particle" style={{ animationDelay: '1.2s' }} />
            <circle cx="175" cy="260" r="1.8" fill="#00f5ff" className="particle" style={{ animationDelay: '2.4s' }} />
            <circle cx="325" cy="340" r="2.2" fill="#ffffff" className="particle" style={{ animationDelay: '0.7s' }} />
        </g>

        {/* Scan line animation over figure */}
        <rect x="150" y="160" width="200" height="2" fill="#00f5ff" opacity="0.5" className="scan-line" style={{ animationDuration: '3s' }} />

        {/* Top header badge */}
        <rect x="170" y="20" width="160" height="36" rx="6" fill="rgba(0,20,60,0.8)" stroke="url(#goldGrad)" strokeWidth="1.5" />
        <text x="250" y="36" textAnchor="middle" fill="#ffd700" fontSize="9" fontWeight="bold" letterSpacing="3" className="code-text">INVIGILATOR</text>
        <text x="250" y="50" textAnchor="middle" fill="#8888cc" fontSize="7" letterSpacing="2">SECURE ACCESS PORTAL</text>

        {/* Bottom subtitle */}
        <rect x="140" y="548" width="220" height="32" rx="6" fill="rgba(0,10,40,0.85)" stroke="#00f5ff" strokeWidth="0.8" />
        <text x="250" y="562" textAnchor="middle" fill="#00f5ff" fontSize="8" letterSpacing="1.5">"KNOWLEDGE UNDER WATCH"</text>
        <text x="250" y="575" textAnchor="middle" fill="#5566aa" fontSize="7">Authority · Integrity · Vigilance</text>

        {/* Eye scan arcs (decorative, behind figure visually but layered on top for effect) */}
        <g fill="none" className="pulse-ring">
            <path d="M224 241 Q200 320 150 370" stroke="#00f5ff" strokeWidth="0.8" strokeDasharray="3,5" opacity="0.25" />
            <path d="M276 241 Q300 320 350 370" stroke="#00f5ff" strokeWidth="0.8" strokeDasharray="3,5" opacity="0.25" />
        </g>

        {/* Tiny fingerprint icon in center-bottom */}
        <g transform="translate(238, 510)" opacity="0.5">
            <path d="M12,2 Q20,2 20,12 Q20,20 12,22 Q4,20 4,12 Q4,2 12,2Z" fill="none" stroke="#00f5ff" strokeWidth="0.8" />
            <path d="M12,5 Q17,5 17,12 Q17,18 12,19" fill="none" stroke="#00f5ff" strokeWidth="0.8" />
            <path d="M12,8 Q15,8 15,12 Q15,16 12,17" fill="none" stroke="#00f5ff" strokeWidth="0.8" />
            <circle cx="12" cy="12" r="1.5" fill="#00f5ff" />
        </g>
    </svg>
);

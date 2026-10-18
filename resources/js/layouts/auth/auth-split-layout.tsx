import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/* ─── Animated SVG particle ─────────────────────────────────────────────── */
function Particle({ cx, cy, r, delay, dur }: { cx: number; cy: number; r: number; delay: number; dur: number }) {
    return (
        <circle cx={cx} cy={cy} r={r} fill="white" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="0 0; 0 -14; 0 0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
    );
}

/* ─── Branded left panel ─────────────────────────────────────────────────── */
function BrandPanel() {
    return (
        <div
            className="relative hidden h-full flex-col lg:flex"
            style={{ background: 'linear-gradient(160deg,#060d26 0%,#0d1535 55%,#130820 100%)' }}
        >
            {/* Ambient red glow */}
            <div
                aria-hidden
                style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '440px', height: '440px',
                    background: 'radial-gradient(circle,rgba(220,38,38,0.20) 0%,transparent 68%)',
                    borderRadius: '50%', pointerEvents: 'none',
                }}
            />

            {/* Particle field */}
            <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <Particle cx={75} cy={110} r={1.5} delay={0} dur={4} />
                <Particle cx={155} cy={55} r={1} delay={1.2} dur={5} />
                <Particle cx={255} cy={85} r={2} delay={0.5} dur={3.5} />
                <Particle cx={315} cy={195} r={1.2} delay={2} dur={4.8} />
                <Particle cx={105} cy={295} r={1.8} delay={0.8} dur={5.2} />
                <Particle cx={375} cy={125} r={1} delay={3} dur={4.2} />
                <Particle cx={45} cy={415} r={2} delay={1.5} dur={6} />
                <Particle cx={225} cy={475} r={1.3} delay={2.5} dur={3.8} />
                <Particle cx={345} cy={375} r={1.6} delay={0.3} dur={4.5} />
                <Particle cx={135} cy={545} r={1} delay={1.8} dur={5.5} />
                <Particle cx={285} cy={595} r={2.2} delay={0.9} dur={4} />
                <Particle cx={415} cy={515} r={1.1} delay={3.5} dur={5} />
                <line x1="75" y1="110" x2="155" y2="55" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
                <line x1="155" y1="55" x2="255" y2="85" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
                <line x1="255" y1="85" x2="315" y2="195" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
                <line x1="45" y1="415" x2="105" y2="295" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
                <line x1="225" y1="475" x2="345" y2="375" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
            </svg>

            {/* Top-left logo row */}
            <div className="relative z-20 flex items-center gap-3 p-8">
                <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '34px', height: '28px', flexShrink: 0 }} aria-hidden>
                    <path d="M10 48 L60 20 L110 48 L60 76 Z" fill="#dc2626" />
                    <path d="M10 48 L10 60 L60 88 L60 76 Z" fill="#991b1b" />
                    <path d="M110 48 L110 60 L60 88 L60 76 Z" fill="#b91c1c" />
                    <path d="M18 52 L60 27 L102 52" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
                    <path d="M22 55 L60 31 L98 55" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
                    <rect x="46" y="52" width="28" height="20" rx="4" fill="white" />
                    <text x="60" y="66" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="bold" fontSize="13" fill="#dc2626">C</text>
                </svg>
                <div>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>Confidence Global</p>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Education</p>
                </div>
            </div>

            {/* Hero visual – centered */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-10" style={{ textAlign: 'center' }}>
                {/* Pulsing rings + hero SVG */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div aria-hidden style={{ position: 'absolute', width: '290px', height: '290px', border: '1px solid rgba(220,38,38,0.18)', borderRadius: '50%', animation: 'cgPulse 3.2s ease-in-out infinite' }} />
                    <div aria-hidden style={{ position: 'absolute', width: '225px', height: '225px', border: '1px solid rgba(220,38,38,0.12)', borderRadius: '50%', animation: 'cgPulse 3.2s ease-in-out infinite 1.1s' }} />

                    <svg viewBox="0 0 200 185" xmlns="http://www.w3.org/2000/svg"
                        style={{ width: '200px', height: '185px', filter: 'drop-shadow(0 0 28px rgba(220,38,38,0.52))' }}
                        aria-label="Confidence Global Education logo">
                        {/* Mortarboard top face */}
                        <path d="M20 88 L100 42 L180 88 L100 134 Z" fill="#dc2626" />
                        {/* Left underside */}
                        <path d="M20 88 L20 106 L100 152 L100 134 Z" fill="#7f1d1d" />
                        {/* Right underside */}
                        <path d="M180 88 L180 106 L100 152 L100 134 Z" fill="#991b1b" />
                        {/* Page lines */}
                        <path d="M28 92 L100 49 L172 92" fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="2" />
                        <path d="M36 96 L100 56 L164 96" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
                        <path d="M44 100 L100 63 L156 100" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
                        {/* Spine curl left */}
                        <path d="M20 88 Q9 81 13 69 Q17 58 28 58 L36 58" fill="none" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
                        {/* Tassel */}
                        <line x1="180" y1="88" x2="193" y2="116" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="193" cy="120" r="5" fill="#dc2626" />
                        <line x1="193" y1="125" x2="186" y2="143" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                        <line x1="193" y1="125" x2="193" y2="145" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                        <line x1="193" y1="125" x2="200" y2="143" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                        {/* Central badge */}
                        <rect x="78" y="92" width="44" height="34" rx="7" fill="white" />
                        <text x="100" y="116" textAnchor="middle" fontFamily="system-ui,-apple-system,sans-serif" fontWeight="800" fontSize="20" fill="#dc2626">C</text>
                        {/* Bow tie */}
                        <path d="M87 145 L95 139 L95 151 Z" fill="#dc2626" />
                        <path d="M113 145 L105 139 L105 151 Z" fill="#dc2626" />
                        <ellipse cx="100" cy="145" rx="6" ry="4.5" fill="#b91c1c" />
                    </svg>
                </div>

                {/* Tagline */}
                <div style={{ maxWidth: '295px' }}>
                    <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '10px' }}>
                        Your Gateway to Global Education
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.65 }}>
                        Empowering students from Bangladesh to reach universities worldwide.
                    </p>
                </div>

                {/* Stats pills */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[{ value: '500+', label: 'Universities' }, { value: '50+', label: 'Countries' }, { value: '10k+', label: 'Students' }].map((s) => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#f87171', fontWeight: 700, fontSize: '13px' }}>{s.value}</span>
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-20 p-8" style={{ color: 'rgba(255,255,255,0.22)', fontSize: '11px' }}>
                © {new Date().getFullYear()} Confidence Global Education. All rights reserved.
            </div>

            <style>{`
                @keyframes cgPulse {
                    0%,100% { transform:scale(1); opacity:.5; }
                    50% { transform:scale(1.07); opacity:.12; }
                }
            `}</style>
        </div>
    );
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export default function AuthSplitLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative grid h-dvh lg:grid-cols-2">
            <BrandPanel />

            {/* Right: form panel */}
            <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-12 sm:px-12" style={{ background: '#ffffff' }}>
                {/* Mobile logo */}
                <Link href={home()} className="mb-8 flex items-center gap-2 lg:hidden">
                    <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '30px', height: '25px' }} aria-hidden>
                        <path d="M10 48 L60 20 L110 48 L60 76 Z" fill="#dc2626" />
                        <path d="M10 48 L10 60 L60 88 L60 76 Z" fill="#991b1b" />
                        <path d="M110 48 L110 60 L60 88 L60 76 Z" fill="#b91c1c" />
                        <rect x="46" y="52" width="28" height="20" rx="4" fill="white" />
                        <text x="60" y="66" textAnchor="middle" fontFamily="system-ui" fontWeight="bold" fontSize="13" fill="#dc2626">C</text>
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>Confidence Global</span>
                </Link>

                <div className="w-full max-w-sm">
                    {/* Page header */}
                    <div className="mb-8">
                        <div style={{ display: 'inline-block', background: '#fef2f2', borderRadius: '8px', padding: '5px 11px', marginBottom: '14px' }}>
                            <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Staff Portal</span>
                        </div>
                        <h1 style={{ fontSize: '25px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '8px' }}>
                            {title || 'Welcome back'}
                        </h1>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.55 }}>
                            {description || 'Sign in to your account to continue'}
                        </p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}

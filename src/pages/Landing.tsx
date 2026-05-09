import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Github, Menu, X, Shield, Clock, Calendar, Play, Settings as SettingsIcon, Sun, Moon, Zap, Leaf, Check } from 'lucide-react';
import { Footer } from '../components/Footer';

export function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [scrolled, setScrolled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // This is only prototype
  const [prefTheme, setPrefTheme] = useState<'dark' | 'light'>('dark');
  const [prefMotion, setPrefMotion] = useState<'strong' | 'weak'>('strong');
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [settingsOpen]);
  const containerRef = useRef(null);
  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const solutionsRef = useRef<HTMLElement>(null);
  const processRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const yHero = useTransform(heroProgress, [0, 1], ['0px', '60px']);
  const opacityHero = useTransform(heroProgress, [0, 0.85], [1, 0]);

  const { scrollYProgress: featuresProgress } = useScroll({ target: featuresRef, offset: ['start end', 'end start'] });
  const featuresMeanderX = useTransform(featuresProgress, [0, 1], ['-4%', '4%']);
  const featuresLaurelRotate = useTransform(featuresProgress, [0, 1], [0, 30]);

  const { scrollYProgress: solutionsProgress } = useScroll({ target: solutionsRef, offset: ['start end', 'end start'] });
  const ySentinel = useTransform(solutionsProgress, [0, 1], ['30px', '-30px']);
  const solutionsGlowX = useTransform(solutionsProgress, [0, 1], ['-3%', '5%']);

  const { scrollYProgress: processProgress } = useScroll({ target: processRef, offset: ['start end', 'end start'] });
  const processTopMeanderX = useTransform(processProgress, [0, 1], ['0%', '-6%']);
  const processBottomMeanderX = useTransform(processProgress, [0, 1], ['0%', '6%']);

  const { scrollYProgress: pricingProgress } = useScroll({ target: pricingRef, offset: ['start end', 'end start'] });
  const pricingLaurelRotate = useTransform(pricingProgress, [0, 1], [0, -20]);

  const rotateDecor = featuresLaurelRotate;

  useEffect(() => {
    if (user && !loading && !searchParams.has('stay')) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, searchParams]);

  useEffect(() => {
    document.documentElement.classList.add('snap-page');
    return () => document.documentElement.classList.remove('snap-page');
  }, []);

  const navLinks = [
    { id: 'features', label: 'Benefits', href: '#features' },
    { id: 'solutions', label: 'AI Shield', href: '#solutions' },
    { id: 'process', label: 'Workflow', href: '#process' },
    { id: 'pricing', label: 'Free Beta', href: '#pricing' },
  ];

  useEffect(() => {
    const ids = ['hero', 'features', 'solutions', 'process', 'pricing'];
    const onScroll = () => {
      setScrolled(window.scrollY >= window.innerHeight);
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let activeId = 'hero';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const bottom = top + rect.height;
        if (viewportCenter >= top && viewportCenter < bottom) {
          activeId = id;
          break;
        }
      }
      setActiveSection(activeId);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-black text-white font-body selection:bg-gold selection:text-black relative overflow-x-hidden">

      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src="/assets/pictures/hero-bg.jpeg"
          alt="Hero Background"
          className="w-full h-full object-cover"
          style={{
            filter: 'contrast(1.05)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />
        <div className="absolute inset-0 bg-black/15 z-[1]" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-[60vh] z-[2] pointer-events-none backdrop-blur-2xl bottom-blur-mask" />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center px-4 sm:px-6 md:px-12 py-4 md:py-6 transition-colors duration-500 ${
          scrolled ? 'bg-black' : ''
        }`}
      >
        <div className="flex-1 flex items-center">
          <div className="animate-blur-fade-up h-8 md:h-10 flex items-center gap-2" style={{ animationDelay: '0ms' }}>
            <span className="material-symbols-outlined fill-icon text-white text-xl md:text-2xl">shield</span>
            <span className="font-display font-black text-xl md:text-2xl tracking-tighter uppercase">PHYLAXIFY</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center gap-8">
          {navLinks.map((link, i) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.label}
                href={link.href}
                className={`animate-blur-fade-up relative text-sm transition-colors ${
                  isActive ? 'text-gold' : 'text-white/80 hover:text-white'
                }`}
                style={{ animationDelay: `${100 + i * 50}ms` }}
              >
                {link.label}
                <span
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-gold transition-all duration-500 ${
                    isActive ? 'w-6 opacity-100 shadow-[0_0_10px_rgba(201,168,76,0.7)]' : 'w-0 opacity-0'
                  }`}
                />
              </a>
            );
          })}
        </div>

        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          <Link
            to={user ? '/dashboard' : '/auth?tab=login'}
            className="animate-blur-fade-up hidden sm:flex items-center gap-2 px-4 md:px-6 py-2 rounded-full liquid-glass-cine text-sm"
            style={{ animationDelay: '350ms' }}
          >
            <span>{user ? 'Dashboard' : 'Login'}</span>
          </Link>

          {/* Settings popover: prototype only, doesn't apply changes */}
          <div ref={settingsRef} className="hidden sm:block relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              className="animate-blur-fade-up w-10 h-10 rounded-full liquid-glass-cine flex items-center justify-center"
              style={{ animationDelay: '400ms' }}
            >
              <SettingsIcon size={18} className={`transition-transform duration-500 ${settingsOpen ? 'rotate-90' : ''}`} />
            </button>

            <div
              className={`absolute right-0 top-12 w-72 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl p-4 origin-top-right transition-all duration-200 ${
                settingsOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <SettingsIcon size={14} className="text-gold" />
                <span className="font-label text-[10px] uppercase tracking-[0.25em] text-white/60">Preferences</span>
                <span className="ml-auto text-[9px] uppercase tracking-widest text-gold/60">Prototype</span>
              </div>

              <div className="mb-4">
                <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'dark', label: 'Dark', Icon: Moon },
                    { id: 'light', label: 'Light', Icon: Sun },
                  ] as const).map((opt) => {
                    const active = prefTheme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrefTheme(opt.id)}
                        className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          active ? 'bg-gold/15 border border-gold/40 text-gold' : 'bg-white/[0.03] border border-white/10 text-white/70 hover:bg-white/[0.06]'
                        }`}
                      >
                        <opt.Icon size={14} />
                        <span>{opt.label}</span>
                        {active && <Check size={12} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Motion</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'strong', label: 'Strong', Icon: Zap },
                    { id: 'weak', label: 'Weak', Icon: Leaf },
                  ] as const).map((opt) => {
                    const active = prefMotion === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrefMotion(opt.id)}
                        className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          active ? 'bg-gold/15 border border-gold/40 text-gold' : 'bg-white/[0.03] border border-white/10 text-white/70 hover:bg-white/[0.06]'
                        }`}
                      >
                        <opt.Icon size={14} />
                        <span>{opt.label}</span>
                        {active && <Check size={12} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mt-4 pt-3 border-t border-white/10 text-[10px] text-white/30 leading-relaxed">
                These settings are still in the prototype stage. Changes are not yet applied.
              </p>
            </div>
          </div>
          <button
            className="animate-blur-fade-up lg:hidden w-10 h-10 rounded-full liquid-glass-cine flex items-center justify-center"
            style={{ animationDelay: '350ms' }}
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            type="button"
          >
            <span className="relative w-[18px] h-[18px] inline-block">
              <Menu
                size={18}
                className={`absolute inset-0 transition-all duration-500 ease-out ${mobileMenuOpen ? 'opacity-0 rotate-180 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
              />
              <X
                size={18}
                className={`absolute inset-0 transition-all duration-500 ease-out ${mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-50'}`}
              />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`fixed top-[72px] left-0 right-0 z-40 lg:hidden bg-gray-900/95 backdrop-blur-lg border-t border-b border-gray-800 shadow-2xl transition-all duration-500 ease-out ${
          mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col px-4 py-4">
          {navLinks.map((link, i) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-3 px-3 rounded-lg transition-all duration-300 flex items-center gap-3 ${
                  isActive ? 'bg-gold/10 text-gold' : 'hover:bg-gray-800/50 text-white/90'
                }`}
                style={{
                  transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-20px)',
                  opacity: mobileMenuOpen ? 1 : 0,
                  transitionDelay: `${i * 50}ms`,
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'bg-gold shadow-[0_0_8px_rgba(201,168,76,0.8)]' : 'bg-white/20'}`} />
                {link.label}
              </a>
            );
          })}
          <div className="sm:hidden flex items-center gap-3 pt-4 mt-2 border-t border-gray-800">
            <Link
              to={user ? '/dashboard' : '/auth?tab=login'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full liquid-glass-cine text-sm"
            >
              <span>{user ? 'Dashboard' : 'Login'}</span>
            </Link>
          </div>
        </div>
      </div>

      <section ref={heroRef} id="hero" className="snap-section relative z-10 h-screen flex flex-col">

        <motion.div
          style={{ y: yHero, opacity: opacityHero }}
          className="flex-1 flex flex-col justify-end px-4 sm:px-6 md:px-12 pb-8 md:pb-16 z-10"
        >
          <div className="flex flex-col md:flex-row items-end gap-8">
            <div className="flex-1">
              <div
                className="animate-blur-fade-up flex flex-wrap items-center gap-3 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm"
                style={{ animationDelay: '300ms' }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                  <span className="font-medium">99.7% Accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Sub-second Latency</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>April, 2026</span>
                </div>
              </div>

              <h1
                className="animate-blur-fade-up text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal mb-4 md:mb-6"
                style={{ animationDelay: '400ms', letterSpacing: '-0.04em' }}
              >
                Stop Spam. Protect Your Stream.
              </h1>

              <p
                className="animate-blur-fade-up text-base sm:text-lg md:text-xl text-gray-400 mb-6 md:mb-12 max-w-2xl"
                style={{ animationDelay: '500ms' }}
              >
                The Quiet Guardian of digital spaces. AI-powered filters that keep your donations safe from gambling, predatory loans, and bots.
              </p>

              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Link
                  to={user ? '/dashboard' : '/auth?tab=register'}
                  className="animate-blur-fade-up flex items-center gap-2 bg-white text-black rounded-full font-medium px-6 sm:px-8 py-2.5 sm:py-3 hover:bg-gray-200 transition-colors"
                  style={{ animationDelay: '600ms' }}
                >
                  <Play size={18} className="fill-black" />
                  <span>{user ? 'Dashboard' : 'Sign Up Free'}</span>
                </Link>
                <button
                  type="button"
                  className="animate-blur-fade-up rounded-full font-medium liquid-glass-cine px-6 sm:px-8 py-2.5 sm:py-3"
                  style={{ animationDelay: '700ms' }}
                >
                  Watch Demo
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/AxelS27/Phylaxify2"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                className="animate-blur-fade-up flex items-center gap-2 rounded-full liquid-glass-cine px-4 sm:px-5 py-2.5 sm:py-3 text-sm hover:bg-white/5 transition-colors"
                style={{ animationDelay: '800ms' }}
              >
                <Github size={18} />
                <span>Source</span>
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="relative z-10 shadow-[0_-50px_100px_rgba(0,0,0,0.6)]">

         <section ref={featuresRef} id="features" className="snap-section relative h-screen w-full overflow-hidden flex items-center bg-[#0a0a12]">
            <div className="absolute inset-0 greek-grid opacity-60 pointer-events-none" />
            <div className="absolute inset-0 greek-radial-gold pointer-events-none" />
            <motion.div
              style={{ rotate: rotateDecor }}
              className="absolute -right-40 top-1/2 -translate-y-1/2 w-[40rem] h-[40rem] greek-watermark-laurel opacity-[0.06] pointer-events-none bg-gold"
            />
            <motion.div style={{ x: featuresMeanderX }} className="absolute top-0 left-0 right-0 h-4 greek-border-top opacity-50 pointer-events-none" />
            <motion.div style={{ x: featuresMeanderX }} className="absolute bottom-0 left-0 right-0 h-4 greek-border-bottom opacity-50 pointer-events-none" />

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, margin: '-150px' }}
                 className="mb-12 md:mb-16"
               >
                  <div className="flex items-center gap-4 text-gold font-label text-[10px] uppercase tracking-[0.3em] mb-6">
                     <span className="w-12 h-[1px] bg-gold/40" />
                     <span>I. The Threat</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] uppercase">
                     Why Your Stream <span className="text-gold italic">Needs Protection</span>
                  </h2>
               </motion.div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  {[
                    {
                      icon: 'dangerous',
                      title: 'Illegal Spam Flooding Donations',
                      desc: 'Illegal promotional messages disrupt the viewing experience and ruin interaction moments with your audience.',
                    },
                    {
                      icon: 'person_remove',
                      title: 'Loss of Viewer Trust',
                      desc: 'Communities feel unsafe when their public space is filled with malicious links and organized scams.',
                    },
                    {
                      icon: 'block',
                      title: 'Platform Ban Risk',
                      desc: "Streaming platforms have strict policies against illegal content. Don't let bots destroy your career.",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-100px' }}
                      transition={{ delay: i * 0.15, duration: 0.7 }}
                      className="relative p-8 md:p-10 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-error/40 hover:bg-white/[0.06] transition-all group backdrop-blur-md overflow-hidden"
                    >
                       <span className="material-symbols-outlined absolute top-4 right-4 text-white/[0.06] text-7xl pointer-events-none select-none group-hover:text-gold/10 transition-colors duration-500">
                          view_column
                       </span>
                       <span className="absolute bottom-4 right-5 font-display font-light text-white/[0.05] text-6xl pointer-events-none select-none">{`0${i + 1}`}</span>

                       <div className="relative w-14 h-14 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center mb-6 group-hover:border-error/40 transition-all duration-500">
                          <span className="material-symbols-outlined text-error text-3xl group-hover:scale-110 transition-transform duration-500">{item.icon}</span>
                       </div>

                       <h3 className="relative text-xl md:text-2xl font-h2 font-normal mb-4 text-on-surface leading-snug">{item.title}</h3>
                       <p className="relative text-on-surface-variant text-base leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
               </div>
            </div>
         </section>

         <section ref={solutionsRef} id="solutions" className="snap-section relative h-screen w-full overflow-hidden flex items-center bg-[#141016]">
            <div className="absolute inset-0 greek-dots opacity-40 pointer-events-none" />
            <motion.div
              style={{ x: solutionsGlowX }}
              className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
            >
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at 20% 50%, rgba(201,168,76,0.12), transparent 60%)' }}
              />
            </motion.div>
            <motion.div style={{ x: featuresMeanderX }} className="absolute top-0 left-0 right-0 h-4 greek-border-top opacity-40 pointer-events-none" />
            <motion.div style={{ x: featuresMeanderX }} className="absolute bottom-0 left-0 right-0 h-4 greek-border-bottom opacity-40 pointer-events-none" />

            <div className="absolute inset-y-12 right-12 hidden md:flex flex-col gap-1 pointer-events-none">
               {Array.from({ length: 6 }).map((_, i) => (
                 <span key={i} className="w-px flex-1 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
               ))}
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
               <motion.div
                 initial={{ opacity: 0, x: -30 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.8 }}
                 className="space-y-6 md:space-y-8"
               >
                  <div className="flex items-center gap-4 text-gold font-label text-[10px] uppercase tracking-[0.3em]">
                     <span className="w-12 h-[1px] bg-gold/40" />
                     <span>II. The Shield</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] uppercase">
                     Shield <span className="text-gold italic">Technology</span>
                  </h2>
                  <p className="text-white/60 text-base md:text-xl leading-relaxed font-light max-w-xl">
                     Three layers of protection: Smart Filter, BERT Neural Networks, and sub-second linguistic analysis for absolute security.
                  </p>
                  <ul className="space-y-3 pt-2">
                     {[
                       { k: 'Layer 1', v: 'Smart Blocklist: keyword & regex' },
                       { k: 'Layer 2', v: 'Shield BERT: context-aware ML' },
                       { k: 'Layer 3', v: 'Linguistic Heuristics: sub-second' },
                     ].map((row) => (
                       <li key={row.k} className="flex items-center gap-4 text-sm md:text-base">
                          <span className="font-label text-[10px] uppercase tracking-[0.25em] text-gold w-16">{row.k}</span>
                          <span className="h-px flex-1 bg-white/10" />
                          <span className="text-white/80">{row.v}</span>
                       </li>
                     ))}
                  </ul>
               </motion.div>
               <motion.div style={{ y: ySentinel }} className="relative group">
                  <div className="absolute -inset-10 bg-gold/15 rounded-full blur-[120px] opacity-30 group-hover:opacity-50 transition-opacity" />
                  <div className="relative rounded-[2.5rem] border border-gold/20 overflow-hidden shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop"
                      alt="Sentinel AI"
                      className="w-full h-[28rem] md:h-[32rem] object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                    />
                    <div className="absolute top-0 left-0 right-0 h-4 greek-border-top opacity-80 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-4 greek-border-bottom opacity-80 pointer-events-none" />
                  </div>
               </motion.div>
            </div>
         </section>

         <section ref={processRef} id="process" className="snap-section relative h-screen w-full overflow-hidden flex items-center bg-[#1d1b20]">
            <div className="absolute inset-0 greek-grid opacity-30 pointer-events-none" />
            <motion.div style={{ x: processTopMeanderX }} className="absolute top-12 left-0 right-0 h-4 greek-meander opacity-30 pointer-events-none" />
            <motion.div style={{ x: processBottomMeanderX }} className="absolute bottom-12 left-0 right-0 h-4 greek-meander opacity-30 pointer-events-none" />

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, margin: '-150px' }}
                 className="text-center mb-16 md:mb-20"
               >
                  <div className="inline-flex items-center gap-4 text-gold font-label text-[10px] uppercase tracking-[0.3em] mb-6">
                     <span className="w-12 h-[1px] bg-gold/40" />
                     <span>III. Integration</span>
                     <span className="w-12 h-[1px] bg-gold/40" />
                  </div>
                  <h2 className="font-display font-light text-4xl md:text-5xl lg:text-6xl text-on-surface mb-4 tracking-tight">
                     4 Steps to <span className="text-gold italic">Peace of Mind</span>
                  </h2>
                  <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed">
                     Instant integration, eternal protection. Start securing your stream today.
                  </p>
               </motion.div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
                  {[
                    { n: '01', title: 'Connect Account', desc: 'Link your streaming or donation platform accounts with just one secure click.' },
                    { n: '02', title: 'Set Rules', desc: "Choose the sensitivity level of our AI to suit your community's needs." },
                    { n: '03', title: 'Activate Protection', desc: 'Let our algorithms start scanning every incoming message in real-time.' },
                    { n: '04', title: 'Monitor & Analyze', desc: 'View statistics on how much spam we successfully block every day.' },
                  ].map((step, i) => (
                    <motion.div
                      key={step.n}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-100px' }}
                      transition={{ delay: i * 0.12, duration: 0.7 }}
                      className="relative p-6 md:p-8 border-l border-white/10 group hover:border-gold/40 transition-colors"
                    >
                       <div className="font-display font-light text-5xl md:text-6xl text-gold opacity-40 mb-6 group-hover:opacity-100 transition-opacity duration-500 leading-none">
                          {step.n}
                       </div>
                       <h4 className="font-h2 text-xl md:text-2xl mb-3 text-on-surface">{step.title}</h4>
                       <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">{step.desc}</p>
                    </motion.div>
                  ))}
               </div>
            </div>
         </section>

         <section ref={pricingRef} id="pricing" className="snap-section relative h-screen w-full overflow-hidden flex items-center bg-gold text-black">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.18) 1px, transparent 1.5px)', backgroundSize: '24px 24px' }}
            />
            <motion.div style={{ x: processBottomMeanderX }} className="absolute top-0 left-0 right-0 h-6 greek-meander opacity-60 pointer-events-none" />
            <motion.div style={{ x: processTopMeanderX }} className="absolute bottom-0 left-0 right-0 h-6 greek-meander opacity-60 pointer-events-none" />
            <motion.div
              style={{ rotate: pricingLaurelRotate }}
              className="absolute -left-40 -bottom-40 w-[36rem] h-[36rem] greek-watermark-laurel opacity-10 pointer-events-none bg-black"
            />

            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 text-center">
               <motion.div
                 initial={{ opacity: 0, y: 40 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.8 }}
               >
                  <div className="inline-flex items-center gap-4 font-label text-[10px] uppercase tracking-[0.3em] mb-8">
                     <span className="w-12 h-[1px] bg-black/40" />
                     <span>IV. Access</span>
                     <span className="w-12 h-[1px] bg-black/40" />
                  </div>
                  <h2 className="text-5xl md:text-7xl lg:text-9xl font-black mb-8 md:mb-10 uppercase italic tracking-tighter leading-[0.85]">
                     Free During Beta
                  </h2>
                  <p className="text-lg md:text-2xl font-medium mb-10 md:mb-14 opacity-80 max-w-2xl mx-auto leading-relaxed">
                     Get full access to our protection system before the public release.
                  </p>
                  <Link
                    to={user ? '/dashboard' : '/auth?tab=register'}
                    className="inline-block bg-black text-white px-12 md:px-20 py-5 md:py-7 rounded-full font-black uppercase tracking-widest text-base md:text-xl hover:scale-105 transition-all shadow-2xl"
                  >
                     {user ? 'Go to Dashboard' : 'Secure Now'}
                  </Link>
               </motion.div>
            </div>
         </section>

         <Footer />
      </div>

      <style>{`
        html { scroll-behavior: smooth; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>
    </div>
  );
}

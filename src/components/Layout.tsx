import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/profile';
import { isActivePremium } from '../lib/plan';
import { Footer } from './Footer';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { name: 'Home', path: '/dashboard', icon: 'home' },
  { name: 'Donations', path: '/offerings', icon: 'payments' },
  { name: 'Blocklist', path: '/aegis-list', icon: 'block' },
  { name: 'Test Lab', path: '/test-lab', icon: 'science' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const isPremium = isActivePremium(profile?.plan ?? 'free', profile?.plan_expires_at ?? null);

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background-color text-on-surface font-body overflow-x-hidden selection:bg-tertiary selection:text-on-tertiary flex">
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-background-color shadow-2xl flex flex-col py-8 px-4 gap-8 z-50">
        <div className="flex flex-col gap-1 px-4">
          <Link to="/dashboard" className="text-xl font-black text-gold font-display tracking-tighter uppercase">Phylaxify</Link>
          <span className="text-[10px] text-white/40 tracking-[0.2em] uppercase font-label">The Quiet Guardian</span>
        </div>
        
        <nav className="flex flex-col gap-2 mt-4 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-label uppercase tracking-widest text-xs",
                  isActive
                    ? "bg-white/5 text-gold border-l-4 border-gold"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5 border-l-4 border-transparent"
                )}
              >
                <span className={cn("material-symbols-outlined text-lg", isActive && "fill-icon")}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-gold/20 to-transparent border border-gold/30 relative overflow-hidden">
             <div className="greek-meander absolute inset-0 opacity-10"></div>
             <p className="text-[10px] text-gold font-bold uppercase mb-2 relative z-10">Premium Access</p>
             <Link
                to="/upgrade"
                className="block text-center w-full bg-gold text-[#0A0A0A] font-label py-2 rounded-lg uppercase tracking-widest text-[10px] font-bold hover:brightness-110 transition-all relative z-10 shadow-[0_0_10px_rgba(201,168,76,0.2)]"
             >
                Upgrade Now
            </Link>
          </div>
          
          <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
            <Link to="/?stay=true" className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white/80 transition-all font-label text-[10px] uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">home_app_logo</span>
              Landing Page
            </Link>
            <a
              href="https://github.com/AxelS27/Phylaxify/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white/80 transition-all font-label text-[10px] uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-sm">help</span>
              Support
            </a>
            {profile && (
              <div className="px-4 py-2 flex items-center gap-2 truncate">
                <span className="text-[10px] text-white/30 font-label uppercase tracking-widest truncate">
                  @{profile.username}
                </span>
                {isPremium && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-gold/20 border border-gold/40 text-[8px] font-black text-gold uppercase tracking-widest">
                    Pro
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-white/40 hover:text-error transition-all font-label text-[10px] uppercase tracking-widest text-left"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Logout
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-32 left-0 w-full opacity-10 pointer-events-none px-8">
          <svg className="stroke-gold" fill="none" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 10 Q 25 0 50 10 T 100 10" strokeWidth="2"></path>
            <path d="M0 15 Q 25 5 50 15 T 100 15" strokeWidth="1"></path>
          </svg>
        </div>
      </aside>
      
      <main className="ml-64 w-full relative overflow-hidden bg-background-color">
         <AnimatePresence mode="wait" initial={false}>
            <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 6 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -6 }}
               transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
               className="min-h-screen"
            >
               {children}
            </motion.div>
         </AnimatePresence>
         <Footer />
      </main>
    </div>
  );
}

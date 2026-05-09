import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Footer } from '../components/Footer';

type Tab = 'login' | 'register';

export function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab: Tab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  // Keep URL ?tab=... in sync with active tab
  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    }
    setError(null);
    setInfo(null);
  }, [tab]);

  // React to URL changes (e.g. user pastes /auth?tab=register)
  useEffect(() => {
    const t = searchParams.get('tab') === 'register' ? 'register' : 'login';
    if (t !== tab) setTab(t);
  }, [searchParams]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const { error: err, needsEmailConfirm } = await signUp(regEmail, regPassword, username);
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }
    if (needsEmailConfirm) {
      setInfo('Account created. Check your email for confirmation before logging in.');
      return;
    }
    navigate('/onboarding', { replace: true });
  }

  return (
    <div className="flex flex-col bg-background-color text-on-surface font-body selection:bg-gold selection:text-black">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-6 max-w-full bg-black/40 backdrop-blur-md">
         <Link to="/" className="text-2xl font-bold text-gold flex items-center gap-2">
            <span className="material-symbols-outlined fill-icon">shield</span>
            <span className="tracking-tighter">Phylaxify</span>
         </Link>
         <Link to="/" className="font-label text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold transition-colors">
            ← Back
         </Link>
      </header>

      <div className="flex flex-col md:flex-row min-h-screen">
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center bg-[#0A0A0A]">
         <div className="absolute inset-0 opacity-20 greek-meander"></div>
         <div className="relative z-10 p-12 text-center max-w-lg">
            <div className="mb-8 flex justify-center">
               <div className="w-24 h-24 rounded-full border border-gold/30 flex items-center justify-center bg-gold/5">
                  <span className="material-symbols-outlined text-5xl text-gold fill-icon">security</span>
               </div>
            </div>
            <h2 className="font-display text-h1 text-white mb-6 tracking-tight">The Quiet Guardian</h2>
            <p className="text-on-surface-variant font-body leading-relaxed">
               {tab === 'login'
                 ? 'Protecting your digital sanctum with cinematic precision and stoic authority. Log in to manage your protection systems.'
                 : 'Join the silent order. Sign up to protect your stream ecosystem from spam, gambling, and predatory loans, automatically.'}
            </p>
            <div className="mt-16 opacity-30 flex justify-center gap-4">
               <span className="material-symbols-outlined text-4xl text-gold">architecture</span>
               <span className="material-symbols-outlined text-4xl text-gold">gavel</span>
               <span className="material-symbols-outlined text-4xl text-gold">account_balance</span>
            </div>
         </div>

         <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/80 z-10"></div>
            <img className="w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJJWHubn_xeTUY7P6YS0iQkXIrtTK2lC-KUuxENQs-51nPK9tQFYi7tjTtWDCt6k4LlRO4AQ9a188_l9TPgDPJ7EB18MdxxDfHvzqfRF8Ii7QdujjZFVrCCAuJ_OfaikPNWQ_yThJA9ECddyf1vqoE007YL8t163cZ4-zXkQsv_qejo07bXu2sFgT86RKA3PlLuOtIRK4r9nwEP0CMtnIXbNXJGxvanjfPkXsVY49EzOku8gtTqz7RCEE_jXfKTPH6Dog5n_mO7LY" alt="Columns" />
         </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12 mt-16 md:mt-0 relative z-10 bg-background-color">
         <div className="w-full max-w-md space-y-8">
            <div role="tablist" aria-label="Auth mode" className="relative grid grid-cols-2 p-1 rounded-full bg-white/[0.03] border border-white/10">
               <span
                 aria-hidden
                 className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gold shadow-[0_0_20px_rgba(201,168,76,0.25)] transition-transform duration-500 ease-out ${
                   tab === 'register' ? 'translate-x-full' : 'translate-x-0'
                 }`}
               />
               <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'login'}
                  onClick={() => setTab('login')}
                  className={`relative z-10 py-2.5 rounded-full font-label text-xs uppercase tracking-widest transition-colors ${
                    tab === 'login' ? 'text-black' : 'text-white/60 hover:text-white'
                  }`}
               >
                  Login
               </button>
               <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'register'}
                  onClick={() => setTab('register')}
                  className={`relative z-10 py-2.5 rounded-full font-label text-xs uppercase tracking-widest transition-colors ${
                    tab === 'register' ? 'text-black' : 'text-white/60 hover:text-white'
                  }`}
               >
                  Sign Up
               </button>
            </div>

            <div className="space-y-3">
               <h1 className="font-display text-h2 text-white">
                  {tab === 'login' ? 'Login to Phylaxify' : 'Create Phylaxify Account'}
               </h1>
               <p className="text-on-surface-variant font-body text-sm">
                  {tab === 'login'
                    ? 'Please enter your credentials to proceed to the Sanctum.'
                    : 'Start your journey of silent protection.'}
               </p>
            </div>

            {tab === 'login' && (
              <form className="space-y-6 blurFadeUp" onSubmit={handleLogin}>
                 <div className="space-y-2">
                    <label className="font-label text-on-surface-variant block ml-1 text-xs">Email</label>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-white/30 group-focus-within:text-gold transition-colors">mail</span>
                       </div>
                       <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@email.com"
                          className="w-full bg-[#111111] border border-[#222222] rounded-lg py-4 pl-12 pr-4 text-white font-body focus:outline-none focus:ring-0 focus:border-gold/50 transition-all placeholder:text-white/20"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                       <label className="font-label text-on-surface-variant text-xs">Password</label>
                       <a href="#" className="font-label text-xs text-gold hover:text-[#ffdf93] transition-colors">Forgot password?</a>
                    </div>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-white/30 group-focus-within:text-gold transition-colors">lock</span>
                       </div>
                       <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#111111] border border-[#222222] rounded-lg py-4 pl-12 pr-12 text-white font-body focus:outline-none focus:ring-0 focus:border-gold/50 transition-all placeholder:text-white/20"
                       />
                       <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                       >
                          <span className="material-symbols-outlined text-white/30 hover:text-white transition-colors">
                             {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                       </button>
                    </div>
                 </div>

                 {error && (
                    <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3">
                       <p className="text-error text-xs font-label">{error}</p>
                    </div>
                 )}

                 <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gold hover:bg-[#ffdf93] text-black font-label py-5 rounded-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-95 shadow-[0_0_20px_rgba(201,168,76,0.15)] flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                 >
                    {submitting ? 'Verifying...' : 'Login'}
                    <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                 </button>

                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center">
                       <span className="bg-background-color px-4 font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Or login with</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button type="button" className="liquid-glass flex items-center justify-center gap-3 py-4 rounded-lg hover:bg-white/5 transition-all group">
                       <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN4hQ2gU0d4R8_oKNFH3YjatRb1ruTtavztzB4wM-cyIYER95Kf2b7booP94P1v7qkZq1SP7-hsZSzPpYlv1Q9ZaxoBRM0hjM7ti7_vDXpXEIJEw4Alq9Bm3p4zO9VKfbXQg-sn5eVTxNNqx5XRD1NVtK1_snBpUrO0eD45vO35ho3KvcQJmgrMl8dnq9ByRhxLI2dpKHkxShpG1gkfVdx3xCZme9ErX9xHBURbJqGFdFC8gefmkoeOc9wyQGvp63YmzaAMerRJbk" alt="Google" className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                       <span className="font-label text-sm">Google</span>
                    </button>
                    <button type="button" className="liquid-glass flex items-center justify-center gap-3 py-4 rounded-lg hover:bg-white/5 transition-all group">
                       <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors fill-icon">ios</span>
                       <span className="font-label text-sm">Apple</span>
                    </button>
                 </div>

                 <div className="text-center pt-4">
                    <p className="font-body text-on-surface-variant text-sm">
                       Don't have an account?{' '}
                       <button type="button" onClick={() => setTab('register')} className="text-gold font-semibold hover:underline">Sign Up</button>
                    </p>
                 </div>
              </form>
            )}

            {tab === 'register' && (
              <form className="space-y-6 blurFadeUp" onSubmit={handleRegister}>
                 <div className="space-y-2">
                    <label className="font-label text-on-surface-variant block ml-1 text-xs">Username</label>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-white/30 group-focus-within:text-gold transition-colors">person</span>
                       </div>
                       <input
                          type="text"
                          required
                          minLength={3}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="choose a unique name"
                          className="w-full bg-[#111111] border border-[#222222] rounded-lg py-4 pl-12 pr-4 text-white font-body focus:outline-none focus:ring-0 focus:border-gold/50 transition-all placeholder:text-white/20"
                       />
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60 italic ml-1">Use alphanumeric characters only.</p>
                 </div>

                 <div className="space-y-2">
                    <label className="font-label text-on-surface-variant block ml-1 text-xs">Email</label>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-white/30 group-focus-within:text-gold transition-colors">mail</span>
                       </div>
                       <input
                          type="email"
                          required
                          autoComplete="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@email.com"
                          className="w-full bg-[#111111] border border-[#222222] rounded-lg py-4 pl-12 pr-4 text-white font-body focus:outline-none focus:ring-0 focus:border-gold/50 transition-all placeholder:text-white/20"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="font-label text-on-surface-variant block ml-1 text-xs">Password</label>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-white/30 group-focus-within:text-gold transition-colors">lock</span>
                       </div>
                       <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#111111] border border-[#222222] rounded-lg py-4 pl-12 pr-12 text-white font-body focus:outline-none focus:ring-0 focus:border-gold/50 transition-all placeholder:text-white/20"
                       />
                       <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                       >
                          <span className="material-symbols-outlined text-white/30 hover:text-white transition-colors">
                             {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                       </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60 italic ml-1">At least 8 characters.</p>
                 </div>

                 {error && (
                    <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3">
                       <p className="text-error text-xs font-label">{error}</p>
                    </div>
                 )}
                 {info && (
                    <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-3">
                       <p className="text-gold text-xs font-label">{info}</p>
                    </div>
                 )}

                 <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gold hover:bg-[#ffdf93] text-black font-label py-5 rounded-lg transition-all duration-300 transform hover:scale-[1.01] active:scale-95 shadow-[0_0_20px_rgba(201,168,76,0.15)] flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                 >
                    {submitting ? 'Creating account...' : 'Sign Up'}
                    <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                 </button>

                 <div className="text-center pt-4">
                    <p className="font-body text-on-surface-variant text-sm">
                       Already have an account?{' '}
                       <button type="button" onClick={() => setTab('login')} className="text-gold font-semibold hover:underline">Login</button>
                    </p>
                 </div>
              </form>
            )}
         </div>
      </div>

      </div>
      <Footer />
    </div>
  );
}
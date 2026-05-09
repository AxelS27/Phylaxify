import { Link, useLocation } from 'react-router-dom';

type LinkItem = { label: string; href?: string; to?: string };
type FooterColumn = { title: string; items: LinkItem[] };

const LEGAL: FooterColumn = {
  title: 'Legal',
  items: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms & Conditions', href: '#' },
    { label: 'Contact', href: '#' },
  ],
};

const LANDING_LINKS: FooterColumn = {
  title: 'Product',
  items: [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#process' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Integrations', href: '#solutions' },
  ],
};

const DASHBOARD_LINKS: FooterColumn = {
  title: 'Dashboard',
  items: [
    { label: 'Home', to: '/dashboard' },
    { label: 'Donations', to: '/offerings' },
    { label: 'Blocklist', to: '/aegis-list' },
    { label: 'Test Lab', to: '/test-lab' },
    { label: 'Settings', to: '/settings' },
  ],
};

const AUTH_LINKS: FooterColumn = {
  title: 'Account',
  items: [
    { label: 'Login', to: '/auth?tab=login' },
    { label: 'Sign Up', to: '/auth?tab=register' },
  ],
};

function pickPrimary(pathname: string): FooterColumn {
  if (pathname === '/') return LANDING_LINKS;
  if (pathname.startsWith('/auth')) return AUTH_LINKS;
  return DASHBOARD_LINKS;
}

function FooterLink({ item }: { item: LinkItem }) {
  const className = 'hover:text-gold transition-colors';
  if (item.to) return <Link to={item.to} className={className}>{item.label}</Link>;
  return <a className={className} href={item.href ?? '#'}>{item.label}</a>;
}

export function Footer() {
  const primary = pickPrimary(useLocation().pathname);

  return (
    <footer className="bg-surface-container-lowest py-16 border-t border-white/5">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="text-2xl font-bold text-gold flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined fill-icon">shield</span>
            Phylaxify
          </div>
          <p className="text-on-surface-variant max-w-sm leading-relaxed">
            The Quiet Guardian of Digital Spaces. Protecting your content integrity with modern technology precision and ancient protection philosophy.
          </p>
        </div>
        <div>
          <h5 className="font-label text-xs uppercase tracking-[0.05em] font-semibold text-white mb-6">{primary.title}</h5>
          <ul className="space-y-4 text-on-surface-variant">
            {primary.items.map((item) => (
              <li key={item.label}><FooterLink item={item} /></li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="font-label text-xs uppercase tracking-[0.05em] font-semibold text-white mb-6">{LEGAL.title}</h5>
          <ul className="space-y-4 text-on-surface-variant">
            {LEGAL.items.map((item) => (
              <li key={item.label}><FooterLink item={item} /></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center text-white/40 text-xs uppercase tracking-widest font-label">
        <div>© 2026 Phylaxify. All rights reserved.</div>
        <div className="flex gap-6">
          <a className="hover:text-gold transition-colors" href="#">Twitter</a>
          <a className="hover:text-gold transition-colors" href="#">Discord</a>
          <a className="hover:text-gold transition-colors" href="#">Instagram</a>
        </div>
      </div>
    </footer>
  );
}

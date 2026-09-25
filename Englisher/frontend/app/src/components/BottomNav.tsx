import { Link, useLocation } from 'react-router-dom';

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={active ? '#6C4FF6' : '#B5AFD4'} strokeWidth="1.6"><path d="M10 2L2 9h2v9h5v-6h2v6h5V9h2z" fill={active ? '#6C4FF6' : '#B5AFD4'} stroke="none" /></svg>
);
const ProgressIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={active ? '#6C4FF6' : '#B5AFD4'} strokeWidth="1.6"><circle cx="10" cy="10" r="7.5" /><path d="M10 4.5A5.5 5.5 0 0 1 15.5 10" stroke="#6C4FF6" /></svg>
);
const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={active ? '#6C4FF6' : '#B5AFD4'} strokeWidth="1.6"><circle cx="10" cy="6.5" r="3.2" /><path d="M3.5 17c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /></svg>
);

const TABS = [
  { to: '/learn', en: 'Home', si: 'මුල් පිටුව', Icon: HomeIcon },
  { to: '/progress', en: 'Progress', si: 'ප්‍රගතිය', Icon: ProgressIcon },
  { to: '/profile', en: 'Profile', si: 'පැතිකඩ', Icon: ProfileIcon },
];

// Not read from a shared context — every page that renders this nav keeps
// its own `lang` state (no global language store exists yet), so each
// caller passes its own current toggle value down.
export function BottomNav({ lang = 'en' }: { lang?: 'en' | 'si' }) {
  const { pathname } = useLocation();
  return (
    <div className="bottom-nav">
      <div className="bottom-nav__row">
        {TABS.map(({ to, en, si, Icon }) => {
          const active = pathname === to || (to === '/learn' && pathname.startsWith('/learn'));
          const label = lang === 'si' ? si : en;
          return (
            <Link key={to} to={to} className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}>
              <Icon active={active} />
              <span className={`bottom-nav__label${active ? ' bottom-nav__label--active' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

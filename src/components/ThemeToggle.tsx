import { useState } from 'react';
import { useI18n } from '../i18n/context';

const KEY = 'esim-storefront:theme';
type Theme = 'light' | 'dark';

/** Light or dark. The page starts in the visitor's last choice, else their system's (see index.html). */
export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="picker__trigger theme-toggle"
      aria-label={t(next === 'dark' ? 'theme.toDark' : 'theme.toLight')}
      title={t(next === 'dark' ? 'theme.toDark' : 'theme.toLight')}
      onClick={() => {
        const root = document.documentElement;
        root.classList.add('theme-switching');
        root.dataset.theme = next;
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // The theme holds for this visit; it just won't be remembered.
        }
        setTheme(next);
      }}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

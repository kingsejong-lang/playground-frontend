import { fireEvent, render, screen } from '@testing-library/react';
import LanguageToggle, { localePath } from '../LanguageToggle';

const push = vi.fn();
let pathname = '/en/embed/abc';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => pathname }));

beforeEach(() => {
  push.mockClear();
  window.history.replaceState(null, '', '/en/embed/abc?share=s1');
});

describe('localePath', () => {
  it('replaces or inserts the locale segment', () => {
    expect(localePath('/en/embed/abc', 'ko')).toBe('/ko/embed/abc');
    expect(localePath('/ko', 'en')).toBe('/en');
    expect(localePath('/embed/abc', 'ko')).toBe('/ko/embed/abc');
    expect(localePath('', 'en')).toBe('/en');
  });
});

describe('LanguageToggle', () => {
  it('marks the current locale and switches while keeping the query', () => {
    const onSwitch = vi.fn();
    render(<LanguageToggle onSwitch={onSwitch} />);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(push).not.toHaveBeenCalled();
    expect(onSwitch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '한국어' }));
    expect(push).toHaveBeenCalledWith('/ko/embed/abc?share=s1');
  });

  it('renders stacked menu items', () => {
    pathname = '/en';
    render(<LanguageToggle variant="menu" />);
    expect(screen.getByRole('group', { name: 'Interface language' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '한국어' }));
    expect(push).toHaveBeenCalledWith('/ko?share=s1');
  });
});

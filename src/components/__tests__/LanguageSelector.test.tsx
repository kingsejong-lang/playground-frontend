import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSelector from '../LanguageSelector';
import { Language } from '@/lib/api';

describe('LanguageSelector', () => {
  const mockLanguages: Language[] = [
    {
      id: 'kingsejong_v0_3',
      name: 'Kingsejong',
      version: 'v0.3',
      extensions: ['.ksj'],
      aliases: ['kingsejong'],
      default_template: 'hello_world',
    },
    {
      id: 'python_3_12',
      name: 'Python',
      version: '3.12',
      extensions: ['.py'],
      aliases: ['python', 'py'],
      default_template: 'hello_world',
    },
    {
      id: 'go_1_22',
      name: 'Go',
      version: '1.22',
      extensions: ['.go'],
      aliases: ['golang', 'go'],
      default_template: 'hello_world',
    },
  ];

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render all languages', () => {
    render(
      <LanguageSelector
        languages={mockLanguages}
        selectedLanguage="kingsejong_v0_3"
        onSelect={mockOnSelect}
      />
    );

    mockLanguages.forEach((lang) => {
      expect(screen.getByText(`${lang.name} ${lang.version}`)).toBeInTheDocument();
    });
  });

  it('should show selected language', () => {
    render(
      <LanguageSelector
        languages={mockLanguages}
        selectedLanguage="python_3_12"
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('python_3_12');
  });

  it('should call onSelect when language is changed', () => {
    render(
      <LanguageSelector
        languages={mockLanguages}
        selectedLanguage="kingsejong_v0_3"
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'go_1_22' } });

    expect(mockOnSelect).toHaveBeenCalledWith('go_1_22');
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should have accessible label', () => {
    render(
      <LanguageSelector
        languages={mockLanguages}
        selectedLanguage="kingsejong_v0_3"
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAccessibleName(/select programming language/i);
  });

  it('should render empty select when no languages provided', () => {
    render(
      <LanguageSelector
        languages={[]}
        selectedLanguage=""
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select.children).toHaveLength(0);
  });
});

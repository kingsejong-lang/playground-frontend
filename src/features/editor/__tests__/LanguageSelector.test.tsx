import { create } from '@bufbuild/protobuf';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageSchema, type Language } from '@kingsejong-lang/playground-proto';
import LanguageSelector from '../LanguageSelector';

describe('LanguageSelector', () => {
  const mockLanguages: Language[] = [
    create(LanguageSchema, { id: 'kingsejong', displayName: 'Kingsejong', version: 'v0.3', fileExtensions: ['.ksj'] }),
    create(LanguageSchema, { id: 'python_3_12', displayName: 'Python', version: '3.12', fileExtensions: ['.py'] }),
    create(LanguageSchema, { id: 'go_1_22', displayName: 'Go', version: '1.22', fileExtensions: ['.go'] }),
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render all languages', () => {
    render(
      <LanguageSelector
        languages={mockLanguages}
        selectedLanguage="kingsejong"
        onSelect={mockOnSelect}
      />
    );

    mockLanguages.forEach((lang) => {
      expect(screen.getByText(`${lang.displayName} ${lang.version}`)).toBeInTheDocument();
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
        selectedLanguage="kingsejong"
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
        selectedLanguage="kingsejong"
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAccessibleName(/programming language/i);
  });

  it('shows a disabled placeholder when no languages are available', () => {
    render(
      <LanguageSelector
        languages={[]}
        selectedLanguage=""
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
    expect(select.children).toHaveLength(1);
    expect(select).toHaveDisplayValue('Languages unavailable');
  });
});

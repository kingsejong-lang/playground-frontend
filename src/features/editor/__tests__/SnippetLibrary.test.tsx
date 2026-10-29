import { fireEvent, render, screen, within } from '@testing-library/react';
import SnippetLibrary from '../SnippetLibrary';

beforeEach(() => localStorage.clear());

function open() {
  const onSelectSnippet = vi.fn();
  const onClose = vi.fn();
  render(<SnippetLibrary isOpen onClose={onClose} onSelectSnippet={onSelectSnippet} currentLanguage="kingsejong" />);
  return { onSelectSnippet, onClose };
}

function addSnippet(title: string, code: string, tags = '') {
  fireEvent.click(screen.getByRole('button', { name: 'New snippet', hidden: true }));
  const form = screen.getByRole('form', { name: 'New snippet', hidden: true });
  fireEvent.change(within(form).getByLabelText(/^Title/), { target: { value: title } });
  fireEvent.change(within(form).getByLabelText(/^Code/), { target: { value: code } });
  fireEvent.change(within(form).getByLabelText(/^Tags/), { target: { value: tags } });
  fireEvent.submit(form);
}

describe('SnippetLibrary', () => {
  it('starts empty, saves a snippet with tags and inserts it', () => {
    const { onSelectSnippet, onClose } = open();
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('No snippets yet');
    addSnippet('Greeting', '출력("안녕")', ' hello, , demo ');
    expect(screen.queryByRole('form', { hidden: true })).toBeNull();
    const tags = screen.getByRole('list', { name: 'Tags (comma separated)', hidden: true });
    expect(within(tags).getAllByRole('listitem', { hidden: true }).map((li) => li.textContent)).toEqual(['hello', 'demo']);
    fireEvent.click(screen.getByRole('button', { name: 'Insert Greeting into the editor', hidden: true }));
    expect(onSelectSnippet).toHaveBeenCalledWith('출력("안녕")');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows why a snippet could not be saved', () => {
    open();
    addSnippet('Blank', '   ');
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(/^Could not save the snippet: /);
  });

  it('favorites, filters, searches and deletes', () => {
    open();
    addSnippet('Alpha', 'a');
    addSnippet('Beta', 'b');
    fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to favorites', hidden: true }));
    expect(screen.getByRole('button', { name: 'Remove Alpha from favorites', hidden: true })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Filter snippets'), { target: { value: 'favorites' } });
    expect(screen.queryByText('Beta')).toBeNull();
    fireEvent.change(screen.getByLabelText('Filter snippets'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search snippets'), { target: { value: 'bet' } });
    expect(screen.queryByText('Alpha')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Beta', hidden: true }));
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('cancel closes the form without saving', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'New snippet', hidden: true }));
    const form = screen.getByRole('form', { name: 'New snippet', hidden: true });
    expect(within(form).getByRole('button', { name: 'Save', hidden: true })).toBeDisabled();
    fireEvent.click(within(form).getByRole('button', { name: 'Cancel', hidden: true }));
    expect(screen.queryByRole('form', { hidden: true })).toBeNull();
  });
});

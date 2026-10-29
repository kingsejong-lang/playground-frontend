import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

let shouldThrow = true;
function Bomb({ value }: { value: unknown }) {
  if (shouldThrow) throw value;
  return <p>recovered</p>;
}

describe('ErrorBoundary', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    shouldThrow = true;
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it('shows the error and recovers on retry', () => {
    render(
      <ErrorBoundary>
        <Bomb value={new TypeError('boom')} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('TypeError: boom')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('[ErrorBoundary] Caught error:', expect.objectContaining({ error: expect.objectContaining({ message: 'boom' }) }));
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('wraps thrown non-Error values', () => {
    function Wrapper() {
      const [v] = useState('plain string');
      return <Bomb value={v} />;
    }
    render(
      <ErrorBoundary>
        <Wrapper />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error: plain string')).toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Code, ConnectError } from '@connectrpc/connect';
import { AuthService } from '@kingsejong-lang/playground-proto';
import type { ReactNode } from 'react';
import { rpcWrapper } from '@/test/rpc';
import { AuthProvider, useAuth } from '../AuthContext';
import AuthModal from '../AuthModal';

const user = { id: 'u1', email: 'sejong@example.com', displayName: '세종' };

function setup(impl: Partial<Record<'getSession' | 'login' | 'register' | 'logout', (...a: never[]) => unknown>> = {}) {
  const calls = {
    getSession: vi.fn(impl.getSession ?? (() => { throw new ConnectError('anon', Code.Unauthenticated); })),
    login: vi.fn(impl.login ?? (() => ({ user }))),
    register: vi.fn(impl.register ?? ((req: { displayName: string; email: string }) => ({ user: { ...user, displayName: req.displayName, email: req.email } }))),
    logout: vi.fn(impl.logout ?? (() => ({}))),
  };
  const { wrapper: Rpc } = rpcWrapper(({ service }) => service(AuthService, calls as never));
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Rpc>
        <AuthProvider>{children}</AuthProvider>
      </Rpc>
    );
  }
  return { Wrapper, calls };
}

function Who() {
  const { user: u, isLoading, logout } = useAuth();
  return (
    <div>
      <span data-testid="who">{isLoading ? 'loading' : (u?.name ?? 'anonymous')}</span>
      <button onClick={() => void logout()}>out</button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('starts anonymous when there is no session and signed in when there is one', async () => {
    const anon = setup();
    const { unmount } = render(<Who />, { wrapper: anon.Wrapper });
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('anonymous'));
    unmount();
    const signedIn = setup({ getSession: () => ({ user }) });
    render(<Who />, { wrapper: signedIn.Wrapper });
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('세종'));
  });

  it('clears the user on logout even when the server call fails', async () => {
    const { Wrapper } = setup({ getSession: () => ({ user }), logout: () => { throw new ConnectError('down', Code.Unavailable); } });
    render(<Who />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('세종'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'out' })));
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous');
  });

  it('outside a provider behaves as signed out', () => {
    render(<Who />);
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous');
  });
});

describe('AuthModal', () => {
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it('signs in and closes', async () => {
    const { Wrapper, calls } = setup();
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} />, { wrapper: Wrapper });
    fill('Email', 'sejong@example.com');
    fill('Password', 'secret');
    await act(async () => fireEvent.submit(screen.getByRole('button', { name: 'Sign in', hidden: true }).closest('form')!));
    expect(calls.login).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('says "invalid email or password" for a refused sign-in', async () => {
    const { Wrapper } = setup({ login: () => { throw new ConnectError('bad', Code.Unauthenticated); } });
    render(<AuthModal isOpen onClose={vi.fn()} />, { wrapper: Wrapper });
    fill('Email', 'sejong@example.com');
    fill('Password', 'wrong');
    await act(async () => fireEvent.submit(screen.getByLabelText('Email').closest('form')!));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('Invalid email or password');
  });

  it('registers with a name and validates the request before sending', async () => {
    const { Wrapper, calls } = setup();
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'No account yet? Create one', hidden: true }));
    fill('Name', '세종');
    fill('Email', 'not-an-email');
    fill('Password', 'correct-horse-battery');
    await act(async () => fireEvent.submit(screen.getByLabelText('Email').closest('form')!));
    expect(calls.register).not.toHaveBeenCalled();
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('The request is invalid');
    fill('Email', 'sejong@example.com');
    await act(async () => fireEvent.submit(screen.getByLabelText('Email').closest('form')!));
    expect(calls.register).toHaveBeenCalledWith(expect.objectContaining({ displayName: '세종' }), expect.anything());
    expect(onClose).toHaveBeenCalled();
  });

  it('requires a name when registering', async () => {
    const { Wrapper, calls } = setup();
    render(<AuthModal isOpen onClose={vi.fn()} initialMode="register" />, { wrapper: Wrapper });
    fill('Email', 'sejong@example.com');
    fill('Password', 'correct-horse-battery');
    await act(async () => fireEvent.submit(screen.getByLabelText('Email').closest('form')!));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('Name is required');
    expect(calls.register).not.toHaveBeenCalled();
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Code, ConnectError } from '@connectrpc/connect';
import { LanguageService } from '@kingsejong-lang/playground-proto';
import { rpcWrapper } from '@/test/rpc';
import { TemplateGallery } from '../TemplateGallery';

function setup(routes: Record<string, (...args: never[]) => unknown>) {
  const { wrapper } = rpcWrapper(({ service }) => service(LanguageService, routes as never));
  const onClose = vi.fn();
  const onSelectTemplate = vi.fn();
  render(<TemplateGallery isOpen onClose={onClose} selectedLanguage="kingsejong" onSelectTemplate={onSelectTemplate} />, { wrapper });
  return { onClose, onSelectTemplate };
}

const list = () => ({ templates: [{ id: 'hello', languageId: 'kingsejong', title: 'Hello', description: 'Say hi' }, { id: 'loops', languageId: '', title: 'Loops' }] });

describe('TemplateGallery', () => {
  it('lists templates and loads the chosen one into the editor', async () => {
    const getTemplate = vi.fn((req: { languageId: string; templateId: string }) => ({
      template: { id: req.templateId, entryFile: 'main.ksj', files: { files: [{ path: 'lib.ksj', content: 'lib' }, { path: 'main.ksj', content: `출력("${req.templateId}")` }] } },
    }));
    const { onClose, onSelectTemplate } = setup({ listTemplates: list, getTemplate });
    expect(screen.getByLabelText('Loading templates…')).toHaveAttribute('aria-busy', 'true');
    const loops = await screen.findByRole('button', { name: /Loops/, hidden: true });
    expect(screen.getByText('Say hi')).toBeInTheDocument();
    await act(async () => fireEvent.click(loops));
    // A template without its own language id is fetched for the selected language.
    expect(getTemplate).toHaveBeenCalledWith(expect.objectContaining({ languageId: 'kingsejong', templateId: 'loops' }), expect.anything());
    expect(onSelectTemplate).toHaveBeenCalledWith({
      files: [
        { name: 'lib.ksj', content: 'lib' },
        { name: 'main.ksj', content: '출력("loops")' },
      ],
      entryFile: 'main.ksj',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty state', async () => {
    setup({ listTemplates: () => ({ templates: [] }) });
    expect(await screen.findByText('No templates for this language yet.')).toBeInTheDocument();
  });

  it('explains list and load failures and keeps the dialog open', async () => {
    const { onClose } = setup({
      listTemplates: list,
      getTemplate: () => {
        throw new ConnectError('gone', Code.NotFound);
      },
    });
    const hello = await screen.findByRole('button', { name: /Hello/, hidden: true });
    await act(async () => fireEvent.click(hello));
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(/^Could not load the template\. /);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a failed listing', async () => {
    setup({
      listTemplates: () => {
        throw new ConnectError('down', Code.Internal);
      },
    });
    await waitFor(() => expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(/^Could not load the template list\. /));
    expect(screen.queryByText('No templates for this language yet.')).toBeNull();
  });
});

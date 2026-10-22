import { fireEvent, screen } from '@testing-library/react';

/**
 * Abre o ActionsMenu de uma linha e clica no item. O dropdown (Radix) abre com Enter no gatilho — no jsdom o clique
 * simples não dispara o pointerdown que o Radix espera. Com uma ação só o ActionsMenu mostra o botão direto: use
 * `fireEvent.click` nesse caso.
 */
export async function acionarMenu(gatilho: RegExp | string, item: RegExp | string, indice = 0): Promise<void> {
  const gatilhos = await screen.findAllByRole('button', { name: gatilho });
  fireEvent.keyDown(gatilhos[indice], { key: 'Enter' });
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

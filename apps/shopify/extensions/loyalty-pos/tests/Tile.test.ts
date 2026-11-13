// @vitest-environment jsdom
/// <reference types="@shopify/ui-extensions/pos.home.tile.render" />
// The tile on the POS home screen, run in Shopify's extension tester.
import { fireEvent, waitFor } from '@testing-library/preact';
import { getExtension } from '@shopify/ui-extensions-tester';
import { render } from 'preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const extension = getExtension('pos.home.tile.render');

beforeEach(() => {
  extension.setUp();
});

afterEach(() => {
  render(null, document.body);
  extension.tearDown();
});

test('shows the Bro Batch Rewards tile', async () => {
  await extension.render();

  const tile = document.body.querySelector('s-tile');
  expect(tile?.getAttribute('heading')).toBe('Bro Batch Rewards');
  expect(tile?.getAttribute('subheading')).toBe('Scan a member · apply a reward');
});

test('tapping the tile opens the rewards screen', async () => {
  const presentModal = vi.fn();
  extension.shopify.action.presentModal = presentModal;
  await extension.render();

  const tile = document.body.querySelector('s-tile');
  if (!tile) throw new Error('no tile rendered');
  fireEvent.click(tile);

  await waitFor(() => {
    expect(presentModal).toHaveBeenCalledTimes(1);
  });
});

// Tells TypeScript what the `shopify` global is inside each screen: the API
// Shopify POS provides for that screen's target. Same layout as the file
// Shopify CLI generates for a new extension.
import '@shopify/ui-extensions';

// @ts-expect-error Shopify declares the global per screen file this way; TypeScript objects to the relative module name.
declare module './src/Tile.tsx' {
  const shopify: import('@shopify/ui-extensions/pos.home.tile.render').Api;
  const globalThis: { shopify: typeof shopify };
}

// @ts-expect-error Shopify declares the global per screen file this way; TypeScript objects to the relative module name.
declare module './src/Modal.tsx' {
  const shopify: import('@shopify/ui-extensions/pos.home.modal.render').Api;
  const globalThis: { shopify: typeof shopify };
}

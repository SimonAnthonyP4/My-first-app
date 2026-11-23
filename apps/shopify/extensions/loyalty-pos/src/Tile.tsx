// The tile on the Shopify POS home screen. Tapping it opens the rewards screen.
import { render } from 'preact';

export default async () => {
  render(<Tile />, document.body);
};

function Tile() {
  return (
    <s-tile
      heading="Bro Batch Rewards"
      subheading="Scan a member · apply a reward"
      onClick={() => {
        shopify.action.presentModal();
      }}
    />
  );
}

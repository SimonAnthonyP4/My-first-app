import { handleShopifyWebhook } from '../_shared/handlers/shopify_webhook.ts';
import { serveWebhook } from '../_shared/runtime.ts';

serveWebhook(handleShopifyWebhook);

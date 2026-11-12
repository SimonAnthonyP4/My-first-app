import { handleStripeWebhook } from '../_shared/handlers/stripe_webhook.ts';
import { serveWebhook } from '../_shared/runtime.ts';

serveWebhook(handleStripeWebhook);

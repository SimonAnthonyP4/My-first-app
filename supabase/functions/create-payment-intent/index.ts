import { handleCreatePaymentIntent } from '../_shared/handlers/create_payment_intent.ts';
import { serve } from '../_shared/runtime.ts';

serve(handleCreatePaymentIntent);

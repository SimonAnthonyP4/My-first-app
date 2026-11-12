import { handleProcessRefund } from '../_shared/handlers/process_refund.ts';
import { serve } from '../_shared/runtime.ts';

serve(handleProcessRefund);

/**
 * Zod configured for a strict CSP: `jitless` skips the `new Function` probe that
 * a CSP without 'unsafe-eval' reports as a violation. Import `z` from here.
 */
import { z } from 'zod';

z.config({ jitless: true });

export { z };

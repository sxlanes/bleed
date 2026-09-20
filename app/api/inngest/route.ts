import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { auditLoop } from "../../../inngest/functions/audit-loop";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    auditLoop,
  ],
});

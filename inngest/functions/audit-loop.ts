import { inngest } from "../../lib/inngest/client";
import { auditUrl } from "../../lib/recon";

export const auditLoop = inngest.createFunction(
  { id: "audit-loop" },
  { event: "audit.requested" },
  async ({ event, step }) => {
    const { url } = event.data;

    // Simulate waiting 24 hours
    await step.sleep("wait-24h", "24h");

    // Call auditUrl to re-evaluate if the client has solved the leaks
    const result = await step.run("re-evaluate-leaks", async () => {
      return await auditUrl(url);
    });

    return result;
  }
);

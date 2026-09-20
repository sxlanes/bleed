import { inngest } from "../../lib/inngest/client";
import { auditUrl } from "../../lib/recon";

export const auditLoop = inngest.createFunction(
  { id: "audit-loop", triggers: [{ event: "audit.requested" }] },
  async ({ event, step }) => {
    const url = event.data?.url;

    if (!url) {
      throw new Error("No URL provided in event.data.url");
    }

    // Simulate waiting 24 hours
    await step.sleep("wait-24h", "24h");

    // Call auditUrl to re-evaluate if the client has solved the leaks
    const result = await step.run("re-evaluate-leaks", async () => {
      return await auditUrl(url);
    });

    return result;
  }
);

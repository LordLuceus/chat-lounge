import { env } from "$env/dynamic/public";
import { importChat } from "$lib/server/conversations-service";
import { Realtime } from "ably";
import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

// Initialize Redis
const redis = new IORedis({
  host: "valkey-server",
  port: 6379,
  maxRetriesPerRequest: null
});

export const importQueue = new Queue("import-queue", { connection: redis });

let ablyRealtime: Realtime | null = null;
export function getAblyRealtime() {
  if (!ablyRealtime) {
    const ablyApiKey = env.PUBLIC_ABLY_API_KEY;

    if (ablyApiKey) {
      // Check that API key is present
      ablyRealtime = new Realtime({ key: ablyApiKey });
      ablyRealtime.connection.once("connected", () => {
        console.log("Connected to Ably");
      });
    } else {
      console.warn("Ably API key is not set. Ably connection will not be established.");
    }
  }
  return ablyRealtime;
}

ablyRealtime = getAblyRealtime();

// Instantiate QueueEvents for listening to job events
const queueEvents = new QueueEvents("import-queue", { connection: redis });

// Worker definition to process jobs
new Worker(
  "import-queue",
  async (job) => {
    const { data, conversationId, userId, modelId } = job.data;
    await importChat(conversationId, userId, modelId, data, (progress) => {
      job.updateProgress(progress);
    });
  },
  { connection: redis }
);

// Listen for various job lifecycle events
queueEvents.on("completed", async ({ jobId }) => {
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  // For completed events, publish completion to relevant channel
  ablyRealtime?.channels.get(`import-${conversationId}`).publish("completed", { jobId });
});

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  // Handle job failure
  ablyRealtime?.channels
    .get(`import-${conversationId}`)
    .publish("failed", { jobId, error: failedReason });
});

queueEvents.on("progress", async ({ jobId, data }) => {
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  // Publish progress to relevant channel
  ablyRealtime?.channels
    .get(`import-${conversationId}`)
    .publish("progress", { jobId, progress: data });
});

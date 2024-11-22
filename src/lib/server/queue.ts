import { PUBLIC_ABLY_API_KEY } from "$env/static/public";
import { importChat } from "$lib/server/conversations-service";
import { Realtime } from "ably";
import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

// Initialize Redis
const redis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null
});

export const importQueue = new Queue("import-queue", { connection: redis });

// Connect to Ably once
const ablyRealtime = new Realtime({ key: PUBLIC_ABLY_API_KEY });
await ablyRealtime.connection.once("connected", () => {
  console.log("Connected to Ably");
});

// Instantiate QueueEvents for listening to job events
const queueEvents = new QueueEvents("import-queue", { connection: redis });

// Worker definition to process jobs
new Worker(
  "import-queue",
  async (job) => {
    const { data, conversationId, userId, modelId } = job.data;
    console.log("Processing job", job.id);
    await importChat(conversationId, userId, modelId, data, (progress) => {
      job.updateProgress(progress);
      console.log("Progress", job.id, progress);
    });
    console.log("Job completed", job.id);
  },
  { connection: redis }
);

// Listen for various job lifecycle events
queueEvents.on("completed", async ({ jobId }) => {
  console.log("Job completed", jobId);
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  // For completed events, publish completion to relevant channel
  ablyRealtime.channels.get(`import-${conversationId}`).publish("completed", { jobId });
});

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  console.log("Job failed", jobId, failedReason);
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  // Handle job failure
  ablyRealtime.channels
    .get(`import-${conversationId}`)
    .publish("failed", { jobId, error: failedReason });
});

queueEvents.on("progress", async ({ jobId, data }) => {
  console.log("Global progress event", jobId, data);
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  // Publish progress to relevant channel
  ablyRealtime.channels
    .get(`import-${conversationId}`)
    .publish("progress", { jobId, progress: data });
});

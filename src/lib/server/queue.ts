import { env } from "$env/dynamic/private";
import { importChat } from "$lib/server/conversations-service";
import { getIo, removeProgress, setProgress } from "$lib/server/socket";
import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

// Initialize Redis
const redis = new IORedis({
  host: "valkey-server",
  port: 6379,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});

export const importQueue = new Queue("import-queue", { connection: redis });

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

  setProgress(conversationId, 100);
  const io = getIo();
  if (io) {
    io.to(`import-${conversationId}`).emit("completed", { jobId });
  } else {
    console.warn(
      `[socket.io] emit skipped: 'completed' for import-${conversationId}, io not initialized`
    );
  }
  removeProgress(conversationId);
});

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  removeProgress(conversationId);
  const io = getIo();
  if (io) {
    io.to(`import-${conversationId}`).emit("failed", { jobId, error: failedReason });
  } else {
    console.warn(
      `[socket.io] emit skipped: 'failed' for import-${conversationId}, io not initialized`
    );
  }
});

queueEvents.on("progress", async ({ jobId, data }) => {
  const job = await importQueue.getJob(jobId);
  const { conversationId } = job.data;

  setProgress(conversationId, data as number);
  const io = getIo();
  if (io) {
    io.to(`import-${conversationId}`).emit("progress", { jobId, progress: data });
  } else {
    console.warn(
      `[socket.io] emit skipped: 'progress' for import-${conversationId}, io not initialized`
    );
  }
});

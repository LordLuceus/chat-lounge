import { createServer } from "http";
import { Server } from "socket.io";

// In-memory mapping of import progress per conversation
const importProgressMap = new Map<string, number>();

// Create a dedicated HTTP server for Socket.io
const httpServer = createServer();
// You can choose any port; default to 4001 or use SOCK_PORT env var
const SOCKET_PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT) : 4001;

// Initialize Socket.io on the HTTP server
export const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Listen for client connections
io.on('connection', (socket) => {
  socket.on('join-import-room', (conversationId: string) => {
    socket.join(`import-${conversationId}`);
    const progress = importProgressMap.get(conversationId);
    if (progress !== undefined) {
      socket.emit('progress', { progress });
    }
  });
});

// Start listening
httpServer.listen(SOCKET_PORT, () => {
  console.log(`[socket.io] listening on port ${SOCKET_PORT}`);
});

/**
 * Returns the Socket.io server instance.
 */
export function getIo(): Server {
  return io;
}

/**
 * Updates the in-memory progress for a conversation.
 */
export function setProgress(conversationId: string, progress: number) {
  importProgressMap.set(conversationId, progress);
}

/**
 * Clears the stored progress for a conversation.
 */
export function removeProgress(conversationId: string) {
  importProgressMap.delete(conversationId);
}
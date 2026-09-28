require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const algorithmRoutes = require("./routes/algorithms");
const analyticsRoutes = require("./routes/analytics");
const simulationRoutes = require("./routes/simulations");
const executionRoutes = require("./routes/execution");
const authRoutes = require("./routes/auth");
const errorHandler = require("./middleware/errorHandler");
const { requireCsrfHeader } = require("./middleware/csrf");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// FRONTEND_ORIGIN should be set in production (e.g. your Vercel URL). Falling back to
// the local Vite dev server keeps `npm run dev` working out of the box. Hardcoding this
// to localhost was the bug: it silently blocked Socket.io connections from any deployed
// frontend, since the browser's origin no longer matched.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// SECURITY NOTE: this used to be a bare cors() with no origin option - any website's
// client-side JS could call this API directly from a visitor's browser. Locking it to
// FRONTEND_ORIGIN closes that off while still allowing local curl/Postman testing
// (requests with no Origin header, like server-to-server calls, aren't blocked by CORS).
// `credentials: true` is required so the browser will send/receive the HttpOnly auth
// cookie (see authController.js) on cross-port requests during local dev.
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Applies to every route below: blocks state-changing requests missing our
// custom header (see middleware/csrf.js for why that stops CSRF here).
app.use(requireCsrfHeader);

// RATE LIMITING: /api/execute and /api/algorithms were public POST endpoints with zero
// throttling - nothing stopped a script from hammering either one, running up Mongo
// Atlas usage or burying real analytics under junk data. 100 requests / 15 min per IP
// is generous for a human clicking through the UI, but shuts down a naive loop.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests - please slow down." },
});
app.use("/api/execute", apiLimiter);
app.use("/api/algorithms", apiLimiter);
app.use("/api/auth", apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/algorithms', algorithmRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/api/simulations", simulationRoutes);
app.use("/api/execute", executionRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);

// SECURITY NOTE: previously join-room accepted any roomId with zero validation
// and send-operation broadcast to any roomId a client named, whether or not
// that socket had ever joined it - so any connected client could join, or
// blind-broadcast into, an arbitrary room it guessed or brute-forced, and the
// operation payload itself (type/value/size) was never checked before being
// relayed to every other member. True server-authorized room membership would
// tie roomId to an authenticated session; short of that (this is a
// collaborative session code, not an account-scoped resource), we now at
// least: validate the roomId shape, require a socket to have actually joined
// a room before it can broadcast into it, cap payload size, and throttle
// events per connection so one client can't flood a room or the server.
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_OPERATION_LENGTH = 100;
const MAX_VALUE_LENGTH = 500;
const SOCKET_EVENT_WINDOW_MS = 10 * 1000;
const SOCKET_EVENT_LIMIT = 60; // per socket, per window, across join-room + send-operation

function isValidRoomId(roomId) {
  return typeof roomId === "string" && ROOM_ID_PATTERN.test(roomId);
}

function withinRateLimit(socket) {
  const now = Date.now();
  if (!socket.data.eventTimestamps) socket.data.eventTimestamps = [];
  socket.data.eventTimestamps = socket.data.eventTimestamps.filter(
    (t) => now - t < SOCKET_EVENT_WINDOW_MS
  );
  if (socket.data.eventTimestamps.length >= SOCKET_EVENT_LIMIT) return false;
  socket.data.eventTimestamps.push(now);
  return true;
}

io.on("connection", (socket) => {
  console.log("SYSTEM: New terminal connected:", socket.id);
  socket.data.joinedRooms = new Set();

  socket.on("join-room", (roomId) => {
    if (!withinRateLimit(socket)) return;
    if (!isValidRoomId(roomId)) {
      socket.emit("operation-error", { message: "Invalid room id." });
      return;
    }
    socket.join(roomId);
    socket.data.joinedRooms.add(roomId);
    console.log(`SYSTEM: Terminal ${socket.id} joined secure channel [${roomId}]`);
    socket.to(roomId).emit("user-joined", { message: "A new engineer has joined the lab." });
  });

  socket.on("send-operation", (data) => {
    if (!withinRateLimit(socket)) return;

    const roomId = data && data.roomId;
    const operation = data && data.operation;
    const value = data && data.value;

    if (!isValidRoomId(roomId) || !socket.data.joinedRooms.has(roomId)) {
      socket.emit("operation-error", { message: "You must join a valid room before sending operations." });
      return;
    }
    if (typeof operation !== "string" || operation.length === 0 || operation.length > MAX_OPERATION_LENGTH) {
      socket.emit("operation-error", { message: "Invalid operation." });
      return;
    }
    if (value !== undefined && value !== null) {
      const valueStr = typeof value === "string" ? value : JSON.stringify(value);
      if (valueStr.length > MAX_VALUE_LENGTH) {
        socket.emit("operation-error", { message: "Operation value too large." });
        return;
      }
    }

    console.log(`BROADCAST to [${roomId}]: ${operation} ${value ?? ""}`.trim());
    socket.to(roomId).emit("receive-operation", { roomId, operation, value });
  });

  socket.on("disconnect", () => {
    console.log("SYSTEM: Terminal disconnected:", socket.id);
  });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required (used to sign login tokens).');
    }
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server and WebSockets running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

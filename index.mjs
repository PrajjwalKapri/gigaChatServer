import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { corsOptions } from "./constants/config.mjs";

import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constants/events.mjs";
import { getSockets } from "./lib/helper.mjs";
import { socketAuth } from "./middlewares/authenticate.mjs";
import { errorHandlerMiddleware } from "./middlewares/error.mjs";
import Message from "./models/message.models.mjs";
import adminRoute from "./routes/admin.routes.mjs";
import chatRoute from "./routes/chat.routes.mjs";
import userRoute from "./routes/users.routes.mjs";
import dbConnect from "./utils/dbConnect.mjs";

dotenv.config({
  path: "./.env",
});

const app = express();
dbConnect();
app.use(cors(corsOptions));

const PORT = process.env.PORT || 3000;
export const adminSecretKey = process.env.ADMIN_SECRET_KEY || "admin";
export const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";

const server = createServer(app);
const io = new Server(server, { cors: corsOptions });
app.set("io", io);

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.SECRET,
});

app.use(express.json());
app.use(cookieParser());

// Endpoint to handle ping requests (if needed)

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

// // Static files
// const staticPath = path.join(__dirname, "client/dist");
// app.use(express.static(staticPath));

// // Serve index.html for all other routes
// app.get("*", function (_, resp) {
//   resp.sendFile(path.join(staticPath, "index.html"), function (err) {
//     if (err) {
//       resp.status(500).send(err);
//     }
//   });
// });

app.get("/", (req, res) => {
  res.send("This is the backend of gigaChat, a real time chat application");
});

export const userSocketIds = new Map();
const onlineUsers = new Set();
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuth(err, socket, next);
  });
});

io.on("connection", (socket) => {
  const user = socket.user;

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    userSocketIds.set(user._id.toString(), socket.id);

    const membersSocket = getSockets(members);

    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    userSocketIds.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

app.use(errorHandlerMiddleware);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT} in ${envMode} mode`);
});

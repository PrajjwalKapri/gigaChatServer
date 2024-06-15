import express from "express";
import {
  adminLogin,
  adminLogout,
  allChats,
  allMessages,
  allUsers,
  getAdminData,
  getDashboardStats,
} from "../controllers/admin.controller.mjs";
import { adminLoginValidator, validateHandler } from "../lib/validators.mjs";
import { adminOnly } from "../middlewares/authenticate.mjs";
const app = express.Router();

app.post("/verify", adminLoginValidator(), validateHandler, adminLogin);
app.get("/logout", adminLogout);

app.use(adminOnly);

// only admin can access these routes

app.get("/", getAdminData);
app.get("/users", allUsers);
app.get("/chats", allChats);
app.get("/messages", allMessages);

app.get("/stats", getDashboardStats);

export default app;

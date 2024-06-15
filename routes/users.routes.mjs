import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getNotifications,
  getUserProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
} from "../controllers/user.controllers.mjs";
import { isAuthenticated } from "../middlewares/authenticate.mjs";
import { singleAvatar } from "../middlewares/multer.mjs";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  searchUserValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/validators.mjs";
const app = express.Router();

app.post("/new", singleAvatar, newUser);
app.post("/login", loginValidator(), validateHandler, login);

// after the above routes user must be logged in already

app.use(isAuthenticated);

app.get("/me", getUserProfile);
app.get("/logout", logout);
app.get("/search", searchUserValidator(), validateHandler, searchUser);
app.put(
  "/sendRequest",
  sendRequestValidator(),
  validateHandler,
  sendFriendRequest
);
app.put(
  "/acceptRequest",
  acceptRequestValidator(),
  validateHandler,
  acceptFriendRequest
);

app.get("/notifications", getNotifications);
app.get("/friends", getMyFriends);

export default app;

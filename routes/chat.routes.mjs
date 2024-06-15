import express from "express";
import { isAuthenticated } from "../middlewares/authenticate.mjs";
import {
  addMember,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMember,
  renameChat,
  sendAttachments,
} from "../controllers/chat.controllers.mjs";
import { attachmentMulter } from "../middlewares/multer.mjs";
import {
  addMemberValidator,
  chatIdValidator,
  newGroupValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachmentsValidator,
  validateHandler,
} from "../lib/validators.mjs";
const app = express.Router();

app.use(isAuthenticated);

app.post("/new", newGroupValidator(), validateHandler, newGroupChat);
app.get("/my", getMyChats);
app.get("/my/groups", getMyGroups);
app.put("/addMembers", addMemberValidator(), validateHandler, addMember);
app.put(
  "/removeMember",
  removeMemberValidator(),
  validateHandler,
  removeMember
);
app.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);
app.post(
  "/message",
  attachmentMulter,
  sendAttachmentsValidator(),
  validateHandler,
  sendAttachments
);

app.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

app
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetails)
  .put(renameValidator(), validateHandler, renameChat)
  .delete(chatIdValidator(), validateHandler, deleteChat);
export default app;

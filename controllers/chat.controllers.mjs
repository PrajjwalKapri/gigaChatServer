import { tryCatch } from "../middlewares/error.mjs";
import { ErrorHandler } from "../utils/utility.mjs";
import Chat from "../models/chat.models.mjs";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadToCloudinary,
} from "../utils/features.mjs";
import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.mjs";
import { getOtherMember } from "../lib/helper.mjs";
import { ne } from "@faker-js/faker";
import User from "../models/user.models.mjs";
import Message from "../models/message.models.mjs";
const newGroupChat = tryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  if (members.length < 2) {
    return next(
      new ErrorHandler("Group chat must have atleast 3 members", 400)
    );
  }
  const allMembers = [...members, req.user._id];
  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, { message: `Welcome to ${name} group` });
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Chat Created",
  });
});

const getMyChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name username avatar"
  );

  const transformedChats = chats.map(({ _id, groupChat, name, members }) => {
    const otherMember = getOtherMember(members, req.user._id);

    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user._id.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });
  return res.status(200).json({
    success: true,
    message: transformedChats,
  });
});

const getMyGroups = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    creator: req.user._id,
  }).populate("members", "name avatar");
  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  res.status(200).json({
    status: true,
    groups,
  });
});

const addMember = tryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat.groupChat) return next(new ErrorHandler("Not a group Chat", 400));

  if (chat.creator.toString() !== req.user._id.toString())
    return next(new ErrorHandler("You are not a creator", 403));

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueMembers = allNewMembers.filter(
    (i) => !chat.members.includes(i._id.toString())
  );
  chat.members.push(...uniqueMembers.map((i) => i._id));

  if (chat.members.length > 100)
    return next(new ErrorHandler("Group members limit reached", 400));

  await chat.save();
  const allUsersName = allNewMembers.map((i) => i.name).join(",");
  emitEvent(req, ALERT, chat.members, {
    message: `${allUsersName} have been added to ${chat.name} group`,
    chatId,
  });

  emitEvent(req, REFETCH_CHATS, chat.members);
  res.status(200).json({
    status: true,
    message: "Members added successfully",
  });
});

const removeMember = tryCatch(async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (userId.toString() === req.user._id.toString())
    return next(new ErrorHandler("Cannot remove yourself", 400));
  const chat = await Chat.findById(chatId);
  const user = await User.findById(userId, "name");

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat) return next(new ErrorHandler("Not a group Chat", 400));

  if (chat.creator.toString() !== req.user._id.toString())
    return next(new ErrorHandler("You are not a creator", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Group must have atleast 3 members"));

  const allChatMembers = chat.members.map((member) => member.toString());

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();

  const userRemoved = user;

  emitEvent(req, ALERT, chat.members, {
    message: `${userRemoved.name} has been removed from the group`,
    chatId,
  });

  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});

const leaveGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat) return next(new ErrorHandler("Not a group Chat", 400));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user._id.toString()
  );

  if (remainingMembers.length < 3)
    return next(new ErrorHandler("Group must have atleast 3 members"));

  if (chat.creator.toString() === req.user._id.toString()) {
    const randomUser = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomUser];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  await chat.save();

  emitEvent(req, ALERT, chat.members, {
    message: `${req.user.name} has left the group`,
    chatId,
  });

  res.status(200).json({
    status: true,
    message: "You left the group",
  });
});

const sendAttachments = tryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("Please upload attachments", 400));

  if (files.length > 5)
    return next(new ErrorHandler("Files cannot be more than 5", 400));

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user._id, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (files.length < 1)
    return next(new ErrorHandler("Please provide attachments", 400));

  // upload files

  const attachments = await uploadToCloudinary(files);
  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };
  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
  res.status(200).json({
    status: true,
    message,
  });
});

const getChatDetails = tryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  const { name } = req.body;

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user._id.toString())
    return next(
      new ErrorHandler("Cannot change name, you are not a creator", 400)
    );

  chat.name = name;

  chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);
  res.status(200).json({
    status: true,
    message: `Name changed to ${name} successfully`,
  });
});

const deleteChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (chat.groupChat && chat.creator.toString() !== req.user._id.toString())
    return next(
      new ErrorHandler("You are not allowed to delete the group", 400)
    );

  if (chat.groupChat && !chat.members.includes(req.user._id.toString()))
    return next(
      new ErrorHandler("Cannot delete group, you are not in the group", 400)
    );

  // here we have to delete all messages attachments and files from cloudinary

  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messageWithAttachments.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id))
  );

  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    status: true,
    message: "Chat deleted Successfully",
  });
});

const getMessages = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user._id.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat", 403)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / resultPerPage);

  res.status(200).json({
    success: true,
    message: messages.reverse(),
    totalPages,
  });
});

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMember,
  removeMember,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameChat,
  deleteChat,
  getMessages,
};

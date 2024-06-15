import jwt from "jsonwebtoken";
import { tryCatch } from "../middlewares/error.mjs";
import Chat from "../models/chat.models.mjs";
import Message from "../models/message.models.mjs";
import User from "../models/user.models.mjs";
import { cookieOptions } from "../utils/features.mjs";
import { ErrorHandler } from "../utils/utility.mjs";
const adminLogin = tryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "admin";
  const isMatched = secretKey === adminSecretKey;

  if (!isMatched)
    return next(new ErrorHandler("Invalid Admin Secret Key", 401));

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res
    .status(200)
    .cookie("gigaChat-admin-jwt-token", token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 30,
    })
    .json({
      success: true,
      message: "Authenticated Successfully, welcome Admin!",
    });
});
const adminLogout = tryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("gigaChat-admin-jwt-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged out Successfully, See you later Admin!",
    });
});

const allUsers = tryCatch(async (req, res, next) => {
  const users = await User.find({});

  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    success: true,
    data: transformedUsers,
  });
});

const allChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });

      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map((member) => {
          return {
            _id: member._id,
            name: member.name,
            avatar: member.avatar.url,
          };
        }),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },

        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  return res.status(200).json({
    success: true,
    data: transformedChats,
  });
});

const allMessages = tryCatch(async (req, res, next) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

const getDashboardStats = tryCatch(async (req, res, next) => {
  const [groupsCount, usersCount, messagesCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const last7DaysMesssages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt");

  const messages = new Array(7).fill(0);

  const dayInMiliseconds = 1000 * 60 * 60 * 24;
  last7DaysMesssages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;

    const index = Math.floor(indexApprox);

    messages[6 - index]++;
  });

  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart: messages,
  };

  return res.status(200).json({
    success: true,
    stats,
  });
});

const getAdminData = tryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});

export {
  adminLogin,
  adminLogout,
  allChats,
  allMessages,
  allUsers,
  getAdminData,
  getDashboardStats,
};

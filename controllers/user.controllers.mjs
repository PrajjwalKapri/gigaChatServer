import pkg from "bcryptjs";
const { compareSync } = pkg;
import User from "../models/user.models.mjs";
import Chat from "../models/chat.models.mjs";
import Request from "../models/request.models.mjs";

import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadToCloudinary,
} from "../utils/features.mjs";
import { tryCatch } from "../middlewares/error.mjs";
import { ErrorHandler } from "../utils/utility.mjs";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.mjs";
import { getOtherMember } from "../lib/helper.mjs";

// create a new user, save it in DB and in Cookie

const newUser = tryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please upload avatar", 500));

  const result = await uploadToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const newUser = await User.create({
    name,
    username,
    password,
    avatar,
    bio,
  });

  sendToken(res, newUser, 201, `Welcome to gigaChat new user, ${name} `);
});
const login = tryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  if (!user) return next(new ErrorHandler("Username not found", 404));

  const isMatching = compareSync(password, user.password);

  if (!isMatching) return next(new Error("Invalid Password", 404));

  sendToken(res, user, 200, `Welcome to GigaChat ${user.name}`);
});

const getUserProfile = tryCatch(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

const logout = tryCatch(async (req, res, next) => {
  res
    .status(200)
    .cookie("GigaChat-jwt-cookie", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: `See you soon, ${req.user.name}`,
    });
});

const searchUser = tryCatch(async (req, res, next) => {
  const { name } = req.query;

  const myChats = await Chat.find({
    groupChat: false,
    members: req.user._id,
  });

  // allUsersFromMyChats means friends or people i have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends
    .map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }))
    .filter((user) => user._id.toString() !== req.user._id.toString());

  return res.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = tryCatch(async (req, res, next) => {
  const { userId } = req.body;

  const request = await Request.findOne({
    $or: [
      {
        sender: req.user._id,
        reciever: userId,
      },
      {
        sender: userId,
        reciever: req.user._id,
      },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user._id,
    reciever: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);
  res.status(200).json({
    success: true,
    message: "Friend Request sent",
  });
});

const acceptFriendRequest = tryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("reciever", "name");

  if (!request) return next(new ErrorHandler("Request not found", 400));

  if (request.reciever._id.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandler("You are not authorized to accept this request", 400)
    );
  }

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request rejected",
    });
  }

  const members = [
    request.sender._id.toString(),
    request.reciever._id.toString(),
  ];

  await Promise.all([
    await Chat.create({
      members,
      name: request.sender.name,
    }),

    await request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request accepted",
    senderId: request.sender._id,
  });
});

const getNotifications = tryCatch(async (req, res) => {
  const requests = await Request.find({ reciever: req.user._id }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests,
  });
});

const getMyFriends = tryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    groupChat: false,
    members: req.user._id,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user._id);
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export {
  login,
  newUser,
  getUserProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getNotifications,
  getMyFriends,
};

import User from "../models/user.models.mjs";
import { ErrorHandler } from "../utils/utility.mjs";
import { tryCatch } from "./error.mjs";
import jwt from "jsonwebtoken";
import { adminSecretKey } from "../index.mjs";

export const isAuthenticated = async (req, res, next) => {
  const token = req.cookies["GigaChat-jwt-cookie"];
  if (!token)
    return next(new ErrorHandler("Please login to access this route", 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  req.user = await User.findById(decodedData._id);
  next();
};

export const adminOnly = async (req, res, next) => {
  const token = req.cookies["gigaChat-admin-jwt-token"];
  if (!token)
    return next(
      new ErrorHandler("You must be an admin to access this route", 401)
    );

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);

  const isMatched = secretKey === adminSecretKey;

  if (!isMatched)
    return next(
      new ErrorHandler("You have to be an admin to access this route", 401)
    );

  next();
};

export const socketAuth = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies["GigaChat-jwt-cookie"];

    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if (!user) return next(new ErrorHandler("User not found", 404));

    socket.user = user;

    return next();
  } catch (error) {
    return next(new ErrorHandler("Please Login to access this route", 401));
  }
};

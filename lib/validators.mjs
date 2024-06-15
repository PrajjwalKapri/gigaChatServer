import { body, param, validationResult, query } from "express-validator";
import { ErrorHandler } from "../utils/utility.mjs";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");

  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMessages, 400));
};

const registerValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
  body("bio", "Please enter bio").notEmpty(),
];

const loginValidator = () => [
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];

const newGroupValidator = () => [
  body("name", "Please enter a group name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please enter members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100"),
];

const addMemberValidator = () => [
  body("chatId", "Please enter a chat ID").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please enter members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1-97"),
];

const removeMemberValidator = () => [
  body("chatId", "Please enter a chat ID").notEmpty(),
  body("userId", "Please enter a user ID").notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "Please enter a chat ID").notEmpty(),
];

const sendAttachmentsValidator = () => [
  body("chatId", "Please enter a chat ID").notEmpty(),
];

const chatIdValidator = () => [
  param("id", "Please enter a chat ID").notEmpty(),
];

const renameValidator = () => [
  param("id", "Please enter a chat ID").notEmpty(),
  body("name", "Please enter a new name"),
];

const sendRequestValidator = () => [body("userId", "Please enter a user ID")];
const acceptRequestValidator = () => [
  body("requestId").notEmpty().withMessage("Please enter a Request ID"),
  body("accept")
    .notEmpty()
    .withMessage("Please enter accept value")
    .isBoolean()
    .withMessage("Accept must be a boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Please enter the secret key").notEmpty(),
];
const searchUserValidator = () => [query("name", "Please enter a name")];

export {
  registerValidator,
  validateHandler,
  loginValidator,
  newGroupValidator,
  addMemberValidator,
  removeMemberValidator,
  leaveGroupValidator,
  sendAttachmentsValidator,
  chatIdValidator,
  renameValidator,
  sendRequestValidator,
  acceptRequestValidator,
  adminLoginValidator,
  searchUserValidator,
};

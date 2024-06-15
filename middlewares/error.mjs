import { envMode } from "../index.mjs";

const errorHandlerMiddleware = (err, req, res, next) => {
  err.message ||= "Internal server error";
  err.statusCode ||= 500;

  if (err.name === "CastError") {
    const path = err.path;
    err.message = `Invalid format of ${path}`;
    err.statusCode = 400;
  }

  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate field - ${error}`;
    err.statusCode = 400;
  }

  const response = {
    success: false,
    message: err.message,
  };
  if (envMode === "DEVELOPMENT") {
    response.error = err;
  }
  return res.status(err.statusCode).json(response);
};

const tryCatch = (wrappedFunction) => async (req, res, next) => {
  try {
    await wrappedFunction(req, res, next);
  } catch (error) {
    next(error);
  }
};
export { errorHandlerMiddleware, tryCatch };

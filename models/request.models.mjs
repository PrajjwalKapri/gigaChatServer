import { Schema, Model, Types, model } from "mongoose";

const requestSchema = new Schema(
  {
    status: {
      type: String,
      default: "PENDING",
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
    },

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    reciever: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
const Request = model("Request", requestSchema);
export default Request;

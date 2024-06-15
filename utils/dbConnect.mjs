import mongoose from "mongoose";

const dbConnect = async () => {
  await mongoose
    .connect(process.env.URL)
    .then(() => console.log("Database Connected"))
    .catch((e) => console.log(e));
};

export default dbConnect;

import { faker } from "@faker-js/faker";
import User from "../models/user.models.mjs";
const createUsers = async (numUsers) => {
  try {
    const usersPromise = [];
    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        password: "luffy",
        bio: faker.lorem.sentence(15),
        avatar: {
          public_id: faker.system.fileName(),
          url: faker.image.avatar(),
        },
      });
      usersPromise.push(tempUser);
    }
    await Promise.all(usersPromise);

    console.log("Users created: ", 10);
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export { createUsers };

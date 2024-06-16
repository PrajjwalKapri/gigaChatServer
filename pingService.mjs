// pingService.mjs

import cron from "node-cron";
import axios from "axios";

const pingServer = async () => {
  const serverUrl = "https://gigachatserver.onrender.com"; // server URL

  try {
    const response = await axios.get(`${serverUrl}/ping`);
    console.log("Ping successful:", response.data);
  } catch (error) {
    console.error("Error pinging server:", error.message);
  }
};

// Schedule the ping every 10 minutes (*/10 * * * * means every 8th minute)
cron.schedule("*/8 * * * *", pingServer);

// Start the scheduler
console.log("Ping scheduler started");

import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import dbconfig from "./config/dbConfig.js";

import app from "./app.js";

const port = process.env.PORT_NUMBER || 3000;

app.listen(port, () => {
  console.log("listening to request on port: " + port);
});

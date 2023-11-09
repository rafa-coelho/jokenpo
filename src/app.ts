import "reflect-metadata";
import "express-async-errors";

import express from "express";
import path from "path";

const app = express();

app.use(express.static(path.join(__dirname, "web")));
export default app;

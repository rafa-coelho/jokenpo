require("dotenv").config();

import SocketService from "./GameEngine/SocketService";
import http from "http";
import app from "./app";

const server = http.createServer(app);

SocketService.Run(server);

server.listen(process.env.NODE_PORT ?? 3000);

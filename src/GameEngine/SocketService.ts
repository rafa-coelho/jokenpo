import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import Player from "./Player";
import GameController from "./GameController";

export default class SocketService {
    private static io: Server;

    public static Run (server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*"
            }
        });

        this.io.on("connection", (client) => {
            const player = new Player(client);
            GameController.ConnectPlayer(player);

            client.on("disconnect", () => {
                GameController.DisconnectPlayer(player);
            });
        });

        if (process.env.NODE_ENV == "dev") {
            setInterval(() => {
                console.clear();
                console.table(GameController.Players.map(x => ({ ...x, Client: x.Client.id })));
                console.table(GameController.Matches.map(x => ({ ...x, Player1: x.Player1.Client.id, Player2: x.Player2.Client.id })));
            }, 1000);
        }
    }
}

import { Socket } from "socket.io";
import GameController from "./GameController";
import Match from "./Match";

export enum PlayerStatus {
    Idle,
    WaitingRoom,
    Playing
};

export enum PlayerEmit {
    SearchMatch = "SearchMatch",
    Disconnect = "disconnect",
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Player {
    public Client: Socket;
    public State: PlayerStatus = PlayerStatus.Idle;

    constructor(socket: Socket) {
        this.Client = socket;

        this.setupActions();
    }

    private setupActions () {
        this.Client.on(PlayerEmit.SearchMatch, this.handleSearchRoom.bind(this));
        this.Client.on(PlayerEmit.Disconnect, this.handleDisconnect.bind(this))
    }

    private handleDisconnect() {
        if(this.State == PlayerStatus.Playing){
            const matchIndex = GameController.Matches.findIndex(x => [x.Player1.Client.id, x.Player2.Client.id].includes(this.Client.id));
            const match = GameController.Matches[matchIndex];

            if(match){
                const opponent = match.Player2.Client.id === this.Client.id ? match.Player1 : match.Player2;
                opponent.OpponentDisconnected();
                opponent.SetState(PlayerStatus.Idle);
                GameController.Matches.splice(matchIndex, 1);
            }
        }

        this.Client.disconnect();
        GameController.Players = GameController.Players.filter(x => x.Client.id !== this.Client.id);
    }


    public OpponentDisconnected () {
        this.Client.emit("OpponentDisconnected");
    }

    public SetState(state: PlayerStatus){
        this.State = state;
    }


    private async handleSearchRoom (){
        this.State = PlayerStatus.WaitingRoom;

        while(this.Client.connected && this.State === PlayerStatus.WaitingRoom){
            const foundOpponent = GameController.FindOpponent(this.Client.id);

            if(foundOpponent != null){
                GameController.CreateMatch(this, foundOpponent);
            }

            await sleep(300);
        }
    }
};

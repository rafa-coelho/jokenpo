import Match from "./Match";
import Player, { PlayerStatus } from "./Player";

export default class GameController {
    public static Players: Player[] = [];
    public static Matches: Match[] = [];


    public static ConnectPlayer(player: Player){
        this.Players.push(player);
        player.Client.emit("connected");
    }
    
    public static DisconnectPlayer(player: Player){
        const index = this.Players.findIndex(x => x.Client.id == player.Client.id);
        if(index > -1){
            this.Players[index].Client.disconnect();
            this.Players = this.Players.filter(x => x.Client.id !== player.Client.id);
        }
    }

    public static FindOpponent (id: string) {
        return this.Players.find(x => x.Client.id !== id && x.State === PlayerStatus.WaitingRoom);
    }

    public static CreateMatch(player1: Player, player2: Player) {
        player1.SetState(PlayerStatus.Playing);
        player2.SetState(PlayerStatus.Playing);
        this.Matches.push(new Match(player1, player2));
    }
};

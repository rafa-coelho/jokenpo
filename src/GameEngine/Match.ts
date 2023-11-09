import GameController from "./GameController";
import Player, { PlayerStatus } from "./Player";

enum RoundResult {
    P1Win,
    P2Win,
    Draw
}

export default class Match {
    public Scoreboard = [0, 0];
    public Options = [0, 0];

    private RoundOptions: [string, string] = ["", ""];
    private RoundsHistory: RoundResult[] = [];
    private MaxRounds = 3;

    constructor(
        public Player1: Player,
        public Player2: Player
    ) {
        this.setupActions();
    }

    private setupActions () {
        this.Player1.Client.removeAllListeners("Play");
        this.Player2.Client.removeAllListeners("Play");
        
        this.Player1.Client.emit("MatchFound", { playerNumber: 1 });
        this.Player2.Client.emit("MatchFound", { playerNumber: 2 });

        this.Player1.Client.emit("WaitingPlay");
        this.Player2.Client.emit("WaitingPlay");

        this.Player1.Client.on("Play", (data) => this.handlePlay(data, 0))
        this.Player2.Client.on("Play", (data) => this.handlePlay(data, 1))
    }

    private handlePlay (data: any, playerNumber: number) {
        const opponentNumber = playerNumber === 0 ? 1 : 0;
        const opponentOption = this.RoundOptions[opponentNumber];

        const command = (data.action as string).trim().toLowerCase();

        const acceptableCommands = ["rock", "paper", "scissors"];
        const isInvalidCommand = !acceptableCommands.includes(command);

        if (isInvalidCommand) {
            return this.InvalidAction(playerNumber);
        }

        if (this.RoundOptions[playerNumber] !== "") {
            return;
        }

        this.RoundOptions[playerNumber] = command;

        if (opponentOption !== "") {
            const matchResult = this.GetMatchResult();

            this.Player1.Client.emit("Result", matchResult.playersResult[0]);
            this.Player2.Client.emit("Result", matchResult.playersResult[1]);

            this.RoundOptions = ["", ""];

            if (!this.IsDone()) {
                this.Player1.Client.emit("WaitingPlay");
                this.Player2.Client.emit("WaitingPlay");
            }
        }
    }

    private InvalidAction (playerNumber: number) {
        if (playerNumber === 0) {
            this.Player1.Client.emit("InvalidAction");
        }

        if (playerNumber === 1) {
            this.Player2.Client.emit("InvalidAction");
        }
    }

    private GetMatchResult () {
        let roundResult = RoundResult.Draw;

        const playersResult = this.RoundOptions.map((yourOption, yourNumber) => {
            const opponentNumber = yourNumber === 0 ? 1 : 0;
            const opponentOption = this.RoundOptions[opponentNumber];

            let result = "Draw";

            if (yourOption !== opponentOption) {

                const winCondition: any = {
                    "rock": "scissors",
                    "paper": "rock",
                    "scissors": "paper"
                };

                const youWin = winCondition[yourOption] == opponentOption;

                result = youWin ? "YouWin" : "YouLose";
                roundResult = (youWin && yourNumber === 0) || (!youWin && yourNumber === 1) ? RoundResult.P1Win : RoundResult.P2Win;
            }

            return {
                yourOption,
                opponentOption,
                result
            };
        });

        this.RoundsHistory.push(roundResult);

        if (roundResult !== RoundResult.Draw) {
            this.Scoreboard[roundResult === RoundResult.P1Win ? 0 : 1]++;
        }

        return {
            roundResult,
            playersResult: playersResult.map((x, i) => ({
                ...x,
                scoreBoard: this.Scoreboard
            }))
        };
    }

    private IsDone (): boolean {
        if (this.Scoreboard[0] > (this.MaxRounds / 2) || (this.Scoreboard[1] > (this.MaxRounds / 2))) {
            if (this.Scoreboard[0] > (this.MaxRounds / 2)) {
                this.Player2.Client.emit("TryAgain");
                this.Player2.Client.on("TryAgain", this.HandleTryAgain.bind(this));
                this.Player2.Client.on("Done", this.HandleDone.bind(this));

                this.Player1.Client.emit("WaitingTryAgain");
            } else {
                this.Player1.Client.emit("TryAgain");
                this.Player1.Client.on("TryAgain", this.HandleTryAgain.bind(this));
                this.Player1.Client.on("Done", this.HandleDone.bind(this));

                this.Player2.Client.emit("WaitingTryAgain");
            }

            return true;
        }

        return false;
    }

    private HandleTryAgain () {
        this.MaxRounds += 2;
        this.Player1.Client.emit("WaitingPlay");
        this.Player2.Client.emit("WaitingPlay");
    }

    private HandleDone () {
        if (this.Scoreboard[0] > this.Scoreboard[1]) {
            this.Player1.Client.emit("GameOver", { won: true, points: 25 });
            this.Player2.Client.emit("GameOver", { won: false, points: -25 });
        } else {
            this.Player1.Client.emit("GameOver", { won: false, points: -25 });
            this.Player2.Client.emit("GameOver", { won: true, points: 25 });
        }

        this.CloseRoom(this.Player1, this.Player2);
    }

    private HandleQuit (playerNumber: number) {
        if (playerNumber == 0) {
            this.Player2.Client.emit("OpponentQuit", "Your opponent got disconnected");
            this.Player2.Client.removeListener("disconnect", () => this.HandleQuit(1));
        } else {
            this.Player1.Client.emit("OpponentQuit", "Your opponent got disconnected");
            this.Player1.Client.removeListener("disconnect", () => this.HandleQuit(0));
        }
        this.HandleDone();
    }

    private CloseRoom (player1: Player, player2: Player) {
        if (player1?.Client.connected) {
            player1.SetState(PlayerStatus.Idle);
        }

        if (player2?.Client.connected) {
            player2.SetState(PlayerStatus.Idle);
        }

        var matchIndex = GameController.Matches.findIndex(x => x.Player1.Client.id === player1.Client.id && x.Player2.Client.id === player2.Client.id);
        GameController.Matches.splice(matchIndex, 1);
    }
};

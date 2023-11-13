
const PlayerStatus = { Idle: 0, WaitingRoom: 1, Playing: 2 };
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SocketEvent = {
    MatchFound: "MatchFound",
    WaitingPlay: "WaitingPlay",
    Result: "Result",
    TryAgain: "TryAgain",
    GameOver: "GameOver",
    OpponentDisconnected: "OpponentDisconnected",
    SearchMatch: "SearchMatch",
    Done: "Done",
    Play: "Play",
    SearchMatch: "SearchMatch"
};

const translator = {
    "en-US": {
        searchingMatch: "Searching match...",
        matchFound: "Match Found",
        youWonCapital: "YOU WON",
        youLoseCapital: "YOU LOSE",
        youWon: "You Won!",
        youLose: "You Lose!",
        draw: "Draw!",
        pressToPlayAgain: "Press anywhere to play again",
        you: "You",
        player1: "Player 1",
        player2: "Player 2",
        waitingOpponent: "Waiting opponent",
        opponentDisconnected: "Opponent got disconnected.",
        rock: "Rock",
        paper: "Paper",
        scissors: "Scissors",
    },
    "pt-BR": {
        searchingMatch: "Procurando partida...",
        matchFound: "Partida Encontrada",
        youWonCapital: "VITÓRIA",
        youLoseCapital: "DERROTA",
        youWon: "Venceu!",
        youLose: "Perdeu!",
        draw: "Empate!",
        pressToPlayAgain: "Toque em qualquer lugar para jogar novamente",
        you: "Você",
        player1: "Jogador 1",
        player2: "Jogador 2",
        waitingOpponent: "Esperando Oponente",
        opponentDisconnected: "Oponente Desconectado.",
        rock: "Pedra",
        paper: "Papel",
        scissors: "Tesoura",
    },
};

translator.get = function (translationCode) {
    return this[window.navigator.language][translationCode] || translationCode;
};


class Game {
    serverURL = document.location.href;
    coverDiv = document.getElementById("cover");
    scoreboardDiv = document.getElementById("scoreboard");
    opponentBoard = document.getElementById("opponentBoard");
    actionButtons = document.getElementsByClassName("action");

    constructor() {
        this.socket = io(this.serverURL);
        this.socket.on(SocketEvent.MatchFound, this.handleMatchFound.bind(this));
        this.socket.on(SocketEvent.WaitingPlay, this.handleWaitingPlay.bind(this));
        this.socket.on(SocketEvent.Result, this.handleResult.bind(this));
        this.socket.on(SocketEvent.TryAgain, this.handleTryAgain.bind(this));
        this.socket.on(SocketEvent.GameOver, this.handleGameOver.bind(this));
        this.socket.on(SocketEvent.OpponentDisconnected, this.handleOpponentDisconnected.bind(this));

        this.searchRoom();

        for (var i = 0; i < this.actionButtons.length; i++) {
            this.actionButtons[i].addEventListener('click', this.sendAction.bind(this), false);
            this.actionButtons[i].innerHTML = translator.get(this.actionButtons[i].value.toLowerCase());
        }
    }

    searchRoom () {
        this.showCoverMessage(translator.get("searchingMatch"));
        this.socket.emit(SocketEvent.SearchMatch);
    };

    async handleMatchFound (response) {
        this.currentPlayerNumber = response.playerNumber;
        this.scoreboard = [0, 0];

        this.showCoverMessage(translator.get("matchFound"));
        await timeout(1000);

        this.hideCoverMessage();
        this.updateScoreboard();
        this.toggleActionButtons(true);
    };

    handleWaitingPlay () {
        this.toggleActionButtons(true);
    };

    handleTryAgain () {
        this.socket.emit(SocketEvent.Done);
    };

    handleGameOver (response) {
        this.showCoverMessage(`
            <div>
                <span class="toGlitch">
                ${response.won ? translator.get("youWonCapital") : translator.get("youLoseCapital")}
                </span>
                <br />
                <small>${translator.get("pressToPlayAgain")}</small>
            </div>
        `);
        this.addNewGameHandler();
    };

    async showOpponentMessage (text, fadeOutMs) {
        this.opponentBoard.classList.remove("active");

        await timeout(300);
        this.opponentBoard.innerHTML = text;
        this.opponentBoard.classList.add("active");

        if (fadeOutMs && !isNaN(fadeOutMs)) {
            await timeout(fadeOutMs);
            this.opponentBoard.classList.remove("active");
        }
    };

    async handleResult (response) {
        this.scoreboard = response.scoreBoard;

        this.showOpponentMessage(translator.get(response.opponentOption.toLowerCase()), 3000);
        const resultText = {
            "YouWin": translator.get("youWon"),
            "YouLose": translator.get("youLose"),
            "Draw": translator.get("draw"),
        };

        this.showMessage(resultText[response.result]);

        await timeout(3000);
        this.updateScoreboard();
    };

    showCoverMessage (html) {
        this.coverDiv.innerHTML = html;
        this.coverDiv.classList.add("shown");
    };

    async hideCoverMessage () {
        this.coverDiv.classList.remove("shown");
        await timeout(500);
        this.coverDiv.innerHTML = "";
    };

    async updateScoreboard () {
        this.showMessage(`
            <div>
                ${this.currentPlayerNumber == 1 ? translator.get("you") : translator.get("player1")} <span>${this.scoreboard[0]}</span>
            </div>
            x
            <div>
                <span>${this.scoreboard[1]}</span> 
                ${this.currentPlayerNumber == 2 ? translator.get("you") : translator.get("player2")}
            </div>
        `);
    };

    toggleActionButtons (status) {
        for (var i = 0; i < this.actionButtons.length; i++) {
            this.actionButtons[i].disabled = !status;
        }
    };

    sendAction (e) {
        this.socket.emit(SocketEvent.Play, { action: e.target.value });
        this.toggleActionButtons(false);
        this.showMessage(translator.get("waitingOpponent"));
    };

    async showMessage (html) {
        this.scoreboardDiv.classList.remove("active");

        await timeout(500);
        this.scoreboardDiv.innerHTML = html;
        this.scoreboardDiv.classList.add("active");
    };

    async handleOpponentDisconnected () {
        this.showCoverMessage(`
            <div>
                <p>${translator.get("opponentDisconnected")}</p> 
                ${translator.get("pressToPlayAgain")}
            </div>
        `);

        this.addNewGameHandler();
    };

    addNewGameHandler () {
        const handleNewGame = () => {
            this.socket.emit(SocketEvent.SearchMatch);
            this.showCoverMessage(translator.get("searchingMatch"));
            this.coverDiv.removeEventListener("click", handleNewGame);
        };

        this.coverDiv.addEventListener("click", handleNewGame);
    };
}


window.addEventListener('load', new Game());

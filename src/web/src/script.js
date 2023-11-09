
const PlayerStatus = { Idle: 0, WaitingRoom: 1, Playing: 2 };
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Game {
    serverURL = document.location.href;
    coverDiv = document.getElementById("cover");
    scoreboardDiv = document.getElementById("scoreboard");
    opponentBoard = document.getElementById("opponentBoard");
    actionButtons = document.getElementsByClassName("action");

    constructor() {
        this.socket = io(this.serverURL);
        this.socket.on("MatchFound", this.handleMatchFound.bind(this));
        this.socket.on("WaitingPlay", this.handleWaitingPlay.bind(this));
        this.socket.on("Result", this.handleResult.bind(this));
        this.socket.on("TryAgain", this.handleTryAgain.bind(this));
        this.socket.on("GameOver", this.handleGameOver.bind(this));
        this.socket.on("OpponentDisconnected", this.handleOpponentDisconnected.bind(this));

        this.searchRoom();

        for (var i = 0; i < this.actionButtons.length; i++) {
            this.actionButtons[i].addEventListener('click', this.sendAction.bind(this), false);
        }
    }

    searchRoom () {
        this.showCoverMessage("Searching match...");
        this.socket.emit("SearchMatch");
    };

    async handleMatchFound (response) {
        this.currentPlayerNumber = response.playerNumber;
        this.scoreboard = [0, 0];

        this.showCoverMessage("Match Found");
        await timeout(1000);

        this.hideCoverMessage();
        this.updateScoreboard();
        this.toggleActionButtons(true);
    };

    handleWaitingPlay () {
        this.toggleActionButtons(true);
    };

    handleTryAgain () {
        this.socket.emit("Done");
    };

    handleGameOver (response) {
        this.showCoverMessage(`
            <div>
                <span class="toGlitch">
                ${response.won ? "YOU WON" : "YOU LOSE"}
                </span>
                <br />
                <small>Press anywhere to play again</small>
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

        this.showOpponentMessage(response.opponentOption, 3000);
        const resultText = {
            "YouWin": "You Won!",
            "YouLose": "You Lose!",
            "Draw": "Draw"
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
                ${this.currentPlayerNumber == 1 ? "You" : "Player1"} <span>${this.scoreboard[0]}</span>
            </div>
            x
            <div>
                <span>${this.scoreboard[1]}</span> ${this.currentPlayerNumber == 2 ? "You" : "Player2"}
            </div>
        `);
    };

    toggleActionButtons (status) {
        for (var i = 0; i < this.actionButtons.length; i++) {
            this.actionButtons[i].disabled = !status;
        }
    };

    sendAction (e) {
        console.log("Sent ", e.target.innerText)
        this.socket.emit("Play", { action: e.target.innerText });
        this.toggleActionButtons(false);
        this.showMessage("Waiting opponent");
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
                <p>Opponent got disconnected.</p> 
                Press anywhere to play again
            </div>
        `);

        this.addNewGameHandler();
    };

    addNewGameHandler () {
        const handleNewGame = () => {
            this.socket.emit("SearchMatch");
            this.showCoverMessage("Searching match...");
            this.coverDiv.removeEventListener("click", handleNewGame);
        };

        this.coverDiv.addEventListener("click", handleNewGame);
    };
}


window.addEventListener('load', new Game());

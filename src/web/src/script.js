
const PlayerStatus = { Idle: 0, WaitingRoom: 1, Playing: 2 };
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function Game () {
    // Configs 
    this.serverURL = document.location.href;

    // Get elements
    this.coverDiv = document.getElementById("cover");
    this.scoreboardDiv = document.getElementById("scoreboard");
    this.opponentBoard = document.getElementById("opponentBoard");
    this.actionButtons = document.getElementsByClassName("action");

    // Set initial state
    this.playerStatus = PlayerStatus.Idle;
    this.currentPlayerNumber = null;

    // Setup Match
    this.scoreboard = [0, 0];

    this.init = function () {
        this.socket = io(this.serverURL);
        this.socket.on("MatchFound", this.handleMatchFound.bind(this));
        this.socket.on("WaitingPlay", this.handleWaitingPlay.bind(this));
        this.socket.on("Result", this.handleResult.bind(this));
        this.socket.on("TryAgain", this.handleTryAgain.bind(this));
        this.socket.on("GameOver", this.handleGameOver.bind(this));
        this.socket.on("OpponentDisconnected", this.handleOpponentDisconnected.bind(this));

        this.searchRoom();

        for (var i = 0; i < this.actionButtons.length; i++) {
            this.actionButtons[i].addEventListener('click',  this.sendAction.bind(this), false);
        }
    };

    this.searchRoom = function () {
        this.showCoverMessage("Searching match...");
        this.socket.emit("SearchMatch");
    };

    this.handleMatchFound = async function (response) {
        this.currentPlayerNumber = response.playerNumber;
        this.scoreboard = [0, 0];

        this.showCoverMessage("Match Found");
        await timeout(1000);

        this.hideCoverMessage();
        this.updateScoreboard();
        this.toggleActionButtons(true);
    };

    this.handleWaitingPlay = function () {
        this.toggleActionButtons(true);
    };

    this.handleTryAgain = function () {
        this.socket.emit("Done");
    };

    this.handleGameOver = function (response) {
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

    this.showOpponentMessage = async function (text, fadeOutMs) {
        this.opponentBoard.classList.remove("active");

        await timeout(300);
        this.opponentBoard.innerHTML = text;
        this.opponentBoard.classList.add("active");

        if (fadeOutMs && !isNaN(fadeOutMs)) {
            await timeout(fadeOutMs);
            this.opponentBoard.classList.remove("active");
        }
    };

    this.handleResult = async function (response) {
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

    this.showCoverMessage = function (html) {
        this.coverDiv.innerHTML = html;
        this.coverDiv.classList.add("shown");
    };

    this.hideCoverMessage = async function () {
        this.coverDiv.classList.remove("shown");
        await timeout(500);
        this.coverDiv.innerHTML = "";
    };

    this.updateScoreboard = async function () {
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

    this.toggleActionButtons = function (status) {
        for (var i = 0; i < this.actionButtons.length; i++) {
            this.actionButtons[i].disabled = !status;
        }
    };

    this.sendAction = function (e) {
        console.log("Sent ", e.target.innerText)
        this.socket.emit("Play", { action: e.target.innerText });
        this.toggleActionButtons(false);
        this.showMessage("Waiting opponent");
    };

    this.showMessage = async function (html) {
        this.scoreboardDiv.classList.remove("active");

        await timeout(500);
        this.scoreboardDiv.innerHTML = html;
        this.scoreboardDiv.classList.add("active");
    };

    this.handleOpponentDisconnected = async function () {
        this.showCoverMessage(`
            <div>
                <p>Opponent got disconnected.</p> 
                Press anywhere to play again
            </div>
        `);

        this.addNewGameHandler();
    };

    this.addNewGameHandler = () => {
        const handleNewGame = () => {
            this.socket.emit("SearchMatch");
            this.showCoverMessage("Searching match...");
            this.coverDiv.removeEventListener("click", handleNewGame);
        };

        this.coverDiv.addEventListener("click", handleNewGame);
    };

    return this.init();
};

window.addEventListener('load', Game());

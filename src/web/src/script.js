
const PlayerStatus = { Idle: 0, WaitingRoom: 1, Playing: 2 };
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function Game () {
    // Configs 
    Game.serverURL = document.location.href;

    // Get elements
    Game.coverDiv = document.getElementById("cover");
    Game.scoreboardDiv = document.getElementById("scoreboard");
    Game.opponentBoard = document.getElementById("opponentBoard");
    Game.actionButtons = document.getElementsByClassName("action");

    // Set initial state
    Game.playerStatus = PlayerStatus.Idle;
    Game.currentPlayerNumber = null;

    // Setup Match
    Game.scoreboard = [0, 0];

    Game.init = function () {
        Game.socket = io(Game.serverURL);
        Game.socket.on("MatchFound", Game.handleMatchFound.bind(this));
        Game.socket.on("WaitingPlay", Game.handleWaitingPlay.bind(this));
        Game.socket.on("Result", Game.handleResult.bind(this));
        Game.socket.on("TryAgain", Game.handleTryAgain.bind(this));
        Game.socket.on("GameOver", Game.handleGameOver.bind(this));
        Game.socket.on("OpponentDisconnected", Game.handleOpponentDisconnected.bind(this));

        Game.searchRoom();

        for (var i = 0; i < Game.actionButtons.length; i++) {
            Game.actionButtons[i].addEventListener('click',  Game.sendAction.bind(this), false);
        }
    };

    Game.searchRoom = function () {
        Game.showCoverMessage("Searching match...");
        Game.socket.emit("SearchMatch");
    };

    Game.handleMatchFound = async function (response) {
        Game.currentPlayerNumber = response.playerNumber;
        Game.scoreboard = [0, 0];

        Game.showCoverMessage("Match Found");
        await timeout(1000);

        Game.hideCoverMessage();
        Game.updateScoreboard();
        Game.toggleActionButtons(true);
    };

    Game.handleWaitingPlay = function () {
        Game.toggleActionButtons(true);
    };

    Game.handleTryAgain = function () {
        Game.socket.emit("Done");
    };

    Game.handleGameOver = function (response) {
        Game.showCoverMessage(`
            <div>
                <span class="toGlitch">
                ${response.won ? "YOU WON" : "YOU LOSE"}
                </span>
                <br />
                <small>Press anywhere to play again</small>
            </div>
        `);
        Game.addNewGameHandler();
    };

    Game.showOpponentMessage = async function (text, fadeOutMs) {
        Game.opponentBoard.classList.remove("active");

        await timeout(300);
        Game.opponentBoard.innerHTML = text;
        Game.opponentBoard.classList.add("active");

        if (fadeOutMs && !isNaN(fadeOutMs)) {
            await timeout(fadeOutMs);
            Game.opponentBoard.classList.remove("active");
        }
    };

    Game.handleResult = async function (response) {
        Game.scoreboard = response.scoreBoard;

        Game.showOpponentMessage(response.opponentOption, 3000);
        const resultText = {
            "YouWin": "You Won!",
            "YouLose": "You Lose!",
            "Draw": "Draw"
        };

        Game.showMessage(resultText[response.result]);

        await timeout(3000);
        Game.updateScoreboard();
    };

    Game.showCoverMessage = function (html) {
        Game.coverDiv.innerHTML = html;
        Game.coverDiv.classList.add("shown");
    };

    Game.hideCoverMessage = async function () {
        Game.coverDiv.classList.remove("shown");
        await timeout(500);
        Game.coverDiv.innerHTML = "";
    };

    Game.updateScoreboard = async function () {
        Game.showMessage(`
            <div>
                ${Game.currentPlayerNumber == 1 ? "You" : "Player1"} <span>${Game.scoreboard[0]}</span>
            </div>
            x
            <div>
                <span>${Game.scoreboard[1]}</span> ${Game.currentPlayerNumber == 2 ? "You" : "Player2"}
            </div>
        `);
    };

    Game.toggleActionButtons = function (status) {
        for (var i = 0; i < Game.actionButtons.length; i++) {
            Game.actionButtons[i].disabled = !status;
        }
    };

    Game.sendAction = function (e) {
        console.log("Sent ", e.target.innerText)
        Game.socket.emit("Play", { action: e.target.innerText });
        Game.toggleActionButtons(false);
        Game.showMessage("Waiting opponent");
    };

    Game.showMessage = async function (html) {
        Game.scoreboardDiv.classList.remove("active");

        await timeout(500);
        Game.scoreboardDiv.innerHTML = html;
        Game.scoreboardDiv.classList.add("active");
    };

    Game.handleOpponentDisconnected = async function () {
        Game.showCoverMessage(`
            <div>
                <p>Opponent got disconnected.</p> 
                Press anywhere to play again
            </div>
        `);

        Game.addNewGameHandler();
    };

    Game.addNewGameHandler = () => {
        const handleNewGame = () => {
            Game.socket.emit("SearchMatch");
            Game.showCoverMessage("Searching match...");
            Game.coverDiv.removeEventListener("click", handleNewGame);
        };

        Game.coverDiv.addEventListener("click", handleNewGame);
    };

    return Game.init();
};

window.addEventListener('load', Game());

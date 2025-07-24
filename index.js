import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

let rooms = [];
/*
{
  name: 'game1',
  members: [ { user: 'Bb', socket: 'vas_ZRgWOR8mmc6xAAAH' } ]
}
  */


let gameStates = {};
/*
       "player1": { pos: { x: 100, y: 0 }, name: user, socket : "" },

                "player2": { pos: { x: 100, y: 490 }, name: undefined, socket:"" },

                "balls": [{pos:{x:40, y:93} ,  direction : {x:2, y: 3}}]
*/

const ballRadius = 20;
const canvasWidth = 300;
const canvasHeight = 500;

function getRandomDirection() {
    const mag = Math.floor(Math.random() * 3) + 1; // 1 to 3
    return Math.random() < 0.5 ? mag : -mag;
}

function getRandomPos() {
    return {
        x: Math.floor(Math.random() * (canvasWidth - 2 * ballRadius)) + ballRadius,
        y: Math.floor(Math.random() * (canvasHeight - 2 * ballRadius)) + ballRadius
    };
}


const logRoom = () => {

    rooms.forEach(item => {
        console.log(item.name);
        console.log(item.members);
    })
}


const moveBalls = (room) => {
    gameStates[room.name] = {
        ...gameStates[room.name], balls: gameStates[room.name]['balls'].map((item) => {
            return {
                pos: {
                    x: item.pos.x + item.direction.x,
                    y: item.pos.y + item.direction.y
                },
                direction: {
                    x:
                        item.pos.x + item.direction.x <= 20 || item.pos.x + item.direction.x >= canvasWidth - ballRadius
                            ? (item.direction.x * -1) * 1
                            : item.direction.x * 1,
                    y:
                        item.pos.y + item.direction.y <= 20 || item.pos.y + item.direction.y >= canvasHeight - ballRadius
                            ? (item.direction.y * -1) * 1
                            : item.direction.y * 1
                },
                ballId: item.ballId
            };
        })
    }
}
const io = new Server(server, {
    connectionStateRecovery: {
    },
    cors: { origin: "https://master.gamehouse-95s.pages.dev" }
});

app.get("/", (req, res) => {
    res.send("<h1>Hello world</h1>")
});

/*
[
  { pos: { x: 125, y: 354 }, direction: { x: 3, y: -2 } },
  { pos: { x: 145, y: 40 }, direction: { x: -2, y: -3 } },
  { pos: { x: 207, y: 456 }, direction: { x: -3, y: 3 } },
  { pos: { x: 107, y: 258 }, direction: { x: 2, y: 3 } },
  { pos: { x: 159, y: 58 }, direction: { x: 3, y: 3 } },
  { pos: { x: 177, y: 124 }, direction: { x: -3, y: 1 } },
  { pos: { x: 124, y: 346 }, direction: { x: -2, y: 2 } },
  { pos: { x: 168, y: 70 }, direction: { x: -1, y: -2 } },
  { pos: { x: 145, y: 164 }, direction: { x: 3, y: -3 } },
  { pos: { x: 169, y: 106 }, direction: { x: -1, y: -2 } },
  { pos: { x: 122, y: 22 }, direction: { x: 1, y: -1 } },
  { pos: { x: 267, y: 345 }, direction: { x: -1, y: 1 } }
]
  */

setInterval(() => {
    rooms.forEach((room) => {
        const gameState = gameStates[room.name];
        let balls = gameState.balls;
        let checked = [];
        console.log("New Loop")
        balls.forEach((item) => {
            
            balls.forEach((itemI) => {
                if (item !== itemI && !checked.some((checkedItem => checkedItem.ballId === itemI.ballId))) {
                    console.log(item, itemI);
                }
            });
            checked.push(item);
        })
        console.log("Loop end")

        moveBalls(room);

        io.to(room.name).emit("state", { game: gameStates[room.name] });
    });
}, 1000 / 10);

io.on("connection", (socket) => {
    console.log("A new user is connected: ");

    socket.on("join-room", ({ roomName, user }) => {
        const room = rooms.find(item => item.name === roomName);
        console.log(socket.id)
        if (room) {
            //if (room.members.length >= 2) {
            // socket.emit("room full", `Room ${roomName} is full`);
            // socket.disconnect();
            //  return;
            //}
            if (rooms.some(room => room.members.some(member => member.user === user))) {
                console.log("already in room");
                socket.join(roomName);
            } else {
                room.members.push({ "user": user, "socket": socket.id });
                gameStates[roomName] = { ...gameStates[roomName], player2: { ...gameStates[roomName]["player2"], name: user, socket: socket.id } };
                socket.join(roomName);
                console.log("Joneing existing")

            }
        } else {
            rooms.push({ "name": roomName, "members": [{ "user": user, "socket": socket.id }] });

            gameStates[roomName] = {
                "player1": { pos: { x: 100, y: 0 }, name: user, socket: socket.id },

                "player2": { pos: { x: 100, y: 490 }, name: undefined, socket: undefined },

                "balls": Array.from({ length: 12 }, () => ({
                    pos: getRandomPos(),
                    direction: {
                        x: getRandomDirection(),
                        y: getRandomDirection()
                    },
                    ballId : parseInt(Math.random() * 1000000000)
                }))


            }

            socket.join(roomName);
            console.log("Joneing New")
        }
        console.log(`${user} joined ${roomName}`);
        logRoom();


    });


    socket.on("move", ({ direction }) => {
        const room = rooms.find(room => room.members.some(item => item.socket === socket.id));
        if (!room) {
            return;
        }
        const gameState = gameStates[room.name];
        let target = undefined;

        if (gameState.player1.socket === socket.id) {
            target = "player1"
        }
        if (gameState.player2.socket === socket.id) {
            target = "player2"
        }

        console.log(target);

        switch (direction) {
            case "Up":
                if (target === "player1") {

                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], y: gameStates[room.name][target]["pos"]["y"] >= 490 ? gameStates[room.name][target]["pos"]["y"] : gameStates[room.name][target]["pos"]["y"] + 10 } } }
                } else {
                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], y: gameStates[room.name][target]["pos"]["y"] <= 0 ? gameStates[room.name][target]["pos"]["y"] : gameStates[room.name][target]["pos"]["y"] - 10 } } }
                }
                break;
            case "Right":
                if (target === "player1") {
                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], x: gameStates[room.name][target]["pos"]["x"] <= 0 ? gameStates[room.name][target]["pos"]["x"] : gameStates[room.name][target]["pos"]["x"] - 10 } } }
                } else {

                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], x: gameStates[room.name][target]["pos"]["x"] >= 200 ? gameStates[room.name][target]["pos"]["x"] : gameStates[room.name][target]["pos"]["x"] + 10 } } }
                }
                break;
            case "Down":
                if (target === "player1") {
                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], y: gameStates[room.name][target]["pos"]["y"] <= 0 ? gameStates[room.name][target]["pos"]["y"] : gameStates[room.name][target]["pos"]["y"] - 10 } } }
                } else {
                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], y: gameStates[room.name][target]["pos"]["y"] >= 490 ? gameStates[room.name][target]["pos"]["y"] : gameStates[room.name][target]["pos"]["y"] + 10 } } }
                }
                console.log("up")
                break;
            case "Left":
                if (target === "player1") {
                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], x: gameStates[room.name][target]["pos"]["x"] >= 200 ? gameStates[room.name][target]["pos"]["x"] : gameStates[room.name][target]["pos"]["x"] + 10 } } }
                } else {

                    gameStates[room.name] = { ...gameStates[room.name], [target]: { ...gameStates[room.name][target], pos: { ...gameStates[room.name][target]["pos"], x: gameStates[room.name][target]["pos"]["x"] <= 0 ? gameStates[room.name][target]["pos"]["x"] : gameStates[room.name][target]["pos"]["x"] - 10 } } }
                }

                break;
            default:
                break
        }
        console.log(gameStates);

    })


    socket.on("disconnect", () => {
        console.log("rooms before disconnection")
        logRoom();
        const room = rooms.find(room => room.members.find(item => item.socket === socket.id))
        if (room) {
            if (room.members.length === 1) {
                rooms = rooms.filter(item => item !== room);
            } else {
                rooms = rooms.map(item => {
                    if (item === room) {
                        return { ...item, members: item.members.filter(member => member.socket != socket.id) }
                    } else {
                        return item;
                    }
                })
            }
            console.log("Disconnected");
            console.log("rooms after disconnection");
            logRoom();
        }
    });

})



server.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
})
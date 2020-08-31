const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users.js");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = socketIo(server);

let commentsState = {};
let editorState = {};

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    // if (error) return callback(error);
    if (error) return console.log(error);

    socket.join(user.room);

    // for new users, give them a copy of current editor state and comments
    let data = {};
    data.editor = editorState[user.room];
    data.comments = commentsState[user.room];
    socket.emit("NewData", data);

    io.to(user.room).emit("RoomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
  });

  socket.on("data", (data) => {
    // keep track of the current state of editor and comments
    if (data.editor) editorState[data.room] = data.editor;
    if (data.comments) commentsState[data.room] = data.comments;

    socket.broadcast.to(data.room).emit("NewData", data);
  });

  socket.on("disconnect", (room) => {
    const user = removeUser(socket.id);
    if (user === undefined) return;
    io.to(user.room).emit("RoomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    // clear state data for room if no more users left
    if (getUsersInRoom(user.room).length === 0) {
      editorState[user.room] = undefined;
      commentsState[user.room] = undefined;
    }
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

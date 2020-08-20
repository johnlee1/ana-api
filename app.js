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

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.name),
    });
  });

  socket.on("data", (data) => {
    console.log("emitting data", data);
    socket.broadcast.to(data.room).emit("NewData", data);
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    console.log("Client disconnected");
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

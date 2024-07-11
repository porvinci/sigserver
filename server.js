'use strict'
var log4js = require('log4js');
var http = require('http');
// var https = require('https');
// var fs = require('fs');
const { Server } = require('socket.io');

var express = require('express');
// var serveIndex = require('serve-index');

var USERCOUNT = 2;

log4js.configure({
    appenders: {
        file: {
            type: 'file',
            filename: 'app.log',
            layout: {
                type: 'pattern',
                pattern: '%r %p - %m',
            }
        }
    },
    categories: {
       default: {
          appenders: ['file'],
          level: 'debug'
       }
    }
});

var logger = log4js.getLogger();

var app = express();
// app.use(serveIndex('./public'));
// app.use(express.static('./public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})


//http server
var http_server = http.createServer(app);
// http_server.listen(80, '0.0.0.0');

// var options = {
// 	key : fs.readFileSync('./server.key'),
// 	cert: fs.readFileSync('./server.crt')
// }

//https server
// var https_server = https.createServer(options, app);
let usr2roomMap = new Map()
const io = new Server(http_server, {
  cors: {
    origin: '*',
  }
})

io.on('connection', (socket)=> {

	socket.on('message', (room, data)=>{
		logger.debug('message, room: ' + room + ", data, type:" + data.type);
		console.log('向房间内发送消息', data)
		socket.to(room).emit('message',room, data.type);
	});

	/*
	socket.on('message', (room)=>{
		logger.debug('message, room: ' + room );
		socket.to(room).emit('message',room);
	});
	*/

	socket.on('join', (room) => {
		var myRoom = io.sockets.adapter.rooms.get(room); 
		var users = (myRoom) ? myRoom.size : 0;
		logger.debug('the user number of room (' + room + ') is: ' + users);
		if (users >= USERCOUNT) { // 如果已满则不让第三人进入房间
			socket.emit('full', room, socket.id);
			return
		}
		if (users > 0){ // 房间里已经有人
			socket.to(room).emit('otherjoin', room, socket.id);
		}		
		socket.join(room);
		usr2roomMap.set(socket.id, room)
		socket.emit('joined', room, socket.id);
		//socket.emit('joined', room, socket.id); //发给自己
		//socket.broadcast.emit('joined', room, socket.id); //发给除自己之外的这个节点上的所有人
		//io.in(room).emit('joined', room, socket.id); //发给房间内的所有人
	});

	socket.on('leave', (room)=>{

		socket.leave(room);

		var myRoom = io.sockets.adapter.rooms.get(room); 
		var users = (myRoom)? myRoom.size : 0;
		logger.debug('the user number of room is: ' + users);

		//socket.emit('leaved', room, socket.id);
		//socket.broadcast.emit('leaved', room, socket.id);
		socket.to(room).emit('bye', room, socket.id);
		socket.emit('leaved', room, socket.id);
		//io.in(room).emit('leaved', room, socket.id);
	});

	socket.on('disconnect', () => {
		let room = usr2roomMap.get(socket.id)
		socket.leave(room);
		var myRoom = io.sockets.adapter.rooms.get(room); 
		var users = (myRoom)? myRoom.size : 0;
		console.log('有人以关闭网页都形式离开了房间，当前房间内剩余', users, '人')
		logger.debug('the user number of room is: ' + users);
		if (users > 0) socket.to(room).emit('bye', room, socket.id);
		//socket.emit('leaved', room, socket.id);
		//socket.broadcast.emit('leaved', room, socket.id);
	});


});
const port = process.env.PORT || 900
http_server.listen(port, () => console.log('服务器已启动'));


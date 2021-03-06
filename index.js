let express = require('express');
let app = express();
let fs = require('fs');
let server = require('http').createServer(app);
let io = require('socket.io').listen(server);
let port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.redirect('index.html');
});
app.get('/game', function(req, res){
	res.redirect('/Host');
});
app.get('/play', function(req, res){
	res.redirect('/Client');
});

server.listen(port, function(){
	console.log('App running:'+ port);
});

let rooms = []; //keeps all rooms

io.on('connection',function(socket){

	//Based on user name -> changes it
	function isUserAlreadyInRoom(name,id){
		let room = rooms[id].People;
		let count = 0;

		for (let i = 0; i < room.length; i++) {
			if (name.split("(")[0] == room[i].name.split("(")[0]) {
				count++;
			}
		}
		return count;
	}

	function roomCodeExists(roomcode){
		for (var i = 0; i < rooms.length; i++) {
			if(rooms[i].Code == roomcode){
				return true;
			}
		}
		return false;
	}

	function update(room, arr){ 	//updates users in room
		io.sockets.in(room).emit('send',arr);
	}

	function findId(roomCode) {		//finds index of room based on rooom name
		for (let i = 0; i < rooms.length; i++) {
			if(rooms[i].Code == roomCode){
				return i;
			}
		}
		return -1;
	}

	//Generate random room ID
	function generateRoomId() {
		let text = "";
		do{
	  		let pismena = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	  		for (let i = 0; i < 4; i++)
	    		text += pismena.charAt(Math.floor(Math.random() * pismena.length));
		}while(roomCodeExists(text));
		return text;
	}

	//Create room -> destroy room
	socket.on('createRoom',function () {
		let code = generateRoomId();
		let newRoom = new Room(code,"Host", socket);
		socket.join(code);
		rooms.push(newRoom);
		update(code, newRoom.People);
		socket.emit("code",code);
		socket.emit('url', "https://ludum-hra.herokuapp.com");
	});

	function destroyRoom(code) {
		socket.broadcast.to(code).emit("err","Odpojené!");
		let roomId = findId(code);
		rooms.splice(roomId,1);
	};
	//Join room -> Leave room
	socket.on('joinRoom',function (data) {
		if (rooms.length == 0) {
			socket.emit('err',"Žiadne hry nie sú spustené!");
		}else{
			let id = findId(data.code);
			if (id == -1) {
				socket.emit('err',"Miestnosť neexistuje!");
			}else{
				let foundRoom = rooms[id];
				let isUser = isUserAlreadyInRoom(data.name,id);
				if(isUser != 0){
					data.name += "("+isUser+")";
					socket.emit("EditUserName",data.name);
				}
				let user = {
					name: data.name,
					id: socket.id
				}
				foundRoom.add(user);
				socket.join(data.code);
				update(data.code,foundRoom.People);
			}
		}
	});

	socket.on('leaveRoom',function (data) {
		let id = findId(data.code);
		if (id == -1) {
			socket.emit('err',"Room doesn't exist!");
		}else {
			let foundRoom = rooms[id];
			foundRoom.del(data);
			socket.leave(data.code);
			update(data.code,foundRoom.People);
		}
	});
	//disconnect -> Host disconnecting
	socket.on('disconnect', () => {
    	for (let i = 0; i < rooms.length; i++) {
    		let ppl = rooms[i].People;
    		for (let j = 0; j < ppl.length; j++) {
    			if (ppl[j].id == socket.id) {
    				if (ppl[j].name == "Host") { //check if it is host-> send err to all in room
    					destroyRoom(rooms[i].Code);
    				}else{
	    				rooms[i].del(socket.id);
	    				update(rooms[i].code,rooms[i].People);
    				}
    			}
    		}
    	}
  	});

	//Handle DB requests - Hands of truth
	socket.on('Hands', function(room){
		let db = JSON.parse(fs.readFileSync('./db/database.json', 'utf8'));
		let random = db[Math.floor(Math.random() * db.length)];
		socket.broadcast.to(room).emit('HandsTask', random.otazka);
	});
	socket.on('Point', function(room){
		let db = JSON.parse(fs.readFileSync('./db/database1.json','utf8'));
		let random = db[Math.floor(Math.random() * db.length)];
		socket.broadcast.to(room).emit('PointTask', random.otazka);
	});
	//New sets of tasks
	//Roles
	socket.on('roles', function(data){
		update(data[0], data[1]);
		socket.broadcast.to(data[0]).emit('roles', data[1]);

	});
	//Voting
	socket.on('vote', function(data){
		socket.broadcast.to(data[0]).emit('voting', data);
	});
	socket.on('VoteSubmit', function(data){
		socket.broadcast.to(data.room).emit('VoteFinal', data);
	});
	//Dead player
	socket.on('dead', function(data){
		socket.broadcast.to(data.room).emit('DeadPlayer', data.id);
	});
	//Handle NewRound
	socket.on('NewRound', function(data){
		socket.broadcast.to(data).emit('NewRound');
	});
	//Handle EndGame
	socket.on('StartEndGame', function(room){
		socket.broadcast.to(room).emit('StartEnd');
	});
	socket.on('StopEndGame', function(room){
		socket.broadcast.to(room).emit('StopEnd', room);
	});
	socket.on('Ping', function(data){
		socket.broadcast.to(data[0]).emit('AddPoint', data);
	});

});


class Room {

	constructor(code,name, socket) {
	    this.code = code;
	    this.people = [];
	    this.people.push({
	    	name:name,
	    	id:socket.id
	    });
  	}

  	add(who){
  		this.people.push(who);
  	}
  	del(who){
  		for(let i = 0; i < this.people.length; i++){
  			if(this.people[i].id == who){
  				this.people.splice(i,1);
  			}
  		}
  	}
  	get People(){
  		return this.people;
  	}
  	get Code(){
  		return this.code;
  	}
}
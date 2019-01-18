abstract class Scene{
	abstract update():void;
	abstract redraw():void;
	abstract load():void;
	abstract unload():void;
}

class Lobby extends Scene{
	private bg: Image;

	unload():void{
		//Changing scene to next one
		scenes.changeScene(new Role_assign());
	}

	load():void{
		//Basically a constructor
		this.bx = width/2-272.5;
		this.by = height/2;
		//loading imags to cache
		this.bg = loadImage("assets/FirstPart.png");
		this.button = loadImage("assets/button.png");
	}

	update():void {
		//Chceking if button is pressed
		width, height - height/2.3
		if (mouseX > (width - 761)  && mouseX < (width - 39) && mouseY > (height - 512) && mouseY < (height - 147)){
			if (mouseIsPressed){
				if (players.length-1 >= 3){
					this.unload();
				}
			}
		}
		//Redrawing
		this.redraw();
	}

	redraw():void{
		//Draw BG and button
		image(this.bg,0,0,0,height);

		//Draw url address
		textSize(24);
		text("Zadajte túto adresu vo svojom prehlidači:", width-textWidth("Zadajte túto adresu vo svojom prehlidači:"), height - height/2 - 64);
		textSize(64);
		text(url, width-textWidth(url), height - height/2);
		//Draw roomcode
		textSize(64);
		text(correction, width-width/4, height/3);
		//Draw connected players
		textSize(24);
		let step = height-height/3-50;
		for (var i = 0; i < players.length; i++) {
			let player = players[i].name;
			if (player != "Host") {
				step += 32;
				text(player,width/11,step,60,width);
			}
		}
	}
}

class Role_assign extends Scene{

	private timer: number;

	unload():void{
		//Starts Game Loop
		scenes.changeScene(new Vote());
	}
	update():void {
		background(127,54,30);
		fill(255);
		textSize(64);
		text("Máte 30 sekúnd na pozretie si svojej roly",(width-textWidth("Máte 30 sekúnd na pozretie si svojej roly"))/2, height/4);
		textSize(100);
  		text(this.timer, (width-textWidth(this.timer))/2, height/2);
		if(frameCount % 60 == 0  && this.timer > 0){
			this.timer--;
		}
		if (this.timer == 0) {
			this.unload();
		}
	}
	redraw():void{
		socket.emit('roles', [correction,[roles,players]]);
	}
	load():void{
		this.timer = 30;
		let count = floor((players.length-1)/2);
		if ((players.length-1)<=4){
			count = 1;
		}
		roles[0] = "HOST";
		//Assign roles 1:3 ratio
		let randomNum = floor(random(1,players.length));
		roles[randomNum] = "DETEKTÍV";
		while (count > 0) {
			randomNum = floor(random(1,players.length));
			if (!roles[randomNum]){
				roles[randomNum] = "ZLODEJ";
				count--;
			}
		}
		for (var i = 0; i < players.length; i++) {
			if (!roles[i]) {
				roles[i] = "NEVINNÝ";
			}
		}
		for (var i = 0; i < roles.length; i++) {
			switch (roles[i]){
				case "DETEKTÍV": roles_count[0]++; break;
				case "NEVINNÝ": roles_count[1]++; break;
				case "ZLODEJ": roles_count[2]++; break;
			}
		}
		this.redraw();
	}

}

class Vote extends Scene{

	private bg: Image;
	private rCode: string;
	private timer: number;

	unload():void{
		scenes.changeScene(new Conclusion());
	}

	load():void{
		this.timer = 90;
		this.bg = loadImage("assets/bg-1.png");
		this.rCode = roomCode.substring(16);
		socket.emit('vote',[this.rCode, players]);
	}

	update():void {
		this.redraw();
		if (players.length-1 == answers.length) {
			this.unload();
		}
		if(frameCount % 60 == 0 && this.timer > 0){
			this.timer--;
		}
		if (this.timer == 0) {
			this.unload();
		}
	}

	redraw():void{
		image(this.bg,0,0);
		//Draw title
		fill(255);
		textSize(72);
		text("Hlasovanie", (width-textWidth("Hlasovanie"))/2, height/8);
		textSize(32);
		text("Na svojom zariadení si zvoľte, kto je podľa vás zlodej.", (width-textWidth("Na svojom zariadení si zvoľte, kto je podľa vás zlodej."))/2, height/5);
		//Draw roomcode
		textSize(32);
		text(roomCode, width-textWidth(roomCode) - width/85, height/6);
		//Draw connected players
		textSize(24);
		let step = height/6;
		text("Pripojení hráči:",width/85,height/6);
		for (var i = 0; i < players.length; i++) {
			let player = players[i].name;
			if (player != "Host") {
				step += 32;
				text(player,width/85,step,60,width);
 			}
		}
		//Draw selected users
		textSize(72);
		step = height/6+128;
		text("Hráči, ktorí nezvolili:", (width-textWidth("Hráči, ktorí nezvolili:"))/2,height/3);
		textSize(64);
		for (var i = 0; i < players.length; i++) {
			let player = players[i].id;
			let isThere = false;
			for (var j = 0; j < answers.length; j++) {
				let answer = answers[j];
				if (player == answer[1]) {
					isThere = true;
				}
			}
			if (!isThere && players[i].name != "Host") {
				step += 64;
            	text(players[i].name, (width - textWidth(players[i].name)) / 2, step, 60, width);
			}
		}
		//Draw timer
		fill(255);
		textSize(48);
		text("Čas zostávajúci",width-textWidth("Čas zostávajúci"), height/2);
		text(" na hlasovanie",width-textWidth(" na hlasovanie"), height/2+50);
		textSize(72);
		text(this.timer,width-textWidth(this.timer), height/2+100);
	}
}
class Conclusion extends Scene{

	private bg: Image;
	private picked_role: string;

	unload():void{
		//pick random events or launch endgame
		answers = [];
		picked = [];
		switch(this.picked_role){
			case "DETEKTÍV": roles_count[0]--; break;
			case "NEVINNÝ": roles_count[1]--; break;
			case "ZLODEJ": roles_count[2]--; break;
		}
		if ((roles_count[0]+roles_count[1]) == roles_count[2]) {
			//EPIC FINALE -> TRUE ENDGAME
		}else if (roles_count[2] < 1) {
			//Finale - Innocents win!
		} else {
			scenes.changeScene(new HandsOfTruth());
		}
	}
	load():void{
		background(0);
		if (answers.length == 0 && picked.length == 0) {
			this.unload();
		}
		this.bg = loadImage("assets/bg-2.png");
		for (var i = 0; i < answers.length; i++) {
			let answer = answers[i];
			let isThere = false;
			for (var j = 0; j <	picked.length; j++) {
				let pick = picked[j];
				if( pick[0] == answer[0]){
					pick[1]++;
					pick[2].push(answer[1]);
					isThere = true;
				}
			}
			if (!isThere) {
				picked.push([answer[0], 1, [answer[1]]]);
			}
		}
		this.redraw();
	}
	update():void {
		this.redraw();
	}
	redraw():void{
		image(this.bg,0,0);
		//Draw Title
		fill(255);
		textSize(72);

		//Determine who is out
		let pick = picked[0];
		for (var i = 0; i < picked.length; i++) {
			let tmp = picked[i];
			if(pick[1] < tmp[1]){
				pick[1] = tmp;
			}
		}
		let id = "";
		for (var i = 0; i < players.length; i++) {
			if(players[i].name == pick[0]){
				id = players[i].id;
			}
		}

		let title = pick[0] + " je mŕtvy!";
		text(title, (width-textWidth(title))/2, height/8);

		socket.emit('dead', {
			room: correction,
			id: id
		});

		//Draw who voted for picked
		textSize(32);
		text("Podľa našich dostupných informácií za zažalovanie môžu očití svedkovia:",(width-textWidth("Podľa našich dostupných informácií za zažalovanie môžu očití svedkovia:"))/2,height/5);
		let step = height/6+64;
		for (var i = 0; i < pick[2].length; i++) {
			let who = pick[2];
			for (var j = 0; j < players.length; j++) {
				if(who[i] == players[j].id){
					text(players[j].name, (width-textWidth(players[j].name))/2, step);
					step += 48;
				}
			}
		}
		//Draw picked's role
		text(pick[0]+" poslal svoje posledné slová:", (width-textWidth(pick[0]+" poslal svoje posledné slová:")),height/2);
		for (var i = 0; i < players.length; i++) {
			if(players[i].name == pick[0]){
				this.picked_role = roles[i];
				text("Som: "+roles[i],(width-textWidth("Som: "+roles[i]))/2, height/2);
			}
		}
	}
}
class HandsOfTruth extends Scene{

	private bg: Image;
	private task: string;
	private size: number;
	private round: number;
	private timer: number;
	private label: string;
	private drawAnswer: number;

	unload():void{
		scenes.changeScene(new Vote());
	}

	load():void{
		socket.emit('Hands', correction);
		this.bg = loadImage("assets/bg-3.jpg");
		this.size = 72;
		this.drawAnswer = 0;
		this.timer = 10;
		this.round = 1;
		this.label = "Hands of truth";

		textSize(this.size);
		while(this.task != undefined);
	}
	update():void {
		this.redraw();
	}

	redraw():void{
		image(this.bg,0,0);

		fill(255);
		if (this.drawAnswer == 1) {
			text("Úloha znela:",(width-textWidth("Úloha znela:"))/2,height/2.5);
			if (textWidth(this.task) < width) {
				textSize(this.size);
			}else{
				while(textWidth(this.task) > width){
					this.size--;
					textSize(this.size);
				}
			}
			text(this.task,(width-textWidth(this.task))/2,height/2);
			if(frameCount % 60 == 0 && this.timer > 0){
				this.timer--;
			}
			if(this.timer == 0){
				if (this.round == 3) {
					this.unload();
				}
			}
		}else{
			textSize(128);
			text(this.label,(width-textWidth(this.label))/2, height/2);
			if (this.round == 1) {
				text("Na svojom zariadení si prečítajte úlohu.",(width-textWidth("Na svojom zariadení si prečítajte úlohu."))/2, height/2+150);
			}
			if(frameCount % 60 == 0 && this.timer > 0){
				this.timer--;
			}
			if (this.timer == 0) {
				if (this.round == 2) {
					this.drawAnswer = 1;
					this.timer = 20;
					this.round = 3;
				}
				if (this.round == 1) {
					//Play GO! sound
					image(this.bg,0,0);
					this.label = "Teraz!"
					this.timer = 5;
					this.round = 2;
				}
			}
		}
	}
}

class YouGottaPoint extends Scene{

	private bg: Image;
	private task: string;
	private size: number;
	private round: number;
	private timer: number;
	private label: string;
	private drawAnswer: number;

	unload():void{
		scenes.changeScene(new Vote());
	}

	load():void{
		socket.emit('Point', correction);
		this.bg = loadImage('assets/bg-3.png');
		this.size = 72;
		this.drawAnswer = 0;
		this.timer = 10;
		this.round = 1;
		this.label = "You gotta point!";

		while(this.task != undefined);
	}

	update():void {
		this.redraw();
	}

	redraw():void{
		image(this.bg,0,0);
		fill(255);
		if (this.drawAnswer == 1) {
			text("Úloha znela:",(width-textWidth("Úloha znela:"))/2,height/2.5);
			if (textWidth(this.task) < width) {
				textSize(this.size);
			}else{
				while(textWidth(this.task) > width){
					this.size--;
					textSize(this.size);
				}
			}
			text(this.task,(width-textWidth(this.task))/2,height/2);
			if(frameCount % 60 == 0 && this.timer > 0){
				this.timer--;
			}
			if(this.timer == 0){
				if (this.round == 3) {
					this.unload();
				}
			}
		}else{
			textSize(128);
			text(this.label,(width-textWidth(this.label))/2, height/2);
			textSize(64);
			if (this.round == 1) {
				text("Na svojom zariadení si prečítajte úlohu.",(width-textWidth("Na svojom zariadení si prečítajte úlohu."))/2, height/2+150);
			}
			if(frameCount % 60 == 0 && this.timer > 0){
				this.timer--;
			}
			if (this.timer == 0) {
				if (this.round == 2) {
					this.drawAnswer = 1;
					this.timer = 20;
					this.round = 3;
				}
				if (this.round == 1) {
					//Play GO! sound
					image(this.bg,0,0);
					this.label = "Teraz!";
					this.timer = 5;
					this.round = 2;
				}
			}
		}
	}
}


class SceneManager{
	currScene: Scene;
	private static instance: SceneManager;

	public static getInstance():SceneManager{
		if (!this.instance) {
            this.instance = new SceneManager();
        }
        return this.instance;
	}

	public update():void{
		this.currScene.update();
	}
	public redraw():void{
		this.currScene.redraw();
	}

	public changeScene(newScene:Scene):void{
		newScene.load();
		this.currScene = newScene
	}
}
//Socket.IO
let socket = io();
//Player variables
let players = [];
let roles = [];
let roles_count = [0,0,0]; //No. Detectives, Innocents and Murderers
let answers = [];
let picked = [];

let roomCode = "";
let correction;
let url = "";
//SceneManager, canvas variables
let width;
let height;
let scenes;

function setup(){
	//Creating canvas
	width = window.innerWidth;
	height = window.innerHeight;
	createCanvas(width,height);
	frameRate(60);

	//Initialize Scene
	scenes = new SceneManager();
	scenes.changeScene(new Lobby());
	background(0);

	//Update server with new Room
	socket.emit('createRoom');
	//Get room code
	socket.on('code', function(code){
		correction = code;
		roomCode = "Kód miestnosti: " + code;
	});
	//Send players
	socket.on('send', function(data){
		players = data;
	});
	//Error handeling
	socket.on('err', function(error){
		alert(error);
		location.reload();
	});
	//Final Voting
	socket.on('VoteFinal', function(data){
		answers.push([data.answer,data.id]);
	});
	//Url Handeling
	socket.on('url',function(data){
		url = data;
	});
	//DB Handeling
	socket.on('HandsTask', function(data){
		scenes.currScene.task = data;
	});
	socket.on('PointTask', function(data){
		scenes.currScene.task = data;
	});
}

function draw(){
	scenes.update();
}

function keyPressed(){
	if(key == 'a'){
		scenes.changeScene(new YouGottaPoint());
	}
}

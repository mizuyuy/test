/* クラス宣言 */
class Splite {
  image = new Image();
  posx = 0;
  posy = 0;
  speed = 0;
  accele = 0;
  angle = 0;
  //接触判定時の半径
  r = 32;
  //画像のサイズ
  width = 64;
  height = 64;

  draw(g) {
    g.drawImage(
      this.image,
      this.posx - this.width/2,
      this.posy - this.height/2,
      this.width,
      this.height
    );
  }

  update() {
    this.posx += this.speed * Math.cos(this.angle * Math.PI / 180);
    this.posy += this.speed * Math.sin(this.angle * Math.PI / 180);
  }
};

/* オブジェクト宣言 */
const Scenes = {
  gamemain: "game main",
  gameover: "game over"
};

let key_state = {
  up:     false,
  down:   false,
  left:   false,
  right:  false
};

/* 変数宣言 */
let canvas;
let g;
let player;
let enemy;
let tarx;
let tary;

onload = function () {
  // 描画コンテキストの取得
  canvas = document.getElementById("gamecanvas");
  g = canvas.getContext("2d");
  // 初期化
  init();
  // 入力処理の指定
  document.onkeydown = keydown;
  document.onkeyup = keyup;
  document.onclick = click;
  // ゲームループの設定 60FPS
  setInterval("gameloop()", 16);
};

function init() {
  player = new Splite();
  player.posx = canvas.width/2;
  player.posy = canvas.height/2;
  player.image.src = "./img/amongus_R.png";

  enemy = new Splite();
  enemy.posx = 100;
  enemy.posy = 100;
  enemy.image.src = "./img/amongus_G.png";
}

function keydown(e) {
  let output = ``;
  // WSAD or 方向キーの判定
	if (e.code == 'KeyW' || e.code == 'ArrowUp') {
    key_state.up = true;
		output = `Up`;
	} else if (e.code == 'KeyS' || e.code == 'ArrowDown') {
    key_state.down = true;
		output = `Down`;
	} else if (e.code == 'KeyA' || e.code == 'ArrowLeft') {
    key_state.left = true;
		output = `Left`;
	} else if (e.code == 'KeyD' || e.code == 'ArrowRight') {
    key_state.right = true;
		output = `Right`;
	} else {
    /* 方向入力なし */
  }

	console.log(output);
  console.log(key_state);
}

function keyup(e) {
  // WSAD or 方向キーの判定
	if (e.code == 'KeyW' || e.code == 'ArrowUp') {
    key_state.up = false;
	} else if (e.code == 'KeyS' || e.code == 'ArrowDown') {
    key_state.down = false;
	} else if (e.code == 'KeyA' || e.code == 'ArrowLeft') {
    key_state.left = false;
	} else if (e.code == 'KeyD' || e.code == 'ArrowRight') {
    key_state.right = false;
	} else {
    /* 方向入力なし */
  }
}

function click(e) {
  console.log(e.offsetX, e.offsetY);
  tarx = e.offsetX;
  tary = e.offsetY;
}

function angle_calc() {
  player.angle = 0;
  let vector = {
    x: 0,
    y: 0
  };

  if (key_state.up) {
    vector.y -= 1;
    player.angle -= 90;
  }
  if (key_state.down) {
    vector.y += 1;
    player.angle += 90;
  }
  if (key_state.left) {
    vector.x -= 1;
    player.angle = 180 - player.angle / 2;
  }
  if (key_state.right) {
    vector.x += 1;
    player.angle = player.angle / 2;
  } 

  if ((vector.x != 0) || (vector.y != 0)) {
    player.speed = 3;
  } else {
    player.speed = 0; 
  }
}

function chase(posx, posy) {
  let calcx = posx - enemy.posx;
  let calcy = posy - enemy.posy;

  if ((Math.abs(calcx) > 10) || (Math.abs(calcy) > 10)) {
    enemy.angle = Math.atan(calcy / calcx) / Math.PI * 180;
    if (calcx < 0) {
      enemy.angle += 180;
    }
    enemy.speed = 2;
  } else {
    enemy.speed = 0;
  }
}

function gameloop() {
  update();
  draw();
}

function update() {
  angle_calc();
  //chase(tarx, tary);
  chase(player.posx, player.posy);
  player.update();
  enemy.update();
}

function draw() {
  //背景
  g.fillStyle = "rgb(0,0,0)";
  g.fillRect(0, 0, 480, 480);
  player.draw(g);
  enemy.draw(g);
}

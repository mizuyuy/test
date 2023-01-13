/* 画像描画クラス */
class Splite {
  // 初期化関数
  constructor(img_src, g) {
    this.image = new Image();
    this.image.src = img_src;
    //画像のサイズ
    this.width = 40;
    this.height = 40;
    this.context = g;
  }

  // 描画関数
  draw(x, y, gain) {
    this.context.drawImage(
      this.image,
      x,
      y,
      this.width * gain,
      this.height * gain
    );
  }
};

/* 描画キャラクタクラス */
class Actor extends Splite {
  // 初期化関数
  constructor(name, img_src, posx, posy, g, map) {
    super(img_src, g);
    this.name = name;
    this.posx = posx;
    this.posy = posy;
    this.map = map;
    this.map.actor_layout[this.posy][this.posx] = this;
    this.saving = 0;  // 貯金
    this.collected_item = []; // 持ってるもの
    this.direction = { x: 0, y: 0 };  // 向いている方向
    this.move_history = []; // 移動履歴　
    this.move_history_cnt = 8; // 捜索範囲 random_moveの時に行かないようにする場所
    this.pre_attack = false; // 攻撃前
    /* ステータス */
    this.hp = 10;
    this.atk = 7;
    this.def = 2;
  }

  // 描画関数
  draw() {
    super.draw(this.posx * this.width, this.posy * this.height, 1);
    if (this.pre_attack == true) {
      effect_pre_attack(this.posx, this.posy, this.direction);
    }
  }

  // 攻撃
  attack() {
    let attack_target = this.look(this.direction.x, this.direction.y)[0];
    // 攻撃エフェクト
    effect_attack(this.direction.x + this.posx, this.direction.y + this.posy);

    // 攻撃方向にactor(オブジェクト)がいればダメージ計算
    if (attack_target instanceof Object === true) {
      this.calc_damage(attack_target);
    }
  }

  // ダメージ計算
  calc_damage(actor) {
    // ダメージ計算
    let damage = this.atk - actor.def;
    actor.hp -= damage;

    // ダメージエフェクト
    effect_damage(actor.posx, actor.posy);

    // text 出力
    set_text(this.name + " は " + actor.name + " に攻撃 " + damage + "ダメージを与えた");

    // 倒したキャラを消す
    if (actor.hp <= 0) {
      this.map.actor_layout[actor.posy][actor.posx] = 0;
      actor_list = actor_list.filter((other) => other !== actor); // 倒されたキャラ以外のリストにする

      // text 出力
      set_text(actor.name + " はたおれた");
    }
  }

  // 移動
  move(x, y) {
    // 移動先が空いていれば移動
    if (this.look(x, y)[0] == 0) {
      this.map.actor_layout[this.posy][this.posx] = 0; // map更新
      this.posx += x;
      if (this.posx < 0) {
        this.posx = 0;
      }
      this.posy += y;
      if (this.posy < 0) {
        this.posy = 0;
      }
      this.map.actor_layout[this.posy][this.posx] = this; // map更新
    }

    // 方向設定
    if (x != 0) {
      this.direction.x = x / Math.abs(x);
    } else {
      this.direction.x = 0;
    }
    if (y != 0) {
      this.direction.y = y / Math.abs(y);
    } else {
      this.direction.y = 0;
    }

    // 床のものを拾う
    this.pickup();

    // エリア効果
    this.area_action();

    // 移動履歴追加
    this.move_history.push({ posx: this.posx, posy: this.posy });
    while (this.move_history.length >= this.move_history_cnt) { // 履歴が指定回数以上だったら古いものを削除
      this.move_history.shift();
    }

    // text 出力
    set_text(this.name + " 移動 X:" + this.posy + " Y:" + this.posx + " coin:" + this.saving);
  }

  // ターゲットが攻撃範囲内にいるか
  check_attack_range(actor, range) {
    let difx = actor.posx - this.posx;
    let dify = actor.posy - this.posy;

    // 捜索範囲設定
    if (((Math.abs(difx) <= range) && (dify == 0)) || ((Math.abs(dify) <= range) && (difx == 0))) {
      // ターゲットの方向を向く
      if (difx != 0) {
        this.direction.x = difx / Math.abs(difx);
      } else {
        this.direction.x = 0;
      }
      if (dify != 0) {
        this.direction.y = dify / Math.abs(dify);
      } else {
        this.direction.y = 0;
      }
      return true;
    } else {
      return false;
    }
  }

  // 追いかけ
  chase(actor) {
    let difx = actor.posx - this.posx;
    let dify = actor.posy - this.posy;

    // 捜索範囲設定
    if ((Math.abs(difx) + Math.abs(dify)) > 1) {
      this.move_history_cnt = 8;
    } else {
      this.move_history_cnt = 1;
    }

    if (Math.abs(difx) >= Math.abs(dify)) {
      // 差分が大きい方向から近づく
      if ((this.look(difx / Math.abs(difx), 0)[0] == 0) && (!this.move_history.some((pos) => ((pos.posx == difx / Math.abs(difx) + this.posx) && (pos.posy == this.posy))))) {
        this.move(difx / Math.abs(difx), 0);
      } else if ((dify != 0) && (this.look(0, dify / Math.abs(dify))[0] == 0) && (!this.move_history.some((pos) => ((pos.posx == this.posx) && (pos.posy == dify / Math.abs(dify) + this.posy))))) {
        // 移動できなければ別の方向から
        this.move(0, dify / Math.abs(dify));
      } else {
        // どっちもダメならランダムに移動
        this.random_move();
      }
    } else {
      if ((this.look(0, dify / Math.abs(dify))[0] == 0) && (!this.move_history.some((pos) => ((pos.posx == this.posx) && (pos.posy == dify / Math.abs(dify) + this.posy))))) {
        this.move(0, dify / Math.abs(dify));
      } else if ((difx != 0) && (this.look(difx / Math.abs(difx), 0)[0] == 0) && (!this.move_history.some((pos) => ((pos.posx == difx / Math.abs(difx) + this.posx) && (pos.posy == this.posy))))) {
        this.move(difx / Math.abs(difx), 0);
      } else {
        this.random_move();
      }
    }
  }

  // ランダムに移動
  random_move() {
    let move_ok = false;
    let back_cnt = 0;  // バックせざる得ない時

    while ((!move_ok) && (back_cnt <= 4)) { // 行動不能時の対策
      switch (get_random(0, 3)) {
        case 0:
          if ((!this.move_history.some((pos) => ((pos.posx == this.posx + 1) && (pos.posy == this.posy)))) || (back_cnt >= 4)) {
            if (this.look(1, 0)[0] == 0) {
              this.move(1, 0);
              move_ok = true;
            }
          }
          break;
        case 1:
          if ((!this.move_history.some((pos) => ((pos.posx == this.posx - 1) && (pos.posy == this.posy)))) || (back_cnt >= 4)) {
            if (this.look(-1, 0)[0] == 0) {
              this.move(-1, 0);
              move_ok = true;
            }
          }
          break;
        case 2:
          if ((!this.move_history.some((pos) => ((pos.posx == this.posx) && (pos.posy == this.posy + 1)))) || (back_cnt >= 4)) {
            if (this.look(0, 1)[0] == 0) {
              this.move(0, 1);
              move_ok = true;
            }
          }
          break;
        case 3:
          if ((!this.move_history.some((pos) => ((pos.posx == this.posx) && (pos.posy == this.posy - 1)))) || (back_cnt >= 4)) {
            if (this.look(0, -1)[0] == 0) {
              this.move(0, -1);
              move_ok = true;
            }
          }
          break;
      }
      back_cnt++;
    }
  }

  // 場所情報
  look(offsetx, offsety) {
    let x = this.posx + offsetx;
    let y = this.posy + offsety;

    if (this.map.tiles[y][x] != 1) { // 対象マスが壁以外
      return [this.map.actor_layout[y][x], this.map.item_layout[y][x]];
    }
    return [1, 0];
  }

  // 床のitemを拾う
  pickup() {
    let point = [0, 0];   // x,y
    let foot_item = this.look(0, 0)[1]; // 足元のアイテム

    if (foot_item != 0) { // 足元にアイテムがあるか
      if (this.collected_item.map((item) => item.name).includes(foot_item.name)) {
        this.collected_item.find((item) => item.name == foot_item.name).quantity += foot_item.quantity; // 同じ名前の数量を増やす
      } else {
        this.collected_item.push(foot_item); // 収集品配列に追加
      }
      item_list = item_list.filter((item) => item !== foot_item); // 足元のアイテムと同じインスタンス以外を再代入
      this.saving++;

      // コイン移動
      this.map.item_layout[this.posy][this.posx] = 0;
      point = this.map.random_emptysquare();
      item_list.push(new Item("コイン", "./img/コイン.png", point[0], point[1], g, map));

      // テキスト出力
      //set_text(this.collected_item.map(item => item.name)); // 取得アイテム名表示
      //set_text(this.collected_item.map(item => item.quantity)); // 取得アイテム数量表示
    }
  }

  // エリア効果
  area_action() {
    switch (this.map.tiles[this.posy][this.posx]) {
      case 0:
        /* 床 */
        break;
      case 1:
        // 壁
        break;
      case 2:
        // 焚火
        this.hp = 10;
        // text 出力
        set_text(this.name + " は 焚火で回復した！");
        break;
      default:
        /* 想定外 */
        break;
    }
  }
}

class Enemy extends Actor {
  // 初期化関数
  constructor(name, img_src, posx, posy, g, map) {
    super(name, img_src, posx, posy, g, map);
    this.flame_time = 0; // フレーム時間　行動ごとの待機時間
    this.flame_cnt = 0; // フレームカウント
    this.chase_target = false; // 追いかける対象
    this.action = 0;
  }

  // 動作
  update() {
    this.flame_cnt++;
    if (this.flame_cnt >= this.flame_time) {
      this.flame_cnt = 0;
      this.flame_time = 8;
      switch (this.action) {
        case 0:
          this.flame_time = 0;
          /* 何もしない */
          break;
        case 1:
          this.flame_time = 20;
          this.random_move();
          break;
        case 2:
          // ターゲットが設定されていれば追いかけ
          if (this.chase_target != false) {
            this.flame_time = 12;
            this.chase(this.chase_target);
          }
          break;
        case 3:
          if (this.chase_target != false) {
            // 1の時はターゲットと隣接状態
            if (this.check_attack_range(this.chase_target, 1) == true) {
              if (this.pre_attack == false) {
                this.flame_time = 30;
                this.pre_attack = true;
              } else {
                this.flame_time = 50;
                this.pre_attack = false;
                this.attack();
              }
            } else {
              if (this.pre_attack == false) {
                this.flame_time = 20;
                this.chase(this.chase_target);
              } else {
                this.flame_time = 50;
                this.pre_attack = false;
                this.attack();
              }
            }
          }
          break;
        default:
          /* 想定外 */
          break;
      }
    }
  }
}

class Item extends Splite {
  // 初期化関数
  constructor(name, img_src, posx, posy, g, map) {
    super(img_src, g);
    this.name = name;
    this.posx = posx;
    this.posy = posy;
    this.map = map;
    this.map.item_layout[this.posy][this.posx] = this;
    this.quantity = 1;  // 個数
  }

  // 描画関数
  draw() {
    super.draw(this.posx * this.width, this.posy * this.height, 1);
  }
}

class Effect extends Splite {
  // 初期化関数
  constructor(img_src, posx, posy, g) {
    super(img_src, g);
    this.posx = posx;
    this.posy = posy;
    this.flame_cnt = 0; // フレームカウント
    this.flame_end = 10; // 消えるフレーム
    this.image_gain = 1;  // 画像倍率
    this.offsetx = 0;
    this.offsety = 0;
  }

  update() {
    this.flame_cnt++;
    if (this.flame_end <= this.flame_cnt) {
      effect_list = effect_list.filter((effect) => effect !== this); // リストから自分を削除
    }
  }

  draw() {
    super.draw(this.posx * this.width + this.offsetx, this.posy * this.height + this.offsety, this.image_gain);
  }
}

/* マップクラス */
class Map {
  // 初期化関数
  constructor(img_src1, img_src2, g) {
    this.wall = new Splite(img_src1, g);
    this.bonfire = new Splite(img_src2, g);
  }

  /** タイルマップ。0は床、1は壁をあらわす */
  tiles = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1],
    [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  // tiles = [
  //   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 0, 0, 2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  //   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // ];

  /* actorの配置図 */
  actor_layout = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  /* itemの配置図 */
  item_layout = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  // 描画関数
  draw() {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 20; x++) {
        switch (this.tiles[y][x]) {
          case 0:
            /* 床 */
            break;
          case 1:
            // 壁
            this.wall.draw(this.wall.width * x, this.wall.height * y, 1);
            break;
          case 2:
            // 焚火
            this.bonfire.draw(this.bonfire.width * x, this.bonfire.height * y, 1);
            break;
          default:
            /* 想定外 */
            break;
        }
      }
    }
  }

  // ランダムな空きマス
  random_emptysquare() {
    let x = get_random(0, this.tiles[0].length - 1);
    let y = get_random(0, this.tiles.length - 1);

    // 空きマスが出るまで回す
    while ((this.tiles[y][x] != 0) || (this.actor_layout[y][x] != 0) || (this.item_layout[y][x] != 0)) {
      x = get_random(0, this.tiles[0].length - 1);
      y = get_random(0, this.tiles.length - 1);
    }

    return [x, y];
  }
}

/* カメラクラス */
class Camera {
  // 初期化関数
  constructor(x, y, g) {
    this.posx = x;
    this.posy = y;
    this.context = g;
  }

  draw() {
    this.context.setTransform(1, 0, 0, 1, this.posx, this.posy);
  }
}

/* 定数宣言 */
const DISP_MODE = ["main", "inventory"];

/* 変数宣言 */
let key_state = {
  up: false,
  down: false,
  left: false,
  right: false,
  inventory: false,
  space: false,
  space_up: false
};
let before_key = {};
let canvas;
let g;
let player;
let actor_list = [];  // 動的スプライトリスト
let item_list = [];   // 静的スプライトリスト
let effect_list = [];
let map;
let camera;
let output_text = ["", "", "", ""]; //テキスト格納　4行まで
let text_cnt = 0;
let time_cnt = 0;
let time_flame = 0;
let disp_mode = "main";

// canvas 初期設定
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

// 初期化
function init() {
  Object.assign(before_key, key_state); // 入力初期化
  map = new Map("./img/トイレットペーパー.png", "./img/焚火.png", g);
  player = new Actor("ぷれいや", "./img/amongus_R.png", 2, 4, g, map);
  actor_list.push(player);
  actor_list.push(new Enemy("スライム", "./img/スライム.png", 1, 1, g, map));
  actor_list.push(new Enemy("猫", "./img/猫.png", 3, 3, g, map));
  actor_list.push(new Enemy("ポチタ", "./img/ポチタ.png", 4, 1, g, map));
  item_list.push(new Item("コイン", "./img/コイン.png", 1, 3, g, map));
  item_list.push(new Item("リンゴ", "./img/リンゴ.png", 3, 1, g, map));
  camera = new Camera(0, 0, g);

  actor_list[1].action = 3;
  actor_list[1].chase_target = player;
  // actor_list[2].action = 2;
  // actor_list[2].chase_target = item_list[0];
  // actor_list[3].action = 2;
  // actor_list[3].chase_target = item_list[1];
}

// メインループ
function gameloop() {
  switch (disp_mode) {
    case "main":
      main_update();
      main_draw();
      break;
    case "inventory":
      inventory_update();
      inventory_draw();
      break;
    default:
      /* 想定外 */
      break;
  }
}

// メイン更新
function main_update() {
  // 追従目標の再設定 コインが再出現すると変わる
  // actor_list[2].chase_target = item_list[0];
  // actor_list[3].chase_target = item_list[1];

  // プレイヤー移動
  time_cnt++;
  if (time_cnt >= time_flame) {
    time_flame = 0;
    time_cnt = 0;
    // キー操作
    if (JSON.stringify(before_key) !== JSON.stringify(key_state)) {
      // 攻撃前なら移動せず攻撃方向変更
      if (player.pre_attack == false) {
        time_flame = 4;
        if (key_state.up == true) {
          key_state.up = false;
          player.move(0, -1);
        }
        if (key_state.down == true) {
          key_state.down = false;
          player.move(0, 1);
        }
        if (key_state.left == true) {
          key_state.left = false;
          player.move(-1, 0);
        }
        if (key_state.right == true) {
          key_state.right = false;
          player.move(1, 0);
        }
      } else {
        // 移動      
        if (key_state.up == true) {
          key_state.up = false;
          player.direction = { x: 0, y: -1 };
        }
        if (key_state.down == true) {
          key_state.down = false;
          player.direction = { x: 0, y: 1 };
        }
        if (key_state.left == true) {
          key_state.left = false;
          player.direction = { x: -1, y: 0 };
        }
        if (key_state.right == true) {
          key_state.right = false;
          player.direction = { x: 1, y: 0 };
        }
      }

      if (key_state.inventory == true) {
        key_state.inventory = false;
        // インベントリ表示
        disp_mode = "inventory"
      }

      if (key_state.space == true) {
        key_state.space = false;
        // 攻撃前
        player.pre_attack = true;
        time_flame = 10;
      }
      if (key_state.space_up == true) {
        key_state.space_up = false;
        // 攻撃
        if (player.pre_attack == true) {
          player.pre_attack = false;
          player.attack();
        }
        time_flame = 20;
      }
      Object.assign(before_key, key_state);
    }
  }

  // 敵の更新
  for (i = 1; i < actor_list.length; i++) {
    actor_list[i].update();
  }

  // エフェクトの更新
  for (i = 0; i < effect_list.length; i++) {
    effect_list[i].update();
  }

  // カメラ設定
  camera.posx = 220 - player.posx * player.width;
  camera.posy = 220 - player.posy * player.height;
}

// メイン描写
function main_draw() {
  //背景
  draw_backgrand();

  // スプライト描画
  camera.draw();
  map.draw();

  for (let i = 0; i < item_list.length; i++) {
    item_list[i].draw();
  }
  for (let i = 0; i < actor_list.length; i++) {
    actor_list[i].draw();
  }
  for (let i = 0; i < effect_list.length; i++) {
    effect_list[i].draw();
  }

  // テキストの描画
  draw_text();
}

// インベントリ更新
function inventory_update() {
  // キー操作
  if (JSON.stringify(before_key) !== JSON.stringify(key_state)) {
    if (key_state.up == true) {
      key_state.up = false;

    }
    if (key_state.down == true) {
      key_state.down = false;

    }
    if (key_state.left == true) {
      key_state.left = false;

    }
    if (key_state.right == true) {
      key_state.right = false;

    }
    if (key_state.inventory == true) {
      key_state.inventory = false;
      disp_mode = "main"
    }
    Object.assign(before_key, key_state);
  }
}

// インベントリ描写
function inventory_draw() {
  g.setTransform(1, 0, 0, 1, 0, 0); // 描画起点の設定
  g.fillStyle = "rgb(125,155,185)";
  g.fillRect(0, 0, 880, 480);
  g.fillStyle = "rgb(0,0,0)";
  g.fillRect(0, 360, 880, 120);
  g.fillStyle = "rgb(255,255,255)";
  g.font = "30px serif"
  let gain = 3;
  let x = 240 - (player.width * gain) / 2;
  let y = 240 - (player.height * gain) / 2;
  player.draw(x, y, gain);
  for (let i = 0; i < player.collected_item.length; i++) {
    player.collected_item[i].draw(10 + 50 * i, 370, 1);
    g.fillText(player.collected_item[i].quantity, 20 + 50 * i, 440);
  }
}

//背景描画
function draw_backgrand() {
  g.setTransform(1, 0, 0, 1, 0, 0); // 描画起点の設定
  g.fillStyle = "rgb(155,155,155)";
  g.fillRect(0, 0, 880, 480);
}

// テキスト描画
function draw_text() {
  g.setTransform(1, 0, 0, 1, 0, 0); // 描画起点の設定
  g.fillStyle = "rgb(0,0,0)";
  g.fillRect(0, 480, 480, 120);
  g.fillStyle = "rgb(0,255,255)";
  g.font = "30px serif"
  for (let i = 0; i < 4; i++) {
    g.fillText(output_text[i], 0, 510 + 30 * i);
  }
}

// テキストセット
function set_text(text) {
  for (let i = 0; i < 3; i++) {
    output_text[i] = output_text[i + 1];
  }
  text_cnt++;
  output_text[3] = text_cnt + ":" + text;
}

// アタックエフェクト
function effect_attack(x, y) {
  effect_list.push(new Effect("./img/こぶし.png", x, y, g));
}

// アタック予備動作エフェクト
function effect_pre_attack(x, y, direction) {
  let effect = new Effect("./img/こぶし.png", x, y, g);
  effect.image_gain = 0.5;
  effect.offsety = effect.height / 3 * (direction.y + 1);
  effect.offsetx = effect.width / 3 * (direction.x + 1);
  effect.flame_end = 1;
  effect_list.push(effect);
}

// ダメージエフェクト
function effect_damage(x, y) {
  effect_list.push(new Effect("./img/ダメージ.png", x, y, g));
}

// 入力
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

  // アクション
  if (e.code == 'KeyI') {
    key_state.inventory = true;
    output += ` Inventory`;
  }
  if (e.code == 'Space') {
    key_state.space = true;
    key_state.space_up = false;
    output += ` Space`;
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

  // アクション
  if (e.code == 'KeyI') {
    key_state.inventory = false;
  }
  if (e.code == 'Space') {
    key_state.space = false;
    key_state.space_up = true;
  }
}

function click(e) {
  console.log(e.offsetX, e.offsetY);
  tarx = e.offsetX;
  tary = e.offsetY;
}

// 乱数生成
function get_random(min, max) {
  var random = Math.floor(Math.random() * (max + 1 - min)) + min;
  return random;
}

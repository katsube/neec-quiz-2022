/**
 * クイズゲームサーバー
 *
 * Usage:
 *  $ node serve.js
 */

//-----------------------------------------------
// モジュール
//-----------------------------------------------
const crypto = require('crypto');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// 問題文を管理するクラス
const Question = require('./lib/question');

// キーコード
const KeyCode = require('./lib/keycode');

//-----------------------------------------------
// グローバル変数
//-----------------------------------------------
//-----------------------------
// サーバー
//-----------------------------
// 世界中に公開するフォルダ
const DOCUMENT_ROOT = __dirname + '/public';

// サーバのポート番号
const PORT = 3000;

//-----------------------------
// 参加者
//-----------------------------
// 参加者のリスト
const MEMBERS = {
  // socketid: {
  //   id:1,
  //   token:'xxx',
  //   name:'あるぱか',
  //   avatar:'/image/user_arupaka.png'
  //   pos: {x:0, y:0}
  //},
};
let MEMBERS_COUNT = 1;

// 最大同時参加者数
const MAXPLAYERS = 2;

//-----------------------------
// ゲーム関係
//-----------------------------
// モニタリング間隔（ミリ秒）
const MONITORING_TIME = 1000;

// 現在のサーバーモード
let SERVER_MODE = 'MATCIHING';  // 'MATCIHING' or 'GAME'

// 問題を管理する
const QUESTION = {
  q: null,
  a: null
};

// アバターの一覧
const AVATARS = [
  '/image/user_arupaka.png',
  '/image/user_panda.png'
];


//-----------------------------------------------
// ルーティング（express）
//-----------------------------------------------
// 静的なファイルを公開する
// （動的なファイルはルーティングの設定が必要）
app.use(express.static(DOCUMENT_ROOT));


//-----------------------------------------------
// Socket.IO
//-----------------------------------------------
io.on('connection', (socket) => {
  console.log('新しいユーザーが接続しました');

  //---------------------------
  // 新規接続
  //---------------------------
  // トークンを生成してクライアントに送信
  const token = createToken();
  io.to(socket.id).emit('token', {token, id:MEMBERS_COUNT});

  // 参加者リストに追加
  MEMBERS[socket.id] = {
    id: MEMBERS_COUNT,
    token: token,
    name: null,
    avatar: null,
    pos: {x:0, y:0}
  };
  MEMBERS_COUNT++;

  //---------------------------
  // 入室
  //---------------------------
  socket.on('join', (data) => {
    console.log('join', data);
    // マッチングモードで無ければ何もしない
    if( SERVER_MODE !== 'MATCIHING' ){
      console.log('マッチングモードでは無いため無視します');
      io.to(socket.id).emit('join-fail', {message:'マッチングモードで無いため入室できません'});
      return;
    }
    // トークンを検証
    if(data.token !== MEMBERS[socket.id].token){
      console.log('トークンが一致しません');
      return;
    }

    // 参加者リストに追加
    MEMBERS[socket.id].name = data.name;

    // アバター画像を決定
    const id = MEMBERS[socket.id].id;
    const avatar_len = AVATARS.length;
    MEMBERS[socket.id].avatar = AVATARS[id % avatar_len];

    // 初期座標を決定
    const pos = {
      x: id * 150,  // 150pxずつずらす
      y: 250        // 固定
    };
    MEMBERS[socket.id].pos = pos;
  });

  //---------------------------
  // [Game] キャラ移動
  //---------------------------
  socket.on('move', (data) => {
    console.log('move', data);
    // ゲームモードで無ければ何もしない
    if( SERVER_MODE !== 'GAME' ){
      console.log('ゲームモードでは無いため無視します')
      return;
    }
    // トークンを検証
    if(data.token !== MEMBERS[socket.id].token){
      console.log('トークンが一致しません');
      return;
    }

    // 座標を移動
    const ismove = moveChara(socket.id, data.key);

    // 全ユーザーに通知
    if(ismove){
      const id  = MEMBERS[socket.id].id;
      const pos = MEMBERS[socket.id].pos;
      io.emit('member-move', {id, pos});
    }
  });
});

//------------------------------
// サーバ起動
//------------------------------
http.listen(PORT, () => {
  console.log(`サーバを起動しました localhost:${PORT}`);
});

//------------------------------
// タイマー
//------------------------------
setInterval(() => {
  //------------------------------
  // マッチング中
  //------------------------------
  if(SERVER_MODE === 'MATCIHING'){
    // 2人以上いたらゲーム開始
    if(countConnectMembers() >= MAXPLAYERS){
      console.log('ゲーム開始');
      SERVER_MODE = 'GAME';

      // 問題を生成
      const q = new Question();
      QUESTION.q = q.getQuestion();
      QUESTION.a = q.getAnswer();

      // メンバー一覧を作成
      const members = createMemberList();

      // クライアントに送信
      io.emit('start', {question: QUESTION.q, members});
    }
  }
  //------------------------------
  // ゲーム中
  //------------------------------
  else if(SERVER_MODE === 'GAME'){
    // ToDo: 次回以降追加
  }
}, MONITORING_TIME);


/**
 * 座標を移動する
 *
 * @param {string} socketid
 * @param {number} keycd WASDのキーコード
 * @param {number} step  移動量
 * @return {boolean} 移動したかどうか
 */
function moveChara(socketid, keycd, step=10){
  const user = MEMBERS[socketid];
  let flag = false;   // 移動したかどうか

  switch(keycd){
    case KeyCode.KEY_W:  // W
      user.pos.y -= step;
      flag = true;
      break;
    case KeyCode.KEY_A:  // A
      user.pos.x -= step;
      flag = true;
      break;
    case KeyCode.KEY_S:  // S
      user.pos.y += step;
      flag = true;
      break;
    case KeyCode.KEY_D:  // D
      user.pos.x += step;
      flag = true;
      break;
    default:
      // その他のキーは何もしない
      break;
  }

  return(flag);
}


/**
 * 対戦者一覧を作成
 *
 * @returns {array}
 */
function createMemberList(){
  const members = [];
  for(let key in MEMBERS){
    const user = MEMBERS[key];
    if(user.name !== null && user.name !== ''){
      members.push({
        id:     user.id,
        name:   user.name,
        avatar: user.avatar,
        pos:    user.pos
      });
    }
  }
  return(members);
}

/**
 * 現在の参加者数をカウント
 *
 * @returns {number}
 */
function countConnectMembers(){
  let count = 0;
  for(let key in MEMBERS){
    const user = MEMBERS[key];
    if(user.name !== null && user.name !== ''){
      count++;
    }
  }
  return(count);
}

/**
 * トークンを生成する
 *
 * @return {string} トークン
 */
function createToken(){
  const uuid = crypto.randomUUID();       // 例： 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
  const token = uuid.replaceAll('-','');  // 例： 1b9d6bcdbbfd4b2d9b5dab8dfbbd4bed
  return(token);
}
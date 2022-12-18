/**
import collision from './lib/collision';
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

// 定数ファイル
const Define = require('./config/define');

// 問題文を管理するクラス
const Question = require('./lib/question');

// キーコード
const KeyCode = require('./lib/keycode');

// 当たり判定
const Collision = require('./lib/collision');

//-----------------------------------------------
// グローバル変数
//-----------------------------------------------
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
  //   pos: {x:0, y:0, width:120, height:150},
  //   answer: true,   // true:○, false:×, null:未回答
  //},
};
let MEMBERS_COUNT = 1;

//-----------------------------
// ゲーム関係
//-----------------------------
// 現在のサーバーモード
let SERVER_MODE = 'MATCHING';  // 'MATCHING' or 'GAME'

// 問題を管理する
const QUESTION = {
  q: null,
  a: null
};

//-----------------------------------------------
// ルーティング（express）
//-----------------------------------------------
// 静的なファイルを公開する
// （動的なファイルはルーティングの設定が必要）
app.use(express.static(Define.SERVER.DOCUMENT_ROOT));
console.log(Define.SERVER.DOCUMENT_ROOT);


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
    id: MEMBERS_COUNT,    // 公開用ID
    token: token,         // 秘密トークン
    name: null,           // プレイヤー名
    avatar: null,         // アバター画像URL
    pos: {                // プレイヤー画像の座標とサイズ
      x: 0,
      y: 0,
      width: Define.PLAYER.SIZE.width,
      height: Define.PLAYER.SIZE.height
    },
    answer: null          // 回答結果
  };
  MEMBERS_COUNT++;

  //---------------------------
  // 入室
  //---------------------------
  socket.on('join', (data) => {
    console.log('join', data);
    const user = MEMBERS[socket.id];

    // マッチングモードで無ければ何もしない
    if( SERVER_MODE !== 'MATCHING' ){
      console.log('マッチングモードでは無いため無視します');
      io.to(socket.id).emit('join-fail', {message:'マッチングモードで無いため入室できません'});
      return;
    }
    // トークンを検証
    if(data.token !== user.token){
      console.log('トークンが一致しません');
      return;
    }

    // 参加者リストに追加
    user.name = data.name;

    // アバター画像を決定
    const id = user.id;
    const avatar_len = Define.PLAYER.AVATARS.length;
    user.avatar = Define.PLAYER.AVATARS[id % avatar_len];

    // 初期座標を決定
    user.pos.x = id * 150;  // 150pxずつずらす
    user.pos.y = 250;       // 固定
  });

  //---------------------------
  // [Game] キャラ移動
  //---------------------------
  socket.on('move', (data) => {
    console.log('move', data);
    const user = MEMBERS[socket.id];

    // ゲームモードで無ければ何もしない
    if( SERVER_MODE !== 'GAME' ){
      console.log('ゲームモードでは無いため無視します')
      return;
    }
    // トークンを検証
    if(data.token !== user.token){
      console.log('トークンが一致しません');
      return;
    }

    // 座標を移動
    const ismove = moveChara(socket.id, data.key);

    // 回答判定
    if( Collision(Define.GAME.ANSWER_POS.o, user.pos) ){
      console.log(`ANSWER ${user.name} ○`);
      user.answer = Define.GAME.ANSWER.O;   // ○
    }
    else if( Collision(Define.GAME.ANSWER_POS.x, user.pos) ){
      console.log(`ANSWER ${user.name} ✕`);
      user.answer = Define.GAME.ANSWER.X;   // ✕
    }
    else{
      console.log(`ANSWER ${user.name} 未回答`);
      user.answer = Define.GAME.ANSWER.NOT_SELECT;   // 未回答
    }

    // 全ユーザーに通知
    if(ismove){
      io.emit('member-move', {id:user.id, pos:user.pos});
    }
  });
});

//------------------------------
// サーバ起動
//------------------------------
http.listen(Define.SERVER.PORT, () => {
  console.log(`サーバを起動しました localhost:${Define.SERVER.PORT}`);
});

//------------------------------
// タイマー
//------------------------------
setInterval(() => {
  //------------------------------
  // マッチング中
  //------------------------------
  if(SERVER_MODE === 'MATCHING'){
    // 2人以上いたらゲーム開始
    if(countConnectMembers() >= Define.PLAYER.MAXPLAYERS){
      console.log('ゲーム開始');
      SERVER_MODE = 'GAME';

      // 問題を生成
      const q = new Question();
      QUESTION.q = q.getQuestion();
      QUESTION.a = q.getAnswer();

      // メンバー一覧を作成
      const members = createMemberList();

      // クライアントに送信
      io.emit('start', {
          question: QUESTION.q,
          answer_pos: Define.GAME.ANSWER_POS,
          members
      });
    }
  }
  //------------------------------
  // ゲーム中
  //------------------------------
  else if(SERVER_MODE === 'GAME'){
    // 全員が回答したら結果を送信
    if( isAllAnswer() ){
      const result = judgeResult();
      console.log('結果送信', result);

      // クライアントに結果送信
      io.emit('result', {
        answer: QUESTION.a,     // 正解
        result
      });

      // 初期化してマッチングモードに戻す
      resetMembers();
      SERVER_MODE = 'MATCHING';
    }

  }
}, Define.GAME.MONITORING_TIME);


/**
 * 座標を移動する
 *
 * @param {string} socketid
 * @param {number} keycd WASDのキーコード
 * @param {number} step  移動量
 * @return {boolean} 移動したかどうか
 */
function moveChara(socketid, keycd, step=20){
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
 * 参加者が全員回答したか判定する
 *
 * @returns {boolean}
 */
function isAllAnswer(){
  let flag = false;  // 全員回答したかどうか

  for(let key in MEMBERS){
    const user = MEMBERS[key];
    if(user.name === null && user.name === ''){
      continue;
    }

    switch (user.answer){
      case Define.GAME.ANSWER.O:
      case Define.GAME.ANSWER.X:
        flag = true;
        break;
      case Define.GAME.ANSWER.NOT_SELECT:
      default:
        return(false);
    }
  }

  return(flag);
}

/**
 * 参加者の勝敗判定を行う
 *
 * @returns {object} {'aaa':1, 'bbb':0}
 */
function judgeResult(){
  const result = {};
  for(let key in MEMBERS){
    const user = MEMBERS[key];
    if(user.name === null && user.name === ''){
      continue;
    }
    result[user.id] = (user.answer === QUESTION.a)? 1:0;
  }
  return(result);
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
 * 参加者一覧をリセットする
 *
 * @returns {void}
 */
function resetMembers(){
  for(let key in MEMBERS){
    delete MEMBERS[key];
  }

  // 冒頭で const MEMBERS = {}; としているため
  // MEMBERS = {}; とするとエラーになる。
  // （constは異なるオブジェクトの代入を禁止するため）
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
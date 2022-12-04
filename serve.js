const crypto = require('crypto');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);


//-----------------------------------------------
// グローバル変数
//-----------------------------------------------
// 世界中に公開するフォルダ
const DOCUMENT_ROOT = __dirname + '/public';

// サーバのポート番号
const PORT = 3000;

// 参加者のリスト
const MEMBERS = {
  // {id:1, token:'xxx', socketid:'yyy', name:'あるぱか'},
};
let MEMBERS_COUNT = 1;
const MAXPLAYERS = 2;   // 最大同時参加者数

// モニタリング間隔（ミリ秒）
const MONITORING_TIME = 1000;

// 現在のサーバーモード
let SERVER_MODE = 'MATCIHING';  // 'MATCIHING' or 'GAME'

//-----------------------------------------------
// ルーティング（express）
//-----------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(`${DOCUMENT_ROOT}/index.html`);
});
app.get('/:file', (req, res) => {
  const file = req.params.file;
  res.sendFile(`${DOCUMENT_ROOT}/${file}`);
});
app.get('/:dir/:file', (req, res) => {
  const dir  = req.params.dir;
  const file = req.params.file;
  res.sendFile(`${DOCUMENT_ROOT}/${dir}/${file}`);
});

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
  io.to(socket.id).emit('token', token);

  // 参加者リストに追加
  MEMBERS[socket.id] = {
    id: MEMBERS_COUNT,
    token: token,
    name: null
  };
  MEMBERS_COUNT++;

  //---------------------------
  // 入室
  //---------------------------
  socket.on('join', (data) => {
    console.log('join', data);
    // トークンを検証
    if(data.token !== MEMBERS[socket.id].token){
      console.log('トークンが一致しません');
      return;
    }

    // 参加者リストに追加
    MEMBERS[socket.id].name = data.name;
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
  // マッチング中
  if(SERVER_MODE === 'MATCIHING'){
    // 2人以上いたらゲーム開始
    if(countConnectMembers() >= MAXPLAYERS){
      console.log('ゲーム開始');
      SERVER_MODE = 'GAME';
      io.emit('start');
    }
  }
  // ゲーム中
  else if(SERVER_MODE === 'GAME'){
    // ToDo: 次回以降追加
  }
}, MONITORING_TIME);


/**
 * 現在の参加者数をカウント
 *
 * @returns {number}
 */
function countConnectMembers(){
  let count = 0;
  for(let key in MEMBERS){
    if(MEMBERS[key].name !== null){
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
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


//------------------------------
// サーバ起動
//------------------------------
http.listen(PORT, () => {
  console.log(`サーバを起動しました localhost:${PORT}`);
});
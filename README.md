# オンラインクイズゲーム
日本工学院八王子専門学校 ゲーム科用、リアルタイム通信(Socket.IO)の実習用リポジトリです。

## 利用方法
### 0. 環境準備
[Node.js](https://nodejs.org/ja/)のLTS版をインストールします。

* 【参考】[[Node.js] Windows10にNode.jsをインストールする](https://blog.katsubemakito.net/nodejs/install-windows10)

### 1. ソースコードの取得
GitHubからcloneするか、ダウンロードします。
```shellsession
$ git clone https://github.com/katsube/neec-quiz-2022.git
```

### 2. 必要なモジュールを取得
先ほど取得したソースコードが入っているフォルダへ移動、`npm`コマンドを利用し必要なモジュールをいんたんーネット経由で取得します。
```shellsession
$ cd neec-quiz-2022
$ npm install
```

`node_modules`フォルダが生成され、その中にインストールされたモジュールが保存されます。

### 3. サーバを起動する
`serve.js`にサーバ処理が記載されていますので、`node`コマンドで実行します。
```shellsession
$ node serve.js
```

正常に起動したらWebブラウザから`http://localhost:3000`へアクセスします。

サーバを停止したい場合、サーバのソースコードを変更した場合は`Ctrl + c`でプログラムの実行を強制終了させます。
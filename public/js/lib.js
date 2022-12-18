//------------------------------------------------
// 状態管理
//------------------------------------------------
let BGM1 = null;      // BGMの状態
let BGM1Volume = 0.2; // BGMの音量
let SEVolume = 0.5;   // SEの音量

//------------------------------------------------
// 定数
//------------------------------------------------
//-----------------------
// アセット
//-----------------------
const ASSETS = {
  'bgm':{
    'title': '/sound/bgm/bgm_title.mp3',
    'name':  '/sound/bgm/bgm_name.mp3',
  },
  'se':{
    'click':  '/sound/se/se_click1.mp3',
    'enter':  '/sound/se/se_enter1.mp3',
    'cancel': '/sound/se/se_cancel1.mp3'
  }
};

//-----------------------
// ライブラリ
//-----------------------
const JSLIB = [
  '/js/howler.min.js' // 音声再生ライブラリ
];

// ライブラリの読み込み
(()=>{
  JSLIB.forEach((path)=>{
    const script = document.createElement('script');
    script.src = path;
    document.body.appendChild(script);
  });
})();


/**
 * BGMを再生する
 *
 * @param {string} name
 * @param {function} callback
 */
function playBGM(name, callback=null){
  // 再生中のBGMがあれば停止する
  if( BGM1 !== null ){
    BGM1.stop();
  }

  // ファイルを準備
  const file = ASSETS.bgm[name];
  BGM1 = new Howl({
    src: [file],
    loop: false,
    autoplay: true,
    volume: BGM1Volume
  });

  // 再生が終了したら実行する
  BGM1.on('end', ()=>{
    if(callback !== null){
      callback();
    }
    BGM1 = null;
  });

  // 再生する
  BGM1.play();
}

/**
 * BGMを停止する
 */
function stopBGM(){
  if( BGM1 !== null ){
    BGM1.stop();
  }
}

/**
 * SEを再生する
 *
 * @param {string} name
 */
function playSE(name, callback=null){
  const se = new Audio(ASSETS.se[name]);
  se.volume = SEVolume;

  // SEの再生が終了したら実行する
  se.addEventListener('ended', ()=>{
    if(callback !== null){
      callback();
    }
  });

  // 再生
  se.play();
}



/*
 * 文字数をカウントする
 */
function strCount(str){
  return [...str].length;
}

/**
 * 入力中の名前をlocalStorageへ保存
 */
function saveName(){
  localStorage.setItem('playername', playername.value);
}

/**
 * 名前をlocalStorageから取得
 */
function loadName(){
  return localStorage.getItem('playername');    // 存在しない場合はNullが返る
}
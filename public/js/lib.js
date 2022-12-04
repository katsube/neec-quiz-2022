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
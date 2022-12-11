/**
 * クイズ出題クラス
 *
 * @example
 *   const Question = require('./lib/question');
 *   const q = new Question();
 *
 *   // 問題文をランダムに決定
 *   q.setQuestion();
 *
 *  // 問題文と答えを取得
 *  const question = q.getQestion();
 *  const answer = q.getAnswer();
 */

//-----------------------------------------------
// モジュール
//-----------------------------------------------
const path = require('path');

class Question {
  /**
   * コンストラクタ
   *
   * @constructor
   * @param {string} file 問題文のJSONファイル
   */
  constructor(file='../data/question.json') {
    const filepath = path.resolve(__dirname, file);
    this._list = require(filepath);    // ToDo: エラー処理を入れる

    // 問題文をランダムに決定
    this.setQuestion();
  }

  /**
   * 問題文をランダムに決定
   */
  setQuestion() {
    const i = Math.floor(Math.random() * this._list.length);
    this._question = this._list[i]['q'];
    this._answer = this._list[i]['a'];
  }

  /**
   * 問題文を返却する
   *
   * @returns {string} 問題文
   */
  getQuestion() {
    return this._question;
  }

  /**
   * 回答を返却する
   *
   * @returns {boolean} 答え
   */
  getAnswer() {
    return this._answer;
  }
}

//-----------------------------------------------
// export
//-----------------------------------------------
module.exports = Question;
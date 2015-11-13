///<reference path="DefinitelyTyped/atom/atom.d.ts" />
///<reference path="declarations/atomic-wrapper-extension.d.ts" />

namespace AtomicWrapper {
  let path = require("path");
  let sourceDir = path.resolve(".") + "/resources/app.asar/src/";
  let TokenizedLine = require(sourceDir + "tokenized-line");
  let DisplayBuffer = require(sourceDir + "display-buffer");

  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  let font: { fontFamily: string; fontSize: number } = <any>{};
  let subscriptions: { [key: string]: eventKit.Disposable } = {};
  //context.font = "16px NanumGothicCoding";

  /*space, CJK 4e00-, kana 3041-, hangul 1100-*/
  let breakable = /[\s\u4e00-\u9fff\u3400-\u4dbf\u3041-\u309f\u30a1-\u30ff\u31f0-\u31ff\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

  function wrap(line: string, width: number): number {
    if (context.measureText(line).width <= width)
      return null;

    // Break the text to get proper width, by binary search algorithm.
    let left = 0;
    let right = line.length;
    while (left < right) {
      let middle = (left + right) / 2;
      let slice = line.slice(0, middle);
      let measure = context.measureText(slice);
      if (measure.width === width)
        return spaceCutter(line, slice.length);
      else if (measure.width < width)
        left = Math.ceil(middle);
      else
        right = Math.floor(middle);
    }

    // Last condition
    if (context.measureText(line.slice(0, left)).width > width)
      left--;

    // Current Atom wrapper algorithm
    return spaceCutter(line, left);
  }

  function spaceCutter(line: string, softWrapColumn: number) {
    if (breakable.test(line[softWrapColumn])) {
      let firstNonspace = line.slice(softWrapColumn).search(/\S/)
      if (firstNonspace != -1)
        return firstNonspace + softWrapColumn;
      else
        return line.length;
    }
    else {
      for (let column = softWrapColumn; column >= 0; column--)
        if (breakable.test(line[column]))
          return column + 1;
      return softWrapColumn;
    }
  }

  export function overwrite() {
    TokenizedLine.prototype._nonatomic_findWrapColumn = TokenizedLine.prototype.findWrapColumn;

    // This changes the meaning of findWrapColumn; original one receives maxColumn
    TokenizedLine.prototype.findWrapColumn = function (lineWidth: number) {
      if (!lineWidth)
        return null;
      return wrap(this.text, lineWidth);
    }

    // This changes the meaning of getSoftWrapColumn; original one gives getEditorWidthInChars
    DisplayBuffer.prototype._nonatomic_getSoftWrapColumn = DisplayBuffer.prototype.getSoftWrapColumn;
    DisplayBuffer.prototype._nonatomic_getSoftWrapColumnForTokenizedLine = DisplayBuffer.prototype.getSoftWrapColumnForTokenizedLine;
    DisplayBuffer.prototype.getSoftWrapColumn
    = DisplayBuffer.prototype.getSoftWrapColumnForTokenizedLine
    = function() {
      return this.atmcGetSoftWrapWidth();
    };
    

    DisplayBuffer.prototype.atmcGetSoftWrapWidth = function () {
      if (this.configSettings.softWrapAtPreferredLineLength) {
        return Math.min(this.getWidth(), this.configSettings.preferredLineLength * this.defaultCharWidth);
      }
      else
        return this.getWidth();
    }
  }
  export function revert() {
    TokenizedLine.prototype.findWrapColumn = TokenizedLine.prototype._nonatomic_findWrapColumn;
    delete TokenizedLine.prototype._nonatomic_findWrapColumn;

    DisplayBuffer.prototype.getSoftWrapColumn = DisplayBuffer.prototype._nonatomic_getSoftWrapColumn;
    DisplayBuffer.prototype.getSoftWrapColumnForTokenizedLine = DisplayBuffer.prototype._nonatomic_getSoftWrapColumnForTokenizedLine;
    delete DisplayBuffer.prototype._nonatomic_getSoftWrapColumn;

    delete DisplayBuffer.atmcGetSoftWrapWidth;
  }

  function setFont(fontSize: number, fontFamily: string) {
    font.fontSize = fontSize || 16;
    font.fontFamily = fontFamily.trim() || "Inconsolata, Monaco, Consolas, 'Courier New', Courier";
    return font.fontSize + "px " + font.fontFamily;
  }

  export function subscribeFontEvent() {
    context.font = setFont(atom.config.get("editor.fontSize"), atom.config.get("editor.fontFamily"));
    console.log(context.font);
    subscriptions["fontFamily"]
    = atom.config.onDidChange("editor.fontFamily", (change) => context.font = setFont(font.fontSize, change.newValue));
    subscriptions["fontSize"]
    = atom.config.onDidChange("editor.fontSize", (change) => context.font = setFont(change.newValue, font.fontFamily));
  }

  export function unsubscribeFontEvent() {
    for (let subscription in subscriptions)
      (<eventKit.Disposable>subscriptions[subscription]).dispose();
  }
}

export var activate = (state: AtomCore.IAtomState) => {
  AtomicWrapper.subscribeFontEvent();
  AtomicWrapper.overwrite();

  (<any>atom.workspace).observeTextEditors((editor: AtomCore.IEditor) => {
    editor.displayBuffer.updateWrappedScreenLines();
  });
}

export var deactivate = () => {
  AtomicWrapper.unsubscribeFontEvent();
  AtomicWrapper.revert();

  (<any>atom.workspace).observeTextEditors((editor: AtomCore.IEditor) => {
    editor.displayBuffer.updateWrappedScreenLines();
  });
}

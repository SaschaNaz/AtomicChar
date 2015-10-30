///<reference path="DefinitelyTyped/atom/atom.d.ts" />
///<reference path="declarations/atomic-wrapper-extension.d.ts" />
var AtomicWrapper;
(function (AtomicWrapper) {
    var TokenizedLine = require("src/tokenized-line");
    var DisplayBuffer = require("src/display-buffer");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var font = {};
    var subscriptions = {};
    //context.font = "16px NanumGothicCoding";
    /*space, CJK 4e00-, kana 3041-, hangul 1100-*/
    var breakable = /[\s\u4e00-\u9fff\u3400-\u4dbf\u3041-\u309f\u30a1-\u30ff\u31f0-\u31ff\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
    function wrap(line, width) {
        if (context.measureText(line).width <= width)
            return null;
        // Break the text to get proper width, by binary search algorithm.
        var left = 0;
        var right = line.length;
        while (left < right) {
            var middle = (left + right) / 2;
            var slice = line.slice(0, middle);
            var measure = context.measureText(slice);
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
    function spaceCutter(line, softWrapColumn) {
        if (breakable.test(line[softWrapColumn])) {
            var firstNonspace = line.slice(softWrapColumn).search(/\S/);
            if (firstNonspace != -1)
                return firstNonspace + softWrapColumn;
            else
                return line.length;
        }
        else {
            for (var column = softWrapColumn; column >= 0; column--)
                if (breakable.test(line[column]))
                    return column + 1;
            return softWrapColumn;
        }
    }
    function overwrite() {
        TokenizedLine.prototype._nonatomic_findWrapColumn = TokenizedLine.prototype.findWrapColumn;
        // This changes the meaning of findWrapColumn; original one receives maxColumn
        TokenizedLine.prototype.findWrapColumn = function (lineWidth) {
            if (!lineWidth)
                return null;
            return wrap(this.text, lineWidth);
        };
        // This changes the meaning of getSoftWrapColumn; original one gives getEditorWidthInChars
        DisplayBuffer.prototype._nonatomic_getSoftWrapColumn = DisplayBuffer.prototype.getSoftWrapColumn;
        DisplayBuffer.prototype.getSoftWrapColumn = function () {
            return this.atmcGetSoftWrapWidth();
        };
        DisplayBuffer.prototype.atmcGetSoftWrapWidth = function () {
            if (this.configSettings.softWrapAtPreferredLineLength) {
                return Math.min(this.getWidth(), this.configSettings.preferredLineLength * this.defaultCharWidth);
            }
            else
                return this.getWidth();
        };
    }
    AtomicWrapper.overwrite = overwrite;
    function revert() {
        TokenizedLine.prototype.findWrapColumn = TokenizedLine.prototype._nonatomic_findWrapColumn;
        TokenizedLine.prototype._nonatomic_findWrapColumn = null;
        DisplayBuffer.prototype.getSoftWrapColumn = DisplayBuffer.prototype._nonatomic_getSoftWrapColumn;
        DisplayBuffer.prototype._nonatomic_getSoftWrapColumn = null;
        delete DisplayBuffer.atmcGetSoftWrapWidth;
    }
    AtomicWrapper.revert = revert;
    function setFont(fontSize, fontFamily) {
        font.fontSize = fontSize || 16;
        font.fontFamily = fontFamily.trim() || "Inconsolata, Monaco, Consolas, 'Courier New', Courier";
        return font.fontSize + "px " + font.fontFamily;
    }
    function subscribeFontEvent() {
        context.font = setFont(atom.config.get("editor.fontSize"), atom.config.get("editor.fontFamily"));
        console.log(context.font);
        subscriptions["fontFamily"]
            = atom.config.onDidChange("editor.fontFamily", function (change) { return context.font = setFont(font.fontSize, change.newValue); });
        subscriptions["fontSize"]
            = atom.config.onDidChange("editor.fontSize", function (change) { return context.font = setFont(change.newValue, font.fontFamily); });
    }
    AtomicWrapper.subscribeFontEvent = subscribeFontEvent;
    function unsubscribeFontEvent() {
        for (var subscription in subscriptions)
            subscriptions[subscription].dispose();
    }
    AtomicWrapper.unsubscribeFontEvent = unsubscribeFontEvent;
})(AtomicWrapper || (AtomicWrapper = {}));
exports.activate = function (state) {
    AtomicWrapper.subscribeFontEvent();
    AtomicWrapper.overwrite();
    atom.workspace.observeTextEditors(function (editor) {
        editor.displayBuffer.updateWrappedScreenLines();
    });
};
exports.deactivate = function () {
    AtomicWrapper.unsubscribeFontEvent();
    AtomicWrapper.revert();
    atom.workspace.observeTextEditors(function (editor) {
        editor.displayBuffer.updateWrappedScreenLines();
    });
};
//# sourceMappingURL=atomic-wrapper.js.map
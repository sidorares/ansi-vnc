#!/usr/bin/env node

var ac = require('ansi-canvas');
var term = ac();
var rfb = require('rfb2');
var argv = require('optimist').argv;

var keypress = require('keypress');
keypress(process.stdin);
keypress.enableMouse(process.stdout);
setRawMode(true);

function setRawMode(val) {
  if (process.stdin.setRawMode)
    process.stdin.setRawMode(val);
  else
    require('tty').setRawMode(val);
}

var canvas, ctx;

function scaleFactor() {
  var oldWidth = canvas.width;
  var oldHeight = canvas.height;
  var maxWidth = term.width;
  var maxHeight = term.height;

  var sf;
  if (oldWidth > oldHeight) {
    sf = maxWidth / oldWidth;
  } else {
    sf = maxHeight / oldHeight;
  }
  return sf;
}

function render() {
  // resize to fit the current terminal screen size
  var termCtx = term.getContext('2d');
  termCtx.clearRect(0, 0, term.width, term.height);
  var sf = scaleFactor();
  termCtx.drawImage(canvas, 0, 0, canvas.width*sf, canvas.height*sf);
  // render to the TTY
  term.render();
}

var buttonState = 0;
var r = rfb.createConnection(argv);
r.on('connect', function() {
  // TODO: write escape sequence to set title to r.title;
  var Canvas = term.constructor;
  canvas = new Canvas(r.width, r.height);
  ctx = canvas.getContext('2d');
  r.on('rect', function(rect) {
    if (rect.encoding == rfb.encodings.raw) {
      var id = ctx.createImageData(rect.width, rect.height);
      for (var i=0;i< id.data.length; i+=4) {
        id.data[i] = rect.data[i+2];
        id.data[i+1] = rect.data[i+1];
        id.data[i+2] = rect.data[i];
        id.data[i+3] = 255;
      }
      ctx.putImageData(id, rect.x, rect.y);
      render();
    } else if (rect.encoding == rfb.encodings.copyRect) {
      ctx.drawImage(canvas, rect.src.x, rect.src.y, rect.width, rect.height, rect.x, rect.y);
    }
  });

  process.stdin.on('keypress', function (c, key) {
    if (key && key.ctrl && key.name == 'c') {
      setRawMode(false);
      process.exit();
    }
  });
  process.stdin.on('mousepress', function (mouse) {
    //console.log(mouse);
    var sf = scaleFactor();
    r.pointerEvent(mouse.x/sf, 2*mouse.y/sf, buttonState);
  });
});

process.on('exit', function () {
  keypress.disableMouse(process.stdout);
});
process.stdin.resume();

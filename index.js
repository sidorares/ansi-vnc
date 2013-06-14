#!/usr/bin/env node

var ac = require('ansi-canvas');
var term = ac();
var rfb = require('rfb2');
var argv = require('optimist').argv;

var canvas, ctx;

function render() {
  // copy-paste from https://github.com/TooTallNate/ansi-canvas/blob/master/examples/clock.js
  var oldWidth = canvas.width;
  var oldHeight = canvas.height;
  var maxWidth = term.width;
  var maxHeight = term.height;

  var scaleFactor;
  if (oldWidth > oldHeight) {
    scaleFactor = maxWidth / oldWidth;
  } else {
    scaleFactor = maxHeight / oldHeight;
  }

  // resize to fit the current terminal screen size
  var termCtx = term.getContext('2d');
  termCtx.clearRect(0, 0, term.width, term.height);
  console.log(canvas);
  termCtx.drawImage(canvas, 0, 0, oldWidth * scaleFactor, oldHeight * scaleFactor);
  // render to the TTY
  term.render();
}

var r = rfb.createConnection(argv);
r.on('connect', function() {
  var Canvas = term.constructor;
  canvas = new Canvas(r.width, r.height);
  ctx = canvas.getContext('2d');
  r.on('rect', function(rect) {
    if (rect.encoding == rfb.encodings.raw) {
      var id = ctx.createImageData(rect.width, rect.height);
      for (var i=0;i< id.data.length; i++)
        id.data[i] = rect.data[i];
      ctx.putImageData(id, rect.x, rect.y);
      render();
    } else if (rect.encoding == rfb.encodings.copyRect) {
      ctx.drawImage(canvas, rect.src.x, rect.src.y, rect.width, rect.height, rect.x, rect.y);
    }
  });
});

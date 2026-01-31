function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
  this.clickCount = 0;

  var self = this;
  // 统计用户手动点击次数，超过阈值弹出强制问题对话框
  document.addEventListener('click', function (e) {
    // 如果问题弹窗存在则不累计点击
    if (document.querySelector('.forced-modal')) return;

    self.clickCount++;

    if (self.clickCount > 5) {
      self.clickCount = 0;
      self.showForcedQuestion();
    }
  }, true);
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

// 显示短暂的合并提示（浮现并自动消失）
HTMLActuator.prototype.showMergeMessage = function (msg) {
  var container = document.querySelector('.container') || document.body;
  var el = document.createElement('div');
  el.className = 'merge-message';

  // 将每个字符包成 span，以便每字都能单独上色与动画
  for (var i = 0; i < msg.length; i++) {
    var ch = msg.charAt(i);
    var span = document.createElement('span');
    span.className = 'rainbow-char';
    // 预设每个字符不同的色相
    var hue = (i * 35) % 360;
    var hue2 = (hue + 70) % 360;
    span.style.display = 'inline-block';
    span.style.transformOrigin = '50% 50%';
    span.textContent = ch;
    // 更绚烂的渐变色并用背景裁剪实现五彩文字
    span.style.background = 'linear-gradient(90deg, hsl(' + hue + ',100%,60%), hsl(' + hue2 + ',100%,60%))';
    span.style.webkitBackgroundClip = 'text';
    span.style.backgroundClip = 'text';
    span.style.webkitTextFillColor = 'transparent';
    span.style.animationDelay = (i * 50) + 'ms';
    el.appendChild(span);
  }

  container.appendChild(el);

  // 在动画结束后移除元素（与CSS动画时长一致）
  window.setTimeout(function () {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, 1600);
};

// 显示强制选择对话：喷火鱼弱不弱？A: 是的（关闭） B: 不是（继续弹出）
HTMLActuator.prototype.showForcedQuestion = function () {
  // 如果已有弹窗则返回
  if (document.querySelector('.forced-modal')) return;

  var container = document.querySelector('.container') || document.body;
  var overlay = document.createElement('div');
  overlay.className = 'forced-modal';

  var dialog = document.createElement('div');
  dialog.className = 'forced-dialog';

  var q = document.createElement('p');
  q.className = 'forced-question';
  // 将问题每字渲染为彩色渐变
  var questionText = '喷火鱼弱不弱？';
  for (var i = 0; i < questionText.length; i++) {
    var ch = questionText.charAt(i);
    var span = document.createElement('span');
    span.className = 'rainbow-char';
    var hue = (i * 48) % 360;
    var hue2 = (hue + 90) % 360;
    span.style.background = 'linear-gradient(90deg, hsl(' + hue + ',100%,60%), hsl(' + hue2 + ',100%,60%))';
    span.style.webkitBackgroundClip = 'text';
    span.style.backgroundClip = 'text';
    span.style.webkitTextFillColor = 'transparent';
    span.style.display = 'inline-block';
    span.style.animationDelay = (i * 45) + 'ms';
    span.textContent = ch;
    q.appendChild(span);
  }

  var btnA = document.createElement('button');
  btnA.className = 'forced-btn forced-btn-a';
  btnA.textContent = 'A：是的';

  var btnB = document.createElement('button');
  btnB.className = 'forced-btn forced-btn-b';
  btnB.textContent = 'B：不是';

  dialog.appendChild(q);
  dialog.appendChild(btnA);
  dialog.appendChild(btnB);
  overlay.appendChild(dialog);
  container.appendChild(overlay);

  // A: 关闭弹窗，继续游戏
  btnA.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
  // B: 错误选项不允许关闭弹窗：震动并闪烁提示错误，直到选择 A
  btnB.addEventListener('click', function (ev) {
    ev.stopPropagation();
    // 添加错误样式触发动画
    dialog.classList.remove('forced-wrong');
    void dialog.offsetWidth; // 强制重绘以复位动画
    dialog.classList.add('forced-wrong');
    // 短暂显示提示文字
    var hint = dialog.querySelector('.forced-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'forced-hint';
      hint.textContent = '回答错误！请重新选择。';
      dialog.appendChild(hint);
    }
    hint.classList.remove('visible');
    void hint.offsetWidth;
    hint.classList.add('visible');
  });
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};

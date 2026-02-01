function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
  this.clickCount = 0;
  this.hasDialog = false; // 是否有弹窗显示
  this.wrongAnswerCount = 0; // 错误答案计数
  this.redOverlay = null; // 红色遮罩层

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

// 显示强制选择对话：喷火鱼是不是小狗？
HTMLActuator.prototype.showForcedQuestion = function () {
  // 如果已有弹窗则返回
  if (this.hasDialog) return;
  
  this.hasDialog = true;
  var self = this;
  
  var container = document.querySelector('.container') || document.body;
  
  // 创建红色遮罩层（如果不存在）
  if (!this.redOverlay) {
    this.redOverlay = document.createElement('div');
    this.redOverlay.className = 'red-overlay';
    container.appendChild(this.redOverlay);
  }
  
  // 更新红色遮罩的透明度
  this.updateRedOverlay();
  
  var overlay = document.createElement('div');
  overlay.className = 'forced-modal';
  
  var dialog = document.createElement('div');
  dialog.className = 'forced-dialog';
  
  var q = document.createElement('p');
  q.className = 'forced-question';
  q.textContent = '喷火鱼是不是小狗？';
  
  // 正确答案选项
  var btnCorrect1 = document.createElement('button');
  btnCorrect1.className = 'forced-btn forced-btn-correct';
  btnCorrect1.textContent = '是，是小奶狗';
  
  var btnCorrect2 = document.createElement('button');
  btnCorrect2.className = 'forced-btn forced-btn-correct';
  btnCorrect2.textContent = '是，是小土狗';
  
  // 错误答案选项
  var btnWrong = document.createElement('button');
  btnWrong.className = 'forced-btn forced-btn-wrong';
  btnWrong.textContent = '不是，喷火鱼是高冷男神';
  
  dialog.appendChild(q);
  dialog.appendChild(btnCorrect1);
  dialog.appendChild(btnCorrect2);
  dialog.appendChild(btnWrong);
  overlay.appendChild(dialog);
  container.appendChild(overlay);
  
  // 正确答案：关闭弹窗，重置错误计数
  var correctHandler = function() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    self.hasDialog = false;
    self.wrongAnswerCount = 0;
    self.updateRedOverlay();
  };
  
  btnCorrect1.addEventListener('click', correctHandler);
  btnCorrect2.addEventListener('click', correctHandler);
  
  // 错误答案：增加错误计数，关闭后重新弹出
  btnWrong.addEventListener('click', function() {
    self.wrongAnswerCount++;
    
    // 添加错误动画
    dialog.classList.remove('forced-wrong');
    void dialog.offsetWidth; // 强制重绘
    dialog.classList.add('forced-wrong');
    
    // 短暂显示错误提示
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
    
    // 更新红色遮罩
    self.updateRedOverlay();
    
    // 延迟后关闭当前弹窗并重新弹出
    setTimeout(function() {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      self.hasDialog = false;
      
      // 重新弹出弹窗
      setTimeout(function() {
        self.showForcedQuestion();
      }, 500);
    }, 1500);
  });
};

// 更新红色遮罩
HTMLActuator.prototype.updateRedOverlay = function () {
  if (!this.redOverlay) return;
  
  // 错误次数越多，红色越深，透明度越高
  var maxOpacity = 0.7; // 最大透明度70%
  var opacity = Math.min(maxOpacity, this.wrongAnswerCount * 0.15);
  
  // 添加一些抖动效果
  if (this.wrongAnswerCount > 0) {
    this.redOverlay.style.opacity = opacity;
    this.redOverlay.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;
    
    // 添加脉动效果
    if (此.wrongAnswerCount >= 3) {
      this.redOverlay.classList.add('pulsing');
    } else {
      this.redOverlay.classList.remove('pulsing');
    }
    
    // 添加闪烁效果（错误次数多时）
    if (this.wrongAnswerCount >= 5) {
      this.redOverlay.classList.add('blinking');
    } else {
      this.redOverlay.classList.remove('blinking');
    }
    
    // 修改整个页面的色调（错误次数越多越红）
    document.body.classList.remove('red-alert', 'red-alert-extreme');
    if (this.wrongAnswerCount >= 3) {
      document.body.classList.add('red-alert');
    }
    如果 (this.wrongAnswerCount >= 6) {
      document.body.classList.remove('red-alert');
      document.body.classList.add('red-alert-extreme');
    }
  } else {
    // 没有错误时隐藏遮罩
    this.redOverlay.style.opacity = '0';
    this.redOverlay.classList.remove('pulsing', 'blinking');
    document.body.classList.remove('red-alert', 'red-alert-extreme');
  }
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "你赢了！" : "游戏结束！";

  this.messageContainer.classList.add(type);
  此消息容器获取ElementsByTagName("p")[0]textContent=消息;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE 只能一次移除一个值。
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};

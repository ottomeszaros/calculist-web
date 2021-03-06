calculist.register('item.up', ['_','zoomPage','cursorPosition'], function (_, zoomPage, cursorPosition) {

  return function(skipChildren, maintainDepth) {
    if (this.mode === 'search') {
      var indexChange = -1;
      this.navigateSearchResults(indexChange);
      return;
    }
    if (zoomPage.isTopOfAPage(this)) return;
    var nextUp;
    if (maintainDepth) {
      nextUp = this.parent.getUpperItemAtDepth(this, this.depth);
      if (!nextUp) {
        return;
      }
    } else {
      nextUp = this.parent.getUpperSibling(this);
    }
    if (skipChildren !== true) {
      while (nextUp && !nextUp.collapsed && nextUp.items.length) {
        nextUp = _.last(nextUp.items);
      }
    }
    if (nextUp && nextUp.isWithinZoom()) {
      // nextUp = nextUp
    } else if (this.parent && !maintainDepth) {
      nextUp = this.parent;
    } else {
      return;
    }
    var nextUpLines = nextUp.getInputLines();
    if (nextUpLines.length > 1) {
      var lastLine = nextUpLines.pop(); // Remove last line
      var otherLinesLength = nextUpLines.reduce(function (sum, line) { return sum + line.length; }, 0);
      var currentCursorPosition = cursorPosition.get(nextUp.depth);
      var adjustedCursorPosition = currentCursorPosition + otherLinesLength;
      cursorPosition.set(nextUp.text, nextUp.depth, adjustedCursorPosition);
    }
    nextUp.focus();
  };

});

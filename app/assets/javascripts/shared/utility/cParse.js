lm.register('cParse', [], function () {
  // FIXME Do proper lexical analysis.
  var ESCAPED_DOUBLE_QUOTES_PLACEHOLDER = "______adsfasdfrtrssgoivdfoijwpdfoijdfg_______";
  var ESCAPED_DOUBLE_QUOTES_PATTERN = new RegExp(ESCAPED_DOUBLE_QUOTES_PLACEHOLDER, 'g');
  var ESCAPED_SINGLE_QUOTES_PLACEHOLDER = "______oiwjefoijfviojdfhweoiufhoihsdfoi_______";
  var ESCAPED_SINGLE_QUOTES_PATTERN = new RegExp(ESCAPED_SINGLE_QUOTES_PLACEHOLDER, 'g');
  return function cParse (code, handlers) {
    var string = code.replace(/\\"/g , ESCAPED_DOUBLE_QUOTES_PLACEHOLDER)
    .replace(/\\'/g , ESCAPED_SINGLE_QUOTES_PLACEHOLDER)
    .split(/(".*?")/g).map(function (dqChunk) {
      return dqChunk.split(/('.*?')/g).map(function (sqChunk) {
        var isStr = sqChunk[0]  == '"' || sqChunk[0] == "'";
        return isStr ? sqChunk : sqChunk.replace(/[a-zA-Z_\$]+\d*/g, function(a,b){return 'c("' + a + '")';});
      }).join('');
    }).join('')
    .replace(/c\("((?:\w|\$)+)"\)\[(.+?)\]/g, function(s, variableName, attributeName) {
      return 'a(c("' + variableName + '"), ' + attributeName + ')';
    })
    .replace(ESCAPED_DOUBLE_QUOTES_PATTERN, '\\"')
    .replace(ESCAPED_SINGLE_QUOTES_PATTERN, "\\'");

    if (handlers === true) return string;
    var fn = new Function('c','a', "'use strict';return " + string + ";");
    if (handlers) {
      return fn(handlers.variable, handlers.accessor);
    }
    return fn;
  };
});
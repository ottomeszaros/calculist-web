calculist.register('createComputationContextObject', ['_','ss','d3','evalculist','isItem','keyToVarName','getItemByGuid','urlFinder','itemsToSVG'], function (_, ss, d3, evalculist, isItem, keyToVarName, getItemByGuid, urlFinder, itemsToSVG) {

  'use strict';

  var itemMethods = ['$item', '$$item', '$siblings'];

  // NOTE This is used to prevent code from showing up
  // as the computed value while the user is typing
  var fnToString = _.constant('[Function]');

  function ContextObject (item) {
    if (item) {
      var _this = this;
      _.each(itemMethods, function(method) {
        _this[method] = function () {
          return item[method].apply(item, arguments);
        };
        _this[method].toString = fnToString;
      });

      this.$parent = item.parent;
      this.$index = item.parent ? item.parent.items.indexOf(item) : 0;
      this.$items = item.items;
      this.$name = item.key;
      this.$guid = item.guid;
    }
  }

  var proto = ContextObject.prototype;

  var valIfItem = function (item) { return isItem(item) ? item.valueOf() : item; };
  var itemsIfItem = function (item) { return isItem(item) ? item.items : item; };
  var arrayWithItemsFirst = function (array) {
    array[0] = itemsIfItem(array[0]);
    return array;
  };
  var itemsFirst = function (fn) {
    return function () {
      return fn.apply(this, arrayWithItemsFirst(arguments));
    };
  };
  var allItemsAndValues = function (fn) {
    return function () {
      var i = arguments.length;
      while (--i >= 0) {
        arguments[i] = itemsIfItem(arguments[i]);
        if (_.isArray(arguments[i])) arguments[i] = _.map(arguments[i], proto.valueOf);
      }
      return fn.apply(this, arguments);
    };
  };

  var mathKeys = ['E','LN2','LN10','LOG2E','LOG10E','PI','SQRT1_2','SQRT2','abs','acos','acosh','asin','asinh','atan','atan2','atanh','cbrt','ceil','clz32','cos','cosh','exp','expm1','floor','fround','hypot','imul','log','log1p','log2','log10','max','min','pow','random','round','sign','sin','sinh','sqrt','tan','tanh','trunc'];
  var ssKeys = ['median','mode','product','variance','sampleVariance','standardDeviation','sampleStandardDeviation','medianAbsoluteDeviation','interquartileRange','harmonicMean','geometricMean','rootMeanSquare','sampleSkewness','factorial'];
  var lodashKeys = ['difference','intersection','reverse','union','uniq','xor',
                    'filter','find','findLast','map','reduce','zip','unzip',
                    'ceil','floor','max','min','round','clamp','inRange','range',
                    'camelCase','capitalize','kebabCase','lowerCase','join','split',
                    'parseInt','repeat','replace','snakeCase','split','startCase','toLower',
                    'toUpper','truncate','upperCase','words','times','identity'];
  _.each(mathKeys, function(key) { proto[key] = Math[key]; });
  _.each(ssKeys, function(key) { proto[key] = ss[key]; });
  _.each(lodashKeys, function (key) { proto[key] = _[key]; });

  var iterators = ['average','mean','median','mode','standardDeviation','products',
                  'unzip','filter','find','findLast','map','reduce','min','max','join'];

  _.each(iterators, function (methodName) {
    proto[methodName] = itemsFirst(proto[methodName]);
  });

  var doubleIterators = ['difference','intersection','union','xor','zip'];

  _.each(doubleIterators, function (methodName) {
    proto[methodName] = allItemsAndValues(proto[methodName]);
  });

  var conditionals = ['isArray','isNumber','isFunction','isString'];

  _.each(conditionals, function (methodName) {
    proto[methodName] = _.flow(valIfItem, _[methodName]);
  });

  proto.PLACEHOLDER = { toString: _.constant('[PLACEHOLDER]') };

  proto.partial = _.rest(function (fn, partialArgs) {
    var partialFn = _.rest(function (args) {
      var finalArgs = partialArgs.map(function (pArg) {
        if (pArg === proto.PLACEHOLDER) return args.shift();
        return pArg;
      }).concat(args);
      return fn.apply(null, finalArgs);
    });
    partialFn.toString = fnToString;
    return partialFn;
  });

  proto.average = proto.mean = itemsFirst(function (items, defaultValue) {
    return proto.sum(items, defaultValue) / items.length;
  });

  proto.sum = itemsFirst(function(items, defaultValue) {
    if (defaultValue != null) {
      return items.reduce(function(sum, item) {
        var val = item && item.valueOf();
        if (!_.isNumber(val) || _.isNaN(val)) val = defaultValue;
        return sum + val;
      }, 0);
    }
    return items.reduce(function(sum, item) {
      var val = item.valueOf();
      return sum + (_.isNumber(val) ? val : NaN);
    }, 0);
  });

  proto.quantile = itemsFirst(function (sample, p) {
    if (_.isNumber(p)) return ss.quantile(sample, p);
  });

  proto.interquartileRange = itemsFirst(function (items) {
    var values = _.map(items, valIfItem);
    return ss.interquartileRange(values);
  });

  proto.binomialCoefficient = function binomial(n, k) {
    // if ((typeof n !== 'number') || (typeof k !== 'number')) return false;
    var coeff = 1;
    for (var x = n-k+1; x <= n; x++) coeff *= x;
    for (x = 1; x <= k; x++) coeff /= x;
    return coeff;
  };
  proto.isInteger = function (n) { return _.isNumber(n) && n % 1 === 0; }
  proto.gcd = function (a, b) {
    var _gcd = function (a, b) { return b !== 0 ? _gcd(b, a % b) : a; };
    if (proto.isInteger(a) && proto.isInteger(b)) return _gcd(a, b);
    return NaN;
  };
  proto.lcm = function (a, b) { return Math.abs(a) * (Math.abs(b) / proto.gcd(a, b)); };
  proto.fraction = function (numerator, denominator, returnFn) {
    if (_.isFunction(denominator) && !returnFn) {
      returnFn = denominator;
      denominator = 1;
    } else if (denominator == null) {
      denominator = 1;
    }
    if (!returnFn) {
      returnFn = function (n, d) { return '' + n + '/' +  d; };
    }
    var ndec = numerator.toString().split('.')[1] || '';
    var ddec = denominator.toString().split('.')[1] || '';
    if (ndec || ddec) {
      var adjustor = Math.pow(10, Math.max(ndec.length, ddec.length));
      numerator = Math.round(numerator * adjustor);
      denominator = Math.round(denominator * adjustor);
    }
    var gcd = proto.gcd(numerator, denominator);
    return returnFn(numerator / gcd, denominator / gcd);
  };
  proto.wordCount = function (item) {
    var count = 0;
    var items = item;
    if (isItem(item)) {
      if (_.isUndefined(item.key)) item.valueOf();
      count = _.words('' + item.key + ' ' + (item.val || '')).length;
      items = item.items;
      if (items.length === 0) return count;
    } else if (!_.isArray(items)) {
      return _.words('' + item).length;
    }
    return _.reduce(items, function (sum, item) {
      return sum + proto.wordCount(item);
    }, count);
  };
  proto.modulo = proto.mod = function(a, b) { return (+a % (b = +b) + b) % b; };
  proto.polarToCartesian = function (r, theta) {
    var x = r * Math.cos(theta),
        y = r * Math.sin(theta);
    return [x, y];
  };
  proto.cartesianToPolar = function (x, y) {
    var r = Math.sqrt(x * x + y * y),
        theta = Math.atan(y / x);
    return [r, theta];
  };
  proto.degreesToRadians = function (degrees) {
    return (degrees / 360) * (2 * Math.PI);
  };

  proto.radiansToDegrees = function (radians) {
    return 360 * radians / (2 * Math.PI);
  };

  proto.length = proto.count = itemsFirst(_.property('length'));
  proto.name = _.property('key');
  proto.key = _.property('key');
  proto.valueOf = _.method('valueOf');
  proto.toString = _.method('toString');
  proto.recursiveCount = proto.rcount = itemsFirst(function (items) {
    return items.length + _.reduce(items, function (m, item) {
      return m + proto.recursiveCount(item.items);
    }, 0);
  });

  proto.true = true;
  proto.false = false;
  proto.null = null;

  proto.itemsOf = _.property('items');
  proto.nameOf = _.property('key');
  proto.parentOf = _.property('parent');
  proto.guidOf = _.property('guid');
  proto.indexOf = itemsFirst(function (array, item) {
    return array.indexOf(item);
  });
  proto.pluckItems = itemsFirst(function (items, key) {
    var condition;
    if (_.isFunction(key)) {
      condition = key;
    } else {
      condition = { key: key };
    }
    return items.reduce(function (pluckedItems, item) {
      var pluckedItem = _.find(item.items, condition);
      if (pluckedItem) pluckedItems.push(pluckedItem);
      return pluckedItems;
    }, []);
  });

  proto.function = proto.fn = proto.lambda = _.rest(function (string, partialArgs) {
    var pieces = ('' + string).split('|');
    var argNames = pieces.length > 1 ? pieces.shift().split(',') : [];
    var fnBody = pieces.join('|')
    var evalFn = evalculist(fnBody);
    var fn = function () {
      var args = partialArgs.concat(_.toArray(arguments));
      var localVars = argNames.reduce(function (localVars, name, i) {
        localVars[_.trim(name)] = args[i];
        return localVars;
      }, {});
      return evalFn({
        variable: function (name) {
          if (localVars.hasOwnProperty(name)) return localVars[name];
          return proto[name];
        },
        accessor: proto.accessor,
        dotAccessor: proto.dotAccessor,
        assignment: function (name, val) {
          return localVars[name] = val;
        }
      });
    };
    var argString = argNames.slice(partialArgs.length).join(',');
    var fnString = argString ? (argString + '|'  + fnBody) : fnBody;
    fn.toString = _.constant(fnString);
    return fn;
  });

  proto.flowMap = itemsFirst(function () {
    var fns = _.flatten(arguments);
    var fmap = _.rest(function (args) {
      return _.map(fns, function (fn) {
        return fn.valueOf().apply(null, args);
      });
    });
    fmap.toString = fnToString;
    return fmap;
  });

  proto.flow = itemsFirst(function () {
    var fns = _.flatten(arguments);
    var flow = function () {
      return _.reduce(fns, function (r, fn) {
        return [fn.valueOf().apply(null, r)];
      }, arguments)[0];
    };
    flow.toString = function () {
      return fns.reduce(function (s, fn) {
        if (fn.toStringWithInput) return fn.toStringWithInput(s);
        var fs = fn.fName ? fn.fName : ('(' + fn.toString().trim() + ')');
        return fs + '(' + s + ')';
      }, '_');
    };
    return flow;
  });

  proto.compose = itemsFirst(function () {
    var fns = _.flatten(arguments);
    fns.reverse();
    return proto.flow(fns);
  });

  var quotedInputString = function (input) {
    var quoted = '' + (_.isString(input) ? '"' + input + '"' : input);
    if (quoted.length > 64) quoted = quoted.substring(0, 64) + '...';
    return quoted.trim();
  };

  var curry2 = function (fn) {
    var fn0, fn1;
    fn0 = function () {
      if (arguments.length === 0) return fn0;
      var arg0 = arguments[0];
      fn1 = function (arg1) { return fn(arg0, arg1); };
      if (arguments.length > 1) return fn1(arguments[1]);
      fn1.toString = fnToString;
      if (fn0.toStringWithInput) {
        fn1.toStringWithInput = function (input) {
          return fn0.toStringWithInput(quotedInputString(arg0)) + (input ? '(' + input + ')' : '');
        };
        fn1.toString = function () {
          return fn0.toStringWithInput(quotedInputString(arg0));
        };
      }
      return fn1;
    };
    fn0.toString = fnToString;
    return fn0;
  };

  var curry2Comparison = function (op, fn) {
    var c2 = curry2(fn);
    var c2c = function () {
      if (arguments.length === 0) return c2c;
      if (arguments.length === 1) {
        var arg0 = arguments[0];
        if (isItem(arg0)) arg0 = arg0.valueOf();
        var fn = c2(arg0);
        fn.toString = function () {
          return "_ " + op + " " + quotedInputString(arg0) + "";
        };
        fn.toStringWithInput = function (input) {
          var s = fn.toString();
          return input + s.substring(1);
        };
        return fn;
      } else {
        return c2.apply(this, arguments);
      }
    };
    c2c.string = "_ " + op + " _";
    return c2c;
  };

  proto.isEqualTo = proto.eq = curry2Comparison('==', function (b, a) { return a == b; });
  proto.isGreaterThan = proto.gt = curry2Comparison('>', function (b, a) { return a > b;  });
  proto.isGreaterThanOrEqualTo = proto.gte = curry2Comparison('>=', function (b, a) { return a >= b; });
  proto.isLessThan = proto.lt = curry2Comparison('<', function (b, a) { return a < b;  });
  proto.isLessThanOrEqualTo = proto.lte = curry2Comparison('<=', function (b, a) { return a <= b; });

  // TODO should these logic functions check and adapt to non-function arguments?
  proto.and = function () {
    var fns = _.flatten(arguments),
        and;
    and = function () {
      var args = arguments;
      return _.every(fns, function (fn) {
        return fn.valueOf().apply(null, args);
      });
    };
    and.toString = function () {
      return "(" + fns.map(proto.toString).join(' && ') + ")";
    };
    return and;
  };
  proto.and.string = "(_) && (_)";

  proto.or = function () {
    var fns = _.flatten(arguments),
        or;
    or = function () {
      var args = arguments;
      return _.some(fns, function (fn) {
        return fn.valueOf().apply(null, args);
      });
    };
    or.toString = function () {
      return "(" + fns.map(proto.toString).join(' || ') + ")";
    };
    return or;
  };
  proto.or.string = "(_) || (_)";

  proto.not = function (fn) {
    var not = function () {
      return !fn.valueOf().apply(null, arguments);
    };
    not.toString = function () {
      return "!(" + fn.toString().trim() + ")";
    };
    not.toStringWithInput = function (input) {
      return '!(' +
        (
          fn.toStringWithInput ?
          fn.toStringWithInput(input) :
          '(' + fn.toString() + ')(' + input + ')'
        ) +
      ')';
    };
    return not;
  };
  proto.not.string = "!(_)";

  proto.item = curry2(function (key, list) {
    if (isItem(list)) return list.$item(key);
    if (_.isNumber(key)) return list[proto.mod(key, list.length)];
    var condition;
    if (_.isFunction(key)) {
      condition = key;
    } else {
      condition = { key: key };
    }
    return _.find(list, condition);
  });

  proto.first = proto.item(0);
  proto.first.string = "list | item(0)(list)";
  proto.last = proto.item(-1);
  proto.last.string = "list | item(-1)(list)";

  var findOrFilter = function (fOrF) {
    return curry2(function (predicate, collection) {
      if (!_.isFunction(predicate) && _.isFunction(collection)) {
        // backwards compatibility
        return proto[fOrF](collection, predicate);
      }
      collection = itemsIfItem(collection);
      return _[fOrF](collection, predicate);
    });
  };

  proto.find = findOrFilter('find');
  proto.filter = findOrFilter('filter');

  proto.itemOf = curry2(function (list, key) {
    return proto.item(key, list);
  });

  proto.global_item = function (key) {
    return window.topItem.$item(key);
  };

  proto.itemByGuid = function (guid) {
    return getItemByGuid(guid);
  };

  // evalculist adds a special "accessor" function for things like a['b']
  // so it becomes accessor(a, 'b')
  proto.accessor = function (obj, key) {
    if (_.isNumber(key) && !isItem(obj[key])) return obj[key];
    return proto.pluckItems(obj, key);
  };

  proto.dotAccessor = itemsFirst(function (items, key) {
    var item = _.findLast(items, function (item) {
      if (!item.key) item.valueOf();
      return keyToVarName(item.key) === key;
    });
    if (item && item.hasVal) return item.valueOf();
    return item;
  });

  proto.flatten = itemsFirst(function (items) {
    if (isItem(items[0])) {
      return _.reduce(items, function (flatItems, item) {
        flatItems.push(item);
        if (item.items.length) return flatItems.concat(proto.flatten(item));
        return flatItems;
      }, []);
    } else {
      return _.flatten(items);
    }
  });

  var imageToString = _.constant('[Image]');
  proto.image = function (url, width, height) {
    if (!urlFinder.isUrl(url)) return NaN;
    var html = '<img src="' + url + '"';
    if (_.isNumber(+width)) html += ' width="' + (+width) + '"';
    if (_.isNumber(+height)) html += ' height="' + (+height) + '"';
    html += '/>';
    return {
      mediaType: 'image',
      toString: imageToString,
      toHTML: _.constant(html),
    };
  };

  var svgToString = _.constant('[SVG]');
  proto.svg = itemsFirst(function (items) {
    var svg = itemsToSVG(items);
    return {
      toString: svgToString,
      toHTML: _.constant(svg),
    };
  });

  var plotDefaults = {
    type: 'blank',
    width: 500,
    height: 400,
    margin: 30,
    draw: null,
    blank: {
      x: {
        datum: function (item, i) { return i; },
        scale: 'linear',
        ticks: 0,
        tick_format: _.identity,
        domain: function (xValues) {
          xValues = xValues.concat([0]);
          return [_.min(xValues), _.max(xValues)];
        }
      },
      y: {
        datum: function (item) { return item.valueOf(); },
        scale: 'linear',
        ticks: 0,
        tick_format: _.identity,
        domain: function (yValues) {
          yValues = yValues.concat([0]);
          return [_.min(yValues), _.max(yValues)];
        }
      }
    },
    scatterplot: {
      x: {
        datum: function (item, i) { return proto.itemOf(item, 0).valueOf(); },
        scale: 'linear',
        ticks: function (values) { return Math.min(10, values.length); },
        tick_format: _.identity,
        domain: function (xValues) {
          xValues = xValues.concat([0]);
          return [_.min(xValues), _.max(xValues)];
        }
      },
      y: {
        datum: function (item, i) { return proto.itemOf(item, 1).valueOf(); },
        scale: 'linear',
        ticks: function (values) { return Math.min(10, values.length); },
        tick_format: _.identity,
        domain: function (yValues) {
          yValues = yValues.concat([0]);
          return [_.min(yValues), _.max(yValues)];
        }
      },
      r: {
        datum: _.constant(5),
        scale: 'linear',
        domain: function (rValues) {
          rValues = rValues.concat([0]);
          return [_.min(rValues), _.max(rValues)];
        }
      },
      color: {
        datum: _.constant('black'),
        background: 'none',
      }
    },
    linegraph: {
      x: {
        datum: function (item, i) { return i; },
        scale: 'linear',
        ticks: function (values) { return Math.min(10, values.length); },
        tick_format: _.identity,
        domain: function (xValues) {
          xValues = xValues.concat([0]);
          return [_.min(xValues), _.max(xValues)];
        }
      },
      y: {
        datum: function (item) { return item.valueOf(); },
        scale: 'linear',
        ticks: function (values) { return Math.min(10, values.length); },
        tick_format: _.identity,
        domain: function (yValues) {
          yValues = yValues.concat([0]);
          return [_.min(yValues), _.max(yValues)];
        }
      }
    },
    barchart: {
      x: {
        datum: function (item, i) { return i; },
        bar_width: _.constant(0.9),
        scale: 'linear',
        ticks: function (values) { return Math.min(10, values.length); },
        tick_format: _.identity,
        domain: function (xValues) {
          xValues = xValues.concat([0]);
          return [_.min(xValues), _.max(xValues)];
        }
      },
      y: {
        datum: _.constant(0),
        bar_height: function (item) { return item.valueOf(); },
        scale: 'linear',
        ticks: function (values) { return Math.min(10, values.length); },
        tick_format: _.identity,
        domain: function (yValues) {
          yValues = yValues.concat([0]);
          return [_.min(yValues), _.max(yValues)];
        }
      },
      color: {
        datum: _.constant('steelblue'),
        background: 'none',
      }
    }
  };

  proto.plot = itemsFirst(function (params) {
    var acc = proto.dotAccessor;
    var param = _.partial(acc, params);
    var data = itemsIfItem(param('data'));
    if (!data) return NaN;
    var config = ['type','width','height','margin','draw'].reduce(function (config, attr) {
      config[attr] = param(attr) || plotDefaults[attr];
      return config;
    }, {});
    _.each(plotDefaults[config.type], function (defaults, key) {
      var properties = param(key);
      config[key] = _.mapValues(defaults, function (_default, k) {
        return (properties && acc(properties, k)) || _default;
      });
    });
    var xValues = [], yValues = [];
    if (config.type === 'scatterplot') {
      data = data.map(function (item, i) {
        var x = config.x.datum(item, i).valueOf();
        var y = config.y.datum(item, i).valueOf();
        var r = config.r.datum(item, i).valueOf();
        var color = config.color.datum(item, i).valueOf();
        xValues.push(x);
        yValues.push(y);
        return { x: x, y: y, r: r, color: color };
      });
    } else if (config.type === 'barchart') {
      data = data.map(function (item, i) {
        var x = config.x.datum(item, i).valueOf();
        var y = config.y.datum(item, i).valueOf();
        var bar_width = config.x.bar_width(item, i).valueOf();
        var bar_height = config.y.bar_height(item, i).valueOf();
        var color = config.color.datum(item, i).valueOf();
        xValues.push(x + bar_width);
        yValues.push(y + bar_height);
        return { x: x, y: y, bar_width: bar_width, bar_height: bar_height, color: color };
      });
    } else {
      data = data.map(function (item, i) {
        var x = config.x.datum(item, i).valueOf();
        var y = config.y.datum(item, i).valueOf();
        xValues.push(x);
        yValues.push(y);
        return { x: x, y: y };
      });
    }

    var xDomain = config.x.domain;
    var yDomain = config.y.domain;
    if (_.isFunction(xDomain)) xDomain = xDomain(xValues);
    if (_.isFunction(yDomain)) yDomain = yDomain(yValues);
    var xRange = [0 + config.margin, config.width - config.margin];
    var yRange = [config.height - config.margin, 0 + config.margin];
    var scaleX = d3.scaleLinear().domain(xDomain).range(xRange);
    var scaleY = d3.scaleLinear().domain(yDomain).range(yRange);
    var _scaleWidth = d3.scaleLinear().domain([0, 1]).range([0, scaleX(1) - scaleX(0)]);
    var scaleWidth = _.flow(Math.abs, _scaleWidth);
    var _scaleHeight = d3.scaleLinear().domain([0, 1]).range([0, scaleY(0) - scaleY(1)]);
    var scaleHeight = _.flow(Math.abs, _scaleHeight);

    var xTicks = config.x.ticks;
    var yTicks = config.y.ticks;
    if (_.isFunction(xTicks)) xTicks = xTicks(xValues);
    if (_.isFunction(yTicks)) yTicks = yTicks(yValues);
    if (_.isNumber(xTicks)) xTicks = scaleX.ticks(xTicks);
    if (_.isNumber(yTicks)) yTicks = scaleY.ticks(yTicks);

    var html = '<svg width="' + config.width + '" height="' + config.height + '">' +
    '<g>' + (function () {
      switch (config.type) {
        case 'scatterplot':
          return data.map(function (datum, i) {
            return '<circle cx="' + scaleX(datum.x) + '"' +
              ' cy="' + scaleY(datum.y) + '" r="' + datum.r + '" fill="' + datum.color + '"/>';
          }).join('');
        case 'linegraph':
          var path = d3.path();
          data.forEach(function (datum, i) {
            if (i === 0) {
              path.moveTo(scaleX(datum.x), scaleY(datum.y));
            } else {
              path.lineTo(scaleX(datum.x), scaleY(datum.y));
            }
          });
          return '<path d="' + path + '" stroke="' + 'steelblue' + '" stroke-width="2" fill="none"/>';
        case 'barchart':
          return data.map(function (datum, i) {
            var scaledX = scaleX(datum.x);
            var scaledY = scaleY(datum.y);
            var scaledWidth = scaleWidth(datum.bar_width);
            var scaledHeight = scaleHeight(datum.bar_height);
            return '<rect x="' + (datum.bar_width < 0 ? (scaledX - scaledWidth) : scaledX) + '"' +
              ' y="' + (datum.bar_height < 0 ? scaledY : (scaledY - scaledHeight)) +
              '" width="' + scaledWidth + '" height="' + scaledHeight + '" fill="' + datum.color + '"/>';
          }).join('');
        default:
          return '';
      }
    })() + '</g>' +
    (config.draw ? itemsToSVG(itemsIfItem(config.draw), {topTag:'g',scaleX:scaleX,scaleY:scaleY,scaleWidth:scaleWidth,scaleHeight:scaleHeight}) : '') +
    '<g>' +
    '<line x1="0" y1="' + scaleY(0) + '" x2="' + config.width + '" y2="' + scaleY(0) + '" stroke-width="2" stroke="#000"/>' +
    '<line x1="' + scaleX(0) + '" y1="0" x2="' + scaleX(0) + '" y2="' + config.height + '" stroke-width="2" stroke="#000"/>' +
    xTicks.map(function (tick, i) {
      return '<line x1="' + scaleX(tick) + '" y1="' + (scaleY(0) - 5) + '" x2="' + scaleX(tick) + '" y2="' + (scaleY(0) + 5) + '" stroke-width="2" stroke="#000"/>' +
              (tick === 0 ? '' : '<text x="' + scaleX(tick) + '" y="' + (scaleY(0) + 20) + '">' + _.escape(config.x.tick_format(tick, i)) + '</text>');
    }).join('') +
    yTicks.map(function (tick, i) {
      return '<line x1="' + (scaleX(0) - 5) + '" y1="' + scaleY(tick) + '" x2="' + (scaleX(0) + 5) + '" y2="' + scaleY(tick) + '" stroke-width="2" stroke="#000"/>' +
              (tick === 0 ? '' : '<text x="' + (scaleX(0) - 20) + '" y="' + scaleY(tick) + '">' + _.escape(config.y.tick_format(tick, i)) + '</text>');
    }).join('') +
    '</g>' +
    '</svg>';
    return {
      toString: _.constant('[Plot]'),
      toHTML: function () {
        return html;
      }
    };
  });

  proto.table = itemsFirst(function (items, columns) {
    var columnValues = {};
    var mappers = {};
    if (columns) {
      var columnKeys = [];
      itemsIfItem(columns).forEach(function (column, i) {
        if (isItem(column)) {
          var val = column.valueOf();
          if (_.isFunction(val)) {
            columnKeys.push(column.key);
            columnValues[column.key] = [];
            mappers[column.key] = val;
          } else {
            columnKeys.push(val);
            columnValues[val] = [];
          }
        } else {
          column = '' + column;
          columnKeys.push(column);
          columnValues[column] = [];
        }
      });
      columns = columnKeys;
    }
    _.each(items, function (rowItem, i) {
      if (columns) {
        columns.forEach(function (column) {
          if (mappers[column]) {
            columnValues[column][i] = mappers[column](rowItem);
          } else {
            var cellItem = proto.item(column, rowItem);
            if (cellItem) {
              var val = cellItem.valueOf();
              columnValues[column][i] = val;
            }
          }
        });
      } else {
        _.each(rowItem.items, function (cellItem) {
          var val = cellItem.valueOf();
          var column = cellItem.key;
          columnValues[column] || (columnValues[column] = []);
          columnValues[column][i] = val;
        });
      }
    });
    if (!columns) columns = _.keys(columnValues);
    var html = '<table>' +
      '<thead>' +
        '<tr>' +
          '<th class="index-column"></th>' +
          columns.map(function (column) {
            return '<th>' + _.escape(column) + '</th>';
          }).join('') +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        items.map(function (item, i) {
          return '<tr>' +
            '<td class="index-column">' + i + '</td>' +
            columns.map(function (column) {
              var val = columnValues[column] ? columnValues[column][i] : '';
              if (val == null) val = '';
              return '<td>' + _.escape(val) + '</td>';
            }).join('') +
          '</tr>';
        }).join('') +
      '</tbody>' +
    '</table>';
    return {
      toString: _.constant('[Table]'),
      toHTML: _.constant(html)
    };
  });

  proto.uniq = proto.unique = itemsFirst(function (items) {
    items = _.map(items, proto.valueOf);
    return _.uniq(items);
  });

  proto.ungroup = itemsFirst(function (items, depth) {
    depth = +(depth == null ? 1 : depth);
    if (_.isNaN(depth)) return depth;
    while (--depth >= 0) {
      items = _.reduce(items, function (ungroupedItems, item) {
        return ungroupedItems.concat(item.items);
      }, []);
    }
    return items;
  });

  proto.slice = itemsFirst(function (items, start, end) {
    var result = _.slice(items, start, end);
    if (_.isString(items)) return result.join('');
    return result;
  });

  proto.reverse = itemsFirst(function (items) {
    var result = _.reverse(_.toArray(items));
    if (_.isString(items)) return result.join('');
    return result;
  });

  _.each(proto, function (fn, key) {
    var sn_key = _.snakeCase(key);
    proto[sn_key] = fn;
    if (_.isFunction(fn)) {
      fn.fName || (fn.fName = sn_key);
      fn.toStringWithInput || (fn.toStringWithInput = function (input) {
        return fn.fName + '(' + input + ')';
      });
      fn.toString = fn.string ? _.constant(fn.string) : fnToString;
    }
  });

  return function (item) {
    return new ContextObject(item);
  };

});

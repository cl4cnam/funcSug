peg = // Generated by Peggy 2.0.1.
//
// https://peggyjs.org/
(function() {
  "use strict";

function peg$subclass(child, parent) {
  function C() { this.constructor = child; }
  C.prototype = parent.prototype;
  child.prototype = new C();
}

function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}

peg$subclass(peg$SyntaxError, Error);

function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) { return str; }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}

peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var loc = this.location.source + ":" + s.line + ":" + s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = (last - s.column) || 1;
      str += "\n --> " + loc + "\n"
          + filler + " |\n"
          + s.line + " | " + line + "\n"
          + filler + " | " + peg$padEnd("", s.column - 1, ' ')
          + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },

    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part)
          ? classEscape(part[0]) + "-" + classEscape(part[1])
          : classEscape(part);
      });

      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },

    any: function() {
      return "any character";
    },

    end: function() {
      return "end of input";
    },

    other: function(expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  "\\\"")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\]/g, "\\]")
      .replace(/\^/g, "\\^")
      .replace(/-/g,  "\\-")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== undefined ? options : {};

  var peg$FAILED = {};
  var peg$source = options.grammarSource;

  var peg$startRuleFunctions = { start: peg$parsestart };
  var peg$startRuleFunction = peg$parsestart;

  var peg$c0 = "(";
  var peg$c1 = ")";
  var peg$c2 = "[";
  var peg$c3 = "]";
  var peg$c4 = "{";
  var peg$c5 = "}";
  var peg$c6 = "~";
  var peg$c7 = "!";
  var peg$c8 = ".";
  var peg$c9 = ":";
  var peg$c10 = "%";
  var peg$c11 = "$";
  var peg$c12 = "@";
  var peg$c13 = "*";
  var peg$c14 = "#";
  var peg$c15 = "-";
  var peg$c16 = "\"";
  var peg$c17 = "'";
  var peg$c18 = "`";

  var peg$r0 = /^[A-Za-z_]/;
  var peg$r1 = /^[A-Za-z_=+*\/<>\-]/;
  var peg$r2 = /^[^\n\r]/;
  var peg$r3 = /^[ \t]/;
  var peg$r4 = /^[ \t\n\r]/;
  var peg$r5 = /^[\n\r]/;
  var peg$r6 = /^[0-9]/;
  var peg$r7 = /^[^"]/;
  var peg$r8 = /^[^']/;
  var peg$r9 = /^[^`]/;

  var peg$e0 = peg$literalExpectation("(", false);
  var peg$e1 = peg$literalExpectation(")", false);
  var peg$e2 = peg$literalExpectation("[", false);
  var peg$e3 = peg$literalExpectation("]", false);
  var peg$e4 = peg$literalExpectation("{", false);
  var peg$e5 = peg$literalExpectation("}", false);
  var peg$e6 = peg$literalExpectation("~", false);
  var peg$e7 = peg$literalExpectation("!", false);
  var peg$e8 = peg$literalExpectation(".", false);
  var peg$e9 = peg$literalExpectation(":", false);
  var peg$e10 = peg$literalExpectation("%", false);
  var peg$e11 = peg$literalExpectation("$", false);
  var peg$e12 = peg$literalExpectation("@", false);
  var peg$e13 = peg$classExpectation([["A", "Z"], ["a", "z"], "_"], false, false);
  var peg$e14 = peg$literalExpectation("*", false);
  var peg$e15 = peg$classExpectation([["A", "Z"], ["a", "z"], "_", "=", "+", "*", "/", "<", ">", "-"], false, false);
  var peg$e16 = peg$literalExpectation("#", false);
  var peg$e17 = peg$classExpectation(["\n", "\r"], true, false);
  var peg$e18 = peg$classExpectation([" ", "\t"], false, false);
  var peg$e19 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false);
  var peg$e20 = peg$classExpectation(["\n", "\r"], false, false);
  var peg$e21 = peg$literalExpectation("-", false);
  var peg$e22 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e23 = peg$literalExpectation("\"", false);
  var peg$e24 = peg$classExpectation(["\""], true, false);
  var peg$e25 = peg$literalExpectation("'", false);
  var peg$e26 = peg$classExpectation(["'"], true, false);
  var peg$e27 = peg$literalExpectation("`", false);
  var peg$e28 = peg$classExpectation(["`"], true, false);

  var peg$f0 = function(expr) { return new Expression('program', expr, expr.text) };
  var peg$f1 = function(startExpr, expr) { return new Expression('expression', [startExpr].concat(expr), text() ) };
  var peg$f2 = function(startExpr, expr) { return new Expression('expression', [startExpr].concat(expr), text() ) };
  var peg$f3 = function(startExpr, exprLabel, multLabel, expr, cancelExpression) { return new Expression('expression', [startExpr].concat(expr), text(), exprLabel, cancelExpression, multLabel ) };
  var peg$f4 = function(expr) { return expr; };
  var peg$f5 = function(expr) { return expr; };
  var peg$f6 = function(n) { return new Expression('expression', [n], text()) };
  var peg$f7 = function(n, e1) { return new Expression('expression', [n, e1], text()) };
  var peg$f8 = function(n, e1, e2) { return new Expression('expression', [n, e1, e2], text()) };
  var peg$f9 = function(n, e1, e2, e3) { return new Expression('expression', [n, e1, e2, e3], text()) };
  var peg$f10 = function(expr) { return new Expression('expression', [new Expression('identifier', 'get', 'get'), expr], text()) };
  var peg$f11 = function(spac) { return new Expression('expression', [], text()) };
  var peg$f12 = function(n) { return n.join("") };
  var peg$f13 = function(n) { return n.join("") };
  var peg$f14 = function(n) { return new Expression('identifier', n.join(""), n.join("")) };
  var peg$f15 = function(digits) { return new Expression('number', parseInt((digits[0] || '') + digits[1].join(""), 10), (digits[0] || '') + digits[1].join("")) };
  var peg$f16 = function(content) { return new Expression('string', content.join(""), '"'+content.join("")+'"' ) };
  var peg$f17 = function(content) { return new Expression('string', content.join(""), "'"+content.join("")+"'" ) };
  var peg$f18 = function(content) { return new Expression('string', content.join(""), '`'+content.join("")+'`' ) };
  var peg$currPos = 0;
  var peg$savedPos = 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = 0;
  var peg$maxFailExpected = [];
  var peg$silentFails = 0;

  var peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function offset() {
    return peg$savedPos;
  }

  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;

      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);

    return {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsestart() {
    var s0;

    s0 = peg$parseprogram();

    return s0;
  }

  function peg$parseprogram() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parse__();
    s2 = peg$parseexpression();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse__();
      peg$savedPos = s0;
      s0 = peg$f0(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 40) {
      s1 = peg$c0;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e0); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      s3 = peg$parseexpression();
      if (s3 !== peg$FAILED) {
        s4 = [];
        s5 = peg$parseWSexpression();
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = peg$parseWSexpression();
        }
        s5 = peg$parse__();
        if (input.charCodeAt(peg$currPos) === 41) {
          s6 = peg$c1;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e1); }
        }
        if (s6 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f1(s3, s4);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c2;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e2); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        s3 = peg$parseexpression();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parseWSexpression();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parseWSexpression();
          }
          s5 = peg$parse__();
          if (input.charCodeAt(peg$currPos) === 93) {
            s6 = peg$c3;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e3); }
          }
          if (s6 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f2(s3, s4);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
          s1 = peg$c4;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e4); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse__();
          s3 = peg$parseexpression();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseexprLabel();
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            s5 = peg$parsemultLabel();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            s6 = [];
            s7 = peg$parseWSexpression();
            while (s7 !== peg$FAILED) {
              s6.push(s7);
              s7 = peg$parseWSexpression();
            }
            s7 = peg$parse__();
            if (input.charCodeAt(peg$currPos) === 125) {
              s8 = peg$c5;
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e5); }
            }
            if (s8 !== peg$FAILED) {
              s9 = peg$parsecancelExpression();
              if (s9 === peg$FAILED) {
                s9 = null;
              }
              peg$savedPos = s0;
              s0 = peg$f3(s3, s4, s5, s6, s9);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parsenumber();
          if (s0 === peg$FAILED) {
            s0 = peg$parsestring();
            if (s0 === peg$FAILED) {
              s0 = peg$parsesimpleName();
              if (s0 === peg$FAILED) {
                s0 = peg$parseexpression0();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseexpression1();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseexpression2();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parseexpression3();
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseexpression4();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parseexpressionEmpty();
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsecancelExpression() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse__();
    if (input.charCodeAt(peg$currPos) === 126) {
      s2 = peg$c6;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e6); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse__();
      s4 = peg$parseexpression();
      if (s4 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f4(s4);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseWSexpression() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parsespaces();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseexpression();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f5(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpression0() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 33) {
      s1 = peg$c7;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e7); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesimpleName();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f6(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpression1() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 46) {
      s1 = peg$c8;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e8); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesimpleName();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsespaces();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseexpression();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f7(s2, s4);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpression2() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 58) {
      s1 = peg$c9;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e9); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesimpleName();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsespaces();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseexpression();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsespaces();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseexpression();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f8(s2, s4, s6);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpression3() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 37) {
      s1 = peg$c10;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e10); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesimpleName();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsespaces();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseexpression();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsespaces();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseexpression();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsespaces();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseexpression();
                  if (s8 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f9(s2, s4, s6, s8);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpression4() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 36) {
      s1 = peg$c11;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e11); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseexpression();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f10(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpressionEmpty() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 40) {
      s1 = peg$c0;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e0); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (input.charCodeAt(peg$currPos) === 41) {
        s3 = peg$c1;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e1); }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f11(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexprLabel() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parsespaces();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 64) {
        s2 = peg$c12;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e12); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$r0.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e13); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$r0.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e13); }
            }
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f12(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsemultLabel() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parsespaces();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 42) {
        s2 = peg$c13;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e14); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$r0.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e13); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$r0.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e13); }
            }
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f13(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesimpleName() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$r1.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e15); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$r1.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e15); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f14(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parse__() {
    var s0, s1;

    s0 = [];
    s1 = peg$parsecomment();
    if (s1 === peg$FAILED) {
      s1 = peg$parsesingleSpace();
      if (s1 === peg$FAILED) {
        s1 = peg$parsenewline();
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsecomment();
      if (s1 === peg$FAILED) {
        s1 = peg$parsesingleSpace();
        if (s1 === peg$FAILED) {
          s1 = peg$parsenewline();
        }
      }
    }

    return s0;
  }

  function peg$parsespaces() {
    var s0, s1;

    s0 = [];
    s1 = peg$parsecomment();
    if (s1 === peg$FAILED) {
      s1 = peg$parsesingleSpace();
      if (s1 === peg$FAILED) {
        s1 = peg$parsenewline();
      }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parsecomment();
        if (s1 === peg$FAILED) {
          s1 = peg$parsesingleSpace();
          if (s1 === peg$FAILED) {
            s1 = peg$parsenewline();
          }
        }
      }
    } else {
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsecomment() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 35) {
      s1 = peg$c14;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e16); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      if (peg$r2.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e17); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (peg$r2.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e17); }
        }
      }
      s3 = peg$parsenewline();
      if (s3 !== peg$FAILED) {
        s1 = [s1, s2, s3];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesingleSpace() {
    var s0;

    if (peg$r3.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e18); }
    }

    return s0;
  }

  function peg$parsewhiteSpace() {
    var s0, s1;

    s0 = [];
    if (peg$r4.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e19); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$r4.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e19); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsenewline() {
    var s0;

    if (peg$r5.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e20); }
    }

    return s0;
  }

  function peg$parsenumber() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 45) {
      s2 = peg$c15;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e21); }
    }
    if (s2 === peg$FAILED) {
      s2 = null;
    }
    s3 = [];
    if (peg$r6.test(input.charAt(peg$currPos))) {
      s4 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s4 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e22); }
    }
    if (s4 !== peg$FAILED) {
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        if (peg$r6.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e22); }
        }
      }
    } else {
      s3 = peg$FAILED;
    }
    if (s3 !== peg$FAILED) {
      s2 = [s2, s3];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f15(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsestring() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s1 = peg$c16;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e23); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      if (peg$r7.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e24); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (peg$r7.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e24); }
        }
      }
      if (input.charCodeAt(peg$currPos) === 34) {
        s3 = peg$c16;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e23); }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f16(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c17;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e25); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$r8.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e26); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$r8.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e26); }
          }
        }
        if (input.charCodeAt(peg$currPos) === 39) {
          s3 = peg$c17;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e25); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f17(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 96) {
          s1 = peg$c18;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e27); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$r9.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e28); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$r9.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e28); }
            }
          }
          if (input.charCodeAt(peg$currPos) === 96) {
            s3 = peg$c18;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e27); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f18(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }


	function Expression(type, content, text, exprLabel, cancelExpression, multLabel) {
		this.type = type
		this.content = content
		this.text = text
		this.exprLabel = exprLabel
		this.cancelExpression = cancelExpression
		this.multLabel = multLabel
		this.location = location()
	}
	input = input.replaceAll(/&([A-Za-z_]+)/g, 'call $$$1')
	input = input.replaceAll(/([A-Za-z_]+)[.]([0-9A-Za-z_]+)[.]([0-9A-Za-z_]+) <-- /g, '%setToNamespace :getFromNamespace $$$1 $2 $3 ')
	input = input.replaceAll(/([A-Za-z_]+)[.]([0-9A-Za-z_]+) <-- /g, '%setToNamespace $$$1 $2 ')
	input = input.replaceAll(/[$]([A-Za-z_]+)[.]([0-9A-Za-z_]+)[.]([0-9A-Za-z_]+)/g, ':getFromNamespace :getFromNamespace $$$1 $2 $3')
	input = input.replaceAll(/[$]([A-Za-z_]+)[.]([0-9A-Za-z_]+)/g, ':getFromNamespace $$$1 $2')
	input = input.replaceAll(/[{]deffunc ([A-Za-z_]+) /g, '.var $1 :set $1 {lambda ')
	input = input.replaceAll(/.var\s+([A-Za-z_]+) <-- /g, '.var $1 :set $1 ')
	input = input.replaceAll('$_', '.evalget _')
	input = input.replaceAll(/\n(\s*)(#?)(.*)<--(.*)(?=\n)/g, '\n$1$2[ $3 <- $4 ]')
	input = input.replaceAll(/([A-Za-z_]+)\s*<-\s*\[\s*\+\s*/g, '$1 <- [ $$$1 + ')
	input = input.replaceAll(/([A-Za-z_]+)\s*<-\s*\[\s*\*\s*/g, '$1 <- [ $$$1 * ')
	input = input.replaceAll(/([A-Za-z_]+)\s*<-\s*\[\s*\-\s*/g, '$1 <- [ $$$1 - ')
	input = input.replaceAll(/([A-Za-z_]+)\s*<-\s*\[\s*\/\s*/g, '$1 <- [ $$$1 / ')
	input = input.replaceAll('<-', ' set ')

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

  return {
    SyntaxError: peg$SyntaxError,
    parse: peg$parse
  };
})()
;

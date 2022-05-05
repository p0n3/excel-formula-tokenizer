var languages = require('./languages');

module.exports.tokenize = tokenize;

var TOK_TYPE_NOOP = 'noop';
var TOK_TYPE_OPERAND = 'operand';
var TOK_TYPE_FUNCTION = 'function';
var TOK_TYPE_SUBEXPR = 'subexpression';
var TOK_TYPE_ARGUMENT = 'argument';
var TOK_TYPE_OP_PRE = 'operator-prefix';
var TOK_TYPE_OP_IN = 'operator-infix';
var TOK_TYPE_OP_POST = 'operator-postfix';
var TOK_TYPE_WSPACE = 'white-space';
var TOK_TYPE_UNKNOWN = 'unknown';

var TOK_SUBTYPE_START = 'start';
var TOK_SUBTYPE_STOP = 'stop';

var TOK_SUBTYPE_TEXT = 'text';
var TOK_SUBTYPE_NUMBER = 'number';
var TOK_SUBTYPE_LOGICAL = 'logical';
var TOK_SUBTYPE_ERROR = 'error';
var TOK_SUBTYPE_RANGE = 'range';

var TOK_SUBTYPE_MATH = 'math';
var TOK_SUBTYPE_CONCAT = 'concatenate';
var TOK_SUBTYPE_INTERSECT = 'intersect';
var TOK_SUBTYPE_UNION = 'union';

function createToken(value, type, subtype = '', attributes = {}) {
  return {value, type, subtype, attributes};
}

class Tokens {
  constructor() {
    this.items = [];
    this.index = -1;
  }

  add(value, type, subtype) {
    const token = createToken(value, type, subtype);
    this.addRef(token);
    return token;
  }

  addRef(token) {
    this.items.push(token);
  }

  reset() {
    this.index = -1;
  }

  BOF() {
    return this.index <= 0;
  }

  EOF() {
    return this.index >= this.items.length - 1;
  }

  moveNext() {
    if (this.EOF()) return false;
    this.index++;
    return true;
  }

  current() {
    if (this.index == -1) return null;
    return this.items[this.index];
  }

  next() {
    if (this.EOF()) return null;
    return this.items[this.index + 1];
  }

  previous() {
    if (this.index < 1) return null;
    return this.items[this.index - 1];
  }

  toArray() {
    return this.items;
  }
}

class TokenStack {
  constructor() {
    this.items = [];
  }

  push(token) {
    this.items.push(token);
  }

  pop() {
    const token = this.items.pop();
    return createToken('', token.type, TOK_SUBTYPE_STOP);
  }

  token() {
    if (this.items.length > 0) {
      return this.items[this.items.length - 1];
    } else {
      return null;
    }
  }

  value() {
    return this.token() ? this.token().value : '';
  }

  type() {
    return this.token() ? this.token().type : '';
  }

  subtype() {
    return this.token() ? this.token().subtype : '';
  }
}

function tokenize(formula, options) {
  options = options || {};
  options.language = options.language || 'en-US';

  var language = languages[options.language];
  if (!language) {
    var msg =
      'Unsupported language ' +
      options.language +
      '. Expected one of: ' +
      Object.keys(languages)
        .sort()
        .join(', ');
    throw new Error(msg);
  }

  var tokens = new Tokens();
  var tokenStack = new TokenStack();

  var offset = 0;

  var currentChar = function() {
    return formula.substr(offset, 1);
  };
  var doubleChar = function() {
    return formula.substr(offset, 2);
  };
  var nextChar = function() {
    return formula.substr(offset + 1, 1);
  };
  var EOF = function() {
    return offset >= formula.length;
  };
  var isPreviousNonDigitBlank = function() {
    var offsetCopy = offset;
    if (offsetCopy == 0) return true;

    while (offsetCopy > 0) {
      if (!/\d/.test(formula[offsetCopy])) {
        return /\s/.test(formula[offsetCopy]);
      }

      offsetCopy -= 1;
    }
    return false;
  };

  var isNextNonDigitTheRangeOperator = function() {
    var offsetCopy = offset;

    while (offsetCopy < formula.length) {
      if (!/\d/.test(formula[offsetCopy])) {
        return /[:#]/.test(formula[offsetCopy]);
      }

      offsetCopy += 1;
    }
    return false;
  };

  var token = '';

  var inString = false;
  var inPath = false;
  var inRange = false;
  var inError = false;
  var inNumeric = false;

  while (formula.length > 0) {
    if (formula.substr(0, 1) == ' ') {
      formula = formula.substr(1);
    } else {
      if (formula.substr(0, 1) == '=') {
        formula = formula.substr(1);
      }
      break;
    }
  }

  var regexSN = /^[1-9]{1}(\.[0-9]+)?E{1}$/;

  while (!EOF()) {
    // state-dependent character evaluation (order is important)

    // double-quoted strings
    // embeds are doubled
    // end marks token

    if (inString) {
      if (currentChar() == '"') {
        if (nextChar() == '"') {
          token += '"';
          offset += 1;
        } else {
          inString = false;
          tokens.add(token, TOK_TYPE_OPERAND, TOK_SUBTYPE_TEXT);
          token = '';
        }
      } else {
        token += currentChar();
      }
      offset += 1;
      continue;
    }

    // single-quoted strings (links)
    // embeds are double
    // end does not mark a token

    if (inPath) {
      if (currentChar() == "'") {
        if (nextChar() == "'") {
          token += "'";
          offset += 1;
        } else {
          inPath = false;
        }
      } else {
        token += currentChar();
      }
      offset += 1;
      continue;
    }

    // bracked strings (range offset or linked workbook name)
    // no embeds (changed to "()" by Excel)
    // end does not mark a token

    if (inRange) {
      if (currentChar() == ']') {
        inRange = false;
      }
      token += currentChar();
      offset += 1;
      continue;
    }

    // error values
    // end marks a token, determined from absolute list of values

    if (inError) {
      token += currentChar();
      offset += 1;
      if (
        ',#NULL!,#DIV/0!,#VALUE!,#REF!,#NAME?,#NUM!,#N/A,'.indexOf(
          ',' + token + ',',
        ) != -1
      ) {
        inError = false;
        tokens.add(token, TOK_TYPE_OPERAND, TOK_SUBTYPE_ERROR);
        token = '';
      }
      continue;
    }

    if (inNumeric) {
      if (
        ([language.decimalSeparator, 'E', '+', '-'].indexOf(currentChar()) !=
          -1 &&
          /[\d\.E\+\-]/.test(nextChar())) ||
        /\d/.test(currentChar())
      ) {
        inNumeric = true;
        token += currentChar();

        offset += 1;
        continue;
      } else {
        inNumeric = false;
        tokens.add(token, TOK_TYPE_OPERAND, TOK_SUBTYPE_NUMBER);
        token = '';
      }
    }

    // scientific notation check

    if ('+-'.indexOf(currentChar()) != -1) {
      if (token.length > 1) {
        if (regexSN.test(token)) {
          token += currentChar();
          offset += 1;
          continue;
        }
      }
    }

    // independent character evaulation (order not important)

    // function, subexpression, array parameters

    if (currentChar() == language.argumentSeparator) {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }

      if (tokenStack.type() == TOK_TYPE_FUNCTION) {
        tokens.add(',', TOK_TYPE_ARGUMENT);

        offset += 1;
        continue;
      }
    }

    if (currentChar() == ',') {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }

      tokens.add(currentChar(), TOK_TYPE_OP_IN, TOK_SUBTYPE_UNION);

      offset += 1;
      continue;
    }

    // establish state-dependent character evaluations

    if (
      /\d/.test(currentChar()) &&
      isPreviousNonDigitBlank() &&
      !isNextNonDigitTheRangeOperator()
    ) {
      inNumeric = true;
      token += currentChar();
      offset += 1;
      continue;
    }

    if (currentChar() == '"') {
      if (token.length > 0) {
        // not expected
        tokens.add(token, TOK_TYPE_UNKNOWN);
        token = '';
      }
      inString = true;
      offset += 1;
      continue;
    }

    if (currentChar() == "'") {
      if (token.length > 0) {
        // not expected
        tokens.add(token, TOK_TYPE_UNKNOWN);
        token = '';
      }
      inPath = true;
      offset += 1;
      continue;
    }

    if (currentChar() == '[') {
      inRange = true;
      token += currentChar();
      offset += 1;
      continue;
    }

    // mark start and end of arrays and array rows

    if (currentChar() == '{') {
      if (token.length > 0) {
        // not expected
        tokens.add(token, TOK_TYPE_UNKNOWN);
        token = '';
      }
      tokenStack.push(
        tokens.add('ARRAY', TOK_TYPE_FUNCTION, TOK_SUBTYPE_START),
      );
      tokenStack.push(
        tokens.add('ARRAYROW', TOK_TYPE_FUNCTION, TOK_SUBTYPE_START),
      );
      offset += 1;
      continue;
    }

    if (currentChar() == ';') {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.addRef(tokenStack.pop());
      tokens.add(',', TOK_TYPE_ARGUMENT);
      tokenStack.push(
        tokens.add('ARRAYROW', TOK_TYPE_FUNCTION, TOK_SUBTYPE_START),
      );
      offset += 1;
      continue;
    }

    if (currentChar() == '}') {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.addRef(tokenStack.pop());
      tokens.addRef(tokenStack.pop());
      offset += 1;
      continue;
    }

    // trim white-space

    if (currentChar() == ' ') {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.add(currentChar(), TOK_TYPE_WSPACE);
      offset += 1;
      while (currentChar() == ' ' && !EOF()) {
        offset += 1;
      }
      continue;
    }

    // multi-character comparators

    if (',>=,<=,<>,'.indexOf(',' + doubleChar() + ',') != -1) {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.add(doubleChar(), TOK_TYPE_OP_IN, TOK_SUBTYPE_LOGICAL);
      offset += 2;
      continue;
    }

    // standard infix operators

    if ('+-*/^&=><'.indexOf(currentChar()) != -1) {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.add(currentChar(), TOK_TYPE_OP_IN);
      offset += 1;
      continue;
    }

    // standard postfix operators

    if ('%'.indexOf(currentChar()) != -1) {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.add(currentChar(), TOK_TYPE_OP_POST);
      offset += 1;
      continue;
    }

    // start subexpression or function

    if (currentChar() == '(') {
      if (token.length > 0) {
        tokenStack.push(
          tokens.add(token, TOK_TYPE_FUNCTION, TOK_SUBTYPE_START),
        );
        token = '';
      } else {
        tokenStack.push(tokens.add('', TOK_TYPE_SUBEXPR, TOK_SUBTYPE_START));
      }
      offset += 1;
      continue;
    }

    // stop subexpression

    if (currentChar() == ')') {
      if (token.length > 0) {
        tokens.add(token, TOK_TYPE_OPERAND);
        token = '';
      }
      tokens.addRef(tokenStack.pop());
      offset += 1;
      continue;
    }

    // token accumulation

    token += currentChar();
    offset += 1;
  }

  // dump remaining accumulation

  if (token.length > 0) tokens.add(token, TOK_TYPE_OPERAND);

  // move all tokens to a new collection, excluding all unnecessary white-space tokens

  var tokens2 = new Tokens();

  while (tokens.moveNext()) {
    token = tokens.current();

    if (token.type == TOK_TYPE_WSPACE) {
      if (tokens.BOF() || tokens.EOF()) {
        // no-op
      } else if (
        !(
          (tokens.previous().type == TOK_TYPE_FUNCTION &&
            tokens.previous().subtype == TOK_SUBTYPE_STOP) ||
          (tokens.previous().type == TOK_TYPE_SUBEXPR &&
            tokens.previous().subtype == TOK_SUBTYPE_STOP) ||
          tokens.previous().type == TOK_TYPE_OPERAND
        )
      ) {
        // no-op
      } else if (
        !(
          (tokens.next().type == TOK_TYPE_FUNCTION &&
            tokens.next().subtype == TOK_SUBTYPE_START) ||
          (tokens.next().type == TOK_TYPE_SUBEXPR &&
            tokens.next().subtype == TOK_SUBTYPE_START) ||
          tokens.next().type == TOK_TYPE_OPERAND
        )
      ) {
        // no-op
      } else {
        tokens2.add(token.value, TOK_TYPE_OP_IN, TOK_SUBTYPE_INTERSECT);
      }
      continue;
    }

    tokens2.addRef(token);
  }

  // switch infix "-" operator to prefix when appropriate, switch infix "+" operator to noop when appropriate, identify operand
  // and infix-operator subtypes, pull "@" from in front of function names

  while (tokens2.moveNext()) {
    token = tokens2.current();

    if (token.type == TOK_TYPE_OP_IN && (token.value == '-' || token.value == '+')) {
      if (tokens2.BOF()) {
        token.type = TOK_TYPE_OP_PRE;
      } else if (
        (tokens2.previous().type == TOK_TYPE_FUNCTION &&
          tokens2.previous().subtype == TOK_SUBTYPE_STOP) ||
        (tokens2.previous().type == TOK_TYPE_SUBEXPR &&
          tokens2.previous().subtype == TOK_SUBTYPE_STOP) ||
        tokens2.previous().type == TOK_TYPE_OP_POST ||
        tokens2.previous().type == TOK_TYPE_OPERAND
      ) {
        token.subtype = TOK_SUBTYPE_MATH;
      } else {
        token.type = TOK_TYPE_OP_PRE;
      }
      continue;
    }

    if (token.type == TOK_TYPE_OP_IN && token.value == '+') {
      if (tokens2.BOF()) {
        token.type = TOK_TYPE_NOOP;
      } else if (
        (tokens2.previous().type == TOK_TYPE_FUNCTION &&
          tokens2.previous().subtype == TOK_SUBTYPE_STOP) ||
        (tokens2.previous().type == TOK_TYPE_SUBEXPR &&
          tokens2.previous().subtype == TOK_SUBTYPE_STOP) ||
        tokens2.previous().type == TOK_TYPE_OP_POST ||
        tokens2.previous().type == TOK_TYPE_OPERAND
      ) {
        token.subtype = TOK_SUBTYPE_MATH;
      } else {
        token.type = TOK_TYPE_NOOP;
      }
      continue;
    }

    if (token.type == TOK_TYPE_OP_IN && token.subtype.length == 0) {
      if ('<>='.indexOf(token.value.substr(0, 1)) != -1) {
        token.subtype = TOK_SUBTYPE_LOGICAL;
      } else if (token.value == '&') {
        token.subtype = TOK_SUBTYPE_CONCAT;
      } else {
        token.subtype = TOK_SUBTYPE_MATH;
      }
      continue;
    }

    if (token.type == TOK_TYPE_OPERAND && token.subtype.length == 0) {
      if (isNaN(Number(language.reformatNumberForJsParsing(token.value)))) {
        if (token.value == language.true) {
          token.subtype = TOK_SUBTYPE_LOGICAL;
          token.value = 'TRUE';
        } else if (token.value == language.false) {
          token.subtype = TOK_SUBTYPE_LOGICAL;
          token.value = 'FALSE';
        } else {
          token.subtype = TOK_SUBTYPE_RANGE;
        }
      } else {
        token.subtype = TOK_SUBTYPE_NUMBER;
        token.value = language.reformatNumberForJsParsing(token.value);
      }
      continue;
    }

    if (token.type == TOK_TYPE_FUNCTION) {
      if (token.value.substr(0, 1) == '@') {
        token.value = token.value.substr(1);
        token.attributes["hasImplicitIntersectionOperator"] = true;
      }
      continue;
    }
  }

  tokens2.reset();

  // move all tokens to a new collection, excluding all noops

  tokens = new Tokens();

  while (tokens2.moveNext()) {
    if (tokens2.current().type != TOK_TYPE_NOOP) {
      tokens.addRef(tokens2.current());
    }
  }

  tokens.reset();

  return tokens.toArray();
}

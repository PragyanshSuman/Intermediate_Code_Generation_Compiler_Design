'use strict';

/**
 * ============================================================
 *  Recursive-Descent Expression Parser
 *  Supports: +  -  *  /  %  ^  &&  ||  !
 *            =  (assignment)  ==  !=  <  >  <=  >=
 *            Parentheses,  unary minus/NOT,
 *            integer/float literals, multi-char identifiers
 * ============================================================
 *
 *  Grammar (highest precedence at bottom):
 *
 *    program        → assignment | expression
 *    assignment     → IDENTIFIER '=' expression
 *    expression     → logicalOr
 *    logicalOr      → logicalAnd  ( '||'  logicalAnd  )*
 *    logicalAnd     → equality    ( '&&'  equality    )*
 *    equality       → relational  ( ('==' | '!=') relational )*
 *    relational     → additive    ( ('<' | '>' | '<=' | '>=') additive )*
 *    additive       → multiplicative ( ('+' | '-') multiplicative )*
 *    multiplicative → unary       ( ('*' | '/' | '%') unary )*
 *    unary          → ('-' | '!') unary | power
 *    power          → primary     ( '^' unary )*
 *    primary        → NUMBER | IDENTIFIER | '(' expression ')'
 */

// ─── Token types ─────────────────────────────────────────────────────────────
const T = {
  NUM:    'NUM',
  IDENT:  'IDENT',
  OP:     'OP',
  ASSIGN: 'ASSIGN',   // single '='
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF:    'EOF',
};

// ─── Lexer ────────────────────────────────────────────────────────────────────
class Lexer {
  constructor(source) {
    // Sanitize source: replace unicode mathematical characters with standard ASCII
    this.src = source.trim()
      .replace(/−/g, '-') // U+2212 Minus Sign
      .replace(/[∗×]/g, '*') // U+2217 Asterisk Operator, U+00D7 Multiplication Sign
      .replace(/÷/g, '/'); // U+00F7 Division Sign

    this.pos  = 0;
    this.tokens = [];
    this._tokenize();
    this.cur  = 0;          // cursor into this.tokens
  }

  _peek()  { return this.src[this.pos]; }
  _advance() { return this.src[this.pos++]; }
  _skipWS() { while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++; }

  _readNumber() {
    let s = '';
    while (this.pos < this.src.length && /[\d.]/.test(this.src[this.pos])) s += this._advance();
    if ((s.match(/\./g) || []).length > 1) throw new Error(`Malformed number: ${s}`);
    this.tokens.push({ type: T.NUM, value: s });
  }

  _readIdent() {
    let s = '';
    while (this.pos < this.src.length && /[\w]/.test(this.src[this.pos])) s += this._advance();
    this.tokens.push({ type: T.IDENT, value: s });
  }

  _tokenize() {
    while (this.pos < this.src.length) {
      this._skipWS();
      if (this.pos >= this.src.length) break;
      const ch = this._peek();

      if (/\d/.test(ch) || (ch === '.' && this.pos + 1 < this.src.length && /\d/.test(this.src[this.pos + 1]))) {
        this._readNumber();
      } else if (/[a-zA-Z_]/.test(ch)) {
        this._readIdent();
      } else if (ch === '(') {
        this.tokens.push({ type: T.LPAREN, value: '(' }); this.pos++;
      } else if (ch === ')') {
        this.tokens.push({ type: T.RPAREN, value: ')' }); this.pos++;
      } else if (ch === '|' && this.src[this.pos + 1] === '|') {
        this.tokens.push({ type: T.OP, value: '||' }); this.pos += 2;
      } else if (ch === '&' && this.src[this.pos + 1] === '&') {
        this.tokens.push({ type: T.OP, value: '&&' }); this.pos += 2;
      } else if (ch === '!' && this.src[this.pos + 1] === '=') {
        this.tokens.push({ type: T.OP, value: '!=' }); this.pos += 2;
      } else if (ch === '=' && this.src[this.pos + 1] === '=') {
        this.tokens.push({ type: T.OP,     value: '==' }); this.pos += 2;
      } else if (ch === '=') {
        this.tokens.push({ type: T.ASSIGN, value: '=' });  this.pos++;
      } else if (ch === '<' && this.src[this.pos + 1] === '=') {
        this.tokens.push({ type: T.OP, value: '<=' }); this.pos += 2;
      } else if (ch === '>' && this.src[this.pos + 1] === '=') {
        this.tokens.push({ type: T.OP, value: '>=' }); this.pos += 2;
      } else if ('+-*/%^<>!'.includes(ch)) {
        this.tokens.push({ type: T.OP, value: ch }); this.pos++;
      } else {
        throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
      }
    }
    this.tokens.push({ type: T.EOF, value: '' });
  }

  // ── Iterator methods used by the Parser ───────────────────
  peek()    { return this.tokens[this.cur]; }
  consume() { return this.tokens[this.cur++]; }

  expect(val) {
    const tok = this.consume();
    if (tok.value !== val) throw new Error(`Expected '${val}' but got '${tok.value}'`);
    return tok;
  }

  matchOp(...vals) {
    const tok = this.peek();
    return tok.type === T.OP && vals.includes(tok.value);
  }

  isAssign() {
    return this.peek().type === T.ASSIGN;
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────
class Parser {
  constructor(lexer) { this.lex = lexer; }

  parse() {
    const node = this.parseProgram();
    if (this.lex.peek().type !== T.EOF) {
      throw new Error(`Unexpected token '${this.lex.peek().value}' at end of expression`);
    }
    return node;
  }

  /**
   * Top-level: detect  IDENT '=' expr  (assignment) vs plain expression.
   * Look-ahead: if token[0] is IDENT and token[1] is ASSIGN → assignment.
   */
  parseProgram() {
    const tok0 = this.lex.tokens[this.lex.cur];
    const tok1 = this.lex.tokens[this.lex.cur + 1];
    if (tok0 && tok0.type === T.IDENT &&
        tok1 && tok1.type === T.ASSIGN) {
      // Consume  IDENT  '='
      const lhs = this.lex.consume().value;
      this.lex.consume(); // eat '='
      const rhs = this.parseExpression();
      return { type: 'Assignment', lhs, rhs };
    }
    return this.parseExpression();
  }

  parseExpression()    { return this.parseLogicalOr(); }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.lex.matchOp('||')) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseLogicalAnd() };
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseEquality();
    while (this.lex.matchOp('&&')) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseEquality() };
    }
    return left;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (this.lex.matchOp('==', '!=')) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseRelational() };
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    while (this.lex.matchOp('<', '>', '<=', '>=')) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseAdditive() };
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.lex.matchOp('+', '-')) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.lex.matchOp('*', '/', '%')) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseUnary() };
    }
    return left;
  }

  parseUnary() {
    if (this.lex.matchOp('-', '!')) {
      const op = this.lex.consume().value;
      return { type: 'UnaryOp', op, operand: this.parseUnary() };
    }
    return this.parsePower();
  }

  parsePower() {
    let base = this.parsePrimary();
    if (this.lex.matchOp('^')) {
      this.lex.consume();
      // Right-associative
      base = { type: 'BinaryOp', op: '^', left: base, right: this.parseUnary() };
    }
    return base;
  }

  parsePrimary() {
    const tok = this.lex.peek();
    if (tok.type === T.NUM) {
      this.lex.consume();
      return { type: 'Number', value: tok.value };
    }
    if (tok.type === T.IDENT) {
      this.lex.consume();
      return { type: 'Identifier', value: tok.value };
    }
    if (tok.type === T.LPAREN) {
      this.lex.consume();
      const inner = this.parseExpression();
      this.lex.expect(')');
      return inner;
    }
    if (tok.type === T.EOF) throw new Error('Unexpected end of expression');
    throw new Error(`Unexpected token '${tok.value}'`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Parse an expression string and return its AST.
 * @param {string} src
 * @returns {object}  AST root node
 */
function parse(src) {
  if (!src || !src.trim()) throw new Error('Empty expression');
  const lexer  = new Lexer(src);
  const parser = new Parser(lexer);
  return parser.parse();
}

module.exports = { parse };

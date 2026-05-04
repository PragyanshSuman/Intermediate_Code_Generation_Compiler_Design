'use strict';

const T = {
  PREPROC: 'PREPROC',
  KEYWORD: 'KEYWORD',
  IDENT: 'IDENT',
  NUM: 'NUM',
  STR: 'STR',
  PUNCT: 'PUNCT',
  OP: 'OP',
  EOF: 'EOF'
};

const KEYWORDS = new Set(['int', 'char', 'float', 'void', 'for', 'if', 'else', 'return', 'while']);

class Lexer {
  constructor(src) {
    this.src = src;
    this.pos = 0;
    this.tokens = [];
    this.tokenize();
    this.cur = 0;
  }

  peekC() { return this.pos < this.src.length ? this.src[this.pos] : null; }
  advance() { return this.src[this.pos++]; }

  tokenize() {
    while (this.pos < this.src.length) {
      let ch = this.peekC();
      if (/\s/.test(ch)) {
        this.advance();
        continue;
      }

      if (ch === '#') {
        let str = '';
        while (this.pos < this.src.length && this.peekC() !== '\n') {
          str += this.advance();
        }
        this.tokens.push({ type: T.PREPROC, value: str });
        continue;
      }

      if (/[a-zA-Z_]/.test(ch)) {
        let str = '';
        while (this.pos < this.src.length && /[a-zA-Z0-9_]/.test(this.peekC())) {
          str += this.advance();
        }
        if (KEYWORDS.has(str)) {
          this.tokens.push({ type: T.KEYWORD, value: str });
        } else {
          this.tokens.push({ type: T.IDENT, value: str });
        }
        continue;
      }

      if (/\d/.test(ch)) {
        let str = '';
        while (this.pos < this.src.length && /\d/.test(this.peekC())) {
          str += this.advance();
        }
        this.tokens.push({ type: T.NUM, value: str });
        continue;
      }

      if (ch === '"') {
        this.advance(); // skip "
        let str = '';
        while (this.pos < this.src.length && this.peekC() !== '"') {
          if (this.peekC() === '\\') {
            str += this.advance(); // backslash
            str += this.advance(); // next char
          } else {
            str += this.advance();
          }
        }
        this.advance(); // skip "
        this.tokens.push({ type: T.STR, value: str });
        continue;
      }

      if ('{}();,'.includes(ch)) {
        this.tokens.push({ type: T.PUNCT, value: this.advance() });
        continue;
      }

      // Operators
      if (ch === '+') {
        this.advance();
        if (this.peekC() === '+') { this.advance(); this.tokens.push({ type: T.OP, value: '++' }); }
        else this.tokens.push({ type: T.OP, value: '+' });
        continue;
      }
      if (ch === '-') {
        this.advance();
        if (this.peekC() === '-') { this.advance(); this.tokens.push({ type: T.OP, value: '--' }); }
        else this.tokens.push({ type: T.OP, value: '-' });
        continue;
      }
      if (ch === '=') {
        this.advance();
        if (this.peekC() === '=') { this.advance(); this.tokens.push({ type: T.OP, value: '==' }); }
        else this.tokens.push({ type: T.OP, value: '=' });
        continue;
      }
      if (ch === '<') {
        this.advance();
        if (this.peekC() === '=') { this.advance(); this.tokens.push({ type: T.OP, value: '<=' }); }
        else this.tokens.push({ type: T.OP, value: '<' });
        continue;
      }
      if (ch === '>') {
        this.advance();
        if (this.peekC() === '=') { this.advance(); this.tokens.push({ type: T.OP, value: '>=' }); }
        else this.tokens.push({ type: T.OP, value: '>' });
        continue;
      }
      if (ch === '!') {
        this.advance();
        if (this.peekC() === '=') { this.advance(); this.tokens.push({ type: T.OP, value: '!=' }); }
        else this.tokens.push({ type: T.OP, value: '!' });
        continue;
      }
      if (ch === '|') {
        this.advance();
        if (this.peekC() === '|') { this.advance(); this.tokens.push({ type: T.OP, value: '||' }); }
        else this.tokens.push({ type: T.OP, value: '|' });
        continue;
      }
      if (ch === '&') {
        this.advance();
        if (this.peekC() === '&') { this.advance(); this.tokens.push({ type: T.OP, value: '&&' }); }
        else this.tokens.push({ type: T.OP, value: '&' });
        continue;
      }
      if ('*/%'.includes(ch)) {
        this.tokens.push({ type: T.OP, value: this.advance() });
        continue;
      }

      throw new Error(`Unknown char: ${ch}`);
    }
    this.tokens.push({ type: T.EOF, value: '' });
  }

  peek() { return this.tokens[this.cur]; }
  consume() { return this.tokens[this.cur++]; }
  match(type, val) {
    const t = this.peek();
    if (t.type === type && (val === undefined || t.value === val)) {
      return this.consume();
    }
    return null;
  }
  expect(type, val) {
    const t = this.consume();
    if (t.type !== type || (val !== undefined && t.value !== val)) {
      throw new Error(`Expected ${val || type} but got ${t.value || t.type}`);
    }
    return t;
  }
}

class Parser {
  constructor(lexer) { this.lex = lexer; }

  parse() {
    const program = { type: 'Program', body: [] };
    while (this.lex.peek().type !== T.EOF) {
      if (this.lex.peek().type === T.PREPROC) {
        this.lex.consume(); // ignore preproc for IR
      } else if (this.lex.peek().type === T.KEYWORD && ['int', 'void'].includes(this.lex.peek().value)) {
        // could be function decl or var decl
        const startPos = this.lex.cur;
        this.lex.consume(); // int
        this.lex.consume(); // name
        if (this.lex.peek().value === '(') {
          this.lex.cur = startPos;
          program.body.push(this.parseFunction());
        } else {
          this.lex.cur = startPos;
          program.body.push(this.parseVarDecl());
        }
      } else {
        program.body.push(this.parseStatement());
      }
    }
    return program;
  }

  parseFunction() {
    this.lex.consume(); // int/void
    const name = this.lex.expect(T.IDENT).value;
    this.lex.expect(T.PUNCT, '(');
    // simplified args
    while(this.lex.peek().value !== ')') this.lex.consume();
    this.lex.expect(T.PUNCT, ')');
    const body = this.parseBlock();
    return { type: 'Function', name, body };
  }

  parseBlock() {
    this.lex.expect(T.PUNCT, '{');
    const stmts = [];
    while (this.lex.peek().value !== '}') {
      stmts.push(this.parseStatement());
    }
    this.lex.expect(T.PUNCT, '}');
    return { type: 'Block', body: stmts };
  }

  parseStatement() {
    const p = this.lex.peek();
    if (p.type === T.PUNCT && p.value === '{') return this.parseBlock();
    if (p.type === T.KEYWORD && p.value === 'int') return this.parseVarDecl();
    if (p.type === T.KEYWORD && p.value === 'for') return this.parseFor();
    if (p.type === T.KEYWORD && p.value === 'if') return this.parseIf();
    if (p.type === T.KEYWORD && p.value === 'return') return this.parseReturn();
    
    // Expression statement
    const expr = this.parseExpression();
    if (this.lex.peek().value === ';') this.lex.consume();
    return { type: 'ExprStmt', expr };
  }

  parseVarDecl() {
    this.lex.consume(); // 'int'
    const decls = [];
    while (true) {
      const id = this.lex.expect(T.IDENT).value;
      let init = null;
      if (this.lex.match(T.OP, '=')) {
        init = this.parseExpression();
      }
      decls.push({ id, init });
      if (this.lex.match(T.PUNCT, ',')) continue;
      break;
    }
    this.lex.expect(T.PUNCT, ';');
    return { type: 'VarDecl', decls };
  }

  parseFor() {
    this.lex.expect(T.KEYWORD, 'for');
    this.lex.expect(T.PUNCT, '(');
    let init = null, cond = null, inc = null;
    if (this.lex.peek().value !== ';') init = this.parseExpression();
    this.lex.expect(T.PUNCT, ';');
    if (this.lex.peek().value !== ';') cond = this.parseExpression();
    this.lex.expect(T.PUNCT, ';');
    if (this.lex.peek().value !== ')') inc = this.parseExpression();
    this.lex.expect(T.PUNCT, ')');
    const body = this.parseStatement();
    return { type: 'ForLoop', init, cond, inc, body };
  }

  parseIf() {
    this.lex.expect(T.KEYWORD, 'if');
    this.lex.expect(T.PUNCT, '(');
    const cond = this.parseExpression();
    this.lex.expect(T.PUNCT, ')');
    const trueBranch = this.parseStatement();
    let falseBranch = null;
    if (this.lex.match(T.KEYWORD, 'else')) {
      falseBranch = this.parseStatement();
    }
    return { type: 'IfElse', cond, trueBranch, falseBranch };
  }

  parseReturn() {
    this.lex.expect(T.KEYWORD, 'return');
    let expr = null;
    if (this.lex.peek().value !== ';') {
      expr = this.parseExpression();
    }
    this.lex.expect(T.PUNCT, ';');
    return { type: 'Return', expr };
  }

  parseExpression() {
    // Top level: Assignment
    const left = this.parseLogicalOr();
    if (this.lex.match(T.OP, '=')) {
      if (left.type !== 'Identifier') throw new Error('Invalid LHS');
      const right = this.parseExpression();
      return { type: 'Assignment', lhs: left.value, rhs: right };
    }
    return left;
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.lex.match(T.OP, '||')) {
      left = { type: 'BinaryOp', op: '||', left, right: this.parseLogicalAnd() };
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseEquality();
    while (this.lex.match(T.OP, '&&')) {
      left = { type: 'BinaryOp', op: '&&', left, right: this.parseEquality() };
    }
    return left;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (this.lex.peek().value === '==' || this.lex.peek().value === '!=') {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseRelational() };
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    while (['<', '>', '<=', '>='].includes(this.lex.peek().value)) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseAdditive() };
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (['+', '-'].includes(this.lex.peek().value)) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while (['*', '/', '%'].includes(this.lex.peek().value)) {
      const op = this.lex.consume().value;
      left = { type: 'BinaryOp', op, left, right: this.parseUnary() };
    }
    return left;
  }

  parseUnary() {
    if (['-', '!'].includes(this.lex.peek().value)) {
      const op = this.lex.consume().value;
      return { type: 'UnaryOp', op, operand: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    if (this.lex.peek().value === '++' || this.lex.peek().value === '--') {
      const op = this.lex.consume().value;
      return { type: 'PostfixOp', op, operand: expr };
    }
    return expr;
  }

  parsePrimary() {
    const t = this.lex.peek();
    if (t.type === T.NUM) {
      this.lex.consume(); return { type: 'Number', value: t.value };
    }
    if (t.type === T.STR) {
      this.lex.consume(); return { type: 'String', value: t.value };
    }
    if (t.type === T.IDENT) {
      this.lex.consume();
      // Function call?
      if (this.lex.match(T.PUNCT, '(')) {
        const args = [];
        if (this.lex.peek().value !== ')') {
          args.push(this.parseExpression());
          while (this.lex.match(T.PUNCT, ',')) args.push(this.parseExpression());
        }
        this.lex.expect(T.PUNCT, ')');
        return { type: 'FunctionCall', name: t.value, args };
      }
      return { type: 'Identifier', value: t.value };
    }
    if (t.type === T.PUNCT && t.value === '(') {
      this.lex.consume();
      const inner = this.parseExpression();
      this.lex.expect(T.PUNCT, ')');
      return inner; // no need for Parentheses node in snippet mode, or we can keep it
    }
    throw new Error(`Unexpected token: ${t.value || t.type} at pos ${this.lex.cur}`);
  }
}

function parse(src) {
  const l = new Lexer(src);
  const p = new Parser(l);
  return p.parse();
}

module.exports = { parse };

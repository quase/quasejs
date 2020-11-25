import { parse as parseRegexp } from "regexp-tree";
import type {
  AstRegExp,
  Char,
  ClassRange,
  CharacterClass,
  Alternative,
  Group,
  Backreference,
  Repetition,
  Expression,
  Assertion,
} from "regexp-tree/ast";
import { Frag, Automaton } from "../automaton/automaton";
import { MIN_CHAR, MAX_CHAR } from "../constants";

declare module "regexp-tree/ast" {
  interface SimpleChar extends Base<"Char"> {
    value: string;
    kind: "simple";
    escaped?: true;
    codePoint: number;
  }
  interface SpecialChar extends Base<"Char"> {
    value: string;
    kind: "meta" | "control" | "hex" | "decimal" | "oct" | "unicode";
    codePoint: number;
  }
}

const WS = [" ", "\t", "\r", "\n", "\v", "\f"].map(c => c.charCodeAt(0));

export class FactoryRegexp {
  readonly automaton: Automaton;

  constructor(automaton: Automaton) {
    this.automaton = automaton;
  }

  c(code: number): Frag {
    const _in = this.automaton.newState();
    const _out = this.automaton.newState();
    _in.addNumber(code, _out);
    return { in: _in, out: _out };
  }

  Char(char: Char) {
    const { codePoint, value, kind } = char;
    if (value === "\\s") {
      const frags = WS.map(c => this.c(c));
      return this.automaton.choice(...frags);
    }
    if (codePoint == null || Number.isNaN(codePoint)) {
      throw new Error(
        `Char of kind ${kind} is not supported - ${JSON.stringify(char)}`
      );
    }
    return this.c(codePoint);
  }

  CharacterClass({ negative, expressions }: CharacterClass) {
    if (negative) {
      const list = (expressions || []).map(e =>
        e.type === "ClassRange"
          ? ([e.from.codePoint, e.to.codePoint] as const)
          : ([e.codePoint, e.codePoint] as const)
      );
      const _in = this.automaton.newState();
      const _out = this.automaton.newState();
      _in.addNotRangeSet(list, _out, MIN_CHAR, MAX_CHAR);
      return { in: _in, out: _out };
    }
    const fragments = (expressions || []).map(e => this.gen(e));
    return this.automaton.choice(...fragments);
  }

  ClassRange({ from, to }: ClassRange) {
    const _in = this.automaton.newState();
    const _out = this.automaton.newState();
    _in.addRange(from.codePoint, to.codePoint, _out);
    return { in: _in, out: _out };
  }

  Alternative({ expressions }: Alternative) {
    const fragments = (expressions || []).map(e => this.gen(e));
    return this.automaton.seq(...fragments);
  }

  Disjunction({ left, right }: { left: Expression; right: Expression }) {
    return this.automaton.choice(this.gen(left), this.gen(right));
  }

  Group({ expression, capturing, name }: Group & { name?: string }) {
    if (capturing && name) {
      throw new Error(`Named group capturing is not supported`);
    }
    return this.gen(expression);
  }

  Backreference(_: Backreference) {
    throw new Error(`Backreferences are not supported`);
  }

  Repetition({ quantifier, expression }: Repetition) {
    const { kind, greedy } = quantifier;
    if (!greedy) {
      throw new Error(`Non-greedy repetition is not supported`);
    }
    switch (quantifier.kind) {
      case "*":
        return this.automaton.repeat(this.gen(expression));
      case "+":
        return this.automaton.repeat1(this.gen(expression));
      case "?":
        return this.automaton.optional(this.gen(expression));
      case "Range":
        if (quantifier.from === 0 && quantifier.to == null) {
          return this.automaton.repeat(this.gen(expression));
        }
        if (quantifier.from === 1 && quantifier.to == null) {
          return this.automaton.repeat1(this.gen(expression));
        }
        if (quantifier.from === 0 && quantifier.to === 1) {
          return this.automaton.optional(this.gen(expression));
        }
        // TODO more?
        throw new Error(
          `Repetition range {${quantifier.from},${
            quantifier.to || ""
          }} is not supported yet`
        );
      default:
        throw new Error(`Repetition of kind ${kind} is not supported`);
    }
  }

  Assertion(_: Assertion) {
    throw new Error(`Assertions are not supported`);
  }

  RegExp(node: AstRegExp) {
    if (node.flags) {
      throw new Error("Flags are not supported yet");
    }
    return this.gen(node.body);
  }

  gen(node: any): Frag {
    if (!node) {
      throw new Error("node is undefined");
    }
    // @ts-ignore
    if (!this[node.type]) {
      throw new Error(`${node.type} is not supported`);
    }
    // @ts-ignore
    return this[node.type](node);
  }
}

export function regexpToAutomaton(factory: FactoryRegexp, rawRegExp: string) {
  return factory.gen(parseRegexp(rawRegExp));
}

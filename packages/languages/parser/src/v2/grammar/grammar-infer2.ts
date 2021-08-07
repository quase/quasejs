import { Grammar } from "./grammar";
import {
  RuleMap,
  Assignables,
  RuleDeclaration,
  CallRule,
  ChoiceRule,
  EmptyRule,
  EofRule,
  FieldRule,
  IdRule,
  OptionalRule,
  PredicateRule,
  RegExpRule,
  Repeat1Rule,
  RepeatRule,
  SelectRule,
  SeqRule,
  StringRule,
  AnyRule,
  Call2Rule,
  ObjectRule,
  IntRule,
} from "./grammar-builder";
import { GrammarFormatter } from "./grammar-formatter";
import {
  TypesRegistry,
  AnyType,
  isFreeType,
  isSubtype,
  AnyTypeMinusFree,
} from "./checker/types";

class Store {
  private readonly map: Map<string, AnyType> = new Map();
  private readonly registry: TypesRegistry;
  constructor(registry: TypesRegistry) {
    this.registry = registry;
  }

  set(name: string, type: AnyType) {
    this.registry.subtype(type, this.get(name));
  }

  get(name: string) {
    const curr = this.map.get(name);
    if (curr) return curr;
    const type = this.registry.free();
    this.map.set(name, type);
    return type;
  }

  propagateTo(other: Store) {
    for (const [name, type] of this.map) {
      other.set(name, type);
    }
  }

  propagateToExcept(other: Store, except: string) {
    for (const [name, type] of this.map) {
      if (name !== except) {
        other.set(name, type);
      }
    }
  }

  toString(normalized: ReadonlyMap<AnyType, AnyType> = new Map()) {
    return `Store {${Array.from(this.map).map(
      ([k, v]) => `${k}: ${normalized.get(v) ?? v}`
    )}}`;
  }

  takeTypes(set: Set<AnyType>) {
    for (const [_, type] of this.map) {
      set.add(type);
    }
  }
}

type RuleAnalyzer<T> = {
  [key in keyof RuleMap]: (pre: T, node: RuleMap[key], post: T) => void;
};

export class GrammarTypesInfer implements RuleAnalyzer<Store> {
  private readonly grammar: Grammar;
  private readonly registry = new TypesRegistry();
  private readonly stores = new Map<AnyRule, readonly [Store, Store]>();
  private readonly valueTypes = new Map<Assignables, AnyType>();

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  private store(rule: AnyRule) {
    let pair = this.stores.get(rule);
    if (pair == null) {
      pair = [new Store(this.registry), new Store(this.registry)];
      this.stores.set(rule, pair);
    }
    return pair;
  }

  private valueType(value: Assignables) {
    let type = this.valueTypes.get(value);
    if (type == null) {
      type = this.registry.free();
      this.valueTypes.set(value, type);
    }
    return type;
  }

  private visitSeq(pre: Store, rules: readonly AnyRule[], post: Store) {
    let lastPre = pre;
    for (let i = 0; i < rules.length; i++) {
      const [preRule, postRule] = this.store(rules[i]);
      lastPre.propagateTo(preRule);
      this.visit(rules[i]);
      lastPre = postRule;
    }
    lastPre.propagateTo(post);
  }

  seq(pre: Store, node: SeqRule, post: Store) {
    this.visitSeq(pre, node.rules, post);
  }

  choice(pre: Store, node: ChoiceRule, post: Store) {
    for (const n of node.rules) {
      const [preRule, postRule] = this.store(n);
      pre.propagateTo(preRule);
      this.visit(n);
      postRule.propagateTo(post);
    }
  }

  repeat(pre: Store, node: RepeatRule, post: Store) {
    // May run 0 times
    pre.propagateTo(post);
    // Inner rule...
    const [preRule, postRule] = this.store(node.rule);
    pre.propagateTo(preRule);
    this.visit(node.rule);
    postRule.propagateTo(post);
    // May run 1 or more times
    post.propagateTo(pre);
  }

  repeat1(pre: Store, node: Repeat1Rule, post: Store) {
    // Inner rule...
    const [preRule, postRule] = this.store(node.rule);
    pre.propagateTo(preRule);
    this.visit(node.rule);
    postRule.propagateTo(post);
    // Runs 1 or more times
    post.propagateTo(pre);
  }

  optional(pre: Store, node: OptionalRule, post: Store) {
    // May run 0 times
    pre.propagateTo(post);
    // Inner rule...
    // May run 1 time
    const [preRule, postRule] = this.store(node.rule);
    pre.propagateTo(preRule);
    this.visit(node.rule);
    postRule.propagateTo(post);
  }

  empty(pre: Store, node: EmptyRule, post: Store) {
    pre.propagateTo(post);
  }

  eof(pre: Store, node: EofRule, post: Store) {
    pre.propagateTo(post);
    this.registry.subtype(this.registry.t.null, this.valueType(node));
  }

  string(pre: Store, node: StringRule, post: Store) {
    pre.propagateTo(post);
    // TODO
  }

  regexp(pre: Store, node: RegExpRule, post: Store) {
    pre.propagateTo(post);
    // TODO
  }

  object(pre: Store, node: ObjectRule, post: Store) {
    pre.propagateTo(post);
    this.visitSeq(
      pre,
      node.fields.map(([_, v]) => v),
      post
    );
    this.registry.subtype(
      this.registry.readonlyObject(
        node.fields.map(([k, v]) => [k, this.valueType(v)])
      ),
      this.valueType(node)
    );
  }

  id(pre: Store, node: IdRule, post: Store) {
    pre.propagateTo(post);
    this.registry.subtype(pre.get(node.id), this.valueType(node));
  }

  int(pre: Store, node: IntRule, post: Store) {
    pre.propagateTo(post);
    this.registry.subtype(this.registry.t.int, this.valueType(node));
  }

  select(pre: Store, node: SelectRule, post: Store) {
    const [preExpr, postExpr] = this.store(node.parent);
    pre.propagateTo(preExpr);
    this.visit(node.parent);
    //
    postExpr.propagateTo(post);
    this.registry.subtype(
      this.valueType(node.parent),
      this.registry.readonlyObject([[node.field, this.valueType(node)]])
    );
  }

  call2(pre: Store, node: Call2Rule, post: Store) {
    // TODO
    pre.propagateTo(post);
  }

  call(pre: Store, node: CallRule, post: Store) {
    // TODO
    pre.propagateTo(post);
  }

  field(pre: Store, node: FieldRule, post: Store) {
    const [preExpr, postExpr] = this.store(node.rule);
    pre.propagateTo(preExpr);
    this.visit(node.rule);
    //
    if (node.multiple) {
      this.registry.subtype(
        postExpr.get(node.name),
        this.registry.array(this.valueType(node.rule))
      );
      postExpr.propagateTo(post);
    } else {
      postExpr.propagateToExcept(post, node.name);
      post.set(node.name, this.valueType(node.rule));
    }
  }

  predicate(pre: Store, node: PredicateRule, post: Store) {
    // TODO
  }

  run(rule: RuleDeclaration) {
    const [preRule, postRule] = this.store(rule.rule);

    for (const arg of rule.args) {
      preRule.set(arg, this.registry.free());
    }
    for (const local of rule.locals) {
      preRule.set(local, this.registry.t.null);
    }

    this.visit(rule.rule);

    const [preReturn, _] = this.store(rule.return);

    postRule.propagateTo(preReturn);

    this.visit(rule.return);
  }

  visit(node: AnyRule) {
    const [pre, post] = this.store(node);
    this[node.type](pre, node as any, post);
  }

  debug() {
    // const { subtypes, supertypes } = this.simplify();

    console.log("---- SINGLETON TYPES ----");
    for (const [name, type] of Object.entries(this.registry.t)) {
      console.log(name, type.toString());
    }

    /*console.log("---- STORES ----");
    for (const [rule, [pre, post]] of this.stores) {
      console.log(new GrammarFormatter().visit(rule));
      console.log("PRE:", pre.toString(normalized));
      console.log("POST:", post.toString(normalized));
    }*/

    /*console.log("---- VALUES ----");
    for (const [value, type] of this.valueTypes) {
      console.log(
        new GrammarFormatter().visit(value),
        // type.toString(),
        normalized.get(type)?.toString()
      );
    }*/

    console.log("---- NORMALIZED ----");
    /*for (const [type, supers] of supertypes) {
      const subs = subtypes.get(type)!!;
      if (supers.size > 0 || subs.size > 0) {
        const subsArr = Array.from(subs);
        const supersArr = Array.from(supers);
        if (supersArr.length === 0) supersArr.push(this.registry.t.top);
        console.log(type.simpleFormat());
        console.log("subs", subsArr.map(t => t.simpleFormat()).join(" | "));
        console.log("supers", supersArr.map(t => t.simpleFormat()).join(" & "));
        console.log(
          subsArr.every(sub =>
            supersArr.some(superr =>
              isSubtype(sub, superr, subtypes, this.registry)
            )
          )
        );
        // FIXME: why is this giving false for ReadonlyObjectType {id: FreeType {}} and ReadonlyObjectType {id: FreeType {}}?
        console.log(
          subsArr.every(sub =>
            supersArr.every(superr =>
              isSubtype(sub, superr, subtypes, this.registry)
            )
          )
        );
      }
    }*/
    for (const type of this.registry) {
      const subsArr = Array.from(this.registry.getSubs(type));
      const supersArr = Array.from(this.registry.getSupers(type));
      const normalizedArr = Array.from(this.registry.getNormalized(type));
      console.log(type.simpleFormat());
      console.log(normalizedArr.map(t => t.simpleFormat()).join(" | "));
      /*console.log(
        "subs",
        subsArr
          .filter(t => !isFreeType(t))
          .map(t => t.simpleFormat())
          .join(" | ")
      );*/
      console.log(
        "supers",
        supersArr
          .filter(t => !isFreeType(t))
          .map(t => t.simpleFormat())
          .join(" & ")
      );
      console.log(
        normalizedArr.every(sub =>
          supersArr.every(superr => isSubtype(sub, superr, this.registry))
        )
      );
    }

    console.log("--------");
  }

  // TODO report errors
  simplify() {
    const supertypes = new Map<AnyType, ReadonlySet<AnyTypeMinusFree>>();
    const subtypes = new Map<AnyType, ReadonlySet<AnyTypeMinusFree>>();
    const inJob = new Set<AnyType>();

    const getSuperTypes = (
      t: AnyType
    ): ReadonlySet<AnyTypeMinusFree> | null => {
      const cache = supertypes.get(t);
      if (cache) return cache;
      if (inJob.has(t)) return null;
      inJob.add(t);

      const result = new Set<AnyTypeMinusFree>();
      for (const type of this.registry.getSupers(t)) {
        if (isFreeType(type)) {
          const supersuper = getSuperTypes(type);
          if (supersuper) {
            for (const type2 of supersuper) result.add(type2);
          }
        } else {
          result.add(type);
        }
      }
      result.delete(this.registry.t.top);

      inJob.delete(t);
      supertypes.set(t, result);
      return result;
    };

    const getSubTypes = (t: AnyType): ReadonlySet<AnyTypeMinusFree> | null => {
      const cache = subtypes.get(t);
      if (cache) return cache;
      if (inJob.has(t)) return null;
      inJob.add(t);

      const result = new Set<AnyTypeMinusFree>();
      for (const type of this.registry.getSubs(t)) {
        if (isFreeType(type)) {
          const subsub = getSubTypes(type);
          if (subsub) {
            for (const type2 of subsub) result.add(type2);
          }
        } else {
          result.add(type);
        }
      }
      result.delete(this.registry.t.bottom);

      inJob.delete(t);
      subtypes.set(t, result);
      return result;
    };

    for (const t of this.registry) {
      getSuperTypes(t);
    }

    for (const t of this.registry) {
      getSubTypes(t);
    }

    return { supertypes, subtypes };
  }
}

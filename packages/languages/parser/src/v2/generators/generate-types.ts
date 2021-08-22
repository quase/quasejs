import { Grammar } from "../grammar/grammar";
import { TypesInferrer } from "../grammar/type-checker/inferrer";
import { AnyNormalizedType } from "../grammar/type-checker/normalizer";
import { never, nonNull } from "../utils";

function toTypescript(type: AnyNormalizedType, names: Names): string {
  switch (type.clazz) {
    case "TopType":
      return "unknown";
    case "StringType":
      return "string";
    case "IntType":
      return "number";
    case "NullType":
      return "null";
    case "BooleanType":
      return "boolean";
    case "BottomType":
      return "never";
    case "ReadonlyObjectType":
      if (type.fields.length === 0) {
        return "Readonly<Record<string, never>>";
      }
      return `Readonly<{ ${type.fields
        .map(([k, v]) => `${k}: ${toTypescript(v, names)}`)
        .join(", ")} }>`;
    case "ReadonlyArrayType":
      return `readonly ${toTypescript(type.component, names)}[]`;
    case "ArrayType":
      return `${toTypescript(type.component, names)}[]`;
    case "UnionType":
      return `(${Array.from(type.types)
        .map(t => toTypescript(t, names))
        .join(" | ")})`;
    case "IntersectionType":
      return `(${Array.from(type.types)
        .map(t => toTypescript(t, names))
        .join(" & ")})`;
    case "RecursiveRef":
      return names.get(type.get());
    case "GenericType":
      const lower = toTypescript(type.lower, names);
      const upper = toTypescript(type.upper, names);
      return `T${type.id} /* [${lower}; ${upper}] */`;
    default:
      never(type);
  }
}

class Names {
  private names = new Map<AnyNormalizedType, string>();
  private uuid = 1;

  get(type: AnyNormalizedType) {
    let name = this.names.get(type);
    if (name == null) {
      name = `$rec${this.uuid++}`;
      this.names.set(type, name);
    }
    return name;
  }

  set(type: AnyNormalizedType, proposal: string) {
    let name = this.names.get(type);
    if (name == null) {
      name = proposal;
      this.names.set(type, proposal);
    }
    return name;
  }

  [Symbol.iterator]() {
    return this.names.entries();
  }
}

// TODO need minimization on intersections
// TODO better choose generic types, we cannot just choose the lower bound...
// TODO create function types and drop all together the lower/upper normalizations

export function generateTypes(grammar: Grammar, inferrer: TypesInferrer) {
  inferrer.registry.propagatePolarities();

  const lines = [
    `/* eslint-disable */`,
    `export type $Position = {pos:number;line:number;column:number;};`,
    `export type $Location = {start:$Position;end:$Position;};`,
  ];

  const normalizer = inferrer.normalizer;
  const names = new Names();
  const astNodes = [];

  for (const [rule, { argTypes, returnType }] of inferrer.getRuleInterfaces()) {
    const normalizedArgs = Array.from(argTypes).map(
      ([name, type]) => [name, normalizer.normalize(type)] as const
    );
    const normalizedReturn = normalizer.normalize(returnType);

    normalizedArgs.forEach(([name, type]) =>
      names.set(type, `${rule.name}_${name}`)
    );
    names.set(normalizedReturn, rule.name);
    astNodes.push(rule.name);
  }

  lines.push(`export type $Nodes = ${astNodes.join("|")};`);

  lines.push(`export type $ExternalCalls = {`);
  for (const [
    callName,
    { argTypes, returnType },
  ] of inferrer.getExternalCallInterfaces()) {
    // Even though for arguments we prefer more generic types,
    // and for returns we prefer specific types,
    // here we are defining the functional interface,
    // so for the arguments we choose the lower bound,
    // and for the return type we choose the upper bound.
    // This allows implementations of this functional interface
    // to choose a more generic type (above the lower bound)
    // and a more specific type (below the upper bound)

    const normalizedArgs = argTypes.map(type => normalizer.lower(type));
    const normalizedReturn = normalizer.upper(returnType);

    lines.push(
      `  ${callName}: (${normalizedArgs.map(
        (type, i) => `a${i}: ${toTypescript(type, names)}`
      )}) => ${toTypescript(normalizedReturn, names)};`
    );
  }
  lines.push(`};`);

  // TODO token rules

  for (const [type, name] of names) {
    lines.push(`export type ${name} = ${toTypescript(type, names)};`);
  }

  lines.push(``);
  return lines.join(`\n`);
}

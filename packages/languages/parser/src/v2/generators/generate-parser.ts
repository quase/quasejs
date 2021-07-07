import { never } from "../utils";
import { CodeBlock } from "./dfa-to-code/cfg-to-code";

export class CodeToString {
  static render(indent: string, block: CodeBlock): string {
    switch (block.type) {
      case "expect_block":
        return `${indent}expect(${block.edge.transition});`;
      case "seq_block":
        return block.blocks.map(b => this.render(indent, b)).join("\n");
      case "decision_block": {
        const hasDefault = block.choices.some(([t]) => t == null);
        return [
          `${indent}switch(current()){`,
          ...block.choices.map(([t, d]) =>
            t == null
              ? `${indent}  default:\n${this.render(`${indent}    `, d)}`
              : `${indent}  case ${t.transition}:\n${this.render(
                  `${indent}    `,
                  d
                )}`
          ),
          hasDefault
            ? `${indent}}`
            : `${indent}  default:\n${indent}    unexpected();\n${indent}}`,
        ].join("\n");
      }
      case "scope_block":
        return [
          `${indent}${block.label}:do{`,
          this.render(indent + "  ", block.block),
          `${indent}}while(0);`,
        ].join("\n");
      case "loop_block":
        return [
          `${indent}${block.label}:while(1){`,
          this.render(indent + "  ", block.block),
          `${indent}}`,
        ].join("\n");
      case "continue_block":
        return `${indent}continue ${block.label};`;
      case "break_case_block":
        return `${indent}break;`;
      case "break_scope_block":
        return `${indent}break ${block.label};`;
      case "return_block":
        return `${indent}return;`;
      case "empty_block":
        return "";
      default:
        never(block);
    }
  }
}

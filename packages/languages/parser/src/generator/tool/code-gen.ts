import {
  Transition, RuleTransition, PredicateTransition,
  ActionTransition, PrecedenceTransition, RangeTransition, TokenFinalTransition, EOFTransition, NamedTransition
} from "./transitions";
import { DState } from "./state";
import { DFA } from "./abstract-optimizer";
import { Analyser, GoTo } from "./analysis";
import Grammar, { LexerTokens } from "./grammar";
import { ParserRule, LexerRule } from "./grammar-parser";

export class CodeGenerator {

  grammar: Grammar;
  analyser: Analyser;
  inLexer: boolean;

  constructor( grammar: Grammar, analyser: Analyser ) {
    this.grammar = grammar;
    this.analyser = analyser;
    this.inLexer = false;
  }

  lexerTokenToString( node: LexerTokens ) {
    return node.type === "LexerRule" ? node.name : node.raw;
  }

  numToComment( num: number ) {
    let comment;
    if ( this.inLexer ) {
      comment = `/*'${String.fromCodePoint( num )}'*/`;
    } else {
      comment = `/*${this.lexerTokenToString( this.grammar.idToNode.get( num ) as LexerTokens )}*/`;
    }
    return comment;
  }

  genTransition( transition: Transition ): string {
    if ( transition instanceof RuleTransition ) {
      return `this.rule${transition.rule.name}();`;
    }
    if ( transition instanceof PredicateTransition ) {
      return ""; // TODO
    }
    if ( transition instanceof ActionTransition ) {
      return transition.code + ";";
    }
    if ( transition instanceof PrecedenceTransition ) {
      return ""; // TODO
    }
    if ( transition instanceof RangeTransition ) {
      if ( transition.from === transition.to ) {
        return `this.consume1(${transition.from}${this.numToComment( transition.from )});`;
      }
      return `this.consume2(${transition.from}${this.numToComment( transition.from )},` +
        `${transition.to}${this.numToComment( transition.to )});`;
    }
    if ( transition instanceof TokenFinalTransition ) {
      return `id=${transition.id};`;
    }
    if ( transition instanceof NamedTransition ) {
      if ( transition.multiple ) {
        return `$${transition.name}.push(${this.genTransition( transition.subTransition ).slice( 0, -1 )});`;
      }
      return `$${transition.name}=${this.genTransition( transition.subTransition )}`;
    }
    throw new Error( "Assertion error" );
  }

  genMoveToState( state: DState ): string {
    /* if ( state.transitionAmount() === 0 ) {
      return "$$loop=false;\n";
    }
    if ( state.inTransitions < 2 && state.transitionAmount() === 1 ) {
      let code = "";
      let i = 0;

      for ( const [ transition, dest ] of state ) {
        if ( i > 0 ) {
          throw new Error( "Assertion error" );
        }
        code += this.genTransition( transition );
        code += this.genMoveToState( dest );
        i++;
      }
      return code;
    } */
    return `$$state=${state.id};\n`;
  }

  genGoto( goto: GoTo ) {
    if ( goto ) {
      const [ transition, dest ] = goto;
      return this.genTransition( transition ) + this.genMoveToState( dest );
    }
    return `$$loop=false;\n`;
  }

  genStateManyTransitions( state: DState, rule: ParserRule | LexerRule | null ) {
    const data = this.analyser.analyse( state, null );
    let code = ``;
    let eofData = null;

    for ( const [ look, set ] of data ) {
      const array = this.analyser.testConflict( rule, state, look, set );
      if ( look instanceof EOFTransition ) {
        eofData = array;
        continue;
      }
      for ( const goto of array ) {
        if ( look instanceof RangeTransition ) {
          if ( look.from === look.to ) {
            code += `if(this.current===${look.from}${this.numToComment( look.from )}){\n`;
          } else {
            code += `if(${this.numToComment( look.from )}${look.from}<=this.current&&` +
              `this.current<=${look.to}${this.numToComment( look.to )}){\n`;
          }
          code += this.genGoto( goto );
          code += `}else `;
        } else {
          // TODO
        }
        break;
      }
    }

    if ( eofData ) {
      if ( this.inLexer ) {
        for ( const goto of eofData ) {
          code += `{\n`;
          code += this.genGoto( goto );
          code += `}\n`;
          break;
        }
      } else {
        for ( const goto of eofData ) {
          code += `if(this.current===0){\n`;
          code += this.genGoto( goto );
          code += `}else `;
          break;
        }
        code += `{ throw this.unexpected(); }\n`;
      }
    } else {
      if ( this.inLexer ) {
        code += `{ $$loop=false; }\n`;
      } else {
        code += `{ throw this.unexpected(); }\n`;
      }
    }

    return code;
  }

  genAutomaton( { states }: DFA<DState>, rule: ParserRule | LexerRule | null ): string {

    let code = `let $$state=0,$$loop=true;${this.genMoveToState( states[ 1 ] )}while($$loop){switch($$state){\n`;

    for ( const state of states ) {
      if ( state.id < 1 ) {
        continue;
      }
      code += `case ${state.id}:\n`;
      code += this.genStateManyTransitions( state, rule );
      code += `break;\n`;
    }

    code += `default:throw new Error("No state " + $$state);`;
    code += `}}`;
    return code;
  }

  genTokenizer( lexerRuleToAutomaton: Map<LexerRule, DFA<DState>>, lexerAutomaton: DFA<DState> ): string {

    const tokArgType = this.grammar.options.typescript ? `:string` : "";
    const propTypes = this.grammar.options.typescript ? `labels:string[];` : "";
    const tokenTypes = [ "$EOF" ];

    const labels = [ "" ];
    for ( const [ node, id ] of this.grammar.nodeToId ) {
      if ( labels[ id ] ) {
        continue;
      }

      labels[ id ] = this.lexerTokenToString( node );

      if ( this.grammar.options.typescript ) {
        tokenTypes.push( this.grammar.typecheckDefinition( node ) );
      }
    }

    if ( this.grammar.options.typescript ) {
      this.grammar.types.push( `export type $EOF = {id:0;label:"EOF";image:string };` );
      this.grammar.types.push( `export type $Tokens = ${tokenTypes.join( "|" )};` );
    }

    for ( const [ transition ] of lexerAutomaton.states[ 1 ] ) {
      if ( transition instanceof TokenFinalTransition ) {
        throw new Error( `Token ${labels[ transition.id ]} is accepting the empty word` );
      }
    }

    const funcs = [];
    for ( const [ rule, automaton ] of lexerRuleToAutomaton ) {
      funcs.push( `rule${rule.name}(){
        ${this.genAutomaton( automaton, rule )}
      }` );
    }

    return `
    class Tokenizer extends Q.Tokenizer{
      ${propTypes}
      constructor(input${tokArgType}){
        super(input);
        this.labels=${JSON.stringify( labels )};
      }
      readToken() {
        const prevPos = this.pos;
        let id = -1;

        ${this.genAutomaton( lexerAutomaton, null )}

        if (id===-1) {
          throw this.unexpected();
        }

        const image=this.input.slice(prevPos,this.pos);
        const splitted=image.split(${/\r\n?|\n/g.toString()});
        const newLines=splitted.length-1;
        if (newLines>0) {
          this._lineStart=this.pos-splitted[newLines].length;
          this._curLine+=newLines;
        }
        return {
          id,
          label: this.labels[id],
          image
        };
      }
      ${funcs.join( "\n" )}
    }`;
  }

  genParser( parserRuleToAutomaton: Map<ParserRule, DFA<DState>> ): string {
    const funcs = [];
    const parserArgType = this.grammar.options.typescript ? `:string` : "";
    const expectArgType = this.grammar.options.typescript ? `:number|string` : "";

    funcs.push( `
    constructor(text${parserArgType}){super(new Tokenizer(text));}
    unexpected(id${expectArgType}) {
      const labels = this.tokenizer.labels;
      super.unexpected(labels[id]||id);
    }
    ` );

    if ( this.grammar.options.typescript ) {
      this.grammar.types.push( `export type $Position = {pos:number;line:number;column:number;};` );
      this.grammar.types.push( `export type $Location = {start:$Position;end:$Position;};` );
      this.grammar.types.push( `export interface $Base<T> {type:T;loc:$Location;}` );
    }

    for ( const [ rule, automaton ] of parserRuleToAutomaton ) {
      const returnType = this.grammar.options.typescript ? `:${this.grammar.typecheckDefinition( rule )}` : "";

      const names = [];
      const keys = [ `type:${JSON.stringify( rule.name )}` ];

      for ( const k of rule.names.names.keys() ) {
        keys.push( `${k}:$${k}` );
        names.push( rule.names.arrays.has( k ) ? `$${k}=[]` : rule.names.optionals.has( k ) ? `$${k}=null` : `$${k}` );
      }

      keys.push( `loc:this.locNode($$loc)` );

      const declarations = names.length ? `let ${names.join( "," )};` : "";

      funcs.push( `rule${rule.name}()${returnType}{
        let $$loc=this.startNode();${declarations}
        ${this.genAutomaton( automaton, rule )}
        return {${keys.join( "," )}};
      }` );
    }

    return `class Parser extends Q.Parser{\n${funcs.join( "\n" )}\nparse(){
      const r=this.rule${this.grammar.firstRule.name}();this.consume1(0);return r;
    }}`;
  }

  gen(
    parserRuleToAutomaton: Map<ParserRule, DFA<DState>>,
    lexerRuleToAutomaton: Map<LexerRule, DFA<DState>>,
    lexerAutomaton: DFA<DState>
  ) {
    this.inLexer = true;
    const tokenizer = this.genTokenizer( lexerRuleToAutomaton, lexerAutomaton );
    this.inLexer = false;
    const parser = this.genParser( parserRuleToAutomaton );
    const types = this.grammar.types.join( "\n" );
    const imports = this.grammar.options.typescript ? `import Q from "@quase/parser";` : `const Q=require("@quase/parser");`;
    const exporting = this.grammar.options.typescript ? `export default Parser;` : `module.exports=Parser;`;
    return `/* eslint-disable */\n${imports}\n${types}\n${tokenizer}\n${parser}\n${exporting}\n`;
  }

}

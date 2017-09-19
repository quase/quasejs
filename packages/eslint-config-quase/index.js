module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 8,
    sourceType: "module",
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  },
  env: {
    es6: true,
    "jest/globals": true
  },
  plugins: [ "flowtype", "import", "node", "jest" ],
  extends: [ "plugin:flowtype/recommended", "plugin:node/recommended", "plugin:import/recommended" ],
  rules: {
    "import/unambiguous": 0,

    "accessor-pairs": 2,
    "array-bracket-spacing": [
      2,
      "always"
    ],
    "array-callback-return": 0,
    "arrow-body-style": 0,
    "arrow-parens": [
      2,
      "as-needed"
    ],
    "arrow-spacing": [
      "error",
      {
        before: true,
        after: true
      }
    ],
    "block-scoped-var": "error",
    "block-spacing": [
      "error",
      "always"
    ],
    "brace-style": [
      "error",
      "1tbs",
      {
        allowSingleLine: true
      }
    ],
    "callback-return": "off",
    camelcase: [
      "error",
      {
        properties: "never"
      }
    ],
    "capitalized-comments": [
      "off",
      "never",
      {
        line: {
          ignorePattern: ".*",
          ignoreInlineComments: true,
          ignoreConsecutiveComments: true
        },
        block: {
          ignorePattern: ".*",
          ignoreInlineComments: true,
          ignoreConsecutiveComments: true
        }
      }
    ],
    "class-methods-use-this": 0,
    "comma-dangle": 0,
    "comma-spacing": [
      "error",
      {
        before: false,
        after: true
      }
    ],
    "comma-style": [
      "error",
      "last"
    ],
    complexity: [
      "off",
      11
    ],
    "computed-property-spacing": [
      2,
      "always"
    ],
    "consistent-return": 0,
    "consistent-this": "off",
    "constructor-super": "error",
    curly: [
      "error",
      "multi-line"
    ],
    "default-case": [
      "error",
      {
        commentPattern: "^no default$"
      }
    ],
    "dot-location": [
      "error",
      "property"
    ],
    "dot-notation": [
      "error",
      {
        allowKeywords: true
      }
    ],
    "eol-last": [
      "error",
      "always"
    ],
    eqeqeq: [
      "error",
      "always",
      {
        null: "ignore"
      }
    ],
    "func-call-spacing": [
      "error",
      "never"
    ],
    "func-name-matching": [
      "off",
      "always",
      {
        includeCommonJSModuleExports: false
      }
    ],
    "func-names": 0,
    "func-style": [
      "off",
      "expression"
    ],
    "generator-star-spacing": [
      "error",
      {
        before: false,
        after: true
      }
    ],
    "global-require": 0,
    "guard-for-in": 0,
    "handle-callback-err": 1,
    "id-blacklist": "off",
    "id-length": "off",
    "id-match": "off",
    indent: [
      2,
      2,
      {
        SwitchCase: 1,
        VariableDeclarator: 2
      }
    ],
    "init-declarations": "off",
    "jsx-quotes": [
      "off",
      "prefer-double"
    ],
    "key-spacing": [
      "error",
      {
        beforeColon: false,
        afterColon: true
      }
    ],
    "keyword-spacing": [
      "error",
      {
        before: true,
        after: true,
        overrides: {
          return: {
            after: true
          },
          throw: {
            after: true
          },
          case: {
            after: true
          }
        }
      }
    ],
    "line-comment-position": [
      "off",
      {
        position: "above",
        ignorePattern: "",
        applyDefaultPatterns: true
      }
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "lines-around-comment": "off",
    "lines-around-directive": [
      "error",
      {
        before: "always",
        after: "always"
      }
    ],
    "max-depth": [
      "off",
      4
    ],
    "max-len": 0,
    "max-lines": [
      "off",
      {
        max: 300,
        skipBlankLines: true,
        skipComments: true
      }
    ],
    "max-nested-callbacks": "off",
    "max-params": [
      "off",
      3
    ],
    "max-statements": [
      "off",
      10
    ],
    "max-statements-per-line": [
      "off",
      {
        max: 1
      }
    ],
    "multiline-ternary": [
      "off",
      "never"
    ],
    "new-cap": [
      "error",
      {
        newIsCap: true,
        newIsCapExceptions: [],
        capIsNew: false,
        capIsNewExceptions: [
          "Immutable.Map",
          "Immutable.Set",
          "Immutable.List"
        ]
      }
    ],
    "new-parens": "error",
    "newline-after-var": "off",
    "newline-before-return": "off",
    "newline-per-chained-call": 0,
    "no-alert": "warn",
    "no-array-constructor": "error",
    "no-await-in-loop": "error",
    "no-bitwise": 0,
    "no-caller": "error",
    "no-case-declarations": "error",
    "no-catch-shadow": "off",
    "no-class-assign": "error",
    "no-cond-assign": 0,
    "no-confusing-arrow": [
      "error",
      {
        allowParens: true
      }
    ],
    "no-console": "warn",
    "no-const-assign": "error",
    "no-constant-condition": [
      "error",
      {
        checkLoops: false
      }
    ],
    "no-continue": 0,
    "no-control-regex": "error",
    "no-debugger": "error",
    "no-delete-var": "error",
    "no-div-regex": "off",
    "no-dupe-args": "error",
    "no-dupe-class-members": "error",
    "no-dupe-keys": "error",
    "no-duplicate-case": "error",
    "no-duplicate-imports": "off",
    "no-else-return": "error",
    "no-empty": "error",
    "no-empty-character-class": "error",
    "no-empty-function": [
      "error",
      {
        allow: [
          "arrowFunctions",
          "functions",
          "methods"
        ]
      }
    ],
    "no-empty-pattern": "error",
    "no-eq-null": "off",
    "no-eval": "error",
    "no-ex-assign": "error",
    "no-extend-native": "error",
    "no-extra-bind": "error",
    "no-extra-boolean-cast": "error",
    "no-extra-label": "error",
    "no-extra-parens": [
      "off",
      "all",
      {
        conditionalAssign: true,
        nestedBinaryExpressions: false,
        returnAssign: false
      }
    ],
    "no-extra-semi": "error",
    "no-fallthrough": "error",
    "no-floating-decimal": "error",
    "no-func-assign": "error",
    "no-global-assign": [
      "error",
      {
        exceptions: []
      }
    ],
    "no-implicit-coercion": [
      "off",
      {
        boolean: false,
        number: true,
        string: true,
        allow: []
      }
    ],
    "no-implicit-globals": "off",
    "no-implied-eval": "error",
    "no-inline-comments": "off",
    "no-inner-declarations": "error",
    "no-invalid-regexp": "error",
    "no-invalid-this": "off",
    "no-irregular-whitespace": "error",
    "no-iterator": "error",
    "no-label-var": "error",
    "no-labels": [
      "error",
      {
        allowLoop: false,
        allowSwitch: false
      }
    ],
    "no-lone-blocks": "error",
    "no-lonely-if": 0,
    "no-loop-func": "error",
    "no-magic-numbers": [
      "off",
      {
        ignore: [],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false
      }
    ],
    "no-mixed-operators": [
      "error",
      {
        groups: [
          [ "==", "!=", "===", "!==", ">", ">=", "<", "<=" ],
          [ "&&", "||" ],
          [ "in", "instanceof" ]
        ],
        allowSamePrecedence: true
      }
    ],
    "no-mixed-requires": [
      "off",
      false
    ],
    "no-mixed-spaces-and-tabs": "error",
    "no-multi-assign": 0,
    "no-multi-spaces": "error",
    "no-multi-str": "error",
    "no-multiple-empty-lines": [
      "error",
      {
        max: 2,
        maxEOF: 1
      }
    ],
    "no-native-reassign": "off",
    "no-negated-condition": "off",
    "no-negated-in-lhs": "off",
    "no-nested-ternary": 0,
    "no-new": "error",
    "no-new-func": "error",
    "no-new-object": "error",
    "no-new-require": "error",
    "no-new-symbol": "error",
    "no-new-wrappers": "error",
    "no-obj-calls": "error",
    "no-octal": "error",
    "no-octal-escape": "error",
    "no-param-reassign": 0,
    "no-path-concat": "error",
    "no-plusplus": 0,
    "no-process-env": "off",
    "no-process-exit": "off",
    "no-proto": "error",
    "no-prototype-builtins": "error",
    "no-redeclare": "error",
    "no-regex-spaces": "error",
    "no-restricted-globals": "off",
    "no-restricted-imports": "off",
    "no-restricted-modules": "off",
    "no-restricted-properties": [
      "error",
      {
        object: "arguments",
        property: "callee",
        message: "arguments.callee is deprecated"
      },
      {
        property: "__defineGetter__",
        message: "Please use Object.defineProperty instead."
      },
      {
        property: "__defineSetter__",
        message: "Please use Object.defineProperty instead."
      },
      {
        object: "Math",
        property: "pow",
        message: "Use the exponentiation operator (**) instead."
      }
    ],
    "no-restricted-syntax": [
      2,
      "WithStatement"
    ],
    "no-return-assign": "error",
    "no-return-await": "error",
    "no-script-url": "error",
    "no-self-assign": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-shadow": 0,
    "no-shadow-restricted-names": "error",
    "no-spaced-func": "error",
    "no-sparse-arrays": "error",
    "no-sync": "off",
    "no-tabs": "error",
    "no-template-curly-in-string": "error",
    "no-ternary": "off",
    "no-this-before-super": "error",
    "no-throw-literal": "error",
    "no-trailing-spaces": "error",
    "no-undef": [
      2,
      {
        typeof: false
      }
    ],
    "no-undef-init": "error",
    "no-undefined": "off",
    "no-underscore-dangle": 0,
    "no-unexpected-multiline": "error",
    "no-unmodified-loop-condition": "off",
    "no-unneeded-ternary": [
      "error",
      {
        defaultAssignment: false
      }
    ],
    "no-unreachable": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-negation": "error",
    "no-unused-expressions": [
      "error",
      {
        allowShortCircuit: false,
        allowTernary: false
      }
    ],
    "no-unused-labels": "error",
    "no-unused-vars": [
      "error",
      {
        vars: "local",
        args: "after-used",
        ignoreRestSiblings: true
      }
    ],
    "no-use-before-define": [
      2,
      "nofunc"
    ],
    "no-useless-call": 2,
    "no-useless-computed-key": "error",
    "no-useless-concat": "error",
    "no-useless-constructor": "error",
    "no-useless-escape": "error",
    "no-useless-rename": [
      "error",
      {
        ignoreDestructuring: false,
        ignoreImport: false,
        ignoreExport: false
      }
    ],
    "no-useless-return": "error",
    "no-var": "error",
    "no-void": "error",
    "no-warning-comments": 1,
    "no-whitespace-before-property": "error",
    "no-with": "error",
    "node/no-unpublished-require": 0,
    "node/no-unsupported-features": 0,
    "object-curly-newline": [
      "off",
      {
        ObjectExpression: {
          minProperties: 0,
          multiline: true
        },
        ObjectPattern: {
          minProperties: 0,
          multiline: true
        }
      }
    ],
    "object-curly-spacing": [
      "error",
      "always"
    ],
    "object-property-newline": [
      "error",
      {
        allowMultiplePropertiesPerLine: true
      }
    ],
    "object-shorthand": 0,
    "one-var": 0,
    "one-var-declaration-per-line": 0,
    "operator-assignment": [
      "error",
      "always"
    ],
    "operator-linebreak": "off",
    "padded-blocks": 0,
    "prefer-arrow-callback": 0,
    "prefer-const": 0,
    "prefer-destructuring": [
      "off",
      {
        array: true,
        object: true
      },
      {
        enforceForRenamedProperties: false
      }
    ],
    "prefer-numeric-literals": "error",
    "prefer-promise-reject-errors": [
      "off",
      {
        allowEmptyReject: true
      }
    ],
    "prefer-reflect": "off",
    "prefer-rest-params": 0,
    "prefer-spread": 0,
    "prefer-template": 0,
    "quote-props": [
      "error",
      "as-needed",
      {
        keywords: false,
        unnecessary: true,
        numbers: false
      }
    ],
    quotes: [
      2,
      "double",
      "avoid-escape"
    ],
    radix: "error",
    "require-await": "off",
    "require-jsdoc": "off",
    "require-yield": "error",
    "rest-spread-spacing": [
      "error",
      "never"
    ],
    semi: [
      "error",
      "always"
    ],
    "semi-spacing": [
      "error",
      {
        before: false,
        after: true
      }
    ],
    "sort-imports": [
      "off",
      {
        ignoreCase: false,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: [
          "none",
          "all",
          "multiple",
          "single"
        ]
      }
    ],
    "sort-keys": [
      "off",
      "asc",
      {
        caseSensitive: false,
        natural: true
      }
    ],
    "sort-vars": "off",
    "space-before-blocks": "error",
    "space-before-function-paren": [
      2,
      "never"
    ],
    "space-in-parens": [
      2,
      "always"
    ],
    "space-infix-ops": "error",
    "space-unary-ops": [
      "error",
      {
        words: true,
        nonwords: false,
        overrides: {}
      }
    ],
    "spaced-comment": [
      2,
      "always",
      {
        markers: [
          "!"
        ]
      }
    ],
    strict: "error",
    "symbol-description": 0,
    "template-curly-spacing": "error",
    "template-tag-spacing": [
      "off",
      "never"
    ],
    "unicode-bom": [
      "error",
      "never"
    ],
    "use-isnan": "error",
    "valid-jsdoc": "off",
    "valid-typeof": [
      "error",
      {
        requireStringLiterals: true
      }
    ],
    "vars-on-top": "error",
    "wrap-iife": [
      2,
      "inside"
    ],
    "wrap-regex": "off",
    "yield-star-spacing": [
      "error",
      "after"
    ],
    yoda: [
      2,
      "never",
      {
        exceptRange: true
      }
    ]
  }
};

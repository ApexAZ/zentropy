# ESLint Rules and TypeScript Standards

This document outlines the ESLint configuration, rules, and TypeScript standards enforced throughout the Capacity Planner project to ensure code quality, security, and maintainability.

## Table of Contents
1. [Overview](#overview)
2. [Core ESLint Configuration](#core-eslint-configuration)
3. [Complete ESLint Rules Reference](#complete-eslint-rules-reference)
4. [Critical Security Rules](#critical-security-rules)
5. [TypeScript Strict Rules](#typescript-strict-rules)
6. [Code Quality Standards](#code-quality-standards)
7. [Common Patterns and Solutions](#common-patterns-and-solutions)
8. [ESLint Integration with Development Workflow](#eslint-integration-with-development-workflow)

---

## Overview

### Philosophy
**Zero-tolerance approach to ESLint violations** - All code must pass ESLint checks before being considered complete. ESLint is integrated as part of the TDD workflow to ensure security, type safety, and consistency from the start.

### Current Status
- **ESLint compliance improvement**: Systematic reduction from 684 → 438 total issues
- **Error reduction**: 488 → 327 ESLint errors (33% reduction)
- **Files made compliant**: 11+ files achieving full ESLint compliance
- **Target**: 0 ESLint errors across entire codebase

---

## Core ESLint Configuration

### Base Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    // Strict TypeScript rules enforced
  }
}
```

### Key Extensions
- **@typescript-eslint/recommended**: Essential TypeScript rules
- **@typescript-eslint/recommended-requiring-type-checking**: Advanced type checking rules

---

## Complete ESLint Rules Reference

**Quick Reference Guide for Development** - Use Ctrl+F to find specific rules quickly.

**Legend**: ✅ Recommended | 🔧 Auto-fixable | 💡 Has suggestions | 💭 Type checking required | ❄️ Deprecated

### JavaScript Core Rules

#### Possible Problems
```
array-callback-return        ✅🔧💡  Enforce return in array callbacks
constructor-super           ✅       Require super() in constructors  
for-direction               ✅       Enforce for loop direction
getter-return               ✅🔧💡  Enforce return in getters
no-async-promise-executor   ✅       Disallow async Promise executors
no-await-in-loop           ✅       Disallow await in loops
no-class-assign            ✅       Disallow class reassignment
no-compare-neg-zero        ✅🔧     Disallow comparing to -0
no-cond-assign             ✅       Disallow assignment in conditions
no-const-assign            ✅       Disallow const reassignment
no-constant-condition       ✅       Disallow constant conditions
no-constructor-return       ✅       Disallow constructor returns
no-control-regex           ✅       Disallow control chars in regex
no-debugger                ✅       Disallow debugger statements
no-dupe-args               ✅       Disallow duplicate function args
no-dupe-class-members      ✅       Disallow duplicate class members
no-dupe-else-if            ✅       Disallow duplicate else-if
no-dupe-keys               ✅       Disallow duplicate object keys
no-duplicate-case          ✅       Disallow duplicate case labels
no-empty                   ✅🔧💡  Disallow empty statements
no-empty-character-class   ✅       Disallow empty char classes
no-empty-pattern           ✅       Disallow empty destructuring
no-ex-assign               ✅       Disallow exception parameter reassign
no-fallthrough             ✅       Disallow case fallthrough
no-func-assign             ✅       Disallow function reassignment
no-import-assign           ✅       Disallow import binding reassign
no-inner-declarations      ✅       Disallow inner declarations
no-invalid-regexp          ✅       Disallow invalid regex
no-irregular-whitespace    ✅🔧     Disallow irregular whitespace
no-loss-of-precision       ✅       Disallow precision loss
no-misleading-character-class ✅🔧💡 Disallow misleading char classes
no-new-symbol              ✅       Disallow new Symbol
no-obj-calls               ✅       Disallow global object calls
no-promise-executor-return ✅🔧💡  Disallow return in Promise executor
no-prototype-builtins      ✅🔧💡  Disallow prototype builtins
no-self-assign             ✅       Disallow self assignment
no-self-compare            ✅       Disallow self comparison  
no-setter-return           ✅       Disallow setter returns
no-sparse-arrays           ✅       Disallow sparse arrays
no-template-curly-in-string ✅      Disallow template syntax in strings
no-this-before-super       ✅       Disallow this before super
no-undef                   ✅       Disallow undefined variables
no-unexpected-multiline    ✅🔧     Disallow unexpected multiline
no-unmodified-loop-condition ✅     Disallow unmodified loop conditions
no-unreachable             ✅       Disallow unreachable code
no-unreachable-loop        ✅       Disallow unreachable loop
no-unsafe-finally          ✅       Disallow unsafe finally
no-unsafe-negation         ✅🔧💡  Disallow unsafe negation
no-unsafe-optional-chaining ✅      Disallow unsafe optional chaining
no-unused-private-class-members ✅  Disallow unused private members
no-unused-vars             ✅       Disallow unused variables
no-use-before-define       ✅       Disallow use before define
no-useless-backreference   ✅       Disallow useless backreference
require-atomic-updates     ✅       Require atomic updates
use-isnan                  ✅🔧💡  Require isNaN() checks
valid-typeof               ✅🔧💡  Enforce valid typeof
```

#### Suggestions  
```
accessor-pairs             🔧💡    Enforce getter/setter pairs
arrow-body-style          🔧      Enforce arrow function body style
block-scoped-var                  Enforce block scope for var
camelcase                         Enforce camelcase naming
capitalized-comments      🔧💡    Enforce capitalized comments
class-methods-use-this            Require this in class methods
complexity                        Enforce complexity limits
consistent-return                 Require consistent returns
consistent-this                   Enforce consistent this aliasing
curly                    🔧💡    Enforce curly braces
default-case                      Require default in switch
default-case-last        🔧      Enforce default case last
default-param-last               Enforce default params last
dot-notation             🔧💡    Enforce dot notation
eqeqeq                   🔧💡    Require === and !==
func-name-matching               Require matching function names
func-names                       Require function names
func-style                       Enforce function style
grouped-accessor-pairs   🔧      Require grouped accessor pairs
guard-for-in                     Require for-in guards
id-denylist                      Disallow specified identifiers
id-length                        Enforce identifier lengths
id-match                         Require identifier patterns
init-declarations                Require variable initializations
max-classes-per-file             Enforce max classes per file
max-depth                        Enforce max depth
max-lines                        Enforce max lines
max-lines-per-function           Enforce max lines per function
max-nested-callbacks             Enforce max nested callbacks
max-params                       Enforce max parameters
max-statements                   Enforce max statements
max-statements-per-line          Enforce max statements per line
multiline-comment-style   🔧     Enforce multiline comment style
new-cap                          Require constructor names
no-alert                         Disallow alert/confirm/prompt
no-array-constructor             Disallow Array constructor
no-bitwise                       Disallow bitwise operators
no-caller                        Disallow caller/callee
no-case-declarations     🔧      Disallow case declarations
no-confusing-arrow       🔧💡   Disallow confusing arrow functions
no-console                       Disallow console
no-continue                      Disallow continue
no-delete-var                    Disallow delete on variables
no-div-regex                     Disallow division regex
no-else-return           🔧💡   Disallow else after return
no-empty-function        🔧     Disallow empty functions
no-eq-null                       Disallow null comparisons
no-eval                          Disallow eval
no-extend-native                 Disallow native extensions
no-extra-bind            🔧💡   Disallow unnecessary bind
no-extra-boolean-cast    🔧💡   Disallow extra boolean casts
no-extra-label           🔧💡   Disallow extra labels
no-extra-semi            🔧     Disallow extra semicolons
no-floating-decimal      🔧💡   Disallow floating decimals
no-global-assign                 Disallow global assignments
no-implicit-coercion     🔧💡   Disallow implicit coercion
no-implicit-globals              Disallow implicit globals
no-implied-eval                  Disallow implied eval
no-inline-comments               Disallow inline comments
no-invalid-this                  Disallow invalid this
no-iterator                      Disallow iterator
no-label-var                     Disallow label variables
no-labels                🔧💡   Disallow labels
no-lone-blocks           🔧     Disallow lone blocks
no-lonely-if             🔧💡   Disallow lonely if
no-loop-func                     Disallow functions in loops
no-magic-numbers                 Disallow magic numbers
no-mixed-operators       🔧     Disallow mixed operators
no-multi-assign                  Disallow chained assignment
no-multi-str                     Disallow multi-line strings
no-negated-condition     🔧💡   Disallow negated conditions
no-nested-ternary                Disallow nested ternary
no-new                           Disallow new for side effects
no-new-func                      Disallow Function constructor
no-new-object            🔧💡   Disallow Object constructor
no-new-wrappers                  Disallow primitive wrapper instances
no-nonoctal-decimal-escape 🔧💡 Disallow \\8 and \\9 escapes
no-octal                         Disallow octal literals
no-octal-escape                  Disallow octal escapes
no-param-reassign                Disallow parameter reassignment
no-plusplus                      Disallow ++ and --
no-proto                         Disallow __proto__
no-redeclare                     Disallow variable redeclaration
no-regex-spaces          🔧💡   Disallow multiple spaces in regex
no-restricted-exports            Disallow specified exports
no-restricted-globals            Disallow specified globals
no-restricted-imports            Disallow specified imports
no-restricted-properties         Disallow specified properties
no-restricted-syntax             Disallow specified syntax
no-return-assign         🔧     Disallow assignment in return
no-return-await          🔧💡   Disallow return await
no-script-url                    Disallow script URLs
no-sequences             🔧💡   Disallow comma operator
no-shadow                        Disallow variable shadowing
no-shadow-restricted-names       Disallow shadowing restricted names
no-ternary                       Disallow ternary operators
no-throw-literal         🔧💡   Disallow literal throws
no-undef-init            🔧💡   Disallow undefined initialization
no-undefined                     Disallow undefined
no-underscore-dangle             Disallow dangling underscores
no-unneeded-ternary      🔧💡   Disallow unneeded ternary
no-unused-expressions    🔧💡   Disallow unused expressions
no-unused-labels         🔧💡   Disallow unused labels
no-useless-call          🔧💡   Disallow useless call
no-useless-catch         🔧💡   Disallow useless catch
no-useless-computed-key  🔧💡   Disallow useless computed keys
no-useless-concat        🔧💡   Disallow useless concatenation
no-useless-constructor   🔧💡   Disallow useless constructors
no-useless-escape        🔧💡   Disallow useless escapes
no-useless-rename        🔧💡   Disallow useless renaming
no-useless-return        🔧💡   Disallow useless returns
no-var                   🔧💡   Require let or const
no-void                  🔧💡   Disallow void operator
no-warning-comments              Disallow warning comments
no-with                          Disallow with statements
object-shorthand         🔧💡   Require object shorthand
one-var                  🔧💡   Enforce variable declarations
one-var-declaration-per-line 🔧💡 Require newline per declaration
operator-assignment      🔧💡   Require assignment operator shorthand
prefer-arrow-callback    🔧💡   Prefer arrow functions as callbacks
prefer-const             🔧💡   Prefer const declarations
prefer-destructuring     🔧💡   Prefer destructuring
prefer-exponentiation-operator 🔧💡 Prefer ** operator
prefer-named-capture-group 🔧💡 Prefer named capture groups
prefer-numeric-literals  🔧💡   Prefer numeric literals
prefer-object-has-own    🔧💡   Prefer Object.hasOwn()
prefer-object-spread     🔧💡   Prefer object spread
prefer-promise-reject-errors 🔧💡 Prefer Error objects for Promise.reject()
prefer-regex-literals    🔧💡   Prefer regex literals
prefer-rest-params       🔧💡   Prefer rest parameters
prefer-spread            🔧💡   Prefer spread syntax
prefer-template          🔧💡   Prefer template literals
quote-props              🔧💡   Require quotes around object keys
radix                    🔧💡   Enforce radix parameter
require-await            🔧💡   Disallow async without await
require-unicode-regexp   🔧💡   Enforce u flag on RegExp
require-yield                    Require generator yield
sort-imports             🔧💡   Enforce sorted imports
sort-keys                🔧💡   Require sorted object keys
sort-vars                🔧💡   Require sorted variables
spaced-comment           🔧💡   Enforce consistent comments
strict                   🔧💡   Require strict mode directives
symbol-description               Require symbol descriptions
vars-on-top                      Require var declarations on top
yoda                     🔧💡   Require Yoda conditions
```

### TypeScript-Specific Rules

#### Type Safety (Critical)
```
@typescript-eslint/no-explicit-any                    ✅🔧💡  Disallow any type
@typescript-eslint/no-unsafe-argument                 ✅💭    Disallow any in function calls
@typescript-eslint/no-unsafe-assignment               ✅💭    Disallow any assignments  
@typescript-eslint/no-unsafe-call                     ✅💭    Disallow calling any values
@typescript-eslint/no-unsafe-member-access            ✅💭    Disallow any member access
@typescript-eslint/no-unsafe-return                   ✅💭    Disallow any returns
@typescript-eslint/ban-types                          ✅🔧💡  Ban certain types
@typescript-eslint/no-non-null-assertion              ✅🔧💡  Disallow non-null assertions
@typescript-eslint/no-unnecessary-condition           ✅🔧💡💭 Remove unnecessary conditions
@typescript-eslint/no-unnecessary-type-assertion      ✅🔧💡💭 Remove unnecessary assertions
@typescript-eslint/strict-boolean-expressions         🔧💡💭  Control boolean expression types
```

#### Best Practices
```
@typescript-eslint/no-unused-vars                     ✅🔧💡  Disallow unused variables
@typescript-eslint/no-use-before-define               🔧💡   Disallow use before define
@typescript-eslint/prefer-optional-chain              🔧💡💭  Prefer optional chaining
@typescript-eslint/prefer-nullish-coalescing          🔧💡💭  Prefer nullish coalescing
@typescript-eslint/prefer-as-const                    🔧💡💭  Prefer as const assertions
@typescript-eslint/prefer-readonly                    🔧💡💭  Prefer readonly modifiers
@typescript-eslint/prefer-string-starts-ends-with     🔧💡💭  Prefer string starts/ends with
@typescript-eslint/consistent-type-imports            🔧💡   Enforce consistent type imports
@typescript-eslint/consistent-type-definitions        🔧💡   Enforce type vs interface
@typescript-eslint/explicit-function-return-type      🔧💡   Require function return types
@typescript-eslint/explicit-module-boundary-types     🔧💡   Require explicit boundaries
```

#### Async/Promise Handling
```
@typescript-eslint/no-floating-promises               ✅💭    Require proper Promise handling
@typescript-eslint/no-misused-promises                ✅💭    Prevent Promises in wrong contexts
@typescript-eslint/promise-function-async             🔧💡💭  Require async for Promise functions
@typescript-eslint/await-thenable                     ✅💭    Require await on thenables
@typescript-eslint/no-misused-new                     ✅🔧💡  Prevent misused new
@typescript-eslint/require-await                      ✅💭    Disallow async without await
```

#### Code Quality
```
@typescript-eslint/adjacent-overload-signatures       ✅🔧💡  Group overload signatures
@typescript-eslint/array-type                         🔧💡   Enforce array type syntax
@typescript-eslint/no-array-constructor               ✅🔧💡  Disallow Array constructor
@typescript-eslint/no-empty-function                  ✅🔧💡  Disallow empty functions
@typescript-eslint/no-empty-interface                 ✅🔧💡  Disallow empty interfaces
@typescript-eslint/no-extra-non-null-assertion        ✅🔧💡  Disallow extra non-null assertions
@typescript-eslint/no-inferrable-types                ✅🔧💡  Disallow inferrable type annotations
@typescript-eslint/no-unnecessary-type-arguments      🔧💡💭  Remove unnecessary type arguments
@typescript-eslint/no-var-requires                    ✅🔧💡  Disallow require statements
@typescript-eslint/prefer-for-of                      🔧💡   Prefer for-of loops
@typescript-eslint/prefer-function-type               🔧💡   Prefer function types
@typescript-eslint/prefer-namespace-keyword           🔧💡   Prefer namespace keyword
@typescript-eslint/prefer-reduce-type-parameter       🔧💡💭  Prefer reduce type parameter
@typescript-eslint/triple-slash-reference             ✅🔧💡  Disallow triple-slash references
@typescript-eslint/unified-signatures                 🔧💡   Unify overloaded signatures
```

#### Naming Conventions
```
@typescript-eslint/naming-convention                  🔧💡   Enforce naming conventions
@typescript-eslint/no-shadow                          🔧💡   Disallow variable shadowing  
@typescript-eslint/class-literal-property-style       🔧💡   Enforce class property style
@typescript-eslint/member-delimiter-style             🔧💡   Enforce member delimiter style
@typescript-eslint/member-ordering                    🔧💡   Enforce member ordering
@typescript-eslint/method-signature-style             🔧💡   Enforce method signature style
@typescript-eslint/type-annotation-spacing            🔧💡   Enforce type annotation spacing
```

### Usage Notes

**For Quick Lookups:**
1. Use Ctrl+F with rule name to find specific rules
2. Look for ✅ for recommended rules to prioritize
3. 🔧 indicates auto-fixable rules (use `npm run lint` to auto-fix)
4. 💭 indicates rules requiring TypeScript type checking

**Common Categories:**
- **Security Critical**: All `no-unsafe-*` and `no-explicit-any` rules
- **Type Safety**: Rules preventing runtime type errors  
- **Code Quality**: Rules improving maintainability and readability
- **Performance**: Rules preventing performance issues

---

## Critical Security Rules

### 1. No Unsafe Assignments (`@typescript-eslint/no-unsafe-assignment`)
**Purpose**: Prevent assignment of `any` values that could lead to runtime errors or security vulnerabilities.

**❌ Violation Examples:**
```typescript
const data = await response.json(); // Unsafe - unknown type
const user = data.user; // Unsafe member access
```

**✅ Compliant Solutions:**
```typescript
interface ApiResponse {
    user: UserInfo;
}
const data = await response.json() as ApiResponse; // Type assertion
const user = data.user; // Safe access with known type
```

### 2. No Unsafe Member Access (`@typescript-eslint/no-unsafe-member-access`)
**Purpose**: Prevent accessing properties on `any` types that could cause runtime errors.

**❌ Violation Examples:**
```typescript
const errorData = await response.json();
const message = errorData.message; // Unsafe - could be undefined
```

**✅ Compliant Solutions:**
```typescript
interface ErrorResponse {
    message?: string;
}
const errorData = await response.json() as ErrorResponse;
const message = errorData.message ?? "Unknown error";
```

### 3. Explicit Any (`@typescript-eslint/no-explicit-any`)
**Purpose**: Require proper typing instead of using `any` escape hatch.

**❌ Violation Examples:**
```typescript
function processData(data: any): any {
    return data.someProperty;
}
```

**✅ Compliant Solutions:**
```typescript
interface ProcessableData {
    someProperty: string;
}
function processData(data: ProcessableData): string {
    return data.someProperty;
}
```

---

## TypeScript Strict Rules

### 1. No Implicit Returns (`noImplicitReturns`)
**Purpose**: Ensure all code paths explicitly return values.

**❌ Violation Examples:**
```typescript
function validateField(fieldName: string): boolean {
    if (fieldName === "email") {
        return true;
    }
    // Missing return for other cases
}
```

**✅ Compliant Solutions:**
```typescript
function validateField(fieldName: string): boolean {
    if (fieldName === "email") {
        return true;
    }
    return false; // Explicit return for all paths
}
```

### 2. No Unchecked Indexed Access (`noUncheckedIndexedAccess`)
**Purpose**: Prevent unsafe array/object access that could return undefined.

**❌ Violation Examples:**
```typescript
const result = array[0]; // Could be undefined
```

**✅ Compliant Solutions:**
```typescript
const result = array[0];
if (!result) {
    throw new Error("Array is empty");
}
// Now safe to use result
```

### 3. Prefer Nullish Coalescing (`@typescript-eslint/prefer-nullish-coalescing`)
**Purpose**: Use `??` instead of `||` for safer null/undefined checking.

**❌ Violation Examples:**
```typescript
const message = error.message || "Default message"; // Falsy values treated as null
```

**✅ Compliant Solutions:**
```typescript
const message = error.message ?? "Default message"; // Only null/undefined trigger default
```

---

## Code Quality Standards

### 1. No Unused Variables (`@typescript-eslint/no-unused-vars`)
**Purpose**: Prevent unused imports and variables that bloat the codebase.

**❌ Violation Examples:**
```typescript
import { SessionStatus, SessionInfo } from "./types"; // SessionInfo unused
```

**✅ Compliant Solutions:**
```typescript
import { SessionStatus } from "./types"; // Only import what's used
```

### 2. Missing Return Types (`@typescript-eslint/explicit-function-return-type`)
**Purpose**: Require explicit return types for better code documentation and type safety.

**❌ Violation Examples:**
```typescript
function processUser(user) { // Missing parameter and return types
    return user.name;
}
```

**✅ Compliant Solutions:**
```typescript
function processUser(user: User): string {
    return user.name;
}
```

### 3. Unbound Method References (`@typescript-eslint/unbound-method`)
**Purpose**: Prevent loss of `this` context when passing methods as callbacks.

**❌ Violation Examples:**
```typescript
element.addEventListener("click", this.handleClick); // Loses 'this' context
```

**✅ Compliant Solutions:**
```typescript
element.addEventListener("click", (event) => this.handleClick(event));
// OR
element.addEventListener("click", this.handleClick.bind(this));
```

---

## Common Patterns and Solutions

### API Response Handling Pattern
```typescript
// Define response interfaces
interface ApiSuccessResponse {
    user: UserInfo;
    message: string;
}

interface ApiErrorResponse {
    message: string;
    error?: string;
}

// Type-safe response handling
async function handleApiCall(): Promise<UserInfo> {
    const response = await fetch("/api/endpoint");
    
    if (response.ok) {
        const data = await response.json() as ApiSuccessResponse;
        return data.user;
    }
    
    const errorData = await response.json() as ApiErrorResponse;
    throw new Error(errorData.message ?? "Unknown error");
}
```

### JSON Parsing with Type Safety
```typescript
function parseSessionData(jsonString: string): SessionInfo | null {
    try {
        const parsed: unknown = JSON.parse(jsonString);
        
        // Type guard validation
        if (!parsed || 
            typeof parsed !== "object" || 
            parsed === null ||
            !("id" in parsed) || 
            typeof (parsed as Record<string, unknown>).id !== "string") {
            return null;
        }
        
        return parsed as SessionInfo;
    } catch {
        return null;
    }
}
```

### DOM Element Access Pattern
```typescript
// Type-safe DOM element access
function getRequiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id) as T | null;
    if (!element) {
        throw new Error(`Required element with id '${id}' not found`);
    }
    return element;
}

// Usage
const emailInput = getRequiredElement<HTMLInputElement>("email");
```

### Mock Setup for Testing
```typescript
// Proper mock typing
const mockSessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

// Global mock setup
Object.defineProperty(global, "sessionStorage", {
    value: mockSessionStorage,
    writable: true
});
```

---

## ESLint Integration with Development Workflow

### TDD Integration
```bash
# Standard TDD workflow with ESLint
npm test                    # 1. Run tests (Red/Green phase)
npm run lint                # 2. Check code quality (Refactor phase)
npm run type-check          # 3. Verify TypeScript safety
```

### Quality Commands
```bash
# Essential quality checks
npm run lint                # Auto-fix ESLint issues
npm run lint:check          # Check without fixing
npm run format              # Format with Prettier
npm run quality             # Run all quality checks
npm run test:quality        # Tests + lint + format + type-check
```

### Pre-commit Integration
ESLint compliance is enforced before any code is committed:
```bash
# Required before commit
npm run test:quality        # Must pass all checks
```

---

## Error Resolution Strategies

### Systematic Approach
1. **Categorize errors** by type (unsafe assignment, missing types, etc.)
2. **Address critical security issues first** (unsafe assignments, member access)
3. **Fix type safety issues** (missing return types, explicit any)
4. **Clean up code quality issues** (unused variables, formatting)

### File-by-File Strategy
- Focus on one file at a time for complete compliance
- Establish consistent patterns that can be applied across remaining files
- Prioritize files with highest error counts first

### Common Resolution Patterns
```typescript
// Before: Unsafe assignment
const data = await response.json();

// After: Type-safe with interface
interface ApiResponse { user: UserInfo; }
const data = await response.json() as ApiResponse;

// Before: Missing return type
function validate(input) {

// After: Explicit typing
function validate(input: string): boolean {

// Before: Logical OR
const value = input || "default";

// After: Nullish coalescing
const value = input ?? "default";
```

---

## Success Metrics

### Project-Wide Goals
- **Target**: 0 ESLint errors across entire codebase
- **Current progress**: 33% error reduction achieved
- **Quality standard**: 100% ESLint compliance for all new code

### File-Level Standards
- **New files**: Must achieve 100% ESLint compliance from creation
- **Modified files**: Must maintain or improve ESLint compliance
- **Test files**: Subject to same standards as production code

### Continuous Improvement
- **Regular audits**: Monitor ESLint compliance trends
- **Pattern documentation**: Update this guide with new patterns discovered
- **Rule evolution**: Adapt rules as project needs evolve

---

## Conclusion

ESLint compliance is not optional in this project - it's a fundamental requirement for code quality, security, and maintainability. By following these standards and patterns, we ensure:

- **Security**: Prevention of unsafe type operations and potential vulnerabilities
- **Maintainability**: Consistent code patterns that are easy to understand and modify
- **Type Safety**: Full TypeScript compliance with strict compilation settings
- **Team Productivity**: Reduced debugging time through early error detection

All contributors must familiarize themselves with these standards and apply them consistently throughout the development process.
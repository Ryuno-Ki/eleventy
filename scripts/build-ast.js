const fs = require('fs');
const path = require('path');

const espree = require('espree');
const { promisify } = require('es6-promisify');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const srcRoot = path.resolve(__dirname, '..');
const cliScripts = [
  'cmd.js',
];
const espreeOptions = {
  ecmaVersion: 6,
};
const dependencyMap = {};
let filesToAnalyse = [];
const filesVisited = [];

/**
 * This is the entry point in this script.
 */
async function main () {
  const files = await listFiles(srcRoot);
  await walkDirectory(files);
  let currentFile = getNextFile();

  while (currentFile) {
    await step(currentFile);
    currentFile = getNextFile();
  }
  console.log(dependencyMap);
}

/**
 * Proceed with the next file to parse.
 *
 * @param {string} currentFile
 */
async function step (currentFile) {
  filesToAnalyse = [];
  let nextStep = getFilePathFromRequire(srcRoot, currentFile);
  try {
    const content = await extractContent(nextStep);
    const { ast, filePath } = parseCode(content);
    extractNextFiles(ast, filePath);
    //await walkDirectory(nextStep);
  } catch (exc) {
    console.error(`Error in ${currentFile}:`, exc);
  }
  filesVisited.push(currentFile);
}

/**
 * Read every file and parse the AST to discover all requires.
 *
 * @param {Array<string>} files
 */
async function walkDirectory (files) {
  const contents = await Promise.all(files.map(extractContent));

  contents
    .map(parseCode)
    .forEach(({ ast, filePath }) => {
      extractNextFiles(ast, filePath);
    });
}

/**
 * Reads the content of a given file.
 *
 * @async
 * @param {string} filePath
 * @returns {{}}
 */
async function extractContent (filePath) {
  if (cliScripts.some((cliScript) => filePath.endsWith(cliScript))) {
    return {
      filePath,
      code: await handleCliScript(filePath)
    };
  }

  return {
    filePath,
    code: await readFile(filePath, 'utf8')
  };
}

/**
 * Extracts the next files to analyse.
 *
 * @param {{}}     ast
 * @param {string} filePath
 */
function extractNextFiles (ast, filePath) {
  walkTree(ast.body);
  const key = path.relative(srcRoot, filePath);
  dependencyMap[ key ] = filesToAnalyse
    .map((fileToAnalyse) => {
      const dirName = path.dirname(filePath);
      const filePathToAnalyse = path.resolve(dirName, fileToAnalyse);
      return path.relative(srcRoot, filePathToAnalyse);
    })
    .slice();
}

/**
 * Map require() to absolute file path.
 *
 * @param {string} root
 * @param {string} require
 * @returns {string}
 */
function getFilePathFromRequire (root, require) {
  return path.resolve(root, `${require}.js`);
}

/**
 * Determines the next file to parse.
 *
 * @returns {string|null}
 */
function getNextFile () {
  const allFiles = Object
    .keys(dependencyMap)
    .map((key) => dependencyMap[key])
    .reduce((aggegate, current) => aggegate.concat(current), [])
    .filter((file) => !file.endsWith('.json'));

  const unvisitedFiles = allFiles.filter((file) => !filesVisited.includes(file));
  return unvisitedFiles.length > 0 ? unvisitedFiles[ 0 ] : null;
}

/**
 * List all JS files as path in the given directory.
 *
 * @async
 * @param {string} directory
 * @returns {Array<string>}
 */
async function listFiles (directory) {
  const files = await readdir(directory);
  return files
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.startsWith('.'))
    .map((file) => path.join(directory, file));
}

/**
 * Strip the magic line from CLI scripts and return the remaining content.
 *
 * @async
 * @param {string} filePath
 * @returns {string}
 */
async function handleCliScript (filePath) {
  const sep = '\n';
  const content = await readFile(filePath, 'utf8');
  return content.split(sep).slice(1).join(sep);
}

/**
 * Parses the AST for the given code.
 *
 * @param {{}}     options
 * @param {string} options.filePath
 * @param {string} options.code
 * @return {{}}
 */
function parseCode ({ filePath, code }) {
  return {
    filePath,
    ast: espree.parse(code, espreeOptions)
  };
}

/**
 * Walks an AST (sub)tree.
 *
 * @param {Array<Node>}
 */
function walkTree (nodes) {
  if (typeof nodes.forEach !== 'function') {
    console.warn('Not an array', nodes);
    return;
  }

  nodes.forEach((node) => {
    if (node === null) {
      return
    }

    switch (node.type) {
      case 'ArrayExpression':
        handleArrayExpression(node);
        break;
      case 'ArrowFunctionExpression':
        handleArrowFunctionExpression(node);
        break;
      case 'AssignmentExpression':
        handleAssignmentExpression(node);
        break;
      case 'BinaryExpression':
        handleBinaryExpression(node);
        break;
      case 'BlockStatement':
        handleBlockStatement(node);
        break;
      case 'CallExpression':
        handleCallExpression(node);
        break;
      case 'CatchClause':
        handleCatchClause(node);
        break;
      case 'ClassBody':
        handleClassBody(node);
        break;
      case 'ClassDeclaration':
        handleClassDeclaration(node);
        break;
      case 'ConditionalExpression':
        handleConditionalExpression(node);
        break;
      case 'ExpressionStatement':
        handleExpressionStatement(node);
        break;
      case 'ForInStatement':
        handleForInStatement(node);
        break;
      case 'ForOfStatement':
        handleForOfStatement(node);
        break;
      case 'FunctionExpression':
        handleFunctionExpression(node);
        break;
      case 'Identifier':
        handleIdentifier(node);
        break;
      case 'IfStatement':
        handleIfStatement(node);
        break;
      case 'Literal':
        handleLiteral(node);
        break;
      case 'LogicalExpression':
        handleLogicalExpression(node);
        break;
      case 'MemberExpression':
        handleMemberExpression(node);
        break;
      case 'MethodDefinition':
        handleMethodDefinition(node);
        break;
      case 'NewExpression':
        handleNewExpression(node);
        break;
      case 'ObjectExpression':
        handleObjectExpression(node);
        break;
      case 'Property':
        handleProperty(node);
        break;
      case 'ReturnStatement':
        handleReturnStatement(node);
        break;
      case 'Super':
        handleSuper(node);
        break;
      case 'TemplateElement':
        handleTemplateElement(node);
        break;
      case 'TemplateLiteral':
        handleTemplateLiteral(node);
        break;
      case 'ThisExpression':
        handleThisExpression(node);
        break;
      case 'ThrowStatement':
        handleThrowStatement(node);
        break;
      case 'TryStatement':
        handleTryStatement(node);
        break;
      case 'UnaryExpression':
        handleUnaryExpression(node);
        break;
      case 'VariableDeclaration':
        handleVariableDeclaration(node);
        break;
      case 'VariableDeclarator':
        handleVariableDeclarator(node);
        break;
      case 'WhileStatement':
        handleWhileStatement(node);
        break;
      default:
        console.log('Unhandled', node);
    }
  });
}

/**
 * Triggers a walk over the items of an Array.
 *
 * @param {ArrayExpresion} node
 */
function handleArrayExpression (node) {
  walkTree(node.elements);
}

/**
 * Triggers a walk over the params and body of an arrow function.
 *
 * @param {ArrowFunctionExpression} node
 */
function handleArrowFunctionExpression (node) {
  walkTree(node.params);
  walkTree([node.body]);
}

/**
 * Triggers a walk over both sides of an assignment.
 *
 * @param {AssignmentExpression} node
 */
function handleAssignmentExpression (node) {
  walkTree([node.left]);
  walkTree([node.right]);
}

/**
 * Triggers a walk over both sides of a binary expression.
 *
 * @param {BinaryExpression} node
 */
function handleBinaryExpression (node) {
  walkTree([node.left]);
  walkTree([node.right]);
}

/**
 * Triggers a walk of the body of a JavaScript block statement.
 *
 * @param {BlockStatement} node
 */
function handleBlockStatement (node) {
  walkTree(node.body);
}

/**
 * Checks a call expression for a require call or further looks at the callee
 * and the passed arguments.
 *
 * @param {CallExpression} node
 */
function handleCallExpression (node) {
  if (isRequireCall(node)) {
    filesToAnalyse.push(node.arguments[0].value);
    return;
  }

  walkTree([node.callee]);
  walkTree(node.arguments);
}

/**
 * Walks over the body of a catch clause of try-catch.
 *
 * @param {CatchClause} node
 */
function handleCatchClause (node) {
  walkTree(node.body.body);
}

/**
 * Triggers a walk over the body of a class.
 *
 * @param {ClassBody} node
 */
function handleClassBody (node) {
  walkTree(node.body);
}

/**
 * Walks over ID, parent class and body of a class.
 *
 * @param {ClassDeclaration} node
 */
function handleClassDeclaration (node) {
  walkTree([node.id]);
  walkTree([node.superClass]);
  walkTree([node.body]);
}

/**
 * Triggers a walk over the condition, the positive and negative branch
 * of a condition.
 *
 * @param {ConditionalExpression) node
 */
function handleConditionalExpression (node) {
  walkTree([node.test]);
  walkTree([node.consequent]);
  walkTree([node.alternate]);
}

/**
 * Walks over an expression statement.
 *
 * @param {ExpressionStatement} node
 */
function handleExpressionStatement (node) {
  walkTree([node.expression]);
}

/**
 * Triggers a walk over the head and body of a for-in loop.
 *
 * @param {ForInStatement} node
 */
function handleForInStatement (node) {
  walkTree([node.left]);
  walkTree([node.right]);
  walkTree([node.body]);
}

/**
 * Triggers a walk over the head and body of a for-of loop.
 *
 * @param {ForOfStatement} node
 */
function handleForOfStatement (node) {
  walkTree([node.left]);
  walkTree([node.right]);
  walkTree([node.body]);
}

/**
 * Walks over the body of a function expression.
 *
 * @param {FunctionExpression} node
 */
function handleFunctionExpression (node) {
  walkTree([node.body]);
}

/**
 * Does nothing with an identifer.
 *
 * @param {Identifier} node
 */
function handleIdentifier (node) {
  // console.log('Identifier', node.name);
}

/**
 * Walks over the condition, positive and negative block of an if statement.
 *
 * @param {IfStatement} node
 */
function handleIfStatement (node) {
  walkTree([node.test]);
  walkTree([node.consequent]);
  walkTree([node.alternate]);
}

/**
 * Does nothing with a literal.
 *
 * @param {Literal} node
 */
function handleLiteral (node) {
  // console.log('Literal', node.value);
}

/**
 * Triggers a walk of the left and right side of a logical expression.
 *
 * @param {LogicalExpression} node
 */
function handleLogicalExpression (node) {
  walkTree([node.left]);
  walkTree([node.right]);
}

/**
 * Walks over the object and the property.
 *
 * @param {MemberExpression} node
 */
function handleMemberExpression (node) {
  walkTree([node.object]);
  walkTree([node.property]);
}

/**
 * Triggers a walk over the key and value of a method definition.
 *
 * @param {MethodDefinition} node
 */
function handleMethodDefinition(node) {
  walkTree([node.key]);
  walkTree([node.value]);
}

/**
 * Walks over the callee and arguments of a new expression.
 *
 * @param {NewExpression} node
 */
function handleNewExpression (node) {
  walkTree([node.callee]);
  walkTree(node.arguments);
}

/**
 * Walks over the properties of an Object expression.
 *
 * @param {ObjectExpression} node
 */
function handleObjectExpression (node) {
  walkTree(node.properties);
}

/**
 * Walks over key and value of a property.
 *
 * @param {Property} node
 */
function handleProperty (node) {
  walkTree([node.key]);
  walkTree([node.value]);
}

/**
 * Walks over the return value.
 *
 * @param {ReturnStatement} node
 */
function handleReturnStatement (node) {
  walkTree([node.argument]);
}

/**
 * Does nothing with a super call.
 *
 * @param {Super} node
 */
function handleSuper (node) {
  // console.log('Super', node);
}

/**
 * Does nothing with a template.
 *
 * @param {TemplateElement} node
 */
function handleTemplateElement (node) {
  // console.log('Template', node.value);
}

/**
 * Walks over the template literal and possible arguments.
 *
 * @param {TemplateLiteral} node
 */
function handleTemplateLiteral (node) {
  walkTree(node.expressions);
  walkTree(node.quasis);
}

/**
 * Does nothing with this.
 *
 * @param {ThisExpression} node
 */
function handleThisExpression (node) {
  // console.log('This!', node);
}

/**
 * Triggers a walk over the argument to throw.
 *
 * @param {ThrowStatement} node
 */
function handleThrowStatement (node) {
  walkTree([node.argument]);
}

/**
 * Walks over the body, catch and finally handler of a try-catch block.
 *
 * @param {TryStatement} node
 */
function handleTryStatement (node) {
  walkTree([node.block]);
  walkTree([node.handler]);
  walkTree([node.finalizer]);
}

/**
 * Triggers a walk over the unary argument.
 *
 * @param {UnaryExpression} node
 */
function handleUnaryExpression (node) {
  walkTree([node.argument]);
}

/**
 * Walks over variable declarations.
 *
 * @param {VariableDeclaration} node
 */
function handleVariableDeclaration (node) {
  // console.log('Variable', node.kind);
  walkTree(node.declarations);
}

/**
 * Walks over the variable declarator.
 *
 * @param {VariableDeclarator} node
 */
function handleVariableDeclarator (node) {
  walkTree([node.init]);
}

/**
 * Triggers a walk over the condition and body of a while-loop.
 *
 * @param {WhileStatement} node
 */
function handleWhileStatement (node) {
  walkTree([node.test]);
  walkTree([node.body]);
}

/**
 * Checks a call expression on being a require().
 *
 * @param {CallExpression} node
 */
function isRequireCall (node) {
  let isRequire = false;
  let isLocalRef = false;

  if (node.callee.type === 'Identifier') {
    if (node.callee.name === 'require') {
      isRequire = true;
    }
  }

  if (isRequire) {
    const argument = node.arguments[0];
    if (argument.type === 'Literal') {
      if (argument.value.startsWith('.')) {
        isLocalRef = true;
      }
    }
  }
  return isRequire && isLocalRef;
}

main();

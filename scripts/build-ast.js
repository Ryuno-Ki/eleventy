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

async function main () {
  const files = await listFiles(srcRoot);
  await walkFileSystem(files);
  let currentFile = getNextFile();

  while (currentFile) {
    await step(currentFile);
    currentFile = getNextFile();
  }
  console.log(dependencyMap);
}

async function step (currentFile) {
  filesToAnalyse = [];
  let nextStep = getFilePathsFromRequires(srcRoot, dependencyMap[currentFile]);
  await walkFileSystem(nextStep);
  filesVisited.push(currentFile);
}

async function walkFileSystem (files) {
  const contents = await Promise.all(
    files
      .map(async (filePath) => {
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
      })
  );

  contents
    .map(parseCode)
    .forEach(({ filePath, ast }) => {
      walkTree(ast.body);
      const key = path.relative(srcRoot, filePath);
      dependencyMap[ key ] = filesToAnalyse
        .map((fileToAnalyse) => {
          const dirName = path.dirname(filePath);
          const filePathToAnalyse = path.resolve(dirName, fileToAnalyse);
          return path.relative(srcRoot, filePathToAnalyse);
        })
        .slice();
    });
}

function getFilePathsFromRequires (root, requires) {
  return requires
    .filter((file) => !path.extname(file))
    .map((file) => path.resolve(root, file))
    .map((file) => `${file}.js`)
}

function getNextFile () {
  const allFiles = Object.keys(dependencyMap);
  const unvisitedFiles = allFiles.filter((file) => !filesVisited.includes(file));
  return unvisitedFiles.length > 0 ? unvisitedFiles[ 0 ] : null;
}

async function listFiles (directory) {
  const files = await readdir(directory);
  return files
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.startsWith('.'))
    .map((file) => path.join(directory, file));
}

async function handleCliScript (filePath) {
  const sep = '\n';
  const content = await readFile(filePath, 'utf8');
  return content.split(sep).slice(1).join(sep);
}

function parseCode ({ filePath, code }) {
  return {
    filePath,
    ast: espree.parse(code, espreeOptions)
  };
}

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
      case 'BlockStatement':
        // handleBlockStatement(node);
        break;
      case 'CallExpression':
        handleCallExpression(node);
        break;
      case 'CatchClause':
        // handleCatchClause(node);
        break;
      case 'ExpressionStatement':
        handleExpressionStatement(node);
        break;
      case 'Identifier':
        // handleIdentifier(node);
        break;
      case 'IfStatement':
        // handleIfStatement(node);
        break;
      case 'Literal':
        // handleLiteral(node);
        break;
      case 'TryStatement':
        // handleTryStatement(node);
        break;
      case 'VariableDeclaration':
        handleVariableDeclaration(node);
        break;
      case 'VariableDeclarator':
        handleVariableDeclarator(node);
        break;
      default:
        // console.log('Unhandled', node);
    }
  });
}

function handleBlockStatement (node) {
  console.log('Block', node.body);
}

function handleCallExpression (node) {
  if (isRequireCall(node)) {
    filesToAnalyse.push(node.arguments[0].value);
    return;
  }

  walkTree([node.callee]);
  walkTree(node.arguments);
}

function handleCatchClause (node) {
  console.log('Catch', node.body);
}

function handleExpressionStatement (node) {
  walkTree([node.expression]);
}

function handleIdentifier (node) {
  console.log('Identifier', node.name);
}

function handleIfStatement (node) {
  console.log('If statement', node);
  walkTree([node.test]);
  walkTree([node.consequent]);
  walkTree([node.alternate]);
}

function handleLiteral (node) {
  console.log('Literal', node.value);
}

function handleTryStatement (node) {
  walkTree([node.block]);
  walkTree([node.handler]);
  walkTree(node.finalizer);
}

function handleVariableDeclaration (node) {
  // console.log('Variable', node.kind);
  walkTree(node.declarations);
}

function handleVariableDeclarator (node) {
  walkTree([node.init]);
}

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

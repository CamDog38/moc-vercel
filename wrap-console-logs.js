const fs = require('fs');
const path = require('path');

const targetExtensions = ['.js', '.ts', '.jsx', '.tsx'];

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const lines = content.split('\n');
  const newLines = [];
  let insideWrappedBlock = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Skip if already wrapped
    if (trimmed.startsWith('if (process.env.NODE_ENV !== \'production\') {')) {
      insideWrappedBlock = true;
      newLines.push(line);
      continue;
    }
    if (insideWrappedBlock) {
      newLines.push(line);
      if (trimmed === '}') {
        insideWrappedBlock = false;
      }
      continue;
    }

    // Match console.log statements
    const logMatch = trimmed.match(/^console\.log\s*\((.*)\);?$/);
    if (logMatch) {
      const indent = line.match(/^\s*/)[0];
      const logContent = logMatch[1];
      newLines.push(`${indent}if (process.env.NODE_ENV !== 'production') {`);
      newLines.push(`${indent}  console.log(${logContent});`);
      newLines.push(`${indent}}`);
    } else {
      newLines.push(line);
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (targetExtensions.includes(path.extname(entry.name))) {
      processFile(fullPath);
    }
  }
}

const projectRoot = process.cwd();
if (process.env.NODE_ENV !== 'production') {
  console.log(`Wrapping console.log statements in project at ${projectRoot}`);
}
walkDir(projectRoot);
if (process.env.NODE_ENV !== 'production') {
  console.log('Done.');
}

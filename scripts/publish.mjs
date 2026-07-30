import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const cliDir = join(root, 'packages', 'cli');

const pkgPath = join(cliDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const workspaceDeps = Object.keys(pkg.dependencies || {}).filter(
  (k) => pkg.dependencies[k] === 'workspace:*'
);

for (const dep of workspaceDeps) {
  console.log(`Removing workspace dependency: ${dep}`);
  delete pkg.dependencies[dep];
}

pkg.devDependencies = {};

const tempPkgBackup = join(cliDir, 'package.json.bak');
copyFileSync(pkgPath, tempPkgBackup);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

try {
  console.log('\nPublishing devcli...');
  console.log('If 2FA enabled, use: npm publish --otp=XXXXXX\n');
  execSync('npm publish --access public', { cwd: cliDir, stdio: 'inherit' });
} finally {
  copyFileSync(tempPkgBackup, pkgPath);
  unlinkSync(tempPkgBackup);
}

console.log('Published devcli');

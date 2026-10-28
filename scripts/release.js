const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const phpPluginPath = path.join(rootDir, 'nrfc-auto-links.php');
const changelogPath = path.join(rootDir, 'changelog.md');

const ALLOWED_ACTIONS = ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'perf'];

const ACTION_TITLES = {
  feat: 'Feat',
  fix: 'Fix',
  chore: 'Chore',
  docs: 'Docs',
  refactor: 'Refactor',
  test: 'Test',
  perf: 'Perf',
};

function runCommand(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return null;
  }
}

function getLatestTag() {
  const tag = runCommand('git describe --tags --abbrev=0');
  if (tag) return tag;
  const tags = runCommand('git tag -l "v*" --sort=-v:refname');
  if (tags) {
    const list = tags.split('\n').filter(Boolean);
    if (list.length > 0) return list[0];
  }
  return null;
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const output = runCommand(`git log ${range} --pretty=format:"%H%x09%s"`);
  if (!output) return [];

  const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
  const commits = [];

  for (const line of lines) {
    const [hash, ...subjParts] = line.split('\t');
    const subject = subjParts.join('\t').trim();

    // Skip release commits
    if (/^chore\(release\):/i.test(subject) || /\[skip ci\]/i.test(subject)) {
      continue;
    }

    // Parse conventional commit: type(scope)!: message or type: message
    const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
    if (match) {
      const type = match[1].toLowerCase();
      const scope = match[2] || '';
      const breaking = Boolean(match[3]);
      const message = match[4];
      commits.push({ hash: hash.substring(0, 7), type, scope, breaking, message, raw: subject });
    } else {
      commits.push({ hash: hash.substring(0, 7), type: 'other', scope: '', breaking: false, message: subject, raw: subject });
    }
  }

  return commits;
}

function bumpPatchVersion(currentVersion) {
  const parts = currentVersion.split('.').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function generateChangelogEntry(version, commits) {
  const today = new Date().toISOString().split('T')[0];
  const lines = [`## [${version}] - ${today}`, ''];

  const commitsByAction = {};
  for (const action of ALLOWED_ACTIONS) {
    commitsByAction[action] = [];
  }
  const otherCommits = [];

  for (const commit of commits) {
    if (commitsByAction[commit.type]) {
      commitsByAction[commit.type].push(commit);
    } else {
      otherCommits.push(commit);
    }
  }

  for (const action of ALLOWED_ACTIONS) {
    const actionCommits = commitsByAction[action];
    if (actionCommits.length > 0) {
      const title = ACTION_TITLES[action] || action;
      lines.push(`### ${title}`);
      for (const c of actionCommits) {
        const scopePrefix = c.scope ? `**${c.scope}:** ` : '';
        lines.push(`- ${scopePrefix}${c.message} (${c.hash})`);
      }
      lines.push('');
    }
  }

  if (otherCommits.length > 0) {
    lines.push('### Other');
    for (const c of otherCommits) {
      lines.push(`- ${c.message} (${c.hash})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function updateChangelogFile(entry) {
  let content = '';
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf8');
  }

  if (!content.trim()) {
    content = `# Changelog\n\n${entry}\n`;
  } else if (content.startsWith('# Changelog')) {
    const afterHeader = content.replace(/^# Changelog\s*\n+/, '');
    content = `# Changelog\n\n${entry}\n${afterHeader}`;
  } else {
    content = `# Changelog\n\n${entry}\n${content}`;
  }

  fs.writeFileSync(changelogPath, content, 'utf8');
}

function updatePackageJson(nextVersion) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.version = nextVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

function updatePhpPluginVersion(nextVersion) {
  if (fs.existsSync(phpPluginPath)) {
    let content = fs.readFileSync(phpPluginPath, 'utf8');
    content = content.replace(/(Version:\s*)([0-9]+\.[0-9]+\.[0-9]+)/g, `$1${nextVersion}`);
    fs.writeFileSync(phpPluginPath, content, 'utf8');
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noGit = args.includes('--no-git');

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = pkg.version || '1.0.0';
  const nextVersion = bumpPatchVersion(currentVersion);

  const latestTag = getLatestTag();
  console.log(`Current version: ${currentVersion}`);
  console.log(`Latest git tag: ${latestTag || 'none'}`);
  console.log(`New patch version: ${nextVersion}`);

  const commits = getCommitsSince(latestTag);
  console.log(`Found ${commits.length} commit(s) since last release.`);

  const changelogEntry = generateChangelogEntry(nextVersion, commits);

  if (dryRun) {
    console.log('\n--- CHANGELOG ENTRY (DRY RUN) ---');
    console.log(changelogEntry);
    return;
  }

  updatePackageJson(nextVersion);
  updatePhpPluginVersion(nextVersion);
  updateChangelogFile(changelogEntry);

  console.log(`Updated package.json and nrfc-auto-links.php to ${nextVersion}`);
  console.log(`Updated changelog.md`);

  if (!noGit) {
    try {
      execSync(`git add "${packageJsonPath}" "${phpPluginPath}" "${changelogPath}"`, { cwd: rootDir, stdio: 'inherit' });
      execSync(`git commit -m "chore(release): ${nextVersion} [skip ci]"`, { cwd: rootDir, stdio: 'inherit' });
      execSync(`git tag -a "v${nextVersion}" -m "Release v${nextVersion}"`, { cwd: rootDir, stdio: 'inherit' });
      console.log(`Committed and tagged v${nextVersion}`);
    } catch (err) {
      console.error('Git commit/tagging failed:', err.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  bumpPatchVersion,
  generateChangelogEntry,
  getCommitsSince,
  ALLOWED_ACTIONS,
};

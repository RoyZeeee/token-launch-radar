import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

function options(args: string[]) {
  const defaults = { input: '/input', output: process.env.MAKEFUN_OUTPUT_DIR ?? '/output' };
  for (let i = 0; i < args.length; i++) {
    const separator = args[i].indexOf('=');
    const flag = separator < 0 ? args[i] : args[i].slice(0, separator);
    if (flag !== '--input' && flag !== '--output') throw new Error(`Unknown option: ${flag}`);
    const value = separator < 0 ? args[++i] : args[i].slice(separator + 1);
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a path`);
    defaults[flag === '--input' ? 'input' : 'output'] = value;
  }
  return defaults;
}

function ship(directory: string, target: string) {
  const from = join(root, directory);
  const to = join(target, directory);
  mkdirSync(to, { recursive: true });
  for (const item of readdirSync(from, { withFileTypes: true })) {
    if (item.name.startsWith('.')) continue;
    if (!item.isFile()) throw new Error(`Expected a regular file: ${directory}/${item.name}`);
    copyFileSync(join(from, item.name), join(to, item.name));
  }
}

function generate(input: string, output: string) {
  const path = input.endsWith('.json') ? input : join(input, 'snapshot.json');
  const snapshot = parseSnapshot(readFileSync(path, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue) throw new Error(issue);

  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'board.json'), JSON.stringify({ rows: board }) + '\n');
  writeFileSync(join(output, 'data.js'), dataScript(radar));
  ship('dashboard', output);
  ship('screenshots', output);

  const dossier = buildDossier(output, {
    text_max_bytes: 65_536,
    screenshots: { max: 4, max_bytes: 524_288 },
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  });
  writeFileSync(join(output, 'dossier.json'), dossier);
  process.stdout.write(`Ranked ${board.length} protocols, including all ${snapshot.watchlist.length} watchlist members.\n`);
}

try {
  const { input, output } = options(process.argv.slice(2));
  generate(input, output);
} catch (error) {
  process.stderr.write(`Token Radar: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

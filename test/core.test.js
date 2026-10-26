import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_INPUT_CHARS,
  parseCommits,
  suggestVersion,
  createNotes,
  createAnnouncement,
} from '../src/core.js';

test('normalizes copied commit bullets and deduplicates case-insensitively', () => {
  const commits = parseCommits(
    '1. feat(ui): Add search\r\n- feat(ui): add search\n* fix: Repair search'
  );
  assert.equal(commits.length, 2);
  assert.deepEqual(commits[0], {
    type: 'feat', scope: 'ui', breaking: false,
    message: 'Add search', category: 'features',
  });
  assert.equal(commits[1].category, 'fixes');
});

test('recognizes breaking markers in headers and trailers', () => {
  const commits = parseCommits(
    'fix(api)!: Remove old endpoint\nfeat: Update API BREAKING CHANGE: incompatible payload'
  );
  assert.equal(commits.length, 2);
  assert.ok(commits.every(commit => commit.breaking));
  assert.equal(commits[1].message, 'Update API');
});

test('accepts standalone BREAKING CHANGE notices', () => {
  const [commit] = parseCommits('BREAKING CHANGE: remove deprecated configuration');
  assert.equal(commit.breaking, true);
  assert.equal(commit.message, 'remove deprecated configuration');
});

test('filters routine maintenance but preserves breaking maintenance', () => {
  const commits = parseCommits(
    'chore: bump packages\nchore!: remove support\nfeat: add export',
    {includeMaintenance: false}
  );
  assert.deepEqual(commits.map(commit => commit.message), [
    'remove support', 'add export',
  ]);
});

test('rejects invalid and oversized commit input', () => {
  assert.throws(() => parseCommits(null), /text/);
  assert.throws(() => parseCommits('x'.repeat(MAX_INPUT_CHARS + 1)), /too long/);
});

test('suggests major, minor, and patch versions using commit severity', () => {
  assert.equal(suggestVersion(parseCommits('fix!: remove API'), '1.2.3'), '2.0.0');
  assert.equal(suggestVersion(parseCommits('feat: add API'), 'v1.2.3'), '1.3.0');
  assert.equal(suggestVersion(parseCommits('docs: update usage'), '1.2.3'), '1.2.4');
  assert.equal(suggestVersion(parseCommits('miscellaneous update'), '1.2.3'), '1.2.3');
});

test('rejects unsupported version formats', () => {
  assert.throws(() => suggestVersion([], '1.2.3-beta'), /version like/);
  assert.throws(() => suggestVersion([], '01.2.3'), /version like/);
});

test('groups release notes by category and strips angle brackets', () => {
  const commits = parseCommits(
    'feat(ui): Add <beta> view\nfix: Repair crash\nchore: Update tooling'
  );
  const notes = createNotes(commits, {version: '1.4.0', title: '<Draft>'});
  assert.match(notes, /^# Draft — 1\.4\.0/);
  assert.match(notes, /### Features\n\n- \*\*ui:\*\* Add beta view/);
  assert.match(notes, /### Fixes\n\n- Repair crash/);
  assert.match(notes, /### Maintenance\n\n- Update tooling/);
  assert.doesNotMatch(notes, /<beta>|<Draft>/);
});

test('allows hiding maintenance in rendered release notes', () => {
  const commits = parseCommits('feat: add search\nchore: bump versions');
  const notes = createNotes(commits, {includeMaintenance: false});
  assert.match(notes, /add search/);
  assert.doesNotMatch(notes, /bump versions/);
});

test('renders a useful empty release note and validates its input', () => {
  assert.match(createNotes([]), /No commit messages were provided/);
  assert.throws(() => createNotes('not a list'), /must be a list/);
});

test('announcements cap feature and fix summaries', () => {
  const commits = parseCommits(
    'feat: one\nfeat: two\nfeat: three\nfeat: four\n' +
    'fix: alpha\nfix: beta\nfix: gamma'
  );
  const announcement = createAnnouncement(commits, '2.0.0');
  assert.match(announcement, /Version 2\.0\.0 is here/);
  assert.match(announcement, /one; two; three — and more/);
  assert.match(announcement, /alpha; beta — and more/);
  assert.doesNotMatch(announcement, /four|gamma/);
});

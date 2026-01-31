// scripts/gen-feature.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

function toSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitle(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileGuarded(filePath, content) {
  if (fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function fileExists(p) {
  return fs.existsSync(p);
}

function addDevEntry(devPagePath, feature) {
  const src = fs.readFileSync(devPagePath, 'utf8');

  // Expect: const embeds = [ ... ];
  const embedsDecl = /const\s+embeds\s*=\s*\[(.|\n|\r)*?\];/m;
  const match = src.match(embedsDecl);
  if (!match) {
    throw new Error(
      `Could not find "const embeds = [ ... ]" in ${devPagePath}. Add it or update generator.`
    );
  }

  // Avoid duplicates by naive check
  if (src.includes(feature.path)) {
    return { changed: false, reason: 'Dev entry already exists.' };
  }

  // Insert before closing ];
  const insertion = `  { name: '${feature.name}', path: '${feature.path}' },\n`;
  const updatedBlock = match[0].replace(/\]\s*;$/, `${insertion}];`);

  if (updatedBlock === match[0]) {
    throw new Error(`Failed to update embeds array in ${devPagePath}`);
  }

  const next = src.replace(match[0], updatedBlock);
  fs.writeFileSync(devPagePath, next, 'utf8');
  return { changed: true };
}

function templateEmbedPage({ title, slug }) {
  const componentName = `${title.replace(/[^a-zA-Z0-9]/g, '')}Page`;
  return `'use client';

import { EmbedShell } from '../_shared/EmbedShell';

export default function ${componentName}() {
  return (
    <EmbedShell title="${title}">
      <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>${title} embed</div>
        <div style={{ opacity: 0.75 }}>
          Starter page at <code>/(embed)/${slug}</code>.
        </div>
      </div>
    </EmbedShell>
  );
}
`;
}

function templateApiRoute({ slug }) {
  return `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: '${slug}',
    data: null,
  });
}
`;
}

async function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

function parseYesNo(input, defaultValue) {
  const v = (input ?? '').trim().toLowerCase();
  if (!v) return defaultValue;
  if (['y', 'yes', 'true', '1'].includes(v)) return true;
  if (['n', 'no', 'false', '0'].includes(v)) return false;
  throw new Error(`Invalid yes/no: "${input}"`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const rawName = await ask(rl, 'Feature name (e.g. "contact-form"): ');
    const slug = toSlug(rawName);
    if (!slug) throw new Error('Feature name is required.');

    const defaultTitle = toTitle(slug);
    const rawTitle = await ask(rl, `Title [${defaultTitle}]: `);
    const title = rawTitle.trim() ? rawTitle.trim() : defaultTitle;

    const rawApi = await ask(rl, 'Include API route? (Y/n): ');
    const includeApi = parseYesNo(rawApi, true);

    const devPagePath = path.join(process.cwd(), 'app', 'dev', 'page.tsx');
    const hasDevPage = fileExists(devPagePath);

    let includeDevEntry = false;
    if (hasDevPage) {
      const rawDev = await ask(rl, 'Add embed to /dev page? (Y/n): ');
      includeDevEntry = parseYesNo(rawDev, true);
    }

    // Paths
    const embedDir = path.join(process.cwd(), 'app', '(embed)', slug);
    const embedPagePath = path.join(embedDir, 'page.tsx');

    const apiDir = path.join(process.cwd(), 'app', 'api', 'features', slug);
    const apiRoutePath = path.join(apiDir, 'route.ts');

    // Guard
    if (fileExists(embedPagePath)) {
      throw new Error(`Embed page already exists: ${embedPagePath}`);
    }
    if (includeApi && fileExists(apiRoutePath)) {
      throw new Error(`API route already exists: ${apiRoutePath}`);
    }

    // Create embed page
    ensureDir(embedDir);
    writeFileGuarded(embedPagePath, templateEmbedPage({ title, slug }));

    // Create API route (optional)
    if (includeApi) {
      ensureDir(apiDir);
      writeFileGuarded(apiRoutePath, templateApiRoute({ slug }));
    }

    // Add dev page entry (optional)
    if (includeDevEntry && hasDevPage) {
      addDevEntry(devPagePath, {
        name: title,
        path: `/${slug}?embedded=true&dense=true`,
      });
    }

    console.log('\n✅ Generated feature:');
    console.log(`- Embed page: ${path.relative(process.cwd(), embedPagePath)}`);
    if (includeApi) {
      console.log(`- API route:  ${path.relative(process.cwd(), apiRoutePath)}`);
    }
    if (includeDevEntry && hasDevPage) {
      console.log(`- /dev entry: added`);
    }

    console.log('\nNext:');
    console.log(`- Visit: /${slug}?embedded=true&dense=true`);
    if (includeApi) console.log(`- API:   /api/features/${slug}`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('\n❌ Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
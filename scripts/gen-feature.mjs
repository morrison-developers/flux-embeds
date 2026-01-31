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

function findMatchingDivClose(src, openTagIndex) {
  // openTagIndex should point at the start of an opening "<div"
  let i = openTagIndex;
  let depth = 0;

  while (i < src.length) {
    const nextOpen = src.indexOf('<div', i);
    const nextClose = src.indexOf('</div>', i);

    if (nextOpen === -1 && nextClose === -1) break;

    if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }

    if (nextClose !== -1) {
      depth -= 1;
      if (depth === 0) {
        return nextClose;
      }
      i = nextClose + 6;
      continue;
    }
  }

  return -1;
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

function addLandingEntry(landingPagePath, feature) {
  const src = fs.readFileSync(landingPagePath, 'utf8');

  // Avoid duplicates by naive check
  if (src.includes(`href="${feature.path}"`) || src.includes(`href='${feature.path}'`)) {
    return { changed: false, reason: 'Landing entry already exists.' };
  }

  const builtMarker = 'Built so far';
  const builtIdx = src.indexOf(builtMarker);
  if (builtIdx === -1) {
    throw new Error(
      `Could not find "${builtMarker}" section in ${landingPagePath}. Update generator or landing markup.`
    );
  }

  const gridMarker = '<div className="grid gap-2">';
  const gridIdx = src.indexOf(gridMarker, builtIdx);
  if (gridIdx === -1) {
    throw new Error(
      `Could not find Built-so-far links grid (${gridMarker}) in ${landingPagePath}.`
    );
  }

  const closeIdx = findMatchingDivClose(src, gridIdx);
  if (closeIdx === -1) {
    throw new Error(`Failed to locate closing </div> for built-so-far grid in ${landingPagePath}`);
  }

  const insertion = `
                  <a
                    href="${feature.path}"
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span>${feature.name}</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      ${feature.path}
                    </span>
                  </a>
`;

  const next = src.slice(0, closeIdx) + insertion + src.slice(closeIdx);
  fs.writeFileSync(landingPagePath, next, 'utf8');
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

    const landingPagePath = path.join(process.cwd(), 'app', 'page.tsx');
    const hasLandingPage = fileExists(landingPagePath);

    let includeLandingEntry = false;
    if (hasLandingPage) {
      const rawLanding = await ask(rl, 'Add embed to landing page list? (Y/n): ');
      includeLandingEntry = parseYesNo(rawLanding, true);
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

    // Add landing page entry (optional)
    if (includeLandingEntry && hasLandingPage) {
      addLandingEntry(landingPagePath, {
        name: `${title} embed`,
        path: `/${slug}`,
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
    if (includeLandingEntry && hasLandingPage) {
      console.log(`- landing entry: added`);
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
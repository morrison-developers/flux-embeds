import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

type Answers = {
  featureName: string; // slug
  title: string;
  includeApi: boolean;
  includeDevEntry: boolean;
};

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitle(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileGuarded(filePath: string, content: string) {
  if (fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function fileExists(p: string) {
  return fs.existsSync(p);
}

function addDevEntry(devPagePath: string, feature: { name: string; path: string }) {
  const src = fs.readFileSync(devPagePath, 'utf8');

  // Expect something like: const embeds = [ ... ];
  const embedsDecl = /const\s+embeds\s*=\s*\[(.|\n|\r)*?\];/m;
  const match = src.match(embedsDecl);
  if (!match) {
    throw new Error(
      `Could not find "const embeds = [ ... ]" in ${devPagePath}. Add it or update generator.`
    );
  }

  // Insert before closing ];
  const insertion = `  { name: '${feature.name}', path: '${feature.path}' },\n`;
  const updated = match[0].replace(/\]\s*;$/, `${insertion}];`);

  if (updated === match[0]) {
    throw new Error(`Failed to update embeds array in ${devPagePath}`);
  }

  // Avoid duplicates by naive check
  if (src.includes(feature.path)) {
    return { changed: false, reason: 'Dev entry already exists.' };
  }

  const next = src.replace(match[0], updated);
  fs.writeFileSync(devPagePath, next, 'utf8');
  return { changed: true };
}

function templateEmbedPage(opts: { title: string; slug: string }) {
  return `'use client';

import { EmbedShell } from '../_shared/EmbedShell';

export default function ${opts.title.replace(/\s/g, '')}Page() {
  return (
    <EmbedShell title="${opts.title}">
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>${opts.title} embed</div>
        <div style={{ opacity: 0.75 }}>
          Starter page at <code>/(embed)/${opts.slug}</code>.
        </div>
      </div>
    </EmbedShell>
  );
}
`;
}

function templateApiRoute(opts: { slug: string }) {
  return `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    feature: '${opts.slug}',
    data: null,
  });
}
`;
}

async function ask(rl: readline.Interface, q: string) {
  return new Promise<string>((resolve) => rl.question(q, resolve));
}

function yes(input: string, defaultValue: boolean) {
  const v = input.trim().toLowerCase();
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
    const includeApi = yes(rawApi, true);

    const devPagePath = path.join(process.cwd(), 'app', 'dev', 'page.tsx');
    const hasDevPage = fileExists(devPagePath);
    let includeDevEntry = false;

    if (hasDevPage) {
      const rawDev = await ask(rl, 'Add embed to /dev page? (Y/n): ');
      includeDevEntry = yes(rawDev, true);
    }

    const answers: Answers = { featureName: slug, title, includeApi, includeDevEntry };

    // Paths
    const embedDir = path.join(process.cwd(), 'app', '(embed)', answers.featureName);
    const embedPagePath = path.join(embedDir, 'page.tsx');

    const apiDir = path.join(process.cwd(), 'app', 'api', 'features', answers.featureName);
    const apiRoutePath = path.join(apiDir, 'route.ts');

    // Guard: prevent duplicates
    if (fileExists(embedPagePath)) {
      throw new Error(`Embed page already exists: ${embedPagePath}`);
    }
    if (answers.includeApi && fileExists(apiRoutePath)) {
      throw new Error(`API route already exists: ${apiRoutePath}`);
    }

    // Create embed page
    ensureDir(embedDir);
    writeFileGuarded(embedPagePath, templateEmbedPage({ title: answers.title, slug }));

    // Create API route (optional)
    if (answers.includeApi) {
      ensureDir(apiDir);
      writeFileGuarded(apiRoutePath, templateApiRoute({ slug }));
    }

    // Add dev page entry (optional)
    if (answers.includeDevEntry && hasDevPage) {
      const devResult = addDevEntry(devPagePath, {
        name: answers.title,
        path: `/${slug}?embedded=true&dense=true`,
      });

      if (devResult.changed) {
        // ok
      }
    }

    console.log('\n✅ Generated feature:');
    console.log(`- Embed page: ${path.relative(process.cwd(), embedPagePath)}`);
    if (answers.includeApi) {
      console.log(`- API route:  ${path.relative(process.cwd(), apiRoutePath)}`);
    }
    if (answers.includeDevEntry && hasDevPage) {
      console.log(`- /dev entry: added`);
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('\n❌ Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
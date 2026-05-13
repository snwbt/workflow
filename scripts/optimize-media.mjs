import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const mediaDir = path.join(process.cwd(), 'public', 'media');
const supported = new Set(['.jpg', '.jpeg', '.png']);

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function optimizeFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (!supported.has(ext)) return null;

  const source = path.join(mediaDir, fileName);
  const output = path.join(mediaDir, `${path.basename(fileName, ext)}.webp`);

  if (await fileExists(output)) {
    return { fileName, skipped: true };
  }

  await sharp(source)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(output);

  const [sourceStat, outputStat] = await Promise.all([fs.stat(source), fs.stat(output)]);
  return {
    fileName,
    output: path.basename(output),
    savedBytes: sourceStat.size - outputStat.size,
  };
}

async function main() {
  const requested = process.argv.slice(2);
  const files = requested.length > 0 ? requested : await fs.readdir(mediaDir);
  const results = (await Promise.all(files.map(optimizeFile))).filter(Boolean);

  for (const result of results) {
    if (result.skipped) {
      console.log(`skipped ${result.fileName}`);
    } else {
      console.log(`wrote ${result.output} (${Math.round(result.savedBytes / 1024)} KB saved)`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

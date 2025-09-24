import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

if (process.argv.length < 4) {
  console.error('Usage: node generate-provenance.mjs <sha256sum-file> <output>');
  process.exit(1);
}

const [digestFile, outputFile] = process.argv.slice(2);
const digestLine = readFileSync(digestFile, 'utf8').trim();

if (!digestLine) {
  console.error('Digest file is empty.');
  process.exit(1);
}

const [digest, filePath] = digestLine.split(/\s+/);

if (!digest || !filePath) {
  console.error('Digest file is not in expected "<hash> <file>" format.');
  process.exit(1);
}

const now = new Date().toISOString();

const provenance = {
  _type: 'https://slsa.dev/provenance/v1',
  subject: [
    {
      name: basename(filePath),
      digest: {
        sha256: digest,
      },
    },
  ],
  buildDefinition: {
    buildType: 'https://github.com/cupbear/ci-compliance/node-build',
    externalParameters: {
      command: 'npm run build',
    },
    resolvedDependencies: [],
  },
  runDetails: {
    builder: {
      id: 'https://github.com/actions/runner',
    },
    metadata: {
      invocationId: process.env.GITHUB_RUN_ID ?? 'local-run',
      startedOn: now,
      finishedOn: now,
    },
    byproducts: [],
  },
};

writeFileSync(outputFile, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');

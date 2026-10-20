const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const PDFDocument = require('pdfkit');
const { generateDataset } = require('../scripts/evaluation/generateDataset');
const { createFixture } = require('../scripts/evaluation/lib/evaluatorFixtures');

const dataset = generateDataset();
let fixture, controller, baseline, credential, directory;
const saved = new Map();
function mock(name, exports) {
  const id = require.resolve(name);
  saved.set(id, require.cache[id]);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
async function pdf(text, title = 'Controlled source certificate') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ info: { Title: title }, compress: false });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(9).text(text); doc.end();
  });
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceText = (overrides = {}) => {
  const fields = { ...credential, ...overrides };
  return [fields.id, fields.student_name, fields.student_number, fields.programme,
    fields.qualification, fields.classification, fields.issue_date].join('\n');
};
async function invoke(handler, bytes, params = {}) {
  const req = { params, body: {}, ip: '127.0.0.1', get: () => 'controlled-objective-test' };
  if (bytes) {
    const filePath = path.join(directory, `${randomUUID()}.pdf`);
    await fs.writeFile(filePath, bytes);
    req.file = { path: filePath };
  }
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await controller[handler](req, res);
  assert.equal(res.statusCode, 200);
  return res.body.data;
}
test.before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'verifyzw-objective-pdf-'));
  const base = dataset.credentials[0];
  fixture = await createFixture({ ...base, id: '123e4567-e89b-42d3-a456-426614174000',
    programmeCode: 'Civil Engineering', qualification: 'Bachelor of Engineering',
    accreditation: { ...base.accreditation, programmeCode: 'Civil Engineering' },
  }, dataset.metadata.referenceTime);
  credential = fixture.input.credential;
  credential.student_name = 'Tendai Moyo';
  credential.public_token = '223e4567-e89b-42d3-a456-426614174000';
  credential.classification = 'Upper Second Class';
  baseline = await pdf(sourceText());
  credential.certificate_hash = hash(baseline);
  fixture.input.certificateHash = credential.certificate_hash;
  mock('../backend/models/verificationModel', {
    findCredentialByHashForVerification: async value => value === credential.certificate_hash ? credential : null,
    findCredentialByIdForVerification: async value => value === credential.id ? credential : null,
    findCredentialByPublicToken: async value => value === credential.public_token ? credential : null,
    findCredentialsByStudentNumberForVerification: async value => value === credential.student_number ? [credential] : [],
    createVerificationLog: async () => {},
  });
  mock('../backend/models/auditModel', { createAuditLog: async () => {} });
  mock('../backend/services/verificationService', { verifyCredentialState: input =>
    fixture.evaluators.full.verifyCredentialState({ ...input, verificationTime: dataset.metadata.referenceTime }) });
  mock('../backend/services/pdfStructureAnalysisService', {
    fetchOfficialPdf: async () => ({ available: true, bytes: new Uint8Array(baseline) }),
    analysePdfStructureAgainstOfficial: async () => ({ analysisAvailable: false, reason: 'STRUCTURE_NOT_UNDER_TEST' }),
  });
  for (const name of ['../backend/services/tamperAnalysisService', '../backend/services/pdfCredentialResolutionService', '../backend/controllers/verificationController']) {
    const id = require.resolve(name); saved.set(id, require.cache[id]); delete require.cache[id];
  }
  controller = require('../backend/controllers/verificationController');
});
test.after(async () => {
  for (const [id, value] of saved) { if (value) require.cache[id] = value; else delete require.cache[id]; }
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test('real source PDF exact SHA-256 verifies through PDF-only controller with full signed evaluator', async () => {
  const before = fixture.calls.chain;
  const result = await invoke('verifyFile', baseline);
  assert.equal(result.result, 'VERIFIED');
  assert.equal(hash(baseline), credential.certificate_hash);
  assert.equal(fixture.calls.chain, before + 1);
});
for (const field of ['student_name','student_number','programme','qualification','classification','issue_date']) {
  test(`real PDF-only ${field} modification is TAMPERED with exact field localisation`, async () => {
    const modified = await pdf(sourceText({ [field]: 'CONTROLLED CHANGED VALUE' }));
    const result = await invoke('verifyFile', modified);
    assert.equal(result.result, 'TAMPERED');
    assert.deepEqual(result.tamperAnalysis.alteredFields.map(f => f.field), [field]);
    assert.equal(result.tamperAnalysis.fields.find(f => f.field === 'institution_name').status, 'NOT_ASSESSABLE');
  });
}
test('real PDF-only multiple-field modification localises the exact set', async () => {
  const result = await invoke('verifyFile', await pdf(sourceText({ student_name: 'Changed Name', programme: 'Changed Programme' })));
  assert.equal(result.result, 'TAMPERED');
  assert.deepEqual(result.tamperAnalysis.alteredFields.map(f => f.field).sort(), ['programme','student_name']);
});
test('real PDF metadata-only modification is TAMPERED without false altered fields', async () => {
  const result = await invoke('verifyFile', await pdf(sourceText(), 'Changed metadata'));
  assert.equal(result.result, 'TAMPERED');
  assert.deepEqual(result.tamperAnalysis.alteredFields, []);
});
test('unrelated real PDF remains UNKNOWN rather than TAMPERED', async () => {
  const result = await invoke('verifyFile', await pdf('An unrelated gardening document with no credential identifiers.'));
  assert.equal(result.result, 'UNKNOWN');
});
test('real source and modified PDFs use the same ID and public-token verification paths', async () => {
  for (const [handler, params] of [['verifyCredentialFile', {id: credential.id}], ['verifyPublicTokenFile', {publicToken: credential.public_token}]]) {
    assert.equal((await invoke(handler, baseline, params)).result, 'VERIFIED');
    assert.equal((await invoke(handler, await pdf(sourceText({ student_name: 'Changed Name' })), params)).result, 'TAMPERED');
  }
});
test('ID and public-token lookups verify registered state without claiming a file hash match', async () => {
  for (const [handler, params] of [['verifyCredentialId', {id: credential.id}], ['verifyPublicToken', {publicToken: credential.public_token}]]) {
    const result = await invoke(handler, null, params);
    assert.equal(result.result, 'VERIFIED');
    assert.notEqual(result.integrity?.matchesOfficialHash, true);
  }
});

test('institution modification is localised when the source PDF actually prints the institution', async () => {
  const previous = baseline;
  const text = sourceText() + '\n' + credential.institution_name;
  try {
    baseline = await pdf(text);
    credential.certificate_hash = hash(baseline);
    const result = await invoke('verifyFile', await pdf(sourceText() + '\nChanged Institution'));
    assert.equal(result.result, 'TAMPERED');
    assert.deepEqual(result.tamperAnalysis.alteredFields.map(f => f.field), ['institution_name']);
  } finally {
    baseline = previous;
    credential.certificate_hash = hash(baseline);
  }
});

test('presentation PDF visibly retains the source credential ID and public-token URL', async () => {
  const { generatePresentationCertificate } = require('../backend/services/certificatePdfService');
  const { extractPdfText } = require('../backend/services/tamperAnalysisService');
  const previous = process.env.FRONTEND_PUBLIC_URL;
  process.env.FRONTEND_PUBLIC_URL = 'http://localhost:5173';
  try {
    const sourceHash = credential.certificate_hash;
    const generated = await generatePresentationCertificate(credential, { outputDirectory: directory });
    const text = await extractPdfText(generated.outputPath);
    assert.ok(text.includes(credential.id));
    assert.ok(text.includes(credential.public_token));
    assert.equal(generated.verificationUrl, `http://localhost:5173/verify/token/${credential.public_token}`);
    assert.equal(credential.certificate_hash, sourceHash);
    assert.notEqual(hash(await fs.readFile(generated.outputPath)), sourceHash);
  } finally {
    if (previous === undefined) delete process.env.FRONTEND_PUBLIC_URL;
    else process.env.FRONTEND_PUBLIC_URL = previous;
  }
});

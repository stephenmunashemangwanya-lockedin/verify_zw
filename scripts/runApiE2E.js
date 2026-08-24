const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { Client, Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { ContractFactory, JsonRpcProvider, Wallet } = require("ethers");

require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const liveName = String(process.env.DB_NAME || "").trim();
const testName = String(process.env.TEST_DB_NAME || "").trim();
const productionName = String(process.env.PRODUCTION_DB_NAME || "").trim();
const fail = (message) => { throw new Error(`API E2E safety guard: ${message}`); };
if (!testName) fail("TEST_DB_NAME is required.");
if (!/_test$/.test(testName)) fail("TEST_DB_NAME must end exactly in _test.");
if (testName === liveName) fail("TEST_DB_NAME must differ from DB_NAME.");
if (productionName && testName === productionName) fail("TEST_DB_NAME must differ from PRODUCTION_DB_NAME.");
if (process.env.NODE_ENV === "production" || String(process.env.BLOCKCHAIN_NETWORK).toLowerCase() === "sepolia") fail("production and Sepolia are forbidden.");

const testConfig = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 5432),
  database: testName,
  user: process.env.TEST_DB_USER || process.env.DB_USER,
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
};
Object.assign(process.env, { DB_HOST:testConfig.host, DB_PORT:String(testConfig.port), DB_NAME:testName, DB_USER:testConfig.user, DB_PASSWORD:testConfig.password, NODE_ENV:"test", BLOCKCHAIN_NETWORK:"localhost", BLOCKCHAIN_CHAIN_ID:"31337", BLOCKCHAIN_RPC_URL:"http://127.0.0.1:18545", BLOCK_CONFIRMATIONS:"1", FRONTEND_PUBLIC_URL:"http://127.0.0.1:4173", AUTH_RETURN_BEARER_TOKEN:"true" });

let nodeProcess; let server; let pool; const generated = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const request = async (base, route, options = {}, expected = 200) => {
  const response = await fetch(base + route, options); const body = await response.json();
  assert.equal(response.status, expected, `${options.method || "GET"} ${route}: ${JSON.stringify(body)}`); return body;
};
const auth = (token, extra = {}) => ({ ...extra, authorization:`Bearer ${token}` });

const ensureDatabase = async () => {
  const admin = new Client({ ...testConfig, database:process.env.TEST_DB_ADMIN_NAME || "postgres" }); await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [testName]);
  if (!exists.rowCount) {
    if (process.env.CREATE_TEST_DB !== "true") fail(`database ${testName} does not exist. Create it safely with: CREATE DATABASE ${testName};`);
    await admin.query(`CREATE DATABASE "${testName}"`);
  }
  await admin.end();
};
const prepareSchema = async () => {
  pool = new Pool(testConfig);
  await pool.query(fs.readFileSync(path.resolve(__dirname,"../test/fixtures/e2eBaseSchema.sql"),"utf8"));
  for (const file of fs.readdirSync(path.resolve(__dirname,"../backend/database/migrations")).filter(x=>x.endsWith(".sql")).sort()) await pool.query(fs.readFileSync(path.resolve(__dirname,"../backend/database/migrations",file),"utf8"));
  await pool.query("TRUNCATE audit_logs, verification_logs, credentials, students, users, institutions RESTART IDENTITY CASCADE");
};
const startChain = async () => {
  const cli=require.resolve("hardhat/internal/cli/cli.js"); nodeProcess=spawn(process.execPath,[cli,"node","--port","18545"],{cwd:path.resolve(__dirname,".."),windowsHide:true,stdio:["ignore","pipe","pipe"]});
  let key; const inspect=(chunk)=>{const match=chunk.toString().match(/Private Key:\s*(0x[0-9a-fA-F]{64})/);if(match&&!key)key=match[1]};nodeProcess.stdout.on("data",inspect);nodeProcess.stderr.on("data",inspect);
  const provider=new JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL); for(let i=0;i<80;i++){try{if(Number((await provider.getNetwork()).chainId)===31337&&key)break}catch{}await wait(250)} assert.ok(key,"local Hardhat signer was not available");
  process.env.DEPLOYER_PRIVATE_KEY=key; const signer=new Wallet(key,provider); const artifact=require("../artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json"); const contract=await new ContractFactory(artifact.abi,artifact.bytecode,signer).deploy(signer.address);await contract.waitForDeployment();process.env.CONTRACT_ADDRESS=await contract.getAddress();return signer.address;
};

(async()=>{
  await ensureDatabase(); await prepareSchema(); const signerAddress=await startChain();
  const password="E2E-only!Passphrase-2026"; const passwordHash=await bcrypt.hash(password,4);
  await pool.query("INSERT INTO users(full_name,email,password_hash,role,is_active) VALUES($1,$2,$3,'super_admin',true)",["E2E Administrator","admin@e2e.example.test",passwordHash]);
  const ipfsPath=require.resolve("../backend/services/ipfsService"); require.cache[ipfsPath]={id:ipfsPath,filename:ipfsPath,loaded:true,exports:{uploadFileToIPFS:async()=>({cid:"QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe",provider:"mock-e2e",pinned:true,gatewayUrl:null}),validateCid:()=>true,checkPinStatus:async()=>({pinned:true})}};
  const {createApp}=require("../backend/app"); server=createApp().listen(0,"127.0.0.1"); await new Promise(resolve=>server.once("listening",resolve)); const base=`http://127.0.0.1:${server.address().port}`;
  const login=await request(base,"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"admin@e2e.example.test",password})}); const token=login.token;
  const institution=(await request(base,"/api/institutions",{method:"POST",headers:auth(token,{"content-type":"application/json"}),body:JSON.stringify({name:"E2E Test University",walletAddress:signerAddress,email:"registry@e2e.example.test"})},201)).institution;
  await request(base,`/api/institutions/${institution.id}/blockchain/authorise`,{method:"POST",headers:auth(token)},200);
  const student=(await request(base,"/api/students",{method:"POST",headers:auth(token,{"content-type":"application/json"}),body:JSON.stringify({studentNumber:"E2E-0001",fullName:"Synthetic Test Student",email:"student@e2e.example.test",programme:"Test Engineering",institutionId:institution.id})},201)).student;
  const certificate=Buffer.from("%PDF-1.4\nSynthetic Stage 23 E2E certificate\n%%EOF"); const form=new FormData();form.append("studentId",student.id);form.append("institutionId",institution.id);form.append("qualification","E2E Test Qualification");form.append("issueDate","2026-08-04");form.append("certificate",new Blob([certificate],{type:"application/pdf"}),"certificate.pdf");
  const issued=await request(base,"/api/credentials/issue",{method:"POST",headers:auth(token),body:form},201); assert.equal(issued.credential.status,"active");assert.equal(issued.blockchain.confirmed,true);assert.ok(issued.credential.qr_code_path);generated.push(issued.credential.qr_code_path);
  const hash=issued.file.certificateHash; const verified=await request(base,`/api/verify/hash/${hash}`);assert.equal(verified.data.result,"VERIFIED");
  const pdf=await request(base,`/api/credentials/${issued.credential.id}/generate-pdf`,{method:"POST",headers:auth(token)});generated.push(`output/pdf/${pdf.pdf.filename}`);
  const revoked=await request(base,`/api/credentials/${issued.credential.id}/revoke`,{method:"PATCH",headers:auth(token,{"content-type":"application/json"}),body:JSON.stringify({reason:"Synthetic E2E revocation"})});assert.equal(revoked.credential.status,"revoked");
  const checked=await request(base,`/api/verify/hash/${hash}`);assert.equal(checked.data.result,"REVOKED");
  const audits=await request(base,"/api/audit-logs?limit=100",{headers:auth(token)});assert.ok(audits.auditLogs.length>0);
  const dashboard=await request(base,"/api/dashboard/summary",{headers:auth(token)});assert.equal(dashboard.success,true);
  const during={};for(const table of ["users","institutions","students","credentials","verification_logs","audit_logs"]){during[table]=(await pool.query(`SELECT COUNT(*)::int count FROM ${table}`)).rows[0].count}
  await pool.query("TRUNCATE audit_logs, verification_logs, credentials, students, users, institutions RESTART IDENTITY CASCADE"); const after={};for(const table of ["users","institutions","students","credentials","verification_logs","audit_logs"]){after[table]=(await pool.query(`SELECT COUNT(*)::int count FROM ${table}`)).rows[0].count}assert.ok(Object.values(after).every(value=>value===0));
  console.log(JSON.stringify({passed:11,database:testName,chainId:31337,ipfs:"mocked",during,afterCleanup:after},null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(pool){await pool.query("TRUNCATE audit_logs, verification_logs, credentials, students, users, institutions RESTART IDENTITY CASCADE").catch(()=>{});await pool.end()}if(nodeProcess)nodeProcess.kill();for(const relative of generated.filter(Boolean)){await fs.promises.unlink(path.resolve(__dirname,"..",relative)).catch(()=>{})}});

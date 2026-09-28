import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { getWarningPolicy, persistWarningPolicy, acknowledgedRequest, acknowledgeWarning } from '../src/server/time-reliability';
import { defaultWarningPolicy } from '../src/lib/time-reliability';
const url = new URL(process.env.DATABASE_URL ?? 'http://missing');
if(url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/b1_reliability') throw new Error('Isolated B1 test database required');

test('real PostgreSQL: policy/audit atomicity, fallback and acknowledgement isolation', async () => {
  const find = db.analysisTimePolicy.findFirst;
  db.analysisTimePolicy.findFirst = (async () => {throw new Error('offline');}) as unknown as typeof find;
  assert.deepEqual(await getWarningPolicy(), {...defaultWarningPolicy,fallback:true});
  db.analysisTimePolicy.findFirst = find;
  const a=await db.user.upsert({where:{email:'b1-a@example.invalid'},update:{role:'ADMIN'},create:{email:'b1-a@example.invalid',role:'ADMIN'}});
  const b=await db.user.upsert({where:{email:'b1-b@example.invalid'},update:{},create:{email:'b1-b@example.invalid'}});
  for(const [userId,token] of [[a.id,'b1-session-a'],[b.id,'b1-session-b']]) await db.session.upsert({where:{sessionToken:token},update:{expires:new Date(Date.now()+86400000)},create:{sessionToken:token,userId,expires:new Date(Date.now()+86400000)}});
  const previous=await getWarningPolicy();
  const minutes = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number);
  const now=minutes[0]*60+minutes[1];
  const format=(m:number)=>`${String(Math.floor(((m+1440)%1440)/60)).padStart(2,'0')}:${String((m+1440)%60).padStart(2,'0')}`;
  const policy=await persistWarningPolicy('test-admin',format(now-60),format(now+60));
  const audit=await db.analysisPolicyAudit.findUniqueOrThrow({where:{policyVersion:policy.version}});
  assert.deepEqual(audit.previousValue,{version:previous.version,timezone:previous.timezone,warningStart:previous.warningStart,warningEnd:previous.warningEnd});
  assert.deepEqual(audit.newValue,policy);assert.equal(audit.actor,'test-admin');
  assert.equal((await getWarningPolicy()).version,policy.version);
  await assert.rejects(persistWarningPolicy('test-admin','12:00','12:00'));
  const request=await acknowledgeWarning(a.id,'gold_melted',policy.version);assert.ok(request);
  assert.equal(await acknowledgedRequest(a.id,request!,'gold_melted',policy.version),true);
  assert.equal(await acknowledgedRequest(b.id,request!,'gold_melted',policy.version),false);
  assert.equal(await acknowledgedRequest(a.id,request!,'usd',policy.version),false);
  assert.equal(await acknowledgedRequest(null,request!,'gold_melted',policy.version),false);
  const record=await db.analysisAcknowledgement.findUniqueOrThrow({where:{requestId:request!}});assert.equal(record.reportId,null);
  const second=await persistWarningPolicy('test-admin',policy.warningStart,policy.warningEnd);
  assert.equal(await acknowledgedRequest(a.id,request!,'gold_melted',second.version),false);
  await assert.rejects(acknowledgeWarning(a.id,'gold_melted',policy.version));
  // A forced audit failure must roll back the policy write too.
  const policyCount=await db.analysisTimePolicy.count();
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION b1_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER b1_audit_failure BEFORE INSERT ON "AnalysisPolicyAudit" FOR EACH ROW EXECUTE FUNCTION b1_reject_audit()`);
  try {await assert.rejects(persistWarningPolicy('test-admin','22:00','09:00'));assert.equal(await db.analysisTimePolicy.count(),policyCount);}
  finally {await db.$executeRawUnsafe('DROP TRIGGER b1_audit_failure ON "AnalysisPolicyAudit"');await db.$executeRawUnsafe('DROP FUNCTION b1_reject_audit()');}
  await db.$disconnect();
});

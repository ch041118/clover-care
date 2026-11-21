import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as wait} from 'node:timers/promises';
import {digest} from '../lib/auth.mjs';
import {EarlyCompletionConfirmation, transition} from '../lib/scheduler.mjs';
import {createDemoStore} from '../mobile/demo-store.mjs';

const minute = 60_000;
const start = Date.parse('2026-10-01T15:00:00+09:00');
const scheduledEnd = start + 60 * minute;
const appointment = (at = start) => ({
  id:'visit', elderId:'elder', caregiverId:'carer', service:'생활 도움',
  status:'confirmed', start:at, duration:60, revision:2, events:[]
});
const complete = {id:'visit', action:'complete'};
const confirmation = {confirmEarlyCompletion:true, revision:2};

test('조기 완료 확인을 요청하지만 명시적으로 확인하기 전에는 변경하지 않는다', () => {
  const r=appointment(), now=start+30*minute, db={requests:[r]};
  for (const body of [{}, {...confirmation,confirmEarlyCompletion:'true'}]) {
    assert.throws(() => transition(db,r,'complete',body,now), error => {
      assert.ok(error instanceof EarlyCompletionConfirmation);
      assert.deepEqual(error.earlyCompletionConfirmation,{scheduledEnd,revision:2});
      return true;
    });
    assert.deepEqual(r,appointment());
  }
});

test('조기 완료를 확인하면 예정은 유지하고 완료 처리 시각과 이력을 남긴다', () => {
  const r=appointment(), now=start+30*minute, db={requests:[r]};
  transition(db,r,'complete',confirmation,now);
  assert.equal(r.status,'completed');
  assert.equal(r.completedAt,now);
  assert.equal(r.start,start);
  assert.equal(r.duration,60);
  assert.equal(r.revision,3);
  assert.equal(r.events.length,1);
  assert.equal(r.events[0].at,now);
  assert.match(r.events[0].message,/일찍/);
  assert.throws(() => transition(db,r,'complete',confirmation,now),/현재 상태/);
  assert.equal(r.events.length,1);
});

test('예정 종료 시각부터 바로 완료하지만 지난 일정 버전의 확인은 거절한다', () => {
  const r=appointment(), db={requests:[r]};
  assert.throws(() => transition(db,r,'complete',{...confirmation,revision:1},scheduledEnd),/일정이 변경/);
  assert.deepEqual(r,appointment());
  transition(db,r,'complete',{},scheduledEnd);
  assert.equal(r.status,'completed');
  assert.equal(r.completedAt,scheduledEnd);
  assert.equal(r.events[0].message,'돌봄을 완료했습니다.');
});

test('기기 내 체험 모드도 확인 전에는 저장하지 않는다', async () => {
  const r=appointment(Date.now()-30*minute);
  const saved=[];
  const demo=createDemoStore({requests:[r],elders:[],caregivers:[]},next=>saved.push(next));
  await assert.rejects(demo.request('action',complete),{
    status:409, earlyCompletionConfirmation:{scheduledEnd:r.start+60*minute,revision:2}
  });
  assert.equal(saved.length,0);
  const completed=await demo.request('action',{...complete,...confirmation});
  assert.equal(completed.status,'completed');
  assert.equal(saved.length,1);
});

test('완료 API는 담당 보호사만 허용하고, 확인 응답만 보낼 때는 저장하지 않는다', async () => {
  const dir=await mkdtemp(join(tmpdir(),'clover-early-completion-'));
  const file=join(dir,'state.json');
  const tokens=['a','b'].map(value=>value.repeat(64));
  const now=Date.now(), r=appointment(now-30*minute);
  const db={
    requests:[r],
    caregivers:[{id:'carer',name:'담당 보호사'},{id:'other',name:'다른 보호사'}],
    elders:[{id:'elder',name:'가상 어르신',wellnessEnabled:false}],
    accounts:['carer','other'].map(id=>({id,role:'caregiver',caregiverId:id,approvalStatus:'approved'})),
    sessions:tokens.map((token,i)=>({hash:digest(token),userId:i?'other':'carer',role:'caregiver',expiresAt:now+60*minute}))
  };
  let child;
  try {
    await writeFile(file,JSON.stringify(db));
    // serverConfig requires a nonzero port.
    const port=44000+Math.floor(Math.random()*8000);
    const base='http://127.0.0.1:'+port;
    child=spawn(process.execPath,['server.mjs'],{
      env:{...process.env,CLOVER_DATA_DIR:dir,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:'',NODE_ENV:'test'},
      stdio:'ignore'
    });
    let ready=false;
    for(let i=0;i<100 && child.exitCode===null;i++){
      try { if ((await fetch(base+'/api/health')).ok) {ready=true;break;} } catch {}
      await wait(50);
    }
    assert.ok(ready,'HTTP test server did not start');
    const post=async (body,token=tokens[0]) => {
      const response=await fetch(base+'/api/action',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)
      });
      return {status:response.status,data:await response.json()};
    };
    const before=await readFile(file,'utf8');
    const preview=await post(complete);
    assert.equal(preview.status,409);
    assert.deepEqual(preview.data.earlyCompletionConfirmation,{scheduledEnd:r.start+60*minute,revision:2});
    assert.equal((await post({...complete,...confirmation},tokens[1])).status,403);
    assert.equal((await post({...complete,...confirmation,revision:1})).status,400);
    assert.equal(await readFile(file,'utf8'),before);
    const completed=await post({...complete,...confirmation});
    assert.equal(completed.status,200);
    assert.equal(completed.data.status,'completed');
    assert.ok(completed.data.completedAt>=now && completed.data.completedAt<r.start+60*minute);
    const saved=JSON.parse(await readFile(file,'utf8')).requests[0];
    assert.equal(saved.completedAt,completed.data.completedAt);
    assert.equal(saved.events.length,1);
  } finally {
    if(child && child.exitCode===null && child.signalCode===null){
      const exited=once(child,'exit');child.kill();await exited;
    }
    await rm(dir,{recursive:true,force:true});
  }
});

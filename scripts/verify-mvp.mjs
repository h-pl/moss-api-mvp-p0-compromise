import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
const cache = new Map();
function load(path) {
  const file = ['.ts','.tsx',''].map(ext=>resolve(path+ext)).find(existsSync);
  if(cache.has(file))return cache.get(file).exports;
  const compiled = new Module(file); cache.set(file,compiled);
  const nativeRequire = createRequire(file);
  compiled.require = id=>id.startsWith('.')?load(resolve(dirname(file),id)):nativeRequire(id);
  compiled._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,file);
  return compiled.exports;
}
const policy=load('app/v3/mvp-policy');
const {initialMembers}=load('app/v3/data');
const {enterpriseContractModels:models,enterpriseCredentialMockKeys}=load('app/v3/enterprise-resource-data');
const {capacityFor,capacityLevel,capacitySamples,capacityLimitState,capacityLimitLabel}=load('app/v3/mvp-capacity');
const fixtures=load('app/v3/mvp-fixtures');
const usage=load('app/v3/usage8-data');
const billing=load('app/v3/mvp-billing-data');
const [owner,admin,developer]=initialMembers;
const keys=enterpriseCredentialMockKeys(developer).map(key=>({...key,status:key.status==='轮换中'?'有效':key.status}));

test('Selected billing and usage pages replace the retired comparisons',()=>{
  assert.deepEqual(policy.mvpViews,['keys','billing3','usage3','enterprise']);
  assert.deepEqual(policy.mvpCredentialTabs.map(tab=>tab.id),['keys']);
  assert.deepEqual(policy.mvpBillingTabs.map(tab=>tab.id),['billing3','usage3']);
  assert.deepEqual(policy.mvpRoles,['Owner','Admin','Developer']);
  for(const route of ['enterprise'])assert.ok(policy.mvpEnterpriseTabs.some(tab=>tab.id===route));
  assert.equal(policy.canMvp('Developer','billing3'),false); assert.equal(policy.canMvp('Developer','usage3'),true); assert.equal(policy.canMvp('Admin','billing3'),true);
  assert.equal(policy.canMvp('Developer','billing2'),false); assert.equal(policy.canMvp('Developer','enterprise'),false);
  assert.equal(policy.canMvp('Developer','usage9'),false); assert.equal(policy.canMvp('Finance','usage9'),false);
});
test('Selected API credentials has one canonical route and preserves resource summary order',()=>{
  const {retiredViewAliases}=load('app/v3/page-navigation');
  assert.equal(retiredViewAliases.keys2,'keys');
  assert.ok(policy.mvpViews.includes('keys'));
  assert.ok(!policy.mvpViews.includes('keys2'));
  for(const role of ['Owner','Admin','Developer'])assert.ok(policy.canMvp(role,'keys'));
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const {ApiCredentialsMvp}=load('app/v3/credentials-mvp');
  const html=renderToStaticMarkup(createElement(ApiCredentialsMvp,{go:()=>{},member:fixtures.mvpSeedMembers[0],apiKeys:[],createKey:()=>true,updateKey:()=>{}}));
  assert.ok(html.includes('<h1>API 密钥</h1>'));
  assert.ok(!/API 凭证|音色授权/.test(html));
  const overview=html.slice(html.indexOf('credential7-resource-overview'),html.indexOf('credential7-resource-toggle'));
  const labels=['模型授权','我的 API Key','本人本月已用积分','企业积分余量'];
  const positions=labels.map(label=>overview.indexOf(label));
  assert.ok(positions.every((position,index)=>position>=0&&(index===0||position>positions[index-1])));
  assert.ok(html.includes('2 个接近上限') && !html.includes('个已达上限'));
});
test('P0 resolves retired and unknown URLs without exposing excluded pages',()=>{
  const {retiredViewAliases}=load('app/v3/page-navigation');
  for(const role of policy.mvpRoles){
    for(const route of [null,'','unknown','overview','models','modelDetail','experience','solutions','playground','docs','projects','projectDetail','accounts','accountDetail','keyDetail','notifications','dedicated','voices','voices2','voices6']){
      assert.equal(policy.resolveMvpView(route,role),'keys');
      if(route) assert.equal(policy.canMvp(role,route),false);
    }
    for(const route of Object.keys(retiredViewAliases)){
      const target=policy.resolveMvpView(route,role);
      assert.ok(policy.mvpViews.includes(target),route);
      assert.ok(policy.canMvp(role,target),route);
    }
    for(const route of ['audit','audit2','audit3'])assert.equal(policy.resolveMvpView(route,role),role==='Developer'?'keys':'enterprise');
  }
  for(const route of policy.mvpViews)assert.equal(policy.resolveMvpView(route,'Owner'),route);
  assert.equal(policy.resolveMvpView('billing3','Developer'),'usage3');
  assert.equal(policy.resolveMvpView('enterprise','Developer'),'keys');
  assert.equal(policy.resolveMvpView('security','Developer'),'keys');
});
const lifecycle=load('app/v3/member-lifecycle');
const sharedLifecycle=lifecycle;
test('Removal archives identity and revokes only owned enterprise keys; restore is rejected',()=>{
  const personal={...keys[0],id:'personal-key',identity:'personal'};
  const other={...keys[0],id:'other-key',accountId:admin.email,ownerPhone:developer.phone};
  const members=[owner,admin,developer];
  const removed=lifecycle.prepareMemberChange(owner,{...developer,status:'已移除'},members);
  assert.equal(removed.error,null);
  const state=lifecycle.applyMemberChange(members,[...keys,personal,other],removed.member);
  assert.equal(lifecycle.visibleMembers(state.members).length,2);
  assert.equal(state.members.length,3);
  assert.ok(state.apiKeys.filter(key=>keys.some(original=>original.id===key.id)).every(key=>key.status==='已停用'&&key.revokedByMemberRemovalAt));
  assert.deepEqual(state.apiKeys.slice(-2),[personal,other]);
  for(const draft of [{...removed.member,status:'正常'},{...developer,role:'Admin'},{...developer,status:'已移除'}])assert.ok(lifecycle.prepareMemberChange(owner,draft,state.members).error);
  assert.ok(policy.validateMvpKey(removed.member,keys[0],state.apiKeys,'create'));
});
test('Reinviting the same phone reuses billing identity and requires new membership permissions',()=>{
  const removed=lifecycle.prepareMemberChange(owner,{...developer,status:'已移除'},[owner,developer]).member;
  let state=lifecycle.applyMemberChange([owner,developer],keys,removed);
  const draft={name:'邀请用户',email:`${developer.phone}@phone-invite.moss.local`,phone:developer.phone,role:'Developer',scope:'企业模型权限',status:'待接受',last:'尚未登录',modelPolicies:{[models[0].id]:{enabled:true,concurrency:1}}};
  const invitation=lifecycle.prepareMemberChange(owner,draft,state.members);
  assert.equal(invitation.error,null);
  assert.equal(invitation.member.email,developer.email);
  assert.equal(invitation.member.name,developer.name);
  assert.equal(invitation.member.status,'待接受');
  assert.equal(invitation.member.membershipVersion,1);
  assert.deepEqual(Object.fromEntries(Object.entries(invitation.member.modelPolicies).filter(([,p])=>p.enabled)),draft.modelPolicies);
  assert.ok(Object.values(invitation.member.modelPolicies).filter(p=>!p.enabled).every(p=>p.concurrency===0));
  state=lifecycle.applyMemberChange(state.members,state.apiKeys,invitation.member);
  assert.equal(state.members.length,2);
  assert.equal(lifecycle.visibleMembers(state.members).length,2);
  assert.ok(lifecycle.prepareMemberChange(owner,draft,state.members).error);
  assert.ok(policy.validateMvpKey(invitation.member,{...keys[0],id:'new-key'},state.apiKeys,'create'));
  // Authenticated invitation acceptance is outside this frontend demo. Once accepted,
  // fresh keys work, but every old credential remains permanently revoked.
  const accepted={...invitation.member,status:'正常'};
  assert.equal(policy.validateMvpKey(accepted,{...keys[0],id:'new-key'},state.apiKeys,'create'),null);
  assert.ok(policy.validateMvpKey(accepted,{...keys[0],revokedByMemberRemovalAt:undefined},state.apiKeys,'enable'));
  const fiftyRevoked=Array.from({length:50},(_,i)=>({...state.apiKeys[0],id:`archived-${i}`}));
  assert.equal(policy.validateMvpKey(accepted,{...keys[0],id:'new-key'},fiftyRevoked,'create'),null);
  assert.deepEqual(lifecycle.normalizeMemberLifecycle(state.members,state.apiKeys),state);
  const removedAgain=lifecycle.prepareMemberChange(owner,{...invitation.member,status:'已移除'},state.members);
  assert.equal(removedAgain.error,null);
  state=lifecycle.applyMemberChange(state.members,state.apiKeys,removedAgain.member);
  const second=lifecycle.prepareMemberChange(owner,draft,state.members);
  assert.equal(second.error,null);assert.equal(second.member.membershipVersion,2);
  state=lifecycle.applyMemberChange(state.members,state.apiKeys,second.member);
  assert.ok(lifecycle.prepareMemberChange(owner,{...invitation.member,status:'已移除'},state.members).error);
});
test('Removal validates live actor and target, protects self and Owner, frees occupied seats',()=>{
  for(const [actor,target] of [[owner,owner],[admin,owner],[admin,admin],[developer,admin]])assert.ok(lifecycle.prepareMemberChange(actor,{...target,status:'已移除'},[owner,admin,developer]).error);
  assert.equal(lifecycle.prepareMemberChange(admin,{...developer,status:'已移除'},[owner,admin,developer]).error,null);
  assert.ok(lifecycle.prepareMemberChange(admin,{...developer,status:'已移除'},[owner,{...admin,status:'已移除'},developer]).error);
  assert.ok(lifecycle.prepareMemberChange(owner,{...admin,status:'已移除'},[owner,{...admin,role:'Owner'}]).error);
  const pending={...developer,status:'待接受'};
  assert.equal(lifecycle.prepareMemberChange(owner,{...pending,status:'已移除'},[owner,pending]).error,null);
  const removed=lifecycle.prepareMemberChange(owner,{...pending,status:'已移除'},[owner,pending]).member;
  const draft={...developer,email:'new@demo',phone:'13800009999',status:'待接受'};
  assert.equal(lifecycle.prepareMemberChange(owner,draft,[owner,removed],{seats:2}).error,null);
  assert.ok(lifecycle.prepareMemberChange(owner,draft,[owner,pending],{seats:2}).error);
  assert.ok(policy.validateMvpMember(owner,{...developer,status:'已停用'},[owner,developer]));
});
test('Removed users stay in billing, usage, grouping and export across reload and reinvitation',()=>{
  let state=fixtures.normalizeMvpMockState(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const beforeBilling=billing.makeMvpBillingDemo(state.members,state.apiKeys);
  const beforeUsage=fixtures.makeMvpUsageDemo(state.members,state.apiKeys);
  assert.ok(beforeBilling.some(row=>row.userId===developer.email));
  const removed=lifecycle.prepareMemberChange(owner,{...state.members.find(member=>member.email===developer.email),status:'已移除'},state.members);
  assert.equal(removed.error,null);
  state=lifecycle.applyMemberChange(state.members,state.apiKeys,removed.member);
  const snapshots=[state];
  state=fixtures.normalizeMvpMockState(...[JSON.parse(JSON.stringify(state.members)),JSON.parse(JSON.stringify(state.apiKeys))]);
  snapshots.push(state);
  const invite=lifecycle.prepareMemberChange(owner,{...developer,email:`${developer.phone}@phone-invite.moss.local`,status:'待接受',modelPolicies:{[models[0].id]:{enabled:true,concurrency:1}}},state.members);
  assert.equal(invite.error,null);
  snapshots.push(lifecycle.applyMemberChange(state.members,state.apiKeys,invite.member));
  for(const snapshot of snapshots){
    assert.deepEqual(billing.makeMvpBillingDemo(snapshot.members,snapshot.apiKeys),beforeBilling);
    assert.deepEqual(fixtures.makeMvpUsageDemo(snapshot.members,snapshot.apiKeys),beforeUsage);
    assert.equal(snapshot.apiKeys.length,fixtures.mvpSeedKeys.length);
  }
});
test('Legacy disabled memberships migrate without losing ledger records or reviving credentials',()=>{
  const legacy={...developer,status:'已停用'};
  const state=fixtures.normalizeMvpMockState([owner,legacy],keys);
  assert.equal(state.members[1].status,'已移除');
  assert.equal(lifecycle.visibleMembers(state.members).length,1);
  assert.ok(state.apiKeys.every(key=>key.revokedByMemberRemovalAt&&key.status==='已停用'));
  assert.deepEqual(fixtures.normalizeMvpMockState(state.members,state.apiKeys),state);
});
test('Enterprise hides removed users, retains invitation and exposes only removal',()=>{
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  for(const [file,component] of [['enterprise-mvp','EnterpriseUsersMvp']]){
    const html=renderToStaticMarkup(createElement(load(`app/v3/${file}`)[component],{members:[owner,{...developer,status:'已移除'},{...admin,status:'待接受'}],apiKeys:keys,currentRole:'Owner',save:()=>null,go:()=>{}}));
    assert.ok(!html.includes(`查看${developer.name}`));
    assert.ok(html.includes(`移除${admin.name}`));
    assert.ok(!/停用账号|恢复账号|>已停用<\/option>/.test(html));
  }
});
test('Member governance rejects unauthorized roles, duplicate identity, seat exhaustion and invalid limits',()=>{
  const invite={...developer,email:'new@demo',phone:'13800009999',status:'待接受'};
  assert.equal(policy.validateMvpMember(owner,invite,[owner,developer]),null);
  assert.ok(policy.validateMvpMember(admin,{...invite,role:'Admin'},[owner,admin]));
  assert.ok(policy.validateMvpMember(owner,{...invite,role:'Finance'},[owner]));
  assert.ok(policy.validateMvpMember(owner,invite,[owner,developer],2));
  assert.ok(policy.validateMvpMember(owner,{...invite,phone:developer.phone},[owner,developer]));
  for(const limit of [0,-1,1.5,81])assert.ok(policy.validateMvpMember(owner,{...invite,modelPolicies:{[models[0].id]:{enabled:true,concurrency:limit}}},[owner]));
});
test('Key ownership uses stable user id; total limit includes disabled keys',()=>{
  const sameName={...developer,email:'someone-else@demo'};
  assert.equal(policy.mvpOwnsKey(sameName,keys[0]),false);
  assert.equal(policy.mvpOwnsKey(developer,{...keys[0],identity:'personal'}),false);
  const newKey={...keys[0],id:'new'};
  const fifty=Array.from({length:50},(_,index)=>({...keys[0],id:String(index),status:'已停用'}));
  assert.ok(policy.validateMvpKey(developer,newKey,fifty,'create'));
  assert.equal(policy.validateMvpKey(developer,newKey,keys,'create'),null);
  assert.equal(policy.validateMvpKey(developer,{...keys[0],status:'有效'},[{...keys[0],status:'已停用'}],'enable'),null);
});
test('Peak history stays fixed while current concurrency limits and status follow policy changes',()=>{
  const original=capacityFor(models[0].id,developer);
  const changed={...developer,status:'已停用',modelPolicies:{[models[0].id]:{enabled:true,concurrency:1}}};
  const updated=capacityFor(models[0].id,changed);
  assert.equal(updated.peak,original.peak);
  assert.equal(updated.peakAt,original.peakAt);
  assert.equal(updated.currentLimit,1);
  assert.equal(capacityLimitState(updated),'reached');
  const raised=capacityFor(models[0].id,{...developer,modelPolicies:{[models[0].id]:{enabled:true,concurrency:100}}});
  assert.equal(raised.peak,original.peak);
  assert.equal(raised.currentLimit,80);
  assert.equal(capacityLimitState(raised),'normal');
  const missing=capacityFor(models.at(-1).id);
  assert.equal(missing.covered,false);
  assert.equal(missing.currentLimit,models.at(-1).concurrency);
  for(const [peak,level] of [[79.9,'default'],[80,'warning'],[94.9,'warning'],[95,'warning'],[99.9,'warning'],[100,'critical'],[120,'critical']])assert.equal(capacityLevel({peak,currentLimit:100,covered:true} ),level);
  assert.equal(capacityLevel({peak:0,currentLimit:10,covered:true}),'default');
  assert.equal(capacityLevel({peak:0,currentLimit:0,covered:true}),'unknown');
  assert.equal(capacityLevel({peak:null,currentLimit:null,covered:false}),'unknown');
});
test('Resource limit status stays near at 95%, reaches at 100% and excludes invalid data',()=>{
  const snapshot={peak:0,currentLimit:100,peakAt:'09-08 14:32',covered:true};
  for(const [peak,state,label] of [[0,'normal','充足'],[79.9,'normal','充足'],[80,'near','接近上限'],[95,'near','接近上限'],[99.9,'near','接近上限'],[100,'reached','已达上限'],[120,'reached','已达上限']]){
    assert.equal(capacityLimitState({...snapshot,peak}),state);
    assert.equal(capacityLimitLabel({...snapshot,peak}),label);
  }
  for(const patch of [{covered:false},{peak:null},{peak:-1},{peak:Infinity},{peak:NaN},{currentLimit:0},{currentLimit:-1},{currentLimit:null},{currentLimit:Infinity}]){
    assert.equal(capacityLimitState({...snapshot,...patch}),'unknown');
    assert.equal(capacityLimitLabel({...snapshot,...patch}),'暂无完整数据');
  }
});
test('Enterprise resource summary renders mutually exclusive near/reached counts and conditional pending seats',()=>{
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const {EnterpriseUsersMvp}=load('app/v3/enterprise-mvp');
  const render=(members=fixtures.mvpSeedMembers)=>renderToStaticMarkup(createElement(EnterpriseUsersMvp,{members,apiKeys:[],currentRole:'Owner',go:()=>{},save:()=>null}));
  let html=render();
  assert.match(html,/>查看全部 6 个模型资源</);
  assert.ok(html.includes('2 个接近上限'));
  assert.ok(!html.includes('个已达上限')&&!html.includes('个告警')&&!html.includes('个严重'));
  assert.ok(!html.includes('待接受占用')&&!html.includes('caption>企业模型资源'));
  assert.ok(html.includes('aria-expanded="false"'));
  const pending={...developer,email:'pending-summary@demo',status:'待接受'};
  assert.match(render([...fixtures.mvpSeedMembers,pending]),/已加入 7 位 · 待接受占用 1 席/);
  const limits=models.map(model=>model.concurrency);
  try {
    models[0].concurrency=capacityFor(models[0].id).peak;
    models[1].concurrency=Math.ceil(capacityFor(models[1].id).peak/.9);
    html=render();
    assert.match(html,/class="eu2-warning">1 个接近上限</);
    assert.match(html,/class="eu2-critical">1 个已达上限</);
    models.forEach(model=>{model.concurrency=1000;});
    html=render();
    assert.ok(!html.includes('个接近上限')&&!html.includes('个已达上限'));
  } finally {models.forEach((model,index)=>{model.concurrency=limits[index];});}
});
test('Capacity meter uses current limits and matching status; footer only shows data freshness',()=>{
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const {CapacityMeter,CapacityNote}=load('app/v3/mvp-capacity');
  for(const [peak,level,label] of [[79.9,'default','充足'],[80,'warning','接近上限'],[95,'warning','接近上限'],[99.9,'warning','接近上限'],[100,'critical','已达上限']]){
    const html=renderToStaticMarkup(createElement(CapacityMeter,{snapshot:{peak,currentLimit:100,peakAt:'09-08 14:32',covered:true},label:'测试并发'}));
    assert.ok(html.includes(`class="mvp-capacity ${level}"`));
    assert.ok(html.includes(`class="mvp-capacity-status">${label}</small>`));
    assert.ok(!/达到 80%|达到 95%|低于 80%|峰值时上限/.test(html));
  }
  const html=renderToStaticMarkup(createElement(CapacityNote));
  assert.ok(html.includes('数据更新于'));
  assert.ok(!/统计说明|峰值时|<details/.test(html));
  const missing=renderToStaticMarkup(createElement(CapacityMeter,{snapshot:{peak:null,currentLimit:30,peakAt:null,covered:false},label:'测试并发'}));
  assert.ok(missing.includes('— / 30 路'));
  assert.ok(missing.includes('暂无完整数据'));
});
test('Near-capacity member filter includes reached members once and excludes inactive, unauthorized and missing data',()=>{
  const {memberNearCapacityLimit}=load('app/v3/enterprise-mvp');
  assert.deepEqual(fixtures.mvpSeedMembers.filter(memberNearCapacityLimit).map(member=>member.name),['企业 Owner','王开发','孙客服','郑研发']);
  const member=fixtures.mvpSeedMembers[1];
  for(const status of ['待接受','已停用','已过期'])assert.equal(memberNearCapacityLimit({...member,status}),false);
  assert.equal(memberNearCapacityLimit({...member,email:'missing-telemetry@demo'}),false);
  assert.equal(memberNearCapacityLimit({...member,modelPolicies:Object.fromEntries(models.map(model=>[model.id,{enabled:false,concurrency:1}]))}),false);
  assert.equal(memberNearCapacityLimit({...member,modelPolicies:Object.fromEntries(models.map(model=>[model.id,{enabled:true,concurrency:1}]))}),true);
});
test('Usage, billable calls and full-month invoice reconcile across all model/key groups',()=>{
  const members=[owner,developer]; const catalogKeys=members.flatMap(enterpriseCredentialMockKeys);
  const source=billing.makeMvpBillingDemo(members,catalogKeys).filter(row=>row.date.startsWith('2026-09'));
  const totals=billing.sumMvpBilling(source);
  assert.deepEqual(billing.sumMvpBilling(billing.groupMvpBilling(source)),totals);
  assert.deepEqual(billing.sumMvpBilling(billing.groupMvpBilling(source,true)),totals);
  const usageRows=fixtures.makeMvpUsageDemo(members,catalogKeys).filter(row=>row.date.startsWith('2026-09'));
  assert.deepEqual(usage.sumUsage8(source),usage.sumUsage8(usageRows));
  assert.ok(billing.sumMvpBilling(source.filter(row=>row.userId===owner.email)).calls<totals.calls);
});

test('Fixture identities, authorization and lifecycle agree for every usage row',()=>{
  const {mvpSeedMembers:members,mvpSeedKeys:keys,mvpHistoricalUsage:rows}=fixtures;
  assert.equal(new Set(keys.map(key=>key.id)).size,keys.length);
  assert.equal(new Set(keys.map(key=>key.masked)).size,keys.length);
  assert.equal(new Set(members.map(member=>member.phone)).size,members.length);
  for(const row of rows){
    const key=keys.find(key=>key.id===row.keyId), member=members.find(member=>member.email===row.userId);
    assert.ok(key&&member); assert.equal(key.accountId,row.userId);
    assert.ok(fixtures.mvpHistoricalPolicies[row.userId][row.modelId].enabled,`${member.name}: unauthorized ${row.modelId}`);
    assert.ok(row.date>key.createdAt.slice(0,10)); assert.ok(row.date>=(member.joined??'2026-08-01'));
    assert.ok(row.date<=key.lastUsedAt.slice(0,10));
    for(const cutoff of [fixtures.mvpMemberDisabledAt[row.userId],fixtures.mvpKeyDisabledAt[row.keyId]].filter(Boolean))assert.ok(row.date<cutoff.slice(0,10));
    const model=models.find(model=>model.id===row.modelId);
    assert.ok(row.calls>0&&Number.isSafeInteger(row.calls));
    assert.equal(model.kind==='TTS'?row.asrDeciseconds:row.ttsCharacters,0);
    assert.ok(model.kind==='TTS'?row.ttsCharacters>0:row.asrDeciseconds>0);
  }
  for(const key of keys){
    const history=rows.filter(row=>row.keyId===key.id);
    assert.equal(key.lastUsedAt,history.length?`${history.map(row=>row.date).sort().at(-1)} 20:00`:'尚未调用');
    assert.equal(key.version,1); assert.equal(key.lastRotatedAt,'—');
    const points=billing.sumMvpBilling(billing.makeMvpBillingDemo(members,[key]).filter(row=>row.date.startsWith('2026-09'))).pointCents;
    assert.equal(Math.round(Number(key.usage.replaceAll(',','').replace(' 积分',''))*100),points);
  }
  assert.equal(rows.filter(row=>row.userId==='disabled@moss.demo'&&row.date.startsWith('2026-09')).length,0);
  assert.ok(rows.some(row=>row.userId==='disabled@moss.demo'&&row.date.startsWith('2026-08')));
  assert.equal(fixtures.makeMvpUsageDemo([...members,{...developer,email:'new-member',status:'待接受'}],[...keys,{...keys[0],id:'new-key'}]).length,rows.length);
});

test('All members, models, periods and windows reconcile cards, daily charts, groups and full CSV',()=>{
  const {mvpSeedMembers:members,mvpSeedKeys:keys}=fixtures;
  const source=billing.makeMvpBillingDemo(members,keys), catalog=fixtures.mvpUsageCatalog(members,keys);
  for(const member of members)for(const period of ['2026-08','2026-09'])for(const window of ['month','7d','15d'])for(const modelId of ['all',...models.map(model=>model.id)]){
    const filters={period,window,modelId,userId:member.email,keyId:'all'};
    const rows=usage.selectUsage8(source,filters,{userId:member.email,enterpriseWide:true,modelIds:models.map(m=>m.id)});
    const total=usage.sumUsage8(rows);
    assert.deepEqual(usage.sumUsage8(usage.groupUsage8(rows)),total);
    assert.deepEqual(usage.sumUsage8(usage.dailyUsage8(rows,usage.usage8Range(period,window))),total);
    const csv=usage.csvUsage8(rows,filters,models,catalog);
    const cells=csv.split('\r\n').slice(1).map(line=>line.slice(1,-1).split('","'));
    assert.equal(cells.length,usage.groupUsage8(rows).length);
    assert.equal(cells.reduce((sum,row)=>sum+Number(row[7]),0),total.calls);
    assert.equal(cells.reduce((sum,row)=>sum+Number(row[8]),0),total.ttsCharacters);
    assert.equal(cells.reduce((sum,row)=>sum+Math.round(Number(row[9])*10),0),total.asrDeciseconds);
    assert.deepEqual(billing.sumMvpBilling(billing.groupMvpBilling(rows)),billing.sumMvpBilling(rows));
  }
  for(const period of ['2026-08','2026-09']){
    const rows=source.filter(row=>row.date.startsWith(period)), total=billing.sumMvpBilling(rows);
    assert.deepEqual(billing.sumMvpBilling(billing.groupMvpBilling(rows,true)),total);
    assert.equal(members.reduce((sum,member)=>sum+billing.sumMvpBilling(rows.filter(row=>row.userId===member.email)).pointCents,0),total.pointCents);
    assert.equal(keys.reduce((sum,key)=>sum+billing.sumMvpBilling(rows.filter(row=>row.keyId===key.id)).amountCents,0),total.amountCents);
  }
  // Developer and administrator views of the same person's whole month must agree.
  for(const member of members.filter(m=>m.role==='Developer'&&m.status==='正常')){
    const filters={period:'2026-09',window:'month',modelId:'all',userId:member.email,keyId:'all'};
    const personal=usage.selectUsage8(source,filters,{userId:member.email,enterpriseWide:false,modelIds:fixtures.mvpQueryableModels(member).map(m=>m.id)});
    assert.deepEqual(usage.sumUsage8(personal),usage.sumUsage8(source.filter(row=>row.userId===member.email&&row.date.startsWith('2026-09'))));
  }
});

test('Editing permissions, disabling members/keys and metadata migration do not rewrite history',()=>{
  const {mvpSeedMembers:members,mvpSeedKeys:keys}=fixtures;
  const before=billing.makeMvpBillingDemo(members,keys);
  const changedMembers=members.map(member=>({...member,role:'Developer',status:'已停用',modelPolicies:Object.fromEntries(models.map(model=>[model.id,{enabled:false,concurrency:1}]))}));
  const changedKeys=keys.map(key=>({...key,status:'已停用'}));
  assert.deepEqual(billing.makeMvpBillingDemo(changedMembers,changedKeys),before);
  assert.ok(fixtures.mvpQueryableModels(changedMembers[2]).some(model=>model.id===models[0].id));
  const custom={...keys[0],id:'user-created-key',name:'keep-me',masked:'sk_demo_••••custom',lastUsedAt:'尚未调用'};
  const invited={...developer,email:'new-invite',phone:'13800009999',status:'待接受'};
  const migrated=fixtures.normalizeMvpMockState([...changedMembers,invited],[...keys,custom]);
  assert.deepEqual(migrated.members.at(-1),invited); assert.equal(migrated.apiKeys.at(-1).name,'keep-me');
  assert.ok(migrated.apiKeys.every(key=>key.status==='已停用'));
  assert.deepEqual(billing.makeMvpBillingDemo(migrated.members,migrated.apiKeys),before);
});

test('Enterprise and member peaks are possible on one concurrent timeline with valid authorization',()=>{
  const {mvpSeedMembers:members}=fixtures;
  for(const point of capacitySamples){
    assert.ok(Date.parse(point.at)<=Date.parse(usage.usage8AsOf));
    assert.ok(Date.parse(point.at)>Date.parse(usage.usage8AsOf)-86400000);
    const model=models.find(model=>model.id===point.modelId);
    const sum=Object.values(point.users).reduce((total,n)=>total+n,0);
    assert.ok(sum<=model.concurrency);
    for(const [userId,n] of Object.entries(point.users))if(n>0){
      const policy=fixtures.mvpHistoricalPolicies[userId][model.id];
      assert.ok(policy.enabled&&n<=(policy.concurrency??model.concurrency));
      assert.ok(fixtures.mvpHistoricalUsage.some(row=>row.userId===userId&&row.modelId===model.id&&row.date===point.at.slice(0,10)));
    }
  }
  for(const model of models){
    const individual=members.map(member=>capacityFor(model.id,member)).filter(s=>s.covered);
    const enterprise=capacityFor(model.id);
    if(!enterprise.covered)continue;
    assert.ok(enterprise.peak>=Math.max(...individual.map(s=>s.peak)));
    assert.ok(enterprise.peak<=individual.reduce((sum,s)=>sum+s.peak,0));
    const sample=capacitySamples.find(p=>p.modelId===model.id&&p.at.slice(5,16).replace('T',' ')===enterprise.peakAt);
    assert.equal(Object.values(sample.users).reduce((sum,n)=>sum+n,0),enterprise.peak);
  }
});

test('Legacy voice entitlements and member access retain compatible dates and model scope',()=>{
  for(const voice of fixtures.mvpVoiceAuthorizations){
    assert.ok(voice.effectiveAt<=usage.usage8AsOf.slice(0,10)&&voice.expiresAt>=usage.usage8AsOf.slice(0,10));
    assert.ok(models.some(model=>model.name===voice.model&&model.kind==='TTS'));
  }
  assert.equal(fixtures.mvpAvailableVoices(developer).length,2);
  assert.equal(fixtures.mvpAvailableVoices(fixtures.mvpSeedMembers.find(m=>m.email==='zhao@yunfu.ai')).length,0);
  assert.equal(fixtures.mvpAvailableVoices({...developer,status:'已停用'}).length,0);
});
test('MVP content excludes single-call drilldown and enterprise audit entry',()=>{
  const shell=readFileSync('app/V3App.tsx','utf8');
  assert.ok(!shell.includes('from "./v3/evidence')); assert.ok(!/EnterpriseAudit|NotificationPanel|NotificationCenter|Discovery|DeveloperTools|Overview|KeyDialog|凭证与授权/.test(shell)); assert.ok(shell.includes('MvpPages'));
  for(const file of ['credentials-mvp.tsx','enterprise-mvp.tsx','voice-authorization.tsx','billing3-mvp.tsx','usage3-mvp.tsx']){
    const text=readFileSync('app/v3/'+file,'utf8');
    assert.ok(!/openLogs|request_id|trace_id|task_id|恢复账号|管理登录会话|>轮换<|>日志<|RPM|当前并发/.test(text),file);
  }
});


test('Usage3 costs and export retain authorized scope, precision and all aggregate rows',()=>{
  const source=billing.makeMvpBillingDemo(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const actor=fixtures.mvpSeedMembers.find(member=>member.role==='Developer');
  const filters={period:'2026-09',window:'month',modelId:'all',userId:'all',keyId:'all'};
  const rows=usage.selectUsage8(source,filters,{userId:actor.email,enterpriseWide:false,modelIds:fixtures.mvpQueryableModels(actor).map(model=>model.id)});
  assert.ok(rows.length); assert.ok(rows.every(row=>row.userId===actor.email));
  const groups=billing.groupMvpBilling(rows);
  assert.deepEqual(billing.sumMvpBilling(groups),billing.sumMvpBilling(rows));
  const catalog=fixtures.mvpUsageCatalog(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const csv=billing.csvMvpBilling(rows,filters,models,catalog);
  const lines=csv.replace(/^\uFEFF/,'').split('\r\n');
  assert.equal(lines.length,groups.length+1);
  assert.equal(lines[0],['账期','统计开始（UTC+8）','统计结束（UTC+8）','模型','用户','API Key 名称','API Key（脱敏）','计费调用次数（次）','计费用量','计费单位','消耗积分（积分）','折后金额估算（元）'].map(value=>`"${value}"`).join(','));
  const attack=catalog.map(key=>({...key,name:'=SUM(1,2)'}));
  assert.ok(billing.csvMvpBilling(rows,filters,models,attack).includes("'=SUM(1,2)"));
  const allRows=usage.selectUsage8(source,filters,{userId:actor.email,enterpriseWide:true,modelIds:models.map(model=>model.id)});
  const asr=billing.groupMvpBilling(allRows).find(row=>models.find(model=>model.id===row.modelId)?.kind==='ASR');
  assert.ok(billing.csvMvpBilling(allRows,filters,models,catalog).includes(`"${(asr.asrDeciseconds/10).toFixed(1)}","秒"`));
});


test('User-level fees reconcile with Key-level usage',()=>{
  const source=billing.makeMvpBillingDemo(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const rows=source.filter(row=>row.date.startsWith('2026-09'));
  const groups=billing.groupMvpBillingByUser(rows);
  assert.ok(groups.length < billing.groupMvpBilling(rows).length);
  assert.deepEqual(billing.sumMvpBilling(groups),billing.sumMvpBilling(rows));
  for(const group of groups){
    const detail=rows.filter(row=>row.modelId===group.modelId&&row.userId===group.userId);
    assert.deepEqual(billing.sumMvpBilling([group]),billing.sumMvpBilling(detail));
    assert.equal('keyId' in group,false);
  }
  const filters={period:'2026-09',window:'month',modelId:'all',userId:'all',keyId:'all'};
  const catalog=fixtures.mvpUsageCatalog(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const usageCsv=billing.csvMvpBilling(rows,filters,models,catalog);
  for(const key of catalog)assert.ok(!usageCsv.includes(key.id));
  const sample=rows[0];
  const sameNameRows=[sample,{...sample,keyId:'another-key'}];
  const sameNameCatalog=[{...catalog.find(key=>key.id===sample.keyId),name:'same-name'}, {...catalog.find(key=>key.id===sample.keyId),id:'another-key',name:'same-name',masked:'sk_demo_••••DIFF'}];
  assert.equal(billing.csvMvpBilling(sameNameRows,filters,models,sameNameCatalog).split('\r\n').length,3);
  assert.equal(billing.groupMvpBillingByUser(sameNameRows).length,1);
});


test('Period details export the whole authorized month, independently of display filters',()=>{
  const source=billing.makeMvpBillingDemo(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const catalog=fixtures.mvpUsageCatalog(fixtures.mvpSeedMembers,fixtures.mvpSeedKeys);
  const developer=fixtures.mvpSeedMembers.find(member=>member.role==='Developer');
  const allAccess={enterpriseWide:true,userId:developer.email,modelIds:models.map(model=>model.id)};
  const selected=billing.mvpPeriodDetails(source,'2026-09',allAccess);
  assert.deepEqual(billing.sumMvpBilling(selected.rows),billing.sumMvpBilling(source.filter(row=>row.date.startsWith('2026-09'))));
  assert.deepEqual(selected.filters,{period:'2026-09',window:'month',modelId:'all',userId:'all',keyId:'all'});
  const csv=billing.csvMvpBilling(selected.rows,selected.filters,models,catalog);
  const lines=csv.replace(/^\uFEFF/,'').split('\r\n');
  const exported=lines.slice(1).map(line=>line.slice(1,-1).split('","'));
  assert.equal(exported.length,billing.groupMvpBilling(selected.rows).length);
  assert.equal(exported.reduce((sum,row)=>sum+Number(row[7]),0),billing.sumMvpBilling(selected.rows).calls);
  assert.equal(exported.reduce((sum,row)=>sum+Math.round(Number(row[10])*100),0),billing.sumMvpBilling(selected.rows).pointCents);
  assert.equal(exported.reduce((sum,row)=>sum+Math.round(Number(row[11])*100),0),billing.sumMvpBilling(selected.rows).amountCents);
  const own=billing.mvpPeriodDetails(source,'2026-09',{enterpriseWide:false,userId:developer.email,modelIds:fixtures.mvpQueryableModels(developer).map(model=>model.id)});
  assert.ok(own.rows.length); assert.ok(own.rows.every(row=>row.userId===developer.email));
  assert.ok(own.rows.length<selected.rows.length);
  const emptyWindow=usage.selectUsage8(source,{...selected.filters,period:'2026-08',window:'7d'},allAccess);
  assert.equal(emptyWindow.length,0);
  assert.ok(billing.mvpPeriodDetails(source,'2026-08',allAccess).rows.length>0);
  assert.equal(billing.mvpPeriodDetails(source,'2026-09',{...allAccess,modelIds:[]}).rows.length,0);
});


test('User overview drilldown carries period/model/user and enforces target permissions',()=>{
  const navigation=load('app/v3/usage3-navigation');
  const context={period:'2026-08',modelId:models[0].id,userId:developer.email};
  const params=new URLSearchParams('view=usage3');
  navigation.writeUsage3Context(params,context);
  const defaults={period:'2026-09',window:'month',modelId:'all',userId:owner.email,keyId:'all'};
  const access={userId:owner.email,enterpriseWide:true,modelIds:models.map(model=>model.id),userIds:fixtures.mvpSeedMembers.map(member=>member.email)};
  assert.deepEqual(navigation.readUsage3Context(params,defaults,access),{...defaults,...context});
  const foreign={...context,userId:owner.email,modelId:models[5].id};
  navigation.writeUsage3Context(params,foreign);
  const limited=navigation.readUsage3Context(params,{...defaults,userId:developer.email},{...access,userId:developer.email,enterpriseWide:false,modelIds:[models[0].id]});
  assert.equal(limited.userId,developer.email); assert.equal(limited.modelId,'all');
  navigation.writeUsage3Context(params);
  assert.equal(params.toString(),'view=usage3');
  assert.deepEqual(navigation.readUsage3Context(params,defaults,access),defaults);
});


test('Contract billing rates match the confirmed TTS and model-specific ASR prices',()=>{
  const base=fixtures.mvpHistoricalUsage[0];
  for(const model of models){
    const expected=model.kind==='TTS'?2000:model.name==='MOSS-Transcribe-Diarize-Pro'?1700:1300;
    const row={...base,modelId:model.id,ttsCharacters:model.kind==='TTS'?10000:0,asrDeciseconds:model.kind==='ASR'?36000:0};
    assert.equal(fixtures.mvpPointCents(row),expected);
    assert.equal(fixtures.mvpBillingRule(model.id).pointCents,expected);
  }
  assert.throws(()=>fixtures.mvpBillingRule('unknown-model'));
});


test('Retired billing URLs resolve to selected pages and monitoring URLs return to API keys',()=>{
  const navigation=load('app/v3/page-navigation');
  const {can}=load('app/v3/data');
  for(const route of ['billing','billing2','billing4','billing5','billing6','orders','orderDetail'])assert.equal(navigation.retiredViewAliases[route],'billing3');
  for(const route of ['usage','usage2','usage4','usage5','usage6','usage7','usage8','usage9','usageDetail'])assert.equal(navigation.retiredViewAliases[route],'usage3');
  for(const prefix of ['logs','quality'])for(const suffix of ['','2','3','4','5','6','7']){
    const route=prefix+suffix;
    assert.equal(navigation.retiredViewAliases[route],'keys');
    for(const role of policy.mvpRoles)assert.equal(can(role,route),false);
  }
  for(const file of ['billing2','billing3','billing4','billing5','billing-mvp','usage8','usage9','evidence','evidence2','evidence3','evidence4','evidence5','dashboard7'])assert.equal(existsSync('app/v3/'+file+'.tsx'),false);
  assert.deepEqual(policy.mvpBillingTabs.map(tab=>tab.label),['费用概览','用量明细']);
});

test('Retired certification links resolve to permitted pages for every role',()=>{
  for(const route of ['security','security2']){
    assert.equal(policy.canMvp('Owner',route),false);
    assert.equal(policy.canMvp('Admin',route),false);
    assert.equal(policy.resolveMvpView(route,'Owner'),'enterprise');
    assert.equal(policy.resolveMvpView(route,'Admin'),'enterprise');
    assert.equal(policy.resolveMvpView(route,'Developer'),'keys');
  }
  assert.ok(!existsSync('app/v3/enterprise-certification.tsx'));
});


test('Selected enterprise page has one canonical route',()=>{
  const {retiredViewAliases}=load('app/v3/page-navigation');
  for(const route of ['enterprise3','enterprise4','enterprise2Detail','memberDetail','permissions','quota']) assert.equal(retiredViewAliases[route],'enterprise');
  assert.deepEqual(policy.mvpEnterpriseTabs.map(tab=>tab.id),['enterprise']);
  assert.ok(policy.mvpViews.includes('enterprise'));
  assert.ok(!policy.mvpViews.includes('enterprise2')); assert.equal(retiredViewAliases.enterprise2,'enterprise'); assert.equal(policy.resolveMvpView('enterprise2','Admin'),'enterprise'); assert.ok(!policy.canMvp('Developer'));
  assert.ok(!existsSync('app/v3/enterprise-users2.tsx'));
  assert.ok(!existsSync('app/v3/enterprise.tsx'));
  assert.equal(lifecycle.enterpriseSeatLimit,50);
});

test('Shared pagination clamps boundary pages and keeps zero results unambiguous',()=>{
  const {paginationState,pageSizeOptions,Pagination}=load('app/v3/pagination');
  assert.deepEqual(pageSizeOptions,[5,10,20]);
  assert.deepEqual(paginationState(0,7,5),{current:1,pages:1,start:0,end:0});
  assert.deepEqual(paginationState(13,3,5),{current:3,pages:3,start:11,end:13});
  assert.deepEqual(paginationState(4,3,5),{current:1,pages:1,start:1,end:4});
  assert.deepEqual(paginationState(13,0,10),{current:1,pages:2,start:1,end:10});
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const html=renderToStaticMarkup(createElement(Pagination,{count:0,page:2,pageSize:5,label:'明细',setPage:()=>{},setPageSize:()=>{}}));
  assert.equal((html.match(/disabled=""/g)||[]).length,2);
  assert.ok(html.includes('0–0'));assert.ok(html.includes('1 / 1'));
});

test('Identity switching requires a normal enterprise membership; missing or removed accounts stay personal',()=>{
  const {mvpMemberForRole,hasEnterpriseAccount}=load('app/v3/mvp-account');
  const {UserCenter}=load('app/v3/user-center');
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  assert.equal(hasEnterpriseAccount(owner),true);
  for(const status of ['未加入','已移除','待接受','已过期','已停用'])assert.equal(hasEnterpriseAccount({...owner,status}),false);
  assert.equal(hasEnterpriseAccount(mvpMemberForRole('Developer',[])),false);
  assert.equal(mvpMemberForRole('Admin',fixtures.mvpSeedMembers).email,'w***@yunfu.ai');
  const html=renderToStaticMarkup(createElement(UserCenter,{member:{...owner,status:'已移除'},displayName:'个人用户',identity:'personal',onIdentityChange:()=>{},hasEnterpriseAccount:false}));
  assert.ok(!html.includes('<button'));assert.ok(html.includes('个人'));assert.ok(!html.includes('aria-haspopup'));
});

test('Existing numeric caps remain intact and explicit null survives serialization',()=>{
  const {enterpriseDefaultPolicies}=load('app/v3/enterprise-resource-data');
  for(const model of models)assert.equal(enterpriseDefaultPolicies(owner)[model.id].concurrency,null);
  const modified={...owner,modelPolicies:{[models[0].id]:{enabled:true,concurrency:null}}};
  const restored=JSON.parse(JSON.stringify(modified));
  assert.deepEqual(enterpriseDefaultPolicies(restored)[models[0].id],{enabled:true,concurrency:null});
  assert.deepEqual(fixtures.normalizeMvpMockState([restored],[]).members[0].modelPolicies,restored.modelPolicies);
});
test('Shared pool accepts multiple member caps totaling above enterprise capacity',()=>{
  const invite={name:'Shared test',email:'13911112222@phone-invite.moss.local',phone:'13911112222',role:'Developer',scope:'企业模型权限',status:'待接受',last:'尚未登录',modelPolicies:{[models[0].id]:{enabled:true,concurrency:models[0].concurrency}}};
  const first=sharedLifecycle.prepareMemberChange(owner,invite,fixtures.mvpSeedMembers);assert.equal(first.error,null);
  const committed=lifecycle.applyMemberChange(fixtures.mvpSeedMembers,[],first.member);
  const next={...invite,email:'13911113333@phone-invite.moss.local',phone:'13911113333'};
  assert.equal(sharedLifecycle.prepareMemberChange(owner,next,committed.members).error,null);
  assert.equal(sharedLifecycle.prepareMemberChange(owner,{...next,modelPolicies:{[models[0].id]:{enabled:true,concurrency:null}}},committed.members).error,null);
  assert.match(sharedLifecycle.prepareMemberChange(owner,{...next,modelPolicies:{[models[0].id]:{enabled:true,concurrency:models[0].concurrency+1}}},committed.members).error,/不能超过企业并发上限/);
});
test('Editing validates against enterprise cap and still rejects stale versions',()=>{
  const draft={...developer,modelPolicies:{[models[0].id]:{enabled:true,concurrency:models[0].concurrency}}};
  const result=sharedLifecycle.prepareMemberChange(owner,draft,fixtures.mvpSeedMembers);assert.equal(result.error,null);
  const committed=lifecycle.applyMemberChange(fixtures.mvpSeedMembers,[],result.member);
  assert.match(sharedLifecycle.prepareMemberChange(owner,draft,committed.members).error,/状态已变化/);
  const unlimited=sharedLifecycle.prepareMemberChange(owner,{...result.member,modelPolicies:{[models[0].id]:{enabled:true,concurrency:null}}},committed.members);
  assert.equal(unlimited.error,null);assert.equal(unlimited.member.modelPolicies[models[0].id].concurrency,null);
});
test('Owner may configure or clear own model quotas but never role or membership',()=>{
  const {enterpriseDefaultPolicies}=load('app/v3/enterprise-resource-data');
  const policies=enterpriseDefaultPolicies(owner);
  const draft={...owner,modelPolicies:{...policies,[models[0].id]:{enabled:false,concurrency:0}}};
  assert.equal(lifecycle.prepareMemberChange(owner,draft,fixtures.mvpSeedMembers).error,null);
  for(const patch of [{role:'Admin'},{status:'已移除'}]){
    assert.ok(lifecycle.prepareMemberChange(owner,{...draft,...patch},fixtures.mvpSeedMembers).error);
  }
  assert.ok(lifecycle.prepareMemberChange(admin,draft,fixtures.mvpSeedMembers).error);
  assert.ok(lifecycle.prepareMemberChange(admin,{...admin,modelPolicies:enterpriseDefaultPolicies(admin)},fixtures.mvpSeedMembers).error);
});
test('Invite and edit forms expose optional caps and enterprise limits without reservation hints',()=>{
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const {UserPolicyDialog}=load('app/v3/user-policy-dialog');
  const props={currentRole:'Owner',members:fixtures.mvpSeedMembers,close:()=>{},save:()=>null};
  for(const member of [undefined,owner]){
    const html=renderToStaticMarkup(createElement(UserPolicyDialog,{...props,member,ownQuota:!!member}));
    assert.ok(html.includes('企业并发上限'));assert.ok(html.includes('成员并发上限（选填）'));
    assert.ok(!html.includes('留空不限制，仍受企业总上限约束'));assert.ok(!html.includes('可分配并发'));assert.ok(!html.includes('最多 '));
    assert.ok(html.includes('min="1"'));assert.ok(html.includes('max="80"'));assert.ok(!html.includes('min="0"'));
  }
});

// Baseline fixtures must obey today's allocated limits; later edits still preserve history.
test('Initial Owner and member samples fit allocated quotas across every model',()=>{
  const {enterpriseDefaultPolicies}=load('app/v3/enterprise-resource-data');
  for(const model of models){
    for(const member of fixtures.mvpSeedMembers){
      const configured=enterpriseDefaultPolicies(member)[model.id];
      for(const point of capacitySamples.filter(p=>p.modelId===model.id)){
        const peak=point.users[member.email]??0;
        assert.ok(peak<=(configured.enabled?(configured.concurrency??model.concurrency):0),`${member.name}: ${model.id} ${peak}/${configured.concurrency}`);
      }
    }
  }
  assert.deepEqual(models.map(model=>capacityFor(model.id,owner).peak),[68,50,2,2,3,2]);
  assert.equal(capacityFor(models[0].id,owner).currentLimit,80);
  assert.equal(capacityLevel(capacityFor(models[0].id,owner)),'warning');
  assert.deepEqual(models.map(model=>capacityFor(model.id).peak),[68,50,4,7,13,null]);
});

test('Configured caps require positive integers and removing authorization preserves role and history',()=>{
  const {enterpriseDefaultPolicies}=load('app/v3/enterprise-resource-data');
  for(const target of [owner,developer]){
    const policies=enterpriseDefaultPolicies(target);
    for(const value of [0,-1,1.5,NaN,Infinity]){
      const result=lifecycle.prepareMemberChange(owner,{...target,modelPolicies:{...policies,[models[0].id]:{enabled:true,concurrency:value}}},fixtures.mvpSeedMembers);
      assert.match(result.error,/正整数/);
    }
    const result=lifecycle.prepareMemberChange(owner,{...target,modelPolicies:Object.fromEntries(models.map(m=>[m.id,{enabled:false,concurrency:999}]))},fixtures.mvpSeedMembers);
    assert.equal(result.error,null);
    assert.ok(Object.values(result.member.modelPolicies).every(p=>!p.enabled&&p.concurrency===0));
    assert.equal(result.member.role,target.role);assert.equal(result.member.status,target.status);
    assert.equal(capacityFor(models[0].id,result.member).peak,capacityFor(models[0].id,target).peak);
    assert.equal(capacityFor(models[0].id,result.member).currentLimit,null);
  }
});

test('Unlimited is authorized, preserves history, and displays separately from missing telemetry',()=>{
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const {CapacityMeter}=load('app/v3/mvp-capacity');
  const {enterpriseDefaultPolicies}=load('app/v3/enterprise-resource-data');
  const draft={...owner,modelPolicies:Object.fromEntries(models.map(m=>[m.id,{enabled:true,concurrency:null}]))};
  const result=sharedLifecycle.prepareMemberChange(owner,draft,fixtures.mvpSeedMembers);assert.equal(result.error,null);
  assert.ok(Object.values(enterpriseDefaultPolicies(result.member)).every(p=>p.enabled&&p.concurrency===null));
  const snapshot=capacityFor(models[0].id,result.member);
  assert.equal(snapshot.peak,68);assert.equal(snapshot.unlimited,true);assert.equal(snapshot.enterpriseLimit,80);assert.equal(snapshot.currentLimit,80);
  const html=renderToStaticMarkup(createElement(CapacityMeter,{snapshot,label:'test'}));assert.ok(html.replace(/<[^>]*>/g,'').includes('68 / 80 路'));assert.ok(html.includes('role="meter"'));assert.ok(!html.includes('随企业上限'));assert.ok(!html.includes('暂无完整数据'));
  const {memberNearCapacityLimit}=load('app/v3/enterprise-mvp');assert.equal(memberNearCapacityLimit(result.member),true);
  const missing=capacityFor(models[0].id,{...result.member,email:'no-history@demo'});
  const missingHtml=renderToStaticMarkup(createElement(CapacityMeter,{snapshot:missing,label:'test'}));assert.ok(missingHtml.includes('— / 80 路'));assert.ok(missingHtml.includes('暂无完整数据'));
});

test('Canonical storage migrates selected policies and retains old records and revoked keys',()=>{
 const {readMvpDemoState,resetMvpDemoState,mvpDemoStorageKey}=load('app/v3/mvp-storage');
 const selectedOwner={...owner,modelPolicies:{[models[0].id]:{enabled:true,concurrency:null}}};
 const legacyOnly={...developer,email:'legacy-only@demo',phone:'13911116666'};
 const revoked={...keys[0],status:'已停用',revokedByMemberRemovalAt:'2026-09-01T00:00:00Z'};
 const values=new Map([
 ['moss-api-mvp-demo-v1',JSON.stringify({members:[owner,legacyOnly],apiKeys:[revoked]})],
 ['moss-api-enterprise2-shared-demo-v1',JSON.stringify({members:[selectedOwner,developer],apiKeys:[keys[0]]})]
 ]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const state=readMvpDemoState(storage);
 assert.equal(state.members.find(m=>m.email===owner.email).modelPolicies[models[0].id].concurrency,null);
 assert.ok(state.members.some(m=>m.email===legacyOnly.email));
 assert.ok(state.members.some(m=>m.email===developer.email));
 assert.equal(state.apiKeys[0].revokedByMemberRemovalAt,revoked.revokedByMemberRemovalAt);
 assert.equal(state.apiKeys[0].status,'已停用');
 assert.ok(values.has(mvpDemoStorageKey));
 values.delete('moss-api-enterprise2-shared-demo-v1');
 assert.deepEqual(readMvpDemoState(storage),state);
 resetMvpDemoState(storage);assert.equal(readMvpDemoState(storage),null);assert.equal(values.size,0);
});

test('Shared Owner inherits enterprise limits by default and retains per-model edits',()=>{
  const {withSharedOwnerDefaults,enterpriseDefaultPolicies}=load('app/v3/enterprise-resource-data');
  const original=JSON.stringify(fixtures.mvpSeedMembers);
  const members=withSharedOwnerDefaults(fixtures.mvpSeedMembers);
  const sharedOwner=members.find(member=>member.role==='Owner');
  assert.ok(Object.values(enterpriseDefaultPolicies(sharedOwner)).every(p=>p.enabled&&p.concurrency===null));
  assert.equal(JSON.stringify(fixtures.mvpSeedMembers),original);
  assert.equal(enterpriseDefaultPolicies(owner)[models[0].id].concurrency,null);
  const edited=sharedLifecycle.prepareMemberChange(sharedOwner,{...sharedOwner,modelPolicies:{...sharedOwner.modelPolicies,[models[0].id]:{enabled:true,concurrency:12}}},members);
  assert.equal(edited.error,null);
  const restored=withSharedOwnerDefaults(JSON.parse(JSON.stringify([edited.member])))[0];
  assert.equal(enterpriseDefaultPolicies(restored)[models[0].id].concurrency,12);
  assert.equal(enterpriseDefaultPolicies(restored)[models[1].id].concurrency,null);
  const cleared=sharedLifecycle.prepareMemberChange(restored,{...restored,modelPolicies:{...restored.modelPolicies,[models[0].id]:{enabled:true,concurrency:null}}},[restored]);
  assert.equal(cleared.error,null);
  assert.equal(capacityFor(models[0].id,cleared.member).enterpriseLimit,models[0].concurrency);
});

test('Shared Owner uses standard meters and two near-limit models with consistent enterprise totals',()=>{
  const {withSharedOwnerDefaults}=load('app/v3/enterprise-resource-data');
  const {CapacityMeter}=load('app/v3/mvp-capacity');
  const {memberNearCapacityLimit}=load('app/v3/enterprise-mvp');
  const sharedOwner=withSharedOwnerDefaults([owner])[0];
  const snapshots=models.map(model=>capacityFor(model.id,sharedOwner));
  assert.deepEqual(snapshots.slice(0,2).map(s=>[s.peak,s.currentLimit]),[[68,80],[50,60]]);
  assert.equal(snapshots.filter(s=>capacityLevel(s)==='warning').length,2);
  assert.equal(memberNearCapacityLimit(sharedOwner),true);
  assert.equal(capacityFor(models[0].id,owner).peak,68);
  for(const sample of capacitySamples){
    const total=Object.values(sample.users).reduce((sum,value)=>sum+value,0);
    assert.ok(total<=models.find(model=>model.id===sample.modelId).concurrency);
  }
  for(let i=0;i<2;i++)assert.equal(capacityFor(models[i].id,undefined).peak,snapshots[i].peak);
  const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
  const {createElement}=createRequire(import.meta.url)('react');
  const html=renderToStaticMarkup(createElement(CapacityMeter,{snapshot:snapshots[0],label:'Owner peak'}));
  assert.ok(html.includes('mvp-capacity warning'));assert.ok(html.includes('role="meter"'));
  assert.ok(html.includes('峰值发生于'));assert.ok(!html.includes('随企业上限'));
  const edited={...sharedOwner,modelPolicies:{...sharedOwner.modelPolicies,[models[0].id]:{enabled:true,concurrency:70}}};
  assert.equal(capacityFor(models[0].id,edited).peak,68);
  assert.equal(capacityFor(models[0].id,edited).currentLimit,70);
});

test('Admin demo selects a normal enterprise Admin without restoring removed accounts',()=>{
  const {mvpMemberForRole,hasEnterpriseAccount}=load('app/v3/mvp-account');
  assert.equal(mvpMemberForRole('Admin',fixtures.mvpSeedMembers).email,admin.email);
  const members=fixtures.mvpSeedMembers.map(member=>member.email===admin.email?{...member,status:'已移除'}:member);
  const selected=mvpMemberForRole('Admin',members);
  assert.equal(selected.email,'zhou@yunfu.ai');assert.equal(hasEnterpriseAccount(selected),true);
  for(const view of ['keys','billing3','usage3','enterprise'])assert.ok(policy.canMvp(selected.role,view));
  assert.deepEqual(policy.mvpAssignableRoles(selected.role),['Developer']);
  assert.equal(sharedLifecycle.prepareMemberChange(selected,{...developer,modelPolicies:{[models[0].id]:{enabled:true,concurrency:10}}},members).error,null);
  assert.equal(members.find(member=>member.email===admin.email).status,'已移除');
  const unavailable=members.filter(member=>member.email!=='zhou@yunfu.ai');
  assert.equal(hasEnterpriseAccount(mvpMemberForRole('Admin',unavailable)),false);
  assert.equal(hasEnterpriseAccount(mvpMemberForRole('Admin',[])),false);
});

"use client";
import { useEffect, useRef, useState } from "react";
import { ApiCredentialsMvp } from "./credentials-mvp";
import { EnterpriseUsersMvp } from "./enterprise-mvp";
import type { Usage3Context } from "./usage3-navigation";
import { Billing3Mvp } from "./billing3-mvp";
import { Usage3Mvp } from "./usage3-mvp";
import { ApiKeyRecord, Member, notice, Role, View } from "./data";
import { canMvp, mvpAssignableRoles, validateMvpKey } from "./mvp-policy";
import { mvpSeedMembers, mvpSeedKeys, normalizeMvpMockState } from "./mvp-fixtures";
import { mvpMemberForRole } from "./mvp-account";
import { readMvpDemoState, mvpDemoStorageKey } from "./mvp-storage";

import { applyMemberChange, prepareMemberChange } from "./member-lifecycle";

// The selected credentials, billing and member pages share this persisted demo store.
export function MvpPages({view,role,go,onMemberChange}: {view:View;role:Role;go:(view:View,usageContext?:Usage3Context)=>void;onMemberChange?:(member:Member)=>void}) {
  const [state,setState]=useState<{members:Member[];apiKeys:ApiKeyRecord[]}>(()=>normalizeMvpMockState(mvpSeedMembers,mvpSeedKeys));
  const current=useRef(state);
  const {members,apiKeys}=state;
  const commit=(next:typeof state)=>{current.current=next;setState(next);};
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      try {const saved=readMvpDemoState(localStorage);if(saved){current.current=saved;setState(saved);}}catch{/* Isolated initial fixture. */}
      setReady(true);
    });return()=>cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem(mvpDemoStorageKey,JSON.stringify({members,apiKeys}));},[ready,members,apiKeys]);
  const actor=mvpMemberForRole(role,members);
  useEffect(()=>{if(ready)onMemberChange?.(actor);},[ready,actor,onMemberChange]);
  const saveMember=(next:Member)=>{
    const snapshot=current.current;
    const liveActor=snapshot.members.find(member=>member.email===actor.email)??actor;
    const result=prepareMemberChange(liveActor,next,snapshot.members,{roles:mvpAssignableRoles(liveActor.role)});
    if(result.error){notice(result.error);return result.error;}
    commit(applyMemberChange(snapshot.members,snapshot.apiKeys,result.member));
    notice(result.member.status==="已移除"?"用户已移除，历史费用与用量保留":result.member.status==="待接受"?"邀请已生成（MVP演示，未发送短信）":"成员配置已更新（MVP演示）");return null;
  };
  const createKey=(key:ApiKeyRecord)=>{const snapshot=current.current;const liveActor=snapshot.members.find(member=>member.email===actor.email)??actor;const error=validateMvpKey(liveActor,key,snapshot.apiKeys,"create");if(error){notice(error);return false;}commit({...snapshot,apiKeys:[key,...snapshot.apiKeys]});notice("API Key 已创建（MVP演示）");return true;};
  const updateKey=(next:ApiKeyRecord,action:"enable"|"disable")=>{const snapshot=current.current;const liveActor=snapshot.members.find(member=>member.email===actor.email)??actor;const error=validateMvpKey(liveActor,next,snapshot.apiKeys,action);if(error){notice(error);return error;}commit({...snapshot,apiKeys:snapshot.apiKeys.map(key=>key.id===next.id?{...key,status:action==="enable"?"有效":"已停用"}:key)});notice(action==="enable"?"API Key 已启用":"API Key 已停用");return null;};
  if(!ready)return <div className="panel credential7-empty" role="status">正在加载MVP示例数据…</div>;
  if(!canMvp(role,view)||!canMvp(actor.role,view))return <div className="panel credential7-empty"><h1>当前角色不在MVP权限范围内</h1><p>请使用Owner、Admin或Developer查看对应页面。</p></div>;
  if(actor.status!=="正常")return <div className="panel credential7-empty"><h1>企业账号不可用</h1><p>当前用户尚未加入企业，无法访问企业资源或使用企业 Key。请联系管理员邀请，接受邀请后加入。</p></div>;
  const content=view==="keys"?<ApiCredentialsMvp go={go} member={actor} apiKeys={apiKeys} createKey={createKey} updateKey={updateKey}/>:

    view==="billing3"?<Billing3Mvp go={go} member={actor} members={members} apiKeys={apiKeys}/>:
    view==="usage3"?<Usage3Mvp go={go} role={actor.role} member={actor} members={members} apiKeys={apiKeys}/>:
    view==="enterprise"?<EnterpriseUsersMvp go={go} members={members} apiKeys={apiKeys} currentRole={actor.role} currentMember={actor} save={saveMember}/>:
    null;
  return <div className="mvp-candidate" key={`${role}:${view}`}>{content}</div>;
}

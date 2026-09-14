"use client";
import { useEffect, useState } from "react";
import { writeUsage3Context, type Usage3Context } from "./v3/usage3-navigation";
import { MvpPages } from "./v3/mvp-pages";
import { readMvpDemoState, resetMvpDemoState } from "./v3/mvp-storage";
import { canMvp, mvpRoles, resolveMvpView } from "./v3/mvp-policy";
import { mvpMemberForRole, hasEnterpriseAccount } from "./v3/mvp-account";
import { mvpSeedMembers } from "./v3/mvp-fixtures";
import "./v3/mvp.css";
import { labels, Member, notice, Role, View } from "./v3/data";
import { BrandMark, Icon, IconName } from "./v3/ui";
import { PersonalPage, personalNav } from "./v3/personal-page";
import { UserCenter, type WorkspaceIdentity } from "./v3/user-center";

const navGroups:{label:string;items:{id:View;label:string;icon:IconName}[]}[]=[
 {label:"管理",items:[{id:"keys",label:"接入管理",icon:"key"},{id:"billing3",label:"费用中心",icon:"wallet"}]},
 {label:"组织",items:[{id:"enterprise",label:"企业管理",icon:"users"}]},
];
const activeMap:Partial<Record<View,View[]>>={keys:["keys"],billing3:["billing3","usage3"],usage3:["usage3"],enterprise:["enterprise"]};
function navActive(view:View,id:View){return (activeMap[id]??[id]).includes(view)}
function DemoReset(){const [armed,setArmed]=useState(false);const reset=()=>{resetMvpDemoState(window.localStorage);window.location.reload()};return <div className="demo-reset" onKeyDown={event=>{if(event.key==="Escape")setArmed(false)}}><button type="button" aria-expanded={armed} onClick={()=>setArmed(value=>!value)}>重置演示数据</button>{armed?<div className="demo-reset-confirm" role="group" aria-label="确认重置演示数据"><span>恢复初始成员和 Key？</span><button type="button" onClick={reset}>确认</button><button type="button" onClick={()=>setArmed(false)}>取消</button></div>:null}</div>}
function Sidebar({view,go,role,member,open,close,identity,onIdentityChange}:{view:View;go:(v:View)=>void;role:Role;member:Member;open:boolean;close:()=>void;identity:WorkspaceIdentity;onIdentityChange:(identity:WorkspaceIdentity)=>void}){return <><button className={`sidebar-backdrop ${open?"show":""}`} type="button" aria-label="关闭导航" onClick={close}/><aside className={`sidebar ${open?"open":""}`} aria-label="主导航"><nav>{identity==="personal"?<><div className="nav-group"><button type="button" className="active" aria-current="page" onClick={close}><Icon name="home"/><span>平台首页</span></button></div>{personalNav.map(group=><div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item=><a className="personal-nav-link" key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" onClick={close}><Icon name={item.icon}/><span>{item.label}</span></a>)}</div>)}</>:navGroups.map((g,i)=>{const items=g.items.map(item=>item.id==="billing3"&&role==="Developer"?{...item,id:"usage3" as View}:item).filter(x=>canMvp(role,x.id));if(!items.length)return null;return <div className="nav-group" key={i}>{g.label?<p>{g.label}</p>:null}{items.map(item=><button type="button" key={item.id} className={navActive(view,item.id)?"active":""} aria-current={navActive(view,item.id)?"page":undefined} onClick={()=>go(item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</div>})}</nav><div className="sidebar-footer"><UserCenter key={role} hasEnterpriseAccount={hasEnterpriseAccount(member)} identity={identity} onIdentityChange={onIdentityChange} member={member} displayName={role==="Owner"?"企业 Owner":member.name}/></div></aside></>}

export default function V3App(){
 const [view,setView]=useState<View>("keys"),[role,setRole]=useState<Role>("Owner"),[navOpen,setNavOpen]=useState(false),[toast,setToast]=useState("");
 const [ready,setReady]=useState(false);
 const [selectedIdentity,setIdentity]=useState<WorkspaceIdentity>("enterprise");
 const [activeMember,setActiveMember]=useState<Member>(()=>mvpMemberForRole("Owner",mvpSeedMembers));
 const identity=hasEnterpriseAccount(activeMember)?selectedIdentity:"personal";
 useEffect(()=>{
  const restore=()=>{
   const url=new URL(window.location.href);
   const savedRole=url.searchParams.get("role");
   if(savedRole&&(mvpRoles as readonly string[]).includes(savedRole)&&savedRole!==role){setReady(false);setRole(savedRole as Role);return;}
   try {const saved=readMvpDemoState(window.localStorage);setActiveMember(mvpMemberForRole(role,Array.isArray(saved?.members)?saved.members:mvpSeedMembers));}catch{setActiveMember(mvpMemberForRole(role,mvpSeedMembers));}
   setIdentity(url.searchParams.get("identity")==="personal"?"personal":"enterprise");
   const canonical=resolveMvpView(url.searchParams.get("view"),role);
   setView(canonical);setReady(true);
   if(url.searchParams.get("view")!==canonical){url.searchParams.set("view",canonical);if(canonical!=="usage3")writeUsage3Context(url.searchParams);window.history.replaceState(window.history.state,"",url);}
  };
  const frame=window.requestAnimationFrame(restore);
  window.addEventListener("popstate",restore);
  return()=>{window.cancelAnimationFrame(frame);window.removeEventListener("popstate",restore);};
 },[role]);
 const go=(requested:View,usageContext?:Usage3Context)=>{
  const next=resolveMvpView(requested,role);setView(next);setNavOpen(false);
  const url=new URL(window.location.href);url.searchParams.set("view",next);writeUsage3Context(url.searchParams,next==="usage3"?usageContext:undefined);window.history.replaceState(window.history.state,"",url);
 };
 const changeIdentity=(next:WorkspaceIdentity)=>{
  if(!hasEnterpriseAccount(activeMember))return;
  setIdentity(next);setNavOpen(false);setToast("");
  const url=new URL(window.location.href);url.searchParams.set("identity",next);writeUsage3Context(url.searchParams);
  window.history.replaceState(window.history.state,"",url);
  notice(`已切换至${next==="enterprise"?"企业":"个人"}身份`);
 };
 const changeRole=(next:Role)=>{
  if(next===role||!(mvpRoles as readonly string[]).includes(next))return;
  const fallback=resolveMvpView(view,next);setReady(false);setRole(next);setView(fallback);
  const url=new URL(window.location.href);url.searchParams.set("role",next);url.searchParams.set("view",fallback);writeUsage3Context(url.searchParams);window.history.replaceState(window.history.state,"",url);
  notice(`已切换为 ${next} 视角，权限与数据范围已重新解析`);
 };
 useEffect(()=>{document.title=`${identity==="personal"?"个人页":labels[view]} — Moss API`;window.scrollTo({top:0,behavior:"smooth"})},[view,identity]);
 useEffect(()=>{const handler=(e:Event)=>setToast((e as CustomEvent<string>).detail);window.addEventListener("moss:v3-toast",handler);return()=>window.removeEventListener("moss:v3-toast",handler)},[]);
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(""),3600);return()=>window.clearTimeout(timer)},[toast]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==="Escape")setNavOpen(false)};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[]);
 return <div className="app-shell"><header className="topbar"><button className="mobile-menu" type="button" aria-label="打开导航" aria-expanded={navOpen} onClick={()=>setNavOpen(true)}><Icon name="menu"/></button><div className="brand"><BrandMark/><div><b>Moss API</b><small>模思智能</small></div></div><div className="top-actions">{ready&&identity==="enterprise"?<DemoReset key={`${role}:${view}`}/>:null}{<label className="role-switch"><span>演示角色</span><select aria-label="演示角色" value={role} onChange={e=>changeRole(e.target.value as Role)}>{mvpRoles.map(item=><option key={item} value={item}>{item}</option>)}</select></label>}</div></header>{ready?<Sidebar identity={identity} onIdentityChange={changeIdentity} view={view} go={go} role={role} member={activeMember} open={navOpen} close={()=>setNavOpen(false)}/>:null}<main className="main"><div className="content">{!ready?<div className="panel credential7-empty" role="status">正在加载账号信息…</div>:identity==="enterprise"?<MvpPages key={role} onMemberChange={setActiveMember} view={view} role={role} go={go}/>:<PersonalPage/>}</div></main>{toast?<div className="toast" role="status"><span><Icon name="check" size={15}/></span>{toast}</div>:null}</div>;
}

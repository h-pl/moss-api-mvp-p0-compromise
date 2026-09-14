import fs from 'node:fs';
const read = path => fs.readFileSync(path, 'utf8');
const has = (text, tokens) => tokens.every(token => text.includes(token));
const app = read('app/V3App.tsx');
const policy = read('app/v3/mvp-policy.ts');
const pages = read('app/v3/mvp-pages.tsx');
const keys = read('app/v3/credentials-mvp.tsx');
const users = read('app/v3/enterprise-mvp.tsx');
const form = read('app/v3/user-policy-dialog.tsx');
const pagination = read('app/v3/pagination.tsx');
const billing = read('app/v3/billing3-mvp.tsx');
const usage = read('app/v3/usage3-mvp.tsx');
const modal = read('app/v3/modal-surface.tsx');
const ui = read('app/v3/ui.tsx');
const account = read('app/v3/mvp-account.ts');
const center = read('app/v3/user-center.tsx');
const css = read('app/globals.css') + read('app/v3/mvp.css');
const ux = read('prd/UX-CONTRACT.md');
const design = read('prd/DESIGN.md');
const checks = [
 ['企业四页统一权限和旧路由解析', has(policy, ['["keys", "billing3", "usage3", "enterprise"]','resolveMvpView','canMvp']) && has(app,['resolveMvpView','popstate'])],
 ['正式名称和接入单页签', has(app,['label:"接入管理"','label:"费用中心"','label:"企业管理"']) && has(keys,['title="API 密钥"']) && !read('app/v3/credential-navigation.ts').includes('voices')],
 ['企业管理仅保留企业与用户', has(policy,['label: "企业与用户"']) && !policy.includes('label: "企业认证"') && !policy.includes('label: "操作审计"')],
 ['范围外业务不再从主壳渲染', !/EnterpriseAudit|NotificationPanel|NotificationCenter|DeveloperTools|Discovery|Overview/.test(app) && !pages.includes('VoiceAuthorization')],
 ['个人页隔离企业内容且保留演示角色', has(app,['identity==="enterprise"?<MvpPages','<PersonalPage/>','setIdentity(url.searchParams.get("identity")']) && !app.includes('ready&&identity==="enterprise"?<label')],
 ['无企业账号隐藏切换入口', has(center,['if (!hasEnterpriseAccount) return <div','!hasEnterpriseAccount || next === identity']) && account.includes('member.status === "正常"')],
 ['账号资格来自当前成员快照', has(pages,['mvpMemberForRole','onMemberChange?.(actor)']) && has(app,['onMemberChange={setActiveMember}','mvpMemberForRole(role,'])],
 ['资源头移除额外只读角标', !keys.includes('账号策略 · 只读') && !users.includes('账号策略 · 只读')],
 ['四张主列表共享5/10/20分页', [keys,users,billing,usage].every(source=>has(source,['<Pagination','[pageSize, setPageSize] = useState(5)'])) && pagination.includes('[5, 10, 20]')],
 ['共享分页边界和条件变化复位', has(pagination,['Math.max(1, Math.ceil(count / pageSize))','Math.max(1, Math.min(page, pages))','disabled={current === 1}','disabled={current === pages}','setPage(1)'])],
 ['列表保留独立总量及结果计数', has(keys,['ownKeys.length','找到 ${filtered.length}']) && has(users,['displayMembers.length','找到 ${filtered.length}'])],
 ['资源展开显示全量且阈值计数互斥', [keys,users].every(source=>has(source,['capacityLimitState','nearCount > 0','reachedCount > 0','aria-expanded']))],
 ['密钥和用户重置恢复搜索焦点', [keys,users].every(source=>source.includes('searchRef.current?.focus()'))],
 ['停用Key中性弱化且可用动作保持可见', has(css,['.credential7-key-table tbody tr:has(.status.neutral)','--disabled-content: #b7b7b7','.row-action:not(:disabled)']) && keys.includes('status === "已停用" ? "neutral"')],
 ['Key创建成功立即提交并一次性交付', has(keys,['if (create(next)) setCreated(next)','完整密钥只展示这一次','await navigator.clipboard.writeText','复制失败，请手动复制 API Key'])],
 ['Key动作失败保留确认层和错误', has(keys,['if (!error) setAction(null)','role="alert"','setError(complete() ?? "")']) && pages.includes('return error;')],
 ['邀请编辑校验和变更条件', has(form,['phoneValid','policiesValid','changed','readOnly={Boolean(member)}','min={1}'])],
 ['移除复用原子状态快照', has(pages,['prepareMemberChange','applyMemberChange','current.current','readMvpDemoState']) && users.includes('RemoveMemberDialog')],
 ['认证页面不再渲染', !fs.existsSync('app/v3/enterprise-certification.tsx') && !pages.includes('EnterpriseCertification')],
 ['表单和确认层共用背景隔离及焦点恢复', has(modal,['dialog.showModal()','previous.focus()','onCancel','data-autofocus']) && has(keys,['data-autofocus','role="alertdialog"'])],
 ['页签支持方向键及首末切换', has(ui,['ArrowRight','ArrowLeft','Home','End','tabIndex={active===item.id?0:-1}','requestAnimationFrame'])],
 ['统一焦点、行内操作及窄屏分页', has(css,['--focus: #596168','.billing3-detail-link:hover{color:var(--ink);text-decoration:none}','.mvp-candidate .mvp-pagination','@media(max-width:620px)'])],
 ['保留账期导出与打印业务范围', has(billing,['rows={periodRows}','data-print-scope="complete-month-by-model"']) && has(usage,['mvpPeriodDetails','csvMvpBilling(statement.rows','disabled={!statement.rows.length}'])],
 ['费用下钻仍携带账期模型用户', has(billing,['go("usage3", { period: filters.period, modelId: row.modelId, userId: row.userId })'])],
 ['现行文档记录统一分页和视觉', has(ux,['5/10/20','默认5条','0–0','Home/End']) && has(design,['#596168','11px','38px','44px'])],
 ['现行文档不保留旧模块为正式入口', !read('prd/README.md').includes('API 凭证 / 音色授权') && !ux.includes('Notifications |')],
 ['文档有范围、验证和历史索引', ['prdmvp/MVP-P0页面范围.md','prdmvp/MVP-P0-UI与交互核对.md','old/prd-pre-mvp-p0/README.md'].every(fs.existsSync)],
 ['不引入浏览器原生确认框', !/(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test([app,keys,users].join('\n'))],
];
let failed=0;
for(const [name,pass] of checks){console.log(`${pass?'✓':'✗'} ${name}`);if(!pass)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exit(1);

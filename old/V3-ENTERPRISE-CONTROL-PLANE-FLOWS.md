# Moss API v3 企业交付控制台逻辑与页面地图

## 1. 产品边界

本控制台服务于已通过商务和合同完成采购的企业客户。它不承担线上选购、支付或运营审批，核心任务是让客户管理企业账号与调用凭证，并自行查询用量、费用、请求和合同交付指标。

### 主体边界

- 企业成员：登录、授权、管理和审计主体，不是生产调用或计费主体。
- Project：企业业务和数据隔离边界。
- API Key：直接归属 Project 的机器调用凭证；创建人、轮换人只是审计责任字段。
- request_id：一次调用的证据主键。
- MeterEvent：一次可计费用量的证据记录，通过 request_id 与请求关联。

```mermaid
flowchart LR
    W[企业 Workspace]
    M[企业成员]
    P[Project]
    K[API Key]
    R[request_id]
    E[MeterEvent]
    Q[服务质量指标 / 事件]

    W -->|包含| M
    W -->|包含| P
    M -->|Role + Project Scope| P
    M -->|credential.manage 管理| K
    P -->|包含| K
    K -->|发起调用| R
    R -->|正常完成后生成| E
    R -->|责任归因与聚合| Q
```

## 2. 全局信息架构

```mermaid
flowchart TD
    HOME[平台首页]
    ENT[企业管理]
    APP[项目与凭证]
    FEE[费用中心]
    LOG[调用日志]

    HOME --> ENT
    HOME --> APP
    HOME --> FEE
    HOME --> LOG

    ENT --> MEMBERS[成员与权限]
    ENT --> SECURITY[企业认证与安全]
    ENT --> AUDIT[操作审计]

    APP --> PROJECTS[项目列表 / 项目详情]
    APP --> APPLICATIONS[Project / Key 列表 / Project 详情]
    APP --> KEYS[Key 列表 / Key 详情]
    APP --> QUOTA[配额与限流]
    APP --> VOICES[音色授权]

    FEE --> OVERVIEW[费用概览]
    FEE --> ORDERS[订单与权益 / 订单详情]
    FEE --> USAGE[用量与对账 / 用量对象详情]

    LOG --> REQUESTS[请求日志 / request_id 证据详情]
    LOG --> QUALITY[服务质量 / 服务事件详情]
```

## 3. 企业账号管理闭环

“邀请成员”和“分配成员权限”是同一资源的创建与编辑动作，不应成为两个平行页面。v3 使用一个成员目录：新增从“邀请成员”进入，存量成员从行级“查看账号 → 编辑权限”进入，二者复用同一表单和权限模型。

```mermaid
flowchart TD
    L[成员与权限列表]
    I[邀请成员]
    D[成员账号详情]
    E[编辑权限]
    R[选择角色模板]
    S[分配 Project Scope]
    C[按项目授予 credential.manage]
    V[确认影响]
    P[邀请待接受 / 权限已更新]
    A[成员接受邀请并设置 MFA]
    X[运行时重新解析导航、数据和动作权限]
    O[通知中心 + 操作审计]
    Z[停用 / 恢复 / 退出会话]
    K{接触过有效 Key?}
    KR[先轮换 Key 后停用]
    KK[保留 Key 并确认风险]

    L --> I --> R --> S --> C --> V --> P --> A --> X --> O
    L --> D --> E --> R
    D --> Z --> K
    K -->|是| KR --> O
    K -->|是| KK --> O
    K -->|否| O
```

权限计算公式：

`最终权限 = 角色动作上限 ∩ Project Scope ∩ 项目级 credential.manage ∩ 账号状态`

角色规则只作为同页只读参考，不提供第二套成员分配入口。

## 4. 项目与凭证闭环

```mermaid
flowchart TD
    PL[项目列表]
    PD[项目详情]
    AL[Project / Key 列表]
    AD[Project 详情]
    KL[API Key 列表]
    KC[创建 Key]
    KQ[确认 Scope、IP、有效期和归属]
    KS[完整值一次性展示]
    KD[Key 详情]
    ROT[轮换 Key]
    DIS[停用 Key]
    U[查看该项目 / Key 用量]
    R[查看该项目 / Key 请求]
    AU[操作审计与通知]

    PL --> PD --> AL --> AD --> KL
    KL --> KC --> KQ --> KS --> KD
    KD --> ROT --> AU
    KD --> DIS --> AU
    AD --> U
    AD --> R
    KD --> U
    KD --> R
```

Key 详情必须同时展示：归属 Project、归属项目、调用 Scope、IP 白名单、有效期、状态、版本、创建与轮换操作人、完整值接触记录、用量摘要和请求入口。

## 5. 费用、用量与对账闭环

```mermaid
flowchart TD
    FO[费用概览]
    OR[订单与权益]
    OD[订单详情]
    U[用量与对账]
    F[账期 / 项目 / 服务筛选]
    D{归因维度}
    DP[Project]
    DK[API Key]
    DM[模型]
    UD[用量对象详情]
    ME[MeterEvent 明细]
    REQ[request_id 请求证据]
    EX[排除 / 冲正 / 缺失事件]
    Q[服务质量责任证据]

    FO --> U
    FO --> OR --> OD
    U --> F --> D
    D --> DP --> UD
    D --> DK --> UD
    D --> DM --> UD
    UD --> ME --> REQ
    U --> EX
    EX --> REQ
    EX --> Q
```

成员不是默认计费维度。只有 Playground、个人测试 Key 或请求显式携带且通过校验的 `end_user_id`，才允许显示“直接会话成员 / 终端用户”辅助归因，并必须同时展示归因覆盖率；它不能替代 Key 与Key 维度。

## 6. 调用日志与服务质量闭环

```mermaid
flowchart TD
    RL[请求日志]
    RF[时间 / 项目 / 项目 / Key / 状态筛选]
    RD[request_id 证据详情]
    AUTH[鉴权]
    QUOTA[配额]
    ROUTE[路由与推理]
    METER[计量]
    J{责任归因}
    CLIENT[客户侧 4xx / 429]
    SERVICE[服务方 5xx / 超时]
    QS[服务质量看板]
    KPI[TTS / ASR 指标与口径]
    INC[服务事件详情]
    IRS[关联 request_id]

    RL --> RF --> RD
    RD --> AUTH --> QUOTA --> ROUTE --> METER --> J
    J --> CLIENT
    J --> SERVICE --> QS
    QS --> KPI
    QS --> INC --> IRS --> RD
```

服务质量是客户查询和交付证据，不提供“验收确认”动作。TTS 合同指标与平台扩展指标必须分层；ASR 在合同未约定时只能标记为平台观测或交付评测指标。

## 7. 页面完成性与返回规则

| 模块 | 列表页 | 详情页 | 创建 / 编辑 | 结果与追溯 |
| --- | --- | --- | --- | --- |
| 企业管理 | 成员与权限 | 成员账号详情 | 邀请成员 / 编辑权限 / 安全处置 | 通知中心、操作审计、返回成员列表 |
| 项目与凭证 | 项目、Key | 项目详情、Project 详情、Key 详情 | 创建项目、Key；轮换 / 停用 Key | 通知、审计、用量和请求下钻 |
| 费用中心 | 费用概览、订单、用量 | 订单详情、用量对象详情 | 只读筛选和导出，不提供购买 / 支付 | MeterEvent、request_id、质量证据 |
| 调用日志 | 请求日志、服务质量 | request_id 详情、服务事件详情 | 筛选、切换模型 / 周期 / 责任口径 | 回到请求、用量对象或质量事件 |

跨模块跳转必须保留或明确展示 Project、项目、Key、账期、服务 / 模型中的已知上下文；没有上下文时回到模块列表，而不是跳到无来源的默认详情。

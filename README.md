# TODO 前端（Vue 3 + TypeScript + Vite）

对接 [todo-api](../../Python/todo-api) 后端的多用户协作待办清单前端。所有交互均在页面内完成（弹窗、Toast、确认框），不使用浏览器的 `alert` / `confirm` / `prompt`。

## 功能

- **后端连接**：登录页可填写后端地址（http/https），「检测连接」校验格式、连通性，并查询 `/setup/status`
- **首次初始化**：检测到后端尚未初始化管理员时，可在「初始化管理员」页签一次性创建（已初始化则自动禁用并提示）
- **登录 / 注册**：注册受后端 `ALLOW_REGISTRATION` 开关控制，注册成功自动切回登录并预填用户 ID
- **待办管理**：新建（标题、描述、分类、标签、起止时间）、编辑（仅提交变更字段的 PATCH）、勾选完成、删除（页面内确认框）
- **筛选与排序**：状态（全部/进行中/已完成）、分类（侧边栏）、关键词（标题/描述/标签/分类/用户）、五种排序
- **分页**：全量拉取后客户端分页（每页 10 条，页码带省略号），后端按 `offset/limit=100` 循环取完
- **分类管理**（管理员）：创建、重命名、删除（删除后待办转为未分类）
- **协作权限**（管理员）：按分类授予/撤销 `view`（可查看）/ `edit`（可编辑）权限，授权前通过 `GET /users/{id}` 验证用户并显示昵称
- **共享视图**：被授权用户可见分类下的共享待办（标注「共享 · 用户ID」），无权限用户不可见；未分类待办仅所有者可见
- **个人中心**：查看资料与令牌有效期、修改昵称、修改密码、退出登录
- **会话管理**：令牌与后端地址保存在 localStorage，刷新自动恢复；401 自动清除会话并回登录页；过期自动登出

## 快速开始

```powershell
npm install
npm run dev
```

打开 <http://localhost:5173>，在登录页填写后端地址（默认 `http://127.0.0.1:8000`）。

> 开发服务器内置代理：后端地址留空走 Vite 代理（目标 `http://127.0.0.1:8000`，可用环境变量 `VITE_PROXY_TARGET` 覆盖）；填写了具体地址则直连后端（需后端启用 CORS，默认 `*` 已允许）。

### 生产构建

```powershell
npm run build    # vue-tsc 类型检查 + vite 构建
npm run preview  # 本地预览 dist
```

部署 `dist/` 为静态站点时，需将 `/api` 反向代理到后端，或在构建前设置 `VITE_API_BASE_URL` 指向后端地址。

## 目录结构

```text
src/
├── api/            # 接口层：client（fetch 封装/错误处理/401 统一跳转）与各资源模块
├── stores/         # backend（后端地址）、session（令牌/用户，localStorage 持久化）、auth（登录/登出动作）
├── composables/    # toast（页面内通知）、confirm（Promise 风格确认对话框）
├── components/     # TodoCard、TodoFormModal、CategoryModal、PermissionModal、AppModal、TagInput、ToastHost、ConfirmHost
├── views/          # LoginView（连接+登录/注册/初始化）、TodosView（工作台）、CategoriesView、ProfileView
├── router/         # 路由与登录守卫
└── utils/          # 时间解析/格式化（后端时间统一按 UTC 处理，展示为本地时区）
```

## 与后端接口的对应

| 页面能力 | 接口 |
| --- | --- |
| 连接检测 | `GET /api/v1/health`、`GET /api/v1/setup/status` |
| 初始化管理员 | `POST /api/v1/users/bootstrap-admin` |
| 注册 / 登录 / 登出 | `POST /api/v1/users/register`、`POST /api/v1/auth/login`、`POST /api/v1/auth/logout` |
| 个人资料 | `GET/PATCH /api/v1/users/me`、`GET /api/v1/users/{id}`（授权时校验用户） |
| 待办 | `GET/POST /api/v1/todos`、`GET/PATCH/DELETE /api/v1/todos/{id}` |
| 分类（管理员） | `GET/POST /api/v1/categories`、`PATCH/DELETE /api/v1/categories/{id}` |
| 协作权限（管理员） | `GET /api/v1/categories/{id}/permissions`、`PUT/DELETE /api/v1/categories/{id}/permissions/{user_id}` |

## 图标与配色

- 图标统一使用 [`@element-plus/icons-vue`](https://www.npmjs.com/package/@element-plus/icons-vue)
- 配色为蓝色系（`#2563eb` → `#0891b2`），不使用紫色或蓝紫色渐变

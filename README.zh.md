# dsh-sidebar-quiet

把 DSH 左侧栏**底部**功能区（余额 / 今日消费 / 法定假日横幅 / 导入会话 / 记忆 / 远程访问 / 退出登录 / ✈️ …）
收进**一行**，鼠标悬停或点一下才展开。腾出来的垂直空间全部归「工作区 + 会话列表」。

> 背景：这些条目都注册在官方槽 `sidebar.footer.action` 上，实测它们合计占 **302px**；
> 收起后槽高 **32–40px**（省下约 270px），侧栏的 `regionArea`（`flex:1`）会立刻拿到这些空间。

## 配置

改这个插件 loader 行的 `config` 块即可（GUI 的配置编辑器或 profile 的 `cordis.patch.yml`，行 id 为 `sidebar-quiet`）：

```yaml
- id: sidebar-quiet
  name: dsh-sidebar-quiet
  config:
    enabled: true          # 总开关；false = 完全不介入
    keepVisible: 1         # 收起时保留前几项（1..7）
    collapsedHeight: 40    # 收起高度(px)（24..320）
    expandOn: both         # hover | click | both
    showHint: true         # 折叠角上的 "⋯" 提示
    extraCss: ""           # 追加自写 CSS
```

改完**刷新页面（F5）**即可生效；宿主侧改了配置需要重启内核。

## 它是怎么做的

- 纯 CSS + 极少 JS，**不改任何其它插件文件**：
  - 宿主半边（`lib/index.js`）只做一件事：把解析后的配置经 `GET /sidebar-quiet/config` 暴露给页面。
  - 客户端半边（`lib/client.js`）取到配置后往 `document.head` 注入一段
    `<style id="dsh-sidebar-quiet-style">`，按 `keepVisible` / `collapsedHeight` / `expandOn` 生成规则；
    `click` 模式下用 `data-dsh-sq-open` 属性做「点一下展开、点别处收起、Esc 收起」。
- 收起判据用 `:not(:hover):not(:focus-within)`，**悬停时完全不干涉原生布局**，所以自动记忆那些
  会自己调整宽度的插件不会被挤压。
- `keepVisible: 1` 时 cost-meter 那张卡也只留「余额」一行（`.cm-footer-stack` 的子项同样按 N 截断）。

## 本机安装方式（junction + link 依赖）

本机没有走 npm 发布，而是：

1. 源码目录：`C:\Users\Administrator\dsh-sidebar-quiet`
2. junction：`C:\Users\Administrator\.dsh\profiles\web\node_modules\dsh-sidebar-quiet` → 源码目录
3. profile `package.json`：`dependencies` 加 `"dsh-sidebar-quiet": "link:C:/Users/Administrator/dsh-sidebar-quiet"`
   （这样以后 `pnpm install` 不会把 junction 清掉），`dsh.profile.bundles` 末尾追加 `"dsh-sidebar-quiet"`
4. 重启内核后该行才会进组合树

卸载：跑 `node C:\Users\Administrator\_uninstall_sidebar_quiet.mjs` 后重启内核。

## 与 dsh-better-sidebar「自定义 CSS」的关系

本插件独立工作，不依赖 better-sidebar。两者同时生效时规则相同、不冲突；
若确认本插件工作正常，可以把 better-sidebar 的「自定义 CSS」清空，由本插件单独接管。

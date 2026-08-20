# CloudBase 共用墙（云函数）开通步骤

环境 ID：`puppy-d6g9c2hgm5858310c`

## 1. 创建云函数

1. 打开云开发控制台 → 选中环境 `puppy-d6g9c2hgm5858310c`
2. 左侧 **云函数** → **新建**
3. 函数名：`wall`
4. 运行环境：Node.js（18 或 16 均可）
5. 把本目录 `index.js`、`package.json` 上传，或在线编辑粘贴 `index.js` 内容
6. 若控制台支持「安装依赖」，确保装上 `@cloudbase/node-sdk`
7. **部署**

## 2. 环境变量

云函数 `wall` → 配置 / 环境变量：

- 名称：`WALL_TOKEN`
- 值：与网站进门密码相同（当前 `data.js` 里是 `qwyz`）

保存后再部署一次。

## 3. 打开 HTTP 访问

1. 左侧找 **HTTP 访问服务** / **HTTP 网关**
2. **新建** 关联：
   - 资源类型：云函数
   - 云函数：`wall`
   - 路径：`/wall`
   - 身份认证：**不开启**（密码由函数自己校验）
3. 复制默认域名，拼成完整地址，例如：

```text
https://puppy-d6g9c2hgm5858310c.ap-shanghai.app.tcloudbase.com/wall
```

地域若不是上海，把 `ap-shanghai` 换成控制台显示的那段。

## 4. 数据库

集合名保持 `wall`。  
云函数用服务端权限读写，**不必再加 Web 安全域名**，也无需匿名登录。

安全规则可先不管；函数不走前端直连。

## 5. 填进网站

`gift/data.js`：

```js
wall: {
  enabled: true,
  url: "https://你复制的完整地址/wall",
  timeoutMs: 8000,
}
```

关掉旧的 Cloudflare 地址即可。推送到 GitHub 后测试。

## 6. 本机快速测

把 `TOKEN` 换成进门密码：

```bash
curl -sS -H "Authorization: Bearer TOKEN" "https://你的地址/wall"
```

应返回 `{}` 或一面墙的 JSON。

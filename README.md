# 暮土猎人

这是一个基于 `React + Vite + TypeScript` 的横版动作小游戏。

## 项目入口

- 页面入口：[index.html](/Users/lin/Documents/New%20project/index.html)
- 前端启动入口：[src/main.tsx](/Users/lin/Documents/New%20project/src/main.tsx)
- 游戏主组件：[src/App.tsx](/Users/lin/Documents/New%20project/src/App.tsx)

`index.html` 会加载 `/src/main.tsx`，然后由 `main.tsx` 挂载 `App`。

## 本地运行

先安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

启动后，终端会显示本地地址，通常是：

```text
http://localhost:5173
```

## 打包

生成可分享的静态文件：

```bash
npm run build
```

打包结果会输出到：

```text
dist/
```

## 本地预览打包结果

```bash
npm run preview
```

通常会得到一个本地预览地址，用来检查正式构建是否正常。

## 分享给别人

有两种最简单的方式：

### 方式 1：分享源码

把整个项目文件夹发给对方，对方执行：

```bash
npm install
npm run dev
```

### 方式 2：分享打包结果

你先执行：

```bash
npm run build
```

然后把 `dist` 目录部署到任意静态托管平台，或者发给会部署静态网页的人。

如果只是本机临时演示，也可以直接运行：

```bash
npm run preview
```

## 可用脚本

这些脚本定义在 [package.json](/Users/lin/Documents/New%20project/package.json)：

- `npm run dev`：开发模式
- `npm run build`：构建生产包
- `npm run preview`：本地预览生产包

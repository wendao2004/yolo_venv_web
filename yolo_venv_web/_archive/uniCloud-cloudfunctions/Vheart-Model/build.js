/**
 * 生产构建：把 TS 分层源码打包成单个 dist/index.js
 * 开发时 nodemon 监听 src 变化自动执行本脚本
 */
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['src/index.ts'],
  bundle: true,          // 关键：打包所有本地依赖到一个文件
  platform: 'node',
  format: 'cjs',
  target: 'es2017',
  minify: true,
  outfile: 'dist/index.js',
  // Node 内置模块和 uniCloud 全局变量不打包
  external: [],
  logLevel: 'info',
});

console.log('[build] dist/index.js generated (single bundle)');

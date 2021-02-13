<img alt="Snabbdom" src="readme-title.svg" width="356px">

A virtual DOM library with focus on simplicity, modularity, powerful features
and performance.

* * *

## Snabbdom源码注释 和原理分析

博客地址：https://gzg.me/posts/2021/snabbdom_source/

### 源码结构

` src/package`

| 文件名 | 作用 |
| - | - |
| h.ts | 生成vNode |
| hooks.ts | 整个vNode生命周期钩子函数 |
| htmldomapi.ts | 封装生成dom的原生api |
| init.ts | 项目入口，处理vNode的关键 |
| is.ts | 判断类型工具函数 |
| jsx-global.ts | jsx声明文件 |
| jsx.ts | jsx解析文件 |
| thunk.ts | 优化处理，对复杂视图不可变化的处理 |
| tovnode.ts | 真实DOM转vNode工具函数 |
| vnode.ts | 定义vnode的类型 |
| helpers/attachto.ts | 定义了 vnode.ts 中 AttachData 的数据结构 |
| modules/attributes.ts | 操作DOM的属性 |
| modules/class.ts | 切换类样式 |
| modules/dataset.ts | 处理data-自定义属性 |
| modules/eventlisteners.ts | 注册和移除事件 |
| modules/hero.ts | 自定义钩子函数 |
| modules/module.ts | 导出各种模块 |
| modules/props.ts | 通过对象属性来设置，不处理布尔属性 |
| modules/style.ts | 设置行内样式及动画 |

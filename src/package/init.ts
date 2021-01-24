import { Module } from './modules/module'
import { vnode, VNode } from './vnode'
import * as is from './is'
import { htmlDomApi, DOMAPI } from './htmldomapi'

type NonUndefined<T> = T extends undefined ? never : T

function isUndef (s: any): boolean {
  return s === undefined
}
function isDef<A> (s: A): s is NonUndefined<A> {
  return s !== undefined
}

type VNodeQueue = VNode[]

const emptyNode = vnode('', {}, [], undefined, undefined)

function sameVnode (vnode1: VNode, vnode2: VNode): boolean {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel
}

function isVnode (vnode: any): vnode is VNode {
  return vnode.sel !== undefined
}

type KeyToIndexMap = {[key: string]: number}

type ArraysOf<T> = {
  [K in keyof T]: Array<T[K]>;
}

type ModuleHooks = ArraysOf<Required<Module>>

function createKeyToOldIdx (children: VNode[], beginIdx: number, endIdx: number): KeyToIndexMap {
  const map: KeyToIndexMap = {}
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = children[i]?.key
    if (key !== undefined) {
      map[key] = i
    }
  }
  return map
}

const hooks: Array<keyof Module> = ['create', 'update', 'remove', 'destroy', 'pre', 'post']

export function init (modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  // 初始化patch函数
  let i: number
  let j: number
  // 初始化hooks回调
  const cbs: ModuleHooks = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: []
  }

  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi

  // 依次存储传入的hooks供后面调用
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      const hook = modules[j][hooks[i]]
      if (hook !== undefined) {
        (cbs[hooks[i]] as any[]).push(hook)
      }
    }
  }
  // 创建空vNode的函数 
  function emptyNodeAt (elm: Element) {
    const id = elm.id ? '#' + elm.id : ''
    const c = elm.className ? '.' + elm.className.split(' ').join('.') : ''
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm)
  }
  /**
   * @description /一个高阶函数，返回一个移除节点的函数
   * @param childElm 子元素
   * @param listeners 移除的key，确定移除顺序
   */
  function createRmCb (childElm: Node, listeners: number) {
    return function rmCb () {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm) as Node
        api.removeChild(parent, childElm)
      }
    }
  }
  /**
   * @description 创建新的元素节点
   * @param vnode 
   * @param insertedVnodeQueue 
   */
  function createElm (vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let i: any
    let data = vnode.data
    if (data !== undefined) {
      const init = data.hook?.init
      if (isDef(init)) {
        init(vnode)
        data = vnode.data
      }
    }
    const children = vnode.children
    const sel = vnode.sel
    // 如果是注释节点，直接创建一个空的注释节点
    if (sel === '!') {
      if (isUndef(vnode.text)) {
        vnode.text = ''
      }
      vnode.elm = api.createComment(vnode.text!)
    } else if (sel !== undefined) {
      // 是非空节点
      // 先保存原节点的属性
      const hashIdx = sel.indexOf('#')
      const dotIdx = sel.indexOf('.', hashIdx)
      const hash = hashIdx > 0 ? hashIdx : sel.length
      const dot = dotIdx > 0 ? dotIdx : sel.length
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel
      // createElementNS一般创建svg标签
      const elm = vnode.elm = isDef(data) && isDef(i = data.ns)
        ? api.createElementNS(i, tag)
        : api.createElement(tag)
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot))
      if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '))
      // 调用create钩子函数
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode)
      // 如果存在子节点，递归调用该函数创建节点
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          const ch = children[i]
          if (ch != null) {
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue))
          }
        }
        // 
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text))
      }
      const hook = vnode.data!.hook
      if (isDef(hook)) {
        hook.create?.(emptyNode, vnode)
        // 如果存在insert钩子，添加到插入vNode的队列中
        if (hook.insert) {
          insertedVnodeQueue.push(vnode)
        }
      }
    } else {
      // 没有子节点，判断该节点是否为文本节点，如果是就插入到当前vNode中
      vnode.elm = api.createTextNode(vnode.text!)
    }
    // 返回该Vnode的elm元素
    return vnode.elm
  }

  /**
   * @description 添加vNode函数
   * @param parentElm  父元素
   * @param before  插入前的第一个元素
   * @param vnodes 
   * @param startIdx 
   * @param endIdx 
   * @param insertedVnodeQueue 
   */
  function addVnodes (
    parentElm: Node,
    before: Node | null,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number,
    insertedVnodeQueue: VNodeQueue
  ) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before)
      }
    }
  }

  function invokeDestroyHook (vnode: VNode) {
    const data = vnode.data
    if (data !== undefined) {
      //移除节点的destroy钩子回调
      data?.hook?.destroy?.(vnode)
      for (let i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
      if (vnode.children !== undefined) {
        for (let j = 0; j < vnode.children.length; ++j) {
          const child = vnode.children[j]
          if (child != null && typeof child !== 'string') {
            invokeDestroyHook(child)
          }
        }
      }
    }
  }
  /**
   * @description 移除Vnode函数
   * @param parentElm 
   * @param vnodes 
   * @param startIdx 
   * @param endIdx 
   */
  function removeVnodes (parentElm: Node,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number): void {
      // 循环要删除的节点内容
    for (; startIdx <= endIdx; ++startIdx) {
      let listeners: number
      let rm: () => void
      const ch = vnodes[startIdx]
      if (ch != null) {
        if (isDef(ch.sel)) {
          // 如果是常规节点，先调用传入的destroy钩子函数（可选）
          invokeDestroyHook(ch)
          // remove钩子函数的数量添加
          listeners = cbs.remove.length + 1
          // rm是真实执行删除操作的函数
          rm = createRmCb(ch.elm!, listeners)
          // 循环执行remove的hooks钩子函数
          for (let i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm)
          // 调用外部传入的remove钩子（可选）
          const removeHook = ch?.data?.hook?.remove
          if (isDef(removeHook)) {
            removeHook(ch, rm)
          } else {
            // 真正执行删除
            rm()
          }
        } else { 
          // 如果是文本节点，直接通过removeChild方式移除
          api.removeChild(parentElm, ch.elm!)
        }
      }
    }
  }
  /**
   * 
   * @param parentElm 父亲元素
   * @param oldCh 旧节点元素
   * @param newCh 新节点元素
   * @param insertedVnodeQueue 插入vNode的队列
   * 
   * 通过四个索引地址来进行diff
   * 
   */
  function updateChildren (parentElm: Node,
    oldCh: VNode[],
    newCh: VNode[],
    insertedVnodeQueue: VNodeQueue) {
    // 旧开始节点
    let oldStartIdx = 0
    // 新开始节点
    let newStartIdx = 0
    // 旧结束节点
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    // 新结束节点
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx: KeyToIndexMap | undefined
    let idxInOld: number
    let elmToMove: VNode
    let before: any

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      /**
       * 如果四个对比节点其中有为null的，那么就重新赋值，并且为元素数组中 添加/减少 一位
       */
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx] 
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx]
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx]
      /**
       *  如果是同一个元素，就对比新旧节点内部的变化，然后修改dom
       *  并且把Vnode内容分别添加一项（索引后移）
       */
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
        // 道理同前者
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
        /**
         * 对比旧开始和新结束节点，并更新dom
         * 然后比较内部差异，把更新的内容移动到插入到旧节点的最后
         * 旧的索引向后移动 新的索引向前移动
         */
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldStartVnode.elm!, api.nextSibling(oldEndVnode.elm!))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
         /**
         * 对比旧结束和新开始节点，并更新dom
         * 然后比较内部差异，把更新的内容移动到插入到旧节点的最前
         * 旧的索引向前移动 新的索引向后移动
         */
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
        /**
         * 如果不是以上情况，说明开始节点 是一个全新的节点，而非对比的节点
         *  如果没有key，那么就创建dom，并插入到最前方（1）
         *  如果有key。判断sel属性是否相同，如果不相同就创建新的dom，如果相同则代表是相同节点(2)
         */
      } else {
        // 方便通过新节点的key找到旧节点数组的索引
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        }
        // 用新节点的key 找到老节点的索引
        idxInOld = oldKeyToIdx[newStartVnode.key as string]
        // （1）新节点
        if (isUndef(idxInOld)) {
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!)
        } else {
        // (2) 旧节点
        // 取出就节点
          elmToMove = oldCh[idxInOld]
          // 被修改过的元素，直接创建一个新的插入
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!)
          } else {
            // 没有修改过，同patchVnode内部差异并更新
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            // 把旧节点相应位置的元素设置为undefined
            oldCh[idxInOld] = undefined as any
            // 把修改过的元素移动到盗猎的元素之前
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!)
          }
        }
        // 插入完成后，索引增加
        newStartVnode = newCh[++newStartIdx]
      }
    }
    // 老节点的子节点先遍历完成。或者新节点的子节点先遍历完成
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      if (oldStartIdx > oldEndIdx) {
        // 如果是老节点的子节点先遍历完成，那么就把剩下的新节点元素，都插入到旧节点的后面
        // before是需要插入的参考位置
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm
        addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
      } else {
        // 新节点先完成，那么剩下的就是老节点需要移除的节点
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
      }
    }
  }
  /**
   * @description 对比节点函数
   * @param oldVnode  旧节点
   * @param vnode  新节点
   * @param insertedVnodeQueue 
   */
  function patchVnode (oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    const hook = vnode.data?.hook
    // 首先触发preptach钩子
    hook?.prepatch?.(oldVnode, vnode)
    const elm = vnode.elm = oldVnode.elm!
    const oldCh = oldVnode.children as VNode[]
    const ch = vnode.children as VNode[]
    // 如果一模一样直接返回
    if (oldVnode === vnode) return
    // 执行update钩子函数
    if (vnode.data !== undefined) {
      for (let i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      vnode.data.hook?.update?.(oldVnode, vnode)
    }
    // 判断是否为文本节点，如果和旧的一样就不处理，如果是不一样的就设置新节点的textConent
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        // 如果有chilcren，就对比新旧子元素是否相等，通过updateChildren函数对象，并更新差异  diff核心
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue)
      } else if (isDef(ch)) {
        // 如果新节点有childeren，就节点没有，那么就清空textConent，然后添加子节点进去
        if (isDef(oldVnode.text)) api.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 如果老节点有children属性，新节点没有，那么直接移除老节点的内容
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        // 判断老节点是否存在text属性，有的话直接清空
        api.setTextContent(elm, '')
      }
      // 如果新旧节都是文本节点，且不一致，那么就移除旧节点的内容，并设置新的
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      }
      api.setTextContent(elm, vnode.text!)
    }
    // 触发postpatch钩子函数
    hook?.postpatch?.(oldVnode, vnode)
  }
  /**
   * @description 返回一个patch函数，参数是旧节点 - 新节点
   */
  return function patch (oldVnode: VNode | Element, vnode: VNode): VNode {
    let i: number, elm: Node, parent: Node
    const insertedVnodeQueue: VNodeQueue = []
    // 调用pre钩子
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]()
    // 如果不是Vnode，就创建一个空的vnode节点
    if (!isVnode(oldVnode)) {
      oldVnode = emptyNodeAt(oldVnode)
    }
    // 先判是否和旧的是用一个节点（判断key和sel
    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue)
    } else {
      elm = oldVnode.elm!
      // 获取是否存在父节点（方便后续插入）
      parent = api.parentNode(elm) as Node
      // 创建新的节点
      createElm(vnode, insertedVnodeQueue)
      // ，判断父节点是否存在，存在就插入到该父节点中
      if (parent !== null) {
        api.insertBefore(parent, vnode.elm!, api.nextSibling(elm))
        // 调用removeVnodes函数移除掉旧的节点
        removeVnodes(parent, [oldVnode], 0, 0)
      }
    }
    // 循环调用insert钩子函数
    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i])
    }
    // 循环调用post构造函数
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]()
    // 结束patch并返回vNode（下一次的oldNode）
    return vnode
  }
}

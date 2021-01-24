import { Hooks } from './hooks';
import { AttachData } from './helpers/attachto';
import { VNodeStyle } from './modules/style';
import { On } from './modules/eventlisteners';
import { Attrs } from './modules/attributes';
import { Classes } from './modules/class';
import { Props } from './modules/props';
import { Dataset } from './modules/dataset';
import { Hero } from './modules/hero';
export declare type Key = string | number;
/**
 * @description 定义Vnode数据的接口类型
 *  @param sel 元素选择器
 *  @param data 节点数据:属性/样式/事件等
 *  @param children 子节点，和 text 只能互斥
 *  @param elm 记录 vnode 对应的真实 DOM
 *  @param text 节点中的内容，和 children 只能互斥
 *  @param key 数据的key对比dom时候用
 *
 */
export interface VNode {
    sel: string | undefined;
    data: VNodeData | undefined;
    children: Array<VNode | string> | undefined;
    elm: Node | undefined;
    text: string | undefined;
    key: Key | undefined;
}
/**
 * @description vnode的数据
 * 每一个属性对应modules内部的一个工具函数，都是可选参数
 *  分别对应真实DOM的不同属性或者事件处理
 */
export interface VNodeData {
    props?: Props;
    attrs?: Attrs;
    class?: Classes;
    style?: VNodeStyle;
    dataset?: Dataset;
    on?: On;
    hero?: Hero;
    attachData?: AttachData;
    hook?: Hooks;
    key?: Key;
    ns?: string;
    fn?: () => VNode;
    args?: any[];
    [key: string]: any;
}
export declare function vnode(sel: string | undefined, data: any | undefined, children: Array<VNode | string> | undefined, text: string | undefined, elm: Element | Text | undefined): VNode;

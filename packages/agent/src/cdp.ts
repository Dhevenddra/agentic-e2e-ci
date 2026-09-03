import type { RawA11yNode } from "./observe.js"

/** The subset of a CDP `Accessibility.getFullAXTree` node we consume. */
export interface CdpAxNode {
  nodeId: string
  role?: { value?: string }
  name?: { value?: string }
  value?: { value?: string | number }
  properties?: Array<{ name: string; value: { value?: unknown } }>
  childIds?: string[]
  parentId?: string
  ignored?: boolean
}

/**
 * Reconstruct a nested {@link RawA11yNode} tree from the flat CDP AX node list (linked by
 * `childIds`), so the tested {@link buildNodes} reducer can consume it unchanged. Pure.
 */
export function cdpAxToRaw(nodes: CdpAxNode[]): RawA11yNode | null {
  if (nodes.length === 0) return null
  const byId = new Map(nodes.map((n) => [n.nodeId, n]))
  const childIdSet = new Set(nodes.flatMap((n) => n.childIds ?? []))
  const root =
    nodes.find((n) => n.role?.value === "RootWebArea") ??
    nodes.find((n) => !childIdSet.has(n.nodeId)) ??
    nodes[0]!

  const prop = (n: CdpAxNode, name: string): unknown =>
    n.properties?.find((p) => p.name === name)?.value?.value

  const build = (n: CdpAxNode): RawA11yNode => {
    const node: RawA11yNode = { role: n.role?.value ?? "", name: n.name?.value ?? "" }
    const v = n.value?.value
    if (v !== undefined) node.value = v
    if (prop(n, "disabled") === true) node.disabled = true
    node.children = (n.childIds ?? [])
      .map((id) => byId.get(id))
      .filter((c): c is CdpAxNode => c !== undefined)
      .map(build)
    return node
  }

  return build(root)
}

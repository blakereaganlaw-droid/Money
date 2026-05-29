import type { Category } from "@/lib/types";

export type CategoryNode = Category & { children: CategoryNode[] };

export function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  categories.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** Flattened list with depth + an indented label, ordered for <select>. */
export type FlatOption = {
  id: string;
  label: string;
  depth: number;
  type: Category["type"];
};

export function flattenOptions(
  nodes: CategoryNode[],
  out: FlatOption[] = []
): FlatOption[] {
  for (const n of nodes) {
    out.push({
      id: n.id,
      label: `${"\u00A0\u00A0\u00A0\u00A0".repeat(n.depth - 1)}${n.name}`,
      depth: n.depth,
      type: n.type,
    });
    if (n.children.length) flattenOptions(n.children, out);
  }
  return out;
}

export function categoryPath(
  categories: Category[],
  id: string | null
): string {
  if (!id) return "Uncategorized";
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parts: string[] = [];
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard < 5) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    guard += 1;
  }
  return parts.join(" › ") || "Uncategorized";
}

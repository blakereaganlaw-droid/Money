"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCategories, useCategoryMutations } from "@/lib/queries";
import { buildTree, type CategoryNode } from "@/lib/tree";
import type { CategoryType } from "@/lib/types";

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();
  const { create, rename, remove } = useCategoryMutations();

  const [editing, setEditing] = useState<{
    mode: "add" | "rename";
    parentId: string | null;
    type: CategoryType;
    id?: string;
    initial?: string;
  } | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const income = tree.filter((t) => t.type === "income");
  const expense = tree.filter((t) => t.type === "expense");

  function openAdd(parentId: string | null, type: CategoryType) {
    setEditing({ mode: "add", parentId, type });
    setValue("");
    setError(null);
  }
  function openRename(id: string, current: string, type: CategoryType) {
    setEditing({ mode: "rename", parentId: null, type, id, initial: current });
    setValue(current);
    setError(null);
  }

  async function submit() {
    if (!editing) return;
    const name = value.trim();
    if (!name) return setError("Name is required");
    try {
      if (editing.mode === "add") {
        await create.mutateAsync({
          name,
          type: editing.type,
          parent_id: editing.parentId,
        });
      } else if (editing.id) {
        await rename.mutateAsync({ id: editing.id, name });
      }
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"? Sub-categories are removed and any transactions become uncategorized.`
      )
    )
      return;
    await remove.mutateAsync(id);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Categories"
        description="Organize spending and income into up to three levels. Shared across both ledgers."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-6">
          <CategoryGroup
            title="Expense Categories"
            nodes={expense}
            type="expense"
            onAdd={openAdd}
            onRename={openRename}
            onDelete={onDelete}
          />
          <CategoryGroup
            title="Income Categories"
            nodes={income}
            type="income"
            onAdd={openAdd}
            onRename={openRename}
            onDelete={onDelete}
          />
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.mode === "rename" ? "Rename category" : "Add category"}
        description={
          editing?.mode === "add" && editing.parentId === null
            ? "Creates a new top-level group."
            : undefined
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={value}
            placeholder="Category name"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error ? <p className="text-sm text-expense">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={create.isPending || rename.isPending}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CategoryGroup({
  title,
  nodes,
  type,
  onAdd,
  onRename,
  onDelete,
}: {
  title: string;
  nodes: CategoryNode[];
  type: CategoryType;
  onAdd: (parentId: string | null, type: CategoryType) => void;
  onRename: (id: string, name: string, type: CategoryType) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => onAdd(null, type)}>
          <Plus className="h-4 w-4" /> Group
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          nodes.map((n) => (
            <NodeRow
              key={n.id}
              node={n}
              onAdd={onAdd}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NodeRow({
  node,
  onAdd,
  onRename,
  onDelete,
}: {
  node: CategoryNode;
  onAdd: (parentId: string | null, type: CategoryType) => void;
  onRename: (id: string, name: string, type: CategoryType) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
        style={{ paddingLeft: `${(node.depth - 1) * 1.25 + 0.5}rem` }}
      >
        {node.depth > 1 ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : null}
        <span
          className={
            node.depth === 1 ? "font-semibold" : "text-sm text-foreground/90"
          }
        >
          {node.name}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {node.depth < 3 ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Add sub-category"
              onClick={() => onAdd(node.id, node.type)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Rename"
            onClick={() => onRename(node.id, node.name, node.type)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-expense"
            title="Delete"
            onClick={() => onDelete(node.id, node.name)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {node.children.map((c) => (
        <NodeRow
          key={c.id}
          node={c}
          onAdd={onAdd}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

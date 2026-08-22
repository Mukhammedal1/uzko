import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

export type SpravochnikField = {
  key: string;
  label: string;
  type: "text" | "select";
  options?: string[];
  placeholder?: string;
};

type Row = { id: string } & Record<string, unknown>;

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: SpravochnikField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "select") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={field.placeholder ?? field.label} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      className="h-9"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder ?? field.label}
    />
  );
}

export function SpravochnikTable({
  fields,
  rows,
  onAdd,
  onUpdate,
  onDelete,
  emptyLabel = "Hozircha yozuv yo'q",
}: {
  fields: SpravochnikField[];
  rows: Row[];
  onAdd: (values: Record<string, string>) => void;
  onUpdate: (id: string, values: Record<string, string>) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
}) {
  const emptyValues = () => Object.fromEntries(fields.map((f) => [f.key, ""]));

  const [addOpen, setAddOpen] = React.useState(false);
  const [addValues, setAddValues] = React.useState<Record<string, string>>(emptyValues);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<Record<string, string>>({});
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const openAdd = () => {
    setAddValues(emptyValues());
    setAddOpen(true);
  };

  const submitAdd = () => {
    if (!addValues[fields[0].key]?.trim()) return;
    onAdd(addValues);
    setAddOpen(false);
  };

  const startEdit = (row: Row) => {
    setPendingDeleteId(null);
    setEditingId(row.id);
    setEditValues(Object.fromEntries(fields.map((f) => [f.key, String(row[f.key] ?? "")])));
  };

  const submitEdit = () => {
    if (!editingId || !editValues[fields[0].key]?.trim()) return;
    onUpdate(editingId, editValues);
    setEditingId(null);
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <div className="text-sm font-semibold">Ro'yxat</div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Qo'shish
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {fields.map((f) => (
              <TableHead key={f.key}>{f.label}</TableHead>
            ))}
            <TableHead className="w-24 text-right">Amal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addOpen && (
            <TableRow>
              {fields.map((f) => (
                <TableCell key={f.key}>
                  <FieldInput
                    field={f}
                    value={addValues[f.key] ?? ""}
                    onChange={(v) => setAddValues((cur) => ({ ...cur, [f.key]: v }))}
                  />
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={submitAdd}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setAddOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}

          {rows.length === 0 && !addOpen && (
            <TableRow>
              <TableCell
                colSpan={fields.length + 1}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}

          {rows.map((row) => {
            if (pendingDeleteId === row.id) {
              return (
                <TableRow key={row.id}>
                  <TableCell colSpan={fields.length + 1}>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/5 px-3 py-2">
                      <span className="text-sm font-medium text-destructive">
                        Rostdan ham o'chirilsinmi?
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            onDelete(row.id);
                            setPendingDeleteId(null);
                          }}
                        >
                          Ha, o'chirish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Bekor qilish
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            if (editingId === row.id) {
              return (
                <TableRow key={row.id}>
                  {fields.map((f) => (
                    <TableCell key={f.key}>
                      <FieldInput
                        field={f}
                        value={editValues[f.key] ?? ""}
                        onChange={(v) => setEditValues((cur) => ({ ...cur, [f.key]: v }))}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={submitEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={row.id}>
                {fields.map((f) => (
                  <TableCell key={f.key}>{String(row[f.key] ?? "") || "—"}</TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(row);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                        setPendingDeleteId(row.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

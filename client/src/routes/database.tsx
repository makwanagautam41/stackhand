import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Play,
  Plus,
  Pencil,
  Trash2,
  Terminal,
  Table2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/database")({
  component: DatabasePage,
  head: () => ({
    meta: [
      { title: "Database · Stackhand" },
      { name: "description", content: "Browse and manage the Stackhand database." },
    ],
  }),
});

interface Column {
  cid: number;
  name: string;
  type: string;
  notNull: boolean;
  default: string | null;
  primaryKey: boolean;
}

function DatabasePage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<{ columns: Column[]; rowCount: number } | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [offset, setOffset] = useState(0);
  const [editRow, setEditRow] = useState<Record<string, any> | null>(null);
  const [newRow, setNewRow] = useState(false);
  const [deleteRowTarget, setDeleteRowTarget] = useState<{ id: string; pk: string } | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<Record<string, any>[] | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);

  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    try {
      const t = await api.dbListTables();
      setTables(t);
      if (t.length > 0 && !selectedTable) setSelectedTable(t[0]);
    } catch (e: any) {
      toast.error(`Failed to load tables: ${e.message}`);
    } finally {
      setLoadingTables(false);
    }
  }, [selectedTable]);

  const loadTable = useCallback(async (table: string) => {
    setLoadingRows(true);
    setQueryResult(null);
    try {
      const [s, r] = await Promise.all([
        api.dbGetTableSchema(table),
        api.dbGetRows(table, 50, offset),
      ]);
      setSchema(s);
      setRows(r);
    } catch (e: any) {
      toast.error(`Failed to load table: ${e.message}`);
    } finally {
      setLoadingRows(false);
    }
  }, [offset]);

  useEffect(() => { fetchTables(); }, []);
  useEffect(() => { if (selectedTable) { setOffset(0); loadTable(selectedTable); } }, [selectedTable]);
  useEffect(() => { if (selectedTable) loadTable(selectedTable); }, [offset]);

  const pkColumn = schema?.columns.find(c => c.primaryKey) ?? schema?.columns[0];

  async function runSql() {
    if (!sqlQuery.trim()) return;
    setQueryRunning(true);
    try {
      const result = await api.dbExecuteQuery(sqlQuery.trim());
      if (result.type === "select") {
        setQueryResult(result.rows);
        toast.success(`Query returned ${result.rows.length} rows`);
      } else {
        toast.success(`Query executed, ${result.affected} rows affected`);
        setQueryResult(null);
        if (selectedTable) loadTable(selectedTable);
      }
    } catch (e: any) {
      toast.error(`Query failed: ${e.message}`);
    } finally {
      setQueryRunning(false);
    }
  }

  async function handleCreate() {
    if (!selectedTable) return;
    try {
      await api.dbCreateRow(selectedTable, editData);
      toast.success("Row created");
      setNewRow(false);
      setEditData({});
      loadTable(selectedTable);
    } catch (e: any) {
      toast.error(`Failed to create row: ${e.message}`);
    }
  }

  async function handleUpdate() {
    if (!selectedTable || !editRow || !pkColumn) return;
    try {
      await api.dbUpdateRow(selectedTable, editRow[pkColumn.name], editData, pkColumn.name);
      toast.success("Row updated");
      setEditRow(null);
      setEditData({});
      loadTable(selectedTable);
    } catch (e: any) {
      toast.error(`Failed to update row: ${e.message}`);
    }
  }

  async function handleDelete() {
    if (!selectedTable || !deleteRowTarget || !pkColumn) return;
    try {
      await api.dbDeleteRow(selectedTable, deleteRowTarget.id, pkColumn.name);
      toast.success("Row deleted");
      setDeleteRowTarget(null);
      loadTable(selectedTable);
    } catch (e: any) {
      toast.error(`Failed to delete row: ${e.message}`);
    }
  }

  function openEditDialog(row: Record<string, any>) {
    setEditRow(row);
    const data: Record<string, string> = {};
    if (pkColumn) {
      for (const col of schema?.columns ?? []) {
        data[col.name] = row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : "";
      }
    }
    setEditData(data);
  }

  function openNewDialog() {
    setNewRow(true);
    const data: Record<string, string> = {};
    for (const col of schema?.columns ?? []) {
      data[col.name] = "";
    }
    setEditData(data);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r shrink-0 flex flex-col bg-muted/30">
        <div className="p-3 border-b">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
        <div className="p-3 border-b flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Database</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={fetchTables}
            title="Refresh tables"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {loadingTables ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))
          ) : tables.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No tables found</p>
          ) : (
            tables.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selectedTable === t
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Table2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t}</span>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => setSqlOpen(!sqlOpen)}
          >
            <Terminal className="h-3.5 w-3.5" />
            SQL Console
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* SQL Console */}
        {sqlOpen && (
          <div className="border-b p-3 bg-muted/20">
            <div className="flex gap-2">
              <Textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM Workspace LIMIT 10;"
                className="min-h-[60px] font-mono text-xs resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runSql();
                }}
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" onClick={runSql} disabled={queryRunning} className="gap-1">
                  {queryRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSqlQuery("")}>
                  Clear
                </Button>
              </div>
            </div>
            {queryResult !== null && (
              <div className="mt-2 max-h-48 overflow-auto rounded border bg-card">
                {queryResult.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No rows returned.</p>
                ) : (
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {Object.keys(queryResult[0]).map((col) => (
                          <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-2 py-1 truncate max-w-[200px]">{val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {/* Table content */}
        <div className="flex-1 overflow-auto p-4">
          {!selectedTable ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a table to browse</p>
              </div>
            </div>
          ) : loadingRows ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : !schema ? (
            <p className="text-sm text-muted-foreground">Failed to load schema.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold">{selectedTable}</h2>
                <Badge variant="secondary" className="font-mono text-xs">{schema.columns.length} columns</Badge>
                <Badge variant="outline" className="font-mono text-xs">{schema.rowCount} rows</Badge>
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => loadTable(selectedTable)} className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                  <Button size="sm" onClick={openNewDialog} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add row
                  </Button>
                </div>
              </div>

              {/* Schema info */}
              <details className="mb-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground font-medium">Table schema</summary>
                <div className="mt-1 overflow-auto rounded border">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-1 text-left">Column</th>
                        <th className="px-2 py-1 text-left">Type</th>
                        <th className="px-2 py-1 text-left">PK</th>
                        <th className="px-2 py-1 text-left">Not Null</th>
                        <th className="px-2 py-1 text-left">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.columns.map((col) => (
                        <tr key={col.cid} className="border-b last:border-0">
                          <td className="px-2 py-1 font-medium">{col.name}</td>
                          <td className="px-2 py-1 text-muted-foreground">{col.type}</td>
                          <td className="px-2 py-1">{col.primaryKey ? "✓" : ""}</td>
                          <td className="px-2 py-1">{col.notNull ? "✓" : ""}</td>
                          <td className="px-2 py-1 text-muted-foreground">{col.default ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {/* Rows table */}
              <div className="rounded border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {schema.columns.map((col) => (
                        <TableHead key={col.cid} className="whitespace-nowrap font-mono text-xs">{col.name}</TableHead>
                      ))}
                      <TableHead className="w-20 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={schema.columns.length + 1} className="text-center text-muted-foreground text-sm py-8">
                          No rows in this table.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, i) => (
                        <TableRow key={i}>
                          {schema.columns.map((col) => (
                            <TableCell key={col.cid} className="font-mono text-xs max-w-[250px] truncate">
                              {row[col.name] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : typeof row[col.name] === "boolean" ? (
                                String(row[col.name])
                              ) : (
                                String(row[col.name])
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(row)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (pkColumn) setDeleteRowTarget({ id: row[pkColumn.name], pk: pkColumn.name });
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {schema.rowCount > 50 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    Showing {offset + 1}–{Math.min(offset + 50, schema.rowCount)} of {schema.rowCount}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - 50))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + 50 >= schema.rowCount}
                      onClick={() => setOffset(offset + 50)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={(v) => { if (!v) setEditRow(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit {selectedTable} row</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {schema?.columns.map((col) => (
              <div key={col.cid}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {col.name}
                  <span className="text-muted-foreground/50 ml-1">({col.type})</span>
                </label>
                <Input
                  value={editData[col.name] ?? ""}
                  onChange={(e) => setEditData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                  className="font-mono text-xs"
                  placeholder={col.notNull ? "Required" : "NULL"}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Row Dialog */}
      <Dialog open={newRow} onOpenChange={(v) => { if (!v) setNewRow(false); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>New row in {selectedTable}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {schema?.columns
              .filter((col) => !col.primaryKey || col.type !== "String")
              .map((col) => (
                <div key={col.cid}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    {col.name}
                    <span className="text-muted-foreground/50 ml-1">({col.type})</span>
                    {col.primaryKey && <span className="text-amber-500 ml-1">PK</span>}
                  </label>
                  <Input
                    value={editData[col.name] ?? ""}
                    onChange={(e) => setEditData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                    className="font-mono text-xs"
                    placeholder={col.notNull ? "Required" : "NULL"}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRow(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteRowTarget} onOpenChange={(v) => { if (!v) setDeleteRowTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete row?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this row from <strong>{selectedTable}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

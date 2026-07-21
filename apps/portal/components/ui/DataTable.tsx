"use client";

import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchPlaceholder?: string;
  enableSearch?: boolean;
  globalFilterFn?: (row: Row<TData>, query: string) => boolean;
  emptyState?: ReactNode;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Rechercher…",
  enableSearch = true,
  globalFilterFn,
  emptyState,
  pageSize = 10,
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    globalFilterFn: globalFilterFn
      ? (row, _id, value) => globalFilterFn(row, String(value ?? ""))
      : undefined,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      {enableSearch && (
        <div className="flex items-center gap-2">
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="bg-muted/40">
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown className="size-3.5 text-muted-foreground" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyState ?? "Aucun résultat."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          pageCount={table.getPageCount()}
          onPageChange={(p) => table.setPageIndex(p - 1)}
          total={table.getFilteredRowModel().rows.length}
          pageSize={table.getState().pagination.pageSize}
          itemLabel="ligne"
        />
      )}
    </div>
  );
}

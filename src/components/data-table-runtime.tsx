"use client";
"use no memo"; // Bypasses React Compiler cascading mismatches globally for this layout file

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GripVerticalIcon, Columns3Icon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";

export interface DataTableFeatures {
  pagination?: boolean;
  search?: boolean;
  columnVisibility?: boolean;
  sorting?: boolean;
  filtering?: boolean;
  rowSelection?: boolean;
  toolbar?: boolean;
  footer?: boolean;
  columnHeaders?: boolean;
  emptyState?: boolean;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId: (row: TData) => string;
  onReorder?: (newData: TData[]) => void;
  features?: DataTableFeatures;
  searchPlaceholder?: string;
  searchColumn?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  paginationState?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  toolbarContent?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  renderTabs?: React.ReactNode;
  footerContent?: React.ReactNode;
  emptyStateContent?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  isLoading?: boolean;
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent cursor-grab active:cursor-grabbing transition-colors">
      <GripVerticalIcon className="size-3.5 opacity-70" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function DraggableRow<TData>({ row }: { row: Row<TData> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 h-14 hover:bg-muted/30 dark:hover:bg-zinc-900/40 transition-colors data-[dragging=true]:z-10 data-[dragging=true]:opacity-70 data-[dragging=true]:bg-muted/60"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}>
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className="px-4 text-xs font-medium text-foreground tracking-tight">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTableRuntime<TData, TValue>({
  columns,
  data,
  getRowId,
  onReorder,
  features,
  searchPlaceholder = "Search...",
  searchColumn,
  defaultPageSize = 5,
  pageSizeOptions = [5, 10, 20, 30, 40, 50],
  paginationState,
  onPaginationChange,
  toolbarContent,
  toolbarActions,
  renderTabs,
  footerContent,
  emptyStateContent,
  className,
  containerClassName,
  isLoading = false, // Add default value
}: DataTableProps<TData, TValue>) {
  const enabled = {
    pagination: features?.pagination ?? true,
    search: features?.search ?? false,
    columnVisibility: features?.columnVisibility ?? true,
    sorting: features?.sorting ?? true,
    filtering: features?.filtering ?? true,
    rowSelection: features?.rowSelection ?? true,
    toolbar: features?.toolbar ?? true,
    footer: features?.footer ?? true,
    columnHeaders: features?.columnHeaders ?? true,
    emptyState: features?.emptyState ?? true,
  };
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const finalColumns = React.useMemo(() => {
    if (!onReorder) return columns;

    const dragColumn: ColumnDef<TData, unknown> = {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.id} />,
    };
    return [dragColumn, ...columns];
  }, [columns, onReorder]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: finalColumns,
    // TanStack's debug memo instrumentation reads the current time while row
    // models are evaluated. Cache Components can prerender this boundary, so
    // keep every timing/debug option explicitly disabled here.
    debugAll: false,
    debugTable: false,
    debugRows: false,
    debugColumns: false,
    debugHeaders: false,
    debugCells: false,
    state: {
      sorting: enabled.sorting ? sorting : [],
      columnVisibility,
      rowSelection: enabled.rowSelection ? rowSelection : {},
      columnFilters,
      globalFilter,
      ...(enabled.pagination
        ? { pagination: paginationState ?? pagination }
        : {}),
    },
    getRowId,
    enableRowSelection: enabled.rowSelection,
    onRowSelectionChange: enabled.rowSelection ? setRowSelection : undefined,
    onSortingChange: enabled.sorting ? setSorting : undefined,
    onColumnFiltersChange: enabled.filtering
      ? setColumnFilters
      : undefined,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: enabled.pagination
      ? (onPaginationChange ?? setPagination)
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel:
      enabled.filtering || enabled.search ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enabled.pagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: enabled.sorting ? getSortedRowModel() : undefined,
    getFacetedRowModel: enabled.filtering ? getFacetedRowModel() : undefined,
    getFacetedUniqueValues: enabled.filtering
      ? getFacetedUniqueValues()
      : undefined,
  });

  const rows = table.getRowModel().rows;
  const searchValue = searchColumn
    ? ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? "")
    : globalFilter;
  const dataIds = React.useMemo(() => {
    return rows.map((row) => row.id);
  }, [rows]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id && onReorder) {
      const oldIndex = data.findIndex(
        (item) => getRowId(item) === active.id.toString(),
      );
      const newIndex = data.findIndex(
        (item) => getRowId(item) === over.id.toString(),
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const rearranged = arrayMove([...data], oldIndex, newIndex);
        onReorder(rearranged);
      }
    }
  }

  return (
    <div
      className={cn(
        "flex min-w-0 w-full flex-col gap-5 rounded-[24px] border border-border/60 bg-card p-5 text-card-foreground shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]",
        className,
      )}>
      {enabled.toolbar &&
        (renderTabs || toolbarContent || toolbarActions || enabled.search || enabled.columnVisibility) && (
          <div className="flex flex-col justify-between gap-4 border-b border-border/40 pb-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {renderTabs}
              {toolbarContent}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
              {enabled.search && (
                <Input
                  value={searchValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (searchColumn) table.getColumn(searchColumn)?.setFilterValue(value);
                    else table.setGlobalFilter(value);
                  }}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-9 w-48 rounded-xl text-xs"
                />
              )}
              {enabled.columnVisibility && (
                <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-[180px] px-4 rounded-xl text-xs font-medium tracking-tight border-border/60 hover:bg-muted/80 active:scale-95 transition-all flex justify-between">
                <Columns3Icon className="size-3.5 mr-1.5 opacity-70" />
                Columns
                <ChevronDownIcon className="size-3.5 ml-1.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-border/60 p-1 min-w-[130px] text-xs font-medium">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide(),
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize rounded-lg text-xs font-semibold py-1.5"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }>
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
                </DropdownMenu>
              )}
              {toolbarActions}
            </div>
          </div>
        )}

      <div className={cn("relative flex min-w-0 flex-col gap-4", containerClassName)}>
        <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border/60">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-card/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <span className="text-xs font-medium text-muted-foreground animate-pulse">
                  Loading data...
                </span>
              </div>
            </div>
          )}
          
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}>
            <Table className="min-w-max">
              {enabled.columnHeaders && (
                <TableHeader className="sticky top-0 z-10 border-b border-border/60 bg-muted/60 backdrop-blur-xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="h-10 hover:bg-transparent border-b border-border/60">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className="px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
                </TableHeader>
              )}
              <TableBody className="**:data-[slot=table-cell]:first:w-8 divide-y divide-border/40">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : enabled.emptyState ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={finalColumns.length}
                      className="h-28 text-center text-xs font-semibold text-muted-foreground">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
                          <span>Fetching records...</span>
                        </div>
                      ) : emptyStateContent ? (
                        emptyStateContent
                      ) : (
                        "No results found."
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        {enabled.footer &&
          (enabled.pagination || footerContent) && (
            <div className="flex flex-col items-center justify-between gap-4 px-1 pt-2 select-none sm:flex-row">
              <div className="flex-1 text-xs font-semibold text-muted-foreground">
                {footerContent ??
                  (enabled.rowSelection && (
                    <span className="hidden lg:inline">
                      {table.getFilteredSelectedRowModel().rows.length} of{" "}
                      {table.getFilteredRowModel().rows.length} row(s) selected.
                    </span>
                  ))}
              </div>

              {enabled.pagination && <PaginationControls pageIndex={table.getState().pagination.pageIndex} pageSize={table.getState().pagination.pageSize} pageCount={table.getPageCount()} pageSizeOptions={pageSizeOptions} onPageChange={(pageIndex) => table.setPageIndex(pageIndex)} onPageSizeChange={(pageSize) => table.setPageSize(pageSize)} />}
            </div>
          )}
      </div>
    </div>
  );
}

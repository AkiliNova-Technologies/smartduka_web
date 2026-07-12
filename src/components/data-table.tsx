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
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GripVerticalIcon,
  Columns3Icon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
} from "lucide-react";

interface ReusableDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId: (row: TData) => string;
  onReorder?: (newData: TData[]) => void;
  toolbarActions?: React.ReactNode;
  renderTabs?: React.ReactNode;
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

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  onReorder,
  toolbarActions,
  renderTabs,
  isLoading = false, // Add default value
}: ReusableDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 5,
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
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const rows = table.getRowModel().rows;
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
    <div className="w-full flex flex-col gap-5 bg-card text-card-foreground rounded-[24px] border border-border/60 p-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        {renderTabs || <div />}

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
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
          {toolbarActions}
        </div>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-xl border border-border/60 relative">
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
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-xs border-b border-border/60">
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
              <TableBody className="**:data-[slot=table-cell]:first:w-8 divide-y divide-border/40">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={finalColumns.length}
                      className="h-28 text-center text-xs font-semibold text-muted-foreground">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
                          <span>Fetching records...</span>
                        </div>
                      ) : (
                        "No results found."
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-1 select-none">
          <div className="hidden flex-1 text-xs font-semibold text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>

          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6 lg:gap-8">
            <div className="hidden items-center gap-2.5 lg:flex">
              <Label
                htmlFor="rows-per-page"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger
                  size="sm"
                  className="w-20 h-8 rounded-lg border-border/60 text-xs font-medium"
                  id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent
                  side="top"
                  className="rounded-xl border-border/60 p-1">
                  <SelectGroup>
                    {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem
                        key={pageSize}
                        value={`${pageSize}`}
                        className="rounded-lg text-xs font-semibold">
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs font-medium text-foreground tracking-tight">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 rounded-lg border-border/60 lg:flex active:scale-95 transition-transform"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}>
                <ChevronsLeftIcon className="size-4 opacity-70" />
              </Button>
              <Button
                variant="outline"
                className="size-8 rounded-lg border-border/60 active:scale-95 transition-transform"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}>
                <ChevronLeftIcon className="size-4 opacity-70" />
              </Button>
              <Button
                variant="outline"
                className="size-8 rounded-lg border-border/60 active:scale-95 transition-transform"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}>
                <ChevronRightIcon className="size-4 opacity-70" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 rounded-lg border-border/60 lg:flex active:scale-95 transition-transform"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}>
                <ChevronsRightIcon className="size-4 opacity-70" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type RecordsTableBulkAction<TData> = {
  label: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  onClick: (rows: TData[]) => void | Promise<void>
}

export function createSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

function EmptyRows({ rows, colSpan }: { rows: number; colSpan: number }) {
  if (rows <= 0) return null
  return Array.from({ length: rows }).map((_, index) => (
    <TableRow key={`empty-${index}`} className="h-14 hover:bg-transparent">
      <TableCell colSpan={colSpan}>&nbsp;</TableCell>
    </TableRow>
  ))
}

export function RecordsTable<TData>({
  data,
  columns,
  title,
  description,
  searchPlaceholder = "Search records...",
  getRowId,
  actions,
  bulkActions = [],
}: {
  data: TData[]
  columns: ColumnDef<TData>[]
  title: string
  description?: string
  searchPlaceholder?: string
  getRowId: (row: TData) => string
  actions?: React.ReactNode
  bulkActions?: RecordsTableBulkAction<TData>[]
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getRowId,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)
  const pageRows = table.getRowModel().rows
  const filteredRows = table.getFilteredRowModel().rows
  const pageCount = table.getPageCount() || 1
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const startIndex = filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1
  const endIndex = Math.min((pageIndex + 1) * pageSize, filteredRows.length)
  const emptyRowCount = filteredRows.length > 0 ? Math.max(0, pageSize - pageRows.length) : 0

  React.useEffect(() => {
    table.setPageIndex(0)
  }, [globalFilter, pageSize, table])

  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <div className="flex h-[42rem] min-h-[34rem] flex-col overflow-hidden rounded-xl border bg-background md:h-[46rem]">
        <div className="shrink-0 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-medium tracking-tight">{title}</h2>
              {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-72">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full pl-8"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Columns3Icon data-icon="inline-start" />
                    Columns
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        className="capitalize"
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {actions}
            </div>
          </div>
        </div>

        {selectedRows.length > 0 ? (
          <div className="shrink-0 border-t bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                <span className="font-medium text-foreground">{selectedRows.length}</span> record
                {selectedRows.length === 1 ? "" : "s"} selected.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => table.resetRowSelection()}>
                  Clear selection
                </Button>
                {bulkActions.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={() => void action.onClick(selectedRows)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col gap-2 border-t px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> of{" "}
            <span className="font-medium text-foreground">{filteredRows.length}</span> records
          </span>
          {globalFilter ? (
            <Button variant="ghost" size="sm" onClick={() => setGlobalFilter("")}>
              Clear search
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 overflow-auto border-t">
          <Table className="min-w-[860px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {pageRows.length ? (
                pageRows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="h-14">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className="flex h-72 flex-col items-center justify-center gap-2 p-6 text-center">
                      <p className="font-medium text-foreground">No records found</p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {globalFilter ? "Try another search term or clear the search." : "Create a record to see it here."}
                      </p>
                      {globalFilter ? (
                        <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")}>Clear search</Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              <EmptyRows rows={emptyRowCount} colSpan={columns.length} />
            </TableBody>
          </Table>
        </div>

        <div className="shrink-0 border-t bg-background px-3 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of {filteredRows.length} row(s) selected · Page{" "}
              <span className="font-medium text-foreground">{pageIndex + 1}</span> of{" "}
              <span className="font-medium text-foreground">{pageCount}</span>
            </div>
            <div className="grid grid-cols-[1fr_2.25rem_2.25rem] items-center gap-2 sm:flex sm:flex-wrap">
              <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeftIcon />
                <span className="sr-only">First page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRightIcon />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
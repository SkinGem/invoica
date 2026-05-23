"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { format } from "date-fns"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useVirtualizer } from "@tanstack/react-virtual"

import type { SpamEntry, SpamType } from "@/types/spam.types"

// ═══════════════════════════════════════════════════════════════
// PAGINATION HOOK — Extracted to reduce critical path bundle
// ═══════════════════════════════════════════════════════════════

function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = items.slice(startIndex, endIndex)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(clamped)
  }, [totalPages])

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

  return {
    currentPage,
    totalPages,
    paginatedItems,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value)
}

function isValidIPv4(value: string): boolean {
  return IPV4_REGEX.test(value)
}

function validateSpamEntry(
  value: string,
  type: SpamType
): { valid: boolean; error?: string } {
  if (!value || value.trim() === "") {
    return { valid: false, error: "Value is required" }
  }

  const trimmed = value.trim()

  if (type === "email") {
    if (!isValidEmail(trimmed)) {
      return { valid: false, error: "Invalid email format (e.g., user@example.com)" }
    }
  } else if (type === "ip") {
    if (!isValidIPv4(trimmed)) {
      return { valid: false, error: "Invalid IPv4 address format (e.g., 192.168.1.1)" }
    }
  }

  return { valid: true }
}

// ═══════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const initialSpamEntries: SpamEntry[] = [
  {
    id: "1",
    value: "spammer@example.com",
    type: "email",
    reason: "Bulk spam campaign detected",
    created_at: new Date("2024-01-15T10:30:00Z"),
  },
  {
    id: "2",
    value: "192.168.1.100",
    type: "ip",
    reason: "Malicious traffic from known botnet",
    created_at: new Date("2024-01-20T14:45:00Z"),
  },
  {
    id: "3",
    value: "malicious-domain.net",
    type: "email",
    reason: "Phishing attempts reported",
    created_at: new Date("2024-02-01T09:15:00Z"),
  },
]

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "N/A"
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return isNaN(d.getTime()) ? "Invalid date" : format(d, "MMM dd, yyyy HH:mm")
  } catch {
    return "Invalid date"
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT — Critical path kept minimal
// ═══════════════════════════════════════════════════════════════

export function SpamBlacklistTable() {
  const [entries, setEntries] = useState<SpamEntry[]>(initialSpamEntries)
  const [newEntry, setNewEntry] = useState({ value: "", type: "email" as SpamType, reason: "" })
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Pagination with virtualization threshold
  const PAGE_SIZE = 10
  const VIRTUALIZATION_THRESHOLD = 50

  const {
    currentPage,
    totalPages,
    paginatedItems,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination(entries, PAGE_SIZE)

  // Virtualizer for large lists
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: paginatedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  })

  const showVirtualization = entries.length >= VIRTUALIZATION_THRESHOLD

  const handleAdd = useCallback(() => {
    const validation = validateSpamEntry(newEntry.value, newEntry.type)
    if (!validation.valid) {
      setError(validation.error ?? "Invalid entry")
      return
    }

    const entry: SpamEntry = {
      id: generateId(),
      value: newEntry.value.trim(),
      type: newEntry.type,
      reason: newEntry.reason || "Manual addition",
      created_at: new Date(),
    }

    setEntries((prev) => [entry, ...prev])
    setNewEntry({ value: "", type: "email", reason: "" })
    setError(null)
    setIsOpen(false)
  }, [newEntry])

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Spam Blacklist</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Spam Entry</DialogTitle>
              <DialogDescription>
                Add an email address or IP to the blacklist.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newEntry.type}
                  onValueChange={(v) => setNewEntry((p) => ({ ...p, type: v as SpamType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="ip">IP Address</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">
                  {newEntry.type === "email" ? "Email Address" : "IP Address"}
                </Label>
                <Input
                  id="value"
                  placeholder={newEntry.type === "email" ? "user@example.com" : "192.168.1.1"}
                  value={newEntry.value}
                  onChange={(e) => setNewEntry((p) => ({ ...p, value: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  placeholder="Reason for blacklisting"
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry((p) => ({ ...p, reason: e.target.value }))}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add to Blacklist</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showVirtualization ? (
              <div ref={parentRef} className="h-[400px] overflow-auto">
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = paginatedItems[virtualRow.index]
                  return (
                    <TableRow
                      key={item.id}
                      style={{
                        height: `${virtualRow.size}px`,
                      }}
                    >
                      <TableCell className="font-mono">{item.value}</TableCell>
                      <TableCell className="capitalize">{item.type}</TableCell>
                      <TableCell>{item.reason}</TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </div>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.value}</TableCell>
                  <TableCell className="capitalize">{item.type}</TableCell>
                  <TableCell>{item.reason}</TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {entries.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({entries.length} total)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevPage} disabled={!hasPrevPage}>
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasNextPage}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
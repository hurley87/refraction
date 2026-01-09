# Form Builder Agent

You are a specialized form-building agent for a Next.js 16 + React 19 project. This project uses **manual state management** (not React Hook Form hooks) with Zod validation.

## Tech Stack

- **Validation**: Zod schemas with `safeParse()`
- **State**: Manual `useState` for each field and arrays
- **Notifications**: Sonner toast (`toast.success()`, `toast.error()`)
- **Data Fetching**: TanStack React Query
- **UI Components**: Shadcn/ui (Button, Input, Select, Card, Dialog)
- **Icons**: lucide-react

## Form Structure Template

```typescript
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react"

// 1. Define Zod schema at module level
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email address"),
  items: z.array(z.object({
    id: z.string(),
    value: z.number().min(0).max(100),
  })).min(1, "At least one item required"),
})

// 2. Define form field type with local IDs
type FormItem = {
  id: string  // local UUID for React keys
  value: number
}

// 3. Component with variant support
export function MyForm({
  onSuccess,
  variant = "card",
}: {
  onSuccess?: () => void
  variant?: "card" | "dialog"
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // 4. Manual state for each field
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [items, setItems] = useState<FormItem[]>([
    { id: crypto.randomUUID(), value: 0 },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // 5. Array operations with useCallback
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), value: 0 }])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateItem = useCallback((id: string, value: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value } : item))
    )
  }, [])

  // 6. Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = {
      name: name.trim(),
      email: email.trim(),
      items: items.map(({ value }) => ({ value })),
    }

    // Validate with Zod
    const result = formSchema.safeParse(formData)
    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        errors[issue.path.join(".")] = issue.message
      })
      setFieldErrors(errors)
      setError(result.error.issues[0]?.message || "Please fix errors")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/v2/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData.message || "Request failed"
        setError(msg)
        toast.error("Failed", { description: msg })
        return
      }

      await queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Created successfully", {
        description: "Your item is ready.",
      })
      onSuccess?.()
      router.refresh()

      // Reset form
      setName("")
      setEmail("")
      setItems([{ id: crypto.randomUUID(), value: 0 }])
    } catch {
      setError("An unexpected error occurred")
      toast.error("Failed", { description: "Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 7. Form JSX (extracted for variant support)
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  )

  // 8. Variant rendering
  if (variant === "dialog") {
    return formContent
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Title</CardTitle>
        <CardDescription>Form description here.</CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}
```

## Key Patterns

### Input Transformations
```typescript
// Auto-uppercase
const handleSymbolChange = (value: string) => {
  setSymbol(value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
}
```

### Real-time Validation Display
```typescript
const total = items.reduce((sum, item) => sum + item.value, 0)
const isValid = Math.abs(total - 100) < 0.001  // floating-point tolerance

{isValid ? (
  <span className="text-emerald-600"><CheckCircle2 /> 100%</span>
) : (
  <span className="text-amber-600"><AlertCircle /> {total.toFixed(1)}%</span>
)}
```

### Change Detection (for edit forms)
```typescript
const hasChanges = items.some((item) => {
  const original = originalItems.find((o) => o.id === item.id)
  return !original || Math.abs(original.value - item.value) > 0.001
})

<Button disabled={!hasChanges}>Update</Button>
{!hasChanges && <p className="text-muted-foreground">No changes detected</p>}
```

### Data Fetching for Select Options
```typescript
const { data: options = [], isLoading } = useQuery({
  queryKey: ["options"],
  queryFn: fetchOptions,
  staleTime: 5 * 60 * 1000,
})
```

### Toast Notifications
```typescript
// Success
toast.success("Created successfully", {
  description: "Your item is ready to use.",
})

// Error
toast.error("Failed to create", {
  description: errorMessage,
})
```

## Zod Schema Patterns

```typescript
// UUID validation
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
z.string().regex(uuidRegex, "Invalid ID")

// Percentage weight
z.number().min(0.01, "Must be > 0").max(100, "Cannot exceed 100%")

// Trimmed string
z.string().min(1, "Required").trim()

// Array with limits
z.array(itemSchema).min(1, "At least one required").max(50, "Maximum 50")
```

## Button Disabled Logic
```typescript
<Button
  type="submit"
  disabled={
    isSubmitting ||
    isLoadingData ||
    !!dataError ||
    !requiredField.trim() ||
    !isValidTotal ||
    items.some((item) => !item.requiredProp)
  }
>
  {isSubmitting ? "Creating..." : "Create"}
</Button>
```

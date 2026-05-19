"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateTaskStatus, createTask, deleteTask } from "../actions"
import { Plus, Trash2, CheckSquare } from "lucide-react"

interface Task {
  id: string
  name: string
  status: string
  completedAt: Date | null
}

export function TaskList({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const [items, setItems] = useState(tasks)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)

  async function toggle(taskId: string, done: boolean) {
    setItems(prev => prev.map(t => t.id === taskId ? { ...t, status: done ? "DONE" : "TODO" } : t))
    await updateTaskStatus(taskId, projectId, done)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    const name = newName.trim()
    setItems(prev => [...prev, { id: `tmp-${Date.now()}`, name, status: "TODO", completedAt: null }])
    setNewName("")
    const fd = new FormData()
    fd.set("name", name)
    await createTask(projectId, fd)
    setAdding(false)
  }

  async function handleDelete(taskId: string) {
    setItems(prev => prev.filter(t => t.id !== taskId))
    await deleteTask(taskId, projectId)
  }

  const done = items.filter(t => t.status === "DONE").length

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">Tareas ({done}/{items.length} completadas)</h3>
      </div>

      <div className="space-y-2 mb-4">
        {items.map(task => (
          <div key={task.id} className="flex items-center gap-3 group">
            <input
              type="checkbox"
              checked={task.status === "DONE"}
              onChange={e => toggle(task.id, e.target.checked)}
              className="size-4 rounded accent-foreground cursor-pointer"
            />
            <span className={`flex-1 text-sm ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
              {task.name}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(task.id)}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nueva tarea..."
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>
    </Card>
  )
}

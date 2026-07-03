import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Trash2, Send, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db, type DraftService } from "@/store/db"
import { uploadMultipart } from "@/api/client"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

export default function Drafts() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [drafts, setDrafts] = useState<DraftService[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})

  const loadDrafts = useCallback(async () => {
    const all = await db.drafts.toArray()
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    setDrafts(all)
    setLoading(false)
  }, [])

  useEffect(() => { loadDrafts() }, [loadDrafts])

  const removeDraft = async (localId: string) => {
    await db.drafts.delete(localId)
    await loadDrafts()
  }

  const syncDraft = async (draft: DraftService) => {
    if (!online) return
    setSyncing((prev) => ({ ...prev, [draft.localId]: true }))
    try {
      let toys = draft.toys
      if (Array.isArray(draft.toys)) toys = JSON.stringify(draft.toys)
      const fields: Record<string, string> = {
        localId: draft.localId,
        machineNumber: String(draft.machineNumber),
        serviceDate: draft.serviceDate,
        serviceTime: draft.serviceTime,
        gameCounter: String(draft.gameCounter),
        testGames: String(draft.testGames),
        isOperational: String(draft.isOperational),
        toys: String(toys),
      }
      if (draft.prizeCounter != null) fields.prizeCounter = String(draft.prizeCounter)
      if (draft.comment) fields.comment = draft.comment
      const files: Record<string, Blob> = {}
      if (draft.photoCounter) files.photoCounter = draft.photoCounter
      if (draft.photoBefore) files.photoBefore = draft.photoBefore
      if (draft.photoAfter) files.photoAfter = draft.photoAfter
      const result = await uploadMultipart<{
        success: boolean
        errors?: { field: string; message: string }[]
      }>("/sync", fields, files)
      if (result.success) {
        await db.drafts.delete(draft.localId)
      } else {
        await db.drafts.update(draft.localId, {
          status: "error",
          errors: result.errors?.map((e) => e.message) ?? ["Sync error"],
        })
      }
    } catch {
      await db.drafts.update(draft.localId, {
        status: "error",
        errors: ["Network error"],
      })
    } finally {
      setSyncing((prev) => ({ ...prev, [draft.localId]: false }))
      await loadDrafts()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Нет черновиков</h2>
        <p className="text-muted-foreground">Незавершённые обслуживания появятся здесь</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Черновики</h1>
        <p className="text-muted-foreground">Ожидают отправки ({drafts.length})</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {drafts.map((draft) => (
          <Card key={draft.localId}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">#{draft.machineNumber}</CardTitle>
                <p className="text-sm text-muted-foreground">{draft.machineAddress}</p>
              </div>
              <Badge variant={draft.status === "error" ? "destructive" : "secondary"}>
                {draft.status === "error" ? "Ошибка" : "Черновик"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{draft.serviceDate} {draft.serviceTime}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/machines/' + draft.machineNumber + '/service')}>
                  <FileText className="h-3 w-3 mr-1" />Править
                </Button>
                {online && (
                  <Button variant="default" size="sm" className="flex-1" disabled={!!syncing[draft.localId]} onClick={() => syncDraft(draft)}>
                  <Send className="h-3 w-3 mr-1" />{syncing[draft.localId] ? "..." : "Отпр."}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeDraft(draft.localId)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
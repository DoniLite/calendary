import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'

export type RichMarkdownEditorProps = {
  value: string
  onChange?: (value: string) => void
  label?: string
  readOnly?: boolean
}

type EditorModule = {
  RichMarkdownEditorClient: ComponentType<RichMarkdownEditorProps>
}

export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<RichMarkdownEditorProps> | null>(null)

  useEffect(() => {
    let active = true

    import('./rich-markdown-editor.client').then((module: EditorModule) => {
      if (active) {
        setEditor(() => module.RichMarkdownEditorClient)
      }
    })

    return () => {
      active = false
    }
  }, [])

  if (!Editor) {
    if (props.readOnly) {
      return (
        <div className="space-y-3 py-1">
          <div className="h-5 w-1/2 rounded-md bg-muted" />
          <div className="h-4 w-full rounded-md bg-muted" />
          <div className="h-4 w-5/6 rounded-md bg-muted" />
        </div>
      )
    }
    return (
      <div className="min-h-[460px] rounded-md border bg-background">
        <div className="flex min-h-11 items-center gap-2 border-b bg-muted/55 px-3">
          <div className="h-7 w-24 rounded-md bg-muted" />
          <div className="h-7 w-32 rounded-md bg-muted" />
          <div className="h-7 w-20 rounded-md bg-muted" />
        </div>
        <div className="space-y-4 p-5">
          <div className="h-8 w-2/3 rounded-md bg-muted" />
          <div className="h-4 w-full rounded-md bg-muted" />
          <div className="h-4 w-5/6 rounded-md bg-muted" />
          <div className="h-28 rounded-md bg-muted/70" />
        </div>
      </div>
    )
  }

  return <Editor {...props} />
}

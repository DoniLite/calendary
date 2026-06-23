import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import type { RichMarkdownEditorProps } from './rich-markdown-editor'

const editorPlugins = [
  headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
  listsPlugin(),
  quotePlugin(),
  linkPlugin(),
  linkDialogPlugin(),
  tablePlugin(),
  thematicBreakPlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      txt: 'Plain text',
      kotlin: 'Kotlin',
      sql: 'SQL',
      ts: 'TypeScript',
      json: 'JSON',
      bash: 'Bash',
    },
    autoLoadLanguageSupport: false,
  }),
  diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: '' }),
  markdownShortcutPlugin(),
  toolbarPlugin({
    toolbarContents: () => (
      <DiffSourceToggleWrapper options={['rich-text', 'source']}>
        <UndoRedo />
        <Separator />
        <BlockTypeSelect />
        <Separator />
        <BoldItalicUnderlineToggles />
        <CodeToggle />
        <Separator />
        <ListsToggle options={['bullet', 'number', 'check']} />
        <Separator />
        <CreateLink />
        <InsertTable />
        <InsertThematicBreak />
        <InsertCodeBlock />
      </DiffSourceToggleWrapper>
    ),
  }),
]

export function RichMarkdownEditorClient({ value, onChange, label = 'Description' }: RichMarkdownEditorProps) {
  return (
    <div className="calendary-mdx-editor" aria-label={label}>
      <MDXEditor
        markdown={value}
        onChange={(nextValue) => onChange(nextValue)}
        plugins={editorPlugins}
        contentEditableClassName="calendary-mdx-editor-content"
        placeholder="Write a clear description, add decisions, checklist items, links or technical notes..."
        trim={false}
      />
    </div>
  )
}

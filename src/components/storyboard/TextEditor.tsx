import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { debug } from '@tauri-apps/plugin-log';

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function TextEditor({ content, onChange, placeholder, className }: TextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] outline-none text-left',
      },
    },
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
      debug(`TextEditor content changed:\n${editor.getText()}`);
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getText()) {
      editor.commands.setContent(content, {
        parseOptions: {
          preserveWhitespace: 'full',
        }
      });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-md overflow-hidden ${className || ''}`}>
      <div className="min-h-[150px] p-4 relative">
        {placeholder && !content && (
          <div className="absolute text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

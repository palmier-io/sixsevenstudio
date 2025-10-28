import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

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
    parseOptions: {
      preserveWhitespace: true,
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText({ blockSeparator: '\n\n'}));
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getText({ blockSeparator: '\n\n' })) {
      editor.commands.setContent(content, {
        parseOptions: {
          preserveWhitespace: true,
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

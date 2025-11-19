import React, { useEffect, useMemo, useRef, useState } from 'react';

type NoteType = 'text' | 'image' | 'pdf';

interface NoteItem {
  id: string;
  subject: string;
  type: NoteType;
  title: string;
  // For text notes
  content?: string;
  // For files (image/pdf)
  url?: string;
  fileName?: string;
  createdAt: string; // ISO
}

const LS_KEY = 'notes-data-v1';

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [subject, setSubject] = useState<string>('General');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [fileSubject, setFileSubject] = useState('General');
  const [fileTitle, setFileTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: NoteItem[] = JSON.parse(raw);
        setNotes(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const subjects = useMemo(() => {
    const set = new Set<string>(['General']);
    notes.forEach(n => set.add(n.subject));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return filterSubject === 'All' ? notes : notes.filter(n => n.subject === filterSubject);
  }, [notes, filterSubject]);

  const addTextNote = () => {
    if (!textTitle.trim() || !textBody.trim()) return;
    const newNote: NoteItem = {
      id: crypto.randomUUID(),
      subject,
      type: 'text',
      title: textTitle.trim(),
      content: textBody.trim(),
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setTextTitle('');
    setTextBody('');
  };

  const addFileNotes = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const makeNote = (file: File): Promise<NoteItem> => {
      return new Promise((resolve) => {
        const type: NoteType = file.type.startsWith('image/') ? 'image' : (file.type === 'application/pdf' ? 'pdf' : 'text');
        const reader = new FileReader();
        reader.onload = () => {
          const url = typeof reader.result === 'string' ? reader.result : undefined;
          resolve({
            id: crypto.randomUUID(),
            subject: fileSubject,
            type,
            title: fileTitle.trim() || file.name,
            url,
            fileName: file.name,
            createdAt: new Date().toISOString(),
          });
        };
        if (type === 'image' || type === 'pdf') {
          reader.readAsDataURL(file);
        } else {
          // Fallback: treat as text if not image/pdf
          reader.readAsText(file);
          reader.onload = () => {
            resolve({
              id: crypto.randomUUID(),
              subject: fileSubject,
              type: 'text',
              title: fileTitle.trim() || file.name,
              content: String(reader.result || ''),
              createdAt: new Date().toISOString(),
            });
          };
        }
      });
    };

    const results: NoteItem[] = [];
    for (const file of Array.from(files)) {
      // eslint-disable-next-line no-await-in-loop
      const note = await makeNote(file);
      results.push(note);
    }
    setNotes(prev => [...results, ...prev]);
    setFileTitle('');
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    setDragOver(false);
    await addFileNotes(e.dataTransfer.files);
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Upload and organize your study notes (text, images, PDFs).</p>
        </div>
      </header>

      {/* Create Text Note */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Create Text Note</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold mb-2">Subject</label>
            <input
              value={subject}
              onChange={(e)=> setSubject(e.target.value)}
              placeholder="e.g., Math"
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              value={textTitle}
              onChange={(e)=> setTextTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">Content</label>
            <textarea
              value={textBody}
              onChange={(e)=> setTextBody(e.target.value)}
              rows={3}
              placeholder="Type your notes here..."
              className="w-full rounded-md p-2 text-black"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={addTextNote}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            title="Save this text note"
          >Save Note</button>
        </div>
      </section>

      {/* Upload Files */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Upload Files (Images / PDF)</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Subject</label>
            <input
              value={fileSubject}
              onChange={(e)=> setFileSubject(e.target.value)}
              placeholder="e.g., Physics"
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Title (optional)</label>
            <input
              value={fileTitle}
              onChange={(e)=> setFileTitle(e.target.value)}
              placeholder="If empty, the file name will be used"
              className="w-full rounded-md p-2 text-black"
            />
          </div>
          <div className="md:col-span-2">
            <div
              onDragOver={(e)=> { e.preventDefault(); setDragOver(true); }}
              onDragLeave={()=> setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center ${dragOver ? 'border-violet-500 bg-violet-500/5' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <p className="mb-2">Drag & drop files here, or</p>
              <button
                className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={()=> fileInputRef.current?.click()}
                title="Choose files to upload"
              >Browse</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.txt,.md"
                multiple
                className="hidden"
                onChange={(e)=> addFileNotes(e.target.files)}
              />
              <p className="text-xs text-gray-500 mt-2">Supported: Images (PNG/JPG), PDF, Text (.txt, .md)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & List */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Notes</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm">Subject</label>
            <select
              value={filterSubject}
              onChange={(e)=> setFilterSubject(e.target.value)}
              className="rounded-md p-2 text-black"
              title="Filter notes by subject"
            >
              <option value="All">All</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No notes yet. Create or upload to get started.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => (
              <article key={note.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{note.title}</h3>
                    <p className="text-xs text-gray-500">{note.subject} · {new Date(note.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    className="text-red-500 hover:text-red-600 text-sm"
                    onClick={() => deleteNote(note.id)}
                    title="Delete this note"
                  >Delete</button>
                </div>
                <div className="p-4">
                  {note.type === 'text' && (
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{note.content}</pre>
                  )}
                  {note.type === 'image' && note.url && (
                    <img src={note.url} alt={note.title} className="w-full h-48 object-cover rounded-md" />
                  )}
                  {note.type === 'pdf' && note.url && (
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                      <span className="text-sm">{note.fileName || 'Document.pdf'}</span>
                      <a
                        href={note.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-md bg-violet-600 text-white text-sm hover:bg-violet-700"
                        title="Open PDF in a new tab"
                      >Open</a>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default NotesPage;

import { useEffect, useState } from "react";

interface Note {
  id: number;
  content: string;
  created_at: string;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Load notes
  const loadNotes = async () => {
    const res = await fetch("/api/notes");
    const data = await res.json();
    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // Add a new note
  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setContent("");
    await loadNotes();
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Daylines</h1>

      <form onSubmit={addNote} style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note..."
          style={{ padding: 8, width: "70%", marginRight: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Note"}
        </button>
      </form>

      <ul>
        {notes.map((note) => (
          <li key={note.id} style={{ marginBottom: 8 }}>
            {note.content}
            <small style={{ color: "#666", marginLeft: 8 }}>
              {new Date(note.created_at).toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
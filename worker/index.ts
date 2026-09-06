interface Env {
  daylines_db: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/notes") {
        if (request.method === "GET") {
          const { results } = await env.daylines_db.prepare(
            "SELECT id, content, created_at FROM notes ORDER BY created_at DESC"
          ).all();

          return Response.json(results);
        }

        if (request.method === "POST") {
          const body = await request.json<{ content: string }>();

          if (!body.content || body.content.trim() === "") {
            return new Response("Content is required", { status: 400 });
          }

          await env.daylines_db.prepare(
            "INSERT INTO notes (content) VALUES (?)"
          )
            .bind(body.content.trim())
            .run();

          return new Response("Note added", { status: 201 });
        }
      }

      return new Response(null, { status: 404 });
    } catch (err: any) {
      // This will show us the real error
      return new Response(
        JSON.stringify({
          error: err.message,
          stack: err.stack,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
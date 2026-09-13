import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

app.get("/", async (_req: Request, res: Response) => {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    if (!response.ok) {
      throw new Error(`JSONPlaceholder responded with ${response.status}`);
    }
    const posts: Post[] = await response.json();
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch data from JSONPlaceholder" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

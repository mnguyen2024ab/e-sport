import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { eq, desc } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
  const paramResult = matchIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramResult.error.issues,
    });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: queryResult.error.issues,
    });
  }

  try {
    const { id: matchId } = paramResult.data;
    const {limit = 10 } = queryResult.data;
    const safeLimit = Math.min(limit, MAX_LIMIT);

    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramResult.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    res.json({ data });
  } catch (e) {
    console.error("Failed to fetch commentary:", e);
    res.status(500).json({ error: "Failed to fetch commentary" });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const paramResult = matchIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramResult.error.issues,
    });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload",
      details: bodyResult.error.issues,
    });
  }

  try {
    const { minutes, ...rest} = bodyResult.data;
    const [result] = await db
      .insert(commentary)
      .values({
        matchId: paramResult.data.id,
        minutes,
        ...rest
      })
      .returning();

    // Broadcast the new commentary via WebSocket
    if (req.app.locals.broadcastMatchCommentary) {
      req.app.locals.broadcastMatchCommentary(paramResult.data.id, result);
    }

    res.status(201).json({ data: result });
  } catch (e) {
    console.error("Fail to create commentary:", e);
    res.status(500).json({ error: "Failed to create commentary" });
  }
});

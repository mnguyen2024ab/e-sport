import { Router } from 'express';
import {createMatchSchema, listMatchesQuerySchema} from "../src/validation/matches.js";
import {matches} from "../src/db/schema.js";
import {db} from "../src/db/db.js";
import {getMatchStatus} from "../src/utils/match-status.js";

import {desc} from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async(req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if(!parsed.success) {
    return res.status(400).json({error: 'Invalid query', details: JSON.stringify(parsed.error) });
  }
  let parsedData;
  const limit = Math.min(parsedData.data.limit ?? 50, MAX_LIMIT);

    try {
      const data = await db
          .select()
          .from(matches)
          .orderBy((desc(matches.createdAt)))
          .limit(limit)

      res.json({ data });

    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch matches' });
    }
});


matchRouter.post('/', async(req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  const { data: {startTime, endTime, homeScore, awayScore } } = parsed;

  if(!parsed.success) {
    return res.status(400).json({error: 'Invalid payload', details: JSON.stringify(parsed.error) });
  }

  try {
    const [event] = await db.insert(matches).values({
      ...parsed.data,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: getMatchStatus(startTime, endTime),
    }).returning();

    res.status(201).json({ data: event});
  } catch (e) {
    res.status(500).json({error: 'Failed to create match', details: JSON.stringify(e) });
  }
})
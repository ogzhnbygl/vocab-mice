import { getDb } from '../../lib/db.js';
import { getSessionUser } from '../../lib/auth.js';
import { genId, uniqueCode, clampInt, normalizeTeams, summarizeGame, sanitizeQuestions, resizeQuestions } from '../../lib/game.js';

export default async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    const games = db.collection('games');

    if (req.method === 'GET') {
      const list = await games.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(list.map(summarizeGame));
    }

    if (req.method === 'POST') {
      const { name, teams, questionCount, pathLength, questions } = req.body || {};
      const count = clampInt(questionCount, 12, 2, 50);
      const targetPathLength = clampInt(pathLength, 5, 1, 20);
      
      let finalQuestions = sanitizeQuestions(questions);
      if (finalQuestions.length !== count) {
        finalQuestions = resizeQuestions(finalQuestions, count);
      }

      const game = {
        id: genId(),
        userId: user.id,
        code: await uniqueCode(games),
        name: String(name || 'Yeni Oyun').slice(0, 100),
        teams: normalizeTeams(teams),
        questionCount: count,
        questions: finalQuestions,
        createdAt: new Date().toISOString(),
      };
      await games.insertOne(game);
      return res.status(201).json(game);
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'error' });
  }
}

import { getDb } from '../../lib/db.js';
import { getSessionUser } from '../../lib/auth.js';
import { clampInt, normalizeTeams, sanitizeQuestions, resizeQuestions } from '../../lib/game.js';

export default async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    const games = db.collection('games');
    const id = String(req.query.id || '');

    if (req.method === 'GET') {
      const g = await games.findOne({ id, userId: user.id });
      if (!g) return res.status(404).json({ error: 'not_found' });
      return res.status(200).json(g);
    }

    if (req.method === 'PUT') {
      const g = await games.findOne({ id, userId: user.id });
      if (!g) return res.status(404).json({ error: 'not_found' });
      const { name, teams, questions, questionCount, pathLength } = req.body || {};
      if (name !== undefined) g.name = String(name).slice(0, 100);
      if (teams !== undefined) g.teams = normalizeTeams(teams);
      if (questions !== undefined) g.questions = sanitizeQuestions(questions);
      if (questionCount !== undefined) g.questionCount = clampInt(questionCount, 12, 2, 50);
      if (pathLength !== undefined) g.pathLength = clampInt(pathLength, 5, 1, 20);
      if (g.questions.length !== g.questionCount) {
        g.questions = resizeQuestions(g.questions, g.questionCount);
      }
      g.updatedAt = new Date().toISOString();
      await games.replaceOne({ id }, g);
      
      const room = await db.collection('rooms').findOne({ _id: g.code });
      if (room) {
        room.name = g.name;
        room.teams.forEach((t, i) => { if (g.teams[i]) t.name = g.teams[i].name; });
        room.questions = g.questions.map((e, i) => {
          const old = room.questions[i];
          return {
            id: e.id, type: e.type, imageId: e.imageId, points: Number(e.points) || 0,
            revealed: old ? old.revealed : false,
          };
        });
        room.actionSeq = (room.actionSeq || 0) + 1;
        room.updatedAt = Date.now();
        await db.collection('rooms').replaceOne({ _id: g.code }, room);
      }
      return res.status(200).json(g);
    }

    if (req.method === 'DELETE') {
      const g = await games.findOne({ id, userId: user.id });
      if (!g) return res.status(404).json({ error: 'not_found' });
      await games.deleteOne({ id });
      await db.collection('rooms').deleteOne({ _id: g.code });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'error' });
  }
}

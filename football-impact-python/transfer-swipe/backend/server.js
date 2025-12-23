import express from "express";
import cors from "cors";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

// In-memory opslag (morgen vervangen door MongoDB)
const events = [];

// Validatie + cleaning (eis: data checked/cleaned)
const EventZ = z.object({
	uid: z.string().min(5).max(80),
	id: z.string().max(20).optional(), // rumor id
	club: z.string().max(60).optional(),
	league: z.string().max(60).optional(),
	value: z.enum(["up", "down"]).optional(),
	decisionMs: z.number().int().min(0).max(600000).optional(),
	ts: z.string().datetime().optional(),
	type: z.string().max(40).optional(), // bv. "vote"
});

app.get("/health", (req, res) => {
	res.json({ ok: true });
});

app.post("/events", (req, res) => {
	const parsed = EventZ.safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).json({ ok: false, error: parsed.error.flatten() });
	}

	// Clean event
	const clean = {
		...parsed.data,
		ts: parsed.data.ts ?? new Date().toISOString(),
		type: parsed.data.type ?? "vote",
	};

	events.unshift(clean); // nieuwste eerst
	if (events.length > 5000) events.length = 5000; // simpele limiet

	res.json({ ok: true });
});

app.get("/events", (req, res) => {
	const uid = req.query.uid;
	const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 200);

	let result = events;
	if (uid) result = result.filter((e) => e.uid === uid);

	res.json({ ok: true, count: result.length, items: result.slice(0, limit) });
});

app.get("/stats", (req, res) => {
	const byUid = new Map();

	for (const e of events) {
		if (!byUid.has(e.uid))
			byUid.set(e.uid, {
				uid: e.uid,
				votes: 0,
				avgDecisionMs: 0,
				up: 0,
				down: 0,
			});
		const s = byUid.get(e.uid);
		if (e.type === "vote") {
			s.votes += 1;
			if (e.value === "up") s.up += 1;
			if (e.value === "down") s.down += 1;
			if (typeof e.decisionMs === "number") {
				// running average
				s.avgDecisionMs = Math.round(
					(s.avgDecisionMs * (s.votes - 1) + e.decisionMs) / s.votes
				);
			}
		}
	}

	res.json({ ok: true, users: Array.from(byUid.values()).slice(0, 200) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
	console.log(`Backend draait op http://localhost:${PORT}`)
);

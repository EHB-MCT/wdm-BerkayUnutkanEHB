import express from "express";
import cors from "cors";
import { z } from "zod";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

// ===== Mongo config =====
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017";
const DB_NAME = process.env.DB_NAME || "transfer_swipe";

let eventsCol; // Mongo collection

async function initMongo() {
	const client = new MongoClient(MONGO_URL);
	await client.connect();

	const db = client.db(DB_NAME);
	eventsCol = db.collection("events");

	// indexes (sneller filteren/sorteren)
	await eventsCol.createIndex({ ts: -1 });
	await eventsCol.createIndex({ uid: 1, ts: -1 });
	await eventsCol.createIndex({ type: 1, ts: -1 });
	await eventsCol.createIndex({ club: 1, ts: -1 });

	console.log("✅ Verbonden met MongoDB:", DB_NAME);
}

// ===== Validatie + cleaning =====
const EventZ = z.object({
	uid: z.string().min(5).max(80),

	id: z.string().max(20).optional(), // rumor id
	club: z.string().max(60).optional(),
	league: z.string().max(60).optional(),

	value: z.enum(["up", "down"]).optional(),
	decisionMs: z.number().int().min(0).max(600000).optional(),

	ts: z.string().datetime().optional(),
	type: z.string().max(40).optional(), // bv. "vote"
	page: z.string().max(60).optional(),
});

// ===== Routes =====
app.get("/health", (req, res) => {
	res.json({ ok: true });
});

// POST event -> Mongo insert
app.post("/events", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		const parsed = EventZ.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ ok: false, error: parsed.error.flatten() });
		}

		const clean = {
			...parsed.data,
			ts: parsed.data.ts ?? new Date().toISOString(),
			type: parsed.data.type ?? "vote",
		};

		await eventsCol.insertOne(clean);

		res.json({ ok: true });
	} catch (err) {
		console.error("POST /events error:", err);
		res.status(500).json({ ok: false, error: "Server error" });
	}
});

// GET events (optioneel uid filter)
app.get("/events", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		const uid = req.query.uid;
		const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 200);

		const query = {};
		if (uid) query.uid = uid;

		const items = await eventsCol
			.find(query)
			.sort({ ts: -1 })
			.limit(limit)
			.toArray();

		const count = await eventsCol.countDocuments(query);

		res.json({ ok: true, count, items });
	} catch (err) {
		console.error("GET /events error:", err);
		res.status(500).json({ ok: false, error: "Server error" });
	}
});

// /stats -> simpele stats per user (Mongo version)
app.get("/stats", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		// haal max een hoop events op (genoeg voor demo)
		const events = await eventsCol
			.find({})
			.sort({ ts: -1 })
			.limit(5000)
			.toArray();

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
					s.avgDecisionMs = Math.round(
						(s.avgDecisionMs * (s.votes - 1) + e.decisionMs) / s.votes
					);
				}
			}
		}

		res.json({ ok: true, users: Array.from(byUid.values()).slice(0, 200) });
	} catch (err) {
		console.error("GET /stats error:", err);
		res.status(500).json({ ok: false, error: "Server error" });
	}
});

// Admin: lijst users met basic profiel
app.get("/admin/users", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		const events = await eventsCol
			.find({})
			.sort({ ts: -1 })
			.limit(5000)
			.toArray();

		const byUid = new Map();

		for (const e of events) {
			if (!byUid.has(e.uid)) {
				byUid.set(e.uid, {
					uid: e.uid,
					events: 0,
					votes: 0,
					up: 0,
					down: 0,
					avgDecisionMs: null,
					clubsSeen: new Set(),
				});
			}

			const u = byUid.get(e.uid);
			u.events += 1;

			if (e.club) u.clubsSeen.add(e.club);

			if (e.type === "vote" && typeof e.decisionMs === "number") {
				u.votes += 1;
				if (e.value === "up") u.up += 1;
				if (e.value === "down") u.down += 1;

				const prev = u.avgDecisionMs ?? 0;
				u.avgDecisionMs = Math.round(
					(prev * (u.votes - 1) + e.decisionMs) / u.votes
				);
			}
		}

		const users = Array.from(byUid.values()).map((u) => ({
			...u,
			clubsSeen: Array.from(u.clubsSeen),
		}));

		res.json({ ok: true, count: users.length, users });
	} catch (err) {
		console.error("GET /admin/users error:", err);
		res.status(500).json({ ok: false, error: "Server error" });
	}
});

// Admin: events filter
app.get("/admin/events", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		const { uid, type, club } = req.query;
		const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 500);

		const query = {};
		if (uid) query.uid = uid;
		if (type) query.type = type;
		if (club) query.club = club;

		const items = await eventsCol
			.find(query)
			.sort({ ts: -1 })
			.limit(limit)
			.toArray();

		const count = await eventsCol.countDocuments(query);

		res.json({ ok: true, count, items });
	} catch (err) {
		console.error("GET /admin/events error:", err);
		res.status(500).json({ ok: false, error: "Server error" });
	}
});

// Profile: stats per uid (Mongo)
app.get("/profile/:uid", async (req, res) => {
	try {
		if (!eventsCol)
			return res.status(503).json({ ok: false, error: "DB not ready" });

		const uid = req.params.uid;

		const events = await eventsCol
			.find({ uid })
			.sort({ ts: -1 })
			.limit(5000)
			.toArray();

		const seen = new Map();
		const voted = new Map();

		let votes = 0,
			up = 0,
			down = 0;
		let sum = 0,
			n = 0;

		for (const e of events) {
			if (e.type === "rumor_shown" && e.club) {
				seen.set(e.club, (seen.get(e.club) || 0) + 1);
			}
			if (e.type === "vote") {
				votes++;
				if (e.value === "up") up++;
				if (e.value === "down") down++;

				if (e.club) voted.set(e.club, (voted.get(e.club) || 0) + 1);
				if (typeof e.decisionMs === "number") {
					sum += e.decisionMs;
					n++;
				}
			}
		}

		const avgDecisionMs = n ? Math.round(sum / n) : null;

		let persona = "onbekend";
		if (avgDecisionMs !== null) {
			if (avgDecisionMs < 1200) persona = "impulsief";
			else if (avgDecisionMs < 4000) persona = "normaal";
			else persona = "kritisch";
		}

		const top = (m) =>
			Array.from(m.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([name, count]) => ({ name, count }));

		res.json({
			ok: true,
			uid,
			totalEvents: events.length,
			votes,
			up,
			down,
			upRate: votes ? Math.round((up / votes) * 100) : 0,
			avgDecisionMs,
			persona,
			topClubsSeen: top(seen),
			topClubsVoted: top(voted),
		});
	} catch (err) {
		console.error("GET /profile/:uid error:", err);
		res.status(500).json({ ok: false, error: "Server error" });
	}
});

// ADMIN: verwijder laatste N events (nieuwste eerst)
app.delete("/admin/events/latest", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		const limit = Math.min(parseInt(req.query.limit ?? "100", 10) || 100, 500);

		// Nieuwste eerst (op _id is meestal veilig)
		const docs = await eventsCol
			.find({}, { projection: { _id: 1 } })
			.sort({ _id: -1 })
			.limit(limit)
			.toArray();

		const ids = docs.map((d) => d._id);
		if (ids.length === 0) return res.json({ ok: true, deleted: 0 });

		const del = await eventsCol.deleteMany({ _id: { $in: ids } });
		return res.json({ ok: true, deleted: del.deletedCount });
	} catch (e) {
		console.error("DELETE /admin/events/latest error:", e);
		return res
			.status(500)
			.json({ ok: false, error: e?.message || "delete failed" });
	}
});

// ADMIN: alles leegmaken (handig voor reset)
app.delete("/admin/events", async (req, res) => {
	try {
		if (!eventsCol) {
			return res.status(503).json({ ok: false, error: "DB not ready" });
		}

		const del = await eventsCol.deleteMany({});
		return res.json({ ok: true, deleted: del.deletedCount });
	} catch (e) {
		console.error("DELETE /admin/events error:", e);
		return res
			.status(500)
			.json({ ok: false, error: e?.message || "delete failed" });
	}
});

// Start server pas als Mongo klaar is
initMongo()
	.then(() => {
		app.listen(PORT, () =>
			console.log(`Backend draait op http://localhost:${PORT}`)
		);
	})
	.catch((err) => {
		console.error("❌ Mongo init failed:", err);
		process.exit(1);
	});

import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function fmtMs(ms) {
	if (ms == null) return "-";
	if (ms < 1000) return `${ms} ms`;
	return `${(ms / 1000).toFixed(1)} s`;
}

function safePct(n) {
	if (!Number.isFinite(n)) return "0%";
	return `${Math.round(n)}%`;
}

function clamp(n, a, b) {
	return Math.max(a, Math.min(b, n));
}

// simpele sparkline svg (geen libs)
function Sparkline({ data, height = 46 }) {
	const w = 220;
	const h = height;
	const max = Math.max(1, ...data);
	const pts = data
		.map((v, i) => {
			const x = data.length <= 1 ? 0 : (i / (data.length - 1)) * (w - 4) + 2;
			const y = h - 6 - (v / max) * (h - 12);
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<div className="sparkWrap">
			<svg width={w} height={h} className="spark">
				<polyline
					points={pts}
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<line x1="2" y1={h - 6} x2={w - 2} y2={h - 6} className="sparkBase" />
			</svg>
			<div className="sparkMeta">
				<span className="muted">max</span> <b>{max}</b>
			</div>
		</div>
	);
}

export default function App() {
	const [users, setUsers] = useState([]);
	const [events, setEvents] = useState([]);

	const [uid, setUid] = useState("all");
	const [type, setType] = useState("all");
	const [club, setClub] = useState("");

	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState("");

	async function loadAll() {
		setLoading(true);
		setErr("");
		try {
			const [uRes, eRes] = await Promise.all([
				fetch(`${API_BASE}/admin/users`),
				fetch(`${API_BASE}/admin/events?limit=1000`),
			]);

			const uJson = await uRes.json();
			const eJson = await eRes.json();

			if (!uRes.ok || uJson.ok === false)
				throw new Error("Users ophalen faalde");
			if (!eRes.ok || eJson.ok === false)
				throw new Error("Events ophalen faalde");

			setUsers(uJson.users || []);
			setEvents(eJson.items || []);
		} catch (e) {
			setErr(e?.message || "Onbekende fout");
		} finally {
			setLoading(false);
		}
	}

	async function deleteLatest(n = 200) {
		if (!confirm(`Verwijder laatste ${n} events?`)) return;
		setLoading(true);
		setErr("");
		try {
			const res = await fetch(`${API_BASE}/admin/events/latest?limit=${n}`, {
				method: "DELETE",
			});
			const json = await res.json();
			if (!res.ok || json.ok === false) throw new Error("Delete faalde");
			await loadAll();
		} catch (e) {
			setErr(e?.message || "Onbekende fout");
		} finally {
			setLoading(false);
		}
	}

	async function deleteAll() {
		if (!confirm("ALLES verwijderen? Dit is niet omkeerbaar.")) return;
		setLoading(true);
		setErr("");
		try {
			const res = await fetch(`${API_BASE}/admin/events`, { method: "DELETE" });
			const json = await res.json();
			if (!res.ok || json.ok === false) throw new Error("Delete faalde");
			await loadAll();
		} catch (e) {
			setErr(e?.message || "Onbekende fout");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const typeOptions = useMemo(() => {
		const s = new Set(events.map((e) => e.type).filter(Boolean));
		return ["all", ...Array.from(s).sort()];
	}, [events]);

	const userOptions = useMemo(() => {
		const list = (users || []).map((u) => u.uid).filter(Boolean);
		return ["all", ...list.sort()];
	}, [users]);

	const filtered = useMemo(() => {
		const clubQ = club.trim().toLowerCase();
		return events.filter((e) => {
			if (uid !== "all" && e.uid !== uid) return false;
			if (type !== "all" && e.type !== type) return false;

			if (clubQ) {
				const c = (e.club || "").toLowerCase();
				if (!c.includes(clubQ)) return false;
			}
			return true;
		});
	}, [events, uid, type, club]);

	const selectedUser = useMemo(() => {
		if (uid === "all") return null;
		return users.find((u) => u.uid === uid) || null;
	}, [users, uid]);

	const counters = useMemo(() => {
		let total = filtered.length;
		let votes = 0;
		let sessionStarts = 0;
		let rumorShown = 0;

		let up = 0;
		let down = 0;

		let decisionSum = 0;
		let decisionCount = 0;

		for (const e of filtered) {
			if (e.type === "vote") {
				votes++;
				if (e.value === "up") up++;
				if (e.value === "down") down++;
				if (typeof e.decisionMs === "number") {
					decisionSum += e.decisionMs;
					decisionCount++;
				}
			}
			if (e.type === "session_start") sessionStarts++;
			if (e.type === "rumor_shown") rumorShown++;
		}

		const avgDecisionMs = decisionCount
			? Math.round(decisionSum / decisionCount)
			: null;
		const upRate = votes ? (up / votes) * 100 : 0;

		return {
			total,
			votes,
			sessionStarts,
			rumorShown,
			up,
			down,
			upRate,
			avgDecisionMs,
		};
	}, [filtered]);

	// votes per tijd-bucket (sparkline)
	const votesSpark = useMemo(() => {
		const votes = filtered
			.filter((e) => e.type === "vote" && e.ts)
			.map((e) => {
				const t = Date.parse(e.ts);
				return Number.isFinite(t) ? t : null;
			})
			.filter((t) => t != null)
			.sort((a, b) => a - b);

		if (votes.length === 0) return Array.from({ length: 12 }, () => 0);

		const buckets = 12;
		const minT = votes[0];
		const maxT = votes[votes.length - 1];
		const range = Math.max(1, maxT - minT);
		const counts = Array.from({ length: buckets }, () => 0);

		for (const t of votes) {
			const idx = clamp(
				Math.floor(((t - minT) / range) * buckets),
				0,
				buckets - 1
			);
			counts[idx] += 1;
		}
		return counts;
	}, [filtered]);

	// Stacked bar widths netjes maken (min-width zodat je altijd 2 segmenten ziet)
	const bar = useMemo(() => {
		const totalVotes = Math.max(0, counters.votes);
		if (totalVotes === 0) {
			return { upW: 50, downW: 50, upTxt: "0", downTxt: "0" };
		}
		const rawUp = (counters.up / totalVotes) * 100;
		let upW = rawUp;
		let downW = 100 - rawUp;

		const minSeg = 6;
		if (upW > 0 && upW < minSeg) {
			upW = minSeg;
			downW = 100 - minSeg;
		}
		if (downW > 0 && downW < minSeg) {
			downW = minSeg;
			upW = 100 - minSeg;
		}

		return {
			upW,
			downW,
			upTxt: `${counters.up}`,
			downTxt: `${counters.down}`,
		};
	}, [counters]);

	return (
		<div className="page">
			<div className="topbar">
				<div className="brand">
					<div className="title">Transfer Swipe — Admin</div>
					<div className="subtitle">
						Data uit <code>{API_BASE}</code>
					</div>
				</div>

				<div className="actions">
					<div className="actions">
						<button onClick={loadAll} disabled={loading}>
							{loading ? "Laden..." : "↻ Refresh"}
						</button>

						<button onClick={() => deleteLatest(200)} disabled={loading}>
							🧹 Delete laatste 200
						</button>

						<button onClick={deleteAll} disabled={loading}>
							🗑️ Delete alles
						</button>
					</div>
				</div>
			</div>

			{err && (
				<div className="alert">
					<b>Fout:</b> {err}
				</div>
			)}

			{/* SUMMARY ROW */}
			<div className="summary">
				<div className="sumCard">
					<div className="k">Totaal events</div>
					<div className="v">{counters.total}</div>
					<div className="mini muted">na filters</div>
				</div>

				<div className="sumCard">
					<div className="k">Votes</div>
					<div className="v">{counters.votes}</div>
					<div className="mini muted">up-rate: {safePct(counters.upRate)}</div>
				</div>

				<div className="sumCard">
					<div className="k">Gem. decision</div>
					<div className="v">{fmtMs(counters.avgDecisionMs)}</div>
					<div className="mini muted">alle votes</div>
				</div>

				<div className="sumCard">
					<div className="k">Sessions</div>
					<div className="v">{counters.sessionStarts}</div>
					<div className="mini muted">session_start</div>
				</div>
			</div>

			<div className="grid">
				{/* Filters */}
				<div className="card">
					<div className="cardTitle">Filters</div>

					<div className="row">
						<label>Gebruiker (uid)</label>
						<select value={uid} onChange={(e) => setUid(e.target.value)}>
							{userOptions.map((u) => (
								<option key={u} value={u}>
									{u === "all" ? "Alle users" : u}
								</option>
							))}
						</select>
					</div>

					<div className="row">
						<label>Event type</label>
						<select value={type} onChange={(e) => setType(e.target.value)}>
							{typeOptions.map((t) => (
								<option key={t} value={t}>
									{t === "all" ? "Alle types" : t}
								</option>
							))}
						</select>
					</div>

					<div className="row">
						<label>Club (contains)</label>
						<input
							value={club}
							onChange={(e) => setClub(e.target.value)}
							placeholder="bv. Fenerbahçe"
						/>
					</div>

					<div className="hint">
						Tip: kies een uid → je ziet meteen gedrag + events voor die user.
					</div>
				</div>

				{/* Insights */}
				<div className="card">
					<div className="cardTitle">Insights</div>

					<div className="stacked">
						<div className="stackLabel">
							<span className="muted">Up vs Down</span>
							<span>
								<b>{safePct(counters.upRate)}</b> up
							</span>
						</div>

						<div className="stackBar" title="Up/Down verdeling">
							<div className="seg up" style={{ width: `${bar.upW}%` }}>
								<span>👍 {bar.upTxt}</span>
							</div>
							<div className="seg down" style={{ width: `${bar.downW}%` }}>
								<span>👎 {bar.downTxt}</span>
							</div>
						</div>
					</div>

					<div className="insGrid">
						<div className="ins">
							<div className="k">Rumor shown</div>
							<div className="v">{counters.rumorShown}</div>
						</div>
						<div className="ins">
							<div className="k">Votes / Session</div>
							<div className="v">
								{counters.sessionStarts
									? (counters.votes / counters.sessionStarts).toFixed(1)
									: "-"}
							</div>
						</div>
					</div>

					<div className="sparkRow">
						<div>
							<div className="muted" style={{ fontSize: 12 }}>
								Votes door de tijd
							</div>
							<div className="mini muted">12 buckets (range van je data)</div>
						</div>
						<Sparkline data={votesSpark} />
					</div>

					{selectedUser && (
						<div className="userBox">
							<div className="userTitle">Geselecteerde user</div>
							<div className="userLine">
								<span className="muted">uid</span>
								<code>{selectedUser.uid}</code>
							</div>
							<div className="userLine">
								<span className="muted">clubsSeen</span>
								<span>{(selectedUser.clubsSeen || []).join(", ") || "-"}</span>
							</div>
							<div className="userLine">
								<span className="muted">votes</span>
								<span>{selectedUser.votes}</span>
							</div>
							<div className="userLine">
								<span className="muted">avgDecision</span>
								<span>
									{selectedUser.avgDecisionMs != null
										? fmtMs(selectedUser.avgDecisionMs)
										: "-"}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Events table */}
				<div className="card span2">
					<div className="cardTitle">
						Events ({filtered.length})
						<span className="muted" style={{ marginLeft: 10 }}>
							(nieuwste bovenaan)
						</span>
					</div>

					<div className="tableWrap">
						<table>
							<thead>
								<tr>
									<th>ts</th>
									<th>type</th>
									<th>uid</th>
									<th>club</th>
									<th>rumor</th>
									<th>value</th>
									<th>decision</th>
								</tr>
							</thead>
							<tbody>
								{filtered.slice(0, 200).map((e, idx) => (
									<tr key={e._id || `${e.ts}-${e.type}-${idx}`}>
										<td className="mono">{e.ts || "-"}</td>
										<td>
											<span className={`pill ${e.type || ""}`}>
												{e.type || "-"}
											</span>
										</td>
										<td className="mono">{(e.uid || "").slice(0, 8)}…</td>
										<td>{e.club || "-"}</td>
										<td className="mono">{e.id || "-"}</td>
										<td className="mono">{e.value || "-"}</td>
										<td className="mono">
											{e.decisionMs != null ? fmtMs(e.decisionMs) : "-"}
										</td>
									</tr>
								))}

								{filtered.length === 0 && (
									<tr>
										<td colSpan="7" className="muted">
											Geen events voor deze filters.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="hint" style={{ marginTop: 10 }}>
						Toont max 200 rows. Gebruik filters om te focussen.
					</div>
				</div>
			</div>

			<div className="footer">
				<span className="muted">
					Niets zichtbaar? Check backend <code>/admin/events</code> en of de
					user frontend post naar <code>/events</code>.
				</span>
			</div>
		</div>
	);
}

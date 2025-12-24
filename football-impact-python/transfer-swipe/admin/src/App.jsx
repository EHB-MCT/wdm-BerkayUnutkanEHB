import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function fmtMs(ms) {
	if (ms == null) return "-";
	if (ms < 1000) return `${ms} ms`;
	return `${(ms / 1000).toFixed(1)} s`;
}

function pct(n) {
	return `${Math.round(n)}%`;
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
				fetch(`${API_BASE}/admin/events?limit=500`),
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

	const selectedUser = useMemo(() => {
		if (uid === "all") return null;
		return users.find((u) => u.uid === uid) || null;
	}, [users, uid]);

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
					<button onClick={loadAll} disabled={loading}>
						{loading ? "Laden..." : "↻ Refresh"}
					</button>
				</div>
			</div>

			{err && (
				<div className="alert">
					<b>Fout:</b> {err}
				</div>
			)}

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
						Tip: kies eerst een uid → je ziet meteen gedrag + events voor die
						gebruiker.
					</div>
				</div>

				{/* Counters */}
				<div className="card">
					<div className="cardTitle">Counters (na filters)</div>

					<div className="stats">
						<div className="stat">
							<div className="k">Totaal events</div>
							<div className="v">{counters.total}</div>
						</div>
						<div className="stat">
							<div className="k">Votes</div>
							<div className="v">{counters.votes}</div>
						</div>
						<div className="stat">
							<div className="k">Session starts</div>
							<div className="v">{counters.sessionStarts}</div>
						</div>
						<div className="stat">
							<div className="k">Rumor shown</div>
							<div className="v">{counters.rumorShown}</div>
						</div>
						<div className="stat">
							<div className="k">Up / Down</div>
							<div className="v">
								{counters.up} / {counters.down} ({pct(counters.upRate)})
							</div>
						</div>
						<div className="stat">
							<div className="k">Gem. decision</div>
							<div className="v">{fmtMs(counters.avgDecisionMs)}</div>
						</div>
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
								<span className="muted">avgDecisionMs</span>
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
								{filtered.slice(0, 200).map((e) => (
									<tr key={e._id || `${e.ts}-${e.type}-${Math.random()}`}>
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
						Toont max 200 rows (performance). Gebruik filters om te focussen.
					</div>
				</div>
			</div>

			<div className="footer">
				<span className="muted">
					Als je niets ziet: check backend <code>/admin/events</code> en of je
					frontend wel events post naar <code>/events</code>.
				</span>
			</div>
		</div>
	);
}

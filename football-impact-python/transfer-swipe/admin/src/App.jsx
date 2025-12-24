import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:3000";

async function fetchJson(path) {
	const res = await fetch(`${API_BASE}${path}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

function fmtMs(ms) {
	if (ms === null || ms === undefined) return "—";
	if (ms < 1000) return `${ms} ms`;
	return `${(ms / 1000).toFixed(1)} s`;
}

export default function App() {
	const [users, setUsers] = useState([]);
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [selectedUid, setSelectedUid] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [limit, setLimit] = useState(50);

	async function loadAll() {
		setLoading(true);
		setError("");
		try {
			const u = await fetchJson("/admin/users");
			setUsers(u.users ?? []);

			// init: kies eerste user als er 1 is
			if (!selectedUid && (u.users ?? []).length > 0) {
				setSelectedUid(u.users[0].uid);
			}

			const q = new URLSearchParams();
			q.set("limit", String(limit));
			if (selectedUid) q.set("uid", selectedUid);
			if (typeFilter !== "all") q.set("type", typeFilter);

			const e = await fetchJson(`/admin/events?${q.toString()}`);
			setEvents(e.items ?? []);
		} catch (err) {
			setError(String(err?.message ?? err));
		} finally {
			setLoading(false);
		}
	}

	// Reload bij filters
	useEffect(() => {
		loadAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedUid, typeFilter, limit]);

	const selectedUser = useMemo(() => {
		return users.find((u) => u.uid === selectedUid) ?? null;
	}, [users, selectedUid]);

	return (
		<div style={styles.page}>
			<div style={styles.topbar}>
				<div>
					<h1 style={styles.h1}>Admin Dashboard</h1>
					<p style={styles.sub}>
						Live data uit MongoDB via backend: <code>/admin/users</code> &{" "}
						<code>/admin/events</code>
					</p>
				</div>
				<button onClick={loadAll} style={styles.refreshBtn}>
					↻ Refresh
				</button>
			</div>

			{error && (
				<div style={styles.errorBox}>
					<b>Fout:</b> {error} <br />
					Check: draait backend op <code>http://localhost:3000</code>?
				</div>
			)}

			<div style={styles.grid}>
				{/* Left: Users */}
				<div style={styles.card}>
					<div style={styles.cardHeader}>
						<h2 style={styles.h2}>Gebruikers</h2>
						<span style={styles.badge}>{users.length}</span>
					</div>

					{loading && users.length === 0 ? (
						<p style={styles.muted}>Loading…</p>
					) : users.length === 0 ? (
						<p style={styles.muted}>
							Geen users gevonden. Swipe eens in de user-app.
						</p>
					) : (
						<div style={styles.userList}>
							{users.map((u) => (
								<button
									key={u.uid}
									onClick={() => setSelectedUid(u.uid)}
									style={{
										...styles.userRow,
										...(u.uid === selectedUid ? styles.userRowActive : {}),
									}}
								>
									<div
										style={{ display: "flex", justifyContent: "space-between" }}
									>
										<div style={styles.uidShort}>{u.uid.slice(0, 8)}…</div>
										<div style={styles.smallPill}>{u.votes ?? 0} votes</div>
									</div>

									<div style={styles.userMeta}>
										<span>
											Up: <b>{u.up ?? 0}</b>
										</span>
										<span>
											Down: <b>{u.down ?? 0}</b>
										</span>
										<span>
											Avg: <b>{fmtMs(u.avgDecisionMs)}</b>
										</span>
									</div>

									{u.clubsSeen?.length ? (
										<div style={styles.tagsWrap}>
											{u.clubsSeen.slice(0, 3).map((c) => (
												<span key={c} style={styles.tag}>
													{c}
												</span>
											))}
											{u.clubsSeen.length > 3 && (
												<span style={styles.tagMuted}>
													+{u.clubsSeen.length - 3}
												</span>
											)}
										</div>
									) : null}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Right: Events + filters */}
				<div style={styles.card}>
					<div style={styles.cardHeader}>
						<h2 style={styles.h2}>Events</h2>
						<span style={styles.badge}>{events.length}</span>
					</div>

					<div style={styles.filters}>
						<div style={styles.filterItem}>
							<label style={styles.label}>UID</label>
							<select
								value={selectedUid}
								onChange={(e) => setSelectedUid(e.target.value)}
								style={styles.select}
							>
								{users.map((u) => (
									<option key={u.uid} value={u.uid}>
										{u.uid.slice(0, 8)}…
									</option>
								))}
								{users.length === 0 && <option value="">(geen users)</option>}
							</select>
						</div>

						<div style={styles.filterItem}>
							<label style={styles.label}>Type</label>
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value)}
								style={styles.select}
							>
								<option value="all">all</option>
								<option value="session_start">session_start</option>
								<option value="rumor_shown">rumor_shown</option>
								<option value="vote">vote</option>
							</select>
						</div>

						<div style={styles.filterItem}>
							<label style={styles.label}>Limit</label>
							<select
								value={limit}
								onChange={(e) => setLimit(Number(e.target.value))}
								style={styles.select}
							>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
								<option value={200}>200</option>
							</select>
						</div>
					</div>

					{selectedUser && (
						<div style={styles.profileBox}>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<div style={{ fontWeight: 800 }}>
									User: {selectedUser.uid.slice(0, 12)}…
								</div>
								<div style={styles.smallPill}>
									events: {selectedUser.events ?? 0}
								</div>
							</div>
							<div style={styles.profileGrid}>
								<div>
									<div style={styles.k}>Votes</div>
									<div style={styles.v}>{selectedUser.votes ?? 0}</div>
								</div>
								<div>
									<div style={styles.k}>Up / Down</div>
									<div style={styles.v}>
										{selectedUser.up ?? 0} / {selectedUser.down ?? 0}
									</div>
								</div>
								<div>
									<div style={styles.k}>Avg Decision</div>
									<div style={styles.v}>
										{fmtMs(selectedUser.avgDecisionMs)}
									</div>
								</div>
							</div>
						</div>
					)}

					<div style={styles.tableWrap}>
						<table style={styles.table}>
							<thead>
								<tr>
									<th style={styles.th}>ts</th>
									<th style={styles.th}>type</th>
									<th style={styles.th}>club</th>
									<th style={styles.th}>value</th>
									<th style={styles.th}>decision</th>
								</tr>
							</thead>
							<tbody>
								{events.map((e, idx) => (
									<tr key={idx} style={styles.tr}>
										<td style={styles.td}>
											{String(e.ts ?? "")
												.replace("T", " ")
												.replace("Z", "")}
										</td>
										<td style={styles.td}>
											<span style={styles.typePill}>{e.type}</span>
										</td>
										<td style={styles.td}>{e.club ?? "—"}</td>
										<td style={styles.td}>{e.value ?? "—"}</td>
										<td style={styles.td}>{fmtMs(e.decisionMs)}</td>
									</tr>
								))}
								{!loading && events.length === 0 && (
									<tr>
										<td style={styles.td} colSpan={5}>
											Geen events (filter te strikt?) — probeer Type=all of
											swipe in de user-app.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div style={styles.footerNote}>
						Tip: als je “0 events” ziet, swipe in de user-app en druk op
						Refresh.
					</div>
				</div>
			</div>
		</div>
	);
}

const styles = {
	page: {
		minHeight: "100vh",
		padding: 20,
		background:
			"radial-gradient(1200px 700px at 20% 10%, rgba(0,255,170,0.14), transparent 60%), radial-gradient(1200px 700px at 85% 25%, rgba(0,145,255,0.14), transparent 55%), #0b0f17",
		color: "#e8eefc",
		fontFamily:
			"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
	},
	topbar: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	h1: { margin: 0, fontSize: 28 },
	sub: { margin: "6px 0 0", opacity: 0.75, fontSize: 13 },
	refreshBtn: {
		padding: "10px 14px",
		borderRadius: 12,
		border: "1px solid rgba(255,255,255,0.16)",
		background: "rgba(255,255,255,0.08)",
		color: "#e8eefc",
		cursor: "pointer",
		fontWeight: 700,
	},
	errorBox: {
		marginBottom: 16,
		padding: 12,
		borderRadius: 12,
		background: "rgba(255,70,70,0.14)",
		border: "1px solid rgba(255,70,70,0.25)",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "360px 1fr",
		gap: 16,
	},
	card: {
		borderRadius: 18,
		padding: 16,
		background: "rgba(255,255,255,0.06)",
		border: "1px solid rgba(255,255,255,0.12)",
		boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
		backdropFilter: "blur(10px)",
	},
	cardHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	h2: { margin: 0, fontSize: 18 },
	badge: {
		fontSize: 12,
		padding: "4px 10px",
		borderRadius: 999,
		background: "rgba(255,255,255,0.1)",
		border: "1px solid rgba(255,255,255,0.12)",
	},
	muted: { opacity: 0.7, fontSize: 13 },
	userList: { display: "grid", gap: 8 },
	userRow: {
		textAlign: "left",
		padding: 12,
		borderRadius: 14,
		border: "1px solid rgba(255,255,255,0.12)",
		background: "rgba(0,0,0,0.22)",
		cursor: "pointer",
		color: "#e8eefc",
	},
	userRowActive: {
		border: "1px solid rgba(0,255,170,0.35)",
		background: "rgba(0,255,170,0.08)",
	},
	uidShort: { fontWeight: 800, fontSize: 13 },
	smallPill: {
		fontSize: 11,
		padding: "3px 8px",
		borderRadius: 999,
		background: "rgba(255,255,255,0.10)",
		border: "1px solid rgba(255,255,255,0.12)",
	},
	userMeta: {
		marginTop: 8,
		display: "flex",
		gap: 10,
		flexWrap: "wrap",
		fontSize: 12,
		opacity: 0.85,
	},
	tagsWrap: { marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" },
	tag: {
		fontSize: 11,
		padding: "3px 8px",
		borderRadius: 999,
		background: "rgba(0,145,255,0.14)",
		border: "1px solid rgba(0,145,255,0.20)",
	},
	tagMuted: {
		fontSize: 11,
		padding: "3px 8px",
		borderRadius: 999,
		background: "rgba(255,255,255,0.08)",
		border: "1px solid rgba(255,255,255,0.12)",
		opacity: 0.7,
	},
	filters: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr 120px",
		gap: 10,
		marginBottom: 12,
	},
	filterItem: { display: "grid", gap: 6 },
	label: { fontSize: 12, opacity: 0.75 },
	select: {
		padding: "10px 10px",
		borderRadius: 12,
		border: "1px solid rgba(255,255,255,0.16)",
		background: "rgba(255,255,255,0.08)",
		color: "#e8eefc",
	},
	profileBox: {
		marginBottom: 12,
		padding: 12,
		borderRadius: 14,
		background: "rgba(0,0,0,0.22)",
		border: "1px solid rgba(255,255,255,0.12)",
	},
	profileGrid: {
		marginTop: 10,
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: 10,
	},
	k: { fontSize: 11, opacity: 0.75 },
	v: { fontSize: 16, fontWeight: 800 },
	tableWrap: {
		borderRadius: 14,
		overflow: "hidden",
		border: "1px solid rgba(255,255,255,0.12)",
		background: "rgba(0,0,0,0.22)",
	},
	table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
	th: {
		textAlign: "left",
		padding: "10px 10px",
		background: "rgba(255,255,255,0.06)",
		borderBottom: "1px solid rgba(255,255,255,0.10)",
	},
	tr: { borderBottom: "1px solid rgba(255,255,255,0.06)" },
	td: { padding: "10px 10px", opacity: 0.95 },
	typePill: {
		fontSize: 11,
		padding: "3px 8px",
		borderRadius: 999,
		background: "rgba(255,255,255,0.08)",
		border: "1px solid rgba(255,255,255,0.12)",
	},
	footerNote: { marginTop: 10, fontSize: 12, opacity: 0.65 },
};

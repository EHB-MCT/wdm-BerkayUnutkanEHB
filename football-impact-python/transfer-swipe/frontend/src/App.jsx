import { useEffect, useMemo, useRef, useState } from "react";
import rumours from "./data/rumours.json";

const API_BASE = "http://localhost:3000";

async function sendEvent(event) {
	try {
		await fetch(`${API_BASE}/events`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(event),
		});
	} catch (err) {
		console.warn("Kon event niet versturen naar backend:", err);
	}
}

function getOrCreateUID() {
	let uid = localStorage.getItem("uid");
	if (!uid) {
		uid = crypto.randomUUID();
		localStorage.setItem("uid", uid);
	}
	return uid;
}

function pickRandom(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export default function App() {
	const uid = getOrCreateUID();

	const allRumours = useMemo(() => rumours, []);
	const [current, setCurrent] = useState(() => pickRandom(allRumours));
	const [count, setCount] = useState(0);
	const [events, setEvents] = useState([]);
	const shownAtRef = useRef(Date.now());

	// 1) session_start (1x bij openen)
	useEffect(() => {
		sendEvent({
			uid,
			type: "session_start",
			ts: new Date().toISOString(),
			page: "transfer-swipe",
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// 2) rumor_shown (telkens als current verandert)
	useEffect(() => {
		shownAtRef.current = Date.now();

		sendEvent({
			uid,
			type: "rumor_shown",
			ts: new Date().toISOString(),
			page: "transfer-swipe",
			id: current.id,
			club: current.club,
			league: current.league,
		});
	}, [current, uid]);

	// 3) vote (bij klikken)
	async function vote(value) {
		const decisionMs = Date.now() - shownAtRef.current;

		const event = {
			uid,
			type: "vote",
			ts: new Date().toISOString(),
			page: "transfer-swipe",
			id: current.id,
			club: current.club,
			league: current.league,
			value,
			decisionMs,
		};

		console.log("VOTE", event);

		// live lijstje in UI
		setEvents((prev) => [event, ...prev].slice(0, 5));
		setCount((c) => c + 1);

		// stuur naar backend
		sendEvent(event);

		// volgende rumor
		setCurrent(pickRandom(allRumours));
	}

	return (
		<div style={styles.page}>
			<div style={styles.card}>
				<div style={styles.header}>
					<div>
						<h1 style={styles.title}>Transfer Swipe</h1>
						<p style={styles.subtitle}>👍 = geloofwaardig · 👎 = onzin</p>
					</div>

					<div style={styles.badge}>
						<span style={styles.badgeLabel}>Swipes</span>
						<span style={styles.badgeValue}>{count}</span>
					</div>
				</div>

				<div style={styles.rumourBox}>
					<div style={styles.metaRow}>
						<span style={styles.pill}>{current.league}</span>
						<span style={styles.pill}>{current.club}</span>
						<span style={styles.idText}>{current.id}</span>
					</div>

					<div style={styles.questionWrap}>
						<div style={styles.questionText}>{current.neutralTitle}</div>
					</div>

					<p style={styles.helperText}>
						Je beslissingstijd wordt gemeten om een gebruikersprofiel op te
						bouwen.
					</p>
				</div>
				<div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
					Bron: <b>{current.source}</b> · Betrouwbaarheid:{" "}
					<b>{Math.round(current.reliability * 100)}%</b> · Van:{" "}
					<b>{current.fromClub}</b> · Fee: <b>{current.fee}</b>
				</div>

				<div style={styles.buttons}>
					<button
						onClick={() => vote("down")}
						style={{ ...styles.button, ...styles.buttonDown }}
					>
						👎 Onzin
					</button>
					<button
						onClick={() => vote("up")}
						style={{ ...styles.button, ...styles.buttonUp }}
					>
						👍 Geloofwaardig
					</button>
				</div>

				<div style={{ marginTop: 18 }}>
					<h3 style={{ fontSize: 14, marginBottom: 6, opacity: 0.8 }}>
						Laatste acties
					</h3>

					{events.length === 0 && (
						<p style={{ fontSize: 12, opacity: 0.6 }}>
							Nog geen acties geregistreerd
						</p>
					)}

					{events.map((e, i) => (
						<div
							key={i}
							style={{
								fontSize: 12,
								padding: "6px 8px",
								marginBottom: 4,
								borderRadius: 8,
								background: "rgba(255,255,255,0.06)",
								display: "flex",
								justifyContent: "space-between",
							}}
						>
							<span>
								{e.type === "vote"
									? `${e.value === "up" ? "👍" : "👎"} ${e.club}`
									: `📌 ${e.type}`}
							</span>
							<span>
								{e.decisionMs !== undefined ? `${e.decisionMs} ms` : ""}
							</span>
						</div>
					))}
				</div>

				<div style={styles.footer}>
					<span style={styles.footerText}>
						Gebruiker UID: <code style={styles.code}>{uid.slice(0, 8)}…</code>
					</span>
				</div>
			</div>
		</div>
	);
}

const styles = {
	page: {
		minHeight: "100vh",
		display: "grid",
		placeItems: "center",
		padding: 24,
		background:
			"radial-gradient(900px 500px at 15% 10%, rgba(0,255,170,0.18), transparent 60%), radial-gradient(900px 500px at 85% 20%, rgba(0,145,255,0.18), transparent 55%), linear-gradient(180deg, #0b0f17 0%, #0b0f17 100%)",
		color: "#e8eefc",
		fontFamily:
			"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
	},
	card: {
		width: "100%",
		maxWidth: 560,
		borderRadius: 18,
		padding: 20,
		background: "rgba(255,255,255,0.06)",
		border: "1px solid rgba(255,255,255,0.12)",
		boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
		backdropFilter: "blur(10px)",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	title: {
		margin: 0,
		fontSize: 28,
	},
	subtitle: {
		marginTop: 6,
		fontSize: 13,
		color: "rgba(232,238,252,0.7)",
	},
	badge: {
		padding: "10px 14px",
		borderRadius: 14,
		background: "rgba(255,255,255,0.08)",
		border: "1px solid rgba(255,255,255,0.12)",
		textAlign: "right",
	},
	badgeLabel: {
		fontSize: 11,
		color: "rgba(232,238,252,0.7)",
	},
	badgeValue: {
		fontSize: 18,
		fontWeight: 800,
	},
	rumourBox: {
		borderRadius: 16,
		padding: 16,
		background: "rgba(0,0,0,0.3)",
		border: "1px solid rgba(255,255,255,0.1)",
	},
	metaRow: {
		display: "flex",
		gap: 8,
		marginBottom: 14,
		flexWrap: "wrap",
	},
	pill: {
		fontSize: 12,
		padding: "6px 10px",
		borderRadius: 999,
		background: "rgba(255,255,255,0.1)",
	},
	idText: {
		marginLeft: "auto",
		fontSize: 12,
		color: "rgba(232,238,252,0.6)",
	},
	questionWrap: {
		display: "grid",
		placeItems: "center",
		minHeight: 110,
		textAlign: "center",
	},
	questionText: {
		fontSize: 20,
		fontWeight: 700,
		maxWidth: 460,
	},
	helperText: {
		marginTop: 10,
		fontSize: 12,
		color: "rgba(232,238,252,0.6)",
		textAlign: "center",
	},
	buttons: {
		display: "flex",
		gap: 12,
		marginTop: 16,
	},
	button: {
		flex: 1,
		padding: "12px 14px",
		borderRadius: 14,
		fontSize: 16,
		fontWeight: 700,
		border: "1px solid rgba(255,255,255,0.16)",
		background: "rgba(255,255,255,0.08)",
		color: "#e8eefc",
		cursor: "pointer",
	},
	buttonDown: {
		background: "rgba(255,70,70,0.18)",
	},
	buttonUp: {
		background: "rgba(0,255,170,0.18)",
	},
	footer: {
		marginTop: 14,
		textAlign: "center",
	},
	footerText: {
		fontSize: 12,
		color: "rgba(232,238,252,0.6)",
	},
	code: {
		padding: "3px 6px",
		borderRadius: 6,
		background: "rgba(255,255,255,0.1)",
	},
};

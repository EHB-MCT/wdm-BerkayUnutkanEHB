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

// subtiele beïnvloeding: soms forceer je topclub
function pickWithBias(all, topClubName, biasChance = 0.65) {
	if (!topClubName) return pickRandom(all);
	if (Math.random() > biasChance) return pickRandom(all);

	const preferred = all.filter((r) => r.club === topClubName);
	if (preferred.length === 0) return pickRandom(all);

	return pickRandom(preferred);
}

function chooseTitle(rumour, persona) {
	if (!rumour) return "";

	// persona gebaseerd op votes
	if (persona === "kritisch")
		return rumour.neutralTitle || rumour.clickbaitTitle;
	if (persona === "goedgelovig")
		return rumour.clickbaitTitle || rumour.neutralTitle;

	// neutraal: mix 50/50
	return Math.random() < 0.5
		? rumour.neutralTitle
		: rumour.clickbaitTitle || rumour.neutralTitle;
}

export default function App() {
	const uid = getOrCreateUID();
	const allRumours = useMemo(() => rumours, []);

	const [profile, setProfile] = useState(null);
	const [profileLoading, setProfileLoading] = useState(true);

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

	// 2) profiel ophalen (1x en af en toe refresh)
	useEffect(() => {
		let cancelled = false;

		async function loadProfile() {
			try {
				setProfileLoading(true);
				const res = await fetch(`${API_BASE}/profile/${uid}`);
				const data = await res.json();
				if (!cancelled) setProfile(data?.ok ? data : null);
			} catch (e) {
				if (!cancelled) setProfile(null);
			} finally {
				if (!cancelled) setProfileLoading(false);
			}
		}

		loadProfile();
		return () => {
			cancelled = true;
		};
	}, [uid]);

	// topclub en persona uit profiel
	const topClub =
		profile?.topClubsSeen?.length > 0 ? profile.topClubsSeen[0].name : null;

	const persona = profile?.persona || "neutraal";
	const titleToShow = chooseTitle(current, persona);

	// 3) rumor_shown (telkens current verandert)
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

	// 4) vote (bij klikken)
	function vote(value) {
		const rawMs = Date.now() - shownAtRef.current;
		const decisionMs = Math.min(rawMs, 60000); // cap 60s

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

		setEvents((prev) => [event, ...prev].slice(0, 6));
		setCount((c) => c + 1);

		// stuur naar backend
		sendEvent(event);

		// volgende rumor: bias naar topclub
		const next = pickWithBias(allRumours, topClub, 0.65);
		setCurrent(next);

		// profiel refresher: elke 3 votes
		if ((count + 1) % 3 === 0) {
			fetch(`${API_BASE}/profile/${uid}`)
				.then((r) => r.json())
				.then((d) => d?.ok && setProfile(d))
				.catch(() => {});
		}
	}

	return (
		<div style={styles.page}>
			<div style={styles.card}>
				<div style={styles.header}>
					<div>
						<h1 style={styles.title}>Transfer Swipe</h1>
						<p style={styles.subtitle}>👍 = geloofwaardig · 👎 = onzin</p>

						<div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
							{profileLoading ? (
								<span>Profiel laden…</span>
							) : profile ? (
								<span>
									Persona: <b>{persona}</b>
									{topClub ? (
										<>
											{" "}
											· Topclub: <b>{topClub}</b>
										</>
									) : null}
								</span>
							) : (
								<span>Geen profiel (backend offline?)</span>
							)}
						</div>
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
						<div style={styles.questionText}>{titleToShow}</div>
					</div>

					<p style={styles.helperText}>
						{persona === "kritisch" &&
							"Je lijkt vaak sceptisch. Klopt dit wel?"}
						{persona === "goedgelovig" &&
							"Je vertrouwt transfers snel. Volg je gevoel."}
						{persona === "neutraal" && "Neem rustig je beslissing."}
					</p>
				</div>

				<div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
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
					<h3 style={{ fontSize: 14, marginBottom: 6, opacity: 0.85 }}>
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
								padding: "7px 10px",
								marginBottom: 6,
								borderRadius: 10,
								background: "rgba(255,255,255,0.06)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span>
								{e.value === "up" ? "👍" : "👎"} {e.club}
							</span>
							<span style={{ opacity: 0.75 }}>{e.decisionMs} ms</span>
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
		maxWidth: 600,
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
		gap: 12,
	},
	title: { margin: 0, fontSize: 28 },
	subtitle: { marginTop: 6, fontSize: 13, color: "rgba(232,238,252,0.75)" },
	badge: {
		padding: "10px 14px",
		borderRadius: 14,
		background: "rgba(255,255,255,0.08)",
		border: "1px solid rgba(255,255,255,0.12)",
		textAlign: "right",
		minWidth: 86,
	},
	badgeLabel: { fontSize: 11, color: "rgba(232,238,252,0.7)" },
	badgeValue: { fontSize: 18, fontWeight: 800 },
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
		alignItems: "center",
	},
	pill: {
		fontSize: 12,
		padding: "6px 10px",
		borderRadius: 999,
		background: "rgba(255,255,255,0.1)",
	},
	idText: { marginLeft: "auto", fontSize: 12, color: "rgba(232,238,252,0.6)" },
	questionWrap: {
		display: "grid",
		placeItems: "center",
		minHeight: 120,
		textAlign: "center",
		padding: "6px 8px",
	},
	questionText: {
		fontSize: 20,
		fontWeight: 800,
		maxWidth: 520,
		lineHeight: 1.25,
	},
	helperText: {
		marginTop: 10,
		fontSize: 12,
		color: "rgba(232,238,252,0.65)",
		textAlign: "center",
	},
	buttons: { display: "flex", gap: 12, marginTop: 16 },
	button: {
		flex: 1,
		padding: "12px 14px",
		borderRadius: 14,
		fontSize: 16,
		fontWeight: 800,
		border: "1px solid rgba(255,255,255,0.16)",
		background: "rgba(255,255,255,0.08)",
		color: "#e8eefc",
		cursor: "pointer",
	},
	buttonDown: { background: "rgba(255,70,70,0.18)" },
	buttonUp: { background: "rgba(0,255,170,0.18)" },
	footer: { marginTop: 14, textAlign: "center" },
	footerText: { fontSize: 12, color: "rgba(232,238,252,0.6)" },
	code: {
		padding: "3px 6px",
		borderRadius: 6,
		background: "rgba(255,255,255,0.1)",
	},
};

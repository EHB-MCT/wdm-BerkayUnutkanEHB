import csv

GOAL_W = 5
ASSIST_W = 3
DRIBBLE_W = 0.5
LOSS_W = -0.2
YELLOW_W = -1
RED_W = -3

def per90(v, mins):
    return (90 * v / mins) if mins and int(mins) > 0 else 0

def impact_from_row(row):
    mins = int(row['minutes'])
    g90 = per90(int(row['goals']), mins)
    a90 = per90(int(row['assists']), mins)
    d90 = per90(int(row['dribblesSuccessful']), mins)
    l90 = per90(int(row['ballLosses']), mins)
    y90 = per90(int(row['yellowCards']), mins)
    r90 = per90(int(row['redCards']), mins)
    impact = GOAL_W*g90 + ASSIST_W*a90 + DRIBBLE_W*d90 + LOSS_W*l90 + YELLOW_W*y90 + RED_W*r90
    return impact, g90, a90, d90, l90

def main():
    csv_path = "football-impact/data/fenerbahce_2025_26_superlig_sample.csv"
    players = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row['team'] == 'Fenerbahçe' and 'Super Lig' in row['competition']:
                impact, g90, a90, d90, l90 = impact_from_row(row)
                players.append({
                    "player": row['player'], "impact": impact,
                    "g90": g90, "a90": a90, "d90": d90, "l90": l90,
                    "minutes": row['minutes']
                })
    top = sorted(players, key=lambda p: p['impact'], reverse=True)[:5]
    print("==== Fenerbahçe — Super Lig 2025/26 | Top 5 Impact per 90 ====")
    for i, p in enumerate(top, 1):
        print(f"{i}. {p['player']} — impact/90={p['impact']:.2f} | g/90={p['g90']:.2f}, a/90={p['a90']:.2f}, drib/90={p['d90']:.2f}, loss/90={p['l90']:.2f} (mins={p['minutes']})")

if __name__ == "__main__":
    main()

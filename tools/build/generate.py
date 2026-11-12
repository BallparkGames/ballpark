"""Build Ballpark "Batting Order" puzzle banks from verified datasets.

Output: one JSON file the game loads, plus a CSV for reviewing in a spreadsheet.
Rules:
  - every pair of items in a puzzle is separated by the dataset's `gap`, so no
    close call or small source disagreement can flip the correct order;
  - within one bank, two puzzles from the same dataset share at most 2 items;
  - no 5-item set appears twice anywhere (daily or unlimited);
  - Normal puzzles each get a different clue from their dataset's clue list.
"""
import csv
import itertools
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from datasets import DATASETS, DAILY, CATEGORIES, BASIC  # noqa: E402
CAT_OF = {d: c for c, _, ds in CATEGORIES for d in ds}
UNLIMITED = [ds for ds in DATASETS if ds["id"] in CAT_OF]

SEED = 20261109
BASIC_WEIGHT = 0.35  # classic rankings get about a third the share of a niche stat
TARGET = {"easy": 420, "normal": 260}
SCORING = {"exact_first_place": 100, "exact_other_place": 75, "one_spot_off": 25, "max": 400}


def separated(values, gap):
    kind, amount = gap
    for a, b in itertools.combinations(values, 2):
        if kind == "abs":
            if abs(a - b) < amount:
                return False
        else:
            hi = max(abs(a), abs(b))
            if hi == 0 or abs(a - b) / hi < amount:
                return False
    return True


def fmt(value, unit):
    if unit in ("year admitted", "year founded", "year released", "year published", "year hosted"):
        return str(int(value))
    if isinstance(value, float) and not value.is_integer():
        text = f"{value:,.3f}" if abs(value) < 1 else f"{value:,.2f}"
        text = text.rstrip("0").rstrip(".")
    else:
        text = f"{int(value):,}"
    if unit == "$":
        return f"${text}"
    if value == 1 and unit.endswith("s") and unit not in ("hours",):
        unit = unit[:-1]
    return f"{text} {unit}"


def ordered(items, order):
    return sorted(items, key=lambda kv: kv[1], reverse=(order == "desc"))


def all_valid_sets(ds):
    names = list(ds["items"])
    out = []
    for combo in itertools.combinations(names, 5):
        if separated([ds["items"][n] for n in combo], ds["gap"]):
            out.append(frozenset(combo))
    return out


def main():
    rng = random.Random(SEED)
    used_sets = set()
    daily_out = []
    for i, d in enumerate(DAILY, 1):
        items = ordered(d["items"], d["order"])
        used_sets.add(frozenset(n for n, _ in items))
        daily_out.append({
            "id": f"daily-{i:03d}", "number": i, "mode": "normal", "clue": d["clue"], "fact": d["fact"],
            "stat": d["stat"], "unit": d["unit"], "order": d["order"], "source": d["source"],
            "answer": [{"name": n, "value": v, "display": fmt(v, d["unit"])} for n, v in items],
        })
        asof = next((x.get("asof") for x in DATASETS if x["id"] == d.get("dsid")), None)
        if asof: daily_out[-1]["asof"] = asof

    pools = {ds["id"]: all_valid_sets(ds) for ds in UNLIMITED}
    for pool in pools.values():
        rng.shuffle(pool)

    # How many puzzles each dataset gives each bank: share the target by pool size,
    # at least 2 each; Normal is capped by the number of clues written for it.
    banks = {m: [] for m in TARGET}
    for mode, target in TARGET.items():
        weights = {ds["id"]: min(len(pools[ds["id"]]), 60) ** 0.5 * (BASIC_WEIGHT if ds["id"] in BASIC else 1) for ds in UNLIMITED}
        total = sum(weights.values())
        quota = {k: max(2, round(target * w / total)) for k, w in weights.items()}
        if mode == "normal":
            for ds in UNLIMITED:
                quota[ds["id"]] = min(quota[ds["id"]], len([c for c in ds["clues"] if c not in {d["clue"] for d in DAILY}]))
        for ds in UNLIMITED:
            chosen = []
            for s in pools[ds["id"]]:
                if len(chosen) >= quota[ds["id"]]:
                    break
                if s in used_sets:
                    continue
                if any(len(s & c) > 3 for c in chosen):
                    continue
                chosen.append(s)
                used_sets.add(s)
            daily_clues = {d["clue"] for d in DAILY}
            clues = [c for c in ds["clues"] if c not in daily_clues]
            rng.shuffle(clues)
            for j, s in enumerate(chosen):
                items = ordered([(n, ds["items"][n]) for n in s], ds["order"])
                p = {
                    "mode": mode, "category": CAT_OF[ds["id"]], "dataset": ds["id"], "stat": ds["stat"], "unit": ds["unit"],
                    "order": ds["order"], "source": ds["source"], "fact": ds["fact"],
                    "answer": [{"name": n, "value": v, "display": fmt(v, ds["unit"])} for n, v in items],
                }
                if ds.get("asof"):
                    p["asof"] = ds["asof"]
                if mode == "normal":
                    p["clue"] = clues[j]
                banks[mode].append(p)
        rng.shuffle(banks[mode])
        for k, p in enumerate(banks[mode], 1):
            p["id"] = f"{mode}-{k:03d}"
            banks[mode][k - 1] = {"id": p.pop("id"), **p}

    out = {
        "game": "Batting Order",
        "site": "Ballpark",
        "version": 1,
        "generated": "2026-11-09",
        "scoring": SCORING,
        "how_modes_differ": {
            "easy": "Shows the stat name before ranking.",
            "normal": "Shows only the clue; the stat is revealed after ranking.",
        },
        "categories": [{"id": c, "name": n} for c, n, _ in CATEGORIES],
        "daily": daily_out,
        "unlimited": banks,
    }
    root = Path(__file__).resolve().parent.parent / "data"
    root.mkdir(exist_ok=True)
    (root / "ballpark-puzzles.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))

    with open(root / "ballpark-puzzles-review.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "bank", "clue", "hidden stat", "#1", "#2", "#3", "#4", "#5", "source"])
        for p in daily_out:
            w.writerow([p["id"], "daily", p["clue"], p["stat"],
                        *[f"{a['name']} ({a['display']})" for a in p["answer"]], p["source"]])
        for mode in TARGET:
            for p in banks[mode]:
                w.writerow([p["id"], mode, p.get("clue", ""), p["stat"],
                            *[f"{a['name']} ({a['display']})" for a in p["answer"]], p["source"]])

    print({m: len(b) for m, b in banks.items()}, "daily", len(daily_out))
    print({ds["id"]: len(pools[ds["id"]]) for ds in UNLIMITED})


if __name__ == "__main__":
    main()

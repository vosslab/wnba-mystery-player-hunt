#!/usr/bin/env python3
"""Download embedded JSON for three sample players from WNBA Stats pages."""

# Standard Library
import json
import time
import random
import pathlib
import urllib.request


PLAYER_IDS = (
	1628932,  # A'ja Wilson - South Carolina
	1642286,  # Caitlin Clark - Iowa
	1627668,  # Breanna Stewart - UConn
)

PAGE_URL = "https://stats.wnba.com/player/{player_id}/"
OUTPUT_FILE = "wnba_player_samples.json"
TIMEOUT_SECONDS = 20

REQUEST_HEADERS = {
	"Accept": "text/html,application/xhtml+xml",
	"User-Agent": (
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
		"AppleWebKit/537.36 (KHTML, like Gecko) "
		"Chrome/138.0.0.0 Safari/537.36"
	),
}

EMBEDDED_JSON = {
	"profile": "nbaStatsPlayerInfo",
	"headline_stats": "nbaStatsPlayerStats",
	"available_seasons": "nbaStatsPlayerSeasons",
}


#============================================

def fetch_player_page(player_id: int) -> str:
	"""Download one player page.

	Args:
		player_id: WNBA Stats player identifier.

	Returns:
		The page HTML.
	"""
	# Space requests slightly because WNBA Stats does not publish rate limits.
	time.sleep(random.random())
	url = PAGE_URL.format(player_id=player_id)
	request = urllib.request.Request(url, headers=REQUEST_HEADERS)
	with urllib.request.urlopen(  # nosec B310 - fixed official HTTPS WNBA Stats endpoint.
		request, timeout=TIMEOUT_SECONDS
	) as response:
		html_bytes = response.read()
	html = html_bytes.decode("utf-8")
	return html


#============================================

def extract_json_value(html: str, variable_name: str) -> object:
	"""Extract one JSON value assigned to a JavaScript window variable.

	Args:
		html: Player page HTML.
		variable_name: Name after ``window.`` in the assignment.

	Returns:
		The decoded JSON value.
	"""
	marker = f"window.{variable_name} = "
	start = html.find(marker)
	if start == -1:
		raise ValueError(f"Could not find {variable_name} in player page")
	value_start = start + len(marker)
	value_end = html.find(";", value_start)
	if value_end == -1:
		raise ValueError(f"Could not find the end of {variable_name}")
	json_text = html[value_start:value_end]
	value = json.loads(json_text)
	return value


#============================================

def parse_player_page(player_id: int, html: str) -> dict[str, object]:
	"""Collect every useful embedded JSON value from one player page.

	Args:
		player_id: WNBA Stats player identifier.
		html: Player page HTML.

	Returns:
		A record containing its source URL and embedded player data.
	"""
	player = {
		"player_id": player_id,
		"source_url": PAGE_URL.format(player_id=player_id),
	}
	for output_name, variable_name in EMBEDDED_JSON.items():
		player[output_name] = extract_json_value(html, variable_name)
	return player


#============================================

def write_json(path: pathlib.Path, payload: object) -> None:
	"""Write readable JSON to disk.

	Args:
		path: Output path.
		payload: JSON-serializable value.
	"""
	with open(path, "w", encoding="utf-8") as output_file:
		json.dump(payload, output_file, indent=2, ensure_ascii=True)
		output_file.write("\n")


#============================================

def main() -> None:
	"""Download three players and save their embedded JSON in the CWD."""
	players = []
	for player_id in PLAYER_IDS:
		html = fetch_player_page(player_id)
		player = parse_player_page(player_id, html)
		players.append(player)

	output_path = pathlib.Path.cwd() / OUTPUT_FILE
	output = {"players": players}
	write_json(output_path, output)
	print(f"Saved {len(players)} players to {output_path}")


#============================================

if __name__ == "__main__":
	main()

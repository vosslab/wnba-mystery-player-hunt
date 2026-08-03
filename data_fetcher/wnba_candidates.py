"""Build a private WNBA candidate working file from saved official responses.

This tool is a manifest-only Python data boundary. It validates local official
responses and never writes a game-facing roster file.
"""

# Standard Library
import argparse
import json
import pathlib
import urllib.parse


CURRENT_SEASON = "2026"
PREVIOUS_SEASON = "2025"
STATS_HOST = "stats.wnba.com"
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKING_OUTPUT = pathlib.Path("data/private/wnba_candidates.json")
PRIVATE_DATA_DIR = pathlib.Path("data/private")

ROSTER_FIELDS = (
	"TEAM_ID",
	"TEAM_ABBREVIATION",
	"PLAYER_ID",
	"PLAYER",
	"NUM",
	"POSITION",
	"HEIGHT",
	"WEIGHT",
	"BIRTH_DATE",
	"AGE",
	"EXP",
	"SCHOOL",
	"PLAYER_SLUG",
)

PROFILE_FIELDS = (
	"PERSON_ID",
	"DISPLAY_FIRST_LAST",
	"BIRTHDATE",
	"SCHOOL",
	"COUNTRY",
	"HEIGHT",
	"POSITION",
	"ROSTERSTATUS",
	"TEAM_ID",
	"TEAM_ABBREVIATION",
	"DRAFT_YEAR",
	"DRAFT_ROUND",
	"DRAFT_NUMBER",
	"FROM_YEAR",
)


#============================================

def parse_args() -> argparse.Namespace:
	"""Parse command-line options.

	Returns:
		The requested input mode and output location.
	"""
	parser = argparse.ArgumentParser(
		description="Create a private candidate file from official WNBA Stats responses."
	)
	parser.add_argument(
		"-i", "--input-manifest", dest="input_manifest", type=pathlib.Path,
		required=True, help="Saved official-response manifest; see python_candidate_pipeline.md.",
	)
	parser.add_argument(
		"-o", "--output", dest="output_file", type=pathlib.Path,
		default=WORKING_OUTPUT, help="Ignored private candidate JSON output path.",
	)
	args = parser.parse_args()
	return args


#============================================

def validate_official_url(url: str) -> str:
	"""Reject URLs outside the documented official WNBA Stats host.

	Args:
		url: Candidate source URL.

	Returns:
		The validated URL.
	"""
	parsed = urllib.parse.urlparse(url)
	if parsed.scheme != "https" or parsed.netloc != STATS_HOST:
		raise ValueError(f"Official source must be https://{STATS_HOST}/: {url}")
	validated_url = url
	return validated_url


#============================================

def validate_private_output_path(path: pathlib.Path) -> pathlib.Path:
	"""Require the generated working file to stay in ignored private data.

	Args:
		path: Requested output path.

	Returns:
		The resolved repository-private path after boundary verification.
	"""
	private_root = (REPO_ROOT / PRIVATE_DATA_DIR).resolve()
	if path.is_absolute():
		output_path = path.resolve()
	else:
		output_path = (REPO_ROOT / path).resolve()
	if not output_path.is_relative_to(private_root):
		raise ValueError(f"Candidate output must stay under {PRIVATE_DATA_DIR}: {path}")
	validated_path = output_path
	return validated_path


#============================================

def read_json(path: pathlib.Path) -> object:
	"""Read one local JSON export.

	Args:
		path: JSON file path.

	Returns:
		Decoded JSON value.
	"""
	with path.open("r", encoding="utf-8") as input_file:
		payload = json.load(input_file)
	return payload


#============================================

def read_text(path: pathlib.Path) -> str:
	"""Read one local UTF-8 export.

	Args:
		path: Text file path.

	Returns:
		The file contents.
	"""
	with path.open("r", encoding="utf-8") as input_file:
		text = input_file.read()
	return text


#============================================

def require_mapping(value: object, context: str) -> dict:
	"""Require a JSON object with a useful boundary error.

	Args:
		value: Decoded JSON value.
		context: Name included in a failure message.

	Returns:
		The mapping value.
	"""
	if not isinstance(value, dict):
		raise ValueError(f"{context} must be a JSON object")
	mapping = value
	return mapping


#============================================

def require_list(value: object, context: str) -> list:
	"""Require a JSON array with a useful boundary error.

	Args:
		value: Decoded JSON value.
		context: Name included in a failure message.

	Returns:
		The list value.
	"""
	if not isinstance(value, list):
		raise ValueError(f"{context} must be a JSON array")
	items = value
	return items


#============================================

def require_field(record: dict, field_name: str, context: str) -> object:
	"""Require one nonempty source field.

	Args:
		record: Source record.
		field_name: Required source field name.
		context: Record identity included in a failure message.

	Returns:
		The source value.
	"""
	if field_name not in record:
		raise ValueError(f"{context} is missing required field {field_name}")
	value = record[field_name]
	if value is None or value == "":
		raise ValueError(f"{context} has empty required field {field_name}")
	return value


#============================================

def extract_json_value(html: str, variable_name: str) -> object:
	"""Decode one embedded ``window`` assignment without delimiter guessing.

	Args:
		html: Official player-page HTML.
		variable_name: JavaScript variable name following ``window.``.

	Returns:
		The decoded assignment value.
	"""
	marker = f"window.{variable_name} = "
	start = html.find(marker)
	if start == -1:
		raise ValueError(f"Could not find {variable_name} in player page")
	value_start = start + len(marker)
	decoder = json.JSONDecoder()
	value, unused_end = decoder.raw_decode(html[value_start:])
	return value


#============================================

def rows_from_stats_payload(payload: object, result_name: str) -> list[dict]:
	"""Turn an NBA Stats result-set payload into named row mappings.

	Args:
		payload: Decoded official JSON response.
		result_name: Expected result-set name for error reporting.

	Returns:
		Rows keyed by their official header names.
	"""
	mapping = require_mapping(payload, result_name)
	result_sets = require_list(mapping["resultSets"], result_name + ".resultSets")
	for result_set_value in result_sets:
		result_set = require_mapping(result_set_value, result_name + " result set")
		if result_set["name"] != result_name:
			continue
		headers = require_list(result_set["headers"], result_name + ".headers")
		row_values = require_list(result_set["rowSet"], result_name + ".rowSet")
		if not all(isinstance(header, str) for header in headers):
			raise ValueError(f"{result_name}.headers must contain strings")
		rows = []
		for row_value in row_values:
			row = require_list(row_value, result_name + " row")
			if len(row) != len(headers):
				raise ValueError(f"{result_name} row does not match its headers")
			rows.append(dict(zip(headers, row, strict=True)))
		return rows
	raise ValueError(f"Could not find result set {result_name}")


#============================================

def extract_team_ids(team_payload: object) -> list[str]:
	"""Find team IDs from the official team-list JSON without a fixed team list.

	Args:
		team_payload: Decoded official team-list response.

	Returns:
		Sorted decimal team identifiers.
	"""
	team_ids = set()

	def visit(value: object) -> None:
		"""Walk an arbitrary JSON value looking for documented team ID keys.

		Args:
			value: A nested JSON value.
		"""
		if isinstance(value, dict):
			for key, child in value.items():
				if key in {"TEAM_ID", "teamId", "team_id"} and isinstance(child, (int, str)):
					team_id = str(child)
					if team_id.isdecimal():
						team_ids.add(team_id)
				visit(child)
		elif isinstance(value, list):
			for child in value:
				visit(child)

	visit(team_payload)
	if not team_ids:
		raise ValueError("Official team-list response did not contain any team IDs")
	sorted_ids = sorted(team_ids, key=int)
	return sorted_ids


#============================================

def allow_fields(record: dict, fields: tuple[str, ...], context: str) -> dict:
	"""Copy exactly the approved fields while requiring each source value.

	Args:
		record: Source record.
		fields: Allowed and required source fields.
		context: Record identity for errors.

	Returns:
		A restricted record.
	"""
	allowed_record = {}
	for field_name in fields:
		allowed_record[field_name] = require_field(record, field_name, context)
	return allowed_record


#============================================

def index_fantasy_points(rows: list[dict], season: str) -> dict[str, float | int]:
	"""Index complete season fantasy-point totals by player ID.

	Args:
		rows: Traditional-totals rows for one season.
		season: Season used in failure messages.

	Returns:
		Official fantasy totals keyed by decimal player ID.
	"""
	points_by_player = {}
	for row in rows:
		player_id = str(require_field(row, "PLAYER_ID", f"{season} traditional row"))
		if not player_id.isdecimal():
			raise ValueError(f"{season} traditional row has invalid PLAYER_ID {player_id}")
		if player_id in points_by_player:
			raise ValueError(f"{season} traditional totals repeat player {player_id}")
		points = require_field(row, "WNBA_FANTASY_PTS", f"{season} player {player_id}")
		if not isinstance(points, (int, float)) or isinstance(points, bool):
			raise ValueError(f"{season} player {player_id} has nonnumeric WNBA_FANTASY_PTS")
		points_by_player[player_id] = points
	if not points_by_player:
		raise ValueError(f"{season} traditional totals contained no player rows")
	return points_by_player


#============================================

def is_current_season_entrant(profile: dict, current_season: str, context: str) -> bool:
	"""Determine whether a player could have appeared in the prior season.

	A current-roster player whose official profile starts in the current season
	cannot have a preceding-season traditional-total row. That known pre-league
	absence is represented as zero points; an established player missing that row
	remains a source-data failure.

	Args:
		profile: Official player-page profile mapping.
		current_season: Current season year.
		context: Player identity included in boundary errors.

	Returns:
		``True`` only when the official profile begins in the current season.
	"""
	from_year = require_field(profile, "FROM_YEAR", context)
	from_year_text = str(from_year)
	if not from_year_text.isdecimal():
		raise ValueError(f"{context} has invalid FROM_YEAR {from_year}")
	if not current_season.isdecimal():
		raise ValueError(f"Current season must be a decimal year: {current_season}")
	if int(from_year_text) > int(current_season):
		raise ValueError(
			f"{context} has FROM_YEAR after current season {current_season}: {from_year}"
		)
	is_entrant = from_year_text == current_season
	return is_entrant


#============================================

def resolve_manifest_path(manifest_file: pathlib.Path, relative_path: str) -> pathlib.Path:
	"""Resolve one manifest-relative export path without URL ambiguity.

	Args:
		manifest_file: Manifest location.
		relative_path: Relative local export path from its JSON entry.

	Returns:
		The resolved local path.
	"""
	path = pathlib.Path(relative_path)
	if path.is_absolute():
		raise ValueError(f"Manifest export path must be relative: {relative_path}")
	manifest_directory = manifest_file.parent.resolve()
	resolved_path = (manifest_directory / path).resolve()
	if not resolved_path.is_relative_to(manifest_directory):
		raise ValueError(
			"Manifest export path must stay below the manifest directory: "
			f"{relative_path}"
		)
	return resolved_path


#============================================

def load_manifest_sources(manifest_path: pathlib.Path) -> dict:
	"""Load a saved official-response manifest and its referenced files.

	Args:
		manifest_path: Local manifest JSON path.

	Returns:
		Normalized source payloads and provenance.
	"""
	manifest = require_mapping(read_json(manifest_path), "input manifest")
	sources = require_mapping(manifest["sources"], "input manifest.sources")
	as_of_date = require_field(manifest, "asOfDateUtc", "input manifest")
	if not isinstance(as_of_date, str):
		raise ValueError("input manifest asOfDateUtc must be a string")

	stats = require_mapping(sources["traditionalStats"], "sources.traditionalStats")
	current_entry = require_mapping(stats[CURRENT_SEASON], "traditionalStats.2026")
	previous_entry = require_mapping(stats[PREVIOUS_SEASON], "traditionalStats.2025")
	team_entry = require_mapping(sources["teams"], "sources.teams")
	roster_entries = require_list(sources["rosters"], "sources.rosters")
	profile_entries = require_mapping(sources["playerPages"], "sources.playerPages")

	def load_json_entry(entry: dict, context: str) -> tuple[object, str]:
		"""Load an official JSON export and validate its provenance URL.

		Args:
			entry: Manifest entry.
			context: Entry name for errors.

		Returns:
			The JSON payload and validated source URL.
		"""
		source_url = require_field(entry, "sourceUrl", context)
		file_name = require_field(entry, "file", context)
		if not isinstance(source_url, str) or not isinstance(file_name, str):
			raise ValueError(f"{context} sourceUrl and file must be strings")
		payload = read_json(resolve_manifest_path(manifest_path, file_name))
		return payload, validate_official_url(source_url)

	team_payload, team_url = load_json_entry(team_entry, "sources.teams")
	current_payload, current_url = load_json_entry(current_entry, "traditionalStats.2026")
	previous_payload, previous_url = load_json_entry(previous_entry, "traditionalStats.2025")
	rosters = []
	for roster_entry_value in roster_entries:
		roster_entry = require_mapping(roster_entry_value, "sources.rosters entry")
		team_id = str(require_field(roster_entry, "teamId", "sources.rosters entry"))
		if not team_id.isdecimal():
			raise ValueError(f"sources.rosters entry has invalid teamId {team_id}")
		payload, source_url = load_json_entry(roster_entry, f"roster {team_id}")
		rosters.append({"teamId": team_id, "payload": payload, "sourceUrl": source_url})
	profiles = {}
	profile_urls = {}
	for player_id, profile_entry_value in profile_entries.items():
		if not str(player_id).isdecimal():
			raise ValueError(f"playerPages has invalid player ID {player_id}")
		profile_entry = require_mapping(profile_entry_value, f"playerPages.{player_id}")
		source_url = require_field(profile_entry, "sourceUrl", f"playerPages.{player_id}")
		file_name = require_field(profile_entry, "file", f"playerPages.{player_id}")
		if not isinstance(source_url, str) or not isinstance(file_name, str):
			raise ValueError(f"playerPages.{player_id} sourceUrl and file must be strings")
		profiles[str(player_id)] = read_text(resolve_manifest_path(manifest_path, file_name))
		profile_urls[str(player_id)] = validate_official_url(source_url)

	loaded_sources = {
		"asOfDateUtc": as_of_date,
		"validationScope": "complete",
		"teamPayload": team_payload,
		"teamUrl": team_url,
		"currentStatsPayload": current_payload,
		"currentStatsUrl": current_url,
		"previousStatsPayload": previous_payload,
		"previousStatsUrl": previous_url,
		"rosters": rosters,
		"profiles": profiles,
		"profileUrls": profile_urls,
	}
	return loaded_sources


#============================================

def build_candidates(sources: dict) -> dict:
	"""Join roster evidence, player biographies, and two seasons of fantasy totals.

	Args:
		sources: Normalized official source payloads.

	Returns:
		The private candidate-file envelope.
	"""
	current_season = str(sources.get("currentSeason", CURRENT_SEASON))
	previous_season = str(sources.get("previousSeason", PREVIOUS_SEASON))
	validation_scope = sources.get("validationScope", "complete")
	if validation_scope not in {"complete", "incomplete", "test-limit"}:
		raise ValueError(
			"Candidate validation scope must be complete, incomplete, or test-limit: "
			f"{validation_scope}"
		)
	team_ids = extract_team_ids(sources["teamPayload"])
	rosters = sources["rosters"]
	roster_team_ids = [roster["teamId"] for roster in rosters]
	if len(roster_team_ids) != len(set(roster_team_ids)):
		raise ValueError("More than one current-roster response was supplied for a team")
	missing_teams = sorted(set(team_ids) - set(roster_team_ids), key=int)
	if missing_teams:
		missing_text = ", ".join(missing_teams)
		raise ValueError(f"Missing current-roster response for team IDs: {missing_text}")
	extra_teams = sorted(set(roster_team_ids) - set(team_ids), key=int)
	if extra_teams:
		extra_text = ", ".join(extra_teams)
		raise ValueError(f"Roster responses include teams absent from the team list: {extra_text}")
	current_rows = rows_from_stats_payload(sources["currentStatsPayload"], "LeagueDashPlayerStats")
	previous_rows = rows_from_stats_payload(sources["previousStatsPayload"], "LeagueDashPlayerStats")
	current_points = index_fantasy_points(current_rows, current_season)
	previous_points = index_fantasy_points(previous_rows, previous_season)
	candidates_by_player = {}
	for roster_source in rosters:
		team_id = roster_source["teamId"]
		roster_rows = rows_from_stats_payload(roster_source["payload"], "CommonTeamRoster")
		if not roster_rows:
			raise ValueError(
				f"Current-roster response contained no roster rows for team {team_id}"
			)
		for roster_row in roster_rows:
			player_id = str(require_field(roster_row, "PLAYER_ID", f"team {team_id} roster row"))
			roster_team_id = str(require_field(roster_row, "TEAM_ID", f"team {team_id} roster row"))
			if roster_team_id != team_id:
				raise ValueError(
					f"Roster response for team {team_id} contains player assigned to team {roster_team_id}"
				)
			if player_id in candidates_by_player:
				raise ValueError(f"Player {player_id} appears in more than one current roster response")
			if player_id not in current_points:
				raise ValueError(f"Current-season fantasy points missing player {player_id}")
			if player_id not in sources["profiles"]:
				raise ValueError(f"Player page export missing player {player_id}")
			profile_payload = extract_json_value(sources["profiles"][player_id], "nbaStatsPlayerInfo")
			profile = require_mapping(profile_payload, f"player {player_id} profile")
			profile_id = str(require_field(profile, "PERSON_ID", f"player {player_id} profile"))
			if profile_id != player_id:
				raise ValueError(f"Player page identifier mismatch for player {player_id}")
			previous_fantasy_points = previous_points.get(player_id)
			if previous_fantasy_points is None:
				if not is_current_season_entrant(
					profile, current_season, f"player {player_id} profile"
				):
					raise ValueError(f"Previous-season fantasy points missing player {player_id}")
				previous_fantasy_points = 0
			candidate = {
				"playerId": player_id,
				"rosterSourceUrl": roster_source["sourceUrl"],
				"playerPageSourceUrl": sources["profileUrls"][player_id],
				"roster": allow_fields(roster_row, ROSTER_FIELDS, f"player {player_id} roster"),
				"profile": allow_fields(profile, PROFILE_FIELDS, f"player {player_id} profile"),
				"fantasyPointsCurrentSeason": current_points[player_id],
				"fantasyPointsPreviousSeason": previous_fantasy_points,
			}
			candidates_by_player[player_id] = candidate
	if not candidates_by_player:
		raise ValueError("Current-roster responses contained no players")
	candidates = [
		candidates_by_player[player_id]
		for player_id in sorted(candidates_by_player, key=int)
	]
	sources_metadata = {
		"teamListUrl": sources["teamUrl"],
		"traditionalStatsUrls": {
			current_season: sources["currentStatsUrl"],
			previous_season: sources["previousStatsUrl"],
		},
	}
	output = {
		"schemaVersion": 1,
		"asOfDateUtc": sources["asOfDateUtc"],
		"source": {
			"kind": "official-wnba-stats",
			"seasons": {"current": current_season, "previous": previous_season},
			"urls": sources_metadata,
		},
		"validation": {
			"scope": validation_scope,
			"teamCount": len(team_ids),
			"rosterResponseCount": len(rosters),
			"currentTraditionalRowCount": len(current_rows),
			"previousTraditionalRowCount": len(previous_rows),
			"candidateCount": len(candidates),
		},
		"candidates": candidates,
	}
	return output


#============================================

def write_json(path: pathlib.Path, payload: dict) -> None:
	"""Atomically write readable ASCII-safe candidate JSON.

	Args:
		path: Candidate output path.
		payload: Validated candidate-file envelope.
	"""
	path.parent.mkdir(parents=True, exist_ok=True)
	temporary_path = path.with_suffix(path.suffix + ".tmp")
	with temporary_path.open("w", encoding="utf-8") as output_file:
		json.dump(payload, output_file, indent=2, ensure_ascii=True)
		output_file.write("\n")
	temporary_path.replace(path)


#============================================

def main() -> None:
	"""Load official inputs, validate completeness, and write one private file."""
	args = parse_args()
	output_file = validate_private_output_path(args.output_file)
	sources = load_manifest_sources(args.input_manifest)
	candidates = build_candidates(sources)
	write_json(output_file, candidates)
	print(f"Saved {candidates['validation']['candidateCount']} candidates to {output_file}")


#============================================

if __name__ == "__main__":
	main()

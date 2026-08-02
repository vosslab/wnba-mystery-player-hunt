"""Select recognizable WNBA candidates and write a game-safe roster snapshot.

This script is an offline transformation boundary. It accepts the complete
private candidate file produced by root ``fetch_wnba_player_data.py``;
``tools/fetch_wnba_candidates.py`` is only the recovery validator for saved
exports. It never performs network I/O. Fantasy-point totals are used only
while selecting the pool and are deliberately excluded from the snapshot.
"""

# Standard Library
import argparse
import csv
import datetime
import json
import pathlib
import re
import unicodedata
import urllib.parse


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
COUNTRY_OVERRIDES_PATH = REPO_ROOT / "data_review/country_overrides.csv"
ELIGIBILITY_OVERRIDES_PATH = REPO_ROOT / "data_review/eligibility_overrides.csv"
TEAM_CONFERENCES_PATH = REPO_ROOT / "data_review/team_conferences.csv"
NO_US_COLLEGE = "No US college"
NO_US_COLLEGE_VALUES = {"", "--", "n/a", "na", "no college", "none", "null"}
UNDRAFTED_VALUES = {"", "-", "0", "n/a", "na", "none", "null", "undrafted"}
POSITION_NAMES = {"g": "G", "guard": "G", "f": "F", "forward": "F", "c": "C", "center": "C"}


#============================================

def parse_https_url(url: str, context: str) -> urllib.parse.SplitResult:
	"""Parse one source URL and reject redirects, credentials, and fragments.

	Args:
		url: Complete source URL.
		context: Human-readable source location.

	Returns:
		The parsed URL after its transport boundary has been checked.
	"""
	parsed = urllib.parse.urlsplit(url)
	if (
		parsed.scheme != "https"
		or not parsed.netloc
		or parsed.username is not None
		or parsed.password is not None
		or parsed.fragment
	):
		raise ValueError(f"{context} must be a direct HTTPS source URL")
	return parsed


#============================================

def require_basketball_reference_totals_url(url: str, season: int, context: str) -> None:
	"""Require the exact server-rendered Basketball-Reference WNBA totals route."""
	parsed = parse_https_url(url, context)
	expected_path = f"/wnba/years/{season}_totals.html"
	if (
		parsed.netloc != "www.basketball-reference.com"
		or parsed.path != expected_path
		or parsed.query
	):
		raise ValueError(f"{context} must be Basketball-Reference WNBA totals for {season}")


#============================================

def require_official_source_url(url: str, path: str, context: str) -> urllib.parse.SplitResult:
	"""Require one exact legacy WNBA Stats route on its official host."""
	parsed = parse_https_url(url, context)
	if parsed.netloc != "stats.wnba.com" or parsed.path != path:
		raise ValueError(f"{context} must be an official WNBA Stats URL")
	return parsed


#============================================

def require_candidate_source_urls(
	candidate: dict,
	source_kind: str,
	context: str,
	current_season: int | None = None,
) -> None:
	"""Require source-kind-specific roster and player evidence URLs."""
	roster_url = require_string(candidate, "rosterSourceUrl", context)
	player_url = require_string(candidate, "playerPageSourceUrl", context)
	if source_kind == "official-wnba-stats":
		roster_parsed = require_official_source_url(
			roster_url, "/stats/commonteamroster", context + ".rosterSourceUrl"
		)
		if "TeamID" not in urllib.parse.parse_qs(roster_parsed.query):
			raise ValueError(f"{context}.rosterSourceUrl must identify an official team")
		player_id = require_string(candidate, "playerId", context)
		require_official_source_url(
			player_url, f"/player/{player_id}/", context + ".playerPageSourceUrl"
		)
		return
	if source_kind == "basketball-reference-html":
		roster_parsed = parse_https_url(roster_url, context + ".rosterSourceUrl")
		player_parsed = parse_https_url(player_url, context + ".playerPageSourceUrl")
		if (
			roster_parsed.netloc != "www.basketball-reference.com"
			or roster_parsed.query
			or not re.fullmatch(r"/wnba/teams/[A-Z]{2,3}/\d{4}\.html", roster_parsed.path)
		):
			raise ValueError(f"{context}.rosterSourceUrl must be a Basketball-Reference WNBA team page")
		if current_season is not None and not roster_parsed.path.endswith(f"/{current_season}.html"):
			raise ValueError(f"{context}.rosterSourceUrl must identify the current source season")
		if (
			player_parsed.netloc != "www.basketball-reference.com"
			or player_parsed.query
			or not re.fullmatch(r"/wnba/players/[a-z]/[a-z0-9]+\.html", player_parsed.path)
		):
			raise ValueError(f"{context}.playerPageSourceUrl must be a Basketball-Reference WNBA player page")
		return
	raise ValueError(f"{context} has unsupported source kind {source_kind!r}")


#============================================

def parse_args() -> argparse.Namespace:
	"""Parse the required offline generation arguments.

	Returns:
		The private candidate input, approved cutoff, and snapshot output path.
	"""
	parser = argparse.ArgumentParser(
		description="Build a verified WNBA roster snapshot from private candidates."
	)
	parser.add_argument("-i", "--input", dest="input", type=pathlib.Path, required=True,
		help=(
			"Complete private candidate JSON from fetch_wnba_player_data.py; "
			"tools/fetch_wnba_candidates.py only validates saved recovery inputs."
		))
	parser.add_argument("-c", "--cutoff", dest="cutoff", type=int, choices=(200, 300), required=True,
			help="Approved two-season WNBA_FANTASY_PTS cutoff.")
	parser.add_argument("-o", "--output", dest="output", type=pathlib.Path, required=True,
		help="Output path for the static roster snapshot JSON.")
	args = parser.parse_args()
	return args


#============================================

def require_mapping(value: object, context: str) -> dict:
	"""Require an object at an input boundary.

	Args:
		value: Candidate JSON value.
		context: Human-readable source location.

	Returns:
		The validated mapping.
	"""
	if not isinstance(value, dict):
		raise ValueError(f"{context} must be a JSON object")
	mapping = value
	return mapping


#============================================

def require_list(value: object, context: str) -> list:
	"""Require an array at an input boundary.

	Args:
		value: Candidate JSON value.
		context: Human-readable source location.

	Returns:
		The validated list.
	"""
	if not isinstance(value, list):
		raise ValueError(f"{context} must be a JSON array")
	items = value
	return items


#============================================

def require_exact_keys(record: dict, expected_keys: set[str], context: str) -> None:
	"""Reject partial or expanded records at the private-data boundary.

	Args:
		record: Input mapping to validate.
		expected_keys: Complete allowed key set.
		context: Human-readable source location.
	"""
	actual_keys = set(record)
	if actual_keys != expected_keys:
		missing_keys = sorted(expected_keys - actual_keys)
		extra_keys = sorted(actual_keys - expected_keys)
		raise ValueError(f"{context} keys differ; missing={missing_keys}, extra={extra_keys}")


#============================================

def require_string(record: dict, key: str, context: str) -> str:
	"""Require one non-empty string field.

	Args:
		record: Input mapping.
		key: Required field name.
		context: Human-readable source location.

	Returns:
		The stripped source string.
	"""
	value = record[key]
	if not isinstance(value, str) or not value.strip():
		raise ValueError(f"{context}.{key} must be a non-empty string")
	text = value.strip()
	return text


#============================================

def require_number(record: dict, key: str, context: str) -> int | float:
	"""Require a finite non-boolean numeric field, preserving zero.

	Args:
		record: Input mapping.
		key: Required field name.
		context: Human-readable source location.

	Returns:
		The validated numeric value.
	"""
	value = record[key]
	if isinstance(value, bool) or not isinstance(value, (int, float)):
		raise ValueError(f"{context}.{key} must be numeric; explicit zero is valid")
	if value != value or value in {float("inf"), float("-inf")}:
		raise ValueError(f"{context}.{key} must be finite")
	number = value
	return number


#============================================

def require_year(record: dict, key: str, context: str) -> int:
	"""Require a plausible four-digit source year without changing its meaning.

	Args:
		record: Input mapping.
		key: Required year field.
		context: Human-readable source location.

	Returns:
		The validated year as an integer.
	"""
	value = record[key]
	if isinstance(value, bool):
		raise ValueError(f"{context}.{key} must be a four-digit year")
	if isinstance(value, int):
		year_text = str(value)
	elif isinstance(value, str):
		year_text = value.strip()
	else:
		raise ValueError(f"{context}.{key} must be a four-digit year")
	if not re.fullmatch(r"\d{4}", year_text):
		raise ValueError(f"{context}.{key} must be a four-digit year")
	year = int(year_text)
	if year < 1900 or year > 2100:
		raise ValueError(f"{context}.{key} is outside supported year bounds")
	return year


#============================================

def load_json(path: pathlib.Path) -> object:
	"""Load one UTF-8 JSON file.

	Args:
		path: File to decode.

	Returns:
		The decoded JSON value.
	"""
	with path.open("r", encoding="utf-8") as input_file:
		value = json.load(input_file)
	return value


#============================================

def load_csv_rows(path: pathlib.Path, expected_fields: tuple[str, ...]) -> list[dict]:
	"""Load a small reviewed CSV table with an exact header.

	Args:
		path: CSV file location.
		expected_fields: Required ordered header fields.

	Returns:
		The CSV rows.
	"""
	with path.open("r", encoding="utf-8", newline="") as input_file:
		reader = csv.DictReader(input_file)
		if reader.fieldnames != list(expected_fields):
			raise ValueError(f"{path} must have header {list(expected_fields)}")
		rows = list(reader)
	return rows


#============================================

def load_country_overrides() -> dict[str, str]:
	"""Load reviewed raw-country to ISO English display-name mappings.

	Returns:
		Mappings keyed by the exact raw source value.
	"""
	rows = load_csv_rows(COUNTRY_OVERRIDES_PATH, ("raw_country", "display_country"))
	overrides = {}
	for row in rows:
		raw_country = require_string(row, "raw_country", str(COUNTRY_OVERRIDES_PATH))
		display_country = require_string(row, "display_country", str(COUNTRY_OVERRIDES_PATH))
		if raw_country in overrides:
			raise ValueError(f"{COUNTRY_OVERRIDES_PATH} repeats raw country {raw_country}")
		overrides[raw_country] = display_country
	return overrides


#============================================

def load_team_conferences() -> dict[str, str]:
	"""Load the maintained team-code conference mapping.

	Returns:
		Conference by official tricode.
	"""
	rows = load_csv_rows(TEAM_CONFERENCES_PATH, ("team_code", "conference"))
	conferences = {}
	for row in rows:
		team_code = require_string(row, "team_code", str(TEAM_CONFERENCES_PATH)).upper()
		conference = require_string(row, "conference", str(TEAM_CONFERENCES_PATH))
		if conference not in {"East", "West"}:
			raise ValueError(f"{TEAM_CONFERENCES_PATH} has invalid conference {conference}")
		if team_code in conferences:
			raise ValueError(f"{TEAM_CONFERENCES_PATH} repeats team code {team_code}")
		conferences[team_code] = conference
	return conferences


#============================================

def load_eligibility_overrides() -> dict[str, dict]:
	"""Load documented roster-source corrections without changing membership.

	Returns:
		Corrections keyed by player identifier.
	"""
	rows = load_csv_rows(
		ELIGIBILITY_OVERRIDES_PATH,
		("player_id", "team_code", "roster_source_url", "reason"),
	)
	overrides = {}
	for row in rows:
		player_id = require_string(row, "player_id", str(ELIGIBILITY_OVERRIDES_PATH))
		if not player_id.isdecimal():
			raise ValueError(f"{ELIGIBILITY_OVERRIDES_PATH} has invalid player_id {player_id}")
		team_code = require_string(row, "team_code", str(ELIGIBILITY_OVERRIDES_PATH)).upper()
		roster_source_url = require_string(
			row, "roster_source_url", str(ELIGIBILITY_OVERRIDES_PATH)
		)
		reason = require_string(row, "reason", str(ELIGIBILITY_OVERRIDES_PATH))
		if player_id in overrides:
			raise ValueError(f"{ELIGIBILITY_OVERRIDES_PATH} repeats player {player_id}")
		overrides[player_id] = {
			"teamCode": team_code,
			"rosterSourceUrl": roster_source_url,
			"reason": reason,
		}
	return overrides


#============================================

def validate_candidate_envelope(value: object) -> dict:
	"""Validate complete private candidate-file provenance and counts.

	Args:
		value: Decoded candidate-file value.

	Returns:
		The validated candidate envelope.
	"""
	envelope = require_mapping(value, "candidate file")
	require_exact_keys(
		envelope,
		{"schemaVersion", "asOfDateUtc", "source", "validation", "candidates"},
		"candidate file",
	)
	if envelope["schemaVersion"] != 1:
		raise ValueError("candidate file.schemaVersion must be 1")
	as_of_date = require_string(envelope, "asOfDateUtc", "candidate file")
	if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", as_of_date):
		raise ValueError("candidate file.asOfDateUtc must be YYYY-MM-DD")
	try:
		datetime.date.fromisoformat(as_of_date)
	except ValueError as error:
		raise ValueError("candidate file.asOfDateUtc must be a real UTC date") from error
	source = require_mapping(envelope["source"], "candidate file.source")
	require_exact_keys(source, {"kind", "seasons", "urls"}, "candidate file.source")
	source_kind = require_string(source, "kind", "candidate file.source")
	if source_kind not in {"official-wnba-stats", "basketball-reference-html"}:
		raise ValueError(
			"candidate file.source.kind must be official-wnba-stats or basketball-reference-html"
		)
	seasons = require_mapping(source["seasons"], "candidate file.source.seasons")
	require_exact_keys(seasons, {"current", "previous"}, "candidate file.source.seasons")
	current_season = require_year(seasons, "current", "candidate file.source.seasons")
	previous_season = require_year(seasons, "previous", "candidate file.source.seasons")
	if previous_season != current_season - 1:
		raise ValueError("candidate file seasons must be consecutive current and previous years")
	urls = require_mapping(source["urls"], "candidate file.source.urls")
	require_exact_keys(
		urls, {"teamListUrl", "traditionalStatsUrls"}, "candidate file.source.urls"
	)
	traditional_urls = require_mapping(urls["traditionalStatsUrls"], "traditionalStatsUrls")
	season_keys = {str(current_season), str(previous_season)}
	require_exact_keys(traditional_urls, season_keys, "traditionalStatsUrls")
	if source_kind == "official-wnba-stats":
		require_official_source_url(
			require_string(urls, "teamListUrl", "candidate file.source.urls"),
			"/js/data/widgets/teams_landing_inner.json",
			"candidate file.source.urls.teamListUrl",
		)
		for season in (current_season, previous_season):
			traditional_url = require_string(
				traditional_urls, str(season), "traditionalStatsUrls"
			)
			traditional_parsed = require_official_source_url(
				traditional_url, "/stats/leaguedashplayerstats", f"traditionalStatsUrls.{season}"
			)
			if urllib.parse.parse_qs(traditional_parsed.query).get("Season") != [str(season)]:
				raise ValueError(f"traditionalStatsUrls.{season} must identify season {season}")
	else:
		team_list_url = require_string(urls, "teamListUrl", "candidate file.source.urls")
		require_basketball_reference_totals_url(
			team_list_url, current_season, "candidate file.source.urls.teamListUrl"
		)
		for season in (current_season, previous_season):
			require_basketball_reference_totals_url(
				require_string(traditional_urls, str(season), "traditionalStatsUrls"),
				season,
				f"traditionalStatsUrls.{season}",
			)
	validation = require_mapping(envelope["validation"], "candidate file.validation")
	require_exact_keys(
		validation,
		{
			"scope",
			"teamCount",
			"rosterResponseCount",
			"currentTraditionalRowCount",
			"previousTraditionalRowCount",
			"candidateCount",
		},
		"candidate file.validation",
	)
	scope = require_string(validation, "scope", "candidate file.validation")
	if scope == "test-limit":
		raise ValueError(
			"candidate file was produced with --max and cannot generate a roster snapshot"
		)
	if scope != "complete":
		raise ValueError("candidate file.validation.scope must be complete or test-limit")
	for key in (
		"teamCount",
		"rosterResponseCount",
		"currentTraditionalRowCount",
		"previousTraditionalRowCount",
		"candidateCount",
	):
		count = validation[key]
		if isinstance(count, bool) or not isinstance(count, int) or count <= 0:
			raise ValueError(f"candidate file.validation.{key} must be a positive integer")
	if validation["teamCount"] != validation["rosterResponseCount"]:
		raise ValueError("candidate file team and roster response counts must agree")
	candidates = require_list(envelope["candidates"], "candidate file.candidates")
	if validation["candidateCount"] != len(candidates):
		raise ValueError("candidate file candidateCount must equal candidates length")
	if not candidates:
		raise ValueError("candidate file must contain current-roster candidates")
	validated = envelope
	return validated


#============================================

def normalize_search_name(display_name: str) -> str:
	"""Create a deterministic accent-insensitive autocomplete term.

	Args:
		display_name: Official player display name.

	Returns:
		A lowercase ASCII search term.
	"""
	decomposed = unicodedata.normalize("NFKD", display_name)
	ascii_name = decomposed.encode("ascii", "ignore").decode("ascii")
	search_name = re.sub(r"[^a-z0-9]+", " ", ascii_name.lower()).strip()
	if not search_name:
		raise ValueError(f"Player name cannot produce a search term: {display_name}")
	return search_name


#============================================

def normalize_height(raw_height: str, context: str) -> int:
	"""Convert an official feet-inches height into total inches.

	Args:
		raw_height: Source height, such as ``6-0``.
		context: Human-readable source location.

	Returns:
		Positive height in inches.
	"""
	match = re.fullmatch(r"(\d+)-(\d+)", raw_height.strip())
	if match is None:
		raise ValueError(f"{context} HEIGHT must use feet-inches form such as 6-0")
	feet = int(match.group(1))
	inches = int(match.group(2))
	if feet <= 0 or inches > 11:
		raise ValueError(f"{context} HEIGHT is outside feet-inches bounds: {raw_height}")
	height_inches = feet * 12 + inches
	return height_inches


#============================================

def normalize_birth_date(raw_date: str, context: str) -> str:
	"""Convert source birth dates to a midnight UTC ISO timestamp.

	Args:
		raw_date: Official source birth date.
		context: Human-readable source location.

	Returns:
		A valid UTC timestamp without milliseconds.
	"""
	date_text = raw_date.strip().replace("Z", "")
	date_text = date_text.split("T", maxsplit=1)[0]
	if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_text):
		raise ValueError(f"{context} BIRTHDATE must begin with YYYY-MM-DD")
	try:
		datetime.date.fromisoformat(date_text)
	except ValueError as error:
		raise ValueError(f"{context} BIRTHDATE is not a real date") from error
	birth_date = date_text + "T00:00:00Z"
	return birth_date


#============================================

def normalize_draft(profile: dict, context: str) -> dict:
	"""Create the public drafted or undrafted shape from profile fields.

	Args:
		profile: Validated official biography mapping.
		context: Human-readable source location.

	Returns:
		A game-facing draft record.
	"""
	raw_year = require_string(profile, "DRAFT_YEAR", context)
	raw_number = require_string(profile, "DRAFT_NUMBER", context)
	year_text = raw_year.strip().casefold()
	number_text = raw_number.strip().casefold()
	if year_text in UNDRAFTED_VALUES and number_text in UNDRAFTED_VALUES:
		draft = {"kind": "undrafted"}
		return draft
	if not raw_year.isdecimal() or not raw_number.isdecimal():
		raise ValueError(
			f"{context} draft fields need a documented undrafted spelling "
			"or positive integers"
		)
	year = int(raw_year)
	overall_pick = int(raw_number)
	if year <= 0 or overall_pick <= 0:
		raise ValueError(f"{context} drafted year and overall pick must be positive")
	draft = {"kind": "drafted", "year": year, "overallPick": overall_pick}
	return draft


#============================================

def normalize_position(raw_position: str, context: str) -> tuple[str, list[str]]:
	"""Normalize single or compound source positions into primary and alternates.

	Args:
		raw_position: Official source position text.
		context: Human-readable source location.

	Returns:
		The ordered primary code and distinct alternate codes.
	"""
	parts = re.split(r"[-/,]+", raw_position.strip().casefold())
	codes = []
	for part in parts:
		position_name = part.strip().replace(" ", "")
		if position_name not in POSITION_NAMES:
			raise ValueError(f"{context} has unknown POSITION {raw_position}; update normalizer")
		code = POSITION_NAMES[position_name]
		if code not in codes:
			codes.append(code)
	if not codes:
		raise ValueError(f"{context} has empty POSITION")
	primary = codes[0]
	alternates = codes[1:]
	return primary, alternates


#============================================

def normalize_college(raw_college: str) -> str:
	"""Supply the documented no-US-college bucket for source placeholders.

	Args:
		raw_college: Official source SCHOOL value.

	Returns:
		A non-empty public college value.
	"""
	college = raw_college.strip()
	if college.casefold() in NO_US_COLLEGE_VALUES:
		return NO_US_COLLEGE
	return college


#============================================

def validate_candidate(
	candidate_value: object,
	index: int,
	source_kind: str = "official-wnba-stats",
	current_season: int | None = None,
) -> dict:
	"""Validate one complete private candidate record.

	Args:
		candidate_value: Candidate JSON record.
		index: Array position for boundary errors.

	Returns:
		The validated candidate record.
	"""
	context = f"candidate[{index}]"
	candidate = require_mapping(candidate_value, context)
	require_exact_keys(
		candidate,
		{
			"playerId",
			"rosterSourceUrl",
			"playerPageSourceUrl",
			"roster",
			"profile",
			"fantasyPointsCurrentSeason",
			"fantasyPointsPreviousSeason",
		},
		context,
	)
	player_id = require_string(candidate, "playerId", context)
	if not player_id.isdecimal():
		raise ValueError(f"{context}.playerId must be decimal digits")
	require_candidate_source_urls(candidate, source_kind, context, current_season)
	require_number(candidate, "fantasyPointsCurrentSeason", context)
	require_number(candidate, "fantasyPointsPreviousSeason", context)
	roster = require_mapping(candidate["roster"], context + ".roster")
	profile = require_mapping(candidate["profile"], context + ".profile")
	require_exact_keys(
		roster,
		{
			"TEAM_ID", "TEAM_ABBREVIATION", "PLAYER_ID", "PLAYER", "NUM", "POSITION",
			"HEIGHT", "WEIGHT", "BIRTH_DATE", "AGE", "EXP", "SCHOOL", "PLAYER_SLUG",
		},
		context + ".roster",
	)
	require_exact_keys(
		profile,
		{
			"PERSON_ID", "DISPLAY_FIRST_LAST", "BIRTHDATE", "SCHOOL", "COUNTRY", "HEIGHT",
			"POSITION", "ROSTERSTATUS", "TEAM_ID", "TEAM_ABBREVIATION", "DRAFT_YEAR",
			"DRAFT_ROUND", "DRAFT_NUMBER", "FROM_YEAR",
		},
		context + ".profile",
	)
	if str(roster["PLAYER_ID"]) != player_id or str(profile["PERSON_ID"]) != player_id:
		raise ValueError(f"{context} player identifiers do not agree")
	if str(roster["TEAM_ID"]) != str(profile["TEAM_ID"]):
		raise ValueError(f"{context} roster and profile team identifiers do not agree")
	roster_team_code = require_string(roster, "TEAM_ABBREVIATION", context + ".roster").upper()
	profile_team_code = require_string(profile, "TEAM_ABBREVIATION", context + ".profile").upper()
	if roster_team_code != profile_team_code:
		raise ValueError(f"{context} roster and profile team codes do not agree")
	for field_name in ("DISPLAY_FIRST_LAST", "BIRTHDATE", "SCHOOL", "COUNTRY", "HEIGHT", "POSITION"):
		require_string(profile, field_name, context + ".profile")
	require_year(profile, "FROM_YEAR", context + ".profile")
	require_string(roster, "TEAM_ABBREVIATION", context + ".roster")
	validated = candidate
	return validated


#============================================

def build_player(
	candidate: dict,
	country_overrides: dict[str, str],
	team_conferences: dict[str, str],
	eligibility_overrides: dict[str, dict],
) -> dict:
	"""Normalize one selected candidate into the exact public player shape.

	Args:
		candidate: Validated private candidate record.
		country_overrides: Reviewed country display mappings.
		team_conferences: Reviewed official team conference mappings.
		eligibility_overrides: Documented roster-source presentation corrections.

	Returns:
		One game-facing player record without performance data.
	"""
	player_id = candidate["playerId"]
	roster = candidate["roster"]
	profile = candidate["profile"]
	team_code = require_string(roster, "TEAM_ABBREVIATION", f"player {player_id} roster").upper()
	if player_id in eligibility_overrides:
		override = eligibility_overrides[player_id]
		if candidate["rosterSourceUrl"] != override["rosterSourceUrl"]:
			raise ValueError(f"Eligibility override for {player_id} cites a different roster source")
		team_code = override["teamCode"]
	if team_code not in team_conferences:
		raise ValueError(
			f"Unknown team code {team_code} for player {player_id}; add it to {TEAM_CONFERENCES_PATH}"
		)
	raw_country = require_string(profile, "COUNTRY", f"player {player_id} profile")
	if raw_country not in country_overrides:
		raise ValueError(
			f"Unknown raw country {raw_country!r} for player {player_id}; add its ISO English name to "
			f"{COUNTRY_OVERRIDES_PATH}"
		)
	primary, alternates = normalize_position(
		require_string(profile, "POSITION", f"player {player_id} profile"),
		f"player {player_id} profile",
	)
	player = {
		"playerId": player_id,
		"displayName": require_string(profile, "DISPLAY_FIRST_LAST", f"player {player_id} profile"),
		"searchName": normalize_search_name(
			require_string(profile, "DISPLAY_FIRST_LAST", f"player {player_id} profile")
		),
		"teamCode": team_code,
		"conference": team_conferences[team_code],
		"heightInches": normalize_height(
			require_string(profile, "HEIGHT", f"player {player_id} profile"),
			f"player {player_id} profile",
		),
		"birthDateUtc": normalize_birth_date(
			require_string(profile, "BIRTHDATE", f"player {player_id} profile"),
			f"player {player_id} profile",
		),
		"draft": normalize_draft(profile, f"player {player_id} profile"),
		"country": country_overrides[raw_country],
		"college": normalize_college(require_string(profile, "SCHOOL", f"player {player_id} profile")),
		"positionPrimary": primary,
		"positionAlternates": alternates,
	}
	return player


#============================================

def select_players(candidates: list[dict], cutoff: int) -> tuple[list[dict], dict]:
	"""Apply the approved two-season recognizability cutoff to current candidates.

	Args:
		candidates: Complete current-roster candidate records.
		cutoff: Approved fantasy-point threshold.

	Returns:
		Selected candidates and a private selection summary.
	"""
	current_only = []
	selected = []
	for candidate in candidates:
		current_points = require_number(
			candidate, "fantasyPointsCurrentSeason", f"player {candidate['playerId']}"
		)
		previous_points = require_number(
			candidate, "fantasyPointsPreviousSeason", f"player {candidate['playerId']}"
		)
		if current_points >= cutoff:
			current_only.append(candidate)
		if max(current_points, previous_points) >= cutoff:
			selected.append(candidate)
	current_ids = {candidate["playerId"] for candidate in current_only}
	preceding_addition_ids = [
		candidate["playerId"] for candidate in selected if candidate["playerId"] not in current_ids
	]
	summary = {
		"cutoff": cutoff,
		"currentOnlyPoolSize": len(current_only),
		"twoSeasonPoolSize": len(selected),
		"precedingSeasonAdditionIds": sorted(preceding_addition_ids, key=int),
	}
	return selected, summary


#============================================

def source_note_for(source_kind: str) -> str:
	"""Describe the source accurately without exposing private performance data."""
	if source_kind == "official-wnba-stats":
		return (
			"Official WNBA Stats current-roster snapshot selected offline using the approved "
			"two-season WNBA_FANTASY_PTS cutoff."
		)
	if source_kind == "basketball-reference-html":
		return (
			"Server-rendered Basketball-Reference WNBA roster, totals, and player-profile HTML "
			"snapshot selected offline using the documented two-season WNBA fantasy total formula."
		)
	raise ValueError(f"Unsupported candidate source kind {source_kind!r}")


#============================================

def snapshot_provenance_for(source_kind: str) -> tuple[str, str]:
	"""Map a validated candidate source to its public provenance labels.

	Args:
		source_kind: The validated private candidate source kind.

	Returns:
		The matching public data and selection-rule kinds.
	"""
	if source_kind == "official-wnba-stats":
		return "official", "official"
	if source_kind == "basketball-reference-html":
		return "derived", "derived"
	raise ValueError(f"Unsupported candidate source kind {source_kind!r}")


#============================================

def build_snapshot(candidate_file: dict, cutoff: int) -> tuple[dict, dict]:
	"""Build one verified snapshot and its private selection summary.

	Args:
		candidate_file: Complete validated private candidate envelope.
		cutoff: Approved fantasy-point threshold.

	Returns:
		The game-facing snapshot and the private selection summary.
	"""
	country_overrides = load_country_overrides()
	team_conferences = load_team_conferences()
	eligibility_overrides = load_eligibility_overrides()
	candidates = []
	seen_ids = set()
	for index, candidate_value in enumerate(candidate_file["candidates"]):
		candidate = validate_candidate(
			candidate_value,
			index,
			candidate_file["source"]["kind"],
			int(candidate_file["source"]["seasons"]["current"]),
		)
		player_id = candidate["playerId"]
		if player_id in seen_ids:
			raise ValueError(f"candidate file repeats current-roster player {player_id}")
		seen_ids.add(player_id)
		candidates.append(candidate)
	unused_override_ids = sorted(set(eligibility_overrides) - seen_ids, key=int)
	if unused_override_ids:
		raise ValueError(f"Eligibility overrides do not match current candidates: {unused_override_ids}")
	selected_candidates, selection_summary = select_players(candidates, cutoff)
	if not selected_candidates:
		raise ValueError(f"No current-roster players meet the {cutoff} fantasy-point cutoff")
	players = [
		build_player(candidate, country_overrides, team_conferences, eligibility_overrides)
		for candidate in selected_candidates
	]
	players.sort(key=lambda player: int(player["playerId"]))
	source_kind = candidate_file["source"]["kind"]
	data_kind, selection_rule_kind = snapshot_provenance_for(source_kind)
	snapshot = {
		"schemaVersion": 1,
		"asOfDateUtc": candidate_file["asOfDateUtc"],
		"dataKind": data_kind,
		"dataStatus": "verified",
		"sourceNote": source_note_for(source_kind),
		"selectionRule": {
			"kind": selection_rule_kind,
			"eligibilityGate": "current-roster",
			"recognizabilityMetric": "WNBA_FANTASY_PTS",
			"seasons": [
				candidate_file["source"]["seasons"]["current"],
				candidate_file["source"]["seasons"]["previous"],
			],
			"cutoff": cutoff,
			"selectedPoolSize": len(players),
		},
		"players": players,
	}
	validate_snapshot(snapshot)
	return snapshot, selection_summary


#============================================

def validate_snapshot(snapshot: dict) -> None:
	"""Verify the generated value remains inside the public snapshot allowlist.

	Args:
		snapshot: Generated game-facing snapshot.
	"""
	require_exact_keys(
		snapshot,
		{
			"schemaVersion", "asOfDateUtc", "dataKind", "dataStatus", "sourceNote",
			"selectionRule", "players",
		},
		"generated snapshot",
	)
	if snapshot["dataKind"] not in {"derived", "official"} or snapshot["dataStatus"] != "verified":
		raise ValueError("generated snapshot must be derived or official and verified")
	selection_rule = require_mapping(snapshot["selectionRule"], "generated snapshot.selectionRule")
	require_exact_keys(
		selection_rule,
		{
			"kind", "eligibilityGate", "recognizabilityMetric", "seasons", "cutoff",
			"selectedPoolSize",
		},
		"generated snapshot.selectionRule",
	)
	if selection_rule["kind"] != snapshot["dataKind"]:
		raise ValueError("generated snapshot selection rule kind must match data kind")
	selected_players = require_list(snapshot["players"], "generated players")
	if selection_rule["selectedPoolSize"] != len(selected_players):
		raise ValueError("generated snapshot selectedPoolSize does not equal player count")
	for index, player_value in enumerate(snapshot["players"]):
		player = require_mapping(player_value, f"generated player {index}")
		require_exact_keys(
			player,
			{
				"playerId", "displayName", "searchName", "teamCode", "conference", "heightInches",
				"birthDateUtc", "draft", "country", "college", "positionPrimary", "positionAlternates",
			},
			f"generated player {index}",
		)
		draft = require_mapping(player["draft"], f"generated player {index}.draft")
		if draft["kind"] == "drafted":
			require_exact_keys(draft, {"kind", "year", "overallPick"}, f"generated player {index}.draft")
		elif draft["kind"] == "undrafted":
			require_exact_keys(draft, {"kind"}, f"generated player {index}.draft")
		else:
			raise ValueError(f"generated player {index}.draft has invalid kind")


#============================================

def write_json(path: pathlib.Path, payload: dict) -> None:
	"""Atomically write readable ASCII-safe snapshot JSON.

	Args:
		path: Destination snapshot file.
		payload: Game-facing snapshot.
	"""
	path.parent.mkdir(parents=True, exist_ok=True)
	temporary_path = path.with_suffix(path.suffix + ".tmp")
	with temporary_path.open("w", encoding="utf-8") as output_file:
		json.dump(payload, output_file, indent=2, ensure_ascii=True)
		output_file.write("\n")
	temporary_path.replace(path)


#============================================

def main() -> None:
	"""Transform one private candidate file into an official roster snapshot."""
	args = parse_args()
	candidate_file = validate_candidate_envelope(load_json(args.input))
	snapshot, selection_summary = build_snapshot(candidate_file, args.cutoff)
	write_json(args.output, snapshot)
	addition_text = ", ".join(selection_summary["precedingSeasonAdditionIds"])
	if not addition_text:
		addition_text = "none"
	print(f"Wrote {selection_summary['twoSeasonPoolSize']} players to {args.output}")
	print(f"Current-season-only pool: {selection_summary['currentOnlyPoolSize']}")
	print(
		f"Two-season union at {selection_summary['cutoff']}: "
		f"{selection_summary['twoSeasonPoolSize']}"
	)
	print(f"Preceding-season additions: {addition_text}")


#============================================

if __name__ == "__main__":
	main()

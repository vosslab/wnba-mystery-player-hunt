"""Harvest private WNBA candidate data from server-rendered HTML pages."""

# Standard Library
import argparse
import datetime
import hashlib
import http.client
import json
import pathlib
import random
import re
import time
import urllib.parse
import urllib.request

# local repo modules
import data_fetcher.wnba_basketball_reference
import data_fetcher.wnba_candidates


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = pathlib.Path("data/private/wnba_candidates.json")
CHECKPOINT_INTERVAL = 5
CHECKPOINT_SCHEMA_VERSION = 1
PROFILE_CACHE_FILE = "wnba_player_profiles.json"
PROFILE_CACHE_SCHEMA_VERSION = 1
PROFILE_CACHE_MAX_AGE_SECONDS = 14 * 24 * 3600
TIMEOUT_SECONDS = 30
BREF_HOST = "www.basketball-reference.com"
BREF_ROOT = f"https://{BREF_HOST}"
HTML_ACCEPT_HEADER = "text/html,application/xhtml+xml"
EXPECTED_HTML_MEDIA_TYPES = {"text/html", "application/xhtml+xml"}
USER_AGENT = (
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
	"AppleWebKit/537.36 (KHTML, like Gecko) "
	"Chrome/138.0.0.0 Safari/537.36"
)
TEAM_CODE_NORMALIZATIONS = {"PHO": "PHX"}


#============================================

def positive_integer(value: str) -> int:
	"""Require a positive integer for the optional player limit.

	Args:
		value: Raw command-line value.

	Returns:
		The validated positive integer.
	"""
	integer = int(value)
	if integer < 1:
		raise argparse.ArgumentTypeError("must be at least 1")
	return integer


#============================================

def parse_args() -> argparse.Namespace:
	"""Parse root harvester command-line options.

	Returns:
		The selected current season, player limit, and private output path.
	"""
	current_year = datetime.datetime.now(datetime.timezone.utc).year
	parser = argparse.ArgumentParser(
		description="Harvest WNBA candidates from server-rendered HTML without APIs."
	)
	parser.add_argument("-s", "--season", type=int, default=current_year,
		help="Current WNBA season; the preceding season is included automatically.")
	parser.add_argument("-o", "--output", type=pathlib.Path,
		help=("Ignored private candidate JSON output. --max chooses a separate "
			"test-limit path unless this option is supplied."))
	parser.add_argument("-m", "--max", dest="max_players", type=positive_integer,
		help="Limit current roster candidates for a short pipeline test.")
	args = parser.parse_args()
	return args


#============================================

def output_path_for_run(explicit_output: pathlib.Path | None,
		max_players: int | None) -> pathlib.Path:
	"""Select a safe private output path for a full or limited harvest."""
	if explicit_output is not None:
		return explicit_output
	if max_players is not None:
		return DEFAULT_OUTPUT.parent / f"wnba_candidates_test_limit_{max_players}.json"
	return DEFAULT_OUTPUT


#============================================

def checkpoint_path_for_output(output_path: pathlib.Path) -> pathlib.Path:
	"""Place a resumable harvest checkpoint beside its private output file."""
	checkpoint_path = output_path.with_suffix(".checkpoint.json")
	return checkpoint_path


#============================================

def profile_cache_path_for_output(output_path: pathlib.Path) -> pathlib.Path:
	"""Place the shared stable-profile cache beside private candidate outputs."""
	cache_path = output_path.parent / PROFILE_CACHE_FILE
	return cache_path


#============================================

def validate_page_url(url: str) -> None:
	"""Reject every non-HTML, non-WNBA Basketball-Reference request.

	Args:
		url: Proposed request or referer URL.
	"""
	parsed = urllib.parse.urlsplit(url)
	if parsed.scheme != "https" or parsed.hostname != BREF_HOST:
		raise ValueError(f"HTML source must be https://{BREF_HOST}/: {url}")
	if parsed.username is not None or parsed.password is not None or parsed.port is not None:
		raise ValueError(f"HTML source must not contain credentials or a port: {url}")
	path = parsed.path
	path_lower = path.casefold()
	if parsed.query or parsed.fragment:
		raise ValueError(f"HTML source must not contain a query or fragment: {url}")
	if path_lower.endswith((".json", ".xml")) or "/stats" in path_lower:
		raise ValueError(f"JSON, XML, and API source routes are forbidden: {url}")
	if not path.startswith("/wnba/") or not path_lower.endswith(".html"):
		raise ValueError(f"HTML source must be a Basketball-Reference WNBA page: {url}")


#============================================

class ValidatedRedirectHandler(urllib.request.HTTPRedirectHandler):
	"""Validate every redirect destination before urllib requests it."""

	def redirect_request(self, request: urllib.request.Request, file_pointer: object,
			code: int, message: str, headers: object, new_url: str) -> urllib.request.Request | None:
		"""Build one redirect request only after its resolved target passes the gate."""
		resolved_url = urllib.parse.urljoin(request.full_url, new_url)
		validate_page_url(resolved_url)
		redirected_request = super().redirect_request(
			request, file_pointer, code, message, headers, resolved_url
		)
		if redirected_request is not None:
			validate_page_url(redirected_request.full_url)
		return redirected_request


#============================================

def get_page(url: str, referer: str) -> str:
	"""Download one validated server-rendered WNBA HTML page.

	This is the harvester's only network boundary. It deliberately uses GET only;
	there is no API, JSON, XML, POST, browser, or JavaScript-rendering fallback.

	Args:
		url: Allowed WNBA Basketball-Reference HTML page URL.
		referer: Allowed WNBA Basketball-Reference HTML referer.

	Returns:
		The UTF-8 document text.
	"""
	validate_page_url(url)
	validate_page_url(referer)
	headers = {"Accept": HTML_ACCEPT_HEADER, "Referer": referer, "User-Agent": USER_AGENT}
	# Sports Reference asks non-FBref automated clients to stay below 20 requests/minute.
	time.sleep(3.0 + random.random())  # nosec B311 - polite pacing is not a security use.
	request = urllib.request.Request(url, headers=headers, method="GET")
	# Default urllib redirects follow a target before callers can inspect it. This
	# handler validates every resolved hop before the opener sends the next GET.
	opener = urllib.request.build_opener(ValidatedRedirectHandler())
	with opener.open(  # nosec B310 - request and every redirect URL are validated.
		request, timeout=TIMEOUT_SECONDS
	) as response:
		final_url = response.geturl()
		validate_page_url(final_url)
		content_type = response.headers.get_content_type().lower()
		if content_type not in EXPECTED_HTML_MEDIA_TYPES:
			raise ValueError(f"Expected HTML from {final_url}, received {content_type}")
		body = response.read()
	text = body.decode("utf-8")
	return text


#============================================

def season_totals_url(season: str) -> str:
	"""Build the server-rendered WNBA season totals page URL."""
	url = f"{BREF_ROOT}/wnba/years/{season}_totals.html"
	return url


#============================================

def absolute_bref_url(relative_url: str) -> str:
	"""Resolve one parser-provided Basketball-Reference WNBA path."""
	url = urllib.parse.urljoin(BREF_ROOT, relative_url)
	validate_page_url(url)
	return url


#============================================

def stable_decimal_id(namespace: str, source_key: str) -> str:
	"""Derive a reproducible decimal identifier from stable source text."""
	digest = hashlib.sha256(f"{namespace}:{source_key}".encode("ascii")).digest()
	identifier = 8_000_000_000_000_000 + int.from_bytes(digest[:8], "big") % 1_000_000_000_000_000
	return str(identifier)


#============================================

def normalized_team_code(code: str) -> str:
	"""Convert Basketball-Reference historical code spellings to game tricodes."""
	upper_code = code.upper()
	return TEAM_CODE_NORMALIZATIONS.get(upper_code, upper_code)


#============================================

def require_cell(row: dict[str, dict[str, str]], key: str, context: str) -> dict[str, str]:
	"""Require one parsed Basketball-Reference cell."""
	if key not in row:
		raise ValueError(f"{context} has no {key} cell")
	cell = row[key]
	return cell


#============================================

def player_slug_from_url(player_url: str) -> str:
	"""Extract the immutable player slug from a parsed player-page URL."""
	parsed = urllib.parse.urlsplit(player_url)
	name = pathlib.PurePosixPath(parsed.path).name
	if not name.endswith(".html"):
		raise ValueError(f"Player source path has no HTML filename: {player_url}")
	slug = name.removesuffix(".html")
	if not slug or not slug.isascii() or not slug.replace("_", "").isalnum():
		raise ValueError(f"Player source path has invalid slug: {player_url}")
	return slug


#============================================

def fantasy_by_player(totals_html: str) -> dict[str, float]:
	"""Index a season's derived WNBA fantasy points by BRef player slug."""
	rows = data_fetcher.wnba_basketball_reference.parse_table(totals_html, "totals")
	values_by_slug: dict[str, list[tuple[str, float]]] = {}
	for row in rows:
		player_cell = require_cell(row, "player", "season totals row")
		if "href" not in player_cell:
			raise ValueError("Season totals player cell has no player-page link")
		slug = player_slug_from_url(player_cell["href"])
		points_value = data_fetcher.wnba_basketball_reference.wnba_fantasy_total(row)
		team_text = require_cell(row, "team", "season totals row")["text"].upper()
		values_by_slug.setdefault(slug, []).append((team_text, points_value))
	points = {}
	for slug, values in values_by_slug.items():
		if len(values) == 1:
			points[slug] = values[0][1]
			continue
		aggregates = [value for team, value in values if team == "TOT" or re.fullmatch(r"[0-9]+TM", team)]
		if len(aggregates) == 1:
			points[slug] = aggregates[0]
		elif len(set(value for _team, value in values)) == 1:
			points[slug] = values[0][1]
		else:
			raise ValueError(f"Season totals has no unambiguous aggregate for player {slug}")
	return points


#============================================

def roster_entries(team_html: str, team_code: str, team_id: str) -> list[dict[str, str]]:
	"""Extract current membership rows from a server-rendered roster table."""
	rows = data_fetcher.wnba_basketball_reference.parse_table(team_html, "roster")
	entries = []
	for row in rows:
		player_cell = require_cell(row, "player", f"{team_code} roster row")
		if "href" not in player_cell:
			raise ValueError(f"{team_code} roster player has no player-page link")
		player_url = absolute_bref_url(player_cell["href"])
		entry = {
			"teamId": team_id,
			"teamCode": team_code,
			"name": player_cell["text"],
			"playerUrl": player_url,
			"slug": player_slug_from_url(player_url),
			"number": require_cell(row, "number", f"{team_code} roster row")["text"],
			"position": require_cell(row, "pos", f"{team_code} roster row")["text"],
			"height": require_cell(row, "height", f"{team_code} roster row")["text"],
			"weight": require_cell(row, "weight", f"{team_code} roster row")["text"],
			"experience": require_cell(row, "exp", f"{team_code} roster row")["text"],
			"college": require_cell(row, "college", f"{team_code} roster row")["text"],
		}
		entries.append(entry)
	if not entries:
		raise ValueError(f"{team_code} roster contained no players")
	return entries


#============================================

def profile_position(position: str) -> str:
	"""Normalize verbose Basketball-Reference positions for the existing snapshot builder."""
	parts = []
	for part in re.split(r"\s*(?:-|/|,|\band\b)\s*", position, flags=re.IGNORECASE):
		if not part:
			continue
		code = part.casefold()
		if code in {"g", "guard"}:
			parts.append("G")
		elif code in {"f", "forward"}:
			parts.append("F")
		elif code in {"c", "center"}:
			parts.append("C")
		else:
			raise ValueError(f"Unsupported Basketball-Reference position: {position}")
	normalized = "-".join(parts)
	return normalized


#============================================

def entrant_from_experience(experience: str, current_season: str) -> int:
	"""Use roster experience only to describe a source profile's first season."""
	if experience.casefold() == "r":
		return int(current_season)
	if not experience.isdecimal():
		raise ValueError(f"Roster experience is not numeric or R: {experience}")
	from_year = int(current_season) - int(experience)
	return from_year


#============================================

def candidate_from_metadata(entry: dict[str, str], metadata: dict[str, object],
		current_season: str, current_points: dict[str, float],
		previous_points: dict[str, float]) -> dict:
	"""Join current membership and totals with parsed biography metadata."""
	slug = entry["slug"]
	player_id = stable_decimal_id("player", slug)
	draft = metadata["draft"]
	if not isinstance(draft, dict):
		raise ValueError(f"Player {slug} has invalid draft metadata")
	if draft["status"] == "drafted":
		draft_year = str(draft["year"])
		draft_round = str(draft["round"])
		draft_number = str(draft["overall"])
	elif draft["status"] in {"undrafted", "expansion"}:
		# An expansion selection is not evidence of an original WNBA entry-draft pick.
		draft_year = "Undrafted"
		draft_round = "Undrafted"
		draft_number = "Undrafted"
	else:
		raise ValueError(f"Player {slug} has unsupported draft status {draft['status']}")
	from_year = entrant_from_experience(entry["experience"], current_season)
	birth_date = str(metadata["birthDate"])
	college = str(metadata["college"]) or entry["college"] or "None"
	position = profile_position(str(metadata["position"]))
	roster = {
		"TEAM_ID": entry["teamId"], "TEAM_ABBREVIATION": entry["teamCode"],
		"PLAYER_ID": player_id, "PLAYER": entry["name"], "NUM": entry["number"],
		"POSITION": position, "HEIGHT": entry["height"], "WEIGHT": entry["weight"],
		"BIRTH_DATE": birth_date, "AGE": 0, "EXP": entry["experience"],
		"SCHOOL": college, "PLAYER_SLUG": slug,
	}
	profile = {
		"PERSON_ID": player_id, "DISPLAY_FIRST_LAST": entry["name"],
		"BIRTHDATE": birth_date + "T00:00:00", "SCHOOL": college,
		"COUNTRY": str(metadata["country"]), "HEIGHT": str(metadata["height"]),
		"POSITION": position, "ROSTERSTATUS": "Active", "TEAM_ID": entry["teamId"],
		"TEAM_ABBREVIATION": entry["teamCode"], "DRAFT_YEAR": draft_year,
		"DRAFT_ROUND": draft_round, "DRAFT_NUMBER": draft_number, "FROM_YEAR": from_year,
	}
	candidate = {
		"playerId": player_id, "rosterSourceUrl": entry["rosterUrl"],
		"playerPageSourceUrl": entry["playerUrl"], "roster": roster, "profile": profile,
		"fantasyPointsCurrentSeason": current_points.get(slug, 0.0),
		# A current veteran can legitimately be absent after taking the prior season off.
		"fantasyPointsPreviousSeason": previous_points.get(slug, 0.0),
	}
	return candidate


#============================================

def candidate_from_entry(entry: dict[str, str], profile_html: str, current_season: str,
		current_points: dict[str, float], previous_points: dict[str, float]) -> dict:
	"""Parse one player profile and join it to current membership and totals."""
	metadata = data_fetcher.wnba_basketball_reference.parse_player_profile_metadata(profile_html)
	candidate = candidate_from_metadata(
		entry, metadata, current_season, current_points, previous_points
	)
	return candidate


#============================================

def recognizability_score(entry: dict[str, str], current_points: dict[str, float],
		previous_points: dict[str, float]) -> float:
	"""Return the two-season score used to order a limited harmless test run."""
	slug = entry["slug"]
	score = max(current_points.get(slug, 0.0), previous_points.get(slug, 0.0))
	return score


#============================================

def profile_metadata_from_candidate(candidate: dict, context: str) -> dict[str, object]:
	"""Recover stable biography metadata from a completed candidate checkpoint."""
	profile = candidate["profile"]
	if not isinstance(profile, dict):
		raise ValueError(f"{context}.profile must be an object")
	draft_year = str(profile["DRAFT_YEAR"])
	draft_round = str(profile["DRAFT_ROUND"])
	draft_number = str(profile["DRAFT_NUMBER"])
	undrafted_values = {draft_year.casefold(), draft_round.casefold(), draft_number.casefold()}
	if undrafted_values == {"undrafted"}:
		draft = {"status": "undrafted", "year": None, "round": None, "overall": None}
	elif draft_year.isdecimal() and draft_round.isdecimal() and draft_number.isdecimal():
		draft = {
			"status": "drafted", "year": int(draft_year),
			"round": int(draft_round), "overall": int(draft_number),
		}
	else:
		raise ValueError(f"{context} has invalid draft fields")
	metadata = {
		"birthDate": str(profile["BIRTHDATE"]).split("T", maxsplit=1)[0],
		"country": str(profile["COUNTRY"]), "position": str(profile["POSITION"]),
		"height": str(profile["HEIGHT"]), "college": str(profile["SCHOOL"]),
		"draft": draft,
	}
	return metadata


#============================================

def validate_profile_cache_entry(slug: str, value: object, context: str) -> dict:
	"""Validate one timestamped stable-profile cache entry."""
	if not isinstance(value, dict):
		raise ValueError(f"{context} must be an object")
	player_url = value["playerPageSourceUrl"]
	if not isinstance(player_url, str) or player_slug_from_url(player_url) != slug:
		raise ValueError(f"{context} URL must identify player {slug}")
	fetched_time = value["time"]
	if isinstance(fetched_time, bool) or not isinstance(fetched_time, int):
		raise ValueError(f"{context}.time must be an integer Unix timestamp")
	metadata = value["metadata"]
	if not isinstance(metadata, dict):
		raise ValueError(f"{context}.metadata must be an object")
	required_fields = {"birthDate", "country", "position", "height", "college", "draft"}
	if set(metadata) != required_fields or not isinstance(metadata["draft"], dict):
		raise ValueError(f"{context}.metadata fields do not match the cache schema")
	return value


#============================================

def load_profile_cache(path: pathlib.Path) -> dict[str, dict]:
	"""Load and validate the persistent player-profile cache."""
	if not path.exists():
		return {}
	with path.open("r", encoding="utf-8") as input_file:
		payload = json.load(input_file)
	if not isinstance(payload, dict):
		raise ValueError(f"Player profile cache must contain an object: {path}")
	if payload["schemaVersion"] != PROFILE_CACHE_SCHEMA_VERSION:
		raise ValueError(f"Unsupported player profile cache schema: {path}")
	profiles = payload["profiles"]
	if not isinstance(profiles, dict):
		raise ValueError(f"Player profile cache profiles must be an object: {path}")
	validated_profiles = {}
	for slug, value in profiles.items():
		if not isinstance(slug, str):
			raise ValueError(f"Player profile cache key must be text: {path}")
		validated_profiles[slug] = validate_profile_cache_entry(
			slug, value, f"player profile cache {slug}"
		)
	return validated_profiles


#============================================

def write_profile_cache(path: pathlib.Path, profiles: dict[str, dict]) -> None:
	"""Atomically persist timestamped stable player biographies."""
	payload = {"schemaVersion": PROFILE_CACHE_SCHEMA_VERSION, "profiles": profiles}
	data_fetcher.wnba_candidates.write_json(path, payload)


#============================================

def candidate_file_profile_cache(path: pathlib.Path) -> dict[str, dict]:
	"""Convert an existing candidate or checkpoint file into profile cache entries."""
	if not path.exists():
		return {}
	with path.open("r", encoding="utf-8") as input_file:
		payload = json.load(input_file)
	if not isinstance(payload, dict) or payload["schemaVersion"] != CHECKPOINT_SCHEMA_VERSION:
		raise ValueError(f"Unsupported candidate seed schema: {path}")
	candidates = payload["candidates"]
	if not isinstance(candidates, list):
		raise ValueError(f"Candidate seed records must be a list: {path}")
	fetched_time = int(path.stat().st_mtime)
	profiles = {}
	for index, candidate in enumerate(candidates, start=1):
		if not isinstance(candidate, dict):
			raise ValueError(f"Candidate seed record {index} must be an object")
		player_url = candidate["playerPageSourceUrl"]
		if not isinstance(player_url, str):
			raise ValueError(f"Candidate seed record {index} URL must be text")
		slug = player_slug_from_url(player_url)
		if slug in profiles:
			raise ValueError(f"Candidate seed repeats player {slug}")
		profiles[slug] = {
			"playerPageSourceUrl": player_url, "time": fetched_time,
			"metadata": profile_metadata_from_candidate(candidate, f"checkpoint player {slug}"),
		}
	return profiles


#============================================

def merge_candidate_profiles(profiles: dict[str, dict], path: pathlib.Path | None) -> int:
	"""Seed missing stable profiles from a previous candidate or checkpoint file."""
	if path is None:
		return 0
	seed_profiles = candidate_file_profile_cache(path)
	imported_count = 0
	for slug, value in seed_profiles.items():
		if slug not in profiles:
			profiles[slug] = value
			imported_count += 1
	return imported_count


#============================================

def profile_cache_entry_is_fresh(cache_entry: dict, player_url: str,
		current_time: int) -> bool:
	"""Return whether a cache entry matches the player and remains within its lifetime."""
	if cache_entry["playerPageSourceUrl"] != player_url:
		return False
	age_seconds = current_time - cache_entry["time"]
	is_fresh = 0 <= age_seconds <= PROFILE_CACHE_MAX_AGE_SECONDS
	return is_fresh


#============================================

def harvest_source_fingerprint(entries: list[dict[str, str]], current_season: str,
		current_points: dict[str, float], previous_points: dict[str, float]) -> str:
	"""Identify the ordered source inputs that one checkpoint belongs to."""
	source_state = {
		"currentSeason": current_season,
		"entries": entries,
		"currentPoints": current_points,
		"previousPoints": previous_points,
	}
	encoded_state = json.dumps(
		source_state, ensure_ascii=True, separators=(",", ":"), sort_keys=True
	).encode("ascii")
	fingerprint = hashlib.sha256(encoded_state).hexdigest()
	return fingerprint


#============================================

def write_harvest_checkpoint(path: pathlib.Path, source_fingerprint: str,
		candidates: list[dict]) -> None:
	"""Atomically save every successfully completed player in the current pull."""
	payload = {
		"schemaVersion": CHECKPOINT_SCHEMA_VERSION,
		"sourceFingerprint": source_fingerprint,
		"candidates": candidates,
	}
	data_fetcher.wnba_candidates.write_json(path, payload)


#============================================

def load_harvest_checkpoint(path: pathlib.Path, source_fingerprint: str,
		entries: list[dict[str, str]]) -> list[dict]:
	"""Load successful players only when the current source pull still matches."""
	if not path.exists():
		return []
	with path.open("r", encoding="utf-8") as input_file:
		payload = json.load(input_file)
	if not isinstance(payload, dict):
		raise ValueError(f"Harvest checkpoint must contain an object: {path}")
	if payload["schemaVersion"] != CHECKPOINT_SCHEMA_VERSION:
		raise ValueError(f"Unsupported harvest checkpoint schema: {path}")
	if payload["sourceFingerprint"] != source_fingerprint:
		print(f"Source pages changed; starting a new checkpoint at {path}.", flush=True)
		return []
	candidates = payload["candidates"]
	if not isinstance(candidates, list) or len(candidates) > len(entries):
		raise ValueError(f"Harvest checkpoint has invalid candidates: {path}")
	entries_by_url = {entry["playerUrl"]: entry for entry in entries}
	seen_ids = set()
	seen_urls = set()
	for index, candidate in enumerate(candidates, start=1):
		if not isinstance(candidate, dict):
			raise ValueError(f"Harvest checkpoint candidate {index} must be an object")
		player_url = candidate["playerPageSourceUrl"]
		if player_url not in entries_by_url:
			raise ValueError(f"Harvest checkpoint candidate {index} is not on the roster")
		entry = entries_by_url[player_url]
		if candidate["rosterSourceUrl"] != entry["rosterUrl"]:
			raise ValueError(f"Harvest checkpoint candidate {index} changed teams")
		player_id = candidate["playerId"]
		if player_id in seen_ids or player_url in seen_urls:
			raise ValueError(f"Harvest checkpoint repeats candidate {index}")
		seen_ids.add(player_id)
		seen_urls.add(player_url)
	return candidates


#============================================

def fetch_player_candidate(entry: dict[str, str], current_season: str,
		current_points: dict[str, float], previous_points: dict[str, float]) -> dict:
	"""Fetch and transform one player so the caller can isolate source failures."""
	profile_html = get_page(entry["playerUrl"], entry["rosterUrl"])
	candidate = candidate_from_entry(
		entry, profile_html, current_season, current_points, previous_points
	)
	return candidate


#============================================

def fetch_player_metadata(entry: dict[str, str]) -> dict[str, object]:
	"""Fetch and parse only the stable biography fields for one player."""
	profile_html = get_page(entry["playerUrl"], entry["rosterUrl"])
	metadata = data_fetcher.wnba_basketball_reference.parse_player_profile_metadata(profile_html)
	return metadata


#============================================

def harvest_player_candidates(entries: list[dict[str, str]], current_season: str,
		current_points: dict[str, float], previous_points: dict[str, float],
		checkpoint_path: pathlib.Path | None = None,
		profile_cache_path: pathlib.Path | None = None,
		candidate_seed_path: pathlib.Path | None = None) -> tuple[list[dict], list[dict[str, str]]]:
	"""Fetch profiles, retaining successes and retrying failed players on a rerun."""
	source_fingerprint = harvest_source_fingerprint(
		entries, current_season, current_points, previous_points
	)
	current_time = int(time.time())
	profile_cache = {}
	if profile_cache_path is not None:
		profile_cache = load_profile_cache(profile_cache_path)
		imported_count = merge_candidate_profiles(profile_cache, candidate_seed_path)
		imported_count += merge_candidate_profiles(profile_cache, checkpoint_path)
		if imported_count:
			write_profile_cache(profile_cache_path, profile_cache)
			print(f"Imported {imported_count} player profiles from existing candidate data.",
				flush=True)
		print(f"Loaded {len(profile_cache)} cached player profiles from "
			f"{profile_cache_path}.", flush=True)
	cached_candidates = []
	if checkpoint_path is not None and profile_cache_path is None:
		cached_candidates = load_harvest_checkpoint(
			checkpoint_path, source_fingerprint, entries
		)
		if cached_candidates:
			print(f"Resuming from {checkpoint_path} with "
				f"{len(cached_candidates)} players.", flush=True)
		else:
			write_harvest_checkpoint(checkpoint_path, source_fingerprint, [])
	cached_by_url = {
		candidate["playerPageSourceUrl"]: candidate for candidate in cached_candidates
	}
	candidates = []
	failed_entries = []
	seen_ids = set()
	new_since_checkpoint = 0
	cache_updates_since_write = 0
	profile_cache_hits = 0
	stale_fallbacks = 0
	for index, entry in enumerate(entries, start=1):
		player_url = entry["playerUrl"]
		candidate = cached_by_url.get(player_url)
		if candidate is None and profile_cache_path is None:
			print(f"Pulling Basketball-Reference player page {index} of {len(entries)} "
				f"({entry['name']}); found {len(candidates)} players...", flush=True)
			try:
				candidate = fetch_player_candidate(
					entry, current_season, current_points, previous_points
				)
			except (http.client.HTTPException, OSError, UnicodeError, ValueError) as error:
				failed_entries.append(entry)
				print(f"WARNING: Skipping {entry['name']} ({entry['slug']}): "
					f"{type(error).__name__}: {error}", flush=True)
				continue
			new_since_checkpoint += 1
		elif candidate is None:
			cache_entry = profile_cache.get(entry["slug"])
			cache_is_fresh = cache_entry is not None and profile_cache_entry_is_fresh(
				cache_entry, player_url, current_time
			)
			if cache_is_fresh:
				metadata = cache_entry["metadata"]
				profile_cache_hits += 1
			else:
				print(f"Pulling Basketball-Reference player page {index} of {len(entries)} "
					f"({entry['name']}); found {len(candidates)} players...", flush=True)
				try:
					metadata = fetch_player_metadata(entry)
				except (http.client.HTTPException, OSError, UnicodeError, ValueError) as error:
					stale_cache_usable = (
						cache_entry is not None
						and cache_entry["playerPageSourceUrl"] == player_url
					)
					if stale_cache_usable:
						metadata = cache_entry["metadata"]
						stale_fallbacks += 1
						print(f"WARNING: Using stale profile for {entry['name']} "
							f"({entry['slug']}): {type(error).__name__}: {error}", flush=True)
					else:
						failed_entries.append(entry)
						print(f"WARNING: Skipping {entry['name']} ({entry['slug']}): "
							f"{type(error).__name__}: {error}", flush=True)
						continue
				else:
					profile_cache[entry["slug"]] = {
						"playerPageSourceUrl": player_url, "time": current_time,
						"metadata": metadata,
					}
					cache_updates_since_write += 1
					cache_write_due = cache_updates_since_write == CHECKPOINT_INTERVAL
					if profile_cache_path is not None and cache_write_due:
						write_profile_cache(profile_cache_path, profile_cache)
						print(f"Cached {len(profile_cache)} player profiles to "
							f"{profile_cache_path}.", flush=True)
						cache_updates_since_write = 0
			try:
				candidate = candidate_from_metadata(
					entry, metadata, current_season, current_points, previous_points
				)
			except ValueError as error:
				failed_entries.append(entry)
				print(f"WARNING: Skipping {entry['name']} ({entry['slug']}): "
					f"ValueError: {error}", flush=True)
				continue
			new_since_checkpoint += 1
		if candidate["playerId"] in seen_ids:
			raise ValueError(f"Stable identifier collision for player {entry['slug']}")
		seen_ids.add(candidate["playerId"])
		candidates.append(candidate)
		checkpoint_due = new_since_checkpoint == CHECKPOINT_INTERVAL
		if checkpoint_path is not None and checkpoint_due:
			write_harvest_checkpoint(checkpoint_path, source_fingerprint, candidates)
			print(f"Checkpointed {len(candidates)} players to {checkpoint_path}.", flush=True)
			new_since_checkpoint = 0
	if checkpoint_path is not None and (new_since_checkpoint or failed_entries):
		write_harvest_checkpoint(checkpoint_path, source_fingerprint, candidates)
		print(f"Checkpointed {len(candidates)} players to {checkpoint_path}.", flush=True)
	if profile_cache_path is not None and cache_updates_since_write:
		write_profile_cache(profile_cache_path, profile_cache)
	print(f"Used {profile_cache_hits} fresh cached profiles and "
		f"{stale_fallbacks} stale fallbacks.", flush=True)
	return candidates, failed_entries


#============================================

def harvest_candidates(current_season: str, max_players: int | None = None,
		checkpoint_path: pathlib.Path | None = None,
		profile_cache_path: pathlib.Path | None = None,
		candidate_seed_path: pathlib.Path | None = None) -> dict:
	"""Harvest the complete current roster through server-rendered HTML only."""
	previous_season = str(int(current_season) - 1)
	current_url = season_totals_url(current_season)
	previous_url = season_totals_url(previous_season)
	print(f"Pulling {current_season} Basketball-Reference WNBA totals HTML page...", flush=True)
	current_html = get_page(current_url, current_url)
	print(f"Pulling {previous_season} Basketball-Reference WNBA totals HTML page...", flush=True)
	previous_html = get_page(previous_url, current_url)
	current_points = fantasy_by_player(current_html)
	previous_points = fantasy_by_player(previous_html)
	team_links = data_fetcher.wnba_basketball_reference.parse_current_team_page_links(
		current_html, current_season
	)
	print(f"Found {len(team_links)} teams.", flush=True)
	entries = []
	team_ids = set()
	for index, bref_code in enumerate(sorted(team_links), start=1):
		team_code = normalized_team_code(bref_code)
		team_url = absolute_bref_url(team_links[bref_code])
		team_id = stable_decimal_id("team", team_code)
		if team_id in team_ids:
			raise ValueError(f"Stable identifier collision for team {team_code}")
		team_ids.add(team_id)
		print(f"Pulling Basketball-Reference roster page {index} of {len(team_links)} "
			f"({team_code})...", flush=True)
		team_entries = roster_entries(get_page(team_url, current_url), team_code, team_id)
		for entry in team_entries:
			entry["rosterUrl"] = team_url
		entries.extend(team_entries)
		print(f"Found {len(entries)} current roster players.", flush=True)
	seen_slugs = set()
	for entry in entries:
		if entry["slug"] in seen_slugs:
			raise ValueError(f"Current team rosters repeat player {entry['slug']}")
		seen_slugs.add(entry["slug"])
	entries.sort(key=lambda entry: (-recognizability_score(entry, current_points, previous_points),
		entry["slug"]))
	truncated = max_players is not None and len(entries) > max_players
	if max_players is not None:
		entries = entries[:max_players]
	candidates, failed_entries = harvest_player_candidates(
		entries, current_season, current_points, previous_points, checkpoint_path,
		profile_cache_path, candidate_seed_path
	)
	print(f"Found {len(candidates)} players.", flush=True)
	if failed_entries:
		print(f"WARNING: {len(failed_entries)} players were skipped; rerun to retry them.",
			flush=True)
	if not candidates:
		raise ValueError("Current WNBA rosters contained no players")
	if failed_entries:
		validation_scope = "incomplete"
	elif truncated:
		validation_scope = "test-limit"
	else:
		validation_scope = "complete"
	payload = {
		"schemaVersion": 1,
		"asOfDateUtc": datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
		"source": {
			"kind": "basketball-reference-html",
			"seasons": {"current": current_season, "previous": previous_season},
			"urls": {"teamListUrl": current_url,
				"traditionalStatsUrls": {current_season: current_url, previous_season: previous_url}},
		},
		"validation": {
			"scope": validation_scope, "teamCount": len(team_links),
			"rosterResponseCount": len(team_links),
			"currentTraditionalRowCount": len(current_points),
			"previousTraditionalRowCount": len(previous_points), "candidateCount": len(candidates),
		},
		"candidates": candidates,
	}
	return payload


#============================================

def main() -> None:
	"""Harvest and atomically write a private candidate file."""
	args = parse_args()
	current_season = str(args.season)
	selected_output = output_path_for_run(args.output, args.max_players)
	output_file = data_fetcher.wnba_candidates.validate_private_output_path(selected_output)
	checkpoint_file = checkpoint_path_for_output(output_file)
	profile_cache_file = profile_cache_path_for_output(output_file)
	candidates = harvest_candidates(
		current_season, max_players=args.max_players, checkpoint_path=checkpoint_file,
		profile_cache_path=profile_cache_file, candidate_seed_path=output_file
	)
	data_fetcher.wnba_candidates.write_json(output_file, candidates)
	if checkpoint_file.exists() and candidates["validation"]["scope"] != "incomplete":
		checkpoint_file.unlink()
	count = candidates["validation"]["candidateCount"]
	print(f"Saved {count} players to {output_file}", flush=True)


#============================================

if __name__ == "__main__":
	main()

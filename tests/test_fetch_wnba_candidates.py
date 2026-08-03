"""Behavioral tests for the Python-only WNBA candidate acquisition boundary."""

# Standard Library
import json
import pathlib
import urllib.request

# PIP3 modules
import pytest

# local repo modules
import data_fetcher.wnba_candidates as fetcher
import data_fetcher.wnba_harvester as wnba_harvester


#============================================

def stats_payload(result_name: str, headers: list[str], rows: list[list[object]]) -> dict:
	"""Build a small official-result-set-shaped test response.

	Args:
		result_name: Official result-set name expected by the fetcher.
		headers: Result-set header names.
		rows: Row values matching the headers.

	Returns:
		A minimal Stats JSON response.
	"""
	payload = {
		"resultSets": [{"name": result_name, "headers": headers, "rowSet": rows}],
	}
	return payload


#============================================

def current_roster_sources(from_year: int) -> dict:
	"""Build one complete current-player source bundle.

	Args:
		from_year: Official first WNBA season reported on the player page.

	Returns:
		Offline official-response-shaped inputs for candidate validation.
	"""
	roster_headers = [
		"TEAM_ID", "TEAM_ABBREVIATION", "PLAYER_ID", "PLAYER", "NUM", "POSITION",
		"HEIGHT", "WEIGHT", "BIRTH_DATE", "AGE", "EXP", "SCHOOL", "PLAYER_SLUG",
	]
	roster_row = [
		"1", "TST", "11", "Test Player", "1", "Guard", "6-0", "160",
		"2000-01-01", 26, 0, "Test University", "test-player",
	]
	profile = {
		"PERSON_ID": "11",
		"DISPLAY_FIRST_LAST": "Test Player",
		"BIRTHDATE": "2000-01-01T00:00:00",
		"SCHOOL": "Test University",
		"COUNTRY": "USA",
		"HEIGHT": "6-0",
		"POSITION": "Guard",
		"ROSTERSTATUS": "Active",
		"TEAM_ID": "1",
		"TEAM_ABBREVIATION": "TST",
		"DRAFT_YEAR": str(from_year),
		"DRAFT_ROUND": "1",
		"DRAFT_NUMBER": "1",
		"FROM_YEAR": from_year,
	}
	profile_html = f"<script>window.nbaStatsPlayerInfo = {json.dumps(profile)};</script>"
	sources = {
		"asOfDateUtc": "2026-08-02",
		"teamPayload": {"teams": [{"TEAM_ID": 1}]},
		"teamUrl": "https://stats.wnba.com/teams/",
		"rosters": [{
			"teamId": "1",
			"sourceUrl": "https://stats.wnba.com/stats/commonteamroster?TeamID=1",
			"payload": stats_payload("CommonTeamRoster", roster_headers, [roster_row]),
		}],
		"currentStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "WNBA_FANTASY_PTS"], [["11", 250]]
		),
		"currentStatsUrl": "https://stats.wnba.com/stats/leaguedashplayerstats?Season=2026",
		"previousStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "WNBA_FANTASY_PTS"], [["99", 250]]
		),
		"previousStatsUrl": "https://stats.wnba.com/stats/leaguedashplayerstats?Season=2025",
		"profiles": {"11": profile_html},
		"profileUrls": {"11": "https://stats.wnba.com/player/11/"},
	}
	return sources


#============================================

def test_complete_team_roster_response_is_required() -> None:
	"""Reject a supplied team response that is present but empty."""
	sources = {
	"teamPayload": {"teams": [{"TEAM_ID": 1}, {"TEAM_ID": 2}]},
	"rosters": [
		{
			"teamId": "2",
			"sourceUrl": "https://stats.wnba.com/stats/commonteamroster?TeamID=2",
			"payload": stats_payload("CommonTeamRoster", ["PLAYER_ID", "TEAM_ID"], []),
		},
		{
			"teamId": "1",
			"sourceUrl": "https://stats.wnba.com/stats/commonteamroster?TeamID=1",
			"payload": stats_payload("CommonTeamRoster", ["PLAYER_ID", "TEAM_ID"], [["11", "1"]]),
		},
		],
		"currentStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "WNBA_FANTASY_PTS"], [["11", 0]]
		),
		"previousStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "WNBA_FANTASY_PTS"], [["11", 0]]
		),
	}

	with pytest.raises(ValueError, match="no roster rows for team 2"):
		fetcher.build_candidates(sources)


#============================================

def test_manifest_exports_cannot_escape_manifest_directory(tmp_path: pathlib.Path) -> None:
	"""Keep saved official exports contained beside their manifest."""
	manifest = tmp_path / "manifest.json"
	manifest.write_text("{}", encoding="utf-8")

	with pytest.raises(ValueError, match="stay below"):
		fetcher.resolve_manifest_path(manifest, "../outside.json")


#============================================

def test_candidate_output_path_is_independent_of_working_directory(
	tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
	"""Resolve a relative private output from the repository root."""
	expected_output = fetcher.REPO_ROOT / "data/private/candidates.json"
	monkeypatch.chdir(tmp_path)

	output = fetcher.validate_private_output_path(
		pathlib.Path("data/private/candidates.json")
	)
	assert output == expected_output


#============================================

def test_candidate_output_rejects_a_public_data_path() -> None:
	"""Keep private acquisition fields out of the game-facing data path."""
	with pytest.raises(ValueError, match="stay under"):
		fetcher.validate_private_output_path(pathlib.Path("data/roster.json"))


#============================================

def test_explicit_zero_fantasy_points_are_preserved_but_missing_is_rejected() -> None:
	"""Distinguish an official zero total from an absent season record."""
	indexed = fetcher.index_fantasy_points([{"PLAYER_ID": "11", "WNBA_FANTASY_PTS": 0}], "2026")
	assert indexed["11"] == 0

	with pytest.raises(ValueError, match="missing required field WNBA_FANTASY_PTS"):
		fetcher.index_fantasy_points([{"PLAYER_ID": "11"}], "2026")


#============================================

def test_current_season_entrant_uses_zero_for_pre_league_season() -> None:
	"""Keep a current entrant whose official profile begins this season."""
	candidates = fetcher.build_candidates(current_roster_sources(from_year=2026))

	assert candidates["candidates"][0]["fantasyPointsPreviousSeason"] == 0
	assert candidates["validation"]["scope"] == "complete"


#============================================

def test_established_player_absent_from_previous_season_is_rejected() -> None:
	"""Reject an established roster player with an unexpected stats gap."""
	sources = current_roster_sources(from_year=2025)

	with pytest.raises(ValueError, match="Previous-season fantasy points missing player 11"):
		fetcher.build_candidates(sources)


#============================================

@pytest.mark.parametrize("url", [
	"http://stats.wnba.com/stats/commonteamroster?TeamID=1",
	"https://not-stats.wnba.com/stats/commonteamroster?TeamID=1",
])
def test_non_official_source_url_is_rejected(url: str) -> None:
	"""Accept only HTTPS URLs on the exact official Stats host."""
	with pytest.raises(ValueError, match="Official source"):
		fetcher.validate_official_url(url)


#============================================

@pytest.mark.parametrize("url", [
	"https://stats.wnba.com/player/1628932/",
	"https://www.basketball-reference.com/wnba/years/2026_totals.json",
	"https://www.basketball-reference.com/wnba/years/2026_totals.xml",
	"https://www.basketball-reference.com/stats/commonteamroster?TeamID=1",
])
def test_non_html_live_sources_are_hard_rejected(url: str) -> None:
	"""Block API, JSON, XML, and wrong-host requests before network access."""
	with pytest.raises(ValueError, match="must be|forbidden|query or fragment"):
		wnba_harvester.validate_page_url(url)


#============================================

@pytest.mark.parametrize("url", [
	"https://www.basketball-reference.com/wnba/years/2026_totals.html?format=html",
	"https://www.basketball-reference.com/wnba/years/2026_totals.html#totals",
])
def test_live_html_source_query_and_fragment_are_hard_rejected(url: str) -> None:
	"""Keep the live source gate to exact static HTML document URLs."""
	with pytest.raises(ValueError, match="query or fragment"):
		wnba_harvester.validate_page_url(url)


#============================================

@pytest.mark.parametrize("redirect_target", [
	"https://stats.wnba.com/stats/leaguedashplayerstats",
	"/wnba/years/2026_totals.json",
])
def test_redirect_target_is_validated_before_urllib_follows_it(
	redirect_target: str,
) -> None:
	"""Reject a forbidden redirect without opening any network connection."""
	request = urllib.request.Request(
		"https://www.basketball-reference.com/wnba/years/2026_totals.html"
	)
	handler = wnba_harvester.ValidatedRedirectHandler()

	with pytest.raises(ValueError, match="HTML source|forbidden"):
		handler.redirect_request(request, None, 302, "Found", {}, redirect_target)


#============================================

@pytest.mark.parametrize("url", [
	"https://www.basketball-reference.com/wnba/years/2026_totals.html",
	"https://www.basketball-reference.com/wnba/players/t/thomaal01w.html",
])
def test_server_rendered_current_and_player_html_pass_the_live_source_gate(url: str) -> None:
	"""Keep the approved server-rendered discovery and biography routes open."""
	wnba_harvester.validate_page_url(url)


#============================================

def test_totals_rows_are_transformed_into_derived_fantasy_points() -> None:
	"""Use the WNBA formula on static totals rows, not a hidden API response."""
	html = """<table id='totals'><tbody><tr>
	<th data-stat='player'><a href='/wnba/players/a/acesaj01w.html'>Aja Aces</a></th>
	<td data-stat='team'>LVA</td><td data-stat='pts'>100</td><td data-stat='trb'>20</td>
	<td data-stat='ast'>10</td><td data-stat='stl'>5</td><td data-stat='blk'>4</td>
	<td data-stat='tov'>7</td></tr></tbody></table>"""

	points = wnba_harvester.fantasy_by_player(html)
	assert points["acesaj01w"] == pytest.approx(159.0)


#============================================

def test_player_harvest_checkpoints_each_completed_group_before_a_later_failure(
		tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
	"""Retain completed profile work when the next source profile cannot be parsed."""
	entries = [{
		"name": f"Player {number}", "slug": f"player{number}",
		"playerUrl": f"https://www.basketball-reference.com/wnba/players/p/player{number}.html",
		"rosterUrl": "https://www.basketball-reference.com/wnba/teams/TST/2026.html",
	} for number in range(1, 7)]
	checkpoint_path = tmp_path / "players.checkpoint.json"

	def fake_get_page(_url: str, _referer: str) -> str:
		return "<html></html>"

	def fake_candidate(entry: dict[str, str], _html: str, _season: str,
			_current: dict[str, float], _previous: dict[str, float]) -> dict:
		if entry["slug"] == "player6":
			raise ValueError("malformed sixth profile")
		candidate = {
			"playerId": entry["slug"], "playerPageSourceUrl": entry["playerUrl"],
			"rosterSourceUrl": entry["rosterUrl"],
		}
		return candidate

	monkeypatch.setattr(wnba_harvester, "get_page", fake_get_page)
	monkeypatch.setattr(wnba_harvester, "candidate_from_entry", fake_candidate)
	with pytest.raises(ValueError, match="malformed sixth profile"):
		wnba_harvester.harvest_player_candidates(
			entries, "2026", {}, {}, checkpoint_path
		)
	payload = json.loads(checkpoint_path.read_text(encoding="utf-8"))
	assert [candidate["playerId"] for candidate in payload["candidates"]] == [
		"player1", "player2", "player3", "player4", "player5",
	]


#============================================

def test_player_harvest_resumes_after_the_checkpointed_prefix(
		tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch) -> None:
	"""Fetch only player pages that are absent from the matching checkpoint."""
	entries = [{
		"name": f"Player {number}", "slug": f"player{number}",
		"playerUrl": f"https://www.basketball-reference.com/wnba/players/p/player{number}.html",
		"rosterUrl": "https://www.basketball-reference.com/wnba/teams/TST/2026.html",
	} for number in range(1, 7)]
	cached_candidates = [{
		"playerId": entry["slug"], "playerPageSourceUrl": entry["playerUrl"],
		"rosterSourceUrl": entry["rosterUrl"],
	} for entry in entries[:-1]]
	checkpoint_path = tmp_path / "players.checkpoint.json"
	fingerprint = wnba_harvester.harvest_source_fingerprint(entries, "2026", {}, {})
	wnba_harvester.write_harvest_checkpoint(
		checkpoint_path, fingerprint, cached_candidates
	)
	fetched_urls = []

	def fake_get_page(url: str, _referer: str) -> str:
		fetched_urls.append(url)
		return "<html></html>"

	def fake_candidate(entry: dict[str, str], _html: str, _season: str,
			_current: dict[str, float], _previous: dict[str, float]) -> dict:
		candidate = {
			"playerId": entry["slug"], "playerPageSourceUrl": entry["playerUrl"],
			"rosterSourceUrl": entry["rosterUrl"],
		}
		return candidate

	monkeypatch.setattr(wnba_harvester, "get_page", fake_get_page)
	monkeypatch.setattr(wnba_harvester, "candidate_from_entry", fake_candidate)
	candidates = wnba_harvester.harvest_player_candidates(
		entries, "2026", {}, {}, checkpoint_path
	)
	assert fetched_urls == [entries[-1]["playerUrl"]]
	assert [candidate["playerId"] for candidate in candidates] == [
		"player1", "player2", "player3", "player4", "player5", "player6",
	]

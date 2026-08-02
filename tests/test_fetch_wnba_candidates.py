"""Behavioral tests for the Python-only WNBA candidate acquisition boundary."""

# Standard Library
import json
import pathlib
import sys

# PIP3 modules
import pytest

# local repo modules
import tools.fetch_wnba_candidates as fetcher


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
			"LeagueDashPlayerStats", ["PLAYER_ID", "NBA_FANTASY_PTS"], [["11", 0]]
		),
		"previousStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "NBA_FANTASY_PTS"], [["11", 0]]
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

def test_manifest_only_cli_requires_a_manifest_path(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Require saved source exports instead of offering a live retrieval mode."""
	monkeypatch.setattr(sys, "argv", ["fetch_wnba_candidates.py", "--live"])

	with pytest.raises(SystemExit):
		fetcher.parse_args()


#============================================

def test_candidate_output_stays_in_the_private_data_boundary(
	tmp_path: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
	"""Keep acquisition artifacts out of the browser-facing data directory."""
	expected_output = fetcher.REPO_ROOT / "data/private/candidates.json"
	initial_output = fetcher.validate_private_output_path(
		pathlib.Path("data/private/candidates.json")
	)
	monkeypatch.chdir(tmp_path)

	changed_directory_output = fetcher.validate_private_output_path(
		pathlib.Path("data/private/candidates.json")
	)
	assert initial_output == expected_output
	assert changed_directory_output == initial_output
	assert fetcher.validate_private_output_path(expected_output) == expected_output
	with pytest.raises(ValueError, match="stay under"):
		fetcher.validate_private_output_path(pathlib.Path("data/roster.json"))
	with pytest.raises(ValueError, match="stay under"):
		fetcher.validate_private_output_path(tmp_path / "data/private/candidates.json")


#============================================

def test_explicit_zero_fantasy_points_are_preserved_but_missing_is_rejected() -> None:
	"""Distinguish an official zero total from an absent season record."""
	indexed = fetcher.index_fantasy_points([{"PLAYER_ID": "11", "NBA_FANTASY_PTS": 0}], "2026")
	assert indexed["11"] == 0

	with pytest.raises(ValueError, match="missing required field NBA_FANTASY_PTS"):
		fetcher.index_fantasy_points([{"PLAYER_ID": "11"}], "2026")


#============================================

def test_current_roster_player_absent_from_a_season_is_rejected() -> None:
	"""Reject a roster player with no traditional-totals row for one season."""
	sources = {
		"asOfDateUtc": "2026-08-02",
		"teamPayload": {"teams": [{"TEAM_ID": 1}]},
		"rosters": [{
			"teamId": "1",
			"sourceUrl": "https://stats.wnba.com/stats/commonteamroster?TeamID=1",
			"payload": stats_payload(
				"CommonTeamRoster", ["PLAYER_ID", "TEAM_ID"], [["11", "1"]]
			),
		}],
		"currentStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "NBA_FANTASY_PTS"], [["11", 250]]
		),
		"previousStatsPayload": stats_payload(
			"LeagueDashPlayerStats", ["PLAYER_ID", "NBA_FANTASY_PTS"], [["99", 250]]
		),
		"profiles": {},
		"profileUrls": {},
	}

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

def test_private_writer_replaces_output_with_complete_json(tmp_path: pathlib.Path) -> None:
	"""Publish a complete JSON document through the private write boundary."""
	output = tmp_path / "data" / "private" / "candidates.json"
	output.parent.mkdir(parents=True)
	output.write_text("old", encoding="utf-8")

	fetcher.write_json(output, {"candidate": "complete"})

	assert json.loads(output.read_text(encoding="utf-8")) == {"candidate": "complete"}

"""Behavioral tests for the offline WNBA roster snapshot generator."""

# Standard Library
import json
import pathlib

# PIP3 modules
import pytest

# local repo modules
import tools.build_roster_file as roster_builder


#============================================

def candidate(player_id: str, current_points: int, previous_points: int) -> dict:
	"""Build one complete current-roster candidate at the private boundary.

	Args:
		player_id: Decimal official player identifier.
		current_points: Current season fantasy-point total.
		previous_points: Previous season fantasy-point total.

	Returns:
		A candidate acceptable to the snapshot generator.
	"""
	record = {
		"playerId": player_id,
		"rosterSourceUrl": "https://stats.wnba.com/stats/commonteamroster?TeamID=1",
		"playerPageSourceUrl": f"https://stats.wnba.com/player/{player_id}/",
		"roster": {
			"TEAM_ID": "1", "TEAM_ABBREVIATION": "ATL", "PLAYER_ID": player_id,
			"PLAYER": "Test Player", "NUM": "1", "POSITION": "Guard", "HEIGHT": "6-0",
			"WEIGHT": "160", "BIRTH_DATE": "1995-01-01", "AGE": "30", "EXP": "3",
			"SCHOOL": "Test College", "PLAYER_SLUG": "test-player",
		},
		"profile": {
			"PERSON_ID": player_id, "DISPLAY_FIRST_LAST": "Test Player",
			"BIRTHDATE": "1995-01-01", "SCHOOL": "Test College", "COUNTRY": "USA",
			"HEIGHT": "6-0", "POSITION": "Guard", "ROSTERSTATUS": "Active", "TEAM_ID": "1",
			"TEAM_ABBREVIATION": "ATL", "DRAFT_YEAR": "2017", "DRAFT_ROUND": "1",
			"DRAFT_NUMBER": "1",
		},
		"fantasyPointsCurrentSeason": current_points,
		"fantasyPointsPreviousSeason": previous_points,
	}
	return record


#============================================

def candidate_envelope(records: list[dict]) -> dict:
	"""Build the minimal provenance envelope for current-roster candidates.

	Args:
		records: Complete current-roster candidate records.

	Returns:
		A private candidate-file envelope.
	"""
	envelope = {
		"schemaVersion": 1,
		"asOfDateUtc": "2026-08-02",
		"source": {
			"kind": "official-wnba-stats",
			"urls": {
				"teamListUrl": "https://stats.wnba.com/js/data/widgets/teams_landing_inner.json",
				"traditionalStatsUrls": {
					"2026": "https://stats.wnba.com/stats/leaguedashplayerstats?Season=2026",
					"2025": "https://stats.wnba.com/stats/leaguedashplayerstats?Season=2025",
				},
			},
		},
		"validation": {
			"teamCount": 1,
			"rosterResponseCount": 1,
			"currentTraditionalRowCount": 1,
			"previousTraditionalRowCount": 1,
			"candidateCount": len(records),
		},
		"candidates": records,
	}
	return envelope


#============================================

def test_previous_season_total_can_qualify_a_current_roster_player() -> None:
	"""Apply the cutoff to the better of the two supplied season totals."""
	selected, summary = roster_builder.select_players([candidate("11", 150, 300)], 200)
	assert [record["playerId"] for record in selected] == ["11"]
	assert summary["precedingSeasonAdditionIds"] == ["11"]


#============================================

def test_zero_is_valid_but_missing_fantasy_point_field_is_not() -> None:
	"""Allow an official zero while rejecting incomplete private records."""
	roster_builder.validate_candidate(candidate("11", 0, 0), 0)
	missing = candidate("12", 0, 0)
	del missing["fantasyPointsPreviousSeason"]

	with pytest.raises(ValueError, match="keys differ"):
		roster_builder.validate_candidate(missing, 0)


#============================================

def test_snapshot_excludes_private_performance_fields(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Emit only game clues after selection from current-roster candidates."""
	monkeypatch.setattr(roster_builder, "load_country_overrides", lambda: {"USA": "United States"})
	monkeypatch.setattr(roster_builder, "load_team_conferences", lambda: {"ATL": "East"})
	monkeypatch.setattr(roster_builder, "load_eligibility_overrides", lambda: {})

	snapshot, _ = roster_builder.build_snapshot(candidate_envelope([candidate("11", 200, 0)]), 200)

	assert snapshot["players"][0]["playerId"] == "11"
	assert "fantasyPointsCurrentSeason" not in json.dumps(snapshot)


#============================================

def test_snapshot_writer_replaces_output_with_complete_json(tmp_path: pathlib.Path) -> None:
	"""Publish one whole static snapshot through the output boundary."""
	output = tmp_path / "public" / "roster.json"
	output.parent.mkdir(parents=True)
	output.write_text("old", encoding="utf-8")

	roster_builder.write_json(output, {"snapshot": "complete"})

	assert json.loads(output.read_text(encoding="utf-8")) == {"snapshot": "complete"}

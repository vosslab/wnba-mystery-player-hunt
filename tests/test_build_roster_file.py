"""Behavioral tests for the offline WNBA roster snapshot generator."""

# Standard Library
import json

# PIP3 modules
import pytest

# local repo modules
import data_fetcher.wnba_roster as roster_builder


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
			"DRAFT_NUMBER": "1", "FROM_YEAR": "2017",
		},
		"fantasyPointsCurrentSeason": current_points,
		"fantasyPointsPreviousSeason": previous_points,
	}
	return record


#============================================

def candidate_envelope(records: list[dict], current_season: int = 2026) -> dict:
	"""Build the minimal provenance envelope for current-roster candidates.

	Args:
		records: Complete current-roster candidate records.
		current_season: Current source season to preserve in the snapshot rule.

	Returns:
		A private candidate-file envelope.
	"""
	previous_season = current_season - 1
	envelope = {
		"schemaVersion": 1,
		"asOfDateUtc": "2026-08-02",
		"source": {
			"kind": "official-wnba-stats",
			"seasons": {
				"current": str(current_season),
				"previous": str(previous_season),
			},
			"urls": {
				"teamListUrl": "https://stats.wnba.com/js/data/widgets/teams_landing_inner.json",
				"traditionalStatsUrls": {
					str(current_season): (
						"https://stats.wnba.com/stats/leaguedashplayerstats?"
						f"Season={current_season}"
					),
					str(previous_season): (
						"https://stats.wnba.com/stats/leaguedashplayerstats?"
						f"Season={previous_season}"
					),
				},
			},
		},
		"validation": {
			"scope": "complete",
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

def basketball_reference_envelope(records: list[dict], current_season: int = 2026) -> dict:
	"""Build an HTML-only Basketball-Reference candidate-file envelope."""
	previous_season = current_season - 1
	for record in records:
		record["rosterSourceUrl"] = (
			f"https://www.basketball-reference.com/wnba/teams/ATL/{current_season}.html"
		)
		record["playerPageSourceUrl"] = (
			"https://www.basketball-reference.com/wnba/players/p/playerone01w.html"
		)
	envelope = candidate_envelope(records, current_season)
	envelope["source"]["kind"] = "basketball-reference-html"
	envelope["source"]["urls"] = {
		"teamListUrl": (
			f"https://www.basketball-reference.com/wnba/years/{current_season}_totals.html"
		),
		"traditionalStatsUrls": {
			str(current_season): (
				f"https://www.basketball-reference.com/wnba/years/{current_season}_totals.html"
			),
			str(previous_season): (
				f"https://www.basketball-reference.com/wnba/years/{previous_season}_totals.html"
			),
		},
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

def test_test_limit_candidate_file_cannot_generate_a_roster() -> None:
	"""Block a deliberately incomplete harvester result before selection."""
	candidate_file = candidate_envelope([candidate("11", 200, 0)])
	candidate_file["validation"]["scope"] = "test-limit"

	with pytest.raises(ValueError, match="produced with --max"):
		roster_builder.validate_candidate_envelope(candidate_file)


#============================================

def test_candidate_file_with_skipped_players_cannot_generate_a_roster() -> None:
	"""Block a tolerant harvest from promotion until failed players are retried."""
	candidate_file = candidate_envelope([candidate("11", 200, 0)])
	candidate_file["validation"]["scope"] = "incomplete"

	with pytest.raises(ValueError, match="skipped failed players"):
		roster_builder.validate_candidate_envelope(candidate_file)


#============================================

def test_complete_candidate_file_validates() -> None:
	"""Accept a complete envelope before roster selection begins."""
	validated = roster_builder.validate_candidate_envelope(
		candidate_envelope([candidate("11", 200, 0)])
	)

	assert validated["validation"]["scope"] == "complete"


#============================================

def test_basketball_reference_html_candidate_file_validates_and_is_honest(
	monkeypatch: pytest.MonkeyPatch,
) -> None:
	"""Accept the approved server-rendered HTML source without calling it official WNBA data."""
	monkeypatch.setattr(roster_builder, "load_country_overrides", lambda: {"USA": "United States"})
	monkeypatch.setattr(roster_builder, "load_team_conferences", lambda: {"ATL": "East"})
	monkeypatch.setattr(roster_builder, "load_eligibility_overrides", lambda: {})

	candidate_file = basketball_reference_envelope([candidate("11", 200, 0)])
	validated = roster_builder.validate_candidate_envelope(candidate_file)
	snapshot, _ = roster_builder.build_snapshot(validated, 200)

	assert "Basketball-Reference" in snapshot["sourceNote"]
	assert "Official WNBA Stats" not in snapshot["sourceNote"]
	assert snapshot["dataKind"] == "derived"
	assert snapshot["selectionRule"]["kind"] == "derived"
	assert "fantasyPointsCurrentSeason" not in json.dumps(snapshot)


#============================================

@pytest.mark.parametrize(
	("url_field", "bad_url"),
	[
		("teamListUrl", "https://example.test/wnba/years/2026_totals.html"),
		("traditionalStatsUrls", "https://www.basketball-reference.com/nba/years/2026_totals.html"),
	],
)
def test_basketball_reference_envelope_rejects_off_host_and_non_wnba_routes(
	url_field: str,
	bad_url: str,
) -> None:
	"""Keep the alternate source boundary confined to its two WNBA totals pages."""
	candidate_file = basketball_reference_envelope([candidate("11", 200, 0)])
	if url_field == "teamListUrl":
		candidate_file["source"]["urls"][url_field] = bad_url
	else:
		candidate_file["source"]["urls"][url_field]["2026"] = bad_url

	with pytest.raises(ValueError, match="Basketball-Reference WNBA totals"):
		roster_builder.validate_candidate_envelope(candidate_file)


#============================================

def test_basketball_reference_candidate_rejects_non_wnba_player_route() -> None:
	"""Require player evidence to stay inside Basketball-Reference's WNBA pages."""
	candidate_file = basketball_reference_envelope([candidate("11", 200, 0)])
	candidate_file["candidates"][0]["playerPageSourceUrl"] = (
		"https://www.basketball-reference.com/nba/players/p/playerone01.html"
	)

	with pytest.raises(ValueError, match="Basketball-Reference WNBA player page"):
		roster_builder.build_snapshot(candidate_file, 200)


#============================================

def test_snapshot_excludes_private_performance_fields(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Emit only game clues after selection from current-roster candidates."""
	monkeypatch.setattr(roster_builder, "load_country_overrides", lambda: {"USA": "United States"})
	monkeypatch.setattr(roster_builder, "load_team_conferences", lambda: {"ATL": "East"})
	monkeypatch.setattr(roster_builder, "load_eligibility_overrides", lambda: {})

	snapshot, _ = roster_builder.build_snapshot(
		candidate_envelope([candidate("11", 200, 0)], current_season=2031), 200
	)

	assert "fantasyPointsCurrentSeason" not in json.dumps(snapshot)
	assert snapshot["dataKind"] == "official"
	assert snapshot["selectionRule"]["kind"] == "official"
	assert snapshot["selectionRule"]["seasons"] == ["2031", "2030"]


#============================================

def test_snapshot_rejects_mismatched_provenance_pair(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Reject a public label that disagrees with its selection-rule provenance."""
	monkeypatch.setattr(roster_builder, "load_country_overrides", lambda: {"USA": "United States"})
	monkeypatch.setattr(roster_builder, "load_team_conferences", lambda: {"ATL": "East"})
	monkeypatch.setattr(roster_builder, "load_eligibility_overrides", lambda: {})

	snapshot, _ = roster_builder.build_snapshot(
		basketball_reference_envelope([candidate("11", 200, 0)]), 200
	)
	snapshot["dataKind"] = "official"

	with pytest.raises(ValueError, match="selection rule kind must match data kind"):
		roster_builder.validate_snapshot(snapshot)

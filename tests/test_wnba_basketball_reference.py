"""Offline behavior tests for Basketball-Reference WNBA HTML parsing."""

# PIP3 modules
import pytest

# local repo modules
import data_fetcher.wnba_basketball_reference as basketball_reference


#============================================

def test_parse_commented_totals_table_preserves_source_cell_metadata() -> None:
	"""Read data-stat cells, an href, and a sortable csk from a hidden table."""
	html = """<!-- <table id='totals_stats'><tbody><tr>
	<th data-stat='player' csk='Aces,Aja'><a href='/wnba/players/a/acesaj01w.html'>Aja Aces</a></th>
	<td data-stat='pts'>100</td><td data-stat='trb'>20</td><td data-stat='ast'>10</td>
	<td data-stat='stl'>5</td><td data-stat='blk'>4</td><td data-stat='tov'>7</td>
	</tr></tbody></table> -->"""
	rows = basketball_reference.parse_table(html, "totals_stats")
	assert rows[0]["player"] == {
		"text": "Aja Aces", "csk": "Aces,Aja", "href": "/wnba/players/a/acesaj01w.html",
	}
	assert basketball_reference.wnba_fantasy_total(rows[0]) == pytest.approx(159.0)


#============================================

def test_parse_totals_table_accepts_escaped_markup_attribute_quotes() -> None:
	"""Read a real escaped-template href without returning the header row."""
	html = r"""<table id=\'totals\'><tbody>
	<tr class=\'thead\'><th data-stat=\'player\'>Player</th></tr>
	<tr><th data-stat=\'player\'><a href=\'/wnba/players/a/acesaj01w.html\'>Aja Aces</a></th>
	<td data-stat=\'pts\'>100</td></tr>
	</tbody></table>"""
	rows = basketball_reference.parse_table(html, "totals")
	assert rows == [{
		"player": {"text": "Aja Aces", "href": "/wnba/players/a/acesaj01w.html"},
		"pts": {"text": "100"},
	}]


#============================================

def test_markup_quote_normalizer_leaves_script_strings_unchanged() -> None:
	"""Repair escaped table markup without rewriting lookalike JavaScript text."""
	html = r"""<script>
	const example = "<a href=\'/wnba/players/x/example01w.html\'>not a link</a>";
	</script><table id=\'totals\'><tbody>
	<tr class=\'thead\'><th data-stat=\'player\'>Player</th></tr>
	<tr><th data-stat=\'player\'><a href=\'/wnba/players/a/acesaj01w.html\'>
	Aja Aces</a></th><td data-stat=\'pts\'>100</td></tr>
	</tbody></table>"""
	canonical = basketball_reference.canonicalize_markup_quote_escapes(html)
	assert r"href=\'/wnba/players/x/example01w.html\'" in canonical
	assert "<table id='totals'>" in canonical
	assert basketball_reference.parse_table(html, "totals") == [{
		"player": {"text": "Aja Aces", "href": "/wnba/players/a/acesaj01w.html"},
		"pts": {"text": "100"},
	}]


#============================================

def test_parse_table_repairs_observed_malformed_inline_closing_tag() -> None:
	"""Keep a player row parseable when source markup omits one close bracket."""
	html = """<table id='totals'><tbody><tr>
	<th data-stat='player'><a href='/wnba/players/a/acesaj01w.html'><strong>Aja</strong</a></th>
	<td data-stat='pts'>100</td></tr></tbody></table>"""
	rows = basketball_reference.parse_table(html, "totals")
	assert rows == [{
		"player": {"text": "Aja", "href": "/wnba/players/a/acesaj01w.html"},
		"pts": {"text": "100"},
	}]


#============================================

def test_parse_player_table_discards_repeated_column_heading_rows() -> None:
	"""Keep only rows with actual WNBA player-profile links in player tables."""
	html = """<table id='roster'><tbody>
	<tr class='thead'><th data-stat='player'>Player</th><th data-stat='pos'>Pos</th></tr>
	<tr><th data-stat='player'><a href='/wnba/players/a/acesaj01w.html'>Aja Aces</a></th>
	<td data-stat='pos'>F</td></tr>
	<tr class='thead'><th data-stat='player'>Player</th><th data-stat='pos'>Pos</th></tr>
	</tbody></table>"""
	rows = basketball_reference.parse_table(html, "roster")
	assert rows == [{
		"player": {"text": "Aja Aces", "href": "/wnba/players/a/acesaj01w.html"},
		"pos": {"text": "F"},
	}]


#============================================

def test_parse_current_team_links_filters_to_requested_season() -> None:
	"""Use only current-season team pages, excluding legacy team links."""
	html = """<a href='/wnba/teams/NYL/2026.html'>New York</a>
	<a href='/wnba/teams/LVA/2026.html'>Las Vegas</a>
	<a href='/wnba/teams/NYL/1998.html'>Legacy</a>"""
	links = basketball_reference.parse_current_team_page_links(html, "2026")
	assert links == {
		"NYL": "/wnba/teams/NYL/2026.html", "LVA": "/wnba/teams/LVA/2026.html",
	}


#============================================

def test_parse_profile_metadata_supports_drafted_player() -> None:
	"""Extract machine-readable birth and country data plus visible biography fields."""
	html = """<div id='meta'><p><strong>Position:</strong> Guard \u25aa Shoots: Right</p>
	<p><strong>6-0</strong>, 165lb (183cm, 74kg)</p>
	<p><strong>Born:</strong> <span data-birth='1996-08-30'>August 30, 1996</span>
	<span class='f-us'></span> in USA</p><p><strong>College:</strong> Test University</p>
	<p><strong>Draft:</strong> New York Liberty, 1st round (1st pick, 1st overall), 2018 WNBA Draft</p></div>"""
	metadata = basketball_reference.parse_player_profile_metadata(html)
	assert metadata == {
		"birthDate": "1996-08-30", "country": "US", "position": "Guard",
		"height": "6-0", "college": "Test University",
		"draft": {"status": "drafted", "year": 2018, "round": 1, "overall": 1},
	}


#============================================

def test_parse_profile_metadata_supports_real_short_draft_wording() -> None:
	"""Accept Basketball-Reference profiles whose draft line ends ``YYYY Draft``."""
	html = """<p><strong>Position:</strong> Forward</p><p><strong>6-2</strong>, 175lb</p>
	<p><span data-birth='1992-04-12'></span><span class='f-us'></span></p>
	<p><strong>Draft:</strong> 1st round (4th pick, 4th overall), 2014 Draft</p>"""
	metadata = basketball_reference.parse_player_profile_metadata(html)
	assert metadata["draft"] == {
		"status": "drafted", "year": 2014, "round": 1, "overall": 4,
	}


#============================================

def test_parse_profile_metadata_implicitly_closes_a_malformed_position_paragraph() -> None:
	"""Recover fields after the source starts a height paragraph before closing Position."""
	html = """<p><strong>Position:</strong> Forward
	<p><span>6-4</span> (193cm)</p>
	<p><strong>Born:</strong> <span data-birth='2000-01-10'></span>
	<span class='f-i f-de'>de</span></p>
	<p><strong>Draft:</strong> 2nd round (10th pick, 22nd overall), 2020 Draft</p>"""
	metadata = basketball_reference.parse_player_profile_metadata(html)
	assert metadata["position"] == "Forward"
	assert metadata["height"] == "6-4"


#============================================

def test_parse_profile_metadata_marks_undrafted_player() -> None:
	"""Represent explicit undrafted source text without inventing pick values."""
	html = """<p><strong>Position:</strong> Center</p><p><strong>6-5</strong>, 180lb</p>
	<p><span data-birth='1998-01-01'></span><span class='flag f-ca'></span></p>
	<p><strong>Draft:</strong> Undrafted</p>"""
	metadata = basketball_reference.parse_player_profile_metadata(html)
	assert metadata["country"] == "CA"
	assert metadata["draft"] == {
		"status": "undrafted", "year": None, "round": None, "overall": None,
	}


#============================================

def test_parse_profile_metadata_distinguishes_an_expansion_draft() -> None:
	"""Keep an expansion selection separate from an original WNBA entry-draft pick."""
	html = """<p><strong>Position:</strong> Forward</p><p><strong>6-1</strong>, 190lb</p>
	<p><span data-birth='1992-10-20'></span><span class='flag f-us'></span></p>
	<p><strong>Draft:</strong> Golden State Valkyries, 9th overall,
	2025 Expansion Draft</p>"""
	metadata = basketball_reference.parse_player_profile_metadata(html)
	assert metadata["draft"] == {
		"status": "expansion", "year": 2025, "round": None, "overall": 9,
	}

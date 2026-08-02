"""Parse Basketball-Reference WNBA HTML without browser or network dependencies."""

# Standard Library
import html.parser
import re


#============================================

def compact_text(parts: list[str]) -> str:
	"""Join HTML text fragments into one readable value.

	Args:
		parts: Text fragments reported by :class:`html.parser.HTMLParser`.

	Returns:
		Whitespace-normalized text.
	"""
	text = " ".join(parts)
	return re.sub(r"\s+", " ", text).strip()


#============================================

def canonicalize_markup_quote_escapes(document: str) -> str:
	"""Remove JavaScript-style quote escapes only from real HTML tag markup.

	Some Basketball-Reference pages expose table markup from an escaped template,
	for example ``<a href=\\'/wnba/...\\'>``.  ``HTMLParser`` treats that
	backslash as part of the attribute syntax and consequently loses the link.
	This deliberately changes only real markup.  In particular, a JavaScript
	string can contain text that looks like ``<a href=\\'...\\'>``; touching that
	string would silently change page content before it is parsed.

	Args:
		document: Downloaded Basketball-Reference HTML.

	Returns:
		HTML whose markup attribute quotes can be read by :class:`HTMLParser`.
	"""
	result: list[str] = []
	index = 0
	raw_text_element: str | None = None

	while index < len(document):
		if raw_text_element is not None:
			closing_match = re.search(
				rf"</\s*{re.escape(raw_text_element)}\b",
				document[index:],
				flags=re.IGNORECASE,
			)
			if closing_match is None:
				result.append(document[index:])
				break
			closing_index = index + closing_match.start()
			result.append(document[index:closing_index])
			index = closing_index
			raw_text_element = None

		if document[index] != "<":
			result.append(document[index])
			index += 1
			continue
		start_match = re.match(r"</?\s*([A-Za-z][A-Za-z0-9:-]*)\b", document[index:])
		if start_match is None:
			result.append("<")
			index += 1
			continue
		end_index = document.find(">", index + start_match.end())
		if end_index == -1:
			result.append(document[index:])
			break
		tag_markup = document[index:end_index + 1]
		# Some current totals rows omit the closing angle bracket in ``</strong</th>``.
		tag_markup = re.sub(r"</(strong|a)</", r"</\1></", tag_markup)
		result.append(tag_markup.replace(r"\'", "'").replace(r'\"', '"'))
		is_end_tag = tag_markup.startswith("</")
		tag_name = start_match.group(1).casefold()
		if not is_end_tag and tag_name in {"script", "style"}:
			raw_text_element = tag_name
		index = end_index + 1

	return "".join(result)


#============================================

def html_fragments(document: str) -> list[str]:
	"""Return the document plus HTML hidden inside comments.

	Basketball-Reference places several statistical tables in HTML comments.  The
	comment body is still authored HTML, not a second network response, so parsing
	it here keeps the parser independent of a browser.

	Args:
		document: A downloaded Basketball-Reference HTML document.

	Returns:
		The document and each comment body containing markup.
	"""
	document = canonicalize_markup_quote_escapes(document)
	fragments = [document]
	for comment in re.findall(r"<!--(.*?)-->", document, flags=re.DOTALL):
		if "<" in comment and ">" in comment:
			fragments.append(comment)
	return fragments


#============================================

class TableParser(html.parser.HTMLParser):
	"""Collect rows from one HTML table, preserving source cell attributes."""

	def __init__(self, table_id: str) -> None:
		"""Initialize the parser for one table identifier.

		Args:
			table_id: Exact value of the source table's ``id`` attribute.
		"""
		super().__init__(convert_charrefs=True)
		self.table_id = table_id
		self.in_table = False
		self.table_depth = 0
		self.rows: list[dict[str, dict[str, str]]] = []
		self.row: dict[str, dict[str, str]] | None = None
		self.cell_stat: str | None = None
		self.cell: dict[str, str] | None = None
		self.cell_text: list[str] = []

	def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
		"""Start a matching table, row, cell, or cell link."""
		attributes = dict(attrs)
		if tag == "table" and attributes.get("id") == self.table_id:
			self.in_table = True
			self.table_depth = 1
			return
		if not self.in_table:
			return
		if tag == "table":
			self.table_depth += 1
		elif tag == "tr":
			self.row = {}
		elif tag in {"td", "th"} and "data-stat" in attributes and self.row is not None:
			self.cell_stat = str(attributes["data-stat"])
			self.cell = {"text": ""}
			if attributes.get("csk") is not None:
				self.cell["csk"] = str(attributes["csk"])
			self.cell_text = []
		elif tag == "a" and self.cell is not None and attributes.get("href") is not None:
			self.cell["href"] = str(attributes["href"])

	def handle_data(self, data: str) -> None:
		"""Accumulate visible text from the active source cell."""
		if self.cell is not None:
			self.cell_text.append(data)

	def handle_endtag(self, tag: str) -> None:
		"""Finish a source cell, row, or target table."""
		if not self.in_table:
			return
		if tag in {"td", "th"} and self.cell is not None and self.cell_stat is not None:
			self.cell["text"] = compact_text(self.cell_text)
			if self.row is not None:
				self.row[self.cell_stat] = self.cell
			self.cell = None
			self.cell_stat = None
			self.cell_text = []
		elif tag == "tr" and self.row is not None:
			if self.row:
				self.rows.append(self.row)
			self.row = None
		elif tag == "table":
			self.table_depth -= 1
			if self.table_depth == 0:
				self.in_table = False


#============================================

def parse_table(document: str, table_id: str) -> list[dict[str, dict[str, str]]]:
	"""Parse rows in a named Basketball-Reference table.

	Each row is keyed by the table's ``data-stat`` fields.  Each cell always has a
	``text`` value and retains optional ``href`` and ``csk`` attributes when the
	source supplies them.

	Args:
		document: Basketball-Reference HTML, including possible commented tables.
		table_id: Exact source ``table`` identifier.

	Returns:
		Source rows keyed by ``data-stat``.

	Raises:
		ValueError: The requested table was absent or contained no data rows.
	"""
	rows: list[dict[str, dict[str, str]]] = []
	for fragment in html_fragments(document):
		parser = TableParser(table_id)
		parser.feed(fragment)
		parser.close()
		rows.extend(parser.rows)
	if not rows:
		raise ValueError(f"Basketball-Reference table {table_id!r} contained no rows")
	# Basketball-Reference repeats column headings in ``tbody`` for long tables.
	# Player-oriented tables always identify data rows with the player profile
	# link, while a heading has only plain ``th`` text.  Preserve generic tables
	# (which may have no player column at all), but never return a heading row
	# from a player table to the harvester.
	if any("player" in row for row in rows):
		player_rows = [
			row for row in rows
			if re.fullmatch(
				r"/wnba/players/[a-z0-9]+/[a-z0-9]+\.html",
				row.get("player", {}).get("href", ""),
			)
		]
		if not player_rows:
			raise ValueError(
				f"Basketball-Reference player table {table_id!r} contained no player rows"
			)
		return player_rows
	return rows


#============================================

class TeamLinkParser(html.parser.HTMLParser):
	"""Collect season-specific WNBA team links from a page."""

	def __init__(self, season: str) -> None:
		"""Initialize the parser for a four-digit WNBA season.

		Args:
			season: Season encoded in desired team-page paths.
		"""
		super().__init__(convert_charrefs=True)
		self.season = season
		self.links: dict[str, str] = {}

	def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
		"""Retain links shaped like ``/wnba/teams/CODE/SEASON.html``."""
		if tag != "a":
			return
		href = dict(attrs).get("href")
		if href is None:
			return
		match = re.fullmatch(r"/wnba/teams/([A-Za-z0-9]+)/([0-9]{4})\.html", href)
		if match is None or match.group(2) != self.season:
			return
		self.links[match.group(1).upper()] = href


#============================================

def parse_current_team_page_links(document: str, season: str) -> dict[str, str]:
	"""Find Basketball-Reference team pages for one season.

	Args:
		document: Current WNBA standings or league HTML page.
		season: Four-digit season expected in every result.

	Returns:
		Relative team-page links keyed by uppercase Basketball-Reference team code.

	Raises:
		ValueError: The document supplies no team links for the requested season.
	"""
	if not re.fullmatch(r"[0-9]{4}", season):
		raise ValueError(f"Season must be four decimal digits: {season}")
	parser = TeamLinkParser(season)
	for fragment in html_fragments(document):
		parser.feed(fragment)
	parser.close()
	if not parser.links:
		raise ValueError(f"No Basketball-Reference WNBA team links found for {season}")
	return parser.links


#============================================

class ProfileParser(html.parser.HTMLParser):
	"""Collect text paragraphs and machine-readable biography attributes."""

	def __init__(self) -> None:
		"""Initialize profile collection state."""
		super().__init__(convert_charrefs=True)
		self.paragraph_depth = 0
		self.paragraph_text: list[str] = []
		self.paragraphs: list[str] = []
		self.birth_date: str | None = None
		self.country_code: str | None = None

	def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
		"""Capture birth and flag attributes while entering paragraphs."""
		attributes = dict(attrs)
		birth_date = attributes.get("data-birth")
		if birth_date is not None:
			self.birth_date = birth_date
		class_value = attributes.get("class")
		if class_value is not None:
			for class_name in class_value.split():
				match = re.fullmatch(r"f-([a-z]{2})", class_name.casefold())
				if match is not None:
					self.country_code = match.group(1).upper()
		if tag == "p":
			self.paragraph_depth += 1
			if self.paragraph_depth == 1:
				self.paragraph_text = []

	def handle_data(self, data: str) -> None:
		"""Capture text from biography paragraphs."""
		if self.paragraph_depth:
			self.paragraph_text.append(data)

	def handle_endtag(self, tag: str) -> None:
		"""Finish an outer biography paragraph."""
		if tag != "p" or not self.paragraph_depth:
			return
		self.paragraph_depth -= 1
		if self.paragraph_depth == 0:
			text = compact_text(self.paragraph_text)
			if text:
				self.paragraphs.append(text)


#============================================

def labeled_value(paragraphs: list[str], label: str) -> str | None:
	"""Find the text following one visible Basketball-Reference label.

	Args:
		paragraphs: Whitespace-normalized biography paragraphs.
		label: Source label including its trailing colon.

	Returns:
		The matching value or ``None`` when the optional label is absent.
	"""
	for paragraph in paragraphs:
		if paragraph.startswith(label):
			value = paragraph.removeprefix(label).strip()
			return value
	return None


#============================================

def parse_draft(paragraphs: list[str]) -> dict[str, int | str | None]:
	"""Normalize Basketball-Reference draft prose into drafted or undrafted data.

	Args:
		paragraphs: Whitespace-normalized biography paragraphs.

	Returns:
		A status mapping with drafted year, round, and overall pick when applicable.
	"""
	draft_text = labeled_value(paragraphs, "Draft:")
	if draft_text is None or "undrafted" in draft_text.casefold():
		return {"status": "undrafted", "year": None, "round": None, "overall": None}
	# Real profiles use both "2014 WNBA Draft" and the shorter "2014 Draft".
	year_match = re.search(r"\b([0-9]{4})(?:\s+WNBA)?\s+Draft\b", draft_text)
	round_match = re.search(r"\b([0-9]+)(?:st|nd|rd|th) round\b", draft_text)
	overall_match = re.search(r"\b([0-9]+)(?:st|nd|rd|th) overall\b", draft_text)
	if year_match is None or round_match is None or overall_match is None:
		raise ValueError(f"Unrecognized Basketball-Reference draft text: {draft_text}")
	draft = {
		"status": "drafted",
		"year": int(year_match.group(1)),
		"round": int(round_match.group(1)),
		"overall": int(overall_match.group(1)),
	}
	return draft


#============================================

def parse_player_profile_metadata(document: str) -> dict[str, object]:
	"""Parse the WNBA biography fields needed by the roster builder.

	Args:
		document: A Basketball-Reference player-profile HTML document.

	Returns:
		Birth date, ISO flag country, position, height, college, and draft metadata.

	Raises:
		ValueError: Required machine-readable biography values are missing.
	"""
	parser = ProfileParser()
	for fragment in html_fragments(document):
		parser.feed(fragment)
	parser.close()
	if parser.birth_date is None:
		raise ValueError("Basketball-Reference profile has no data-birth value")
	if parser.country_code is None:
		raise ValueError("Basketball-Reference profile has no f-xx country flag")
	position_text = labeled_value(parser.paragraphs, "Position:")
	if position_text is None:
		raise ValueError("Basketball-Reference profile has no Position field")
	position = re.split(r"\s*[\u25aa\u2022]\s*Shoots:", position_text, maxsplit=1)[0].strip()
	height = None
	for paragraph in parser.paragraphs:
		match = re.search(r"\b([0-9]-[0-9]{1,2})\b", paragraph)
		if match is not None:
			height = match.group(1)
			break
	if height is None:
		raise ValueError("Basketball-Reference profile has no feet-inches height")
	college = labeled_value(parser.paragraphs, "College:")
	if college is None:
		college = ""
	metadata = {
		"birthDate": parser.birth_date,
		"country": parser.country_code,
		"position": position,
		"height": height,
		"college": college,
		"draft": parse_draft(parser.paragraphs),
	}
	return metadata


#============================================

def wnba_fantasy_total(totals_row: dict[str, dict[str, str]]) -> float:
	"""Calculate WNBA fantasy points from one Basketball-Reference totals row.

	Args:
		totals_row: A table row containing PTS, TRB, AST, STL, BLK, and TOV cells.

	Returns:
		The documented WNBA fantasy-points total.

	Raises:
		ValueError: A required statistic is absent or nonnumeric.
	"""
	values = {}
	for stat_name in ("pts", "trb", "ast", "stl", "blk", "tov"):
		if stat_name not in totals_row:
			raise ValueError(f"Totals row has no {stat_name} cell")
		text = totals_row[stat_name]["text"]
		if not re.fullmatch(r"-?[0-9]+(?:\.[0-9]+)?", text):
			raise ValueError(f"Totals row {stat_name} is not numeric: {text}")
		values[stat_name] = float(text)
	total = (
		values["pts"] + 1.2 * values["trb"] + 1.5 * values["ast"]
		+ 3 * values["stl"] + 3 * values["blk"] - values["tov"]
	)
	return total

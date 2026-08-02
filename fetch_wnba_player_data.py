#!/usr/bin/env python3
"""Harvest the complete private WNBA player data set from the repository root."""

# local repo modules
import data_fetcher.wnba_harvester


if __name__ == "__main__":
	data_fetcher.wnba_harvester.main()

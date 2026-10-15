from app.utils.presentation_metrics import count_words, count_fillers, words_per_minute

def test_count_words():
    assert count_words("Hello world, this is a test.") == 6

def test_count_fillers():
    assert count_fillers("Um, so basically I like really think so.") >= 3

def test_wpm():
    assert words_per_minute(120, 60) == 120.0
    assert words_per_minute(100, None) is None
    assert words_per_minute(100, 0) is None
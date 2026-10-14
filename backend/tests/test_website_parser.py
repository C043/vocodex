import pytest
from fastapi import HTTPException

from app.controllers import websiteController

ARTICLE_HTML = """
<html>
  <head>
    <title>Fallback Title</title>
    <meta property="og:title" content="How Speech Synthesis Works">
    <style>body { color: red; }</style>
    <script>console.log("tracking");</script>
  </head>
  <body>
    <nav><a href="/">Home</a> <a href="/about">About</a> <a href="/blog">Blog</a></nav>
    <article>
      <h1>How Speech Synthesis Works</h1>
      <p>Speech synthesis is the artificial production of human speech.[1] A computer
      system used for this purpose is called a speech synthesizer.</p>
      <p>A text-to-speech system converts normal language text into speech.[23]
      Other systems render symbolic linguistic representations into speech.</p>
      <p>Synthesized speech can be created by concatenating pieces of recorded
      speech that are stored in a database.[citation needed]</p>
    </article>
    <footer>Copyright 2026 - All rights reserved - Privacy Policy</footer>
  </body>
</html>
"""


def test_parse_website_extracts_title_and_main_content():
    parsed = websiteController.parseWebsite(ARTICLE_HTML)

    assert parsed.title == "How Speech Synthesis Works"
    assert "Speech synthesis is the artificial production of human speech." in (
        parsed.content
    )
    assert "converts normal language text into speech." in parsed.content


def test_parse_website_strips_boilerplate():
    parsed = websiteController.parseWebsite(ARTICLE_HTML)

    assert "tracking" not in parsed.content
    assert "color: red" not in parsed.content
    assert "All rights reserved" not in parsed.content
    assert "About" not in parsed.content


def test_parse_website_removes_citation_markers():
    parsed = websiteController.parseWebsite(ARTICLE_HTML)

    assert "[1]" not in parsed.content
    assert "[23]" not in parsed.content
    assert "[citation needed]" not in parsed.content


def test_parse_website_keeps_paragraphs_separated():
    parsed = websiteController.parseWebsite(ARTICLE_HTML)

    assert "\n\n" in parsed.content


def test_parse_website_falls_back_to_first_words_when_no_title():
    html = """
    <html><body><article>
      <p>Untitled pages still deserve to be read aloud by the application.</p>
    </article></body></html>
    """
    parsed = websiteController.parseWebsite(html)

    assert parsed.title == "Untitled pages still"


def test_parse_website_without_readable_text_raises():
    html = "<html><head><title>Empty</title></head><body><script>x()</script></body></html>"

    with pytest.raises(HTTPException) as exc:
        websiteController.parseWebsite(html)

    assert exc.value.status_code == 422

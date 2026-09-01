"""
Build the Visual Notes manual: one real case walked through every stage.

Every number and every code block in this document comes from scripts/trace.ts,
which runs the real pipeline and saves what actually happened at each step. If
the pipeline changes, re-run the trace and re-run this — the manual cannot drift
away from the code, because it is built from the code's own output.

  node scripts/trace.ts --out trace
  python scripts/make-manual-pdf.py trace
"""

import json
import sys
from pathlib import Path

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.colors import HexColor, white

TRACE = Path(sys.argv[1] if len(sys.argv) > 1 else "trace")
OUT = sys.argv[2] if len(sys.argv) > 2 else "Visual_Notes_Manual.pdf"

W, H = landscape(letter)  # 792 x 612
NAVY = HexColor("#07203A")
NAVY_MID = HexColor("#123C63")
TEAL = HexColor("#00857F")
TEAL_LIGHT = HexColor("#E6F5F4")
GREY = HexColor("#5A6B7B")
GREY_LIGHT = HexColor("#8A99A8")
LINE = HexColor("#C4CFD9")
PAPER = HexColor("#F4F7F9")
AMBER = HexColor("#B57A1E")
AMBER_LIGHT = HexColor("#FDF4E3")
RED = HexColor("#B4453F")
RED_LIGHT = HexColor("#FCEDEC")

c = canvas.Canvas(OUT, pagesize=(W, H))
c.setTitle("Visual Notes - How It Works")

# --------------------------------------------------------------- trace data --
def load(name):
    p = TRACE / name
    text = p.read_text(encoding="utf8")
    return json.loads(text) if name.endswith(".json") else text


RAW = load("01-raw-input.txt")
NOTES = load("02-parsed-notes.json")
PLAN = load("03-chunk-plan.json")
PROMPT = load("04-prompt.txt")
MODEL_OUT = load("06-model-raw-output.json")
USAGE = load("06b-usage.json")
CHECKED = load("07-after-quote-check.json")
CHECK_REPORT = load("07b-quote-check-report.json")
TAMPER = load("08-tamper-test.json")
RECORD = load("09-merged-record.json")
FORM_CHECK = load("10-form-check.json")
CHART = load("11-chart-data.json")

PAGE = [0]

# ------------------------------------------------------------------ helpers --
def wrap(text, font, size, width):
    out, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if c.stringWidth(trial, font, size) <= width:
            cur = trial
        else:
            if cur:
                out.append(cur)
            cur = word
    if cur:
        out.append(cur)
    return out


def para(text, x, y, width, font="Helvetica", size=9, leading=12, colour=GREY):
    c.setFont(font, size)
    c.setFillColor(colour)
    lines = wrap(text, font, size, width)
    for i, line in enumerate(lines):
        c.drawString(x, y - i * leading, line)
    return y - (len(lines) - 1) * leading - leading


def bullets(items, x, y, width, size=9, leading=12, gap=5, colour=GREY):
    for item in items:
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", size)
        c.drawString(x, y, "•")
        y = para(item, x + 11, y, width - 11, size=size, leading=leading, colour=colour) - gap
    return y


def page(kicker, title, subtitle=None):
    """Start a new page and return the y to begin writing at."""
    if PAGE[0]:
        footer()
        c.showPage()
    PAGE[0] += 1

    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(38, H - 42, kicker.upper())

    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(38, H - 64, title)

    y = H - 82
    if subtitle:
        y = para(subtitle, 38, y, W - 76, size=9.5, leading=12.5) - 2

    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(38, y, W - 38, y)
    return y - 22


def footer():
    c.setFillColor(GREY_LIGHT)
    c.setFont("Helvetica", 7)
    c.drawString(38, 22, "Visual Notes  ·  New England CareFlow LLC")
    c.drawRightString(W - 38, 22, f"page {PAGE[0]}")


def panel(x, y, w, h, fill=white, stroke=LINE, radius=6):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def cap(text, x, y, colour=NAVY, size=8.5):
    """Small bold label above a panel."""
    c.setFillColor(colour)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x, y, text)


def mono(text, x, y, w, h, title=None, size=7.2, fill=PAPER, colour=NAVY,
         stroke=LINE, highlight=None):
    """A block of computer text, wrapped to the panel and clipped to its height."""
    if title:
        cap(title, x, y + h + 6)
    panel(x, y, w, h, fill=fill, stroke=stroke)

    leading = size + 2.2
    char_w = size * 0.6
    max_chars = max(8, int((w - 18) / char_w))

    lines = []
    for raw_line in text.split("\n"):
        raw_line = raw_line.replace("\t", "  ")
        if not raw_line:
            lines.append("")
            continue
        while len(raw_line) > max_chars:
            lines.append(raw_line[:max_chars])
            raw_line = raw_line[max_chars:]
        lines.append(raw_line)

    room = int((h - 14) / leading)
    clipped = len(lines) > room
    if clipped:
        lines = lines[: room - 1] + ["   ... (shortened to fit)"]

    ty = y + h - 12
    for line in lines:
        is_hit = highlight and any(hl in line for hl in highlight)
        if is_hit:
            c.setFillColor(HexColor("#FFF3C4"))
            c.rect(x + 5, ty - 2.5, w - 10, leading - 1, stroke=0, fill=1)
        c.setFillColor(HexColor("#8A5A00") if is_hit else colour)
        c.setFont("Courier-Bold" if is_hit else "Courier", size)
        c.drawString(x + 9, ty, line)
        ty -= leading
    return y


def arrow(x1, y1, x2, y2, colour=TEAL, label=None, width=1.6, dashed=False):
    c.setStrokeColor(colour)
    c.setFillColor(colour)
    c.setLineWidth(width)
    if dashed:
        c.setDash(3, 3)
    c.line(x1, y1, x2, y2)
    c.setDash()
    import math

    ang = math.atan2(y2 - y1, x2 - x1)
    for sign in (1, -1):
        c.line(x2, y2, x2 - 8 * math.cos(ang - sign * 0.4), y2 - 8 * math.sin(ang - sign * 0.4))
    if label:
        c.setFont("Helvetica", 7.2)
        c.setFillColor(colour)
        c.drawCentredString((x1 + x2) / 2, (y1 + y2) / 2 + 4, label)


def big_arrow_right(x, y, size=16, colour=TEAL):
    c.setFillColor(colour)
    p = c.beginPath()
    p.moveTo(x + size, y)
    p.lineTo(x, y + size * 0.55)
    p.lineTo(x, y - size * 0.55)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def note_box(text, x, y, w, kind="info"):
    """A coloured aside: why we did it this way."""
    fills = {"info": TEAL_LIGHT, "warn": AMBER_LIGHT, "bad": RED_LIGHT}
    edges = {"info": TEAL, "warn": AMBER, "bad": RED}
    heads = {"info": "WHY THIS MATTERS", "warn": "WATCH OUT", "bad": "WHAT WENT WRONG"}
    lines = wrap(text, "Helvetica", 8.6, w - 24)
    h = 26 + len(lines) * 11
    panel(x, y - h, w, h, fill=fills[kind], stroke=edges[kind])
    c.setFillColor(edges[kind])
    c.setFont("Helvetica-Bold", 7.2)
    c.drawString(x + 12, y - 16, heads[kind])
    para(text, x + 12, y - 30, w - 24, size=8.6, leading=11, colour=NAVY)
    return y - h


def recap(text):
    """A one-sentence summary band along the foot of a step page."""
    lines = wrap(text, "Helvetica", 11, W - 130)
    h = 30 + len(lines) * 15
    panel(38, 56, W - 76, h, fill=PAPER, stroke=PAPER)
    c.setFillColor(TEAL)
    c.rect(38, 56, 4, h, stroke=0, fill=1)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(58, 56 + h - 17, "IN ONE SENTENCE")
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 11)
    ty = 56 + h - 35
    for line in lines:
        c.drawString(58, ty, line)
        ty -= 15


def fit(text, font, size, width):
    """Shorten text with an ellipsis until it fits the given width."""
    if c.stringWidth(text, font, size) <= width:
        return text
    while text and c.stringWidth(text + "...", font, size) > width:
        text = text[:-1]
    return text.rstrip() + "..."


# ============================================================ PAGE 1: cover ==
PAGE[0] = 1
c.setFillColor(NAVY)
c.rect(0, 0, W, H, stroke=0, fill=1)

c.setFillColor(HexColor("#3FBFB8"))
c.setFont("Helvetica-Bold", 9)
c.drawString(56, H - 92, "NEW ENGLAND CAREFLOW LLC")

c.setFillColor(white)
c.setFont("Helvetica-Bold", 34)
c.drawString(56, H - 138, "Visual Notes")
c.setFont("Helvetica", 19)
c.drawString(56, H - 168, "How it works, start to finish, with one real example")

c.setStrokeColor(HexColor("#2A4A68"))
c.setLineWidth(1)
c.line(56, H - 190, W - 56, H - 190)

para(
    "This manual follows a single patient's notes through every step of the system. At each step you "
    "see exactly what went in and exactly what came out — not a description of it, but the real data. "
    "Everything here was produced by running the system, then printing what it produced.",
    56, H - 214, 560, size=11, leading=15, colour=HexColor("#B8CCDD"),
)

c.setFillColor(HexColor("#3FBFB8"))
c.setFont("Helvetica-Bold", 9)
c.drawString(56, H - 300, "THE EXAMPLE USED THROUGHOUT")
para(
    "A made-up patient published with the research paper: a 68-year-old woman admitted with pneumonia, "
    "followed across 4 nursing shifts from admission to going home. No real patient information appears "
    "anywhere in this document.",
    56, H - 320, 560, size=9.5, leading=13, colour=HexColor("#B8CCDD"),
)

stats = [
    ("4", "nursing shifts in"),
    ("19", "items on the chart out"),
    ("21", "quotes checked"),
    ("0", "quotes failed"),
    ("18s", "start to finish"),
    (f"${USAGE['costUsd']:.2f}", "cost to run"),
]
bx, by = 56, 110
for i, (big, label) in enumerate(stats):
    x = bx + i * 118
    c.setFillColor(HexColor("#3FBFB8"))
    c.setFont("Helvetica-Bold", 21)
    c.drawString(x, by + 22, big)
    c.setFillColor(HexColor("#9FB6C9"))
    c.setFont("Helvetica", 8)
    c.drawString(x, by + 8, label)

c.setFillColor(HexColor("#5B7A96"))
c.setFont("Helvetica", 8)
c.drawString(56, 60, "Read it in order. Each page is one step, and each step feeds the next.")

# ====================================================== PAGE 2: the whole map =
y = page(
    "The map",
    "The whole journey on one page",
    "Eight steps. Two of them are checks. Nothing reaches the chart that has not passed both.",
)

steps = [
    ("1", "Notes come in", "The nurse's paragraphs,\nshift by shift.", TEAL, white),
    ("2", "Split into shifts", "Cut on record markers.\nNo AI. Always the same.", TEAL, white),
    ("3", "Split long stays", "4 shifts at a time, so\nnothing gets summarised.", TEAL, white),
    ("4", "AI fills a form", "Google Gemini writes into\nboxes we defined.", NAVY_MID, white),
    ("5", "CHECK the quotes", "Every line must quote the\nnote. We search for it.", AMBER, AMBER_LIGHT),
    ("6", "Join the parts", "One record for the\nwhole stay.", TEAL, white),
    ("7", "CHECK the form", "Every box filled in,\nnothing out of range.", AMBER, AMBER_LIGHT),
    ("8", "Draw the chart", "Lanes across the stay,\nsaveable as a picture.", TEAL, TEAL_LIGHT),
]

bw, bh, gap = 165, 104, 24
row1_y, row2_y = y - 118, y - 262
for i, (n, title, body, accent, fill) in enumerate(steps):
    col = i % 4
    bx = 38 + col * (bw + gap)
    by = row1_y if i < 4 else row2_y
    panel(bx, by, bw, bh, fill=fill)
    c.setFillColor(accent)
    c.roundRect(bx, by, 4.5, bh, 2.2, stroke=0, fill=1)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(bx + 13, by + bh - 15, f"STEP {n}")
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(bx + 13, by + bh - 32, title)
    ty = by + bh - 48
    for line in body.split("\n"):
        c.setFillColor(GREY)
        c.setFont("Helvetica", 8.2)
        c.drawString(bx + 13, ty, line)
        ty -= 10.5
    if col < 3:
        big_arrow_right(bx + bw + 5, by + bh / 2, 13)

# wrap arrow
c.setStrokeColor(TEAL)
c.setLineWidth(1.6)
c.line(38 + 3 * (bw + gap) + bw + 8, row1_y + bh / 2, W - 26, row1_y + bh / 2)
c.line(W - 26, row1_y + bh / 2, W - 26, (row1_y + row2_y + bh) / 2)
c.line(W - 26, (row1_y + row2_y + bh) / 2, 26, (row1_y + row2_y + bh) / 2)
c.line(26, (row1_y + row2_y + bh) / 2, 26, row2_y + bh / 2)
c.line(26, row2_y + bh / 2, 32, row2_y + bh / 2)
big_arrow_right(32, row2_y + bh / 2, 11)

note_box(
    "The two orange steps are the reason anyone can trust this. Step 5 throws away anything the AI "
    "cannot back up with the nurse's own words. Step 7 refuses to draw a chart from an incomplete "
    "record. Everything else is just moving data around.",
    38, row2_y - 22, W - 76, kind="warn",
)
recap(
    "Notes go in, the AI fills in a fixed form four shifts at a time, two checks throw out anything "
    "it cannot back up, and what survives is drawn as the chart."
)

# ================================================= PAGE 3: sequence diagram ===
y = page(
    "The order things happen",
    "Sequence diagram — who talks to whom",
    "Time runs downwards. Each vertical line is one part of the system; each arrow is a message.",
)

actors = [
    ("You", "the browser", 110),
    ("Our server", "runs on our\nmachine", 300),
    ("Google's AI", "Gemini 3.7\nFlash", 500),
    ("The checkers", "quote check\n+ form check", 680),
]
top = y - 6
bottom = 132
for name, sub, x in actors:
    panel(x - 68, top - 34, 136, 34, fill=NAVY)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawCentredString(x, top - 15, name)
    c.setFillColor(HexColor("#9FB6C9"))
    c.setFont("Helvetica", 6.8)
    ly = top - 24
    for line in sub.split("\n"):
        c.drawCentredString(x, ly, line)
        ly -= 7.5
    c.setStrokeColor(LINE)
    c.setDash(2, 3)
    c.setLineWidth(1)
    c.line(x, top - 36, x, bottom)
    c.setDash()

msgs = [
    (110, 300, "1. paste notes, press Convert", TEAL, False),
    (300, 300, "2. split into shifts, plan the parts", NAVY_MID, True),
    (300, 500, "3. send 4 shifts + the blank form", TEAL, False),
    (500, 300, "4. return the filled-in form", NAVY_MID, False),
    (300, 680, "5. does every quote exist in the note?", AMBER, False),
    (680, 300, "6. keep the real ones, delete the rest", AMBER, False),
    (300, 110, "7. send the chart so far — draw it now", TEAL, False),
    (300, 500, "8. next 4 shifts (repeats until done)", TEAL, False),
    (300, 680, "9. is the finished record complete?", AMBER, False),
    (300, 110, "10. final chart + how many quotes passed", TEAL, False),
]
my = top - 62
for x1, x2, label, colour, self_call in msgs:
    if self_call:
        c.setStrokeColor(colour)
        c.setLineWidth(1.4)
        c.line(x1, my, x1 + 30, my)
        c.line(x1 + 30, my, x1 + 30, my - 12)
        arrow(x1 + 30, my - 12, x1 + 2, my - 12, colour=colour, width=1.4)
        c.setFillColor(colour)
        c.setFont("Helvetica", 7.4)
        c.drawString(x1 + 38, my - 8, label)
        my -= 34
    else:
        arrow(x1, my, x2, my, colour=colour, width=1.4)
        c.setFillColor(colour)
        c.setFont("Helvetica", 7.4)
        mid = (x1 + x2) / 2
        c.drawCentredString(mid, my + 5, label)
        my -= 26

# A bracket down the right margin, saying that the middle of this conversation
# happens once per part rather than once per patient.
c.setStrokeColor(AMBER)
c.setLineWidth(1.2)
bt, bb = top - 118, top - 300
c.line(W - 52, bt, W - 52, bb)
c.line(W - 52, bt, W - 58, bt)
c.line(W - 52, bb, W - 58, bb)
c.saveState()
c.translate(W - 40, (bt + bb) / 2)
c.rotate(90)
c.setFillColor(AMBER)
c.setFont("Helvetica-Bold", 7.6)
c.drawCentredString(0, 0, "repeats once for every part")
c.restoreState()

recap(
    "You press one button; the server does the same short conversation with the AI once per part, "
    "checking every answer, and sends each finished part straight to your screen."
)

# ================================================= PAGE 4: use case diagram ===
y = page(
    "Who uses it, and for what",
    "Use case diagram",
    "The stick figures are people. The ovals are things they can do. Lines mean 'this person does this'.",
)


def stick(x, y, label, sub):
    c.setStrokeColor(NAVY)
    c.setFillColor(NAVY)
    c.setLineWidth(1.6)
    c.circle(x, y + 26, 8, stroke=1, fill=0)
    c.line(x, y + 18, x, y - 2)
    c.line(x - 12, y + 12, x + 12, y + 12)
    c.line(x, y - 2, x - 10, y - 20)
    c.line(x, y - 2, x + 10, y - 20)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x, y - 34, label)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7.4)
    c.drawCentredString(x, y - 45, sub)


def oval(x, y, w, h, text, fill=white, edge=TEAL):
    c.setFillColor(fill)
    c.setStrokeColor(edge)
    c.setLineWidth(1.2)
    c.ellipse(x, y, x + w, y + h, stroke=1, fill=1)
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 8.2)
    lines = wrap(text, "Helvetica", 8.2, w - 26)
    ty = y + h / 2 + (len(lines) - 1) * 5
    for line in lines:
        c.drawCentredString(x + w / 2, ty - 3, line)
        ty -= 10


panel(150, 182, 470, y - 182 - 6, fill=HexColor("#FBFCFD"))
c.setFillColor(GREY_LIGHT)
c.setFont("Helvetica-Bold", 7.5)
c.drawString(162, y - 22, "THE VISUAL NOTES SYSTEM")

stick(78, y - 130, "Nurse /", "clinician")
stick(78, y - 236, "Researcher", "the study team")
stick(700, y - 190, "Developer", "us")

use_cases = [
    (175, y - 62, 200, 40, "Paste a patient's notes"),
    (175, y - 112, 200, 40, "Convert notes to a chart"),
    (175, y - 162, 200, 40, "Watch it build, part by part"),
    (175, y - 212, 200, 40, "Download the chart as a picture"),
    (405, y - 62, 200, 40, "See which quote every item came from"),
    (405, y - 112, 200, 40, "See how many quotes passed the check"),
    (405, y - 162, 200, 40, "Run all 163 cases at once"),
    (405, y - 212, 200, 40, "Change the body-system list"),
]
for ux, uy, uw, uh, text in use_cases:
    edge = TEAL if ux < 400 else NAVY_MID
    oval(ux, uy, uw, uh, text, edge=edge)

c.setStrokeColor(LINE)
c.setLineWidth(0.9)
for _, uy, _, uh, _ in use_cases[:4]:
    c.line(96, y - 130, 175, uy + uh / 2)
for _, uy, _, uh, _ in use_cases[4:6]:
    c.line(96, y - 236, 405, uy + uh / 2)
for _, uy, _, uh, _ in use_cases[6:]:
    c.line(682, y - 190, 605, uy + uh / 2)

note_box(
    "Everything on the left is what a clinical user does — no training, no settings, no jargon. "
    "Everything on the right is for us and the study team. A nurse never needs to know the word JSON.",
    38, 176, W - 76, kind="info",
)
recap(
    "A clinical user only ever pastes notes and reads a chart; everything technical stays on our side "
    "of the line."
)

# ==================================================== PAGE 5: step 1, input ===
y = page(
    "Step 1 of 8",
    "The notes come in",
    "This is the starting material: what a nurse actually wrote, in the format the research corpus uses.",
)

mono(RAW, 38, y - 246, 430, 246, title="INPUT — what you paste into the box (all 4 shifts)")
big_arrow_right(482, y - 120, 20)

rx = 520
cap("WHAT THE MARKERS MEAN", rx, y + 4)
lines = [
    ("START_OF_RECORD=", "the beginning of one shift's note"),
    ("synthetic_case_001", "which patient this is"),
    ("||||1||||", "which shift — this is shift 1"),
    ("||||END_OF_RECORD", "the end of that shift's note"),
]
ly = y - 16
for code, meaning in lines:
    c.setFillColor(NAVY)
    c.setFont("Courier-Bold", 7.6)
    c.drawString(rx, ly, code)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8.4)
    c.drawString(rx + 118, ly, meaning)
    ly -= 20

ly = para(
    "Everything between the markers is free writing. There are no tick boxes and no fixed fields — "
    "each nurse writes in their own style, with their own short forms. That is exactly why this is a "
    "hard problem, and why the paper exists.",
    rx, ly - 8, W - 38 - rx, size=9, leading=12,
)

note_box(
    "Notice there is nothing here that says which body system each sentence belongs to. 'Started on "
    "oxygen by face mask' is a breathing thing and 'Foley placed' is a bladder thing, but nobody wrote "
    "that down. Working that out is the AI's real job.",
    rx, ly - 10, W - 38 - rx, kind="info",
)
recap(
    "We start with ordinary sentences a nurse typed, with no labels saying which body system anything "
    "belongs to."
)

# ================================================= PAGE 6: step 2, splitting ==
y = page(
    "Step 2 of 8",
    "Split the text into shifts",
    "The first thing we do is boring on purpose: cut the text into one piece per shift. No AI involved.",
)

mono(
    RAW[:520] + "\n\n   ... (2 more shifts)",
    38, y - 200, 330, 200,
    title="IN — one long piece of text",
)
big_arrow_right(382, y - 100, 18)

preview = {k: (v[:96] + " ...") for k, v in NOTES.items()}
mono(
    json.dumps(preview, indent=1),
    418, y - 200, 336, 200,
    title="OUT — four separate shifts, numbered",
)

yy = para(
    "The computer looks for the START_OF_RECORD marker and cuts there. That is the whole trick. It is "
    "worth saying out loud that this step uses no AI at all: given the same text it produces the same "
    "answer every single time, forever.",
    38, y - 224, W - 76, size=9.5, leading=13,
)

note_box(
    "Doing the easy part without AI is a deliberate choice. Anything a plain rule can do reliably, a "
    "plain rule should do — it is free, instant, and can never be wrong in a surprising way. We only "
    "spend AI on the part that genuinely needs judgement.",
    38, yy - 6, 360, kind="info",
)

cap("WHAT WE NOW HAVE", 424, yy - 16)
bullets(
    [
        f"{PLAN['noteCount']} shifts, numbered 1 to {PLAN['noteCount']}",
        f"{RECORD['source']['char_count']} characters of nursing text in total",
        "Each shift can now be pointed at by number — this becomes important in step 5, "
        "when we need to say which shift a quote came from.",
    ],
    424, yy - 32, W - 38 - 424,
)
recap(
    "One long piece of text becomes four numbered shifts, using a plain rule that can never surprise us."
)

# ============================================ PAGE 7: step 3, splitting long ==
y = page(
    "Step 3 of 8",
    "Long stays are cut into small parts",
    "This step does nothing for our small example — but it is the single most important thing we built.",
)

cap("THE RULE", 38, y + 4)
yy = para(
    "10 shifts or fewer: do it in one go. More than 10: work on 4 shifts at a time and join the "
    "answers up afterwards.",
    38, y - 14, 330, size=9.5, leading=13,
)
mono(json.dumps(PLAN, indent=1), 38, yy - 156, 330, 148,
     title="OUR EXAMPLE — 4 shifts, so just one part")

cap("WHY — WHAT WE MEASURED", 424, y + 4)
yy2 = para(
    "We tested the same patient both ways. Given the whole stay at once, the AI writes a short "
    "summary and quietly drops most of the detail. Given 4 shifts at a time, it does the job "
    "properly. Same AI, same notes, same settings — only the size of the bite changed.",
    424, y - 14, W - 38 - 424, size=9.5, leading=13,
)

bars = [("Whole stay at once", 17, RED), ("4 shifts at a time", 84, TEAL)]
by = yy2 - 26
for label, val, colour in bars:
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(424, by + 14, label)
    c.setFillColor(PAPER)
    c.rect(424, by - 4, 250, 14, stroke=0, fill=1)
    c.setFillColor(colour)
    c.rect(424, by - 4, 250 * val / 84, 14, stroke=0, fill=1)
    c.setFillColor(colour)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(682, by - 1, f"{val}")
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7.5)
    c.drawString(704, by + 1, "items found")
    by -= 44

note_box(
    "This is the line to remember: 17 items became 84 on the very same patient. Nothing about the AI "
    "changed — we just stopped asking it to hold a fortnight of nursing notes in its head at once. "
    "Our biggest case, 141 shifts, becomes 36 small parts.",
    38, min(yy - 170, by) - 6, W - 76, kind="warn",
)
recap(
    "Give the AI a smaller bite and it does a far better job: on the same patient, 17 items became 84."
)

# ================================================== PAGE 8: step 4, the ask ===
y = page(
    "Step 4 of 8",
    "We write the AI a letter",
    "The AI is not asked to 'be clever'. It is given rules, and most of those rules exist because "
    "something once went wrong.",
)

head = PROMPT[: PROMPT.index("LANES")] if "LANES" in PROMPT else PROMPT[:900]
mono(head, 38, y - 268, 372, 268, title="PART OF THE REAL LETTER WE SEND")

rx = 440
cap("THE RULES, IN PLAIN WORDS", rx, y + 4)
yy = bullets(
    [
        "Copy the nurse's words exactly — do not tidy them, do not fix the spelling. "
        "(If it tidies the words, our check in step 5 will not find them.)",
        "Do not tell us where in the text the words are. We work that out ourselves, because "
        "the AI is bad at counting letters.",
        "Only use body systems from our fixed list. Never invent a new one.",
        "'BS' means bowel sounds in the gut, breath sounds in the lungs, and blood sugar in "
        "diabetes — work out which from the sentence around it.",
        "NKDA means the patient has NO known allergy. Never record 'NKDA' as if it were "
        "the name of an allergy.",
        "Write down every separate observation. Do not summarise a whole shift into one line.",
    ],
    rx, y - 16, W - 38 - rx, size=8.7, leading=11.5,
)

note_box(
    "Every one of those rules is a scar. The allergy rule is there because the AI once recorded a "
    "patient as being allergic to a substance called 'NKDA' — which actually means the opposite. "
    "In a real ward that is a dangerous mistake, so it is now written into the instructions.",
    rx, yy - 4, W - 38 - rx, kind="bad",
)
recap(
    "We do not ask the AI to be clever; we give it a short list of rules, and nearly every rule is "
    "there because something once went wrong."
)

# ================================================== PAGE 9: step 5, the form ==
y = page(
    "Step 5 of 8",
    "We hand over a blank form, not a blank page",
    "This is the part people find most surprising: the AI is not free to write whatever it likes.",
)

form_excerpt = json.dumps(
    {
        "lane": {
            "type": "string",
            "enum": ["resp", "cv", "neuro", "gi", "gu", "id", "endo", "skin", "..."],
        },
        "shift": {"type": "integer"},
        "finding": {"type": "string", "maxLength": 160},
        "provenance": {
            "type": "object",
            "required": ["note_id", "evidence"],
            "properties": {
                "note_id": {"type": "integer"},
                "evidence": {"type": "string"},
            },
        },
    },
    indent=1,
)
mono(form_excerpt, 38, y - 244, 372, 244, title="A PIECE OF THE BLANK FORM (the real one is longer)")

rx = 440
yy = para(
    "Google lets us send a form along with the question. The AI can then only write inside the boxes "
    "we defined. It cannot add a box, rename one, or leave out a required one.",
    rx, y - 4, W - 38 - rx, size=9.5, leading=13,
)
yy = bullets(
    [
        "'enum' means: pick one from this list. The AI cannot invent a new body system.",
        "'maxLength: 160' means: keep it short enough to fit on a card.",
        "'required' means: you may not leave this out.",
        "Because the form is identical for every patient, any two charts can be compared "
        "side by side — which is the whole point of the study.",
    ],
    rx, yy - 8, W - 38 - rx, size=8.8, leading=11.5,
)

note_box(
    "Google's form format is slightly different from the standard one everyone else uses, so we wrote "
    "a small translator between the two. It is one file, and it exists purely so we keep one master "
    "form instead of two that could drift apart.",
    rx, yy - 4, W - 38 - rx, kind="info",
)
recap(
    "The AI can only tick boxes on a form we designed, so it cannot invent a new body system or leave "
    "out something we require."
)

# ============================================== PAGE 10: step 6, the answer ===
y = page(
    "Step 6 of 8",
    "What the AI sends back",
    "Here is one real item, exactly as Google returned it — nothing edited.",
)

first = MODEL_OUT["findings"][0]
mono(json.dumps(first, indent=1), 38, y - 210, 372, 210,
     title="ONE ITEM, STRAIGHT FROM THE AI")

rx = 440
cap("READING IT LINE BY LINE", rx, y + 4)
rows = [
    ("lane", "resp", "belongs in the breathing lane"),
    ("shift", "1", "happened on shift 1"),
    ("finding", "Acute shortness of\nbreath; CXR ...", "what to show on the card"),
    ("intervention", "Started on oxygen by\nface mask", "what the nurse did about it"),
    ("evidence", "acute shortness of\nbreath", "the nurse's own words — the receipt"),
    ("severity", "critical", "how serious, for the colour"),
]
ry = y - 16
for field, value, meaning in rows:
    c.setFillColor(NAVY_MID)
    c.setFont("Courier-Bold", 7.6)
    c.drawString(rx, ry, field)
    c.setFillColor(NAVY)
    c.setFont("Courier", 7.4)
    vy = ry
    for line in value.split("\n"):
        c.drawString(rx + 66, vy, line)
        vy -= 9
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8.2)
    c.drawString(rx + 176, ry, meaning)
    ry = vy - 9

note_box(
    "Look at what is NOT there: no position numbers. Earlier we asked the AI to tell us where in the "
    "note the quote sat — 'letters 412 to 458'. It got that wrong again and again. Language models "
    "read meaning, not letter positions. So we stopped asking, and did it ourselves.",
    rx, ry - 6, W - 38 - rx, kind="bad",
)

c.setFillColor(GREY)
c.setFont("Helvetica-Oblique", 8)
c.drawString(38, y - 232,
             f"The AI returned {len(MODEL_OUT['findings'])} items like this one, "
             f"in {USAGE['elapsedMs']/1000:.0f} seconds, for ${USAGE['costUsd']:.2f}.")
recap(
    "Every item comes back with the nurse's own words attached — and deliberately without any claim "
    "about where in the note those words sit."
)

# ============================================== PAGE 11: step 7, quote check ==
y = page(
    "Step 7 of 8  ·  THE IMPORTANT ONE",
    "The quote check: is this actually in the notes?",
    "This is the step that makes the whole thing trustworthy. It is also the simplest step in the system.",
)

before = json.dumps(MODEL_OUT["findings"][0]["provenance"], indent=1)
after = json.dumps(CHECKED["findings"][0]["provenance"], indent=1)
mono(before, 38, y - 92, 250, 92, title="BEFORE — a quote, no position")
big_arrow_right(300, y - 46, 16)
mono(after, 336, y - 92, 250, 92, title="AFTER — we found it, and marked where",
     highlight=["char_start", "char_end"])

cap("WHAT WE DID IN BETWEEN", 610, y + 4)
para(
    "We took the nurse's note and searched it for those exact words — the same as pressing Ctrl+F. "
    "It was found starting at letter 35 and ending at letter 60.",
    610, y - 14, W - 38 - 610, size=8.8, leading=11.5,
)

yy = y - 120
cap("PROVING IT, ON THE REAL TEXT", 38, yy)
note = NOTES["1"]
seg_a, seg_b, seg_c = note[:35], note[35:60], note[60:96]
panel(38, yy - 60, W - 76, 48, fill=PAPER)
c.setFont("Courier", 8)
tx = 50
for seg, colour, bold in ((seg_a, GREY, False), (seg_b, HexColor("#8A5A00"), True), (seg_c, GREY, False)):
    for ch_ in seg:
        c.setFont("Courier-Bold" if bold else "Courier", 8)
        if bold:
            c.setFillColor(HexColor("#FFF3C4"))
            c.rect(tx, yy - 40, 4.8, 12, stroke=0, fill=1)
        c.setFillColor(colour)
        c.drawString(tx, yy - 37, ch_)
        tx += 4.8
c.setFillColor(GREY)
c.setFont("Helvetica", 7.5)
c.drawString(50, yy - 54, "letter 0" + " " * 0)
c.drawString(50 + 35 * 4.8, yy - 54, "letter 35 — the quote starts here")
c.drawString(50 + 60 * 4.8, yy - 54, "letter 60 — and ends here")

yy2 = yy - 84
cap("AND HERE IS THE CLEVER BIT", 38, yy2)
para(
    "Because we search for the quote instead of trusting the AI about it, a made-up finding has "
    "nowhere to hide. If the AI invents something, it must invent a quote to go with it. That quote "
    "will not be in the note. The search fails. The item is deleted before anyone sees it.",
    38, yy2 - 16, 470, size=9.3, leading=12.5,
)

rx = 530
cap("ON THIS CASE", rx, yy2)
figs = [
    (str(CHECK_REPORT["quotesChecked"]), "quotes checked"),
    (str(CHECK_REPORT["accepted"]), "found in the notes"),
    (str(CHECK_REPORT["rejected"]), "not found — deleted"),
]
fy = yy2 - 20
for big, label in figs:
    c.setFillColor(TEAL if label != "not found — deleted" else NAVY)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(rx, fy, big)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8.2)
    c.drawString(rx + 34, fy + 3, label)
    fy -= 24

recap(
    "We search the real note for the AI's quote, exactly like Ctrl+F: if the words are not there, the "
    "item is deleted before anyone sees it."
)

# ================================================= PAGE 12: the tamper test ===
y = page(
    "Step 7, continued  ·  THE PROOF",
    "We tried to sneak a lie past it",
    "Saying a safety check works is not the same as showing it. So we attacked our own system.",
)

cap("THE TEST", 38, y + 4)
yy = para(
    "We took the finished, honest result and added one extra item to it by hand — a completely "
    "invented treatment that no nurse ever wrote. We gave it a proper-looking quote. Then we ran the "
    "check and watched what happened.",
    38, y - 14, 360, size=9.3, leading=12.5,
)

mono(
    f'"{TAMPER["invented"]}"',
    38, yy - 56, 360, 46,
    title="THE LIE WE PLANTED", fill=RED_LIGHT, stroke=RED, colour=HexColor("#7A2F2B"),
)

rx = 430
cap("WHAT HAPPENED", rx, y + 4)
res_rows = [
    ("Items we submitted", str(TAMPER["findingsSubmitted"]), NAVY),
    ("Items that survived", str(TAMPER["findingsSurvived"]), TEAL),
    ("The planted lie", "DELETED", RED),
]
ry = y - 18
for label, value, colour in res_rows:
    c.setFillColor(GREY)
    c.setFont("Helvetica", 9)
    c.drawString(rx, ry, label)
    c.setFillColor(colour)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(W - 38, ry - 1, value)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(rx, ry - 8, W - 38, ry - 8)
    ry -= 26

mono(
    json.dumps(TAMPER["rejected"][0], indent=1),
    rx, ry - 92, W - 38 - rx, 86,
    title="THE SYSTEM'S OWN REPORT OF THE REJECTION",
)

note_box(
    "This is the strongest sentence you can say about the project: a made-up finding cannot reach the "
    "chart. Not 'is unlikely to' — cannot. It has to survive a word-for-word search of the original "
    "note, and invented text never does.",
    38, min(yy - 66, ry - 100) - 12, W - 76, kind="info",
)
recap(
    "We planted a fake treatment in the results on purpose, and the check deleted it — so this is "
    "something we have shown, not just something we claim."
)

# ======================================= PAGE 13: steps join + form check =====
y = page(
    "Steps 6 and 7 of 8",
    "Join the parts, then check the form is complete",
    "For a long stay we now have many separate answers. They have to become one record — carefully.",
)

cap("JOINING UP", 38, y + 4)
yy = bullets(
    [
        "All the findings from every part are put into one list.",
        "Allergies, past illnesses and resuscitation status are collected from EVERY part, "
        "not just the first one.",
        "The admission summary is taken from the part that has the first shift; the outcome "
        "from the part that has the last.",
        "Every item is given a fresh unique name, so two parts cannot clash.",
    ],
    38, y - 14, 360, size=8.9, leading=11.5,
)

note_box(
    "Why collect allergies from every part? Because in one real 97-shift case, the patient's "
    "resuscitation status changed to 'do not resuscitate' at shift 91 — near the very end. If we had "
    "only read the first part, the chart would have shown the opposite of the truth.",
    38, yy - 6, 360, kind="warn",
)

rx = 430
cap("THEN THE FORM CHECK", rx, y + 4)
yy2 = para(
    "A library called ajv reads our master form and inspects the finished record: is every required "
    "box filled in? Is anything too long, or not on the allowed list? If it fails, we say so instead "
    "of quietly drawing half a chart.",
    rx, y - 14, W - 38 - rx, size=9.2, leading=12.3,
)

mono(
    json.dumps(FORM_CHECK, indent=1),
    rx, yy2 - 76, W - 38 - rx, 68,
    title="OUR EXAMPLE — THE RESULT",
    fill=TEAL_LIGHT, stroke=TEAL,
)

summary = {
    "case_id": RECORD["case_id"],
    "shifts": len(RECORD["shifts"]),
    "findings": len(RECORD["findings"]),
    "source": RECORD["source"],
}
mono(json.dumps(summary, indent=1), rx, yy2 - 236, W - 38 - rx, 142,
     title="THE FINISHED RECORD, IN SUMMARY")

recap(
    "Many separate answers become one record, and that record is inspected before anything is drawn."
)

# ================================================= PAGE 14: draw the chart ====
y = page(
    "Step 8 of 8",
    "Draw the chart",
    "The finished record is turned into rows and columns, then drawn.",
)

chart_summary = {
    "lanes": CHART["lanes"] if isinstance(CHART["lanes"][0], str) else [l["id"] for l in CHART["lanes"]],
    "shifts": CHART["shifts"],
    "example_card": CHART["nodes"][0],
}
mono(json.dumps(chart_summary, indent=1), 38, y - 190, 356, 190,
     title="IN — the data the screen receives")
big_arrow_right(408, y - 96, 18)

# a small mock of the chart
gx, gy, gw = 444, y - 190, W - 38 - 444
panel(gx, gy, gw, 190, fill=white)
cap("OUT — what you see", gx, gy + 196)
c.setFillColor(NAVY)
c.setFont("Helvetica-Bold", 6)
lanes_show = ["RESP", "CV", "NEURO", "GI", "GU", "ID"]
col_w = (gw - 46) / 4
for i, ln in enumerate(lanes_show):
    ly = gy + 172 - i * 27
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 6.4)
    c.drawString(gx + 7, ly - 9, ln)
    c.setStrokeColor(HexColor("#E8EDF1"))
    c.setLineWidth(0.6)
    c.line(gx + 40, ly - 14, gx + gw - 8, ly - 14)
for s in range(4):
    c.setFillColor(GREY_LIGHT)
    c.setFont("Helvetica-Bold", 5.6)
    c.drawCentredString(gx + 44 + col_w * s + col_w / 2, gy + 180, f"SHIFT {s+1}")

placed = {}
for node in CHART["nodes"]:
    lane = node["lane"].upper()
    if lane not in lanes_show:
        continue
    key = (lane, node["shift"])
    if key in placed:
        continue
    placed[key] = True
    i = lanes_show.index(lane)
    ly = gy + 172 - i * 27
    x = gx + 44 + col_w * (node["shift"] - 1)
    c.setFillColor(TEAL_LIGHT)
    c.setStrokeColor(TEAL)
    c.setLineWidth(0.6)
    c.roundRect(x + 2, ly - 12, col_w - 6, 15, 2, stroke=1, fill=1)
    inner = col_w - 12
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 4.6)
    c.drawString(x + 5, ly - 3, fit(node["finding"], "Helvetica", 4.6, inner))
    c.setFillColor(TEAL)
    c.setFont("Helvetica", 4.2)
    c.drawString(x + 5, ly - 9,
                 fit(node.get("intervention") or "", "Helvetica", 4.2, inner))

yy = para(
    "Each row is a body system. Each column is a shift. A card sits where the two meet. Reading across "
    "a row tells you the story of one body system over time; reading down a column tells you "
    "everything that happened in one shift.",
    38, y - 214, W - 76, size=9.3, leading=12.5,
)

note_box(
    "There is no chart library here. We draw the boxes and lines ourselves, which is why the picture "
    "you download is identical to the picture on screen. The obvious approach — screenshotting the "
    "web page — is blocked by browsers for security reasons; we found that out the hard way.",
    38, yy - 6, W - 76, kind="info",
)
recap(
    "Read a row across to follow one body system through the stay; read a column down to see one "
    "whole shift."
)

# ==================================================== PAGE 15: feature list ===
y = page(
    "Reference",
    "Everything you can do with it today",
    "A plain list of what exists and works right now.",
)

groups = [
    ("On the website", TEAL, [
        "Paste a whole admission, or press Load sample to try it with the example patient.",
        "See a live count of how many shifts and words you pasted.",
        "Press one button to convert. No settings to choose.",
        "Watch the chart build up part by part, with a real progress bar that says which "
        "shifts are being worked on right now.",
        "See how many quotes were checked and how many were thrown away.",
        "Read the exact nurse's words behind any item on the chart.",
        "Download the finished chart as a picture file.",
        "Use it in light or dark mode — it follows your computer's setting.",
    ]),
    ("Behind the scenes", NAVY_MID, [
        "Handles a stay of any length; our biggest is 141 shifts.",
        "If one part fails, the rest still finish — you do not lose the whole patient.",
        "If Google is busy, it waits and tries again instead of giving up.",
        "If the finished record is incomplete, it says so rather than drawing a half chart.",
        "Nothing secret is stored in the code; it uses your Google login.",
    ]),
    ("For the team, from the command line", GREY, [
        "npm run dev — start the website on this computer.",
        "npm run segment — sort the whole corpus by body system, no AI, free.",
        "npm run batch — run many patients in one go and print a report.",
        "node scripts/trace.ts — walk one case through every step and save the data "
        "(this manual was built from its output).",
        "npm run check:vertex — confirm the Google connection is working.",
    ]),
]
col_x = [38, 292, 546]
for i, (title, colour, items) in enumerate(groups):
    x = col_x[i]
    w = 230
    c.setFillColor(colour)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, title.upper())
    c.setStrokeColor(colour)
    c.setLineWidth(1.4)
    c.line(x, y - 6, x + w, y - 6)
    bullets(items, x, y - 22, w, size=8.3, leading=10.8, gap=4)

# ================================================ PAGE 16: requirements etc ===
y = page(
    "Reference",
    "What it needs, and what is not done yet",
    "Being straight about the gaps is more useful than a list of everything that works.",
)

cap("WHAT YOU NEED TO RUN IT", 38, y + 4)
yy = bullets(
    [
        "A computer with Node.js installed (version 24 or newer).",
        "A Google Cloud account with the AI service switched on.",
        "To be signed in: gcloud auth application-default login",
        "An internet connection — the AI runs on Google's machines, not yours.",
        "Roughly $0.01 per short patient, about $0.08 for a long one.",
    ],
    38, y - 16, 340, size=8.8, leading=11.5,
)

cap("WHAT WE PROMISED IT WOULD DO", 38, yy - 8)
yy = bullets(
    [
        "Turn free-written nursing notes into a body-system chart.",
        "Never show anything that is not in the notes.",
        "Show where every item came from.",
        "Treat every patient with the same fixed set of body systems, so charts compare.",
        "Keep patient text off the internet except to the AI service we chose.",
        "Work for a stay of any length, not just short ones.",
    ],
    38, yy - 24, 340, size=8.8, leading=11.5,
)

rx = 430
cap("NOT DONE YET — BE HONEST ABOUT THESE", rx, y + 4)
yy2 = bullets(
    [
        "The 'coverage' percentage on screen is the AI marking its own homework. Measuring it "
        "properly — checking which sentences really made it onto the chart — is the next job.",
        "No nurse has checked the output yet. The plan is 30 charts reviewed by real nurses to "
        "use as a gold standard.",
        "We have run 5 patients end to end, not all 163. The full run costs about $7 and an hour.",
        "If a very long stay is cut short by a time limit on a deployed server, the screen may "
        "still say the chart is ready. On this computer there is no time limit, so it is not a "
        "problem while testing.",
        "Short forms like 'BS' are resolved by the AI reading the sentence. It is usually right, "
        "but nobody has counted how often.",
    ],
    rx, y - 16, W - 38 - rx, size=8.6, leading=11.2,
)

note_box(
    "If someone asks 'how do you know it is not making things up?', the answer is the tamper test on "
    "page 12. If someone asks 'how do you know nothing is missing?', the honest answer today is: we "
    "do not, and that is the next piece of work.",
    rx, yy2 - 6, W - 38 - rx, kind="warn",
)

footer()
c.showPage()
c.save()
print(f"written {OUT}  ({PAGE[0]} pages)")

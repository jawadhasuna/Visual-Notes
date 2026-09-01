"""
One-page architecture diagram for the Visual Notes pipeline.

Written for a non-technical reader: every box says what happens in plain
words, and the numbers at the bottom are measured, not estimated.
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.colors import HexColor, white

W, H = landscape(letter)          # 792 x 612
NAVY = HexColor("#07203A")
NAVY_MID = HexColor("#123C63")
TEAL = HexColor("#00857F")
TEAL_LIGHT = HexColor("#E6F5F4")
GREY = HexColor("#5A6B7B")
LINE = HexColor("#C4CFD9")
AMBER = HexColor("#B57A1E")
AMBER_LIGHT = HexColor("#FDF4E3")

c = canvas.Canvas("Visual_Notes_Architecture.pdf", pagesize=(W, H))
c.setTitle("Visual Notes - how the pipeline works")


def wrap(text, font, size, width):
    """Greedy wrap on the real rendered width."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if c.stringWidth(trial, font, size) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def para(text, x, y, width, font="Helvetica", size=8.2, leading=10.2, colour=GREY):
    c.setFont(font, size)
    c.setFillColor(colour)
    for i, line in enumerate(wrap(text, font, size, width)):
        c.drawString(x, y - i * leading, line)
    return y - (len(wrap(text, font, size, width)) - 1) * leading


def step(n, title, body, x, y, w, h, accent=TEAL, fill=white):
    """A numbered stage box."""
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 7, stroke=1, fill=1)

    # Accent bar down the left edge carries the step colour.
    c.setFillColor(accent)
    c.roundRect(x, y, 4.5, h, 2.2, stroke=0, fill=1)

    # Step number
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x + 14, y + h - 15, f"STEP {n}")

    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 11)
    ty = y + h - 30
    for line in wrap(title, "Helvetica-Bold", 11, w - 26):
        c.drawString(x + 14, ty, line)
        ty -= 13

    para(body, x + 14, ty - 3, w - 26)


def arrow_right(x1, x2, y):
    c.setStrokeColor(TEAL)
    c.setFillColor(TEAL)
    c.setLineWidth(1.6)
    c.line(x1, y, x2 - 6, y)
    p = c.beginPath()
    p.moveTo(x2, y)
    p.lineTo(x2 - 7, y + 4)
    p.lineTo(x2 - 7, y - 4)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def arrow_elbow(x1, y1, x2, y2):
    """Right edge of the top row, wrapping down to the left of the next row."""
    c.setStrokeColor(TEAL)
    c.setFillColor(TEAL)
    c.setLineWidth(1.6)
    mid = (y1 + y2) / 2
    c.line(x1, y1, x1 + 16, y1)
    c.line(x1 + 16, y1, x1 + 16, mid)
    c.line(x1 + 16, mid, x2 - 16, mid)
    c.line(x2 - 16, mid, x2 - 16, y2)
    c.line(x2 - 16, y2, x2 - 6, y2)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - 7, y2 + 4)
    p.lineTo(x2 - 7, y2 - 4)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


# ------------------------------------------------------------------ header --
c.setFillColor(NAVY)
c.setFont("Helvetica-Bold", 19)
c.drawString(38, H - 46, "Visual Notes — how a written nursing note becomes a chart")

c.setFont("Helvetica", 9.6)
c.setFillColor(GREY)
c.drawString(
    38,
    H - 63,
    "Eight steps. Two of them are checks, and nothing reaches the chart that has not passed both.",
)

c.setStrokeColor(LINE)
c.setLineWidth(0.8)
c.line(38, H - 76, W - 38, H - 76)

# ------------------------------------------------------------- top row (1-4) -
BW, BH, GAP = 165, 136, 24
top_y = H - 232
xs = [38 + i * (BW + GAP) for i in range(4)]

step(
    1,
    "The notes come in",
    "One patient's whole hospital stay, written the way nurses write it — "
    "Shift 1, Shift 2, all the way to Shift N. Paragraphs, not tick boxes.",
    xs[0], top_y, BW, BH,
)
step(
    2,
    "Split into shifts and body systems",
    "The text is cut up using the nurse's own headings — RESP, CV, GI, GU, "
    "NEURO, ID. No AI is used here, so it gives the same answer every time.",
    xs[1], top_y, BW, BH,
)
step(
    3,
    "Long stays are done in small parts",
    "A stay longer than 10 shifts is handled 4 shifts at a time. Asked to read "
    "everything at once, the AI writes a short summary and loses the detail.",
    xs[2], top_y, BW, BH,
)
step(
    4,
    "The AI fills in a fixed form",
    "Google's Gemini 3.7 Flash turns each part into structured data (JSON). "
    "The form is the same for every patient, so any two charts compare directly.",
    xs[3], top_y, BW, BH, accent=NAVY_MID,
)

for i in range(3):
    arrow_right(xs[i] + BW, xs[i + 1], top_y + BH / 2)

# ---------------------------------------------------------- bottom row (5-8) -
bot_y = top_y - BH - 58

step(
    5,
    "CHECK: every line must quote the note",
    "Each item has to repeat the nurse's words exactly, and the computer then "
    "looks for those words in the note. If they are not there, the item is "
    "thrown away. An invented finding cannot survive this step.",
    xs[0], bot_y, BW, BH, accent=AMBER, fill=AMBER_LIGHT,
)
step(
    6,
    "The parts are joined back together",
    "One record for the whole stay. Allergies, past history and code status are "
    "gathered from every part, not just the first, because they can change late "
    "in a long admission.",
    xs[1], bot_y, BW, BH,
)
step(
    7,
    "CHECK: the record is complete",
    "The finished record is measured against the fixed form — every required "
    "field present, nothing out of range. A record that fails is reported, not "
    "quietly drawn as half a chart.",
    xs[2], bot_y, BW, BH, accent=AMBER, fill=AMBER_LIGHT,
)
step(
    8,
    "The chart is drawn",
    "Body-system lanes running across the stay. It appears part by part while "
    "the work is still running, and can be saved as an image for handover.",
    xs[3], bot_y, BW, BH, accent=TEAL, fill=TEAL_LIGHT,
)

for i in range(3):
    arrow_right(xs[i] + BW, xs[i + 1], bot_y + BH / 2)

arrow_elbow(xs[3] + BW, top_y + BH / 2, xs[0], bot_y + BH / 2)

# --------------------------------------------------------------- result band -
band_y = 58
c.setFillColor(HexColor("#F4F7F9"))
c.setStrokeColor(LINE)
c.roundRect(38, band_y, W - 76, 74, 7, stroke=1, fill=1)

c.setFillColor(NAVY)
c.setFont("Helvetica-Bold", 9)
c.drawString(52, band_y + 58, "MEASURED ON A REAL 15-SHIFT ADMISSION")

figures = [
    ("84", "items on the chart", "was 17 before step 3"),
    ("113", "quotes checked", "against the original notes"),
    ("0", "items rejected", "nothing failed the check"),
    ("2 min", "to build the chart", "chart appears as it goes"),
    ("$0.08", "cost per patient", "about $7 for all 163 cases"),
]
col_w = (W - 76 - 28) / len(figures)
for i, (big, label, sub) in enumerate(figures):
    x = 52 + i * col_w
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(x, band_y + 30, big)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, band_y + 19, label)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7.2)
    c.drawString(x, band_y + 9, sub)

# ------------------------------------------------------------------- caveat --
para(
    "Still open: the screen also shows a coverage percentage — how much of the note made it onto the "
    "chart. That figure is the AI's own estimate of its own work, so it is not yet a number to rely on. "
    "Measuring it independently is the next piece of work.",
    38, 40, W - 76, font="Helvetica-Oblique", size=7.6, leading=9.6,
)

c.setFillColor(HexColor("#8695A4"))
c.setFont("Helvetica", 7)
c.drawRightString(W - 38, 16, "New England CareFlow LLC  ·  Visual Notes pipeline")

c.showPage()
c.save()
print("written")

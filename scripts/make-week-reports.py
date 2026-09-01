"""
Generate the two progress reports that accompany the hour logs.

  python scripts/make-week-reports.py [OUT_DIR]

Report 1 covers week 1 (the reading week). Report 2 covers weeks 2 and 3
together (planning, design and build). Figures quoted from the study come from
docs/NASA_TLX_Numerical_Walkthrough.pdf; figures quoted about the system come
from the trace and batch runs, not from memory.
"""

import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether,
)

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")

NAVY = colors.HexColor("#07203A")
NAVY_MID = colors.HexColor("#123C63")
TEAL = colors.HexColor("#00857F")
TEAL_PALE = colors.HexColor("#E6F5F4")
GREY = colors.HexColor("#4A5C6E")
GREY_LIGHT = colors.HexColor("#8A99A8")
RULE = colors.HexColor("#C4CFD9")
PAPER = colors.HexColor("#F4F7F9")
AMBER_PALE = colors.HexColor("#FDF4E3")
AMBER = colors.HexColor("#B57A1E")

base = getSampleStyleSheet()

S = {
    "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold",
                            fontSize=21, leading=25, textColor=NAVY, alignment=0,
                            spaceAfter=2),
    "sub": ParagraphStyle("sub", parent=base["Normal"], fontName="Helvetica",
                          fontSize=11.5, leading=15, textColor=GREY, spaceAfter=14),
    "kicker": ParagraphStyle("kicker", parent=base["Normal"], fontName="Helvetica-Bold",
                             fontSize=8, leading=11, textColor=TEAL, spaceAfter=6),
    "h1": ParagraphStyle("h1", parent=base["Normal"], fontName="Helvetica-Bold",
                         fontSize=13.5, leading=17, textColor=NAVY,
                         spaceBefore=16, spaceAfter=6),
    "h2": ParagraphStyle("h2", parent=base["Normal"], fontName="Helvetica-Bold",
                         fontSize=10.5, leading=14, textColor=NAVY_MID,
                         spaceBefore=11, spaceAfter=4),
    "body": ParagraphStyle("body", parent=base["Normal"], fontName="Helvetica",
                           fontSize=9.7, leading=14, textColor=GREY,
                           alignment=TA_JUSTIFY, spaceAfter=7),
    "bullet": ParagraphStyle("bullet", parent=base["Normal"], fontName="Helvetica",
                             fontSize=9.7, leading=13.5, textColor=GREY,
                             leftIndent=14, bulletIndent=3, spaceAfter=4),
    "note": ParagraphStyle("note", parent=base["Normal"], fontName="Helvetica",
                           fontSize=9.2, leading=13, textColor=NAVY, spaceAfter=0),
    "cell": ParagraphStyle("cell", parent=base["Normal"], fontName="Helvetica",
                           fontSize=8.8, leading=11.8, textColor=GREY),
    "cellh": ParagraphStyle("cellh", parent=base["Normal"], fontName="Helvetica-Bold",
                            fontSize=8.8, leading=11.8, textColor=colors.white),
}


def P(text, style="body"):
    return Paragraph(text, S[style])


def B(items):
    return [Paragraph(t, S["bullet"], bulletText="•") for t in items]


def table(rows, widths, align_right=None, head=True):
    data = []
    for r, row in enumerate(rows):
        cells = []
        for i, cell in enumerate(row):
            st = "cellh" if (head and r == 0) else "cell"
            cells.append(Paragraph(str(cell), S[st]))
        data.append(cells)

    # repeatRows keeps the header with the rows if a table breaks over a page.
    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1 if head else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
    ]
    if head:
        style += [("BACKGROUND", (0, 0), (-1, 0), NAVY)]
        style += [("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER])]
    else:
        style += [("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, PAPER])]
    if align_right:
        for col in align_right:
            style.append(("ALIGN", (col, 0), (col, -1), "RIGHT"))
    t.setStyle(TableStyle(style))
    return t


def callout(text, kind="info"):
    fill = TEAL_PALE if kind == "info" else AMBER_PALE
    edge = TEAL if kind == "info" else AMBER
    head = "WHY THIS MATTERED" if kind == "info" else "NOTE"
    inner = [
        Paragraph(f'<font color="{edge.hexval()}" size="7.5"><b>{head}</b></font>',
                  S["note"]),
        Spacer(1, 3),
        Paragraph(text, S["note"]),
    ]
    t = Table([[inner]], colWidths=[6.9 * inch], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.8, edge),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return t


def build(filename, title, subtitle, meta_rows, story_body):
    doc = BaseDocTemplate(
        str(OUT / filename), pagesize=letter,
        leftMargin=52, rightMargin=52, topMargin=52, bottomMargin=52,
        title=title.replace("<br/>", " "), author="Jawad Hassan",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")

    def decorate(canv, _doc):
        canv.saveState()
        canv.setStrokeColor(RULE)
        canv.setLineWidth(0.6)
        canv.line(52, 44, letter[0] - 52, 44)
        canv.setFillColor(GREY_LIGHT)
        canv.setFont("Helvetica", 7.4)
        canv.drawString(52, 32, "Visual Notes  ·  New England CareFlow LLC  ·  Jawad Hassan")
        canv.drawRightString(letter[0] - 52, 32, f"page {canv.getPageNumber()}")
        canv.restoreState()

    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=decorate)])

    story = [
        P("PROGRESS REPORT", "kicker"),
        P(title, "title"),
        P(subtitle, "sub"),
        table(meta_rows, [1.55 * inch, 5.35 * inch], head=False),
        Spacer(1, 4),
    ]
    story += story_body
    doc.build(story)
    print(f"written {filename}")


# ============================================================== REPORT ONE ===
week1 = []

week1 += [
    P("1. What this week covered", "h1"),
    P(
        "This first week was reading and orientation. There was an introductory meeting about the "
        "project, and then detailed study of the preprint paper the project is based on, together "
        "with the NASA-TLX instrument and the statistics used to analyse it. No code was written "
        "this week; the aim was to understand what the study actually claims, how it measured that "
        "claim, and what part of it I would be responsible for building.",
    ),

    P("2. The paper", "h1"),
    P(
        "The paper is a pilot study comparing two ways of presenting the same intensive-care nursing "
        "documentation. In the first condition, nurses read a patient's admission as conventional "
        "written notes (WN) - narrative paragraphs written shift by shift. In the second, they read "
        "the same admission presented as a structured visual note (VN), where the information is "
        "arranged by body system across the stay.",
    ),
    P(
        "The design is within-subject: every nurse saw both formats, so each participant acts as "
        "their own control. Forty-one registered critical-care nurses took part. After reading each "
        "format they rated their perceived workload, and the two ratings per nurse were then "
        "compared.",
    ),
    P("What I made sure I understood", "h2"),
    *B([
        "The study measures <b>perceived workload</b> - how hard the task felt - not accuracy, "
        "speed, or clinical outcome. It does not claim that nurses made better decisions.",
        "Because every nurse saw both formats, differences between individual nurses cancel out. "
        "This is what makes a sample of 41 usable.",
        "It is described as a pilot study. The finding is encouraging rather than settled.",
    ]),

    P("3. NASA-TLX, in detail", "h1"),
    P(
        "NASA-TLX is a standard questionnaire for measuring how much mental workload a task imposes. "
        "It asks the person to rate six separate aspects of the experience, each on a scale from 0 "
        "to 100.",
    ),
    table(
        [
            ["Subscale", "What it asks"],
            ["Mental demand", "How much thinking, deciding and searching was needed"],
            ["Physical demand", "How much physical activity was required"],
            ["Temporal demand", "How much time pressure was felt"],
            ["Performance", "How successful the person felt they were"],
            ["Effort", "How hard they had to work to reach that level"],
            ["Frustration", "How irritated, stressed or discouraged they felt"],
        ],
        [1.75 * inch, 5.15 * inch],
    ),
    Spacer(1, 9),
    P("Raw TLX rather than weighted TLX", "h2"),
    P(
        "The original instrument includes a pairwise weighting step, where the participant ranks the "
        "six subscales against each other to say which matter most for that task. This study uses "
        "<b>raw TLX</b>, which skips that step and simply averages the six ratings:",
    ),
    callout(
        "Raw TLX = (sum of all six ratings) / 6. For example, ratings of 60, 10, 40, 30, 50 and 20 "
        "give 210 / 6 = 35 out of 100. Each nurse ends up with two such scores - one for written "
        "notes and one for visual notes.",
    ),
    Spacer(1, 8),
    P(
        "Raw TLX is widely used and is generally accepted as giving results close to the weighted "
        "version, while being far quicker for participants. Knowing which variant was used matters, "
        "because the two are not directly comparable across studies.",
    ),

    P("4. The statistics", "h1"),
    P(
        "The two scores per nurse are compared using the <b>Wilcoxon signed-rank test</b>. I worked "
        "through the full numerical example to be sure I understood it rather than just recognising "
        "the name.",
    ),
    *B([
        "It is a <b>paired</b> test: it looks at the difference within each nurse, not at two "
        "separate groups of people.",
        "It is <b>nonparametric</b>: it does not assume the scores follow a normal distribution, "
        "which suits a small sample of subjective ratings.",
        "It works on <b>ranks</b>. The differences are sorted by size, ranked, and the ranks for "
        "improvements and worsenings are summed separately. If the format made no difference, "
        "those two sums should be roughly equal.",
        "The test statistic is the smaller of the two sums. A very small value means the "
        "improvements were both more numerous and larger than the worsenings.",
    ]),

    P("5. The results I studied", "h1"),
    P("Overall workload", "h2"),
    table(
        [
            ["Condition", "Mean NASA-TLX (0-100)"],
            ["Written notes (WN)", "54.95"],
            ["Visual notes (VN)", "30.68"],
            ["<b>Mean reduction</b>", "<b>24.27 points, a 44.2% drop</b>"],
            ["Significance", "P &lt; .001"],
        ],
        [3.2 * inch, 3.7 * inch],
    ),
    Spacer(1, 10),
    P("All six subscales", "h2"),
    table(
        [
            ["Subscale", "Mean difference", "P-value", "Relative reduction"],
            ["Mental demand", "5.44", "P &lt; .001", "44.7%"],
            ["Physical demand", "2.41", "P = .020", "48.8%"],
            ["Temporal demand", "4.76", "P &lt; .001", "49.6%"],
            ["Performance-related workload", "1.39", "P = .041", "-"],
            ["Effort", "4.63", "P &lt; .001", "-"],
            ["Frustration", "5.63", "P &lt; .001", "55.7%"],
        ],
        [2.5 * inch, 1.35 * inch, 1.15 * inch, 1.9 * inch],
    ),
    Spacer(1, 9),
    P(
        "Every subscale improved with the visual format. Frustration showed the largest relative "
        "reduction at 55.7%. Performance-related workload was the weakest result: the smallest "
        "difference, and a P-value of .041 that sits close to the .05 cutoff. I noted this as the "
        "part of the finding that is least secure.",
    ),
    P("Reliability check", "h2"),
    P(
        "Cronbach's alpha was 0.879 for written notes and 0.830 for visual notes. Both are above the "
        "0.7 to 0.8 range usually treated as good internal consistency, which means the six "
        "subscales behaved coherently as a single measure of workload in both conditions.",
    ),

    P("6. What this means for my part of the project", "h1"),
    P(
        "The study establishes that the visual format helps. What it does not address is how the "
        "visual note gets produced: in the study the charts were prepared by hand. My part of the "
        "project is to build the system that turns written nursing notes into that visual format "
        "automatically.",
    ),
    P("Requirements I took from the paper", "h2"),
    *B([
        "The chart must use a <b>fixed set of body systems</b>, identical for every patient, or "
        "charts cannot be compared with each other.",
        "Nothing may be lost in the conversion. If the visual note quietly drops information, a "
        "lower workload score would be meaningless - it would just be less to read.",
        "Nothing may be invented. Anything shown on the chart must be traceable back to the words "
        "a nurse actually wrote.",
        "The chart has to hold a whole admission, not a single shift, because the value comes from "
        "seeing the trajectory over time.",
    ]),
    Spacer(1, 8),
    callout(
        "These four points became the design constraints for everything built in weeks 2 and 3, and "
        "the second and third of them are the reason the system checks every extracted item against "
        "the original note before it is allowed onto the chart.",
    ),
]

build(
    "Week_1_Report.pdf",
    "Week 1: understanding the study",
    "Reading the preprint paper, the NASA-TLX instrument and the statistics behind the "
    "published result.",
    [
        ["<b>Period</b>", "Monday 10 August 2026 to Sunday 16 August 2026"],
        ["<b>Hours</b>", "2.5 hours"],
        ["<b>Activity</b>", "Project meeting; detailed study of the preprint paper and NASA-TLX"],
        ["<b>Output</b>", "Understanding of the study design, the measure, and the requirements "
                          "it places on the system to be built"],
    ],
    week1,
)


# ============================================================== REPORT TWO ===
week23 = []

week23 += [
    P("1. Summary", "h1"),
    P(
        "Across these two weeks the project moved from reading about the study to having a working "
        "system. Week 2 was spent understanding the data, choosing the tools and designing the "
        "approach. Week 3 was spent building it: the website, the connection to Google's AI service, "
        "and the checks that make the output trustworthy. By the end of week 3 a complete patient "
        "admission could be pasted in and converted into a body-system chart, and the largest case "
        "in the corpus - 141 shifts - had been processed successfully.",
    ),
    table(
        [
            ["Week", "Focus", "Hours"],
            ["Week 2 (17-23 Aug)", "Understanding the data, choosing tools, designing the system", "7.0"],
            ["Week 3 (24-30 Aug)", "Building the website, connecting the AI, testing and fixing", "7.0"],
            ["<b>Total</b>", "", "<b>14.0</b>"],
        ],
        [1.8 * inch, 3.9 * inch, 1.2 * inch],
        align_right=[2],
    ),

    P("Part A - Understanding the data (week 2)", "h1"),

    P("Step 1. Reading the corpus", "h2"),
    P(
        "The data is a de-identified collection of intensive-care nursing notes from PhysioNet. I "
        "worked out how it is organised: each note is wrapped in markers that give the patient "
        "identifier and the shift number, and the text between them is free writing with no fixed "
        "fields. Counting through it gave the shape of the problem: <b>163 patients and 2,434 "
        "shifts in total</b>, with a median of 8 shifts per patient but a longest stay of 141.",
    ),
    callout(
        "That spread turned out to matter more than anything else. A method that works on the median "
        "8-shift patient can still fail completely on the 141-shift one, which is exactly what "
        "happened later and had to be fixed.",
    ),
    Spacer(1, 8),

    P("Step 2. Learning the clinical shorthand", "h2"),
    P(
        "Nursing notes are written in heavy abbreviation. I went through the corpus building an "
        "understanding of the shorthand and produced a reference sheet of the terms that appear, "
        "grouped by body system. I also identified the abbreviations that are genuinely ambiguous - "
        "the same letters meaning different things depending on context.",
    ),
    table(
        [
            ["Short form", "Can mean", "Resolved by"],
            ["BS", "Bowel sounds, breath sounds, or blood sugar", "Which body system the sentence is about"],
            ["MS", "Morphine sulfate, or mental status", "Whether it is a drug or an assessment"],
            ["PT", "Patient, or prothrombin time", "Whether the context is blood results"],
            ["DC", "Discontinued, or discharged", "Whether a treatment or the patient is meant"],
        ],
        [0.9 * inch, 3.0 * inch, 3.0 * inch],
    ),
    Spacer(1, 9),

    P("Step 3. Deciding the body-system list", "h2"),
    P(
        "Rather than guessing which lanes the chart should have, I counted how often each body-system "
        "heading actually appears across all 163 cases. The counts decided the list, and headings "
        "that different nurses write differently were mapped onto one another so they do not split "
        "into separate lanes.",
    ),
    table(
        [
            ["Heading", "Times it appears"],
            ["RESP (breathing)", "1,012"],
            ["GI (digestive)", "926"],
            ["NEURO (nervous system)", "873"],
            ["CV (heart and circulation)", "822"],
            ["GU (kidneys and bladder)", "779"],
            ["ID (infection)", "513"],
            ["SKIN", "454"],
            ["SOCIAL (family and communication)", "386"],
            ["ENDO (hormones, blood sugar)", "196"],
        ],
        [4.3 * inch, 2.6 * inch],
        align_right=[1],
    ),

    P("Part B - Choosing the tools (week 2)", "h1"),
    P("Step 4. Researching which AI model to use", "h2"),
    P(
        "The starting assumption had been to use an Anthropic API key, but the company already has "
        "Google Cloud, so I researched what was available there instead. I went through Google Cloud "
        "Model Garden and compared the realistic options against four things: cost per patient, how "
        "much text the model can read at once, whether it can be forced to return data in a fixed "
        "structure rather than free prose, and whether it can be used without managing servers.",
    ),
    P(
        "The decision was <b>Gemini 3.7 Flash on Vertex AI</b>. It reads up to a million words of "
        "context, it supports forced structured output, it is served without any infrastructure to "
        "maintain, and at the introductory rate it costs roughly one cent for a short patient.",
    ),
    *B([
        "I also considered fine-tuning a smaller open model on the corpus. I ruled it out for now: "
        "it needs labelled training data that does not exist yet, and the structured-output "
        "approach already constrains the model in the way fine-tuning would have been used for.",
        "Authentication was set up through the Google Cloud command line tool, so no password or "
        "key file is stored anywhere in the project.",
    ]),

    P("Part C - Designing the system (week 2)", "h1"),

    P("Step 5. Designing the fixed form (schema)", "h2"),
    P(
        "The central design decision was that the AI would not be asked to 'write some structured "
        "data'. Instead it is given a <b>blank form</b> it must fill in, and it cannot add a field, "
        "rename one, or leave out a required one. I wrote that form to cover the body-system lanes, "
        "the findings and interventions in each, and - as first-class fields rather than "
        "afterthoughts - allergies, past medical history and resuscitation status.",
    ),
    P(
        "Every item on the form carries an evidence field: the nurse's own words that support it. "
        "This is what makes the later checking possible.",
    ),

    P("Step 6. Designing the anti-invention check", "h2"),
    P(
        "The paper's requirement that nothing may be invented had to become something mechanical "
        "rather than a hope. The method designed here is:",
    ),
    *B([
        "Every extracted item must quote the nurse's words <b>exactly</b>.",
        "After the AI answers, the system searches the original note for that quote - the same "
        "action as pressing Ctrl+F.",
        "If the quote is not found, the item is deleted before it can reach the chart.",
    ]),
    Spacer(1, 4),
    callout(
        "This converts a weakness into a safeguard. If the AI invents a finding, it must invent a "
        "quote to go with it, and invented text is never present in the note. The search fails and "
        "the item is removed. A fabricated item cannot appear on the chart.",
    ),
    Spacer(1, 8),

    P("Step 7. Setting up the project and the workspace layout", "h2"),
    P(
        "The repository was created and the working screen laid out: the notes are pasted on one "
        "side, the conversion runs in the middle, and the chart is drawn below across the full "
        "width so that a long admission is never cut off or hidden behind a scrollbar.",
    ),

    P("Part D - Building it (week 3)", "h1"),

    P("Step 8. Logo and visual identity", "h2"),
    P(
        "The company mark was prepared for use on the site, including the animated version on the "
        "landing area and a simplified flat version for the header, which had to stay legible at "
        "small size. A shine animation passes across the mark on load.",
    ),

    P("Step 9. Website interface", "h2"),
    P(
        "A medical navy and sea-green theme, typography, the landing section carrying the study's "
        "headline result, a description of the method, and support for both light and dark mode "
        "following the viewer's own computer setting.",
    ),

    P("Step 10. Building the workspace", "h2"),
    *B([
        "A notes box with a live count of how many shifts and words have been pasted, and a button "
        "to load the published example patient.",
        "A conversion panel showing progress while the work runs.",
        "The chart itself: body systems as rows, shifts as columns, each item drawn as a card where "
        "the two meet, with the nurse's original words attached.",
        "A download button that saves the chart as an image. The obvious method - screenshotting the "
        "page - is blocked by browsers for security reasons, so the picture is rebuilt from the data "
        "instead, which also makes the saved file identical to what is on screen.",
    ]),

    P("Step 11. Connecting Google Vertex AI", "h2"),
    P(
        "The connection was set up so that the AI is only ever contacted from the server, never from "
        "the browser, which keeps credentials off the page. Two problems had to be solved here:",
    ),
    *B([
        "<b>Vertex uses a different form format</b> from the standard one. I wrote a translator so "
        "the project keeps a single master form rather than two that could drift apart.",
        "<b>The model could not report character positions.</b> Originally it was asked to say where "
        "in the note each quote appeared. It quoted correctly but got the positions wrong "
        "repeatedly. Language models read meaning, not letter positions. The design was changed so "
        "the model only supplies the quote and the system works out the position itself. Accuracy on "
        "the test case went from 18 out of 19 to 20 out of 20.",
    ]),

    P("Step 12. Testing on real cases, and the problem it exposed", "h2"),
    P(
        "Running real patients through the system revealed a serious weakness that a single small "
        "test case had hidden: <b>the longer the admission, the less the system extracted</b>. Given "
        "a whole long stay at once, the model produces a summary instead of an extraction.",
    ),
    table(
        [
            ["Shifts in the admission", "Items extracted per shift"],
            ["2", "8.00"],
            ["15", "1.13"],
            ["33", "0.52"],
            ["50", "0.20"],
            ["97", "0.21"],
        ],
        [3.4 * inch, 3.5 * inch],
        align_right=[1],
    ),
    Spacer(1, 9),
    P(
        "The fix was to stop asking the model to hold a whole admission at once. Admissions longer "
        "than ten shifts are now processed <b>four shifts at a time</b> and the answers joined "
        "together afterwards. On the same 15-shift patient this took the result from 17 items to "
        "<b>84</b>, with no citation failing the check in either run.",
    ),
    P(
        "Joining the parts had to be done carefully. Allergies, past history and resuscitation status "
        "are collected from every part rather than only the first, because in one 97-shift case the "
        "resuscitation status changed near the very end of the stay - reading only the first part "
        "would have shown the opposite of the truth.",
    ),
    P(
        "Because a long admission now takes several minutes, the result is also <b>streamed</b>: each "
        "part appears on the chart as soon as it is finished, so the chart builds up in view instead "
        "of leaving a blank screen. A part that fails no longer loses the whole patient.",
    ),

    P("Step 13. Verifying the safety check actually works", "h2"),
    P(
        "Rather than assume the anti-invention check worked, I tested it by attacking it: a "
        "completely fabricated treatment was planted in the results with a realistic-looking quote. "
        "The check found that the quote did not exist in the notes and deleted the item. Twenty items "
        "were submitted and nineteen survived. This test now runs automatically every time the "
        "system is traced.",
    ),

    P("Step 14. Deployment", "h2"),
    P(
        "The site is being deployed to Vercel so that it can be opened in a browser without running "
        "it locally.",
    ),

    P("2. Where the system stands", "h1"),
    table(
        [
            ["Measure", "Result"],
            ["Largest admission processed", "141 shifts (the longest in the corpus)"],
            ["Items extracted, 15-shift test case", "84, up from 17 before the fix"],
            ["Quotes checked against the source, same case", "113"],
            ["Quotes that failed the check", "0"],
            ["Fabricated item planted in a test", "Detected and deleted"],
            ["Cost per patient", "About $0.01 short, $0.08 long"],
            ["Corpus filed by body system without any AI", "42.5% of all notes"],
        ],
        [3.9 * inch, 3.0 * inch],
    ),

    P("3. What is not finished", "h1"),
    P(
        "Recording the gaps honestly is more useful than a list of successes, and these are the items "
        "carried into the next period.",
    ),
    *B([
        "<b>The coverage figure is not yet trustworthy.</b> The percentage shown on screen is the "
        "model's own estimate of how much of the note it captured. Measuring this independently - "
        "checking which sentences are actually supported by a verified quote - is the next piece of "
        "work.",
        "<b>No nurse has reviewed the output.</b> The plan is a set of around 30 charts checked by "
        "practising nurses, to serve as a gold standard.",
        "<b>The full corpus has not been run.</b> Five patients have been processed end to end; all "
        "163 would cost roughly $7 and about an hour.",
        "<b>Ambiguous abbreviations are resolved by the model reading the context.</b> It appears to "
        "do this correctly, but nobody has yet counted how often it is right.",
    ]),
    Spacer(1, 8),
    callout(
        "The single most important lesson of these two weeks: the system looked like it worked when "
        "tested on one small example, and only measurement on real, long admissions revealed that it "
        "did not. Every claim in this report is a measured number rather than an impression.",
        kind="note",
    ),
]

build(
    "Week_2_and_3_Report.pdf",
    "Weeks 2 and 3: designing and building the system",
    "From understanding the dataset through to a working website that converts nursing notes "
    "into a verified body-system chart.",
    [
        ["<b>Period</b>", "Monday 17 August 2026 to Sunday 30 August 2026"],
        ["<b>Hours</b>", "14 hours (7 hours per week)"],
        ["<b>Week 2</b>", "Understanding the dataset, researching tools, designing the schema and "
                          "the verification method"],
        ["<b>Week 3</b>", "Logo and interface, building the workspace, connecting Google Vertex AI, "
                          "testing, fixing long admissions, deployment"],
        ["<b>Output</b>", "A working system that converts a whole admission into a source-verified "
                          "body-system chart"],
    ],
    week23,
)

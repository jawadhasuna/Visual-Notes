/**
 * The short label a chart card shows before it is opened.
 *
 * The model writes a headline for every finding, but a headline is a
 * paraphrase, and a paraphrase cannot be checked against the note the way a
 * quote can. So it is held to the two rules that catch the dangerous kinds of
 * shortening, and a headline that breaks either is replaced by a trimmed copy
 * of the finding itself:
 *
 *   - No new numbers. Every number in the headline must appear in the finding,
 *     intervention, orders or quote, so "sats 94%" cannot come from a note
 *     that says 91%.
 *   - No lost or invented negation. "Denies SOB" must not become "SOB", and a
 *     "no" the note never wrote must not appear.
 *
 * The full finding and the nurse's own words are one click away, so a
 * headline only has to be right, not complete.
 */

export const HEADLINE_MAX = 60;

// A number standing on its own: the 94 in "sats 94%", not the 2 in "O2".
const NUMBER = /(?<![A-Za-z])\d+(?:\.\d+)?/g;
const NEGATION = /\b(?:no|not|neg|negative|denies|denied|without|none|absent|never)\b|n't\b/i;

// Common shorthand, used only when a label has to be cut from the finding here.
const SHORTHAND: [RegExp, string][] = [
  [/\bshortness of breath\b/gi, "SOB"],
  [/\bblood pressure\b/gi, "BP"],
  [/\bheart rate\b/gi, "HR"],
  [/\brespiratory rate\b/gi, "RR"],
  [/\bnasal cannula\b/gi, "NC"],
  [/\burine output\b/gi, "UOP"],
  [/\boxygen\b/gi, "O2"],
];

type Source = {
  headline?: string | null;
  finding: string;
  intervention?: string | null;
  orders?: string | null;
  evidence?: string | null;
};

/** True when a headline keeps to the facts of its finding. */
export function isFaithful(headline: string, src: Source): boolean {
  if (!headline || headline.length > HEADLINE_MAX) return false;

  const context = [src.finding, src.intervention, src.orders, src.evidence]
    .filter(Boolean)
    .join(" ");
  const known = new Set(context.match(NUMBER) ?? []);
  if ((headline.match(NUMBER) ?? []).some((n) => !known.has(n))) return false;

  if (NEGATION.test(src.finding) && !NEGATION.test(headline)) return false;
  if (NEGATION.test(headline) && !NEGATION.test(context)) return false;
  return true;
}

/** Cut a finding down to a label using only its own words. */
export function shorten(finding: string, max = 48): string {
  let s = finding.trim();
  for (const [pattern, short] of SHORTHAND) s = s.replace(pattern, short);
  if (s.length <= max) return s;

  // A whole first clause reads better than a clipped sentence.
  const clause = s.split(/;\s*/)[0];
  if (clause.length <= max) return clause;

  const cut = clause.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max / 3 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "") + "…";
}

/** The label to show: the model's headline if it passes, else one cut from the finding. */
export function headlineFor(src: Source): string {
  const h = src.headline?.trim();
  return h && isFaithful(h, src) ? h : shorten(src.finding);
}

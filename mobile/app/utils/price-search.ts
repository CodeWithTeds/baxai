/**
 * Utility for parsing natural price expressions and matching products against search queries.
 * Supports:
 * - "500 up", "500+", "500 and above", "above 500", "over 500", "500 pataas" (min: 500)
 * - "under 500", "below 500", "less than 500", "500 pababa" (max: 500)
 * - "between 100 and 500", "100 to 500" (min: 100, max: 500)
 */

export interface PriceConstraint {
  min?: number;
  max?: number;
}

export function extractPriceConstraintFromText(text: string): PriceConstraint {
  let min: number | undefined;
  let max: number | undefined;

  const clean = text.trim();
  if (!clean) return { min, max };

  const rangeMatch = clean.match(
    /(?:between|from)?\s*(?:₱|php|p)?\s*(\d+(?:\.\d+)?)\s*(?:to|-|and|hanggang)\s*(?:₱|php|p)?\s*(\d+(?:\.\d+)?)/i
  );

  if (rangeMatch) {
    min = parseFloat(rangeMatch[1]);
    max = parseFloat(rangeMatch[2]);
  } else {
    const minMatch = clean.match(
      /(?:(?:₱|php|p)?\s*(\d+(?:\.\d+)?)\s*(?:up|\+|pataas|and\s*above|or\s*above|above|over|higher\s*than|greater\s*than|minimum|min))|(?:(?:above|over|exceeding|more\s*than|at\s*least|min(?:imum)?|pataas\s*sa|>|>=)\s*(?:₱|php|p)?\s*(\d+(?:\.\d+)?))/i
    );
    if (minMatch) {
      min = parseFloat(minMatch[1] || minMatch[2]);
    }

    const maxMatch = clean.match(
      /(?:(?:under|below|less\s*than|cheaper\s*than|up\s*to|max(?:imum)?|pababa|hanggang|<|<=)\s*(?:₱|php|p)?\s*(\d+(?:\.\d+)?))|(?:(?:₱|php|p)?\s*(\d+(?:\.\d+)?)\s*(?:down|pababa|and\s*below|or\s*below|below|under|max))/i
    );
    if (maxMatch) {
      max = parseFloat(maxMatch[1] || maxMatch[2]);
    }
  }

  return { min, max };
}

export function matchProductSearch(
  item: { name: string; description?: string; badge?: string; category?: string; price?: string | number },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const itemPrice = typeof item.price === 'number'
    ? item.price
    : parseFloat(String(item.price || 0).replace(/[^\d.]/g, ''));

  const constraint = extractPriceConstraintFromText(q);
  const hasPriceConstraint = constraint.min !== undefined || constraint.max !== undefined;

  let priceMatch = true;
  if (constraint.min !== undefined && itemPrice < constraint.min) priceMatch = false;
  if (constraint.max !== undefined && itemPrice > constraint.max) priceMatch = false;

  if (hasPriceConstraint && !priceMatch) return false;

  // Clean the price expressions and stop words to see if specific product keywords remain
  const cleanedKeywords = q
    .replace(/(?:between|from)?\s*(?:₱|php|p)?\s*\d+(?:\.\d+)?\s*(?:to|-|and|hanggang)\s*(?:₱|php|p)?\s*\d+(?:\.\d+)?/gi, '')
    .replace(/(?:(?:₱|php|p)?\s*\d+(?:\.\d+)?\s*(?:up|\+|pataas|and\s*above|or\s*above|above|over|higher\s*than|greater\s*than|minimum|min))|(?:(?:above|over|exceeding|more\s*than|at\s*least|min(?:imum)?|pataas\s*sa|>|>=)\s*(?:₱|php|p)?\s*\d+(?:\.\d+)?)/gi, '')
    .replace(/(?:(?:under|below|less\s*than|cheaper\s*than|up\s*to|max(?:imum)?|pababa|hanggang|<|<=)\s*(?:₱|php|p)?\s*\d+(?:\.\d+)?)|(?:(?:₱|php|p)?\s*\d+(?:\.\d+)?\s*(?:down|pababa|and\s*below|or\s*below|below|under|max))/gi, '')
    .replace(/\b(product|products|item|items|on|for)\b/gi, '')
    .trim();

  if (!cleanedKeywords) {
    // If only price was specified (e.g. "500 up on product"), matching the price condition is sufficient
    return hasPriceConstraint ? priceMatch : true;
  }

  const nameMatch = item.name.toLowerCase().includes(cleanedKeywords);
  const descMatch = (item.description || '').toLowerCase().includes(cleanedKeywords);
  const badgeMatch = (item.badge || '').toLowerCase().includes(cleanedKeywords);
  const catMatch = (item.category || '').toLowerCase().includes(cleanedKeywords);

  return (nameMatch || descMatch || badgeMatch || catMatch) && (!hasPriceConstraint || priceMatch);
}

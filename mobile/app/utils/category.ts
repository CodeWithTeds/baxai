export type CategoryId = 'all' | 'mugs' | 'pins' | 'tshirts' | 'stickers' | 'tote_bags' | 'calendars' | 'printing';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  icon: string;
}

export function getCategoryForItem(item: { name: string; category?: string }): CategoryId {
  const nameLower = (item.name || '').toLowerCase();
  const catLower = (item.category || '').toLowerCase();

  if (catLower === 'mugs' || nameLower.includes('mug') || nameLower.includes('tumbler')) return 'mugs';
  if (catLower === 'pins' || nameLower.includes('pin') || nameLower.includes('badge')) return 'pins';
  if (catLower === 'tshirts' || catLower === 'apparel' || nameLower.includes('shirt') || nameLower.includes('t-shirt') || nameLower.includes('tee')) return 'tshirts';
  if (catLower === 'stickers' || nameLower.includes('sticker') || nameLower.includes('decal')) return 'stickers';
  if (catLower === 'tote_bags' || catLower === 'totes' || nameLower.includes('tote') || nameLower.includes('bag')) return 'tote_bags';
  if (catLower === 'calendars' || nameLower.includes('calendar')) return 'calendars';
  return 'printing';
}
